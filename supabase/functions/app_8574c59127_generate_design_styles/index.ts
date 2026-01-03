import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface ExistingFurniture {
  item: string;
  position: string;
  category: string;
}

interface DesignItem {
  id: string;
  name: string;
  category: string;
  role: string;
  dimensions: string;
  materials: string[];
  finishes: string[];
  placementIntent: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  styleNotes: string;
}

interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  description: string;
}

interface StyleOption {
  description: string;
  layoutLogic: string;
  items: DesignItem[];
  estimatedCostMin: number;
  estimatedCostMax: number;
  colorPalettes: ColorPalette[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request started`);

  try {
    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log(`[${requestId}] Raw body:`, bodyText);
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      throw new Error('Invalid request body');
    }

    const { 
      roomType, 
      sizeClass, 
      usableArea, 
      blockedZones = [], 
      walkableZones = [],
      walls = 4,
      doors = 1,
      windows = 1,
      detectedColors = ['#F5F5F0', '#8B7355', '#2C2C2C'],
      existingFurniture = []
    } = requestBody;

    if (!roomType || !sizeClass) {
      throw new Error('Missing required fields: roomType and sizeClass');
    }

    console.log(`[${requestId}] Generating designs for ${roomType} (${sizeClass})`);
    console.log(`[${requestId}] Existing furniture:`, existingFurniture);

    // Determine generation mode
    const isFurnishedRoom = existingFurniture && existingFurniture.length > 0;
    const generationMode = isFurnishedRoom ? 'MODE B - FURNISHED ROOM' : 'MODE A - EMPTY ROOM';
    console.log(`[${requestId}] Generation mode: ${generationMode}`);

    // Define all 12 styles
    const styles = [
      'Organic Modern',
      'Mid-Century Modern',
      'Scandinavian',
      'Japandi',
      'Traditional',
      'Industrial',
      'Bohemian',
      'Quiet Luxury',
      'Transitional',
      'Coastal Modern',
      'Maximalist',
      'Modern Farmhouse'
    ];

    // Build system prompt based on mode
    const systemPrompt = isFurnishedRoom
      ? `You are an expert interior STYLIST, not a layout designer. The room layout and existing furniture are FIXED and IMMUTABLE.

CRITICAL MODE: FURNISHED ROOM STYLING ONLY

The uploaded room image shows existing furniture that CANNOT be moved, replaced, or redesigned.

EXISTING FURNITURE (DO NOT TOUCH):
${existingFurniture.map((f: ExistingFurniture) => `- ${f.item} (${f.category}) at ${f.position}`).join('\n')}

YOUR ROLE:
You may ONLY suggest complementary additions and material/finish changes that work with the current layout.
You are styling an existing room, not designing a new one.

ALLOWED ITEM CATEGORIES:
- Lighting (desk lamps, floor lamps, pendant lights)
- Rugs (area rugs, runners)
- Wall decor (art, mirrors, shelving)
- Soft furnishings (pillows, throws, curtains)
- Plants (potted plants, planters)
- Small accent storage (only if it does not replace existing storage)

DISALLOWED CATEGORIES:
- Desks, beds, sofas, dining tables
- Primary seating (office chairs, dining chairs, armchairs)
- Large storage that competes with existing pieces

LAYOUT LOGIC MUST:
- Describe how the style is expressed through materials, finishes, lighting, and decor
- NOT describe furniture positioning, rebalancing, or layout changes
- Example: "Adds warmth through lighting and textiles while preserving the existing desk and storage layout"

Room constraints:
- Room: ${roomType} (${sizeClass})
- Walls: ${walls}, Doors: ${doors}, Windows: ${windows}
- Detected colors: ${detectedColors.join(', ')}

STRICT FORMAT:
- Description: MAX 2 sentences about style expression
- Layout logic: MAX 1 sentence about preserving existing layout
- Items: EXACTLY 3-5 complementary additions (lighting/rugs/decor/textiles/plants ONLY)
- Item notes: MAX 1 sentence each
- Palette descriptions: MAX 1 sentence each

Return ONLY valid JSON, no markdown.`
      : `You are an expert interior designer. Generate COMPLETE furniture layouts for empty rooms.

CRITICAL MODE: EMPTY ROOM LAYOUT DESIGN

No existing furniture detected. Generate full furniture layouts from scratch.

Room constraints:
- Room: ${roomType} (${sizeClass})
- Walls: ${walls}, Doors: ${doors}, Windows: ${windows}
- Usable area: ${usableArea}
- Blocked zones: ${blockedZones.join(', ')}
- Walkable zones: ${walkableZones.join(', ')}
- Detected colors: ${detectedColors.join(', ')}

YOUR ROLE:
Generate complete furniture layouts including all major pieces and accessories.

ALLOWED CATEGORIES:
- All furniture types (seating, tables, beds, storage)
- Lighting
- Decor
- Textiles
- Plants

LAYOUT LOGIC MUST:
- Describe furniture positioning and spatial relationships
- Explain how pieces work together functionally
- Example: "Desk positioned facing window for natural light, with bookshelf along left wall for easy access"

STRICT FORMAT:
- Description: MAX 2 sentences
- Layout logic: MAX 1 sentence about furniture positioning
- Items: EXACTLY 5-8 items per style (complete furniture set)
- Item notes: MAX 1 sentence each
- Palette descriptions: MAX 1 sentence each

Return ONLY valid JSON, no markdown.`;

    // Build user prompt
    const userPrompt = `Generate designs for: ${styles.join(', ')}.

Return this EXACT structure (no extra text):
{
  "StyleName": {
    "description": "Brief 2-sentence description",
    "layoutLogic": "${isFurnishedRoom ? 'How style is expressed without changing layout' : 'How furniture is positioned'}",
    "items": [
      {
        "id": "style-item-001",
        "name": "Item Name",
        "category": "${isFurnishedRoom ? 'lighting|decor|textiles|plants' : 'seating|tables|storage|lighting|decor'}",
        "role": "Purpose",
        "dimensions": "Size",
        "materials": ["mat1", "mat2"],
        "finishes": ["fin1", "fin2"],
        "placementIntent": "${isFurnishedRoom ? 'Location relative to existing furniture' : 'Absolute position in room'}",
        "estimatedPriceMin": 200,
        "estimatedPriceMax": 400,
        "styleNotes": "Brief note"
      }
    ],
    "estimatedCostMin": ${isFurnishedRoom ? '300' : '1000'},
    "estimatedCostMax": ${isFurnishedRoom ? '1000' : '3000'},
    "colorPalettes": [
      {
        "id": "original",
        "name": "Original",
        "colors": ${JSON.stringify(detectedColors)},
        "description": "From your room"
      },
      {
        "id": "alt1",
        "name": "Alt 1",
        "colors": ["#hex1", "#hex2", "#hex3"],
        "description": "Brief desc"
      },
      {
        "id": "alt2",
        "name": "Alt 2",
        "colors": ["#hex1", "#hex2", "#hex3"],
        "description": "Brief desc"
      }
    ]
  }
}`;

    // Generate all styles in one OpenAI call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 12000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] OpenAI error:`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    console.log(`[${requestId}] Response length:`, content.length);
    console.log(`[${requestId}] First 500 chars:`, content.substring(0, 500));
    console.log(`[${requestId}] Last 500 chars:`, content.substring(content.length - 500));

    // Parse the JSON response with better error handling
    let stylesData;
    try {
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Check if content looks truncated
      if (!content.endsWith('}')) {
        console.error(`[${requestId}] Response appears truncated, last char:`, content.slice(-1));
        // Try to find the last complete style object
        const lastCompleteStyle = content.lastIndexOf('},\n  "');
        if (lastCompleteStyle > 0) {
          content = content.substring(0, lastCompleteStyle + 1) + '\n}';
          console.log(`[${requestId}] Attempting to recover with truncated content`);
        }
      }
      
      stylesData = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      console.error(`[${requestId}] Content length:`, content.length);
      console.error(`[${requestId}] Last 1000 chars:`, content.substring(content.length - 1000));
      throw new Error('Failed to parse OpenAI response - response may be too large');
    }

    const styleCount = Object.keys(stylesData).length;
    console.log(`[${requestId}] Successfully generated ${styleCount} styles in ${generationMode}`);

    return new Response(
      JSON.stringify({ styles: stylesData }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface ExistingFurniture {
  item: string;
  position: string;
  category: string;
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
  console.log(`[${requestId}] STEP C: Deep Design Generation Started`);

  try {
    let requestBody;
    try {
      const bodyText = await req.text();
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
      existingFurniture = [],
      selectedStyle
    } = requestBody;

    if (!roomType || !sizeClass || !selectedStyle) {
      throw new Error('Missing required fields: roomType, sizeClass, and selectedStyle');
    }

    const isFurnishedRoom = existingFurniture && existingFurniture.length > 0;
    console.log(`[${requestId}] Generating deep design for: ${selectedStyle}`);
    console.log(`[${requestId}] Room: ${roomType} (${sizeClass}), Furnished: ${isFurnishedRoom}`);

    // Build system prompt based on mode
    const systemPrompt = isFurnishedRoom
      ? `You are an expert interior STYLIST. The room layout and existing furniture are FIXED and IMMUTABLE.

CRITICAL MODE: FURNISHED ROOM DEEP STYLING

EXISTING FURNITURE (DO NOT TOUCH):
${existingFurniture.map((f: ExistingFurniture) => `- ${f.item} (${f.category}) at ${f.position}`).join('\n')}

YOUR ROLE:
Generate a complete ${selectedStyle} design that respects existing furniture.
You may ONLY suggest complementary additions and material/finish recommendations.

ALLOWED CATEGORIES:
- Lighting (desk lamps, floor lamps, pendant lights)
- Rugs (area rugs, runners)
- Wall decor (art, mirrors, shelving)
- Soft furnishings (pillows, throws, curtains)
- Plants (potted plants, planters)
- Small accent storage (only if it does not replace existing storage)

DISALLOWED:
- Desks, beds, sofas, dining tables
- Primary seating
- Large storage

Room: ${roomType} (${sizeClass})
Walls: ${walls}, Doors: ${doors}, Windows: ${windows}
Colors: ${detectedColors.join(', ')}

OUTPUT:
- Description: 2-3 sentences about ${selectedStyle} expression
- Layout logic: How style is expressed without changing layout
- Items: 4-6 complementary additions
- 3 color palettes (original + 2 alternatives)
- Cost estimate: $300-$1500 range

Return ONLY valid JSON.`
      : `You are an expert interior designer. Generate a complete ${selectedStyle} furniture layout.

CRITICAL MODE: EMPTY ROOM LAYOUT DESIGN

No existing furniture. Generate full ${selectedStyle} layout from scratch.

Room: ${roomType} (${sizeClass})
Area: ${usableArea}
Walls: ${walls}, Doors: ${doors}, Windows: ${windows}
Blocked zones: ${blockedZones.join(', ')}
Walkable zones: ${walkableZones.join(', ')}
Colors: ${detectedColors.join(', ')}

OUTPUT:
- Description: 2-3 sentences about ${selectedStyle}
- Layout logic: Furniture positioning strategy
- Items: 6-10 complete furniture set
- 3 color palettes (original + 2 alternatives)
- Cost estimate: $1500-$5000 range

Return ONLY valid JSON.`;

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
            content: `Generate complete ${selectedStyle} design.

Return this EXACT structure:
{
  "description": "2-3 sentence description",
  "layoutLogic": "${isFurnishedRoom ? 'How style is expressed without changing layout' : 'Furniture positioning strategy'}",
  "items": [
    {
      "id": "item-001",
      "name": "Item Name",
      "category": "${isFurnishedRoom ? 'lighting|decor|textiles|plants' : 'seating|tables|storage|lighting|decor'}",
      "role": "Purpose",
      "dimensions": "Size",
      "materials": ["mat1", "mat2"],
      "finishes": ["fin1", "fin2"],
      "placementIntent": "Location",
      "estimatedPriceMin": 100,
      "estimatedPriceMax": 300,
      "styleNotes": "Brief note"
    }
  ],
  "estimatedCostMin": ${isFurnishedRoom ? 300 : 1500},
  "estimatedCostMax": ${isFurnishedRoom ? 1500 : 5000},
  "colorPalettes": [
    {
      "id": "original",
      "name": "Original",
      "colors": ${JSON.stringify(detectedColors)},
      "description": "From your room"
    },
    {
      "id": "alt1",
      "name": "Alternative 1",
      "colors": ["#hex1", "#hex2", "#hex3"],
      "description": "Brief description"
    },
    {
      "id": "alt2",
      "name": "Alternative 2",
      "colors": ["#hex1", "#hex2", "#hex3"],
      "description": "Brief description"
    }
  ]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] OpenAI error:`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Parse the JSON response
    let designData;
    try {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      designData = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      console.error(`[${requestId}] Content:`, content);
      throw new Error('Failed to parse OpenAI response');
    }

    console.log(`[${requestId}] Successfully generated deep design with ${designData.items.length} items`);

    return new Response(
      JSON.stringify(designData),
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
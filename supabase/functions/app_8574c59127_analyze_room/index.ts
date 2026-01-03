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
  console.log(`[${requestId}] Room Analysis Started`);

  try {
    let requestBody;
    try {
      const bodyText = await req.text();
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      throw new Error('Invalid request body');
    }

    const { imageUrl, unknownDimensions = false, templateMetadata } = requestBody;

    if (!imageUrl) {
      throw new Error('Missing required field: imageUrl');
    }

    console.log(`[${requestId}] Analyzing image: ${imageUrl}`);
    if (templateMetadata) {
      console.log(`[${requestId}] Template context: ${templateMetadata.roomType}`);
    }

    // Build system prompt with optional template seeding
    const systemPrompt = templateMetadata
      ? `You are an expert interior design analyst. Analyze this ${templateMetadata.roomType} image.

TEMPLATE CONTEXT (use as seed, but analyze the actual image):
${templateMetadata.knownStructure}

Your analysis must be based on what you SEE in the image, not just the template context.`
      : `You are an expert interior design analyst. Analyze this room image in detail.`;

    const userPrompt = unknownDimensions
      ? `Analyze this room image. The room dimensions are unknown - estimate based on visible furniture scale and typical room proportions.

Focus on:
1. Room type and purpose
2. Structural elements (walls, doors, windows)
3. EXISTING FURNITURE (list ALL items with positions and categories)
4. Dominant colors and finishes
5. Layout density and proportions
6. Blocked zones and walkable areas

Return ONLY valid JSON with this structure:
{
  "roomType": "Room Type",
  "walls": 4,
  "doors": 1,
  "windows": 2,
  "proportions": {
    "width": "estimated width range",
    "depth": "estimated depth range"
  },
  "blockedZones": ["zone1", "zone2"],
  "walkableZones": ["zone1", "zone2"],
  "existingFurniture": [
    {
      "item": "Furniture Name",
      "position": "location description",
      "category": "seating|tables|storage|lighting|decor|beds"
    }
  ],
  "detectedColors": ["#hex1", "#hex2", "#hex3"],
  "confidence": "high|medium|low",
  "rawAnalysis": "brief summary"
}`
      : `Analyze this room image with known approximate dimensions.

Focus on:
1. Room type and purpose
2. Structural elements (walls, doors, windows)
3. EXISTING FURNITURE (list ALL items with positions and categories)
4. Dominant colors and finishes
5. Precise proportions and measurements
6. Blocked zones and walkable areas

Return ONLY valid JSON with this structure:
{
  "roomType": "Room Type",
  "walls": 4,
  "doors": 1,
  "windows": 2,
  "proportions": {
    "width": "width measurement",
    "depth": "depth measurement"
  },
  "blockedZones": ["zone1", "zone2"],
  "walkableZones": ["zone1", "zone2"],
  "existingFurniture": [
    {
      "item": "Furniture Name",
      "position": "location description",
      "category": "seating|tables|storage|lighting|decor|beds"
    }
  ],
  "detectedColors": ["#hex1", "#hex2", "#hex3"],
  "confidence": "high|medium|low",
  "rawAnalysis": "brief summary"
}`;

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
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
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
    let analysis;
    try {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      console.error(`[${requestId}] Content:`, content);
      throw new Error('Failed to parse Vision API response');
    }

    console.log(`[${requestId}] Analysis complete: ${analysis.roomType}, ${analysis.existingFurniture?.length || 0} furniture items`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis
      }),
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
        success: false,
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
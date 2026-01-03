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
  console.log(`[${requestId}] STEP A: Style Direction Generation Started`);

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
      detectedColors = ['#F5F5F0', '#8B7355', '#2C2C2C'],
      existingFurniture = [],
      sourceImageUrl,
      excludedStyles = []
    } = requestBody;

    if (!roomType || !sizeClass) {
      throw new Error('Missing required fields: roomType and sizeClass');
    }

    const isFurnishedRoom = existingFurniture && existingFurniture.length > 0;
    console.log(`[${requestId}] Room: ${roomType} (${sizeClass}), Furnished: ${isFurnishedRoom}`);
    console.log(`[${requestId}] Excluded styles: ${excludedStyles.join(', ')}`);

    // Build context about existing furniture
    const furnitureContext = isFurnishedRoom
      ? `\n\nEXISTING FURNITURE:\n${existingFurniture.map((f: ExistingFurniture) => `- ${f.item} (${f.category}) at ${f.position}`).join('\n')}`
      : '\n\nEmpty room - no existing furniture';

    const excludedContext = excludedStyles.length > 0
      ? `\n\nEXCLUDED STYLES (do not select): ${excludedStyles.join(', ')}`
      : '';

    // Auto-select 3-4 styles based on room analysis
    const textResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert interior design consultant. Auto-select 3-4 design style directions that make sense for this specific room.

CRITICAL TASK: STYLE DIRECTION SELECTION (LIGHTWEIGHT)

Room context:
- Type: ${roomType}
- Size: ${sizeClass}
- Colors: ${detectedColors.join(', ')}${furnitureContext}${excludedContext}

YOUR ROLE:
Select 3-4 styles that:
1. Match the room's existing characteristics (furniture, colors, proportions)
2. Are feasible given the room constraints
3. Offer meaningful variety in aesthetic direction
4. ${isFurnishedRoom ? 'Work WITH existing furniture, not against it' : 'Suit the room type and size'}

Available styles to choose from:
- Organic Modern
- Mid-Century Modern
- Scandinavian
- Japandi
- Traditional
- Industrial
- Bohemian
- Quiet Luxury
- Transitional
- Coastal Modern
- Maximalist
- Modern Farmhouse

OUTPUT REQUIREMENTS:
- Description: MAX 2 sentences about the style direction
- Investment level: low/medium/high (rough estimate based on typical items needed)
- NO detailed item lists
- NO color palette variations
- NO deep cost modeling

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Select 3-4 style directions for this ${roomType}.

Return this EXACT structure:
{
  "directions": [
    {
      "style": "Style Name",
      "description": "Brief 2-sentence description of this direction",
      "investmentLevel": "low|medium|high"
    }
  ]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error(`[${requestId}] OpenAI text error:`, errorText);
      throw new Error(`OpenAI API error: ${textResponse.status}`);
    }

    const textData = await textResponse.json();
    let content = textData.choices[0].message.content;
    
    // Parse the JSON response
    let directionsData;
    try {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      directionsData = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      throw new Error('Failed to parse OpenAI response');
    }

    console.log(`[${requestId}] Generated ${directionsData.directions.length} style directions, now generating images...`);

    // Generate style-specific images for each direction using DALL-E 3
    const directionsWithImages = await Promise.all(
      directionsData.directions.map(async (direction: any) => {
        try {
          const imagePrompt = isFurnishedRoom
            ? `Interior design visualization: ${direction.style} style applied to a ${roomType.toLowerCase()}. 
PRESERVE THE ACTUAL LAYOUT: ${furnitureContext.replace('EXISTING FURNITURE:', '')}
Show the SAME room with ${direction.style} styling through:
- Materials and finishes
- Lighting fixtures
- Wall colors and textures
- Decorative accents
- Textiles and soft furnishings
Keep existing furniture positions EXACTLY as described. Photorealistic, professional interior photography.`
            : `Interior design visualization: ${direction.style} style ${roomType.toLowerCase()}.
Complete furniture layout in ${direction.style} aesthetic.
Room size: ${sizeClass}
Dominant colors: ${detectedColors.join(', ')}
Photorealistic, professional interior photography, well-lit, high-end design.`;

          console.log(`[${requestId}] Generating image for ${direction.style}...`);

          const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: imagePrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard'
            })
          });

          if (!imageResponse.ok) {
            console.error(`[${requestId}] DALL-E error for ${direction.style}`);
            // Fallback to placeholder if image generation fails
            return {
              ...direction,
              imageUrl: sourceImageUrl || 'https://via.placeholder.com/1024x1024?text=Style+Preview'
            };
          }

          const imageData = await imageResponse.json();
          const imageUrl = imageData.data[0].url;

          console.log(`[${requestId}] Image generated for ${direction.style}`);

          return {
            ...direction,
            imageUrl
          };
        } catch (imageError) {
          console.error(`[${requestId}] Image generation error for ${direction.style}:`, imageError);
          return {
            ...direction,
            imageUrl: sourceImageUrl || 'https://via.placeholder.com/1024x1024?text=Style+Preview'
          };
        }
      })
    );

    console.log(`[${requestId}] Successfully generated ${directionsWithImages.length} style directions with images`);

    return new Response(
      JSON.stringify({ directions: directionsWithImages }),
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
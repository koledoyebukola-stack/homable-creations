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
  console.log(`[${requestId}] STEP C1: Style Inspiration Generation Started`);

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
      selectedStyle
    } = requestBody;

    if (!roomType || !sizeClass || !selectedStyle) {
      throw new Error('Missing required fields: roomType, sizeClass, and selectedStyle');
    }

    const isFurnishedRoom = existingFurniture && existingFurniture.length > 0;
    console.log(`[${requestId}] Generating 6 inspirations for ${selectedStyle} in ${roomType} (${sizeClass})`);
    console.log(`[${requestId}] Furnished: ${isFurnishedRoom}`);

    // Build context about existing furniture
    const furnitureContext = isFurnishedRoom
      ? `\n\nEXISTING FURNITURE (MUST PRESERVE):\n${existingFurniture.map((f: ExistingFurniture) => `- ${f.item} (${f.category}) at ${f.position}`).join('\n')}`
      : '\n\nEmpty room - full layout freedom';

    // Generate 6 inspirations for the selected style
    const inspirations = [];
    
    // Generate images in batches of 3 to avoid rate limits
    for (let batch = 0; batch < 2; batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < 3; i++) {
        const inspirationNumber = batch * 3 + i + 1;
        const moodVariations = [
          'bright and airy',
          'cozy and intimate', 
          'bold and dramatic',
          'serene and calming',
          'warm and inviting',
          'sophisticated and refined'
        ];
        const mood = moodVariations[inspirationNumber - 1];

        // CRITICAL: Enforce strict geometric constraints
        const geometricConstraints = `
IMMUTABLE GEOMETRY - DO NOT CHANGE:
- Camera angle and perspective (maintain exact viewpoint)
- Wall positions, corners, and room boundaries
- Ceiling height and structure
- Window size, count, and placement
- Door placement and openings
- Floor area and dimensions
- Built-in architectural features (DO NOT add built-in shelving, cabinetry, or structural modifications)

This is a PHOTOREALISTIC TRANSFORMATION of the SAME ROOM, not a new scene.`;

        const imagePrompt = isFurnishedRoom
          ? `${geometricConstraints}

Interior design inspiration ${inspirationNumber}/6: Transform this ${roomType.toLowerCase()} into ${selectedStyle} style with ${mood} atmosphere.

PRESERVE EXISTING LAYOUT:
${furnitureContext.replace('EXISTING FURNITURE (MUST PRESERVE):', '')}

ALLOWED CHANGES (styling only):
- Replace furniture with ${selectedStyle} alternatives in SAME positions
- Change textiles: pillows, throws, rugs, curtains
- Add small decorative objects on surfaces (books, vases, plants)
- Change wall art and frames
- Update lighting fixtures
- Adjust color palette to ${mood} mood: ${detectedColors.join(', ')}
- Change materials and finishes

FORBIDDEN CHANGES:
- Adding built-in shelving, cabinetry, or wall units
- Changing wall structure or adding architectural elements
- Moving windows or doors
- Changing room dimensions
- Adding excessive clutter or gallery walls
- Altering camera angle or perspective

Style: Photorealistic interior photography, ${mood} lighting, clean and achievable design.`
          : `${geometricConstraints}

Interior design inspiration ${inspirationNumber}/6: ${selectedStyle} style ${roomType.toLowerCase()} with ${mood} atmosphere.

Complete ${selectedStyle} furniture layout for ${sizeClass} space.
Mood: ${mood}
Color palette: ${detectedColors.join(', ')}

ALLOWED:
- Freestanding furniture appropriate to ${selectedStyle}
- Decorative accessories and textiles
- Lighting fixtures
- Wall art (2-3 pieces maximum, no excessive gallery walls)
- Area rugs and plants

FORBIDDEN:
- Built-in shelving or cabinetry
- Structural modifications
- Excessive clutter or decorative items
- Gallery walls with 10+ items

Style: Photorealistic interior photography, ${mood} lighting, clean and achievable design.`;

        console.log(`[${requestId}] Generating inspiration ${inspirationNumber} (${mood})...`);

        batchPromises.push(
          fetch('https://api.openai.com/v1/images/generations', {
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
          }).then(async (imageResponse) => {
            if (!imageResponse.ok) {
              console.error(`[${requestId}] DALL-E error for inspiration ${inspirationNumber}`);
              return {
                imageUrl: sourceImageUrl || 'https://via.placeholder.com/1024x1024?text=Inspiration',
                description: `${selectedStyle} variation with ${mood} atmosphere`,
                mood
              };
            }

            const imageData = await imageResponse.json();
            const imageUrl = imageData.data[0].url;

            console.log(`[${requestId}] Inspiration ${inspirationNumber} generated successfully`);

            return {
              imageUrl,
              description: `${selectedStyle} variation with ${mood} atmosphere`,
              mood
            };
          }).catch((error) => {
            console.error(`[${requestId}] Error generating inspiration ${inspirationNumber}:`, error);
            return {
              imageUrl: sourceImageUrl || 'https://via.placeholder.com/1024x1024?text=Inspiration',
              description: `${selectedStyle} variation with ${mood} atmosphere`,
              mood
            };
          })
        );
      }

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      inspirations.push(...batchResults);

      // Add delay between batches to avoid rate limits
      if (batch === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`[${requestId}] Successfully generated 6 inspirations for ${selectedStyle}`);

    return new Response(
      JSON.stringify({ inspirations }),
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
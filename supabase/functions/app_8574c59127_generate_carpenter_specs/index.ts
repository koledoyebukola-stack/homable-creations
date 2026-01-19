import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Credentials': 'true',
};

// Nigerian local wood materials
const NIGERIAN_MATERIALS = [
  'Obeche',
  'Mahogany',
  'Teak',
  'Hardwood',
  'Iroko',
  'Afara',
  'Abura',
];

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  console.log(`[${requestId}] Request received:`, req.method, req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling OPTIONS preflight`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log(`[${requestId}] Request body:`, {
        item_id: body.item_id,
        item_name: body.item_name?.substring(0, 50),
      });
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { item_id, item_name, category, style, description, color } = body;

    if (!item_id || !item_name) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'item_id and item_name are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize OpenAI client
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not found`);
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Generate carpenter specifications using GPT-4o-mini
    console.log(`[${requestId}] Generating carpenter specs for:`, item_name);
    const openaiStart = performance.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional Nigerian furniture carpenter and fabricator. Generate detailed fabrication specifications for custom furniture that can be built locally in Nigeria.

IMPORTANT RULES:
1. ALL dimensions MUST be in centimeters (cm) or meters (m)
2. Use ONLY Nigerian local wood materials: ${NIGERIAN_MATERIALS.join(', ')}
3. Provide realistic, buildable specifications
4. Include finish recommendations suitable for Nigerian climate
5. Add key construction features and joinery methods

Output ONLY valid JSON with this exact structure:
{
  "dimensions": {
    "width_cm": number,
    "depth_cm": number,
    "height_cm": number,
    "notes": "string (optional additional dimension notes)"
  },
  "material": "string (one of: ${NIGERIAN_MATERIALS.join(', ')})",
  "material_reasoning": "string (why this material is suitable)",
  "finish": "string (e.g., 'Polyurethane varnish', 'Oil finish', 'Lacquer')",
  "construction_features": [
    "string (key construction detail 1)",
    "string (key construction detail 2)",
    "string (key construction detail 3)"
  ]
}

No comments, no extra text.`,
        },
        {
          role: 'user',
          content: `Generate carpenter specifications for this item:

Item Name: ${item_name}
Category: ${category || 'Not specified'}
Style: ${style || 'Not specified'}
Color: ${color || 'Not specified'}
Description: ${description || 'Not specified'}

Provide detailed fabrication specs suitable for a Nigerian carpenter.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const openaiEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: OpenAI API call: ${(openaiEnd - openaiStart).toFixed(2)}ms`);

    const responseText = completion.choices[0]?.message?.content;
    console.log(`[${requestId}] OpenAI raw response:`, responseText);

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    let carpenterSpec;
    try {
      carpenterSpec = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, parseError);
      console.error(`[${requestId}] Raw response text:`, responseText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate required fields
    if (!carpenterSpec.dimensions || !carpenterSpec.material || !carpenterSpec.finish) {
      console.error(`[${requestId}] Missing required fields in carpenter spec`);
      throw new Error('Incomplete carpenter specification generated');
    }

    console.log(`[${requestId}] Successfully generated carpenter spec`);

    // Generate 3D technical interpretation image
    console.log(`[${requestId}] Generating 3D technical illustration...`);
    const imageGenStart = performance.now();
    
    let technicalImageUrl: string | null = null;
    try {
      // Build technical image prompt using the generated spec
      const dimensions = carpenterSpec.dimensions;
      const material = carpenterSpec.material;
      const constructionFeatures = carpenterSpec.construction_features || [];
      
      const imagePrompt = `Generate an internal wooden framework that fits strictly inside the outer silhouette of the ${item_name} furniture piece. Do not add any external structure that is not visible in the reference image.

CRITICAL CONSTRAINTS:
- Show ONLY the internal wooden framework (internal skeleton/structure)
- Framework must fit strictly inside the outer silhouette of the furniture
- Framework must sit flush to the floor unless the reference image clearly shows external legs
- Do NOT introduce new structures not present in the reference image:
  * No external legs (unless visible in reference)
  * No external frames
  * No armrests or supports that are not visible in the reference

Technical specifications:
- Dimensions: ${dimensions.width_cm}cm width × ${dimensions.depth_cm}cm depth × ${dimensions.height_cm}cm height
- Material: ${material} wood
- Construction details: ${constructionFeatures.join(', ')}

Visual style requirements:
- Technical isometric line-drawing style
- Clean white background
- No shadows, textures, lighting effects, or decorative elements
- No text, labels, measurements, or annotations inside the image
- Purely functional internal framework visualization`;

      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
        const errorText = await imageResponse.text();
        console.error(`[${requestId}] DALL-E image generation failed:`, errorText);
        // Continue without image - don't fail the entire request
        technicalImageUrl = null;
      } else {
        const imageData = await imageResponse.json();
        const openaiImageUrl = imageData.data[0]?.url || null;
        
        if (openaiImageUrl) {
          console.log(`[${requestId}] Successfully generated 3D technical illustration, uploading to Supabase Storage...`);
          
          try {
            // Fetch the image bytes from OpenAI URL
            const imageFetchResponse = await fetch(openaiImageUrl);
            if (!imageFetchResponse.ok) {
              throw new Error(`Failed to fetch image from OpenAI: ${imageFetchResponse.status}`);
            }
            
            const imageBytes = await imageFetchResponse.arrayBuffer();
            const imageBlob = new Blob([imageBytes], { type: 'image/png' });
            
            // Initialize Supabase client with service role key
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            
            if (!supabaseUrl || !supabaseServiceKey) {
              throw new Error('Supabase credentials not configured');
            }
            
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // Upload to Supabase Storage
            const storagePath = `technical-drawings/${item_id}.png`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('images')
              .upload(storagePath, imageBlob, {
                contentType: 'image/png',
                upsert: true, // Overwrite if exists
              });
            
            if (uploadError) {
              console.error(`[${requestId}] Failed to upload image to Supabase Storage:`, uploadError);
              // Continue without image - don't fail the entire request
              technicalImageUrl = null;
            } else {
              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(storagePath);
              
              technicalImageUrl = publicUrl;
              console.log(`[${requestId}] Successfully uploaded technical image to Supabase Storage:`, technicalImageUrl);
            }
          } catch (uploadError) {
            console.error(`[${requestId}] Error uploading image to Supabase Storage:`, uploadError);
            // Continue without image - don't fail the entire request
            technicalImageUrl = null;
          }
        } else {
          technicalImageUrl = null;
        }
      }
    } catch (imageError) {
      console.error(`[${requestId}] Error generating 3D illustration:`, imageError);
      // Continue without image - don't fail the entire request
      technicalImageUrl = null;
    }

    const imageGenEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: Image generation: ${(imageGenEnd - imageGenStart).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({
        item_id,
        carpenter_spec: {
          ...carpenterSpec,
          technical_image_url: technicalImageUrl,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const totalTime = performance.now() - startTime;
    console.error(`[${requestId}] Error after ${totalTime.toFixed(2)}ms:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
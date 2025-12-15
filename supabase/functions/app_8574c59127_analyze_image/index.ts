import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Credentials': 'true',
};

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
      console.log(
        `[${requestId}] Request body:`,
        {
          board_id: body.board_id,
          image_url: body.image_url?.substring(0, 50),
        }
      );
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

    const { board_id, image_url } = body;

    if (!board_id || !image_url) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'board_id and image_url are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${requestId}] Analyzing image for board:`, board_id);

    // Initialize OpenAI client
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not found`);
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // FAST INITIAL ANALYSIS: Detect up to 7 most prominent items only
    console.log(`[${requestId}] Calling OpenAI Vision API for fast initial analysis...`);
    const openaiStart = performance.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional interior stylist analyzing this image for a FAST INITIAL SCAN.

STEP 1: Validate if this is decor-related.

ACCEPT these image types:
- Home interiors (living rooms, bedrooms, kitchens, etc.)
- Furniture and home decor
- Event and celebration decor (weddings, birthdays, parties, holidays)
- Styled spaces with shoppable items

REJECT these image types (return is_decor: false):
- Pure landscapes with no decor
- People portraits without decor context
- Food close-ups without table settings
- Abstract art with no furniture/decor
- Outdoor nature scenes

If rejecting, return:
{
  "is_decor": false,
  "message": "This image doesn't look like home decor. Try uploading a photo of a room or styled space."
}

STEP 2: If accepted, identify the TOP 7 MOST PROMINENT AND SHOPPABLE items.

RULES:
- Maximum 7 items
- Prioritize larger, clearly visible items
- Focus on shoppable furniture and decor
- Skip small accessories or hard-to-see details
- NO room materials (walls, floors)
- NO dimensions or materials

ITEM CATEGORIES (priority order):
1. Major furniture (sofas, beds, tables, chairs)
2. Large decor (rugs, wall art, mirrors)
3. Lighting (floor lamps, chandeliers, table lamps)
4. Textiles (curtains, large throw pillows)
5. Statement pieces (vases, sculptures)
6. Event decor (centerpieces, backdrops, table settings)

For each item:
- "name": COLOR + description (e.g., "grey modern linen sofa", "gold balloon arch")
- "category": item type (e.g., "sofa", "coffee table", "centerpiece")
- "style": aesthetic (e.g., "modern", "elegant", "festive")
- "color": dominant color (e.g., "grey", "gold", "white")
- "tags": key descriptors array (e.g., ["linen", "three-seater"])
- "description": 1 short sentence
- "confidence": 0 to 1

Output ONLY valid minified JSON:

{
  "is_decor": true,
  "items": [
    {
      "name": "...",
      "category": "...",
      "style": "...",
      "color": "...",
      "tags": ["..."],
      "description": "...",
      "confidence": 0.0
    }
  ]
}

No comments, no extra text, no trailing commas.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image_url,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });
    const openaiEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: OpenAI API call: ${(openaiEnd - openaiStart).toFixed(2)}ms`);

    const responseText = completion.choices[0]?.message?.content;
    console.log(`[${requestId}] OpenAI raw response:`, responseText);

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    const jsonParseStart = performance.now();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, parseError);
      console.error(`[${requestId}] Raw response text:`, responseText);
      throw new Error('Invalid JSON response from OpenAI');
    }
    const jsonParseEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: JSON parse: ${(jsonParseEnd - jsonParseStart).toFixed(2)}ms`);

    // Check if image is not decor
    if (parsedResponse.is_decor === false) {
      console.log(`[${requestId}] Image rejected: not decor`);
      
      // Update board status to indicate validation failure
      await supabase
        .from('boards')
        .update({
          status: 'validation_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', board_id);

      const totalTime = performance.now() - startTime;
      console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);

      return new Response(
        JSON.stringify({ 
          error: 'not_decor',
          message: parsedResponse.message || "We couldn't detect any furniture or decor in this image. Please upload a photo that clearly shows interior decor, furniture, or home styling."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const items = parsedResponse.items || [];
    
    console.log(`[${requestId}] OpenAI detected ${items.length} items (fast scan)`);

    if (items.length === 0) {
      console.warn(`[${requestId}] No items detected in image`);
      await supabase
        .from('boards')
        .update({
          status: 'analyzed',
          detected_items_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', board_id);

      const totalTime = performance.now() - startTime;
      console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);

      return new Response(
        JSON.stringify({ 
          detected_items: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Map OpenAI items to database schema - no materials, no dimensions
    const mappingStart = performance.now();
    const detectedItems = items.map((item: any) => ({
      board_id,
      item_name: item.name || 'Unknown Item',
      category: item.category || 'Decor',
      style: item.style || 'Modern',
      dominant_color: item.color || null,
      materials: null,
      dimensions: null,
      tags: item.tags || [],
      description: item.description || null,
      confidence: item.confidence || 0.5,
    }));
    const mappingEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: Data mapping: ${(mappingEnd - mappingStart).toFixed(2)}ms`);

    console.log(
      `[${requestId}] Inserting ${detectedItems.length} detected items into database`
    );

    // Insert detected items into database
    const dbInsertStart = performance.now();
    const { data: insertedItems, error: insertError } = await supabase
      .from('detected_items')
      .insert(detectedItems)
      .select();
    const dbInsertEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: DB insert (detected_items): ${(dbInsertEnd - dbInsertStart).toFixed(2)}ms`);

    if (insertError) {
      console.error(
        `[${requestId}] Database insert error:`,
        insertError
      );
      throw insertError;
    }

    console.log(
      `[${requestId}] Successfully inserted detected items:`,
      insertedItems?.length
    );

    // Update board status - no room_materials in initial scan
    const boardUpdateStart = performance.now();
    await supabase
      .from('boards')
      .update({
        status: 'analyzed',
        detected_items_count: insertedItems?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', board_id);
    const boardUpdateEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: Board update (final): ${(boardUpdateEnd - boardUpdateStart).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);
    console.log(`[${requestId}] ⏱️ TIMING BREAKDOWN:
  - OpenAI API call: ${(openaiEnd - openaiStart).toFixed(2)}ms (${((openaiEnd - openaiStart) / totalTime * 100).toFixed(1)}%)
  - JSON parse: ${(jsonParseEnd - jsonParseStart).toFixed(2)}ms
  - Data mapping: ${(mappingEnd - mappingStart).toFixed(2)}ms
  - DB insert: ${(dbInsertEnd - dbInsertStart).toFixed(2)}ms
  - Board update: ${(boardUpdateEnd - boardUpdateStart).toFixed(2)}ms
  - TOTAL: ${totalTime.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({ 
        detected_items: insertedItems
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
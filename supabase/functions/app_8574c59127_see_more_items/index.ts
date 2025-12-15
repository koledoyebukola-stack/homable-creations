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

    const { board_id } = body;

    if (!board_id) {
      console.error(`[${requestId}] Missing required field: board_id`);
      return new Response(
        JSON.stringify({ error: 'board_id is required' }),
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

    console.log(`[${requestId}] Deep scan for board:`, board_id);

    // Get board info including source image
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('source_image_url')
      .eq('id', board_id)
      .single();

    if (boardError || !board) {
      console.error(`[${requestId}] Board not found:`, boardError);
      throw new Error('Board not found');
    }

    // Get existing detected items
    const { data: existingItems, error: itemsError } = await supabase
      .from('detected_items')
      .select('*')
      .eq('board_id', board_id);

    if (itemsError) {
      console.error(`[${requestId}] Failed to fetch items:`, itemsError);
      throw itemsError;
    }

    console.log(`[${requestId}] Found ${existingItems?.length || 0} existing items`);

    // Initialize OpenAI client
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not found`);
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Create a summary of existing items for context
    const itemsSummary = existingItems?.map(item => ({
      name: item.item_name,
      category: item.category,
    })) || [];

    // Call OpenAI for deep scan: additional items + room materials
    console.log(`[${requestId}] Calling OpenAI Vision API for deep scan...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing this room image for a DEEP SCAN to find additional items and room materials.

EXISTING ITEMS (already detected):
${JSON.stringify(itemsSummary, null, 2)}

YOUR TASK: 
1. Detect ADDITIONAL items beyond those already found (aim for ~5 more items, up to 12 total)
2. Identify room materials (walls and floors)

ADDITIONAL ITEMS TO FIND:
- Look for items NOT in the existing list above
- Focus on:
  * Wall items (art, mirrors, shelves, sconces)
  * Smaller furniture pieces
  * Textiles (pillows, throws, curtains)
  * Decorative items (vases, plants, candles, books)
  * Additional lighting
- Aim for ~5 additional items (don't exceed 12 total)
- DO NOT include dimensions or materials for items

ROOM MATERIALS TO IDENTIFY:
- Wall material/finish: paint color, wallpaper, wood paneling, brick, tile, etc.
- Floor material/type: hardwood, tile, carpet, concrete, laminate, etc.

For each NEW item, provide:

- "name": specific, shoppable product name
- "category": type like "wall art", "throw pillow", "vase", "wall shelf"
- "style": e.g. "modern", "contemporary", "traditional"
- "color": dominant color
- "tags": array of descriptors
- "description": 1 short sentence
- "confidence": number from 0 to 1

IMPORTANT:
- Only return NEW items not in the existing list
- Maximum ~5 new items
- No dimensions
- No materials per item
- Include room_materials object

Output ONLY valid minified JSON:

{
  "room_materials": {
    "walls": "description of wall material/color",
    "floors": "description of floor material/type"
  },
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
                url: board.source_image_url,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log(`[${requestId}] OpenAI raw response:`, responseText);

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    const newItems = parsedResponse.items || [];
    const roomMaterials = parsedResponse.room_materials || {};
    
    console.log(`[${requestId}] OpenAI found ${newItems.length} additional items`);
    console.log(`[${requestId}] Room materials:`, JSON.stringify(roomMaterials, null, 2));

    // Insert new items if any
    let insertedItems = [];
    if (newItems.length > 0) {
      const detectedItems = newItems.map((item: any) => ({
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

      const { data: inserted, error: insertError } = await supabase
        .from('detected_items')
        .insert(detectedItems)
        .select();

      if (insertError) {
        console.error(`[${requestId}] Failed to insert new items:`, insertError);
      } else {
        insertedItems = inserted || [];
        console.log(`[${requestId}] Inserted ${insertedItems.length} new items`);
      }
    }

    // Update board with room materials and new item count
    const totalCount = (existingItems?.length || 0) + insertedItems.length;
    await supabase
      .from('boards')
      .update({
        detected_items_count: totalCount,
        room_materials: roomMaterials,
        updated_at: new Date().toISOString(),
      })
      .eq('id', board_id);

    // Return all items (existing + new) and room materials
    const allItems = [...(existingItems || []), ...insertedItems];

    return new Response(
      JSON.stringify({ 
        detected_items: allItems,
        room_materials: roomMaterials,
        new_items_count: insertedItems.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
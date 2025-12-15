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

    console.log(`[${requestId}] Adding details for board:`, board_id);

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

    if (!existingItems || existingItems.length === 0) {
      console.log(`[${requestId}] No items found for board`);
      return new Response(
        JSON.stringify({ detected_items: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Found ${existingItems.length} items to enhance`);

    // Initialize OpenAI client
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not found`);
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Create a summary of existing items for context
    const itemsSummary = existingItems.map(item => ({
      name: item.item_name,
      category: item.category,
      style: item.style,
      color: item.dominant_color,
    }));

    // Call OpenAI to add materials and dimensions
    console.log(`[${requestId}] Calling OpenAI Vision API to add materials and dimensions...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing this room image to add MATERIALS and DIMENSIONS to already-detected items.

EXISTING ITEMS (already detected):
${JSON.stringify(itemsSummary, null, 2)}

YOUR TASK: For each item above, add:

1. **Materials** - Identify the primary materials used:
   - For furniture: wood type, metal type, fabric type, leather, etc.
   - For textiles: cotton, linen, wool, velvet, silk, etc.
   - For decor: glass, ceramic, metal, stone, etc.
   - Return as an array, e.g., ["oak wood", "linen fabric"], ["brass", "marble"]

2. **Dimensions** - Estimate approximate size (ONLY for size-critical items):
   - Rugs: width and length (e.g., "8 feet" x "10 feet")
   - Wall Art: width and height (e.g., "24 inches" x "36 inches")
   - Tables: width, length/diameter, height
   - Sofas/Couches: length and height
   - For round items, use "diameter" instead of width/length
   
   Return as object:
   {
     "width": "48 inches",
     "length": "60 inches",
     "height": "30 inches"
   }
   OR for round items:
   {
     "diameter": "36 inches",
     "height": "18 inches"
   }

IMPORTANT RULES:
- If you cannot determine materials with confidence, return null or empty array
- If dimensions are not applicable or cannot be estimated, return null
- Only add dimensions for: rugs, wall art, tables, sofas, couches, beds, large furniture
- Do NOT add dimensions for: small decor items, pillows, vases, candles, books
- Be conservative - if unsure, leave it null rather than guessing

Output ONLY valid minified JSON matching this structure (same order as input):

{
  "items": [
    {
      "name": "exact name from input",
      "materials": ["material1", "material2"] or null,
      "dimensions": {
        "width": "X feet/inches",
        "length": "Y feet/inches",
        "height": "Z inches"
      } or null
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

    const enhancedItems = parsedResponse.items || [];
    console.log(`[${requestId}] OpenAI enhanced ${enhancedItems.length} items`);

    // Update each item with new materials and dimensions
    const updatedItems = [];
    for (let i = 0; i < existingItems.length && i < enhancedItems.length; i++) {
      const existingItem = existingItems[i];
      const enhancement = enhancedItems[i];

      // Prepare update data - only update if new data is provided
      const updateData: any = {};
      
      if (enhancement.materials && Array.isArray(enhancement.materials) && enhancement.materials.length > 0) {
        updateData.materials = enhancement.materials;
      }
      
      if (enhancement.dimensions && typeof enhancement.dimensions === 'object') {
        // Only set dimensions if at least one valid dimension exists
        const dims = enhancement.dimensions;
        if (dims.width || dims.length || dims.height || dims.diameter) {
          updateData.dimensions = dims;
        }
      }

      // Only update if we have new data
      if (Object.keys(updateData).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from('detected_items')
          .update(updateData)
          .eq('id', existingItem.id)
          .select()
          .single();

        if (updateError) {
          console.error(`[${requestId}] Failed to update item ${existingItem.id}:`, updateError);
          // Continue with other items even if one fails
          updatedItems.push(existingItem);
        } else {
          console.log(`[${requestId}] Updated item ${existingItem.id} with:`, updateData);
          updatedItems.push(updated);
        }
      } else {
        // No updates needed, keep original
        updatedItems.push(existingItem);
      }
    }

    console.log(`[${requestId}] Successfully updated ${updatedItems.length} items`);

    return new Response(
      JSON.stringify({ 
        detected_items: updatedItems
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
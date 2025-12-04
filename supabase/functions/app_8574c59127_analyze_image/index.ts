import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
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

    // Call OpenAI Vision API with enhanced prompt for specific, shoppable item names
    console.log(`[${requestId}] Calling OpenAI Vision API...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional interior stylist and product taxonomist.

Analyze this room photo and identify *distinct furniture and decor items only*.
Ignore walls, floors, windows, people, pets, or architecture.

For each item, return highly specific, shoppable details:

- "name": very specific product-style name a shopper would search for.
  Avoid generic labels like "table" or "stool" by themselves.
  Prefer: "black sculptural pedestal accent table",
          "round cream bouclé ottoman stool with black tripod legs",
          "white ribbed ceramic vase", "brass tapered candlesticks (set of 3)".
- "category": concise type like "accent table", "stool", "vase",
              "floor lamp", "sofa", "coffee table", "wall art", "rug", "decor".
- "style": e.g. "modern", "contemporary", "transitional", "traditional",
           "minimalist", "Scandinavian", etc.
- "color": dominant color or color combo, e.g. "black", "warm brass", "cream", "white".
- "materials": array of main materials, e.g. ["bouclé fabric","wood"], ["ceramic"], ["brass"].
- "tags": array of extra descriptors such as "round", "pedestal base", "tripod legs",
          "ribbed texture", "spherical", "low profile", etc.
- "description": 1 short sentence describing the item in natural language.
- "confidence": number from 0 to 1 for how confident you are.

Return between 3 and 8 items if possible.

Output ONLY valid minified JSON in this exact structure:

{
  "items": [
    {
      "name": "...",
      "category": "...",
      "style": "...",
      "color": "...",
      "materials": ["..."],
      "tags": ["..."],
      "description": "...",
      "confidence": 0.0
    }
  ]
}
No comments, no extra text, and no trailing commas.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image_url,
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

    const items = parsedResponse.items || [];
    console.log(`[${requestId}] OpenAI detected ${items.length} items:`, JSON.stringify(items, null, 2));

    if (items.length === 0) {
      console.warn(`[${requestId}] No items detected in image`);
      // Update board status to analyzed with 0 items
      await supabase
        .from('boards')
        .update({
          status: 'analyzed',
          detected_items_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', board_id);

      return new Response(
        JSON.stringify({ detected_items: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Map OpenAI items to database schema
    // OpenAI returns "name" but DB expects "item_name"
    // OpenAI returns "color" but DB expects "dominant_color"
    const detectedItems = items.map((item: any) => ({
      board_id,
      item_name: item.name || 'Unknown Item',
      category: item.category || 'Decor',
      style: item.style || 'Modern',
      dominant_color: item.color || null,
      materials: item.materials || [],
      tags: item.tags || [],
      description: item.description || null,
      confidence: item.confidence || 0.5,
    }));

    console.log(
      `[${requestId}] Inserting ${detectedItems.length} detected items into database`
    );

    // Insert detected items into database
    const { data: insertedItems, error: insertError } = await supabase
      .from('detected_items')
      .insert(detectedItems)
      .select();

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

    // Update board status and count
    await supabase
      .from('boards')
      .update({
        status: 'analyzed',
        detected_items_count: insertedItems?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', board_id);

    return new Response(
      JSON.stringify({ detected_items: insertedItems }),
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
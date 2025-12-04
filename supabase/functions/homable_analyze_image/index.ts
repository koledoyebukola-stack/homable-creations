import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  board_id: string;
  image_url: string;
}

interface DetectedItem {
  item_name: string;
  category: string;
  style?: string;
  dominant_color?: string;
  materials?: string[];
  tags?: string[];
  description?: string;
  confidence?: number;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = (await req.json()) as AnalyzeRequest;
    console.log(`[${requestId}] Analyzing image for board:`, body.board_id);

    // Call OpenAI Vision API
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You analyze interior design photos and extract structured furniture and decor items. Return valid JSON only.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Extract up to 6 key furniture and decor items from this room photo. For each item provide: item_name (string), category (string: Seating/Tables/Lighting/Rugs/Storage/Decor), style (string), dominant_color (string), materials (array of strings), tags (array of strings), description (string), confidence (number 0-1). Respond ONLY with valid JSON in this exact format: {"items": [...]}'
              },
              {
                type: 'image_url',
                image_url: { url: body.image_url },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error(`[${requestId}] OpenAI Vision error:`, errorText);
      throw new Error(`OpenAI Vision request failed: ${visionResponse.status}`);
    }

    const visionJson = await visionResponse.json();
    console.log(`[${requestId}] OpenAI response received`);

    const content = visionJson.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, content);
      throw new Error('Invalid JSON from OpenAI');
    }

    const items: DetectedItem[] = parsed.items ?? [];
    console.log(`[${requestId}] Detected ${items.length} items`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Insert detected items
    const itemsToInsert = items.map((it) => ({
      board_id: body.board_id,
      item_name: it.item_name,
      category: it.category,
      style: it.style,
      dominant_color: it.dominant_color,
      materials: it.materials ?? [],
      tags: it.tags ?? [],
      description: it.description,
      confidence: it.confidence,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('detected_items')
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      console.error(`[${requestId}] Database insert error:`, insertError);
      throw insertError;
    }

    console.log(`[${requestId}] Successfully inserted ${inserted?.length} items`);

    // Update board's detected_items_count
    await supabase
      .from('boards')
      .update({ 
        detected_items_count: inserted?.length ?? 0,
        status: 'analyzed',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.board_id);

    return new Response(
      JSON.stringify({ detected_items: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
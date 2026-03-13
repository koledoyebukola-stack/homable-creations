/**
 * AI Room Generator Edge Function (skeleton).
 * Request: room_photo_url, mood_id, 5–6 products, paystack_reference, amount_paid_kobo.
 * Response: generation_id, generated_image_url (empty until OpenAI wired), product_ids.
 * Provider-agnostic interface; OpenAI Responses API to be implemented in a later phase.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTS_MIN = 5;
const PRODUCTS_MAX = 6;
const EXPECTED_AMOUNT_KOBo = 200_000; // ₦2,000

type AiRoomMoodId = 'afro_luxe' | 'warm_earthy' | 'minimal_lagos' | 'bold_colourful';

interface ProductInput {
  vendor_product_id: string;
  image_url: string;
  name: string;
  description: string | null;
}

interface RequestBody {
  room_photo_url?: string;
  mood_id?: string;
  products?: ProductInput[];
  paystack_reference?: string;
  amount_paid_kobo?: number;
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ ok: false, error: 'unauthorized', details: 'Missing or invalid Authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ ok: false, error: 'server_config', details: 'Missing Supabase env' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return jsonResponse({ ok: false, error: 'unauthorized', details: 'Invalid or expired token' }, 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_body', details: 'Invalid JSON' }, 400);
  }

  const { room_photo_url, mood_id, products, paystack_reference, amount_paid_kobo } = body;

  if (!room_photo_url || typeof room_photo_url !== 'string' || !room_photo_url.trim()) {
    return jsonResponse({ ok: false, error: 'invalid_room_photo_url' }, 400);
  }

  const validMoodIds: AiRoomMoodId[] = ['afro_luxe', 'warm_earthy', 'minimal_lagos', 'bold_colourful'];
  if (!mood_id || !validMoodIds.includes(mood_id as AiRoomMoodId)) {
    return jsonResponse({ ok: false, error: 'invalid_mood_id' }, 400);
  }

  if (!Array.isArray(products)) {
    return jsonResponse({ ok: false, error: 'invalid_products', details: 'products must be an array' }, 400);
  }
  if (products.length < PRODUCTS_MIN || products.length > PRODUCTS_MAX) {
    return jsonResponse({
      ok: false,
      error: 'invalid_products_count',
      details: `products must have between ${PRODUCTS_MIN} and ${PRODUCTS_MAX} items`,
    }, 400);
  }
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p || typeof p.vendor_product_id !== 'string' || typeof p.image_url !== 'string' || typeof p.name !== 'string') {
      return jsonResponse({ ok: false, error: 'invalid_product', details: `products[${i}] missing vendor_product_id, image_url, or name` }, 400);
    }
  }

  if (!paystack_reference || typeof paystack_reference !== 'string' || !paystack_reference.trim()) {
    return jsonResponse({ ok: false, error: 'invalid_paystack_reference' }, 400);
  }

  if (typeof amount_paid_kobo !== 'number' || amount_paid_kobo !== EXPECTED_AMOUNT_KOBo) {
    return jsonResponse({ ok: false, error: 'invalid_amount', details: `amount_paid_kobo must be ${EXPECTED_AMOUNT_KOBo}` }, 400);
  }

  const productIds = products.map((p) => p.vendor_product_id);

  const { data: row, error: insertError } = await supabase
    .from('ai_generations')
    .insert({
      user_id: user.id,
      mood: mood_id,
      original_image_url: room_photo_url.trim(),
      generated_image_url: null,
      product_ids: productIds,
      paystack_reference: paystack_reference.trim(),
      amount_paid: amount_paid_kobo,
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return jsonResponse({ ok: false, error: 'duplicate_reference', details: 'paystack_reference already used' }, 409);
    }
    console.error(`[${requestId}] ai_generations insert error:`, insertError);
    return jsonResponse({ ok: false, error: 'generation_failed', details: insertError.message }, 500);
  }

  // Skeleton: no OpenAI call yet; generated_image_url remains null. Caller gets empty string for now.
  return jsonResponse(
    {
      ok: true,
      generation_id: row.id,
      generated_image_url: '',
      product_ids: productIds,
    },
    200,
  );
});

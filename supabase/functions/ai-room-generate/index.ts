/**
 * AI Room Generator Edge Function (skeleton).
 * Request: room_photo_url, mood_id, 5–6 products, paystack_reference, amount_paid_kobo.
 * Response: generation_id, generated_image_url (empty until OpenAI wired), product_ids.
 * Provider-agnostic interface; OpenAI Responses API to be implemented in a later phase.
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTS_MIN = 3;
const PRODUCTS_MAX = 6;
const EXPECTED_AMOUNT_KOBo = 200_000; // ₦2,000

type AiRoomMoodId = 'afro_luxe' | 'warm_earthy' | 'minimal_lagos' | 'bold_colourful';

interface MoodSceneMapping {
  [key: string]: string[];
}

const MOOD_SCENE_IDS: MoodSceneMapping = {
  afro_luxe: [
    '98c41a5b-2bfd-4683-89e3-81428b7107e3',
    'c540ffe7-dbbc-406a-844e-ed2c9f5daed7',
    'b5330d7d-4266-4878-b533-38927c7fe1de',
    'cf58df83-6ac3-478b-886e-e90867b9f64f',
  ],
  warm_earthy: [
    '9f327622-a38b-445d-a0f3-52a7e589587c',
    '686d5ef9-ef6d-406d-9782-d1147faa155f',
    'cf928ae9-6de2-436c-b5f4-0c13ea2b0cea',
    '1b6b4c67-82d3-4015-ad96-c2321c6a648f',
  ],
  minimal_lagos: [
    '3f59a60f-e5a8-4e22-86be-ccf94c1276b1',
    '6fa69444-622c-4fa5-8ec2-3f18946dfff3',
    '8b534ed0-bef9-419c-b79a-929b1c371ab2',
    '8dcd9d8a-449a-4b33-95ff-aed022ff621b',
  ],
  bold_colourful: [
    '4c581220-3450-4cf0-b284-a7b2db85573b',
    '62d1a845-fdb9-472f-9239-85f6571b1e12',
    'd63a8250-e585-4ce5-a8a3-41c88413ff8d',
    '01d22a0f-7f90-4e91-a7d6-a85a7a38c5fa',
  ],
};

interface ProductInput {
  vendor_product_id: string;
  image_url: string;
  name: string;
  description: string | null;
}

interface MoodProduct {
  id: string;
  name: string;
  category: string | null;
  material: string | null;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  vendor_name: string;
  whatsapp_number: string;
  storefront_slug: string;
  storefront_id: string;
}

interface RequestBody {
  mood?: AiRoomMoodId;
  paystack_reference?: string;
  original_image_url?: string;
  user_id?: string;
  test_mode?: boolean;
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

/**
 * Phase 1: Select 5–6 curated products for a mood based on existing Explore scenes.
 * Uses sceneIds mapped per mood and enforces max 2 products per storefront.
 */
async function getProductsForMood(
  supabase: SupabaseClient,
  mood: AiRoomMoodId
): Promise<{ products: MoodProduct[]; minimum_spend: number | null }> {
  const sceneIds = MOOD_SCENE_IDS[mood];
  if (!sceneIds || sceneIds.length === 0) {
    throw new Error(`No sceneIds configured for mood: ${mood}`);
  }

  const { data, error } = await supabase
    .from('vendor_products')
    .select(
      `
        id,
        name,
        category,
        material,
        image_url,
        price_min,
        price_max,
        storefront_id,
        storefront:storefronts (
          id,
          name,
          whatsapp_number,
          slug,
          status
        ),
        explore_scene_items!inner (
          scene_id,
          item_type
        )
      `
    )
    .in('explore_scene_items.scene_id', sceneIds)
    .eq('explore_scene_items.item_type', 'catalog_product')
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .eq('storefront.status', 'active')
    .order('id', { ascending: true }) // deterministic before randomization
    .limit(12);

  if (error) {
    console.error('[getProductsForMood] Supabase error:', error);
    throw new Error('Failed to load products for mood');
  }

  const raw = (data || []) as any[];
  if (!raw.length) {
    throw new Error('Not enough products available for this style');
  }

  // Map joined rows into MoodProduct with storefront fields flattened
  const joined: MoodProduct[] = raw.map((row) => {
    const sf = (row.storefront || {}) as {
      id?: string;
      name?: string;
      whatsapp_number?: string;
      slug?: string;
      status?: string;
    };
    return {
      id: row.id as string,
      name: row.name as string,
      category: (row.category as string | null) ?? null,
      material: (row.material as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      price_min: (row.price_min as number | null) ?? null,
      price_max: (row.price_max as number | null) ?? null,
      vendor_name: (sf.name as string) || 'Unknown vendor',
      whatsapp_number: (sf.whatsapp_number as string) || '',
      storefront_slug: (sf.slug as string) || '',
      storefront_id: (sf.id as string) || (row.storefront_id as string),
    };
  });

  // Shuffle to emulate ORDER BY RANDOM() within code
  const shuffled = [...joined].sort(() => Math.random() - 0.5);

  // Enforce max 2 products per storefront
  const countsByStorefront = new Map<string, number>();
  const picked: MoodProduct[] = [];
  for (const p of shuffled) {
    if (!p.storefront_id) continue;
    const current = countsByStorefront.get(p.storefront_id) ?? 0;
    if (current >= 2) continue;
    countsByStorefront.set(p.storefront_id, current + 1);
    picked.push(p);
    if (picked.length >= PRODUCTS_MAX) break;
  }

  if (picked.length < PRODUCTS_MIN) {
    throw new Error('Not enough products available for this style');
  }

  // Minimum spend = sum of price_min where available, else null when all null
  const prices = picked.map((p) => p.price_min).filter((v): v is number => typeof v === 'number');
  const minimum_spend = prices.length ? prices.reduce((sum, v) => sum + v, 0) : null;

  return { products: picked, minimum_spend };
}

async function getProductsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<MoodProduct[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('vendor_products')
    .select(
      `
        id,
        name,
        category,
        material,
        image_url,
        price_min,
        price_max,
        storefront_id,
        storefront:storefronts (
          id,
          name,
          whatsapp_number,
          slug,
          status
        )
      `
    )
    .in('id', ids)
    .eq('storefront.status', 'active');

  if (error) {
    console.error('[getProductsByIds] Supabase error:', error);
    throw error;
  }

  const raw = (data || []) as any[];
  const byId = new Map<string, MoodProduct>();
  raw.forEach((row) => {
    const sf = (row.storefront || {}) as {
      id?: string;
      name?: string;
      whatsapp_number?: string;
      slug?: string;
      status?: string;
    };
    const mp: MoodProduct = {
      id: row.id as string,
      name: row.name as string,
      category: (row.category as string | null) ?? null,
      material: (row.material as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      price_min: (row.price_min as number | null) ?? null,
      price_max: (row.price_max as number | null) ?? null,
      vendor_name: (sf.name as string) || 'Unknown vendor',
      whatsapp_number: (sf.whatsapp_number as string) || '',
      storefront_slug: (sf.slug as string) || '',
      storefront_id: (sf.id as string) || (row.storefront_id as string),
    };
    byId.set(mp.id, mp);
  });

  // Preserve original order of ids
  return ids.map((id) => byId.get(id)).filter((p): p is MoodProduct => !!p);
}

function generateShareSlug(mood: AiRoomMoodId): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  bytes.forEach((b) => {
    suffix += alphabet[b % alphabet.length];
  });
  return `${mood}-${suffix}`;
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
    return jsonResponse({ error: 'invalid_body', message: 'Invalid JSON' }, 400);
  }
  const { mood, paystack_reference, original_image_url, user_id, test_mode } = body;

  // 2. Validate required fields
  if (!mood || !['afro_luxe', 'warm_earthy', 'minimal_lagos', 'bold_colourful'].includes(mood)) {
    return jsonResponse({ error: 'invalid_mood', message: 'mood is required and must be a valid mood id' }, 400);
  }
  if (!paystack_reference || typeof paystack_reference !== 'string' || !paystack_reference.trim()) {
    return jsonResponse({ error: 'invalid_paystack_reference', message: 'paystack_reference is required' }, 400);
  }
  if (!original_image_url || typeof original_image_url !== 'string' || !original_image_url.trim()) {
    return jsonResponse({ error: 'invalid_original_image_url', message: 'original_image_url is required' }, 400);
  }
  if (!user_id || typeof user_id !== 'string' || !user_id.trim()) {
    return jsonResponse({ error: 'invalid_user_id', message: 'user_id is required' }, 400);
  }
  if (user_id !== user.id) {
    return jsonResponse({ error: 'forbidden', message: 'user_id does not match authenticated user' }, 403);
  }

  const reference = paystack_reference.trim();

  // 3. Retry safety: return existing generation if already completed
  const { data: existingGen, error: existingError } = await supabase
    .from('ai_generations')
    .select('id, generated_image_url, share_slug, product_ids, amount_paid')
    .eq('paystack_reference', reference)
    .not('generated_image_url', 'is', null)
    .maybeSingle();

  if (existingError) {
    console.error(`[${requestId}] existing generation lookup error:`, existingError);
  }

  if (existingGen && existingGen.generated_image_url) {
    const productIdsExisting = (existingGen.product_ids as string[]) || [];
    const products = await getProductsByIds(supabase, productIdsExisting);
    const prices = products
      .map((p) => p.price_min)
      .filter((v): v is number => typeof v === 'number');
    const minimum_spend = prices.length ? prices.reduce((sum, v) => sum + v, 0) : null;

    return jsonResponse(
      {
        generated_image_url: existingGen.generated_image_url as string,
        share_slug: (existingGen.share_slug as string) ?? '',
        products,
        minimum_spend,
      },
      200,
    );
  }

  // 4. Verify Paystack payment (skip in test_mode)
  // TODO: REMOVE test_mode bypass before going live to production.
  // This allows skipping Paystack verification for testing only.
  if (!test_mode) {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error('[ai-room-generate] PAYSTACK_SECRET_KEY not configured');
      return jsonResponse({ error: 'server_config', message: 'Payment configuration missing' }, 500);
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyRes.ok) {
      console.error('[ai-room-generate] Paystack verify HTTP error:', verifyRes.status);
      return jsonResponse({ error: 'payment_verification_failed', message: 'Payment could not be verified' }, 402);
    }

    const verifyJson = await verifyRes.json();
    const status = verifyJson?.data?.status;
    const amount = verifyJson?.data?.amount;

    if (status !== 'success' || amount !== EXPECTED_AMOUNT_KOBo) {
      console.error('[ai-room-generate] Paystack verify mismatch:', { status, amount });
      return jsonResponse({ error: 'payment_verification_failed', message: 'Payment could not be verified' }, 402);
    }
  }

  // 5. Select products for this mood
  let moodProducts: MoodProduct[];
  let minimumSpend: number | null;
  try {
    const { products, minimum_spend } = await getProductsForMood(supabase, mood);
    moodProducts = products;
    minimumSpend = minimum_spend;
  } catch (e) {
    console.error('[ai-room-generate] getProductsForMood error:', e);
    return jsonResponse(
      { error: 'style_unavailable', message: 'Not enough products available for this style' },
      503,
    );
  }

  // 6. OpenAI call — real gpt-image-1 via Responses API
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('[ai-room-generate] OPENAI_API_KEY not configured');
    return jsonResponse(
      { error: 'server_config', message: 'AI configuration missing' },
      500,
    );
  }

  // Build prompt from layout instruction, mood template, product list, and quality instruction
  const layoutInstruction =
    "Completely reimagine the room's furnishings and decor from scratch in this style. Do not preserve or work around any existing furniture visible in the photo. Use the room's architecture only — walls, floor, windows, ceiling, doors.";

  const moodPromptTemplate = (() => {
    // Mirror ai-room-moods promptTemplate logic here for brevity; in Phase 2 we can centralize.
    switch (mood) {
      case 'afro_luxe':
        return 'Reimagine this room with a deep navy or charcoal feature wall with vertical batten panels. Brass accents throughout — picture lights, mirror frame, console table legs. One large bold Nigerian figurative painting. Floor to near-ceiling arched mirror. Warm recessed lighting. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Premium, unapologetic, dark luxury.';
      case 'warm_earthy':
        return 'Reimagine this room with terracotta or warm clay walls. Natural rattan pendant light. Cream or beige upholstered sofa. Nested natural wood coffee tables. Botanical or landscape artwork. Large ceramic floor vase. Jute or wool area rug. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Warm, organic, inviting.';
      case 'minimal_lagos':
        return 'Reimagine this room with clean warm white walls. One statement piece of furniture. Sputnik or architectural pendant light. One large abstract painting — the only colour accent. Oval or round mirror. No clutter. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Quietly confident, restrained luxury.';
      case 'bold_colourful':
      default:
        return 'Reimagine this room with a colour-blocked feature wall — deep teal, mustard or burnt orange. Mixed pattern cushions. Velvet accent chair in contrasting colour. Bold large-scale abstract art. Statement lighting. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Full personality, maximalist but intentional.';
    }
  })();

  const productsLines = moodProducts.map((p) => {
    const priceText =
      typeof p.price_min === 'number'
        ? `priced from ₦${p.price_min.toLocaleString('en-NG')}`
        : 'price on request';
    const materialText = p.material ? `${p.material}, ` : '';
    return `- ${p.name} by ${p.vendor_name}: ${materialText}${priceText}`;
  });

  const productsInstruction = `Feature these specific products in the room:\n${productsLines.join(
    '\n',
  )}`;

  const qualityInstruction =
    'Shot quality: Architectural Digest / Vogue Living editorial standard. Sony A7R V. Every surface must have tactile realism — fabric weave visible, wood grain present, wall texture tangible, ceramic surfaces reflective. Warm natural light from windows. No flat or plastic-looking surfaces. Photorealistic, not illustrated.';

  const fullPrompt = `${layoutInstruction}\n\n${moodPromptTemplate}\n\n${productsInstruction}\n\n${qualityInstruction}`;

  let generatedImageUrl: string | null = null;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        tools: [{ type: 'image_generation' }],
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: fullPrompt,
              },
              {
                type: 'input_image',
                image_url: original_image_url.trim(),
              },
              ...moodProducts
                .filter((p) => p.image_url)
                .map((p) => ({
                  type: 'input_image',
                  image_url: p.image_url!,
                })),
            ],
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      console.error('[ai-room-generate] OpenAI error:', openaiRes.status);
      return jsonResponse(
        {
          error: 'generation_failed',
          message:
            'Room generation failed. Your payment is saved — tap retry at no charge.',
        },
        500,
      );
    }

    const rawText = await openaiRes.text();
    const openaiJson = JSON.parse(rawText);

    const imageGenerationCalls = Array.isArray(openaiJson?.output)
      ? openaiJson.output.filter(
          (o: any) => o?.type === 'image_generation_call',
        )
      : [];
    const imageBase64 =
      imageGenerationCalls.length > 0
        ? imageGenerationCalls[0].result
        : undefined;

    console.log(
      '[ai-room-generate] Image found:',
      imageBase64 ? 'yes' : 'no',
    );

    if (!imageBase64) {
      console.error('[ai-room-generate] No image in OpenAI response');
      return jsonResponse(
        {
          error: 'generation_failed',
          message:
            'Room generation failed. Your payment is saved — tap retry at no charge.',
        },
        500,
      );
    }

    const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const file = new Blob([bytes], { type: 'image/png' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `ai-rooms/generated/${user.id}/${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-rooms')
      .upload(path, file, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ai-room-generate] Storage upload error:', uploadError);
      return jsonResponse(
        {
          error: 'generation_failed',
          message:
            'Room generation failed. Your payment is saved — tap retry at no charge.',
        },
        500,
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('ai-rooms')
      .getPublicUrl(uploadData.path);

    generatedImageUrl = publicUrl;
  } catch (e) {
    console.error('[ai-room-generate] OpenAI call failed:', e);
    return jsonResponse(
      {
        error: 'generation_failed',
        message:
          'Room generation failed. Your payment is saved — tap retry at no charge.',
      },
      500,
    );
  }

  // 7. Upsert ai_generations row with generated_image_url, product_ids, share_slug
  const selectedProductIds = moodProducts.map((p) => p.id);

  // Check if a row already exists for this reference (but without generated_image_url)
  const { data: existingRow, error: existingRowError } = await supabase
    .from('ai_generations')
    .select('id, share_slug')
    .eq('paystack_reference', reference)
    .maybeSingle();

  let shareSlug = existingRow?.share_slug as string | null;
  if (!shareSlug || typeof shareSlug !== 'string' || !shareSlug.trim()) {
    shareSlug = generateShareSlug(mood);
  }

  if (existingRowError) {
    console.error('[ai-room-generate] existing row check error:', existingRowError);
  }

  if (existingRow) {
    const { error: updateError } = await supabase
      .from('ai_generations')
      .update({
        generated_image_url: generatedImageUrl,
        product_ids: selectedProductIds,
        share_slug: shareSlug,
      })
      .eq('id', existingRow.id);

    if (updateError) {
      console.error('[ai-room-generate] update ai_generations error:', updateError);
      return jsonResponse({ error: 'generation_failed', message: 'Failed to save generation' }, 500);
    }
  } else {
    const { error: insertError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        mood,
        original_image_url: original_image_url.trim(),
        generated_image_url: generatedImageUrl,
        product_ids: selectedProductIds,
        paystack_reference: reference,
        amount_paid: EXPECTED_AMOUNT_KOBo,
        share_slug: shareSlug,
      });

    if (insertError) {
      console.error('[ai-room-generate] insert ai_generations error:', insertError);
      return jsonResponse({ error: 'generation_failed', message: 'Failed to save generation' }, 500);
    }
  }

  // 8. Return response
  return jsonResponse(
    {
      generated_image_url: generatedImageUrl,
      share_slug: shareSlug,
      products: moodProducts,
      minimum_spend: minimumSpend,
    },
    200,
  );
});

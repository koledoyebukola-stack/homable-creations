import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const ALLOWED_ORIGINS = [
  'https://homablecreations.com',
  'https://www.homablecreations.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const baseCorsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';

  return {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': allowedOrigin,
    Vary: 'Origin',
  };
}

type DetectedItemRow = {
  id: string;
  board_id: string;
  item_name: string;
  category: string | null;
  style: string | null;
  dominant_color: string | null;
  tags: string[] | null;
  description: string | null;
};

type AffiliateProductRow = {
  id: string;
  sku: string | null;
  product_name: string;
  category: string | null;
  subcategory: string | null;
  affiliate_url: string;
  image_url: string | null;
  price: number | null;
  sale_price: number | null;
  description: string | null;
  brand: string | null;
  model_number: string | null;
  availability: string | null;
  upc: string | null;
  currency: string | null;
  color: string | null;
  retailer: string;
};

type CategoryTarget = {
  category: string;
  subcategory: string;
};

// Canonical mapping from AI-detected item categories to Rakuten affiliate categories/subcategories.
// Keys are lowercased detected_items.category values.
const CATEGORY_MAPPING: Record<string, CategoryTarget> = {
  // Core seating
  sofa: { category: 'Furniture', subcategory: 'Sofas' },
  seating: { category: 'Furniture', subcategory: 'Sofas' },
  sectional: {
    category: 'Furniture',
    subcategory: 'Sofa Accessories~~Sectional Sofa Units',
  },
  armchair: {
    category: 'Furniture',
    subcategory: 'Chairs~~Arm Chairs, Recliners & Sleeper Chairs',
  },
  'accent chair': {
    category: 'Furniture',
    subcategory: 'Chairs~~Arm Chairs, Recliners & Sleeper Chairs',
  },
  chair: {
    category: 'Furniture',
    subcategory: 'Chairs~~Arm Chairs, Recliners & Sleeper Chairs',
  },
  'dining chair': {
    category: 'Furniture',
    subcategory: 'Chairs~~Kitchen & Dining Room Chairs',
  },
  ottoman: { category: 'Furniture', subcategory: 'Ottomans' },

  // Tables
  'coffee table': {
    category: 'Furniture',
    subcategory: 'Tables~~Accent Tables~~Coffee Tables',
  },
  'end table': {
    category: 'Furniture',
    subcategory: 'Tables~~Accent Tables~~End Tables',
  },
  'accent table': {
    category: 'Furniture',
    subcategory: 'Tables~~Accent Tables~~End Tables',
  },
  'console table': {
    category: 'Furniture',
    subcategory: 'Tables~~Accent Tables~~Sofa Tables',
  },
  'sofa table': {
    category: 'Furniture',
    subcategory: 'Tables~~Accent Tables~~Sofa Tables',
  },
  'dining table': {
    category: 'Furniture',
    subcategory: 'Tables~~Kitchen & Dining Room Tables',
  },
  nightstand: {
    category: 'Furniture',
    subcategory: 'Tables~~Nightstands',
  },

  // Beds & bedroom storage
  bed: {
    category: 'Furniture',
    subcategory: 'Beds & Accessories~~Beds & Bed Frames',
  },
  bench: {
    category: 'Furniture',
    subcategory: 'Benches~~Storage & Entryway Benches',
  },
  dresser: {
    category: 'Furniture',
    subcategory: 'Cabinets & Storage~~Dressers',
  },
  'storage cabinet': {
    category: 'Furniture',
    subcategory: 'Cabinets & Storage~~Buffets & Sideboards',
  },
  buffet: {
    category: 'Furniture',
    subcategory: 'Cabinets & Storage~~Buffets & Sideboards',
  },
  bookcase: {
    category: 'Furniture',
    subcategory: 'Shelving~~Bookcases & Standing Shelves',
  },

  // Office / media
  desk: {
    category: 'Furniture',
    subcategory: 'Office Furniture~~Desks',
  },
  'media console': {
    category: 'Furniture',
    subcategory: 'Entertainment Centers & Tv Stands',
  },
  'tv stand': {
    category: 'Furniture',
    subcategory: 'Entertainment Centers & Tv Stands',
  },

  // Decor and textiles with specific affiliate categories
  mirror: {
    category: 'Home & Garden',
    subcategory: 'Decor~~Mirrors',
  },
  vases: {
    category: 'Home & Garden',
    subcategory: 'Decor~~Vases',
  },
  vase: {
    category: 'Home & Garden',
    subcategory: 'Decor~~Vases',
  },
  bedding: {
    category: 'Home & Garden',
    subcategory: 'Linens & Bedding~~Bedding~~Bed Sheets',
  },
  throw: {
    category: 'Home & Garden',
    subcategory: 'Linens & Bedding~~Bedding~~Bed Sheets',
  },
  blanket: {
    category: 'Home & Garden',
    subcategory: 'Linens & Bedding~~Bedding~~Bed Sheets',
  },
  'throw pillow': {
    category: 'Home & Garden',
    subcategory: 'Linens & Bedding~~Bedding~~Pillows',
  },
};

// Categories that should fall back to external search buttons instead of affiliate matching.
// These are intentionally left out of CATEGORY_MAPPING so they never generate affiliate matches.
const NO_AFFILIATE_CATEGORIES = new Set<string>([
  'lighting',
  'lamp',
  'chandelier',
  'floor lamp',
  'wall sconce',
  'pendant light',
  'rug',
  'area rug',
  'wall art',
  'plants',
  'plant',
  'planter',
  'decor',
  'tableware',
  'kitchenware',
  'books',
  'book',
  'candles',
  'candle',
  'candlestick',
  'candlestick holder',
]);

function normaliseCategory(raw: string | null): string {
  return (raw || '').trim().toLowerCase();
}

function buildItemText(item: DetectedItemRow): string {
  const parts: string[] = [];
  if (item.item_name) parts.push(item.item_name);
  if (item.category) parts.push(item.category);
  if (item.style) parts.push(item.style);
  if (item.dominant_color) parts.push(item.dominant_color);
  if (item.tags && item.tags.length > 0) parts.push(item.tags.join(' '));
  if (item.description) parts.push(item.description);
  return parts.join(' ').toLowerCase();
}

function buildProductText(p: AffiliateProductRow): string {
  const parts: string[] = [];
  if (p.product_name) parts.push(p.product_name);
  if (p.subcategory) parts.push(p.subcategory);
  if (p.brand) parts.push(p.brand);
  if (p.color) parts.push(p.color);
  if (p.description) parts.push(p.description);
  return parts.join(' ').toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 2);
}

// Lightweight lexical scoring using AI-detected metadata (no extra API calls).
function computeMatchScore(item: DetectedItemRow, product: AffiliateProductRow): number {
  const itemText = buildItemText(item);
  const productText = buildProductText(product);

  const itemTokens = tokenize(itemText);
  const productTokens = tokenize(productText);

  let score = 0;

  // 1. Strong boost for name/keyword overlap
  const productTokenSet = new Set(productTokens);
  for (const token of itemTokens) {
    if (productTokenSet.has(token)) {
      score += 1.5;
    }
  }

  // 2. Category/subcategory hint
  const itemCategory = normaliseCategory(item.category);
  if (itemCategory && productText.includes(itemCategory)) {
    score += 2;
  }

  // 3. Color match
  const color = normaliseCategory(item.dominant_color);
  if (color && productText.includes(color)) {
    score += 1.5;
  }

  // 4. Style match
  const style = normaliseCategory(item.style);
  if (style && productText.includes(style)) {
    score += 1;
  }

  return score;
}

function normaliseScore(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  // Cap to a 0–10 range so we never store thousands.
  return Math.min(10, raw);
}

type GptRankingEntry = {
  index: number;
  score: number;
};

async function rankWithGpt(
  requestId: string,
  item: DetectedItemRow,
  candidates: AffiliateProductRow[],
): Promise<GptRankingEntry[] | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.warn(`[${requestId}] OPENAI_API_KEY not set – skipping GPT re-rank`);
    return null;
  }

  if (candidates.length === 0) {
    return null;
  }

  const openai = new OpenAI({ apiKey });

  const limitedCandidates = candidates.slice(0, 20);

  const itemSummary = {
    name: item.item_name,
    category: item.category,
    style: item.style,
    color: item.dominant_color,
    description: item.description,
    tags: item.tags,
  };

  const candidatePayload = limitedCandidates.map((p, index) => ({
    index,
    product_name: p.product_name,
    subcategory: p.subcategory,
    color: p.color,
    brand: p.brand,
    description: p.description,
    price: p.sale_price ?? p.price,
  }));

  const prompt = `
You are helping match a detected decor item from a room photo to affiliate catalog products.

The detected item:
${JSON.stringify(itemSummary, null, 2)}

The candidate products (from Ashley and TOV):
${JSON.stringify(candidatePayload, null, 2)}

TASK:
- Rank the candidates by how well they visually and stylistically match the detected item.
- Consider, in order of importance:
  1) SHAPE and structure (L-shaped vs straight sofa; round vs rectangular table; low vs high back, etc.).
     IMPORTANT: If the detected item is rectangular (e.g. a rectangular coffee table), a ROUND coffee table must NOT
     rank above a rectangular one unless all rectangular options are clearly terrible matches.
  2) COLOR accuracy (primary color should be as close as possible).
  3) STYLE match (e.g. bohemian vs modern vs farmhouse vs glam).
  4) MATERIAL where visible (e.g. linen vs leather, wood vs metal vs glass).

SCORING:
- For each returned product, assign a score from 0 to 10 (10 = excellent visual match, 0 = completely wrong).
- Use the full 0–10 range; do not exceed 10.

OUTPUT:
- Return a JSON array ONLY, no extra text, no comments:
  [
    { "index": <candidate_index>, "score": <0-10 number> },
    ...
  ]
- The array MUST contain at most 3 entries (top 3 matches).
- "index" MUST correspond to the "index" of the candidate in the candidateProducts list above.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const content =
      completion.choices[0]?.message?.content?.trim() ?? '[]';

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.error(
        `[${requestId}] Failed to parse GPT ranking JSON:`,
        jsonError,
        'content=',
        content,
      );
      return null;
    }

    if (!Array.isArray(parsed)) {
      console.error(
        `[${requestId}] GPT ranking output is not an array:`,
        parsed,
      );
      return null;
    }

    const results: GptRankingEntry[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry.index === 'number' &&
        entry.index >= 0 &&
        entry.index < limitedCandidates.length &&
        typeof entry.score === 'number'
      ) {
        const clampedScore = normaliseScore(entry.score);
        results.push({ index: entry.index, score: clampedScore });
      }
    }

    if (results.length === 0) {
      console.warn(`[${requestId}] GPT ranking returned no valid entries`);
      return null;
    }

    return results.slice(0, 3);
  } catch (e) {
    console.error(
      `[${requestId}] GPT re-ranking failed, falling back to lexical scores:`,
      e,
    );
    return null;
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const corsHeaders = getCorsHeaders(req);

  console.log(
    `[${requestId}] match_affiliate_products request:`,
    req.method,
    req.url,
  );

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const body = await req.json();
    const boardId = body.board_id as string | undefined;

    if (!boardId) {
      return new Response(
        JSON.stringify({ error: 'board_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch detected items for this board
    const { data: items, error: itemsError } = await supabase
      .from('detected_items')
      .select(
        'id, board_id, item_name, category, style, dominant_color, tags, description',
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error(`[${requestId}] Failed to fetch detected_items:`, itemsError);
      throw new Error('Failed to fetch detected items');
    }

    if (!items || items.length === 0) {
      console.log(`[${requestId}] No detected items found for board`, boardId);
      return new Response(
        JSON.stringify({
          board_id: boardId,
          item_count: 0,
          match_rows_upserted: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `[${requestId}] Found ${items.length} detected items for board ${boardId}`,
    );

    const allMatches: {
      detected_item_id: string;
      affiliate_product_id: string;
      match_score: number;
      is_top_pick: boolean;
      rank: number;
    }[] = [];

    // Process each detected item independently
    for (const rawItem of items as DetectedItemRow[]) {
      const catKey = normaliseCategory(rawItem.category);

      if (!catKey) {
        console.log(
          `[${requestId}] Skipping item ${rawItem.id} (${rawItem.item_name}) - no category`,
        );
        continue;
      }

      if (NO_AFFILIATE_CATEGORIES.has(catKey)) {
        console.log(
          `[${requestId}] Skipping item ${rawItem.id} (${rawItem.item_name}) - category in NO_AFFILIATE_CATEGORIES (${catKey})`,
        );
        continue;
      }

      const target = CATEGORY_MAPPING[catKey];
      if (!target) {
        console.log(
          `[${requestId}] No affiliate mapping for category "${catKey}" (item ${rawItem.id})`,
        );
        continue;
      }

      console.log(
        `[${requestId}] Matching item ${rawItem.id} (${rawItem.item_name}) -> ${target.category} / ${target.subcategory}`,
      );

      const { data: candidates, error: candidatesError } = await supabase
        .from('affiliate_products')
        .select(
          'id, sku, product_name, category, subcategory, affiliate_url, image_url, price, sale_price, description, brand, model_number, availability, upc, currency, color, retailer',
        )
        .eq('category', target.category)
        .eq('subcategory', target.subcategory)
        .eq('availability', 'in stock')
        .limit(20);

      if (candidatesError) {
        console.error(
          `[${requestId}] Failed to fetch affiliate candidates for item ${rawItem.id}:`,
          candidatesError,
        );
        continue;
      }

      if (!candidates || candidates.length === 0) {
        console.log(
          `[${requestId}] No affiliate candidates found for item ${rawItem.id}`,
        );
        continue;
      }

      const candidateRows = candidates as AffiliateProductRow[];

      // Stage 2: GPT re-ranking
      const gptRanking = await rankWithGpt(requestId, rawItem, candidateRows);

      if (gptRanking && gptRanking.length > 0) {
        gptRanking.forEach((entry, index) => {
          const product = candidateRows[entry.index];
          if (!product) return;
          allMatches.push({
            detected_item_id: rawItem.id,
            affiliate_product_id: product.id,
            match_score: normaliseScore(entry.score),
            is_top_pick: index === 0,
            rank: index + 1,
          });
        });
        console.log(
          `[${requestId}] GPT re-ranked ${gptRanking.length} matches for item ${rawItem.id}`,
        );
      } else {
        // Fallback: lexical scoring only
        const scored = candidateRows
          .map((product) => {
            const rawScore = computeMatchScore(rawItem, product);
            return {
              product,
              rawScore,
              score: normaliseScore(rawScore),
            };
          })
          .filter((entry) => entry.score >= 3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (scored.length === 0) {
          console.log(
            `[${requestId}] No sufficiently strong affiliate matches for item ${rawItem.id} (lexical fallback)`,
          );
          continue;
        }

        scored.forEach((entry, index) => {
          allMatches.push({
            detected_item_id: rawItem.id,
            affiliate_product_id: entry.product.id,
            match_score: entry.score,
            is_top_pick: index === 0,
            rank: index + 1,
          });
        });

        console.log(
          `[${requestId}] Lexical fallback selected ${scored.length} matches for item ${rawItem.id}`,
        );
      }
    }

    if (allMatches.length > 0) {
      const { error: upsertError } = await supabase
        .from('item_affiliate_matches')
        .upsert(allMatches, {
          onConflict: 'detected_item_id,affiliate_product_id',
        });

      if (upsertError) {
        console.error(`[${requestId}] Failed to upsert matches:`, upsertError);
        throw new Error('Failed to upsert affiliate matches');
      }
    }

    console.log(
      `[${requestId}] Finished matching. Upserted ${allMatches.length} rows.`,
    );

    return new Response(
      JSON.stringify({
        board_id: boardId,
        item_count: (items as DetectedItemRow[]).length,
        match_rows_upserted: allMatches.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error(`[${requestId}] Unexpected error:`, e);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});


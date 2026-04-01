/**
 * AI Room Generator Edge Function (single-file bundle for Supabase deploy).
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/**
 * Room-type + mood composition strings for AI Room image generation.
 * Combined in buildAiRoomFullPrompt with products + shared Nigerian/layout/quality blocks.
 */

export type AiRoomMoodId = 'afro_luxe' | 'warm_earthy' | 'minimal_lagos' | 'bold_colourful';

export const NIGERIAN_ROOM_CONTEXT = `Nigerian home context throughout:
POP tray ceiling with recessed lighting.
Large format ceramic or porcelain tiles.
Casement windows with aluminium frames.
One split unit AC on upper wall only — do not duplicate.
Warm recessed ceiling lighting.`;

export const LAYOUT_INSTRUCTION = `Keep the room's original architecture exactly — walls, floor, windows, ceiling height, doors, dimensions.
Do not add or remove walls or doors.
Do not change window positions or sizes.
Do not duplicate the AC unit.`;

export const QUALITY_INSTRUCTION = `Shot quality: Architectural Digest / Vogue Living editorial standard.
Sony A7R V.
Every surface must have tactile realism — fabric weave visible, wood grain present, wall texture tangible, ceramic tiles reflective.
Warm natural light from windows.
No flat or plastic-looking surfaces.
Photorealistic, not illustrated.`;

const LIVING_ROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this living room as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in deep navy or charcoal with slim vertical batten panels floor to ceiling. One large bold Nigerian figurative painting centred on the feature wall in a thick gold or black frame. Two slim brass picture lights mounted above the painting. Remaining walls warm white.

FURNITURE:
One large dark sofa — charcoal, navy or deep brown velvet — against the feature wall, seats 3.
One accent chair in complementary dark tone flanking the sofa.
One oval or round dark coffee table centred in the seating arrangement.
All front legs of furniture on the rug.

FLOOR:
One large area rug in dark tones or deep jewel colour anchoring all seating. Significant tile border visible on all sides.

LIGHTING:
One statement pendant light or sputnik chandelier centred on ceiling.
Warm amber recessed lighting.

CURTAINS:
Floor length curtains in deep velvet — navy, charcoal or forest green. Hung from ceiling height to floor.

ACCESSORIES:
One tall potted plant in dark ceramic pot in corner.
Brass decorative objects on any console surface.
Minimal — every object intentional.

Do not add a second AC unit.
Do not add more than one coffee table.
Do not change window positions or sizes.`,

  warm_earthy: `Reimagine this living room as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta or warm clay smooth plaster. One botanical or figurative painting in natural wood frame centred on feature wall. Remaining walls warm white or cream.

FURNITURE:
One large cream or warm beige upholstered sofa against main wall, seats 3, clean lines no tufting.
One natural rattan or woven accent chair flanking the sofa.
One set of nested natural wood coffee tables centred in arrangement.
All front legs of furniture on rug.

FLOOR:
One large jute or wool area rug in cream or natural tones.
Significant tile border on all sides.

LIGHTING:
One natural rattan or woven pendant light hanging from ceiling centre.
Warm Edison bulb clearly visible.

CURTAINS:
Floor length linen or cotton curtains in warm cream or terracotta tone.
Hung from ceiling height to floor.
Sheer white layer behind.

ACCESSORIES:
One large ceramic floor vase or tall tropical plant in terracotta pot.
Woven basket. Natural wood objects.
Warm and organic throughout.

Do not add a second AC unit.
Do not add more than one coffee table.`,

  minimal_lagos: `Reimagine this living room as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white smooth plaster. One large abstract painting the only colour accent — thin black frame, hung precisely centred on main wall at exact eye level. One round or oval mirror on the side wall.

FURNITURE:
One large neutral sofa in cream light grey or white, clean lines, no tufting, seats 3.
One statement accent chair in contrasting neutral tone.
One marble or stone coffee table centred in arrangement.
All front legs of furniture on rug.

FLOOR:
One thin area rug in cream or light grey. All four sides of rug visible with tile border.

LIGHTING:
One architectural pendant light or sputnik chandelier.
Clean white or soft neutral light.

CURTAINS:
Floor length sheer white curtains.
Simple and clean.

ACCESSORIES:
Maximum 3 decorative objects total.
One architectural plant — snake plant or fiddle leaf fig. Nothing else.

Do not add a second AC unit.
Do not add more than one coffee table.`,

  bold_colourful: `Reimagine this living room as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in a strong colour — deep teal, burnt orange or rich mustard yellow.
Smooth plaster finish.
One large scale abstract artwork in bold colours on feature wall.
Remaining walls warm white.

FURNITURE:
One statement velvet sofa in a colour that complements the wall:
If wall teal → sofa mustard or rust
If wall orange → sofa teal or green
If wall mustard → sofa teal or burgundy
One or two accent chairs in a third complementary colour.
One sculptural coffee table.
All front legs of furniture on rug.

FLOOR:
One patterned area rug with colours tying all furniture together.

LIGHTING:
One dramatic sculptural pendant.
Warm lighting throughout.

CURTAINS:
Floor length curtains in a bold complementary tone.

ACCESSORIES:
Mixed cushions with complementary patterns. Tall plant. Coloured ceramic vases. Bold but intentional.

Do not add a second AC unit.
Do not add more than one coffee table.`,
};

const BEDROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this bedroom as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
Headboard wall in deep navy or charcoal smooth plaster or upholstered fabric panels.
One large Nigerian portrait painting above or beside the bed.
Remaining walls warm white.

FURNITURE:
One king or queen bed with upholstered headboard in dark fabric, centred against headboard wall.
Two matching dark wood bedside tables.
One upholstered bench at foot of bed.

FLOOR:
One large plush rug under lower half of bed and beside tables.

LIGHTING:
Two bedside table lamps in brass.
One statement ceiling pendant or chandelier.

CURTAINS:
Floor length velvet curtains in deep navy or forest green.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this bedroom as a warm earthy Nigerian space.

WALL TREATMENT:
Headboard wall in dusty sage or warm terracotta. Botanical artwork in natural wood frame above bed.
Remaining walls warm white or cream.

FURNITURE:
One bed with natural linen or boucle upholstered headboard.
Two natural wood bedside tables.

FLOOR:
One large natural jute or wool rug under lower half of bed.

LIGHTING:
Two warm bedside lamps.
One rattan pendant above centre.

CURTAINS:
Floor length linen in warm cream or sage tone.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this bedroom as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white.
One large abstract artwork above bed.
Simple oval mirror on side wall.

FURNITURE:
One platform bed, clean lines, light wood or white upholstered.
Two minimalist bedside tables.

FLOOR:
One thin neutral rug beside bed.

LIGHTING:
Two simple bedside lamps.
One architectural ceiling pendant.

CURTAINS:
Floor length sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this bedroom as a bold colourful Nigerian space.

WALL TREATMENT:
Headboard wall in a bold colour — deep teal, mustard or emerald green.
One large bold artwork above bed.
Remaining walls warm white.

FURNITURE:
One upholstered bed in a complementary rich tone.
Two bedside tables in contrasting colour or material.

FLOOR:
One patterned rug beside bed.

LIGHTING:
Two statement bedside lamps.
One dramatic ceiling pendant.

CURTAINS:
Floor length curtains in bold complementary tone.

Do not add a second AC unit.`,
};

const DINING_ROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this dining room as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in deep navy or charcoal. One large artwork on feature wall in gold frame.
Remaining walls warm white.

FURNITURE:
One rectangular or oval dining table in dark wood or marble top.
4-6 upholstered dining chairs in dark velvet or leather.

LIGHTING:
One dramatic pendant or chandelier directly above dining table centre.

CURTAINS:
Floor length velvet curtains.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this dining room as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta.
Botanical artwork in natural frame.
Remaining walls warm white.

FURNITURE:
One natural wood dining table seats 4-6.
Boucle or fabric dining chairs in cream or warm tone.

LIGHTING:
One woven rattan pendant above table.

CURTAINS:
Floor length linen curtains in warm cream or earthy tone.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this dining room as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white.
One large abstract artwork on main wall.

FURNITURE:
One clean lined dining table in marble or light wood.
Simple upholstered dining chairs.

LIGHTING:
One architectural pendant above table.

CURTAINS:
Floor length sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this dining room as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in bold colour.
Large scale abstract artwork.
Remaining walls warm white.

FURNITURE:
Mixed dining chairs in complementary bold colours around a statement table.

LIGHTING:
One dramatic sculptural pendant.

CURTAINS:
Bold complementary floor length curtains.

Do not add a second AC unit.`,
};

const HOME_OFFICE: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this home office as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in charcoal or forest green. Nigerian artwork or abstract art in gold frame.
Remaining walls warm white.
Built-in shelving or floating shelves on side wall if space allows.

FURNITURE:
One large executive desk in dark wood against or perpendicular to feature wall.
One premium leather or velvet desk chair in dark tone.
One bookshelf or storage unit.

LIGHTING:
One brass desk lamp on desk.
One statement ceiling pendant.

CURTAINS:
Floor length curtains in deep tone.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this home office as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta or warm sage. Botanical artwork.

FURNITURE:
One natural wood desk.
One warm upholstered desk chair.
One rattan or wood storage unit.

LIGHTING:
One warm desk lamp.
One rattan pendant.

CURTAINS:
Linen curtains in warm cream.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this home office as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean white.
One large abstract artwork.
Floating shelves on side wall.

FURNITURE:
One clean lined white or light wood desk. Minimalist desk chair.
Simple storage.

LIGHTING:
One architectural desk lamp.
One simple pendant.

CURTAINS:
Sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this home office as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in bold colour — teal, mustard or deep orange.
Large bold abstract artwork.

FURNITURE:
Statement desk in contrasting colour or material.
Bold upholstered desk chair.

LIGHTING:
One sculptural desk lamp.
One dramatic pendant.

CURTAINS:
Bold complementary curtains.

Do not add a second AC unit.`,
};

const WALL_STYLING: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this wall as a premium Afro-luxe Nigerian feature wall.
No furniture except a slim console table or bench against the wall.

WALL TREATMENT:
Deep navy or charcoal wall with slim vertical batten panels.
Arrangement of 2-3 Nigerian artworks in gold or black frames.
Two slim brass picture lights above the largest artwork.
One floor to near-ceiling arched mirror if wall width allows.

ACCESSORIES:
One tall plant in dark ceramic pot.
Brass objects on console if present.

Do not add furniture beyond a slim console or bench.`,

  warm_earthy: `Reimagine this wall as a warm earthy Nigerian feature wall.

WALL TREATMENT:
Terracotta or warm clay plaster wall.
2-3 botanical or figurative artworks in natural wood frames.
One round rattan mirror.

ACCESSORIES:
Dried pampas grass. Terracotta vases.
Woven wall hanging if appropriate.`,

  minimal_lagos: `Reimagine this wall as a minimal Lagos Nigerian feature wall.

WALL TREATMENT:
Clean warm white wall.
One large oversized abstract artwork perfectly centred — the only element.
One simple round mirror offset to the side.

No accessories. No clutter.`,

  bold_colourful: `Reimagine this wall as a bold colourful Nigerian feature wall.

WALL TREATMENT:
One strong colour-blocked wall — deep teal, mustard or burnt orange.
One large bold abstract artwork.
One sculptural or sunburst mirror.

ACCESSORIES:
Coloured ceramic vases.
Tall dramatic plant.`,
};

const BY_ROOM_TYPE: Record<string, Record<AiRoomMoodId, string>> = {
  living_room: LIVING_ROOM,
  bedroom: BEDROOM,
  dining_room: DINING_ROOM,
  home_office: HOME_OFFICE,
  wall_styling: WALL_STYLING,
};

export function getCompositionPrompt(roomType: string, mood: AiRoomMoodId): string {
  const table = BY_ROOM_TYPE[roomType];
  if (!table) {
    return BY_ROOM_TYPE.living_room[mood] ?? LIVING_ROOM[mood];
  }
  return table[mood] ?? LIVING_ROOM[mood];
}

export function buildAiRoomFullPrompt(params: {
  roomType: string;
  mood: AiRoomMoodId;
  productLines: string[];
}): string {
  const { roomType, mood, productLines } = params;
  const composition = getCompositionPrompt(roomType, mood);
  const productsBlock = `Feature these specific products:\n${productLines.join('\n')}`;
  return [composition, productsBlock, NIGERIAN_ROOM_CONTEXT, LAYOUT_INSTRUCTION, QUALITY_INSTRUCTION].join('\n\n');
}

/**
 * AI Room product pool + category diversity selection (Deno Edge).
 */
export const PRODUCTS_MIN = 3;
export const PRODUCTS_MAX_DEFAULT = 6;
export const PRODUCTS_MAX_LIVING = 7;

export interface MoodProduct {
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

interface PoolRow {
  id: string;
  name: string;
  category: string | null;
  material: string | null;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  attributes: unknown;
  vendor_name: string;
  whatsapp_number: string;
  storefront_slug: string;
  storefront_id: string;
}

type SlotDef = {
  kind: string;
  categories: string[];
  optional?: boolean;
  anyFallback?: boolean;
};

function dedupePool(pool: (MoodProduct & { attributes?: unknown })[]): (MoodProduct & { attributes?: unknown })[] {
  const seen = new Set<string>();
  return pool.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function mapRow(row: PoolRow): MoodProduct & { attributes?: unknown } {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    material: row.material ?? null,
    image_url: row.image_url,
    price_min: row.price_min,
    price_max: row.price_max,
    vendor_name: row.vendor_name,
    whatsapp_number: row.whatsapp_number,
    storefront_slug: row.storefront_slug,
    storefront_id: row.storefront_id,
    attributes: row.attributes,
  };
}

function stripAttributes(p: MoodProduct & { attributes?: unknown }): MoodProduct {
  const { attributes: _a, ...rest } = p;
  return rest;
}

function categoryMatches(category: string | null, keywords: string[]): boolean {
  const c = (category || '').toLowerCase().trim();
  return keywords.some((kw) => c === kw || c.includes(kw));
}

function attrsMatchRoomType(attrs: unknown, roomType: string): boolean {
  if (attrs == null || typeof attrs !== 'object') return false;
  const a = attrs as Record<string, unknown>;
  const rt = a.room_type;
  if (rt === 'any') return true;
  if (Array.isArray(rt)) return rt.includes(roomType) || rt.includes('any');
  if (typeof rt === 'string') {
    return rt.split(/[, ]+/).filter(Boolean).includes(roomType) || rt === 'any';
  }
  return false;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function storefrontCountOk(
  storefrontId: string,
  counts: Map<string, number>,
  maxPerStorefront: number,
): boolean {
  return (counts.get(storefrontId) ?? 0) < maxPerStorefront;
}

function bumpStorefront(storefrontId: string, counts: Map<string, number>): void {
  counts.set(storefrontId, (counts.get(storefrontId) ?? 0) + 1);
}

function pickOne(
  pool: (MoodProduct & { attributes?: unknown })[],
  used: Set<string>,
  storefrontCounts: Map<string, number>,
  slotCategories: string[],
  roomType: string,
  options: { anyFallback?: boolean; optional?: boolean },
): MoodProduct & { attributes?: unknown } | null {
  const preferred = pool.filter((p) => attrsMatchRoomType(p.attributes, roomType));
  const other = pool.filter((p) => !attrsMatchRoomType(p.attributes, roomType));

  const tryPick = (candidates: (MoodProduct & { attributes?: unknown })[]): (MoodProduct & { attributes?: unknown }) | null => {
    const catMatch = (p: MoodProduct) =>
      options.anyFallback ? true : categoryMatches(p.category, slotCategories);
    const ordered = shuffle(candidates.filter((p) => !used.has(p.id) && catMatch(p)));
    for (const p of ordered) {
      if (!storefrontCountOk(p.storefront_id, storefrontCounts, 2)) continue;
      return p;
    }
    return null;
  };

  let found = tryPick(preferred);
  if (!found) found = tryPick(other);
  return found;
}

function selectWallStyling(
  pool: (MoodProduct & { attributes?: unknown })[],
): (MoodProduct & { attributes?: unknown })[] {
  const shuffled = shuffle(pool);
  const counts = new Map<string, number>();
  const used = new Set<string>();
  const picked: (MoodProduct & { attributes?: unknown })[] = [];
  for (const p of shuffled) {
    if (used.has(p.id)) continue;
    if (!storefrontCountOk(p.storefront_id, counts, 2)) continue;
    used.add(p.id);
    bumpStorefront(p.storefront_id, counts);
    picked.push(p);
    if (picked.length >= 6) break;
  }
  return picked;
}

function selectBySlots(
  roomType: string,
  pool: (MoodProduct & { attributes?: unknown })[],
  slots: SlotDef[],
): (MoodProduct & { attributes?: unknown })[] {
  const used = new Set<string>();
  const storefrontCounts = new Map<string, number>();
  const picked: (MoodProduct & { attributes?: unknown })[] = [];

  for (const slot of slots) {
    if (slot.kind === 'curtains_or_any') {
      let chosen = pickOne(pool, used, storefrontCounts, ['curtains', 'curtain'], roomType, {
        anyFallback: false,
      });
      if (!chosen) {
        chosen = pickOne(pool, used, storefrontCounts, [], roomType, { anyFallback: true });
      }
      if (chosen) {
        used.add(chosen.id);
        bumpStorefront(chosen.storefront_id, storefrontCounts);
        picked.push(chosen);
      }
      continue;
    }

    if (slot.kind === 'mirror_or_storage') {
      let chosen = pickOne(pool, used, storefrontCounts, ['mirror', 'storage'], roomType, {
        anyFallback: false,
      });
      if (!chosen) {
        chosen = pickOne(pool, used, storefrontCounts, [], roomType, { anyFallback: true });
      }
      if (chosen) {
        used.add(chosen.id);
        bumpStorefront(chosen.storefront_id, storefrontCounts);
        picked.push(chosen);
      }
      continue;
    }

    const categories = slot.categories;
    const anyFb = 'anyFallback' in slot && slot.anyFallback === true;

    let chosen: (MoodProduct & { attributes?: unknown }) | null = pickOne(
      pool,
      used,
      storefrontCounts,
      categories,
      roomType,
      { anyFallback: anyFb },
    );

    if (!chosen && anyFb) {
      chosen = pickOne(pool, used, storefrontCounts, [], roomType, { anyFallback: true });
    }

    if (!chosen && slot.optional) {
      continue;
    }
    if (!chosen) {
      chosen = pickOne(pool, used, storefrontCounts, categories, roomType, { anyFallback: true });
    }
    if (!chosen) {
      continue;
    }
    used.add(chosen.id);
    bumpStorefront(chosen.storefront_id, storefrontCounts);
    picked.push(chosen);
  }

  return picked;
}

const SLOTS: Record<string, SlotDef[]> = {
  living_room: [
    { kind: 'seating', categories: ['seating', 'sofa'] },
    { kind: 'artwork', categories: ['artwork'] },
    { kind: 'lighting', categories: ['lighting'] },
    { kind: 'rugs', categories: ['rugs', 'rug'] },
    { kind: 'planters_or_mirror', categories: ['planters', 'planter', 'mirror'] },
    { kind: 'curtains_or_any', categories: ['curtains', 'curtain'] },
    { kind: 'door_and_panel', categories: ['door and panel', 'door_panel', 'panel', 'tv wall', 'tv_wall'], optional: true },
  ],
  bedroom: [
    { kind: 'bed', categories: ['bed'] },
    { kind: 'artwork', categories: ['artwork'] },
    { kind: 'lighting', categories: ['lighting'] },
    { kind: 'rugs', categories: ['rugs', 'rug'] },
    { kind: 'mirror', categories: ['mirror'] },
    { kind: 'storage', categories: ['storage'] },
  ],
  dining_room: [
    { kind: 'dining', categories: ['dining', 'dining-table', 'dining_seating', 'dining table'] },
    { kind: 'artwork', categories: ['artwork'] },
    { kind: 'lighting', categories: ['lighting'] },
    { kind: 'planters', categories: ['planters', 'planter'] },
    { kind: 'rugs', categories: ['rugs', 'rug'] },
    { kind: 'mirror_or_storage', categories: ['mirror', 'storage'] },
  ],
  home_office: [
    { kind: 'seating', categories: ['seating', 'sofa', 'chair'] },
    { kind: 'artwork', categories: ['artwork'] },
    { kind: 'lighting', categories: ['lighting'] },
    { kind: 'storage', categories: ['storage'] },
    { kind: 'planters', categories: ['planters', 'planter'] },
    { kind: 'mirror', categories: ['mirror'] },
  ],
};

export async function getProductsForMood(
  supabase: SupabaseClient,
  mood: AiRoomMoodId,
  roomType: string,
): Promise<{ products: MoodProduct[]; minimum_spend: number | null }> {
  let raw: PoolRow[] = [];

  if (roomType === 'wall_styling') {
    const { data, error } = await supabase.rpc('ai_room_products_wall_styling_scenes');
    if (error) {
      console.error('[getProductsForMood] wall_styling RPC:', error);
      throw new Error('Failed to load products for wall styling');
    }
    raw = (data || []) as PoolRow[];
  } else {
    const { data, error } = await supabase.rpc('ai_room_products_by_mood_tags', { p_mood: mood });
    if (error) {
      console.error('[getProductsForMood] mood_tags RPC:', error);
      throw new Error('Failed to load products for mood');
    }
    raw = (data || []) as PoolRow[];
  }

  if (!raw.length) {
    throw new Error('Not enough products available for this style');
  }

  const pool = dedupePool(raw.map(mapRow));

  let selected: (MoodProduct & { attributes?: unknown })[] = [];

  if (roomType === 'wall_styling') {
    selected = selectWallStyling(pool);
  } else {
    const slots = SLOTS[roomType] ?? SLOTS.living_room;
    selected = selectBySlots(roomType, pool, slots);
  }

  if (selected.length < PRODUCTS_MIN) {
    throw new Error('Not enough products available for this style');
  }

  const maxCap = roomType === 'living_room' ? PRODUCTS_MAX_LIVING : PRODUCTS_MAX_DEFAULT;
  const capped = selected.slice(0, maxCap);

  const prices = capped.map((p) => p.price_min).filter((v): v is number => typeof v === 'number');
  const minimum_spend = prices.length ? prices.reduce((sum, v) => sum + v, 0) : null;

  return {
    products: capped.map(stripAttributes),
    minimum_spend,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPECTED_AMOUNT_KOBo = 200_000; // ₦2,000

const ALLOWED_ROOM_TYPES = new Set([
  'living_room',
  'bedroom',
  'dining_room',
  'home_office',
  'wall_styling',
]);

interface RequestBody {
  mood?: AiRoomMoodId;
  room_type?: string;
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

async function getProductsByIds(
  supabase: SupabaseClient,
  ids: string[],
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
      `,
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

/**
 * OpenAI Responses API: image is on items with type `image_generation_call` and field `result` (base64).
 * Some responses nest these under `output[].content[]` — walk the tree if the flat filter misses.
 */
function extractImageBase64FromOpenAIResponse(openaiJson: unknown): string | undefined {
  if (!openaiJson || typeof openaiJson !== 'object') return undefined;

  const tryFromOutputArray = (arr: unknown[]): string | undefined => {
    for (const o of arr) {
      if (!o || typeof o !== 'object') continue;
      const item = o as Record<string, unknown>;
      if (item.type === 'image_generation_call' && typeof item.result === 'string') {
        return item.result;
      }
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && typeof c === 'object') {
            const cc = c as Record<string, unknown>;
            if (cc.type === 'image_generation_call' && typeof cc.result === 'string') {
              return cc.result;
            }
          }
        }
      }
    }
    return undefined;
  };

  const root = openaiJson as Record<string, unknown>;
  if (Array.isArray(root.output)) {
    const direct = tryFromOutputArray(root.output);
    if (direct) return direct;
  }

  const walk = (node: unknown, depth: number): string | undefined => {
    if (depth > 20 || node == null) return undefined;
    if (typeof node === 'object' && !Array.isArray(node)) {
      const n = node as Record<string, unknown>;
      if (n.type === 'image_generation_call' && typeof n.result === 'string') {
        return n.result;
      }
      for (const v of Object.values(n)) {
        const found = walk(v, depth + 1);
        if (found) return found;
      }
    }
    if (Array.isArray(node)) {
      for (const el of node) {
        const found = walk(el, depth + 1);
        if (found) return found;
      }
    }
    return undefined;
  };

  return walk(openaiJson, 0);
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
  const { mood, room_type, paystack_reference, original_image_url, user_id, test_mode } = body;

  if (!mood || !['afro_luxe', 'warm_earthy', 'minimal_lagos', 'bold_colourful'].includes(mood)) {
    return jsonResponse({ error: 'invalid_mood', message: 'mood is required and must be a valid mood id' }, 400);
  }
  if (!room_type || typeof room_type !== 'string' || !ALLOWED_ROOM_TYPES.has(room_type.trim())) {
    return jsonResponse({ error: 'invalid_room_type', message: 'room_type is required and must be a valid room type' }, 400);
  }
  const roomTypeNorm = room_type.trim();

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

  let moodProducts: MoodProduct[];
  let minimumSpend: number | null;
  try {
    const { products, minimum_spend } = await getProductsForMood(supabase, mood, roomTypeNorm);
    moodProducts = products;
    minimumSpend = minimum_spend;
  } catch (e) {
    console.error('[ai-room-generate] getProductsForMood error:', e);
    return jsonResponse(
      { error: 'style_unavailable', message: 'Not enough products available for this style' },
      503,
    );
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('[ai-room-generate] OPENAI_API_KEY not configured');
    return jsonResponse(
      { error: 'server_config', message: 'AI configuration missing' },
      500,
    );
  }

  const productLines = moodProducts.map((p) => {
    const priceText =
      typeof p.price_min === 'number'
        ? `priced from ₦${p.price_min.toLocaleString('en-NG')}`
        : 'price on request';
    const materialText = p.material ? `${p.material}, ` : '';
    return `- ${p.name} by ${p.vendor_name}: ${materialText}${priceText}`;
  });

  const fullPrompt = buildAiRoomFullPrompt({
    roomType: roomTypeNorm,
    mood,
    productLines,
  });

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
        tool_choice: 'required',
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
    let imageBase64: string | undefined =
      imageGenerationCalls.length > 0
        ? imageGenerationCalls[0].result
        : undefined;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      imageBase64 = extractImageBase64FromOpenAIResponse(openaiJson);
    }

    console.log(
      '[step] image found:',
      imageBase64 ? 'yes' : 'no',
    );

    if (!imageBase64) {
      try {
        const types = Array.isArray(openaiJson?.output)
          ? (openaiJson.output as any[]).map((o) => o?.type)
          : [];
        console.error('[ai-room-generate] output item types (debug):', JSON.stringify(types));
      } catch {
        // ignore
      }
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

  const selectedProductIds = moodProducts.map((p) => p.id);

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

  const rowPayload = {
    generated_image_url: generatedImageUrl,
    product_ids: selectedProductIds,
    share_slug: shareSlug,
    room_type: roomTypeNorm,
    mood,
  };

  if (existingRow) {
    const { error: updateError } = await supabase
      .from('ai_generations')
      .update(rowPayload)
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
        room_type: roomTypeNorm,
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

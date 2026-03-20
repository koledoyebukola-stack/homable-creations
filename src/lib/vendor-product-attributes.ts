/**
 * Homable vendor product attribute vocabulary (shared + category-specific).
 * Stored in DB as JSONB on `vendor_product_attributes.attributes` (one row per vendor_product).
 * Category-specific keys use prefixes (e.g. `seating_shape`, `planter_style`) so they never
 * collide with shared keys (`style`, `finish_tone`, …) or each other.
 */

// ─── Shared (all categories) ───────────────────────────────────────────────

export const MOOD_TAGS = [
  'afro_luxe',
  'warm_earthy',
  'minimal_lagos',
  'bold_colourful',
] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export const ROOM_TYPES = [
  'living_room',
  'bedroom',
  'dining_room',
  'home_office',
  'outdoor',
  'any',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const COLOR_FAMILIES = [
  'dark',
  'neutral',
  'warm',
  'light',
  'bold',
  'mixed',
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export const PRIMARY_COLORS = [
  'black',
  'white',
  'cream',
  'brown',
  'grey',
  'navy',
  'green',
  'terracotta',
  'gold',
  'pink',
  'blue',
  'natural',
  'multicolor',
] as const;
export type PrimaryColor = (typeof PRIMARY_COLORS)[number];

export const STYLES = [
  'modern',
  'traditional',
  'minimalist',
  'maximalist',
  'bohemian',
  'afro-contemporary',
] as const;
export type Style = (typeof STYLES)[number];

export const FINISH_TONES = ['light', 'mid', 'dark'] as const;
export type FinishTone = (typeof FINISH_TONES)[number];

export const PRICE_TIERS = ['budget', 'mid', 'premium'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const NIGERIAN_MADE = ['yes', 'no', 'unknown'] as const;
export type NigerianMade = (typeof NIGERIAN_MADE)[number];

export const LEAD_TIMES = [
  'in_stock',
  '1_2_weeks',
  '3_4_weeks',
  'custom',
] as const;
export type LeadTime = (typeof LEAD_TIMES)[number];

export const WEIGHT_CLASSES = ['lightweight', 'medium', 'heavy'] as const;
export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export const CARE_DIFFICULTIES = ['easy', 'moderate', 'high'] as const;
export type CareDifficulty = (typeof CARE_DIFFICULTIES)[number];

export interface VendorProductSharedAttributes {
  mood_tags?: MoodTag[];
  room_type?: RoomType[];
  color_family?: ColorFamily;
  primary_color?: PrimaryColor;
  secondary_color?: PrimaryColor;
  style?: Style;
  finish_tone?: FinishTone;
  price_tier?: PriceTier;
  nigerian_made?: NigerianMade;
  lead_time?: LeadTime;
  customizable?: boolean;
  weight_class?: WeightClass;
  care_difficulty?: CareDifficulty;
  is_featured?: boolean;
}

// ─── Seating ───────────────────────────────────────────────────────────────

export const SEATING_TYPES = [
  'sofa',
  'sectional',
  'accent_chair',
  'dining_chair',
  'lounge_chair',
  'ottoman',
  'bench',
] as const;
export const SOFA_STYLES = [
  'chesterfield',
  'mid_century',
  'contemporary',
  'sectional_modular',
  'lawson',
] as const;
export const SEATING_CAPACITIES = ['1', '2', '3', '4+'] as const;
export const SEATING_SHAPES = ['straight', 'L_shaped', 'curved', 'round'] as const;
export const SEATING_MATERIALS = [
  'fabric',
  'velvet',
  'leather',
  'boucle',
  'rattan',
  'wood',
] as const;
export const LEG_STYLES = ['wood', 'metal', 'none'] as const;
export const BACK_STYLES = ['high_back', 'low_back', 'no_back', 'wing'] as const;
export const BACK_HEIGHTS = ['low', 'mid', 'high'] as const;
export const ARM_STYLES = ['with_arms', 'armless'] as const;
export const CUSHION_STYLES = ['tight_back', 'loose_back', 'pillow_back'] as const;
export const SEAT_DEPTHS = ['shallow', 'standard', 'deep'] as const;
export const WEIGHT_FEELS = ['light_airy', 'solid_grounded'] as const;
export const SEATING_SIZES = ['compact', 'standard', 'large'] as const;

export interface VendorProductSeatingAttributes {
  seating_type?: (typeof SEATING_TYPES)[number];
  sofa_style?: (typeof SOFA_STYLES)[number];
  /** Sofa / sectional / chair seat count — not dining set capacity (see `dining_seating_capacity`). */
  seating_capacity?: (typeof SEATING_CAPACITIES)[number];
  seating_shape?: (typeof SEATING_SHAPES)[number];
  seating_material?: (typeof SEATING_MATERIALS)[number];
  leg_style?: (typeof LEG_STYLES)[number];
  back_style?: (typeof BACK_STYLES)[number];
  back_height?: (typeof BACK_HEIGHTS)[number];
  arm_style?: (typeof ARM_STYLES)[number];
  cushion_style?: (typeof CUSHION_STYLES)[number];
  seat_depth?: (typeof SEAT_DEPTHS)[number];
  tufting?: boolean;
  weight_feel?: (typeof WEIGHT_FEELS)[number];
  /** Seating: compact | standard | large */
  seating_size?: (typeof SEATING_SIZES)[number];
}

// ─── Artwork ───────────────────────────────────────────────────────────────

export const ARTWORK_TYPES = [
  'painting',
  'print',
  'photograph',
  'sculpture',
  'mixed_media',
  'mural',
] as const;
export const ART_SUBJECTS = [
  'figurative',
  'abstract',
  'landscape',
  'botanical',
  'geometric',
  'typography',
  'african_culture',
] as const;
export const FRAME_STYLES = [
  'thin_black',
  'thin_gold',
  'thick_wood',
  'no_frame',
  'ornate',
] as const;
export const ORIENTATIONS = ['portrait', 'landscape', 'square'] as const;
export const ARTWORK_SIZES = ['small', 'medium', 'large', 'oversized'] as const;
export const ARTWORK_FINISHES = [
  'matte',
  'glossy',
  'textured',
  'canvas',
  'framed_canvas',
] as const;
export const ART_MOODS = [
  'calm',
  'energetic',
  'romantic',
  'bold',
  'spiritual',
  'celebratory',
] as const;
export const ART_EDITIONS = ['original', 'limited_print', 'open_print'] as const;

export interface VendorProductArtworkAttributes {
  artwork_type?: (typeof ARTWORK_TYPES)[number];
  subject?: (typeof ART_SUBJECTS)[number];
  frame_style?: (typeof FRAME_STYLES)[number];
  orientation?: (typeof ORIENTATIONS)[number];
  artwork_size?: (typeof ARTWORK_SIZES)[number];
  artwork_finish?: (typeof ARTWORK_FINISHES)[number];
  color_dominant?: PrimaryColor;
  color_secondary?: PrimaryColor;
  mood?: (typeof ART_MOODS)[number];
  human_presence?: boolean;
  african_representation?: boolean;
  texture_visible?: boolean;
  edition?: (typeof ART_EDITIONS)[number];
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export const TABLE_TYPES = [
  'coffee',
  'side',
  'console',
  'nesting',
  'dining',
] as const;
export const TABLE_STYLES = ['single', 'nesting', 'set'] as const;
export const TABLE_SHAPES = [
  'round',
  'oval',
  'rectangular',
  'irregular',
  'sculptural',
] as const;
export const TOP_MATERIALS = [
  'marble',
  'wood',
  'glass',
  'ceramic',
  'metal',
  'stone',
] as const;
export const BASE_MATERIALS = [
  'metal',
  'wood',
  'concrete',
  'rattan',
  'acrylic',
] as const;
export const BASE_STYLES = [
  'pedestal',
  'hairpin',
  'drum',
  'sculptural',
  'trestle',
  'cross',
] as const;
export const TABLE_FINISHES = [
  'natural',
  'dark',
  'light',
  'brass',
  'black',
  'white',
] as const;
export const TABLE_SIZES = ['compact', 'standard', 'large'] as const;

export interface VendorProductTableAttributes {
  table_type?: (typeof TABLE_TYPES)[number];
  table_style?: (typeof TABLE_STYLES)[number];
  /** Coffee / side / console / nesting tables (not dining set `table_shape`). */
  tables_shape?: (typeof TABLE_SHAPES)[number];
  top_material?: (typeof TOP_MATERIALS)[number];
  base_material?: (typeof BASE_MATERIALS)[number];
  base_style?: (typeof BASE_STYLES)[number];
  tables_finish?: (typeof TABLE_FINISHES)[number];
  has_storage?: boolean;
  glass_top?: boolean;
  extendable?: boolean;
  weight_feel?: (typeof WEIGHT_FEELS)[number];
  tables_size?: (typeof TABLE_SIZES)[number];
}

// ─── Lighting ──────────────────────────────────────────────────────────────

export const LIGHTING_TYPES = [
  'pendant',
  'chandelier',
  'floor_lamp',
  'table_lamp',
  'wall_sconce',
  'picture_light',
] as const;
export const SHADE_MATERIALS = [
  'rattan',
  'fabric',
  'metal',
  'glass',
  'crystal',
  'exposed_bulb',
] as const;
export const SHADE_SHAPES = [
  'dome',
  'cone',
  'drum',
  'globe',
  'linear',
  'irregular',
] as const;
export const LIGHTING_FINISHES = [
  'brass',
  'black',
  'white',
  'chrome',
  'natural',
  'gold',
] as const;
export const STYLE_DIRECTIONS = [
  'statement',
  'subtle',
  'architectural',
  'organic',
] as const;
export const BULB_VISIBILITIES = ['visible', 'hidden'] as const;
export const BULB_TYPES = ['LED', 'Edison', 'candle', 'globe'] as const;
export const LIGHT_DIRECTIONS = ['upward', 'downward', 'ambient'] as const;
export const CHAIN_OR_RODS = ['chain', 'rod', 'flush', 'direct'] as const;
export const COLOR_TEMPERATURES = ['warm', 'cool', 'neutral'] as const;
export const LIGHTING_SIZES = ['small', 'medium', 'large', 'oversized'] as const;

export interface VendorProductLightingAttributes {
  lighting_type?: (typeof LIGHTING_TYPES)[number];
  shade_material?: (typeof SHADE_MATERIALS)[number];
  shade_shape?: (typeof SHADE_SHAPES)[number];
  lighting_finish?: (typeof LIGHTING_FINISHES)[number];
  style_direction?: (typeof STYLE_DIRECTIONS)[number];
  bulb_visibility?: (typeof BULB_VISIBILITIES)[number];
  bulb_type?: (typeof BULB_TYPES)[number];
  light_direction?: (typeof LIGHT_DIRECTIONS)[number];
  chain_or_rod?: (typeof CHAIN_OR_RODS)[number];
  color_temperature?: (typeof COLOR_TEMPERATURES)[number];
  cluster?: boolean;
  dimmable?: boolean;
  lighting_size?: (typeof LIGHTING_SIZES)[number];
}

// ─── Mirrors ─────────────────────────────────────────────────────────────────

export const MIRROR_TYPES = ['wall', 'floor', 'leaning', 'vanity'] as const;
export const MIRROR_SHAPES = [
  'round',
  'oval',
  'arch',
  'rectangular',
  'irregular',
] as const;
export const FRAME_MATERIALS = [
  'brass',
  'wood',
  'black_metal',
  'gold',
  'frameless',
  'rattan',
] as const;
export const FRAME_COLORS = [
  'gold',
  'black',
  'silver',
  'brown',
  'white',
  'natural',
] as const;
export const FRAME_THICKNESSES = [
  'thin',
  'medium',
  'thick',
  'frameless',
] as const;
export const MIRROR_SIZES = ['small', 'medium', 'large', 'oversized'] as const;
export const MOUNTINGS = ['wall_hung', 'floor_leaning', 'strap_hung'] as const;

export interface VendorProductMirrorAttributes {
  mirror_type?: (typeof MIRROR_TYPES)[number];
  mirror_shape?: (typeof MIRROR_SHAPES)[number];
  frame_material?: (typeof FRAME_MATERIALS)[number];
  frame_color?: (typeof FRAME_COLORS)[number];
  frame_thickness?: (typeof FRAME_THICKNESSES)[number];
  mirror_size?: (typeof MIRROR_SIZES)[number];
  mounting?: (typeof MOUNTINGS)[number];
  has_shelf?: boolean;
  backlit?: boolean;
  antique_finish?: boolean;
  has_handle?: boolean;
}

// ─── Rugs ──────────────────────────────────────────────────────────────────

export const RUG_SHAPES = ['rectangular', 'round', 'runner', 'irregular'] as const;
export const RUG_PATTERNS = [
  'solid',
  'geometric',
  'abstract',
  'botanical',
  'traditional',
  'striped',
] as const;
export const PILE_TYPES = ['flat', 'low', 'high', 'shaggy'] as const;
export const TEXTURE_STYLES = [
  'braided',
  'looped',
  'cut_pile',
  'flatweave',
  'shaggy',
] as const;
export const RUG_MATERIALS = [
  'wool',
  'jute',
  'synthetic',
  'cotton',
  'sisal',
] as const;
export const RUG_COLOR_TONES = ['warm', 'cool', 'neutral', 'bold'] as const;
export const RUG_COLOR_DOMINANTS = [
  'cream',
  'beige',
  'grey',
  'black',
  'terracotta',
  'blue',
  'green',
  'multicolor',
] as const;
export const RUG_THICKNESSES = ['thin', 'medium', 'thick'] as const;
export const RUG_SIZES = ['small', 'medium', 'large', 'runner'] as const;

export interface VendorProductRugAttributes {
  rug_shape?: (typeof RUG_SHAPES)[number];
  pattern?: (typeof RUG_PATTERNS)[number];
  pile?: (typeof PILE_TYPES)[number];
  texture_style?: (typeof TEXTURE_STYLES)[number];
  rug_material?: (typeof RUG_MATERIALS)[number];
  color_tone?: (typeof RUG_COLOR_TONES)[number];
  color_dominant?: (typeof RUG_COLOR_DOMINANTS)[number];
  color_secondary?: (typeof RUG_COLOR_DOMINANTS)[number];
  thickness?: (typeof RUG_THICKNESSES)[number];
  rug_size?: (typeof RUG_SIZES)[number];
  fringe?: boolean;
  washable?: boolean;
}

// ─── Planters ────────────────────────────────────────────────────────────────

export const PLANTER_TYPES = ['floor', 'table', 'hanging', 'wall_mounted'] as const;
export const PLANTER_SHAPES = [
  'round',
  'square',
  'tall_cylinder',
  'bowl',
  'irregular',
] as const;
export const PLANTER_MATERIALS = [
  'ceramic',
  'rattan',
  'concrete',
  'metal',
  'terracotta',
  'fabric',
] as const;
export const PLANTER_FINISHES = [
  'matte',
  'glossy',
  'natural',
  'textured',
] as const;
export const PLANTER_COLORS = [
  'black',
  'white',
  'terracotta',
  'grey',
  'gold',
  'natural',
  'green',
] as const;
export const PLANTER_STYLES = [
  'minimal',
  'organic',
  'architectural',
  'traditional',
] as const;
export const PLANTER_SIZES = ['small', 'medium', 'large', 'oversized'] as const;
export const INDOOR_OUTDOOR = ['indoor', 'outdoor', 'both'] as const;

export interface VendorProductPlanterAttributes {
  planter_type?: (typeof PLANTER_TYPES)[number];
  planter_shape?: (typeof PLANTER_SHAPES)[number];
  planter_material?: (typeof PLANTER_MATERIALS)[number];
  planter_finish?: (typeof PLANTER_FINISHES)[number];
  color?: (typeof PLANTER_COLORS)[number];
  planter_style?: (typeof PLANTER_STYLES)[number];
  planter_size?: (typeof PLANTER_SIZES)[number];
  drainage?: boolean;
  includes_plant?: boolean;
  indoor_outdoor?: (typeof INDOOR_OUTDOOR)[number];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export const STORAGE_TYPES = [
  'console',
  'bookshelf',
  'cabinet',
  'sideboard',
  'wardrobe',
  'dresser',
] as const;
export const STORAGE_MATERIALS = ['wood', 'metal', 'rattan', 'mixed'] as const;
export const STORAGE_FINISHES = [
  'natural',
  'dark',
  'light',
  'painted',
  'black',
  'white',
] as const;
export const FINISH_COLORS = [
  'natural_wood',
  'dark_wood',
  'white',
  'black',
  'grey',
  'painted',
] as const;
export const DOOR_STYLES = ['open', 'closed', 'glass_front', 'mixed'] as const;
export const DOOR_DRAWER_COUNTS = ['0', '1', '2', '3+'] as const;
export const HANDLE_STYLES = ['none', 'bar', 'knob', 'recessed'] as const;
export const LEG_HEIGHTS = ['low', 'mid', 'high'] as const;
export const STORAGE_SIZES = ['compact', 'standard', 'large'] as const;

export interface VendorProductStorageAttributes {
  storage_type?: (typeof STORAGE_TYPES)[number];
  storage_material?: (typeof STORAGE_MATERIALS)[number];
  storage_finish?: (typeof STORAGE_FINISHES)[number];
  finish_color?: (typeof FINISH_COLORS)[number];
  door_style?: (typeof DOOR_STYLES)[number];
  number_of_doors?: (typeof DOOR_DRAWER_COUNTS)[number];
  number_of_drawers?: (typeof DOOR_DRAWER_COUNTS)[number];
  handle_style?: (typeof HANDLE_STYLES)[number];
  leg_height?: (typeof LEG_HEIGHTS)[number];
  floating?: boolean;
  legs?: boolean;
  storage_size?: (typeof STORAGE_SIZES)[number];
}

// ─── Curtains ───────────────────────────────────────────────────────────────

export const CURTAIN_FABRICS = [
  'linen',
  'velvet',
  'sheer',
  'blackout',
  'cotton',
  'silk_look',
] as const;
export const CURTAIN_PATTERNS = [
  'solid',
  'striped',
  'geometric',
  'floral',
  'abstract',
] as const;
export const CURTAIN_COLOR_TONES = [
  'warm',
  'cool',
  'neutral',
  'bold',
  'dark',
] as const;
export const HEADING_STYLES = [
  'eyelet',
  'pencil_pleat',
  'tab_top',
  'rod_pocket',
] as const;
export const CURTAIN_LENGTHS = ['short', 'floor_length', 'puddle'] as const;
export const WIDTH_FULLNESSES = ['standard', 'extra_full'] as const;

export interface VendorProductCurtainAttributes {
  fabric?: (typeof CURTAIN_FABRICS)[number];
  pattern?: (typeof CURTAIN_PATTERNS)[number];
  color_dominant?: PrimaryColor;
  color_tone?: (typeof CURTAIN_COLOR_TONES)[number];
  heading_style?: (typeof HEADING_STYLES)[number];
  length?: (typeof CURTAIN_LENGTHS)[number];
  width_fullness?: (typeof WIDTH_FULLNESSES)[number];
  lining?: boolean;
  sheer_layer?: boolean;
  hardware_included?: boolean;
}

// ─── Beds ───────────────────────────────────────────────────────────────────

export const BED_TYPES = [
  'platform',
  'panel',
  'upholstered',
  'canopy',
  'storage',
] as const;
export const HEADBOARD_STYLES = [
  'upholstered',
  'wood',
  'metal',
  'none',
  'tufted',
] as const;
export const BED_MATERIALS = ['wood', 'upholstered', 'metal', 'rattan'] as const;
export const UPHOLSTERY_COLORS = [
  'cream',
  'grey',
  'navy',
  'green',
  'black',
  'brown',
  'blush',
] as const;
export const BED_SIZES = ['single', 'double', 'queen', 'king'] as const;
export const BED_HEIGHTS = ['low', 'standard', 'high'] as const;
export const SLAT_TYPES = ['solid', 'slatted', 'adjustable'] as const;

export interface VendorProductBedAttributes {
  bed_type?: (typeof BED_TYPES)[number];
  headboard_style?: (typeof HEADBOARD_STYLES)[number];
  bed_material?: (typeof BED_MATERIALS)[number];
  upholstery_color?: (typeof UPHOLSTERY_COLORS)[number];
  bed_size?: (typeof BED_SIZES)[number];
  height?: (typeof BED_HEIGHTS)[number];
  slat_type?: (typeof SLAT_TYPES)[number];
  channel_tufting?: boolean;
  footboard?: boolean;
  storage?: boolean;
}

// ─── Dining sets ────────────────────────────────────────────────────────────

export const DINING_TABLE_SHAPES = ['round', 'oval', 'rectangular', 'extending'] as const;
export const DINING_TABLE_MATERIALS = ['wood', 'marble', 'glass', 'metal', 'mixed'] as const;
export const DINING_TABLE_BASES = [
  'pedestal',
  'four_leg',
  'trestle',
  'cross',
] as const;
export const CHAIR_MATERIALS = [
  'fabric',
  'leather',
  'plastic',
  'wood',
  'rattan',
] as const;
export const CHAIR_BACK_STYLES = ['open', 'solid', 'upholstered', 'rattan'] as const;
export const DINING_SEATING_CAPACITIES = ['2', '4', '6', '8+'] as const;

export interface VendorProductDiningSetAttributes {
  table_shape?: (typeof DINING_TABLE_SHAPES)[number];
  table_material?: (typeof DINING_TABLE_MATERIALS)[number];
  table_base?: (typeof DINING_TABLE_BASES)[number];
  chair_material?: (typeof CHAIR_MATERIALS)[number];
  chair_back_style?: (typeof CHAIR_BACK_STYLES)[number];
  chair_arm_style?: (typeof ARM_STYLES)[number];
  dining_seating_capacity?: (typeof DINING_SEATING_CAPACITIES)[number];
  bench_included?: boolean;
  indoor_outdoor?: (typeof INDOOR_OUTDOOR)[number];
}

/**
 * Full JSONB document: shared keys plus prefixed category-specific keys
 * (see per-category interfaces above).
 */
export type VendorProductAttributeValue =
  | string
  | string[]
  | boolean
  | number
  | null;

export type VendorProductAttributesDocument = VendorProductSharedAttributes & {
  [key: string]: VendorProductAttributeValue | undefined;
};

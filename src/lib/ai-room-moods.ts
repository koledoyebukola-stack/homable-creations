/**
 * Mood configuration for AI Room Generator.
 * Categories align with vendor_products.category; each mood includes wall-related (artwork, mirror).
 * promptTemplate: full OpenAI-style prompt for image generation; Nigerian room context is implied.
 */

export type AiRoomMoodId =
  | 'afro_luxe'
  | 'warm_earthy'
  | 'minimal_lagos'
  | 'bold_colourful';

/** Appended to every mood prompt for consistent photorealistic output. */
export const AI_ROOM_IMAGE_QUALITY_INSTRUCTION =
  ' Shot quality: Architectural Digest / Vogue Living editorial standard. Sony A7R V. Every surface must have tactile realism — fabric weave visible, wood grain present, wall texture tangible, ceramic surfaces reflective. Warm natural light from windows. No flat or plastic-looking surfaces. Photorealistic, not illustrated.';

/** Instruction to preserve room layout (add to every prompt). */
export const AI_ROOM_LAYOUT_INSTRUCTION =
  ' Keep the room\'s original layout, window positions and dimensions exactly. Do not add or remove walls or doors.';

export interface AiRoomMoodConfig {
  id: AiRoomMoodId;
  label: string;
  subtitle: string;
  /** Primary product categories for this mood; includes wall-related (artwork, mirror). */
  categories: string[];
  keywords: string[];
  /** Full prompt for OpenAI; includes wall treatment, furniture, lighting, art, Nigerian context. */
  promptTemplate: string;
}

export const AI_ROOM_MOODS: AiRoomMoodConfig[] = [
  {
    id: 'afro_luxe',
    label: 'Afro-luxe',
    subtitle: 'Dark walls, brass accents, Nigerian art',
    categories: ['seating', 'lighting', 'mirror', 'artwork', 'table', 'rugs'],
    keywords: ['dark', 'rich tones', 'brass', 'gold accents', 'african art', 'velvet', 'statement wall'],
    promptTemplate:
      'Reimagine this room with a deep navy or charcoal feature wall with vertical batten panels. Brass accents throughout — picture lights, mirror frame, console table legs. One large bold Nigerian figurative painting. Floor to near-ceiling arched mirror. Warm recessed lighting. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Premium, unapologetic, dark luxury.' +
      AI_ROOM_LAYOUT_INSTRUCTION +
      AI_ROOM_IMAGE_QUALITY_INSTRUCTION,
  },
  {
    id: 'warm_earthy',
    label: 'Warm & earthy',
    subtitle: 'Terracotta, rattan, organic textures',
    categories: ['seating', 'planters', 'artwork', 'rugs', 'storage', 'lighting'],
    keywords: ['terracotta', 'warm neutrals', 'rattan', 'wood', 'organic textures', 'earthy', 'woven'],
    promptTemplate:
      'Reimagine this room with terracotta or warm clay walls. Natural rattan pendant light. Cream or beige upholstered sofa. Nested natural wood coffee tables. Botanical or landscape artwork. Large ceramic floor vase. Jute or wool area rug. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Warm, organic, inviting.' +
      AI_ROOM_LAYOUT_INSTRUCTION +
      AI_ROOM_IMAGE_QUALITY_INSTRUCTION,
  },
  {
    id: 'minimal_lagos',
    label: 'Minimal Lagos',
    subtitle: 'Clean whites, one statement piece',
    categories: ['seating', 'table', 'storage', 'mirror', 'artwork'],
    keywords: ['minimal', 'white walls', 'clean lines', 'statement piece', 'neutral', 'light wood', 'black accents'],
    promptTemplate:
      'Reimagine this room with clean warm white walls. One statement piece of furniture. Sputnik or architectural pendant light. One large abstract painting — the only colour accent. Oval or round mirror. No clutter. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Quietly confident, restrained luxury.' +
      AI_ROOM_LAYOUT_INSTRUCTION +
      AI_ROOM_IMAGE_QUALITY_INSTRUCTION,
  },
  {
    id: 'bold_colourful',
    label: 'Bold & colourful',
    subtitle: 'Colour-blocked, mixed prints',
    categories: ['seating', 'artwork', 'rugs', 'planters', 'lighting'],
    keywords: ['bold colour', 'colour-blocked', 'mixed prints', 'velvet', 'patterned rugs', 'vibrant'],
    promptTemplate:
      'Reimagine this room with a colour-blocked feature wall — deep teal, mustard or burnt orange. Mixed pattern cushions. Velvet accent chair in contrasting colour. Bold large-scale abstract art. Statement lighting. Nigerian context: POP tray ceiling, large format ceramic tiles, casement windows, split unit AC on upper wall. Full personality, maximalist but intentional.' +
      AI_ROOM_LAYOUT_INSTRUCTION +
      AI_ROOM_IMAGE_QUALITY_INSTRUCTION,
  },
];

export const AI_ROOM_MOOD_BY_ID: Record<AiRoomMoodId, AiRoomMoodConfig> = AI_ROOM_MOODS.reduce(
  (acc, mood) => {
    acc[mood.id] = mood;
    return acc;
  },
  {} as Record<AiRoomMoodId, AiRoomMoodConfig>,
);

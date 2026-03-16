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
  /** Explore scene ids that best represent this mood (used for Phase 1 product selection). */
  sceneIds: string[];
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
    sceneIds: [
      '98c41a5b-2bfd-4683-89e3-81428b7107e3',
      'c540ffe7-dbbc-406a-844e-ed2c9f5daed7',
      'b5330d7d-4266-4878-b533-38927c7fe1de',
      'cf58df83-6ac3-478b-886e-e90867b9f64f',
    ],
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
    sceneIds: [
      '9f327622-a38b-445d-a0f3-52a7e589587c',
      '686d5ef9-ef6d-406d-9782-d1147faa155f',
      'cf928ae9-6de2-436c-b5f4-0c13ea2b0cea',
      '1b6b4c67-82d3-4015-ad96-c2321c6a648f',
    ],
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
    sceneIds: [
      '3f59a60f-e5a8-4e22-86be-ccf94c1276b1',
      '6fa69444-622c-4fa5-8ec2-3f18946dfff3',
      '8b534ed0-bef9-419c-b79a-929b1c371ab2',
      '8dcd9d8a-449a-4b33-95ff-aed022ff621b',
    ],
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
    sceneIds: [
      '4c581220-3450-4cf0-b284-a7b2db85573b',
      '62d1a845-fdb9-472f-9239-85f6571b1e12',
      'd63a8250-e585-4ce5-a8a3-41c88413ff8d',
      '01d22a0f-7f90-4e91-a7d6-a85a7a38c5fa',
    ],
  },
];

export const AI_ROOM_MOOD_BY_ID: Record<AiRoomMoodId, AiRoomMoodConfig> = AI_ROOM_MOODS.reduce(
  (acc, mood) => {
    acc[mood.id] = mood;
    return acc;
  },
  {} as Record<AiRoomMoodId, AiRoomMoodConfig>,
);

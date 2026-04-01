/**
 * Mood configuration for AI Room Generator.
 * Image prompts are built per room_type + mood in ./ai-room-prompt-templates (Edge Function uses a copy).
 */

export type AiRoomMoodId =
  | 'afro_luxe'
  | 'warm_earthy'
  | 'minimal_lagos'
  | 'bold_colourful';

export {
  buildAiRoomFullPrompt,
  getCompositionPrompt,
  NIGERIAN_ROOM_CONTEXT,
  LAYOUT_INSTRUCTION,
  QUALITY_INSTRUCTION,
} from './ai-room-prompt-templates';

/** @deprecated Use QUALITY_INSTRUCTION from ai-room-prompt-templates */
export { QUALITY_INSTRUCTION as AI_ROOM_IMAGE_QUALITY_INSTRUCTION } from './ai-room-prompt-templates';

/** @deprecated Use LAYOUT_INSTRUCTION from ai-room-prompt-templates */
export { LAYOUT_INSTRUCTION as AI_ROOM_LAYOUT_INSTRUCTION } from './ai-room-prompt-templates';

export interface AiRoomMoodConfig {
  id: AiRoomMoodId;
  label: string;
  subtitle: string;
  /** Primary product categories for this mood; includes wall-related (artwork, mirror). */
  categories: string[];
  keywords: string[];
  /** Explore scene ids that best represent this mood (legacy / UI). */
  sceneIds: string[];
}

export const AI_ROOM_MOODS: AiRoomMoodConfig[] = [
  {
    id: 'afro_luxe',
    label: 'Afro-luxe',
    subtitle: 'Dark walls, brass accents, Nigerian art',
    categories: ['seating', 'lighting', 'mirror', 'artwork', 'table', 'rugs'],
    keywords: ['dark', 'rich tones', 'brass', 'gold accents', 'african art', 'velvet', 'statement wall'],
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

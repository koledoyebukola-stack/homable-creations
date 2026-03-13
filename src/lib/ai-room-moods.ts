/**
 * Mood configuration for AI Room Generator.
 * Categories align with vendor_products.category (seating, lighting, mirror, artwork, etc.).
 */

export type AiRoomMoodId =
  | 'afro_luxe'
  | 'warm_earthy'
  | 'minimal_lagos'
  | 'bold_colourful';

export interface AiRoomMoodConfig {
  id: AiRoomMoodId;
  label: string;
  subtitle: string;
  /** Primary product categories for this mood; match vendor_products.category. */
  categories: string[];
  /** Keywords for prompts / product filtering (materials, colours, style). */
  keywords: string[];
}

export const AI_ROOM_MOODS: AiRoomMoodConfig[] = [
  {
    id: 'afro_luxe',
    label: 'Afro-luxe',
    subtitle: 'Dark walls, brass accents, Nigerian art',
    categories: ['seating', 'lighting', 'mirror', 'artwork', 'table', 'rugs'],
    keywords: [
      'dark',
      'rich tones',
      'brass',
      'gold accents',
      'african art',
      'velvet',
      'statement wall',
    ],
  },
  {
    id: 'warm_earthy',
    label: 'Warm & earthy',
    subtitle: 'Terracotta, rattan, organic textures',
    categories: ['seating', 'planters', 'artwork', 'rugs', 'storage', 'lighting'],
    keywords: [
      'terracotta',
      'warm neutrals',
      'rattan',
      'wood',
      'organic textures',
      'earthy',
      'woven',
    ],
  },
  {
    id: 'minimal_lagos',
    label: 'Minimal Lagos',
    subtitle: 'Clean whites, one statement piece',
    categories: ['seating', 'table', 'storage', 'mirror', 'artwork'],
    keywords: [
      'minimal',
      'white walls',
      'clean lines',
      'statement piece',
      'neutral',
      'light wood',
      'black accents',
    ],
  },
  {
    id: 'bold_colourful',
    label: 'Bold & colourful',
    subtitle: 'Colour-blocked, mixed prints',
    categories: ['seating', 'artwork', 'rugs', 'planters', 'lighting'],
    keywords: [
      'bold colour',
      'colour-blocked',
      'mixed prints',
      'velvet',
      'patterned rugs',
      'vibrant',
    ],
  },
];

export const AI_ROOM_MOOD_BY_ID: Record<AiRoomMoodId, AiRoomMoodConfig> =
  AI_ROOM_MOODS.reduce(
    (acc, mood) => {
      acc[mood.id] = mood;
      return acc;
    },
    {} as Record<AiRoomMoodId, AiRoomMoodConfig>,
  );

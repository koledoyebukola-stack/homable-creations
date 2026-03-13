/**
 * Request/response types for the ai-room-generate Edge Function.
 * Keeps the contract provider-agnostic so OpenAI can be swapped for Gemini later.
 */

import type { AiRoomMoodId } from './ai-room-moods';

/** One product reference sent to the Edge Function (5–6 required). */
export interface AiRoomGenerateProduct {
  vendor_product_id: string;
  image_url: string;
  name: string;
  description: string | null;
}

/** Request body for POST /functions/v1/ai-room-generate */
export interface AiRoomGenerateRequest {
  room_photo_url: string;
  mood_id: AiRoomMoodId;
  products: AiRoomGenerateProduct[];
  paystack_reference: string;
  amount_paid_kobo: number;
}

/** Success response (200) */
export interface AiRoomGenerateSuccess {
  ok: true;
  generation_id: string;
  generated_image_url: string;
  product_ids: string[];
}

/** Error response (4xx/5xx) */
export interface AiRoomGenerateError {
  ok: false;
  error: string;
  details?: string;
}

export type AiRoomGenerateResponse = AiRoomGenerateSuccess | AiRoomGenerateError;

/** Minimum and maximum number of product images (inclusive). */
export const AI_ROOM_PRODUCTS_MIN = 5;
export const AI_ROOM_PRODUCTS_MAX = 6;

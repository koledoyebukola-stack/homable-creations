# AI Room Generator Documentation

This document explains how the AI room generator works end to end, plus the fixes and product changes implemented during the recent UAT and share-link stabilization work.

## Scope

- Wizard experience in `src/pages/AiRoomGenerator.tsx`
- Public/owner result page in `src/pages/RoomSharePage.tsx`
- AI generation edge function in `supabase/functions/ai-room-generate/index.ts`
- Database schema, RPCs, and RLS policies in `supabase/migrations/*ai_generation*`

## High-level architecture

- **Frontend wizard** collects photo, room type, and mood, then invokes edge function.
- **Storage layer** keeps uploaded original photos and generated renders in Supabase bucket `ai-rooms`.
- **Edge function** validates auth + payload, verifies payment (or test mode), selects products, prompts OpenAI, uploads output image, and persists generation row.
- **Database row** in `public.ai_generations` is the source of truth for history and sharing.
- **Share page RPC** `get_ai_generation_by_share_slug` powers `/room/:shareSlug`.

## Data model

Main table: `public.ai_generations` (created in `20260309_ai_generations.sql`)

Important columns:
- `user_id`: owner of generation
- `mood`: selected AI mood
- `room_type`: selected room context (added later)
- `original_image_url`: input image URL
- `generated_image_url`: AI output URL
- `product_ids`: vendor products used for this generation
- `paystack_reference`: idempotency/payment reference
- `amount_paid`: charged amount
- `shared`: whether generation is eligible for public room link
- `share_slug`: slug used at `/room/:shareSlug`

## End-to-end runtime flow

1. User opens `/ai-room-generator` and must be authenticated.
2. User selects room photo (upload or sample), room type, and mood.
3. If upload source is local file:
   - Frontend uploads file to `ai-rooms/uploads/{userId}/{timestamp}.{ext}`
   - Frontend gets a **public URL** and uses it for edge invocation.
4. Frontend invokes `ai-room-generate` with:
   - `mood`
   - `room_type`
   - `paystack_reference` (test reference in test mode)
   - `original_image_url` (public URL, never `blob:`)
   - `user_id`
   - `test_mode`
5. Edge function validates:
   - Auth header and token user
   - payload values
   - `user_id === auth user id`
6. Edge checks for existing completed generation by `paystack_reference` (idempotent return path).
7. If not cached:
   - verifies Paystack (unless `test_mode`)
   - fetches mood/room-type product pool
   - composes prompt + image references
   - calls OpenAI Responses API with image generation tool
   - extracts base64 image
   - uploads generated PNG to `ai-rooms/generated/{userId}/{timestamp}.png`
8. Edge persists row:
   - update existing row (same reference) or insert new row
   - sets `share_slug`
   - sets `shared = true`
9. Frontend receives `share_slug` and immediately navigates to `/room/:shareSlug` with `replace: true`.
10. Share page loads by RPC + product resolution and renders the full result experience.

## RPC and share-link behavior

### `get_ai_generation_by_share_slug`

Current behavior (after migration `20260409120000_ai_generation_shared_public_share.sql`):
- returns only rows where:
  - `share_slug = p_slug`
  - `shared = true`
  - `generated_image_url IS NOT NULL`

This makes sharing explicit and prevents accidental exposure of unshared rows.

### Why `shared` is required

The share page only resolves rows intentionally marked public. If a row has a slug but `shared = false`, `/room/:shareSlug` returns "room not found".

## RLS and ownership rules

Policies on `public.ai_generations`:
- owner select
- owner insert
- shared select
- owner update (added in `20260409140000_ai_generations_owner_update_policy.sql`)

The owner update policy is critical so function-driven updates can persist fields like:
- `generated_image_url`
- `share_slug`
- `shared`
- `room_type`
- `mood`
- `product_ids`

## What we changed (implementation log)

## 1) Wizard UX and flow updates

File: `src/pages/AiRoomGenerator.tsx`

- Kept generator focused on steps 1-4 and removed in-page step-5 result surface.
- Added/kept sticky bottom nav behavior for wizard progression and generate CTA.
- Added upload lifecycle parity with `ImageUploader` object URL handling.
- Enforced accepted file types and max size checks.
- Required auth with explicit redirect links to auth flows.

## 2) Blob URL production fix

Problem:
- Local uploads were producing `blob:` URLs, which are not fetchable by edge/OpenAI and caused generation failures.

Fix:
- In `handlePayAndGenerate`, upload local file first to `ai-rooms` bucket.
- Convert to public URL and pass that URL to edge function.
- Revoke old object URL when appropriate and set preview to public URL so "before image" remains valid.

## 3) Share page productized result experience

File: `src/pages/RoomSharePage.tsx`

- Added canonical result page route behavior for `/room/:shareSlug`.
- Loads generation via RPC and resolves render products.
- Shows owner actions:
  - copy link
  - view in history
  - sticky "Generate another room" CTA
- Shows stranger action only:
  - "Like this? Create your own →"
- Added per-product "similar products" carousels with "See all" flow alignment.

## 4) Navigation behavior after generation

File: `src/pages/AiRoomGenerator.tsx`

- On successful generation, navigate immediately to `/room/:shareSlug` with `replace: true`.
- Removed extra "opening" transition state for a direct canonical handoff.

## 5) Room type and product-pool RPCs

Migration: `20260331_ai_generations_room_type_and_ai_room_rpcs.sql`

- Added `room_type` column to `ai_generations`.
- Added/updated product pool RPCs used by edge:
  - `ai_room_products_by_mood_tags`
  - `ai_room_products_wall_styling_scenes`
- Added first version of share lookup RPC.

## 6) Shared-only public RPC + backfill

Migration: `20260409120000_ai_generation_shared_public_share.sql`

- Updated `get_ai_generation_by_share_slug` to require `shared = true`.
- Backfilled old rows:
  - if row had slug + generated image + `shared = false`, set `shared = true`.

## 7) Priority fix for "room not found" on new generations

Files:
- `supabase/functions/ai-room-generate/index.ts`
- `supabase/migrations/20260409140000_ai_generations_owner_update_policy.sql`

Changes:
- Added owner UPDATE RLS policy to prevent silent blocked updates.
- Scoped existing-row lookups by `user_id` for safety.
- Ensured update path includes `shared: true`.
- Added early-return cached generation patch to set `shared: true` for older cached rows.
- Added write verification (`.select('id')`) on update/insert and explicit failure when 0 rows are affected.

Outcome:
- New generations consistently persist `shared = true`.
- Share links and history links resolve correctly through RPC.

## API contract (frontend -> edge)

Function: `ai-room-generate`

Request body:
- `mood: 'afro_luxe' | 'warm_earthy' | 'minimal_lagos' | 'bold_colourful'`
- `room_type: string`
- `paystack_reference: string`
- `original_image_url: string`
- `user_id: string`
- `test_mode?: boolean`

Success response:
- `generated_image_url: string`
- `share_slug: string`
- `products: MoodProduct[]`
- `minimum_spend: number | null`

## Error behavior and reliability notes

- Payment verification errors return `402 payment_verification_failed`.
- Generation/storage/db write failures return `500 generation_failed`.
- Edge function is idempotent by `paystack_reference`; completed rows can be reused.
- Write-verification logic prevents false-success responses when DB writes are blocked.

## Operational checklist (deploy)

When shipping AI room generator changes:

1. Run Supabase migrations.
2. Deploy `ai-room-generate` edge function.
3. Smoke test:
   - new upload generation (non-sample)
   - sample generation
   - immediate redirect to `/room/:shareSlug`
   - owner view actions
   - open same link logged out (stranger view)
   - history item click resolves room page
4. Confirm DB row has:
   - `generated_image_url` not null
   - `share_slug` not blank
   - `shared = true`
   - expected `room_type` and `mood`

## Known assumptions

- `paystack_reference` remains unique and trusted as generation idempotency key.
- `ai-rooms` bucket is publicly readable for required image URLs.
- Share links are intended to be public only for rows explicitly marked `shared = true`.

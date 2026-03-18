/**
 * Nigerian user journey event tracking (country === 'NG' only).
 * Events are stored in the same analytics_events table with country = 'NG'.
 * Fire-and-forget; never block user actions.
 */

import { supabase } from './supabase';
import { getSelectedCountry } from '@/components/LocationSelector';

export const NG_EVENTS = {
  HOMEPAGE_LANDING: 'HOMEPAGE_LANDING',
  EXPLORE_CURATED_ROOMS_VIEW: 'EXPLORE_CURATED_ROOMS_VIEW',
  ROOM_SELECTION: 'ROOM_SELECTION',
  SIGNUP: 'SIGNUP',
  SIGNIN: 'SIGNIN',
  SHOPPING_LIST_CREATED: 'SHOPPING_LIST_CREATED',
  HOME_REGISTRY_SHARED: 'HOME_REGISTRY_SHARED',
  CATALOG_PRODUCT_CLICKED: 'CATALOG_PRODUCT_CLICKED',
  VIEW_ON_INSTAGRAM_CLICKED: 'VIEW_ON_INSTAGRAM_CLICKED',
  WHATSAPP_REDIRECT: 'WHATSAPP_REDIRECT',
  TV_WALL_SCENE_VIEWED: 'TV_WALL_SCENE_VIEWED',
  CARPENTER_WHATSAPP_CLICKED: 'CARPENTER_WHATSAPP_CLICKED',
} as const;

export type NgEventName = (typeof NG_EVENTS)[keyof typeof NG_EVENTS];

/** Event payloads are stored as JSONB; allow string, number, boolean, null, and nested objects. */
export type NgEventData = Record<string, string | number | boolean | null | undefined | NgEventData>;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Strip undefined values so JSONB metadata never contains undefined. */
function cleanEventData(data?: NgEventData): Record<string, string | number | boolean | null | NgEventData> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, string | number | boolean | null | NgEventData> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v as string | number | boolean | null | NgEventData;
  }
  return out;
}

/**
 * Track an event for Nigerian users only. No-op if country !== 'NG'.
 * Non-blocking: fires and forgets; errors are logged but not thrown.
 */
export function trackNgEvent(eventName: NgEventName, eventData?: NgEventData): void {
  const country = getSelectedCountry();
  if (country !== 'NG') return;

  getCurrentUserId().then((userId) => {
    const payload = {
      event_name: eventName,
      metadata: {
        ...cleanEventData(eventData),
        timestamp: new Date().toISOString(),
        ...(typeof document !== 'undefined' && document.referrer ? { referrer: document.referrer } : {}),
      },
      user_id: userId,
      country: 'NG',
      created_at: new Date().toISOString(),
    };

    supabase
      .from('app_8574c59127_analytics_events')
      .insert(payload)
      .then(({ error }) => {
        if (error) console.warn('[Analytics NG] Failed to track:', eventName, error);
      });
  });
}

/**
 * Track "product contacted via WhatsApp" for ALL signed-in users (no country gate).
 * Used so the History page "Products I Contacted on Whatsapp" section works for everyone.
 * Same table and event_name (WHATSAPP_REDIRECT); country is set from selector or null.
 */
export function trackProductContactedOnWhatsApp(data: {
  vendor_id: string;
  product_id: string;
  source?: string;
  from_scene_slug?: string;
}): void {
  const logPrefix = '[trackProductContactedOnWhatsApp]';
  console.log(logPrefix, '1. Function called with data:', JSON.stringify(data, null, 2));

  getCurrentUserId().then((userId) => {
    console.log(logPrefix, '2. user_id from getCurrentUserId():', userId ?? '(null - user not signed in)');
    if (!userId) {
      console.warn(logPrefix, 'Aborting: no user_id');
      return;
    }
    const country = getSelectedCountry();
    const payload = {
      event_name: 'WHATSAPP_REDIRECT' as const,
      metadata: {
        ...cleanEventData(data),
        timestamp: new Date().toISOString(),
        ...(typeof document !== 'undefined' && document.referrer ? { referrer: document.referrer } : {}),
      },
      user_id: userId,
      country: country ?? null,
      created_at: new Date().toISOString(),
    };
    console.log(logPrefix, '3. Payload being sent to Supabase:', JSON.stringify(payload, null, 2));
    console.log(logPrefix, '   Table: app_8574c59127_analytics_events');

    supabase
      .from('app_8574c59127_analytics_events')
      .insert(payload)
      .then(({ data: insertData, error }) => {
        if (error) {
          console.error(logPrefix, '4. INSERT ERROR:', error);
          console.error(logPrefix, '   code:', error.code, 'message:', error.message, 'details:', error.details);
        } else {
          console.log(logPrefix, '4. INSERT SUCCESS. Response data:', insertData);
        }
      });
  });
}

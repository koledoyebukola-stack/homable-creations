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

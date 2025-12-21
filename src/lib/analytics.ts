/**
 * Lightweight event tracking for user funnel analysis
 * 
 * Events are stored in Supabase and are fire-and-forget (never block UX)
 * No user identity, cookies, or third-party services required
 */

import { supabase } from './supabase';

// Event names mapping to user funnel steps
export const EVENTS = {
  // Inspiration Flow
  HOMEPAGE_VIEWED: 'homepage_viewed',
  UPLOAD_CLICKED: 'upload_clicked',
  UPLOAD_STARTED: 'upload_started',
  IMAGE_ANALYSIS_STARTED: 'image_analysis_started',
  INSPIRATION_AUTH_COMPLETED: 'inspiration_auth_completed',
  INSPIRATION_RESULTS_VIEWED: 'inspiration_results_viewed',
  
  // Specs Form Flow
  SPECS_PAGE_VIEWED: 'specs_page_viewed',
  SPECS_FORM_SUBMITTED: 'specs_form_submitted',
  SPECS_AUTH_COMPLETED: 'specs_auth_completed',
  SPECS_RESULTS_VIEWED: 'specs_results_viewed',
  
  // Specs Template Flow
  TEMPLATE_SELECTED: 'template_selected',
  TEMPLATE_AUTH_COMPLETED: 'template_auth_completed',
  TEMPLATE_RESULTS_VIEWED: 'template_results_viewed',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

interface EventData {
  event_name: EventName;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Extract UTM parameters from URL
 */
function getUTMParams(): Record<string, string> {
  const params: Record<string, string> = {};
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    const utm_source = urlParams.get('utm_source');
    const utm_medium = urlParams.get('utm_medium');
    const utm_campaign = urlParams.get('utm_campaign');
    
    if (utm_source) params.utm_source = utm_source;
    if (utm_medium) params.utm_medium = utm_medium;
    if (utm_campaign) params.utm_campaign = utm_campaign;
  } catch (error) {
    // Silently fail - never block user experience
  }
  
  return params;
}

/**
 * Get referrer
 */
function getReferrer(): string | null {
  try {
    return document.referrer || null;
  } catch (error) {
    return null;
  }
}

/**
 * Log an event to Supabase
 * Fire-and-forget: errors are logged but never throw
 */
export async function trackEvent(eventName: EventName, metadata?: Record<string, string | number | boolean>): Promise<void> {
  try {
    // Capture traffic source data
    const utmParams = getUTMParams();
    const referrer = getReferrer();
    
    // Merge all metadata
    const enrichedMetadata: Record<string, string | number | boolean> = {
      ...(metadata || {}),
      ...utmParams,
    };
    
    if (referrer) {
      enrichedMetadata.referrer = referrer;
    }
    
    // Fire-and-forget: don't await, don't block UI
    supabase
      .from('app_8574c59127_analytics_events')
      .insert({
        event_name: eventName,
        metadata: enrichedMetadata,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Analytics] Failed to track event:', eventName, error);
        }
      });
  } catch (error) {
    // Silently fail - never block user experience
    console.warn('[Analytics] Error tracking event:', eventName, error);
  }
}

/**
 * Track page view events
 */
export function trackPageView(eventName: EventName): void {
  trackEvent(eventName);
}

/**
 * Track user action events with optional metadata
 */
export function trackAction(eventName: EventName, metadata?: Record<string, string | number | boolean>): void {
  trackEvent(eventName, metadata);
}
/**
 * Retailer URL utilities with IP-based location detection
 * Routes users to their local retailer site based on actual location, not browser locale
 */

import { DetectedItem } from './types';
import { getShapeForQuery } from './shape-refinement';

const COUNTRY_CACHE_KEY = 'user_country_code';
const COUNTRY_CACHE_EXPIRY = 'user_country_expiry';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Retailer domain mappings by country
const RETAILER_DOMAINS: Record<string, Record<string, string>> = {
  amazon: {
    US: 'amazon.com',
    CA: 'amazon.ca',
    UK: 'amazon.co.uk',
    DE: 'amazon.de',
    FR: 'amazon.fr',
    IT: 'amazon.it',
    ES: 'amazon.es',
    JP: 'amazon.co.jp',
    IN: 'amazon.in',
    AU: 'amazon.com.au',
    BR: 'amazon.com.br',
    MX: 'amazon.com.mx',
  },
  walmart: {
    US: 'walmart.com',
    CA: 'walmart.ca',
    MX: 'walmart.com.mx',
  },
  wayfair: {
    US: 'wayfair.com',
    CA: 'wayfair.ca',
    UK: 'wayfair.co.uk',
    DE: 'wayfair.de',
  },
  temu: {
    US: 'temu.com',
    CA: 'temu.com',
    UK: 'temu.com',
    DE: 'temu.com',
    FR: 'temu.com',
    // Temu uses same domain but redirects based on location
  },
  shein: {
    US: 'us.shein.com',
    CA: 'ca.shein.com',
    UK: 'uk.shein.com',
    DE: 'de.shein.com',
    FR: 'fr.shein.com',
    IT: 'it.shein.com',
    ES: 'es.shein.com',
    AU: 'au.shein.com',
    IN: 'in.shein.com',
    MX: 'mx.shein.com',
    BR: 'br.shein.com',
  },
};

// Color whitelist for tag extraction
const COLOR_WHITELIST = [
  'white', 'black', 'brown', 'beige', 'cream', 
  'grey', 'gray', 'green', 'blue', 'gold', 
  'silver', 'clear', 'natural', 'wood'
];

// Expanded shape whitelist (now includes organic/freeform)
const SHAPE_WHITELIST = ['organic', 'freeform', 'round', 'rectangular', 'square', 'oval'];

// Categories that support shape in search queries
const SHAPE_SUPPORTED_CATEGORIES = [
  'coffee table',
  'side table',
  'dining table',
  'console table',
  'end table',
  'chair',
  'rug',
  'mirror'
];

// Pattern terms whitelist (use longest forms to avoid partial matches)
const PATTERN_TERMS = [
  'striped', 'checkered', 'plaid', 'geometric', 
  'floral', 'animal print', 'bouclé', 'boucle', 'tufted', 
  'ribbed', 'corduroy', 'velvet', 'chenille', 'tweed',
  'patterned', 'textured'
];

// Category-specific subtype terms (whitelist only)
// Note: "waterfall" removed as it's not a shape
const SUBTYPE_TERMS: Record<string, string[]> = {
  'chandelier': ['branch', 'leaf', 'sputnik', 'tiered', 'flush mount', 'pendant'],
  'lighting': ['branch', 'leaf', 'sputnik', 'tiered', 'flush mount', 'pendant'],
  'lamp': ['branch', 'leaf', 'sputnik', 'tiered', 'flush mount', 'pendant'],
  'sofa': ['curved', 'modular', 'chaise', 'low profile', 'tufted'],
  'sectional': ['curved', 'modular', 'chaise', 'low profile', 'tufted'],
  'coffee table': ['drum', 'nesting', 'pedestal'],
  'side table': ['drum', 'nesting', 'pedestal'],
  'mirror': ['arched', 'full length', 'leaning', 'floor'],
  'rug': ['runner', 'shag', 'jute', 'woven', 'braided'],
  'chair': ['wingback', 'barrel', 'slipper', 'accent'],
  'dining table': ['pedestal', 'trestle', 'extendable']
};

// Feature terms (lightweight descriptors)
const FEATURE_TERMS = [
  'curved', 'rounded', 'scalloped', 'channel tufted', 
  'upholstered', 'slipcovered', 'nailhead', 'wingback'
];

/**
 * Extract descriptors from item fields (tags, name, description)
 * Returns pattern terms, subtype terms, and feature terms found in the item
 */
function extractDescriptors(item: DetectedItem): {
  patternTerms: string[];
  subtypeTerms: string[];
  featureTerms: string[];
} {
  const allText = [
    ...(item.tags || []),
    item.item_name,
    item.description || ''
  ].map(t => t.toLowerCase()).join(' ');

  const categoryLower = item.category?.toLowerCase() || '';

  // Extract pattern terms (exact word match, max 1 to avoid redundancy)
  const foundPatterns = PATTERN_TERMS.filter(term => {
    const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
    return regex.test(allText);
  }).slice(0, 1);

  // Extract category-specific subtype terms (max 2)
  let foundSubtypes: string[] = [];
  for (const [category, subtypes] of Object.entries(SUBTYPE_TERMS)) {
    if (categoryLower.includes(category)) {
      foundSubtypes = subtypes.filter(term => {
        const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
        return regex.test(allText);
      }).slice(0, 2);
      break;
    }
  }

  // Extract feature terms (max 1 to avoid over-constraining)
  const foundFeatures = FEATURE_TERMS.filter(term => {
    const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
    return regex.test(allText);
  }).slice(0, 1);

  return {
    patternTerms: foundPatterns,
    subtypeTerms: foundSubtypes,
    featureTerms: foundFeatures
  };
}

/**
 * Deduplicate tokens in query to avoid repetition
 */
function deduplicateTokens(parts: string[]): string[] {
  const seen = new Set<string>();
  return parts.filter(part => {
    const lower = part.toLowerCase();
    if (seen.has(lower)) {
      return false;
    }
    seen.add(lower);
    return true;
  });
}

/**
 * Check if a term already exists in the item name
 */
function isTermInItemName(term: string, itemName: string): boolean {
  const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
  return regex.test(itemName.toLowerCase());
}

/**
 * Detect user's country code using IP-based geolocation
 * Uses multiple fallback services for reliability
 */
async function detectUserCountry(): Promise<string> {
  // Check cache first
  const cachedCountry = localStorage.getItem(COUNTRY_CACHE_KEY);
  const cachedExpiry = localStorage.getItem(COUNTRY_CACHE_EXPIRY);
  
  if (cachedCountry && cachedExpiry) {
    const expiryTime = parseInt(cachedExpiry, 10);
    if (Date.now() < expiryTime) {
      console.log(`Using cached country: ${cachedCountry}`);
      return cachedCountry;
    }
  }

  // Try multiple IP geolocation services with fallbacks
  const services = [
    // Service 1: ipapi.co (free, no key required, HTTPS)
    async () => {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('ipapi.co failed');
      const data = await response.json();
      return data.country_code;
    },
    // Service 2: ipinfo.io (free tier, no key required for basic use, HTTPS)
    async () => {
      const response = await fetch('https://ipinfo.io/json', {
        method: 'GET'
      });
      if (!response.ok) throw new Error('ipinfo.io failed');
      const data = await response.json();
      return data.country;
    },
    // Service 3: ip-api.com (free, no key required, HTTPS)
    async () => {
      const response = await fetch('https://pro.ip-api.com/json/?fields=countryCode&key=free', {
        method: 'GET'
      });
      if (!response.ok) throw new Error('ip-api.com failed');
      const data = await response.json();
      return data.countryCode;
    }
  ];

  // Try each service in order
  for (const service of services) {
    try {
      const countryCode = await service();
      if (countryCode && typeof countryCode === 'string') {
        console.log(`Detected country via IP: ${countryCode}`);
        
        // Cache the result
        localStorage.setItem(COUNTRY_CACHE_KEY, countryCode.toUpperCase());
        localStorage.setItem(COUNTRY_CACHE_EXPIRY, (Date.now() + CACHE_DURATION_MS).toString());
        
        return countryCode.toUpperCase();
      }
    } catch (error) {
      console.warn('Geolocation service failed, trying next...', error);
      continue;
    }
  }

  // Final fallback: use browser language as last resort
  console.warn('All IP geolocation services failed, falling back to browser locale');
  const language = navigator.language || 'en-US';
  const fallbackCountry = language.split('-')[1]?.toUpperCase() || 'US';
  
  // Cache fallback too (shorter duration)
  localStorage.setItem(COUNTRY_CACHE_KEY, fallbackCountry);
  localStorage.setItem(COUNTRY_CACHE_EXPIRY, (Date.now() + 60 * 60 * 1000).toString()); // 1 hour for fallback
  
  return fallbackCountry;
}

/**
 * Get user's country code (cached or detected)
 */
let countryPromise: Promise<string> | null = null;

async function getUserCountryCode(): Promise<string> {
  // Ensure we only call detection once, even if multiple functions call this simultaneously
  if (!countryPromise) {
    countryPromise = detectUserCountry();
  }
  return countryPromise;
}

/**
 * Get the appropriate retailer domain for user's location
 * @param retailer - Retailer name (amazon, walmart, wayfair, temu, shein)
 * @returns Domain string (e.g., "amazon.ca", "walmart.com")
 */
async function getRetailerDomain(retailer: string): Promise<string> {
  const countryCode = await getUserCountryCode();
  const domains = RETAILER_DOMAINS[retailer.toLowerCase()];
  
  if (!domains) {
    console.warn(`Unknown retailer: ${retailer}`);
    return '';
  }
  
  // Return country-specific domain or fall back to US/.com
  return domains[countryCode] || domains.US || Object.values(domains)[0];
}

/**
 * Build normalized retailer query for Inspiration flow
 * Constructs query with color, pattern, shape, subtype/feature, and material
 * Priority order: color → pattern → shape → subtype/feature → material → base item name
 * 
 * @param item - DetectedItem from inspiration analysis
 * @returns Normalized query string with attributes included
 */
export function buildRetailerQuery(item: DetectedItem): string {
  const itemName = item.item_name.trim().toLowerCase();
  const queryParts: string[] = [];
  
  // Extract descriptors from existing fields
  const descriptors = extractDescriptors(item);
  
  // 1. Add color (if not already in item_name)
  const hasColorInName = COLOR_WHITELIST.some(color => 
    itemName.includes(color.toLowerCase())
  );
  
  if (!hasColorInName) {
    // Try dominant_color first
    if (item.dominant_color) {
      const color = item.dominant_color.trim().toLowerCase();
      if (COLOR_WHITELIST.includes(color)) {
        queryParts.push(color);
      }
    } else if (item.tags && Array.isArray(item.tags)) {
      // Fall back to color from tags
      const colorFromTags = item.tags.find(tag => 
        COLOR_WHITELIST.includes(tag.toLowerCase())
      );
      if (colorFromTags) {
        queryParts.push(colorFromTags.toLowerCase());
      }
    }
  }
  
  // 2. Add pattern terms (if found and not in item_name)
  for (const pattern of descriptors.patternTerms) {
    if (!isTermInItemName(pattern, itemName)) {
      queryParts.push(pattern);
    }
  }
  
  // 3. Add shape (with refinement for tables)
  const categoryLower = item.category?.toLowerCase() || '';
  const isCategorySupportedForShape = SHAPE_SUPPORTED_CATEGORIES.some(
    cat => categoryLower.includes(cat.toLowerCase())
  );
  
  if (isCategorySupportedForShape) {
    // Use shape refinement for better accuracy
    const refinedShape = getShapeForQuery(item);
    
    if (refinedShape && !isTermInItemName(refinedShape, itemName)) {
      // Normalize "freeform" to "organic" for consistency
      const normalizedShape = refinedShape === 'freeform' ? 'organic' : refinedShape;
      queryParts.push(normalizedShape);
    }
  }
  
  // 4. Add subtype/feature terms (max 2 combined, not in item_name)
  const combinedDescriptors = [
    ...descriptors.subtypeTerms,
    ...descriptors.featureTerms
  ].slice(0, 2);
  
  for (const descriptor of combinedDescriptors) {
    if (!isTermInItemName(descriptor, itemName)) {
      queryParts.push(descriptor);
    }
  }
  
  // 5. Add material (if present and not already in item_name)
  if (item.materials && Array.isArray(item.materials) && item.materials.length > 0) {
    const firstMaterial = item.materials[0].trim().toLowerCase();
    if (!itemName.includes(firstMaterial)) {
      queryParts.push(firstMaterial);
    }
  }
  
  // 6. Add base item name (but filter out shape terms that will be replaced)
  // Remove "freeform" from item name if we're adding "organic"
  let finalItemName = item.item_name;
  if (queryParts.some(p => p === 'organic')) {
    finalItemName = finalItemName.replace(/\bfreeform\b/gi, '').replace(/\bfree\s+form\b/gi, '').trim();
  }
  queryParts.push(finalItemName);
  
  // Deduplicate and limit length
  const dedupedParts = deduplicateTokens(queryParts);
  const finalQuery = dedupedParts.slice(0, 10).join(' '); // Max 10 words
  
  return finalQuery;
}

/**
 * Create Amazon search URL with IP-based location routing
 * Uses country-specific domain (e.g., amazon.ca for Canada)
 */
export async function getAmazonSearchUrl(query: string): Promise<string> {
  const domain = await getRetailerDomain('amazon');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/s?k=${encodedQuery}`;
}

/**
 * Create Walmart search URL with IP-based location routing
 * Uses country-specific domain (e.g., walmart.ca for Canada)
 */
export async function getWalmartSearchUrl(query: string): Promise<string> {
  const domain = await getRetailerDomain('walmart');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/search?q=${encodedQuery}`;
}

/**
 * Create Wayfair search URL with IP-based location routing
 * Uses country-specific domain (e.g., wayfair.ca for Canada)
 */
export async function getWayfairSearchUrl(query: string): Promise<string> {
  const domain = await getRetailerDomain('wayfair');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/keyword.php?keyword=${encodedQuery}`;
}

/**
 * Create Temu search URL with IP-based location routing
 */
export async function getTemuSearchUrl(query: string): Promise<string> {
  const domain = await getRetailerDomain('temu');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/search_result.html?search_key=${encodedQuery}`;
}

/**
 * Create Shein search URL with IP-based location routing
 * Uses /pdsearch/ format to avoid 404 errors
 * Example: https://ca.shein.com/pdsearch/light%20blue%20console%20table/
 */
export async function getSheinSearchUrl(query: string): Promise<string> {
  const domain = await getRetailerDomain('shein');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/pdsearch/${encodedQuery}/`;
}

/**
 * Create Google search URL (no location routing needed)
 */
export function getGoogleSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}`;
}

/**
 * Clear cached country data (useful for testing or manual override)
 */
export function clearCountryCache(): void {
  localStorage.removeItem(COUNTRY_CACHE_KEY);
  localStorage.removeItem(COUNTRY_CACHE_EXPIRY);
  countryPromise = null;
  console.log('Country cache cleared');
}
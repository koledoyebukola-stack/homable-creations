/**
 * Retailer URL utilities with location-based routing
 * Routes users to their local retailer site, falling back to global .com if unavailable
 */

// Detect user's country code from browser
function getUserCountryCode(): string {
  // Try to get from navigator.language (e.g., "en-US", "en-CA", "en-GB")
  const language = navigator.language || 'en-US';
  const countryCode = language.split('-')[1]?.toUpperCase() || 'US';
  return countryCode;
}

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
    // Temu uses same domain but may redirect based on location
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

/**
 * Get the appropriate retailer domain for user's location
 * @param retailer - Retailer name (amazon, walmart, wayfair, temu, shein)
 * @returns Domain string (e.g., "amazon.ca", "walmart.com")
 */
function getRetailerDomain(retailer: string): string {
  const countryCode = getUserCountryCode();
  const domains = RETAILER_DOMAINS[retailer.toLowerCase()];
  
  if (!domains) {
    console.warn(`Unknown retailer: ${retailer}`);
    return '';
  }
  
  // Return country-specific domain or fall back to US/.com
  return domains[countryCode] || domains.US || Object.values(domains)[0];
}

/**
 * Create Amazon search URL with location-based routing
 * Uses country-specific domain (e.g., amazon.ca for Canada)
 */
export function getAmazonSearchUrl(query: string): string {
  const domain = getRetailerDomain('amazon');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/s?k=${encodedQuery}`;
}

/**
 * Create Walmart search URL with location-based routing
 * Uses country-specific domain (e.g., walmart.ca for Canada)
 */
export function getWalmartSearchUrl(query: string): string {
  const domain = getRetailerDomain('walmart');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/search?q=${encodedQuery}`;
}

/**
 * Create Wayfair search URL with location-based routing
 * Uses country-specific domain (e.g., wayfair.ca for Canada)
 */
export function getWayfairSearchUrl(query: string): string {
  const domain = getRetailerDomain('wayfair');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/keyword.php?keyword=${encodedQuery}`;
}

/**
 * Create Temu search URL with location-based routing
 */
export function getTemuSearchUrl(query: string): string {
  const domain = getRetailerDomain('temu');
  const encodedQuery = encodeURIComponent(query);
  return `https://${domain}/search_result.html?search_key=${encodedQuery}`;
}

/**
 * Create Shein search URL with location-based routing
 * Uses /pdsearch/ format to avoid 404 errors
 * Example: https://us.shein.com/pdsearch/light%20blue%20console%20table/
 */
export function getSheinSearchUrl(query: string): string {
  const domain = getRetailerDomain('shein');
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
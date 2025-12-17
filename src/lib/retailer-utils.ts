/**
 * Retailer URL utilities with IP-based location detection
 * Routes users to their local retailer site based on actual location, not browser locale
 */

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
    // Service 1: ipapi.co (free, no key required)
    async () => {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('ipapi.co failed');
      const data = await response.json();
      return data.country_code;
    },
    // Service 2: ip-api.com (free, no key required)
    async () => {
      const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
        method: 'GET'
      });
      if (!response.ok) throw new Error('ip-api.com failed');
      const data = await response.json();
      return data.countryCode;
    },
    // Service 3: ipinfo.io (free tier, no key required for basic use)
    async () => {
      const response = await fetch('https://ipinfo.io/json', {
        method: 'GET'
      });
      if (!response.ok) throw new Error('ipinfo.io failed');
      const data = await response.json();
      return data.country;
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
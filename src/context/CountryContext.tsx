import React, { createContext, useContext, useEffect, useState } from 'react';
import { detectUserCountry } from '@/lib/retailer-utils';

export type CountryCode = 'CA' | 'NG' | 'OTHER';

const STORAGE_KEY = 'homable_selected_country';
const SOURCE_KEY = 'homable_country_source';

type CountrySource = 'manual' | 'auto';

interface CountryContextValue {
  country: CountryCode | null;
  setCountry: (code: CountryCode) => void;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

function normalizeCountryCode(raw: string | null): CountryCode | null {
  if (!raw) return null;
  let code = raw.toUpperCase();
  if (code === 'US' || code === 'GB') {
    code = 'OTHER';
  }
  if (code !== 'CA' && code !== 'NG' && code !== 'OTHER') {
    return 'OTHER';
  }
  return code as CountryCode;
}

export function getSelectedCountry(): CountryCode {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'OTHER';
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const normalized = normalizeCountryCode(stored);
  return normalized ?? 'OTHER';
}

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountryState] = useState<CountryCode | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initCountry = async () => {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        if (!cancelled) {
          setCountryState('OTHER');
        }
        return;
      }

      const stored = normalizeCountryCode(localStorage.getItem(STORAGE_KEY));
      const source = (localStorage.getItem(SOURCE_KEY) as CountrySource | null) ?? null;

      // 1. Manual override from a previous session always wins.
      if (stored && source === 'manual') {
        if (!cancelled) {
          setCountryState(stored);
          window.dispatchEvent(
            new CustomEvent('locationChanged', {
              detail: { country: stored },
            }),
          );
        }
        return;
      }

      // 2. Use IP geolocation for a fresh session or auto source.
      try {
        const detectedIso = await detectUserCountry();
        let mapped: CountryCode = 'OTHER';
        const upper = detectedIso.toUpperCase();
        if (upper === 'CA') mapped = 'CA';
        else if (upper === 'NG') mapped = 'NG';
        else if (upper === 'US' || upper === 'GB') mapped = 'OTHER';
        else mapped = 'OTHER';

        if (!cancelled) {
          setCountryState(mapped);
          localStorage.setItem(STORAGE_KEY, mapped);
          localStorage.setItem(SOURCE_KEY, 'auto');
          window.dispatchEvent(
            new CustomEvent('locationChanged', {
              detail: { country: mapped },
            }),
          );
        }
      } catch (error) {
        console.error('[CountryProvider] Failed to detect country via IP:', error);
        if (!cancelled) {
          // 3. Neutral fallback: OTHER (never NG).
          const fallback: CountryCode = stored ?? 'OTHER';
          setCountryState(fallback);
          localStorage.setItem(STORAGE_KEY, fallback);
          localStorage.setItem(SOURCE_KEY, 'auto');
          window.dispatchEvent(
            new CustomEvent('locationChanged', {
              detail: { country: fallback },
            }),
          );
        }
      }
    };

    void initCountry();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCountry = (code: CountryCode) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(SOURCE_KEY, 'manual');
    }
    setCountryState(code);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('locationChanged', {
          detail: { country: code },
        }),
      );
    }
  };

  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
};

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return ctx;
}

export { STORAGE_KEY as COUNTRY_STORAGE_KEY, SOURCE_KEY as COUNTRY_SOURCE_KEY };


import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ComingSoonBanner from '@/components/ComingSoonBanner';
import { useCountry } from '@/context/CountryContext';
import { getActiveStorefrontsByLocation } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';

const HERO_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Decor%20store%20banner.png';

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min != null) return `From ₦${min.toLocaleString()}`;
  if (max != null) return `From ₦${max.toLocaleString()}`;
  return 'Price on request';
}

const COUNTRY_NAMES: Record<string, string> = {
  NG: 'Nigeria',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  OTHER: 'your area',
};

function formatCategoryLabel(category: string): string {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getVendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  const initials = (first + second).toUpperCase();
  return initials || 'V';
}

function getVendorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

export default function ShopsHome() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const [loading, setLoading] = useState<boolean>(true);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch storefronts + products for the active country
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getActiveStorefrontsByLocation(country || 'OTHER')
      .then(result => {
        if (cancelled) return;
        setStorefronts(result.storefronts);
        setProducts(result.products);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  const hasActiveVendors = storefronts.length > 0;
  const countryName = COUNTRY_NAMES[country] ?? 'your area';

  // Simple derived grouping: count products per storefront for vendor cards
  const productCountsByStorefront = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.storefront_id] = (counts[p.storefront_id] || 0) + 1;
    }
    return counts;
  }, [products]);

  // Map categories -> representative product
  const categoriesWithRepresentative = useMemo(() => {
    const map = new Map<string, VendorProduct>();
    for (const p of products) {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, p);
      }
    }
    return Array.from(map.entries());
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Full grid products (after category filter; can be paged later if needed)
  const gridProducts = useMemo(() => filteredProducts, [filteredProducts]);

  const orderedCategories = useMemo(() => {
    const existing = categoriesWithRepresentative.map(([category]) => category);
    const fixedOrder = ['planters', 'artwork', 'mirror', 'seating', 'table', 'bed'];
    const primary = fixedOrder.filter((cat) => existing.includes(cat));
    const secondary = existing
      .filter((cat) => !fixedOrder.includes(cat))
      .sort((a, b) => a.localeCompare(b));
    return [...primary, ...secondary];
  }, [categoriesWithRepresentative]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 flex flex-col">
        {/* Hero: full-width image + text overlay (CTA + marketplace messaging) */}
        <section className="relative w-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px]">
          <div className="absolute inset-0">
            <img
              src={HERO_IMAGE}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"
              aria-hidden
            />
          </div>
          <div className="relative container mx-auto px-4 md:px-6 lg:px-8 h-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px] flex items-center">
            <div className="max-w-xl py-12 md:py-16">
              {hasActiveVendors ? (
                <div className="inline-flex items-center rounded-full bg-emerald-500/95 text-white text-xs px-3 py-1 shadow-sm mb-4">
                  <span className="mr-1 text-[10px]">✓</span>
                  <span>Now available in {countryName}</span>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-md bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-sm mb-4">
                  <ComingSoonBanner className="text-xs px-2 py-0.5 border-0" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight drop-shadow-sm">
                Homable Shops
              </h1>
              <p className="mt-4 text-lg md:text-xl lg:text-2xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
                Browse verified local vendors — furniture, décor, and more. Connect directly and get exactly what you want.
              </p>
            </div>
          </div>
        </section>

        {/* Category filters: text pills below hero */}
        {hasActiveVendors && orderedCategories.length > 0 && (
          <section
            className="border-b border-gray-100 bg-[#fafaf9] py-4 md:py-5"
            aria-label="Browse by category"
          >
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 px-4 md:px-6 lg:px-8 pb-1 scroll-pills-hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === null
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                  }`}
                >
                  All
                </button>
                {orderedCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                    }`}
                  >
                    {formatCategoryLabel(category)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. Active marketplace sections (only when vendors exist for this location) */}
        {hasActiveVendors && (
          <>
            {/* Full products grid from vendors in this location */}
            {gridProducts.length > 0 && (
              <section className="border-t border-gray-100 bg-white py-10 md:py-16" aria-label="Browse all products">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                  <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
                    <div>
                      <h2 className="text-lg md:text-2xl lg:text-3xl font-semibold text-gray-900">
                        {storefronts.length === 1
                          ? `Browse all from ${storefronts[0].name}`
                          : 'Browse the marketplace'}
                      </h2>
                      <p className="mt-1 text-xs md:text-sm text-gray-600">
                        All published pieces from vendors in your selected market.
                      </p>
                    </div>
                    {storefronts.length === 1 && (
                      <Button
                        variant="outline"
                        className="hidden md:inline-flex rounded-full text-xs md:text-sm"
                        onClick={() => navigate(`/stores/${storefronts[0].slug}`)}
                      >
                        Browse all from {storefronts[0].name}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {gridProducts.map((product, index) => {
                      const isAboveFold = index < 6;
                      const storefront = storefronts.find(sf => sf.id === product.storefront_id);
                      return (
                        <article
                          key={product.id}
                          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer flex flex-col"
                          onClick={() => navigate(`/shops/products/${product.slug}`)}
                        >
                          <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                loading={isAboveFold ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No image
                              </div>
                            )}
                            {storefront && (
                              <div className="absolute top-2 left-2 max-w-[90%]">
                                <span className="inline-flex items-center rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-1 shadow-sm">
                                  <span
                                    className="relative h-6 w-6 rounded-full border border-white/70 overflow-hidden flex items-center justify-center text-[10px] font-semibold mr-1"
                                    style={{ backgroundColor: getVendorColor(storefront.name) }}
                                  >
                                    <span className="z-0">
                                      {getVendorInitials(storefront.name)}
                                    </span>
                                    {storefront.logo_url && (
                                      <img
                                        src={storefront.logo_url}
                                        alt={storefront.name}
                                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    )}
                                  </span>
                                  <span className="truncate max-w-[80px]">
                                    {storefront.name}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                            <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                              {product.name}
                            </h3>
                            <p className="text-xs text-gray-700 mt-1">
                              {formatPrice(product.price_min, product.price_max)}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {storefronts.length === 1 && (
                    <div className="mt-6 flex justify-center md:hidden">
                      <Button
                        variant="outline"
                        className="rounded-full text-xs md:text-sm w-full max-w-xs"
                        onClick={() => navigate(`/stores/${storefronts[0].slug}`)}
                      >
                        Browse all from {storefronts[0].name}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

    </div>
  );
}

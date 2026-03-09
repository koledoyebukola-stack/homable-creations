import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ComingSoonBanner from '@/components/ComingSoonBanner';
import { useCountry } from '@/context/CountryContext';
import { getActiveStorefrontsByLocation } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';

const FEATURE_CARDS = [
  {
    title: 'Vendor discovery',
    description: 'Find local furniture makers and shops near you.',
    image: '/assets/sample-afro-modern-dining-3.jpg',
  },
  {
    title: 'Local shopping',
    description: 'Browse furniture and decor from your inspiration.',
    image: '/assets/furniture-collection.jpg',
  },
  {
    title: 'Direct connection',
    description: 'Contact vendors directly—no checkout on Homable.',
    image: '/assets/sample-afro-modern-bedroom-2.jpg',
  },
] as const;

const HERO_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Shops%20Banner.png';

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

  // Map categories -> representative product (for category nav images)
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

  // Featured products preview: first 6 items for hero/preview section (after category filter)
  const previewProducts = useMemo(() => filteredProducts.slice(0, 6), [filteredProducts]);

  // Full grid products (after category filter; can be paged later if needed)
  const gridProducts = useMemo(() => filteredProducts, [filteredProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 flex flex-col">
        {/* 1. Category navigation strip (functional filters when marketplace is active) */}
        {hasActiveVendors && categoriesWithRepresentative.length > 0 && (
          <section
            className="border-b border-gray-100 bg-[#fafaf9] py-4 md:py-5"
            aria-label="Browse by category"
          >
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-3 px-4 md:px-6 lg:px-8 pb-1">
                {/* All category */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 w-[92px] md:w-[96px] rounded-xl border ${
                    selectedCategory === null
                      ? 'border-gray-900 bg-white shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } flex flex-col items-center pt-3 pb-2 transition-colors`}
                >
                  <div className="h-[72px] w-[72px] rounded-lg bg-gray-100 flex items-center justify-center text-[11px] text-gray-500">
                    All
                  </div>
                  <p className="mt-2 text-[11px] text-gray-800 font-medium">All</p>
                </button>

                {categoriesWithRepresentative.map(([category, rep]) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 w-[92px] md:w-[96px] rounded-xl border ${
                      selectedCategory === category
                        ? 'border-gray-900 bg-white shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } flex flex-col items-center pt-3 pb-2 transition-colors`}
                  >
                    <div className="h-[72px] w-[72px] rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                      {rep.image_url ? (
                        <img
                          src={rep.image_url}
                          alt={formatCategoryLabel(category)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-[11px] text-gray-500 px-1 text-center">
                          {formatCategoryLabel(category)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-800 font-medium text-center">
                      {formatCategoryLabel(category)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 2. Hero: full-width image + text overlay (CTA + marketplace messaging) */}
        <section className="relative w-full min-h-[420px] md:min-h-[520px] lg:min-h-[600px]">
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
          <div className="relative container mx-auto px-4 md:px-6 lg:px-8 h-full min-h-[420px] md:min-h-[520px] lg:min-h-[600px] flex items-center">
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
              {hasActiveVendors ? (
                <>
                  <p className="mt-4 text-lg md:text-xl lg:text-2xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
                    Discover local furniture vendors. Browse verified craftsmen and connect directly to get exactly what you want.
                  </p>
                  <p className="mt-3 text-sm md:text-base text-white/85 max-w-md">
                    Available now in your selected market. Upload an inspiration to start planning your space.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-lg md:text-xl lg:text-2xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
                    Discover local furniture vendors from your inspiration. Connect directly with sellers near you to get exactly what you want.
                  </p>
                  <p className="mt-3 text-sm md:text-base text-white/85 max-w-md">
                    Launching soon in more markets. Upload an inspiration to get notified.
                  </p>
                </>
              )}
              <Button
                onClick={() => navigate('/upload')}
                className="mt-6 bg-white text-black hover:bg-white/90 rounded-full font-medium shadow-lg cursor-pointer"
              >
                Upload Inspiration
              </Button>
            </div>
          </div>
        </section>

        {/* 3. Active marketplace sections (only when vendors exist for this location) */}
        {hasActiveVendors && (
          <>
            {/* 3a. Featured products preview (hero pieces) */}
            {previewProducts.length > 0 && (
              <section
                className="border-t border-gray-100 bg-[#FAFAF8] py-10 md:py-14"
                aria-label="Featured pieces from this market"
              >
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                  <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
                    <div>
                      <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">
                        Crafted in {countryName}
                      </h2>
                      <p className="mt-2 text-xs md:text-sm text-gray-600 max-w-md leading-relaxed">
                        A first look at some of the custom pieces available in your market. See the work before you meet the maker.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {previewProducts.map((product, index) => {
                      const storefront = storefronts.find(sf => sf.id === product.storefront_id);
                      return (
                        <article
                          key={product.id}
                          className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 text-left cursor-pointer transform hover:-translate-y-0.5 flex flex-col"
                          onClick={() => navigate(`/shops/products/${product.slug}`)}
                        >
                          <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-3xl flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                loading={index < 4 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="px-3 pt-3 pb-4">
                            <h3 className="text-sm md:text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
                              {product.name}
                            </h3>
                            {storefront && (
                              <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">
                                {storefront.name}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-800">
                              {formatPrice(product.price_min, product.price_max)}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-xs md:text-sm text-gray-600 text-center md:text-left">
                    Meet the craftsman behind these pieces ↓
                  </p>
                </div>
              </section>
            )}

            {/* 3b. Vendor spotlight / vendor grid */}
            <section className="border-t border-[#E5DED2] bg-[#F5F3EF] py-10 md:py-16" aria-label="Vendors in your area">
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">
                      {storefronts.length === 1 ? 'Launch partner spotlight' : 'Our vendors'}
                    </h2>
                    <p className="mt-2 text-xs md:text-sm text-gray-700 max-w-xl leading-relaxed">
                      {storefronts.length === 1
                        ? 'Meet our first craftsman in this market. See their work, understand their style, and reach out directly.'
                        : 'Browse active furniture vendors in your selected market.'}
                    </p>
                  </div>
                </div>
                {storefronts.length === 1 ? (
                  // Single vendor: premium spotlight layout
                  <div className="grid grid-cols-1">
                    {storefronts.map(storefront => {
                      const count = productCountsByStorefront[storefront.id] ?? 0;
                      return (
                        <article
                          key={storefront.id}
                          className="rounded-3xl bg-gradient-to-r from-[#F5F3EF] via-[#F2EAE3] to-[#F5F3EF] shadow-[0_22px_60px_rgba(15,23,42,0.25)] overflow-hidden px-5 py-6 md:px-8 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start"
                        >
                          <div className="flex flex-col items-center md:items-start gap-4 md:w-1/3">
                            <div className="inline-flex items-center rounded-full bg-[#E6D6C3] text-[#7B4B26] text-[11px] font-medium px-3 py-1">
                              Launch partner
                            </div>
                            <div className="relative">
                              <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-[#F3E6D7] bg-black/80 overflow-hidden shadow-[0_16px_40px_rgba(15,23,42,0.45)] flex items-center justify-center text-white font-semibold text-xl">
                                {storefront.logo_url ? (
                                  <img src={storefront.logo_url} alt={storefront.name} className="w-full h-full object-cover" />
                                ) : (
                                  storefront.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col gap-4">
                            <div>
                              <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-[#1F2933]">
                                {storefront.name}
                              </h3>
                              <p className="mt-1 text-sm md:text-base text-[#4B5563]">
                                {(storefront.location_display || storefront.location || 'Local vendor')} ·{' '}
                                {storefront.vendor_type === 'carpenter' ? 'Custom furniture & carpentry' : 'Home decor & styling'}
                              </p>
                            </div>
                            {storefront.description && (
                              <p className="text-sm md:text-[15px] text-[#374151] leading-relaxed md:leading-7">
                                {storefront.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-[11px] md:text-xs text-gray-700">
                              <span className="inline-flex items-center rounded-full bg-white/80 border border-[#E5D9C8] px-3 py-1">
                                {count > 0 ? `${count} piece${count === 1 ? '' : 's'} in catalog` : 'Catalog publishing soon'}
                              </span>
                              {storefront.active_since && (
                                <span className="inline-flex items-center rounded-full bg-white/70 border border-[#E5D9C8] px-3 py-1">
                                  Active since{' '}
                                  {new Date(storefront.active_since).toLocaleDateString(undefined, {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <Button
                                className="rounded-full text-xs md:text-sm px-5 py-2.5 bg-[#111827] hover:bg-[#020617] text-white shadow-md"
                                onClick={() => navigate(`/stores/${storefront.slug}`)}
                              >
                                View storefront
                              </Button>
                              {storefront.instagram_handle && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `https://instagram.com/${storefront.instagram_handle!.replace(/^@/, '')}`,
                                      '_blank'
                                    )
                                  }
                                  className="inline-flex items-center text-xs md:text-sm text-[#4B5563] hover:text-[#111827]"
                                >
                                  <span className="mr-1">Instagram</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  // Multi-vendor grid
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {storefronts.map(storefront => {
                      const count = productCountsByStorefront[storefront.id] ?? 0;
                      return (
                        <article
                          key={storefront.id}
                          className="rounded-2xl bg-white/95 border border-[#E5DED2] shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col"
                        >
                          <div className="p-4 md:p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-[#E5DED2] overflow-hidden bg-black/80 flex items-center justify-center text-white font-semibold text-sm md:text-base">
                                {storefront.logo_url ? (
                                  <img src={storefront.logo_url} alt={storefront.name} className="w-full h-full object-cover" />
                                ) : (
                                  storefront.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                  {storefront.name}
                                </h3>
                                <p className="text-xs text-gray-600 truncate">
                                  {(storefront.location_display || storefront.location || 'Local vendor')} ·{' '}
                                  {storefront.vendor_type === 'carpenter' ? 'Custom furniture' : 'Home decor'}
                                </p>
                              </div>
                            </div>
                            {storefront.description && (
                              <p className="mt-3 text-xs md:text-sm text-gray-700 line-clamp-3 leading-relaxed">
                                {storefront.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center gap-2 text-[11px] md:text-xs text-gray-600">
                              <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 bg-gray-50">
                                {count > 0 ? `${count} piece${count === 1 ? '' : 's'} in catalog` : 'Catalog publishing soon'}
                              </span>
                              {storefront.active_since && (
                                <span className="hidden md:inline text-gray-500">
                                  Active since{' '}
                                  {new Date(storefront.active_since).toLocaleDateString(undefined, {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="border-t border-gray-100 bg-gray-50/60 px-4 md:px-5 py-3 flex justify-between items-center">
                            <Button
                              variant="outline"
                              className="rounded-full text-xs md:text-sm px-4 py-2"
                              onClick={() => navigate(`/stores/${storefront.slug}`)}
                            >
                              View storefront
                            </Button>
                            {storefront.instagram_handle && (
                              <a
                                href={`https://instagram.com/${storefront.instagram_handle.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] md:text-xs text-gray-600 hover:text-gray-900"
                              >
                                @{storefront.instagram_handle.replace(/^@/, '')}
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 3c. Full products grid from vendors in this location */}
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
                            <div className="absolute top-2 left-2">
                              <span className="inline-flex items-center rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-1 shadow-sm">
                                {storefront?.offering_type === 'imported' ? 'Imported' : 'Custom order'}
                              </span>
                            </div>
                          </div>
                          <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                            <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                              {product.name}
                            </h3>
                            {storefront && (
                              <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-1">
                                {storefront.name}
                              </p>
                            )}
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

        {/* 4. Secondary feature cards / How it works (always visible) */}
        <section
          className="border-t border-gray-100 bg-[#fafaf9] py-12 md:py-16"
          aria-label="How Homable Shops works"
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {FEATURE_CARDS.map(({ title, description, image }) => (
                <div
                  key={title}
                  className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm opacity-90 cursor-default select-none"
                  style={{ cursor: 'default' }}
                  role="article"
                  aria-label={title}
                >
                  <div className="aspect-[4/3] bg-gray-200">
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <div className="p-4 md:p-5">
                    <h3 className="font-semibold text-[#111]">{title}</h3>
                    <p className="mt-1 text-sm text-[#555] leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}

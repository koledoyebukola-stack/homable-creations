import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import ComingSoonBanner from '@/components/ComingSoonBanner';
import { getSelectedCountry } from '@/components/LocationSelector';
import { getActiveStorefrontsByLocation } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';

const CATEGORY_TILES = [
  { name: 'Sofas', image: '/assets/boucle-sofa.jpg' },
  { name: 'Tables & Chairs', image: '/assets/oval-dining-table.jpg' },
  { name: 'Storage', image: '/assets/compact-desk.jpg' },
  { name: 'Beds', image: '/assets/canopy-bed.jpg' },
  { name: 'Decor', image: '/assets/persian-rug.jpg' },
  { name: 'Lighting', image: '/assets/carousel-living-room-1.jpg' },
  { name: 'Dining', image: '/assets/carousel-dining-room-5.jpg' },
  { name: 'Office', image: '/assets/wood-minimalist-desk.jpg' },
] as const;

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

const HERO_IMAGE = '/assets/sample-afro-modern-living-1.jpg';

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min != null) return `From ₦${min.toLocaleString()}`;
  if (max != null) return `From ₦${max.toLocaleString()}`;
  return 'Price on request';
}

export default function ShopsHome() {
  const navigate = useNavigate();
  const [country, setCountry] = useState<string>(() => getSelectedCountry());
  const [loading, setLoading] = useState<boolean>(true);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);

  // Listen for global location changes from Header's LocationSelector
  useEffect(() => {
    const handleLocationChange = (event: Event) => {
      const custom = event as CustomEvent<{ country?: string }>;
      const newCountry = custom.detail?.country;
      if (!newCountry) return;
      setCountry(newCountry);
    };

    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    return () => window.removeEventListener('locationChanged', handleLocationChange as EventListener);
  }, []);

  // Fetch storefronts + products for the active country
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getActiveStorefrontsByLocation(country)
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

  // Simple derived grouping: count products per storefront for vendor cards
  const productCountsByStorefront = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.storefront_id] = (counts[p.storefront_id] || 0) + 1;
    }
    return counts;
  }, [products]);

  // Featured products grid: show up to 12 products for the current location
  const featuredProducts = useMemo(() => products.slice(0, 12), [products]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* 1. Category preview tiles - visual only, not clickable */}
        <section
          className="border-b border-gray-100 bg-[#fafaf9] py-6 md:py-8"
          aria-label="Category preview"
        >
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 px-4 min-w-max md:px-6 lg:px-8 pb-2">
              {CATEGORY_TILES.map(({ name, image }) => (
                <div
                  key={name}
                  className="flex-shrink-0 w-[140px] md:w-[160px] rounded-lg bg-[#f0eeeb] overflow-hidden opacity-90 cursor-default select-none"
                  style={{ cursor: 'default' }}
                  role="img"
                  aria-label={name}
                >
                  <div className="aspect-square w-full bg-gray-200">
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-[#333] py-2.5 px-2">
                    {name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

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
              {!hasActiveVendors && (
                <div className="inline-flex items-center rounded-md bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-sm mb-4">
                  <ComingSoonBanner className="text-xs px-2 py-0.5 border-0" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight drop-shadow-sm">
                Homable Shops
              </h1>
              {hasActiveVendors ? (
                <>
                  <p className="mt-4 text-lg md:text-xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
                    Discover local furniture vendors. Browse verified craftsmen and connect directly to get exactly what you want.
                  </p>
                  <p className="mt-3 text-sm md:text-base text-white/85 max-w-md">
                    Available now in your selected market. Upload an inspiration to start planning your space.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-lg md:text-xl text-white/95 leading-relaxed max-w-md drop-shadow-sm">
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
            {/* Featured vendor(s) */}
            <section className="border-t border-gray-100 bg-[#fafaf9] py-10 md:py-14" aria-label="Vendors in your area">
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                      {storefronts.length === 1 ? 'Launch partner spotlight' : 'Our vendors'}
                    </h2>
                    <p className="mt-1 text-xs md:text-sm text-gray-600">
                      {storefronts.length === 1
                        ? 'Meet our first craftsman in this market.'
                        : 'Browse active furniture vendors in your selected market.'}
                    </p>
                  </div>
                </div>
                <div className={storefronts.length === 1 ? 'grid grid-cols-1 md:grid-cols-[2fr,3fr] gap-6 md:gap-8' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'}>
                  {storefronts.map(storefront => {
                    const count = productCountsByStorefront[storefront.id] ?? 0;
                    return (
                      <article
                        key={storefront.id}
                        className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                      >
                        <div className="p-4 md:p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-gray-200 overflow-hidden bg-black/80 flex items-center justify-center text-white font-semibold text-sm md:text-base">
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
                            <p className="mt-3 text-xs md:text-sm text-gray-700 line-clamp-3">
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
              </div>
            </section>

            {/* Featured products from vendors in this location */}
            {featuredProducts.length > 0 && (
              <section className="border-t border-gray-100 bg-white py-10 md:py-14" aria-label="Featured products">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                  <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-gray-900">Signature pieces</h2>
                      <p className="mt-1 text-xs md:text-sm text-gray-600">
                        Featured items from vendors in your selected market.
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
                    {featuredProducts.map((product, index) => {
                      const aspectClass = index % 3 === 0 ? 'aspect-[4/5]' : index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square';
                      const isAboveFold = index < 6;
                      const storefront = storefronts.find(sf => sf.id === product.storefront_id);
                      return (
                        <article
                          key={product.id}
                          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer"
                          onClick={() => navigate(`/shops/products/${product.slug}`)}
                        >
                          <div className={`${aspectClass} w-full bg-gray-100 relative overflow-hidden rounded-2xl`}>
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading={isAboveFold ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No image
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <span className="inline-flex items-center rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-1 shadow-sm">
                                Custom order
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

      <Footer />
    </div>
  );
}

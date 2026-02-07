import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, MessageCircle, Store, Search, X } from 'lucide-react';
import { getStorefrontBySlug, getStorefrontProductsPage } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';

/** Debounce delay for search input (ms). */
const SEARCH_DEBOUNCE_MS = 300;

/** Price display: range, "From ₦X", or "Price on request". */
function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min != null) return `From ₦${min.toLocaleString()}`;
  if (max != null) return `From ₦${max.toLocaleString()}`;
  return 'Price on request';
}

/** WhatsApp link: DB stores digits only; link is https://wa.me/{digits_only}. */
function whatsappUrl(number: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

/** Human-readable category label for display (e.g. accent_chair → Accent Chair). */
function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

type StorefrontData = {
  storefront: Storefront;
  products: VendorProduct[];
  totalCount: number;
  hasMore: boolean;
  categories: string[];
};

export default function StorefrontView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StorefrontData | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    getStorefrontBySlug(slug).then(result => {
      if (result) setData(result);
      else setData(null);
    });
  }, [slug]);

  // Must be called unconditionally (before any early return) to avoid React "rendered more hooks" error #310.
  const loadMore = useCallback(async () => {
    if (!data || data === null || !('storefront' in data)) return;
    const { storefront, products } = data;
    const next = await getStorefrontProductsPage(storefront.id, products.length);
    if (next.length === 0) return;
    setData(prev => (prev && 'products' in prev ? {
      ...prev,
      products: [...prev.products, ...next],
      hasMore: prev.products.length + next.length < prev.totalCount,
    } : prev));
  }, [data]);

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-gray-600">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Storefront not found</h1>
          <p className="mt-2 text-gray-600">This page doesn’t exist or may have been removed.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button onClick={() => navigate('/')} className="rounded-full">Return Home</Button>
            <Button variant="outline" onClick={() => navigate('/shops')} className="rounded-full">
              <Store className="mr-2 h-4 w-4" />
              Browse Shops
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { storefront, products, totalCount, hasMore, categories } = data;

  if (storefront.status === 'paused') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Temporarily unavailable</h1>
          <p className="mt-3 text-gray-600 max-w-md">
            This storefront is temporarily unavailable. Check back soon or explore other vendors.
          </p>
          <Button onClick={() => navigate('/shops')} className="mt-6 rounded-full" size="lg">
            <Store className="mr-2 h-4 w-4" />
            Browse Other Vendors
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <StorefrontActive
      storefront={storefront}
      products={products}
      totalCount={totalCount}
      hasMore={hasMore}
      categories={categories ?? []}
      onLoadMore={loadMore}
    />
  );
}

function StorefrontActive({
  storefront,
  products,
  totalCount,
  hasMore,
  categories,
  onLoadMore,
}: {
  storefront: Storefront;
  products: VendorProduct[];
  totalCount: number;
  hasMore: boolean;
  categories: string[];
  onLoadMore: () => void;
}) {
  const navigate = useNavigate();
  const { category: categoryParam } = useParams<{ slug: string; category?: string }>();

  const [categoryFilter, setCategoryFilterState] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const priceRangeInitialized = useRef(false);

  // Categories come from API (all storefront categories), not from loaded products, so pills show on initial load.

  // Sync category filter from URL on mount and when category param changes (shareable links).
  // We allow any category string from URL so shared links work even before "Load more" has run.
  useEffect(() => {
    const decoded = categoryParam ? decodeURIComponent(categoryParam) : null;
    setCategoryFilterState(decoded);
  }, [categoryParam]);

  // Use path segments (/stores/slug/category) for shareable, SEO-friendly category URLs (e.g. WhatsApp).
  const setCategoryFilter = useCallback((cat: string | null) => {
    setCategoryFilterState(cat);
    if (cat) {
      navigate(`/stores/${storefront.slug}/${encodeURIComponent(cat)}`, { replace: true });
    } else {
      navigate(`/stores/${storefront.slug}`, { replace: true });
    }
  }, [navigate, storefront.slug]);

  // Debounce search input (300ms) to avoid excessive re-renders and feel responsive.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const priceBounds = useMemo((): [number, number] => {
    let min = Infinity, max = -Infinity;
    products.forEach(p => {
      const lo = p.price_min ?? p.price_max ?? null;
      const hi = p.price_max ?? p.price_min ?? null;
      if (lo != null && lo < min) min = lo;
      if (hi != null && hi > max) max = hi;
    });
    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 0;
    return [min, max];
  }, [products]);

  useEffect(() => {
    priceRangeInitialized.current = false;
  }, [storefront.id]);

  useEffect(() => {
    const [min, max] = priceBounds;
    if (!priceRangeInitialized.current && (min !== 0 || max !== 0)) {
      priceRangeInitialized.current = true;
      setPriceRange(priceBounds);
    }
  }, [priceBounds, storefront.id]);

  const [priceMin, priceMax] = priceRange;

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return products.filter(p => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      const pMin = p.price_min ?? p.price_max ?? null;
      const pMax = p.price_max ?? p.price_min ?? null;
      if (priceMin != null && priceMax != null && priceMin <= priceMax) {
        if (pMin == null && pMax == null) return true;
        const lo = pMin ?? 0, hi = pMax ?? Infinity;
        if (hi < priceMin || lo > priceMax) return false;
      }
      if (q) {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const categoryMatch = p.category?.toLowerCase().includes(q);
        if (!nameMatch && !categoryMatch) return false;
      }
      return true;
    });
  }, [products, categoryFilter, priceMin, priceMax, debouncedSearch]);

  const whatsapp = whatsappUrl(storefront.whatsapp_number);

  // Derive subtitle from vendor_type
  const getVendorSubtitle = (vendorType: string | null | undefined): string | null => {
    if (vendorType === 'carpenter') return 'Custom Furniture & Carpentry';
    if (vendorType === 'decor_store') return 'Home Decor & Styling';
    return null;
  };

  const vendorSubtitle = getVendorSubtitle(storefront.vendor_type);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-gray-900 bg-gray-900 min-h-[200px]">
          {storefront.banner_url ? (
            <div className="absolute inset-0">
              <img src={storefront.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-black/50" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4b556333,transparent_55%),radial-gradient(circle_at_bottom_right,#11182733,transparent_55%)]" />
          )}
          <div className="relative container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
              <div className="flex justify-center md:justify-start">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-gray-300 bg-black/70 overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                  {storefront.logo_url ? (
                    <img src={storefront.logo_url} alt={storefront.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold">
                      {storefront.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left text-white">
                <h1 className="text-2xl md:text-3xl lg:text-[32px] font-bold tracking-tight">
                  {storefront.name}
                </h1>
                {storefront.location && (
                  <p className="mt-1 text-sm md:text-base text-white/80">
                    {storefront.location}
                    {vendorSubtitle && ` · ${vendorSubtitle}`}
                  </p>
                )}
                {storefront.description && (
                  <p className="mt-2 text-xs md:text-sm text-white/80 max-w-md">{storefront.description}</p>
                )}
                {storefront.active_since && (
                  <p className="mt-1 text-[11px] md:text-xs text-white/60">
                    Active since{' '}
                    {new Date(storefront.active_since).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                {storefront.instagram_handle && (
                  <a
                    href={`https://instagram.com/${storefront.instagram_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs md:text-sm text-white/80 hover:text-white transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    @{storefront.instagram_handle.replace(/^@/, '')}
                  </a>
                )}
              </div>
              <div className="hidden md:flex flex-col items-end gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  <span className="font-medium text-white text-xs">Custom orders available</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products + filters */}
        <section className="py-8 md:py-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Signature pieces</h2>
            <p className="mt-1 text-xs md:text-sm text-gray-600">
              {totalCount} custom-made pieces{storefront.vendor_type === 'carpenter' ? ', crafted to order' : ''}.
            </p>

            {/* Search: above filters, full width on mobile, max-width on desktop. Debounced client-side. */}
            {/* type="text" + custom clear only = single clear button (type="search" adds native clear on desktop). */}
            <div className="mt-4 w-full max-w-xl">
              <label htmlFor="storefront-search" className="sr-only">Search products</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
                <input
                  id="storefront-search"
                  type="text"
                  autoComplete="off"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search: bed, wardrobe, L-shape sofa, TV stand"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  aria-label="Search products by name or category"
                />
                {searchInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Results count: "Showing X products" or "X results for 'sofa'" */}
            <p className="mt-2 text-xs text-gray-600">
              {debouncedSearch
                ? `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${debouncedSearch}"`
                : `Showing ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`}
            </p>

            {/* Category from URL: "Showing: Beds" with clear */}
            {categoryFilter && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600">Showing: {formatCategoryLabel(categoryFilter)}</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Category pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                  categoryFilter === null
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Price range slider (only if we have prices) */}
            {priceBounds[0] < priceBounds[1] && (
              <div className="mt-4 max-w-xs">
                <label className="text-xs font-medium text-gray-600">Price range</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min={priceBounds[0]}
                    max={priceBounds[1]}
                    value={priceMin}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setPriceRange([v, Math.max(v, priceMax)]);
                    }}
                    className="flex-1 h-2 rounded-full accent-gray-900"
                  />
                  <input
                    type="range"
                    min={priceBounds[0]}
                    max={priceBounds[1]}
                    value={priceMax}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setPriceRange([Math.min(v, priceMin), v]);
                    }}
                    className="flex-1 h-2 rounded-full accent-gray-900"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 gap-2">
                  <span>Min: ₦{priceMin.toLocaleString()}</span>
                  <span>Max: ₦{priceMax.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setPriceRange(priceBounds)}
                    className="ml-2 text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
              {filteredProducts.map((product, index) => {
                const aspectClass = index % 3 === 0 ? 'aspect-[4/5]' : index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square';
                const isAboveFold = index < 6;
                return (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/shops/products/${product.slug}`)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer"
                  >
                    <div className={`${aspectClass} w-full bg-gray-100 relative overflow-hidden rounded-2xl`}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          width={400}
                          height={index % 3 === 0 ? 500 : index % 3 === 1 ? 533 : 400}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={isAboveFold ? 'eager' : 'lazy'}
                          fetchPriority={isAboveFold ? 'high' : undefined}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">No image</div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                          Custom order
                        </Badge>
                      </div>
                    </div>
                    <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                      <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatPrice(product.price_min, product.price_max)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <p className="text-gray-600 py-8 text-center">
                {debouncedSearch ? `No results for "${debouncedSearch}". Try a different search or clear filters.` : 'No products match the current filters.'}
              </p>
            )}

            {/* Load more: only when backend has more and we're not in a loading state */}
            {hasMore && filteredProducts.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setLoadingMore(true);
                    await onLoadMore();
                    setLoadingMore(false);
                  }}
                  disabled={loadingMore}
                  className="rounded-full"
                >
                  {loadingMore ? 'Loading…' : `Load more (${products.length} of ${totalCount})`}
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => window.open(whatsapp, '_blank')}
          className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full px-6 py-5 text-sm font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.5)]"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Discuss on WhatsApp
        </Button>
      </div>

      {/* Mobile: hide when search is focused so bar doesn't float above keyboard; use fixed positioning that stays at viewport bottom. */}
      {!isSearchFocused && (
        <div className="md:hidden fixed left-0 right-0 bottom-0 w-full z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,0)]">
            <Button
              onClick={() => window.open(whatsapp, '_blank')}
              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-5 shadow-md"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Discuss on WhatsApp
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

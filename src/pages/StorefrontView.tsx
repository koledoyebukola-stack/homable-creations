import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, MessageCircle, Store, Search, X } from 'lucide-react';
import { getStorefrontBySlug, getStorefrontProductsPage } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';
import { trackNgEvent, NG_EVENTS } from '@/lib/analytics-ng';

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
  const { slug, category: categoryParam } = useParams<{ slug: string; category?: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StorefrontData | null | undefined>(undefined);

  const categoryFilter = categoryParam ? decodeURIComponent(categoryParam) : null;

  useEffect(() => {
    if (!slug) return;
    getStorefrontBySlug(slug, categoryFilter).then(result => {
      if (result) setData(result);
      else setData(null);
    });
  }, [slug, categoryFilter]);

  // Must be called unconditionally (before any early return) to avoid React "rendered more hooks" error #310.
  const loadMore = useCallback(async () => {
    if (!data || data === null || !('storefront' in data)) return;
    const { storefront, products } = data;
    const next = await getStorefrontProductsPage(storefront.id, products.length, 24, categoryFilter);
    if (next.length === 0) return;
    setData(prev => (prev && 'products' in prev ? {
      ...prev,
      products: [...prev.products, ...next],
      hasMore: prev.products.length + next.length < prev.totalCount,
    } : prev));
  }, [data, categoryFilter]);

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-gray-600">Loading…</p>
        </main>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
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
      </div>
    );
  }

  const { storefront, products, totalCount, hasMore, categories } = data;

  if (storefront.status === 'paused') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
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
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const priceRangeInitialized = useRef(false);
  const prevCategoryFilterRef = useRef<string | null>(null);
  const prevProductsRef = useRef<VendorProduct[]>([]);
  const categoryChangePendingRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  const isDecorStore = storefront.vendor_type === 'decor_store';
  const rooms = useMemo(() => {
    if (!isDecorStore) return [] as string[];
    const roomValues = products.map(p => p.room).filter((r): r is string => Boolean(r));
    return [...new Set(roomValues)].sort();
  }, [isDecorStore, products]);

  // Categories come from API (all storefront categories), not from loaded products, so pills show on initial load.

  // Sync category filter from URL on mount and when category param changes (shareable links).
  useEffect(() => {
    const decoded = categoryParam ? decodeURIComponent(categoryParam) : null;
    setCategoryFilterState(decoded);
  }, [categoryParam]);

  // Restore scroll position when returning from product detail page
  // Only restore if we have saved scroll AND products have loaded (to ensure DOM is ready)
  useEffect(() => {
    if (scrollRestoredRef.current || products.length === 0) return;
    
    const scrollKey = `storefront_scroll_${storefront.slug}_${categoryFilter || 'all'}`;
    const savedScroll = sessionStorage.getItem(scrollKey);
    
    if (savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      // Use setTimeout to ensure DOM is fully rendered and layout is complete
      setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        scrollRestoredRef.current = true;
      }, 100);
    } else {
      scrollRestoredRef.current = true; // Mark as handled even if no saved position
    }
  }, [storefront.slug, categoryFilter, products.length]);

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
    prevCategoryFilterRef.current = null;
    prevProductsRef.current = [];
    categoryChangePendingRef.current = false;
    scrollRestoredRef.current = false; // Reset scroll restoration when storefront changes
  }, [storefront.id]);

  // Track when category changes (before products update)
  useEffect(() => {
    if (categoryFilter !== prevCategoryFilterRef.current) {
      const oldCategory = prevCategoryFilterRef.current;
      prevCategoryFilterRef.current = categoryFilter;
      categoryChangePendingRef.current = true; // Mark that we're waiting for products to update
      scrollRestoredRef.current = false; // Reset scroll restoration when category changes (new filter = start at top)
      
      console.log('[CATEGORY CHANGE]', {
        oldCategory,
        newCategory: categoryFilter,
        oldPriceBounds: priceBounds,
        currentPriceRange: priceRange,
        categoryChangePending: true,
      });
    }
  }, [categoryFilter, priceBounds, priceRange]);

  // When products update after a category change, reset price range to new bounds
  useEffect(() => {
    const productsChanged = products.length !== prevProductsRef.current.length || 
      (products.length > 0 && prevProductsRef.current.length > 0 && products[0]?.id !== prevProductsRef.current[0]?.id);
    const isLoadMore = products.length > prevProductsRef.current.length && 
      products.length > 0 && prevProductsRef.current.length > 0 && 
      products[0]?.id === prevProductsRef.current[0]?.id;
    
    console.log('[PRODUCTS UPDATE]', {
      productsCount: products.length,
      prevProductsCount: prevProductsRef.current.length,
      productsChanged,
      isLoadMore,
      categoryChangePending: categoryChangePendingRef.current,
      newPriceBounds: priceBounds,
      firstProductId: products[0]?.id,
      prevFirstProductId: prevProductsRef.current[0]?.id,
    });
    
    if (categoryChangePendingRef.current && productsChanged && !isLoadMore) {
      // Category changed and products were replaced (not appended via load more), reset price range
      console.log('[RESETTING PRICE RANGE]', {
        reason: 'Category changed and products replaced',
        newPriceBounds: priceBounds,
        settingPriceRangeTo: priceBounds,
      });
      setPriceRange(priceBounds);
      categoryChangePendingRef.current = false; // Clear the flag
    }
    
    prevProductsRef.current = products;
  }, [products, priceBounds]);

  // When priceBounds change (e.g. after load more), clamp range so it stays within bounds.
  // Only clamp if range is OUTSIDE bounds; don't clamp if it's already within (to avoid overriding user's slider).
  useEffect(() => {
    if (categoryChangePendingRef.current) {
      console.log('[CLAMP EFFECT] Skipping clamp - category change pending');
      return; // Don't clamp if we're about to reset due to category change
    }
    
    const [bMin, bMax] = priceBounds;
    setPriceRange(prev => {
      const [pMin, pMax] = prev;
      if (bMin === bMax) {
        console.log('[CLAMP EFFECT] Price bounds are equal, setting to', [bMin, bMax]);
        return [bMin, bMax];
      }
      // Only clamp if current range is outside the bounds
      if (pMin < bMin || pMax > bMax || pMin > bMax || pMax < bMin) {
        const newMin = Math.max(pMin, bMin);
        const newMax = Math.min(pMax, bMax);
        if (newMin > newMax) {
          console.log('[CLAMP EFFECT] Clamped range invalid, resetting to bounds', [bMin, bMax]);
          return [bMin, bMax];
        }
        console.log('[CLAMP EFFECT] Clamping range', {
          oldRange: [pMin, pMax],
          bounds: [bMin, bMax],
          newRange: [newMin, newMax],
        });
        return [newMin, newMax];
      }
      return prev; // Range is already within bounds, don't change it
    });
  }, [priceBounds]);

  useEffect(() => {
    const [min, max] = priceBounds;
    if (!priceRangeInitialized.current && (min !== 0 || max !== 0)) {
      priceRangeInitialized.current = true;
      setPriceRange(priceBounds);
    }
  }, [priceBounds, storefront.id]);

  const [priceMin, priceMax] = priceRange;

  // Category is applied server-side when a pill is selected; products here are already filtered by category.
  // For decor_store, room filter is applied client-side.
  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const filtered = products.filter(p => {
      if (roomFilter && p.room !== roomFilter) return false;
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
        const roomMatch = p.room?.toLowerCase().includes(q);
        if (!nameMatch && !categoryMatch && !roomMatch) return false;
      }
      return true;
    });
    return filtered;
  }, [products, priceMin, priceMax, debouncedSearch, priceBounds, categoryFilter, roomFilter]);

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
                {(storefront.location_display || storefront.location) && (
                  <p className="mt-1 text-sm md:text-base text-white/80">
                    {storefront.location_display || storefront.location}
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
                {storefront.offering_type === 'imported' ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1">
                    <span className="font-medium text-white text-xs">Imported</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    <span className="font-medium text-white text-xs">Custom orders available</span>
                  </div>
                )}
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

            {/* Search + category filters: sticky on mobile only, normal flow on desktop */}
            {/* top-14 (56px) accounts for sticky header height on mobile; full-width background on mobile only */}
            <div className="mt-4 sticky md:static top-14 md:top-auto z-20 md:z-auto bg-gray-50/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-b md:border-none border-gray-100 md:border-transparent -mx-4 md:mx-0 px-4 md:px-0 shadow-sm md:shadow-none">
              <div className="pt-1 pb-3 md:pt-0">
                {/* Search: above filters, full width on mobile, max-width on desktop. Debounced client-side. */}
                {/* type="text" + custom clear only = single clear button (type="search" adds native clear on desktop). */}
                <div className="w-full max-w-xl">
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
                      placeholder="What are you looking for?"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
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
                <div className="mt-3 flex flex-wrap gap-2">
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

                {/* Room pills (decor_store only): client-side filter by product.room */}
                {isDecorStore && rooms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-600 w-full">Room</span>
                    <button
                      type="button"
                      onClick={() => setRoomFilter(null)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                        roomFilter === null
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All rooms
                    </button>
                    {rooms.map(room => (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setRoomFilter(room)}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                          roomFilter === room
                            ? 'bg-gray-900 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preset price filters (above slider); only when we have a valid price range. */}
            {priceBounds[0] < priceBounds[1] && (
              <div className="mt-4">
                <span className="text-xs font-medium text-gray-600">Price</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: 'Under ₦100k', getRange: (b: [number, number]) => [b[0], Math.min(100000, b[1])] as const },
                    { label: '₦100k – ₦200k', getRange: (b: [number, number]) => [Math.max(100000, b[0]), Math.min(200000, b[1])] as const },
                    { label: '₦200k – ₦300k', getRange: (b: [number, number]) => [Math.max(200000, b[0]), Math.min(300000, b[1])] as const },
                    { label: '₦300k+', getRange: (b: [number, number]) => [Math.max(300000, b[0]), b[1]] as const },
                  ].map(({ label, getRange }) => {
                    const presetRange = getRange(priceBounds);
                    const isValid = presetRange[0] <= presetRange[1];
                    const isActive = isValid && priceMin === presetRange[0] && priceMax === presetRange[1];
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={!isValid}
                        onClick={() => isValid && setPriceRange([presetRange[0], presetRange[1]])}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                          !isValid ? 'cursor-not-allowed opacity-50 bg-gray-100 border border-gray-200 text-gray-400' : isActive ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                const isAboveFold = index < 6;
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      // Save scroll position before navigating to product detail
                      const scrollKey = `storefront_scroll_${storefront.slug}_${categoryFilter || 'all'}`;
                      sessionStorage.setItem(scrollKey, window.scrollY.toString());
                      navigate(`/shops/products/${product.slug}`);
                    }}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          loading={isAboveFold ? 'eager' : 'lazy'}
                          fetchPriority={isAboveFold ? 'high' : undefined}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">No image</div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                          {storefront.offering_type === 'imported' ? 'Imported' : 'Custom order'}
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
          onClick={() => {
            trackNgEvent(NG_EVENTS.WHATSAPP_REDIRECT, {
              storefront_id: storefront.id,
              source: 'storefront',
            });
            window.open(whatsapp, '_blank');
          }}
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
              onClick={() => {
                trackNgEvent(NG_EVENTS.WHATSAPP_REDIRECT, {
                  storefront_id: storefront.id,
                  source: 'storefront',
                });
                window.open(whatsapp, '_blank');
              }}
              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-semibold py-5 shadow-md"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Discuss on WhatsApp
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

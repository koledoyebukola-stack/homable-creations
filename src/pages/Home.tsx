import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useCountry } from '@/context/CountryContext';
import { getExploreScenes, getActiveStorefrontsByLocation } from '@/lib/api';
import type { ExploreScene, Storefront, VendorProduct } from '@/lib/types';
import ExploreSceneCard from '@/components/ExploreSceneCard';
import {
  EXPLORE_CATEGORY_PILLS,
  EXPLORE_PRICE_PILLS,
  matchesExplorePriceFilter,
  type ExploreRoomTypeFilter,
  type ExplorePriceFilter,
} from '@/lib/explore-filters';

const HOME_EXPLORE_CATEGORY_PILLS = [
  ...EXPLORE_CATEGORY_PILLS,
  { value: 'tv_wall' as ExploreRoomTypeFilter, label: 'TV Wall Styling' },
];
import { trackNgEvent, NG_EVENTS } from '@/lib/analytics-ng';

// Carousel examples showing inspiration photo → checklist
const CAROUSEL_EXAMPLES = [
  {
    id: 1,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/f5c2c97d-14f6-4c30-8611-9c97d727c2c6.png',
    imageAlt: 'Modern living room with neutral tones',
    checklist: [
      'Sofa',
      'Area rug',
      'Coffee table',
      'Floor lamp',
      'Throw pillows',
      'Wall art'
    ]
  },
  {
    id: 2,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/d8585f08-b5c0-406b-adf3-12ca5b4e4e4f.png',
    imageAlt: 'Cozy bedroom with warm lighting',
    checklist: [
      'Bed frame',
      'Nightstands',
      'Table lamps',
      'Bedding set',
      'Curtains',
      'Decorative mirror'
    ]
  },
  {
    id: 3,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-27/083c7d04-5b8c-4617-80f4-13ba1ddbe422.png',
    imageAlt: 'Elegant dining space',
    checklist: [
      'Dining table',
      'Dining chairs',
      'Pendant light',
      'Sideboard',
      'Table runner',
      'Centerpiece'
    ]
  }
];

// Explore section content (reused from former tab)
const EXPLORE_STEPS = [
  'Browse curated room inspirations',
  'Explore styles, moods, and room types',
  'Choose a look to execute'
];
const EXPLORE_IMAGES = [
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/4a353320-f266-498a-b105-8ffe1b423b27.png', alt: 'Modern minimalist living room' },
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/d105eabc-9e94-443c-b1d2-1da1d1ff381e.png', alt: 'Scandinavian bedroom' },
  { url: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/5e43a37b-7c8b-406a-9456-3f811e52767c.png', alt: 'Industrial dining space' }
];

// Hero carousel: 6 room inspo images (mobile + desktop)
const HERO_CAROUSEL_IMAGES = [
  ...CAROUSEL_EXAMPLES.map(({ image, imageAlt }) => ({ url: image, alt: imageAlt })),
  ...EXPLORE_IMAGES
];

const HERO_DESCRIPTION_NG =
  'Turn decor inspiration into a clear plan. Explore curated styles to get an instant shopping list, and invite friends and family to help finish the room.';
const HERO_DESCRIPTION_CA =
  "Explore our curated room inspirations or upload any room photo and we'll identify every piece in it. Each item is matched to real products from trusted Canadian retailers so you see exactly what the room costs and can shop it all in one place.";
const HERO_DESCRIPTION_DEFAULT =
  'Turn decor inspiration into a clear plan. Upload a room photo to get an instant shopping list, explore curated styles, visualize your space in 3D, and invite friends and family to help finish the room.';

// TEMP: Hidden for Nigerian launch - re-enable once supply is sufficient (50+ vendors). Set to true to show "Upload Your Inspiration" for Nigeria.
const SHOW_UPLOAD_INSPIRATION_FOR_NIGERIA = false;

function formatCad(value: number): string {
  return `C$${Number(value).toLocaleString('en-CA')}`;
}

function formatViewCount(count: number): string {
  if (count < 1000) return count === 1 ? '1 view' : `${count} views`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k views`;
  return `${Math.round(count / 1000)}k views`;
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

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `₦${min.toLocaleString('en-NG')} – ₦${max.toLocaleString('en-NG')}`;
  if (min != null) return `From ₦${min.toLocaleString('en-NG')}`;
  if (max != null) return `From ₦${max.toLocaleString('en-NG')}`;
  return 'Price on request';
}

const BROWSE_PRODUCTS_CATEGORIES = ['planters', 'artwork', 'mirror', 'seating', 'table', 'bed'] as const;
type BrowseProductsCategoryValue = 'all' | (typeof BROWSE_PRODUCTS_CATEGORIES)[number];
const BROWSE_PRODUCTS_LIMIT = 8;

export default function Home() {
  const navigate = useNavigate();
  const [carouselSlide, setCarouselSlide] = useState(0);
  const [exploreSlide, setExploreSlide] = useState(0);
  const { country } = useCountry();
  const [exploreScenes, setExploreScenes] = useState<ExploreScene[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [exploreCategoryFilter, setExploreCategoryFilter] = useState<ExploreRoomTypeFilter>('all');
  const [explorePriceFilter, setExplorePriceFilter] = useState<ExplorePriceFilter>('all');
  const [exploreDisplayCount, setExploreDisplayCount] = useState(6);
  const exploreSectionRef = useRef<HTMLElement | null>(null);
  const browseSectionRef = useRef<HTMLElement | null>(null);

  const [browseStorefronts, setBrowseStorefronts] = useState<Storefront[]>([]);
  const [browseProducts, setBrowseProducts] = useState<VendorProduct[]>([]);
  const [loadingBrowseProducts, setLoadingBrowseProducts] = useState(false);
  const [browseProductsCategory, setBrowseProductsCategory] = useState<BrowseProductsCategoryValue>('planters');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');

  // Restore scroll position when returning from Explore scene
  useEffect(() => {
    const saved = sessionStorage.getItem('home_explore_scroll');
    if (saved !== null) {
      const y = parseInt(saved, 10);
      if (!isNaN(y)) window.scrollTo(0, y);
      sessionStorage.removeItem('home_explore_scroll');
    }
  }, []);

  useEffect(() => {
    // Nigeria: load NG Explore scenes
    if (country === 'NG') {
      setLoadingExplore(true);
      getExploreScenes('NG')
        .then(setExploreScenes)
        .finally(() => setLoadingExplore(false));
      return;
    }

    // Canada: load CA Explore scenes (curated external retailer rooms)
    if (country === 'CA') {
      setLoadingExplore(true);
      getExploreScenes('CA')
        .then(setExploreScenes)
        .finally(() => setLoadingExplore(false));
      return;
    }

    // Other markets: no Explore scenes yet
    setExploreScenes([]);
  }, [country]);

  useEffect(() => {
    if (country !== 'NG') {
      setBrowseStorefronts([]);
      setBrowseProducts([]);
      return;
    }
    setLoadingBrowseProducts(true);
    getActiveStorefrontsByLocation('NG')
      .then(({ storefronts, products }) => {
        setBrowseStorefronts(storefronts);
        const inScope = products.filter((p) => p.category && BROWSE_PRODUCTS_CATEGORIES.includes(p.category as (typeof BROWSE_PRODUCTS_CATEGORIES)[number]));
        setBrowseProducts(inScope);
      })
      .finally(() => setLoadingBrowseProducts(false));
  }, [country]);

  const browseDisplayProducts = useMemo(() => {
    let list = browseProducts;
    if (browseProductsCategory !== 'all') {
      list = list.filter((p) => p.category === browseProductsCategory);
    }
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, BROWSE_PRODUCTS_LIMIT);
  }, [browseProducts, browseProductsCategory]);

  // Nigerian journey: track homepage landing (NG only)
  useEffect(() => {
    if (country === 'NG') {
      trackNgEvent(NG_EVENTS.HOMEPAGE_LANDING, {
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      });
    }
  }, [country]);

  // Nigerian journey: track when Explore curated rooms section is visible on homepage
  useEffect(() => {
    if (country !== 'NG') return;
    const el = exploreSectionRef.current;
    if (!el) return;
    let fired = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (fired) return;
        if (entries[0]?.isIntersecting) {
          fired = true;
          trackNgEvent(NG_EVENTS.EXPLORE_CURATED_ROOMS_VIEW, { location: 'homepage' });
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [country, loadingExplore]);

  // Floating scroll navigation button on mobile (up/down based on scroll position)
  useEffect(() => {
    if (country !== 'NG') return;
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const maxScroll = doc.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) {
        setShowScrollButton(false);
        return;
      }

      setShowScrollButton(true);

      const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollDirection(ratio < 0.5 ? 'down' : 'up');
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [country]);

  const nextCarousel = () => {
    setCarouselSlide((prev) => (prev + 1) % CAROUSEL_EXAMPLES.length);
  };
  const prevCarousel = () => {
    setCarouselSlide((prev) => (prev - 1 + CAROUSEL_EXAMPLES.length) % CAROUSEL_EXAMPLES.length);
  };
  const nextExplore = () => {
    setExploreSlide((prev) => (prev + 1) % EXPLORE_IMAGES.length);
  };
  const prevExplore = () => {
    setExploreSlide((prev) => (prev - 1 + EXPLORE_IMAGES.length) % EXPLORE_IMAGES.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      {/* Hero Section - 3-tier action hierarchy; two-column on desktop with carousel */}
      <section className="bg-[#f9f9f9] pt-10 pb-0 px-5 md:pt-14 md:pb-12 md:px-6">
        <div className="max-w-[560px] md:max-w-6xl mx-auto md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-center min-h-0">
          {/* Left: heading, subtitle, CTAs — vertically centered with carousel on desktop, text left-aligned */}
          <div className="md:max-w-[480px] md:flex md:flex-col md:justify-center">
            <h1 className={`font-bold text-[#111111] leading-tight text-center md:text-left mb-3 ${country === 'NG' ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-4xl md:text-5xl lg:text-6xl'}`}>
              {country === 'NG' ? 'From inspiration to execution. Built for Nigeria.' : 'From inspiration to execution'}
            </h1>
            <p className="text-lg md:text-xl text-[#555555] text-center md:text-left mb-10">
              {country === 'NG'
                ? HERO_DESCRIPTION_NG
                : country === 'CA'
                ? HERO_DESCRIPTION_CA
                : HERO_DESCRIPTION_DEFAULT}
            </p>

            {/* CTAs: Nigeria = Shop Curated Rooms + Design My Space (Beta); Canada = Shop Curated Rooms primary; Other = Upload primary, Explore secondary */}
            <div className="flex flex-col md:flex-row md:gap-3 gap-4">
              {country === 'NG' ? (
                <>
                  <button
                    type="button"
                    onClick={() => exploreSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full md:flex-1 h-[56px] md:h-[60px] flex items-center justify-center rounded-xl bg-[#000000] text-white text-base md:text-[18px] font-semibold hover:bg-[#1a1a1a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-200"
                  >
                    Shop Curated Rooms
                  </button>
                  <button
                    type="button"
                    onClick={() => browseSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full md:flex-1 h-12 md:h-[60px] flex items-center justify-center rounded-xl bg-white text-black text-[15px] md:text-base font-medium border-[1.5px] border-[#e0e0e0] hover:border-black hover:bg-[#fafafa] transition-colors"
                  >
                    Browse Local Products
                  </button>
                  {/* TEMP: Hidden for Nigerian launch - re-enable once supply is sufficient (50+ vendors) */}
                  {SHOW_UPLOAD_INSPIRATION_FOR_NIGERIA && (
                    <button
                      type="button"
                      onClick={() => navigate('/upload?mode=inspiration')}
                      className="w-full md:flex-1 h-12 md:h-[60px] flex items-center justify-center rounded-xl bg-white text-black text-[15px] md:text-base font-medium border-[1.5px] border-[#e0e0e0] hover:border-black hover:bg-[#fafafa] transition-colors"
                    >
                      Upload Your Inspiration
                    </button>
                  )}
                </>
              ) : country === 'CA' ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/upload?mode=explore')}
                    className="w-full md:flex-1 h-[56px] md:h-[60px] flex items-center justify-center rounded-xl bg-[#000000] text-white text-base md:text-[18px] font-semibold hover:bg-[#1a1a1a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-200"
                  >
                    Shop Curated Rooms
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/upload?mode=inspiration')}
                    className="w-full md:flex-1 h-12 md:h-[60px] flex items-center justify-center rounded-xl bg-white text-black text-[15px] md:text-base font-medium border-[1.5px] border-[#e0e0e0] hover:border-black hover:bg-[#fafafa] transition-colors"
                  >
                    Upload Your Inspiration
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/upload?mode=inspiration')}
                    className="w-full md:flex-1 h-[56px] md:h-[60px] flex items-center justify-center rounded-xl bg-[#000000] text-white text-base md:text-[18px] font-semibold hover:bg-[#1a1a1a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-200"
                  >
                    Upload Your Inspiration
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/upload?mode=explore')}
                    className="w-full md:flex-1 h-12 md:h-[60px] flex items-center justify-center rounded-xl bg-white text-black text-[15px] md:text-base font-medium border-[1.5px] border-[#e0e0e0] hover:border-black hover:bg-[#fafafa] transition-colors"
                  >
                    Explore Styles & Ideas
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right: auto-scrolling carousel — greater prominence on desktop; caption anchored to carousel */}
          <div className="mt-12 mb-10 md:mt-0 md:mb-0 overflow-hidden md:min-h-0 flex flex-col justify-center">
            <style>{`
              @keyframes hero-carousel-scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
            <div className="md:rounded-2xl md:bg-white/60 md:shadow-xl md:p-4 md:ring-1 md:ring-black/5">
              <div
                className="flex gap-3 w-max md:gap-6"
                style={{ animation: 'hero-carousel-scroll 24s linear infinite' }}
              >
                {[...HERO_CAROUSEL_IMAGES, ...HERO_CAROUSEL_IMAGES].map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.alt}
                    className="w-[140px] md:w-[300px] flex-shrink-0 aspect-[4/3] rounded-xl object-cover"
                  />
                ))}
              </div>
              <p className="text-center md:text-left text-sm text-[#666666] mt-2 md:mt-2.5 md:pl-0.5">
                Get your space redesigned in <span className="font-semibold text-amber-600">48 hours</span> ·{' '}
                <a
                  href="/upload?mode=inspiration"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/upload?mode=inspiration');
                  }}
                  className="font-medium text-[#111111] hover:underline underline-offset-2"
                >
                  Learn More
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Preview Section (Nigeria only) - before How It Works */}
      {country === 'NG' && (
        <section
          id="explore-preview"
          ref={exploreSectionRef}
          className="bg-gradient-to-br from-gray-50 to-stone-50 pt-10 pb-16 md:pt-12 md:pb-12 px-4 md:px-6"
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-2">
              Shop Curated Rooms
            </h2>
            <p className="text-center text-[#555555] text-lg mb-6 md:mb-8 max-w-2xl mx-auto">
              <span className="font-semibold text-teal-800 underline decoration-2 underline-offset-2 decoration-teal-300/90">Recreate real Nigerian rooms</span>
              {' '}with a clear budget and locally sourced pieces
            </p>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2 pb-2 md:justify-center mb-4">
              {HOME_EXPLORE_CATEGORY_PILLS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setExploreCategoryFilter(value);
                    setExploreDisplayCount(6);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    exploreCategoryFilter === value
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Price filters */}
            <div className="mb-8">
              <p className="text-xs font-medium text-[#666666] mb-2">Price</p>
              <div className="flex gap-2 overflow-x-auto pb-2 md:overflow-visible md:flex-wrap scroll-pills-hide-scrollbar">
                {EXPLORE_PRICE_PILLS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setExplorePriceFilter(value);
                    setExploreDisplayCount(6);
                  }}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      explorePriceFilter === value
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loadingExplore ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[4/3] rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {(() => {
                  const filtered =
                    exploreScenes
                      .filter((s) =>
                        exploreCategoryFilter === 'tv_wall'
                          ? s.room_type === 'tv_wall'
                          : s.room_type !== 'tv_wall'
                      ) // Keep default list non-TV-wall; allow TV-wall when filter selected
                      .filter((s) => {
                        const matchCategory =
                          exploreCategoryFilter === 'all' || s.room_type === exploreCategoryFilter;
                        const catalogBudget = Number(s.catalog_budget_ngn) || 0;
                        const matchPrice = matchesExplorePriceFilter(catalogBudget, explorePriceFilter);
                        return matchCategory && matchPrice;
                      });
                  const displayScenes = filtered.slice(0, exploreDisplayCount);
                  const hasMore = exploreDisplayCount < filtered.length;
                  const maxViewCount =
                    displayScenes.length > 0
                      ? Math.max(0, ...displayScenes.map((s) => s.view_count ?? 0))
                      : 0;
                  if (displayScenes.length > 0) {
                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                          {displayScenes.map((scene) => (
                            <ExploreSceneCard
                              key={scene.id}
                              scene={scene}
                              onSelect={(slug) => {
                                sessionStorage.setItem('home_explore_scroll', String(window.scrollY));
                                navigate(`/explore/${slug}`);
                              }}
                              viewCount={scene.view_count ?? 0}
                              isTrending={
                                (scene.view_count ?? 0) === maxViewCount && maxViewCount > 0
                              }
                              variant={scene.room_type === 'tv_wall' ? 'tv-wall' : 'default'}
                            />
                          ))}
                        </div>
                        {hasMore && (
                          <div className="text-center mt-10">
                            <Button
                              onClick={() =>
                                setExploreDisplayCount((prev) => Math.min(prev + 6, filtered.length))
                              }
                              className="rounded-xl bg-black text-white hover:bg-gray-900"
                            >
                              Load more
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        </section>
      )}

      {/* Browse Local Products (Nigeria only) */}
      {country === 'NG' && (
        <section
          ref={browseSectionRef}
          className="bg-gradient-to-br from-gray-50 to-stone-50 pt-10 pb-16 md:pt-12 md:pb-12 px-4 md:px-6"
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-2">
              Browse Local Products
            </h2>
            <p className="text-center text-[#555555] text-lg mb-6 max-w-2xl mx-auto">
              Shop handpicked pieces from trusted local vendors
            </p>

            <div className="flex gap-2 overflow-x-auto pb-2 md:overflow-visible md:flex-wrap md:justify-center scroll-pills-hide-scrollbar mb-6">
              {(['all', ...BROWSE_PRODUCTS_CATEGORIES] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBrowseProductsCategory(value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    browseProductsCategory === value
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                  }`}
                >
                  {value === 'all' ? 'All' : value === 'planters' ? 'Planters' : value === 'artwork' ? 'Artwork' : value === 'mirror' ? 'Mirrors' : value === 'seating' ? 'Seating' : value === 'table' ? 'Tables' : 'Beds'}
                </button>
              ))}
            </div>

            {loadingBrowseProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : browseDisplayProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {browseDisplayProducts.map((product) => {
                  const storefront = browseStorefronts.find((sf) => sf.id === product.storefront_id);
                  return (
                    <article
                      key={product.id}
                      onClick={() => navigate(`/shops/products/${product.slug}`)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                        <div className="absolute top-2 left-2 max-w-[90%]">
                          <span className="inline-flex items-center rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-1 shadow-sm">
                            <span
                              className="relative h-6 w-6 rounded-full border border-white/70 overflow-hidden flex items-center justify-center text-[10px] font-semibold mr-1"
                              style={{ backgroundColor: getVendorColor(storefront?.name ?? 'Vendor') }}
                            >
                              <span className="z-0">
                                {getVendorInitials(storefront?.name ?? 'Vendor')}
                              </span>
                              {storefront?.logo_url && (
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
                              {storefront?.name ?? 'Vendor'}
                            </span>
                          </span>
                        </div>
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
            ) : (
              <p className="text-center text-[#666666] text-sm py-8">
                No products in these categories right now. Browse all vendors for more.
              </p>
            )}

            <div className="text-center mt-8">
              <Button
                onClick={() => navigate('/shops')}
                className="bg-[#111111] hover:bg-[#333] text-white rounded-xl font-medium px-8"
              >
                Browse All Products
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Explore Preview Section (Canada) - curated retailer rooms */}
      {country === 'CA' && (
        <section
          id="explore-preview-ca"
          className="bg-gradient-to-br from-gray-50 to-stone-50 pt-10 pb-16 md:pt-12 md:pb-12 px-4 md:px-6"
        >
            <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-2">
              Shop Curated Rooms
            </h2>
            <p className="text-center text-[#555555] text-lg mb-6 md:mb-8 max-w-2xl mx-auto">
              Hand-picked inspiration rooms matched to real products from trusted Canadian retailers.
            </p>

            {/* Category filters (reuse Explore filters; same values, CAD context) */}
            <div className="flex flex-wrap gap-2 pb-2 md:justify-center mb-4">
              {HOME_EXPLORE_CATEGORY_PILLS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setExploreCategoryFilter(value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    exploreCategoryFilter === value
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Price filters in CAD (reuse price filter logic; labels adapted for CAD) */}
            <div className="mb-8">
              <p className="text-xs font-medium text-[#666666] mb-2">Estimated budget (CAD)</p>
              <div className="flex gap-2 overflow-x-auto pb-2 md:overflow-visible md:flex-wrap scroll-pills-hide-scrollbar">
                {EXPLORE_PRICE_PILLS.map(({ value }) => {
                  let label = '';
                  switch (value) {
                    case 'under_300':
                      label = 'Under C$3,000';
                      break;
                    case '300_500':
                      label = 'C$3,000 – C$5,000';
                      break;
                    case '500_1000':
                      label = 'C$5,000 – C$10,000';
                      break;
                    case '1000_plus':
                      label = 'C$10,000+';
                      break;
                    default:
                      label = 'All';
                  }
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setExplorePriceFilter(value)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        explorePriceFilter === value
                          ? 'bg-[#111111] text-white'
                          : 'bg-white text-[#555555] hover:bg-gray-100 border border-[#e0e0e0]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingExplore ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[4/3] rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : exploreScenes.length === 0 ? (
              <p className="text-center text-[#777777] text-sm">
                Canadian curated rooms are coming soon. In the meantime, upload your own photo to get matches.
              </p>
            ) : (
              (() => {
                const filtered = exploreScenes.filter((scene) => {
                  const matchCategory =
                    exploreCategoryFilter === 'all' || scene.room_type === exploreCategoryFilter;
                  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;
                  const matchPrice = matchesExplorePriceFilter(catalogBudget, explorePriceFilter);
                  return matchCategory && matchPrice;
                });
                const maxViewCount =
                  filtered.length > 0
                    ? Math.max(0, ...filtered.map((s) => s.view_count ?? 0))
                    : 0;

                if (filtered.length === 0) {
                  return null;
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filtered.map((scene) => {
                      const catalogBudget = Number(scene.catalog_budget_ngn) || 0;
                      const minimumItemPrice = Number(scene.minimum_item_price_ngn) || 0;
                      const viewCount = scene.view_count ?? 0;
                      const viewText = formatViewCount(viewCount);
                      const isTrending = viewCount === maxViewCount && maxViewCount > 0;
                      const viewLabel = isTrending ? `🔥 Trending: ${viewText}` : viewText;

                      return (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => navigate(`/explore/${scene.slug}`)}
                          className="group text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-[#e5e5e5] flex flex-col"
                        >
                          <div className="aspect-[4/3] w-full bg-gray-100 relative overflow-hidden">
                            <img
                              src={
                                scene.hero_image_url ||
                                'https://placehold.co/800x600/f5f5f5/999?text=Room'
                              }
                              alt={scene.title}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="px-3 pt-3 pb-4">
                            <h3 className="text-base md:text-lg font-semibold text-[#111111] leading-snug line-clamp-2 mb-1">
                              {scene.title}
                            </h3>
                            {minimumItemPrice > 0 && (
                              <p className="text-sm font-semibold text-[#111111]">
                                Items from {formatCad(minimumItemPrice)}
                              </p>
                            )}
                            {catalogBudget > 0 && (
                              <p className="text-xs text-gray-500 mb-1">
                                Complete room from {formatCad(catalogBudget)}
                              </p>
                            )}
                            {viewCount > 0 && (
                              <p className="text-xs text-gray-500">{viewLabel}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </section>
      )}

      {/* How It Works Section - 40px gap from hero on mobile; 48px on desktop */}
      <section className="bg-gradient-to-br from-gray-50 to-stone-50 pt-0 pb-16 md:pt-0 md:pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-12 md:mb-16">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  {country === 'NG' ? 'Start with Inspiration' : 'Upload Your Photo'}
                </h3>
                <p className="text-[#555555]">
                  {country === 'NG'
                    ? 'Browse our curated Nigerian rooms and find a style you love.'
                    : "Share any inspiration photo you love, whether it's from Pinterest, Instagram, or your own space."}
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  {country === 'NG' ? 'Find Everything Locally' : 'AI Identifies the Decor'}
                </h3>
                <p className="text-[#555555]">
                  {country === 'NG'
                    ? 'Homable shows you each item with verified Nigerian vendors, real prices in Naira, and direct WhatsApp contact.'
                    : 'Homable analyzes the photo and gives you a clear list of every decor item it finds, from furniture to textiles to seasonal pieces.'}
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold text-[#111111]">
                  {country === 'NG'
                    ? 'Shop and Track Progress'
                    : country === 'CA'
                    ? 'Shop Real Products'
                    : 'Shop and Track Your List'}
                </h3>
                <p className="text-[#555555]">
                  {country === 'NG'
                    ? 'Create your shopping list, monitor your budget, and invite others to help you complete the space.'
                    : country === 'CA'
                    ? 'We match every detected item to real products from trusted retailers with live prices and direct buy links, so you can shop your whole room without hunting across sites.'
                    : 'Use the item names to search for products online and save them as a checklist so you can plan, shop, and decorate at your own pace.'}
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button
                onClick={() => navigate(country === 'NG' ? '/upload?mode=explore' : '/upload?mode=inspiration')}
                size="lg"
                className="bg-white hover:bg-[#fafafa] text-black border-[1.5px] border-[#e0e0e0] hover:border-black px-8 rounded-xl font-medium"
              >
                Try It Now - It's Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Old Explore Styles & Ideas Section — hidden for Nigeria (they see Explore Curated Rooms above) */}
      {country !== 'NG' && (
        <section className="bg-white py-16 md:py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-[#111111] mb-12 md:mb-16">
                Explore Styles & Ideas
              </h2>
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="bg-[#f9f9f9] rounded-2xl p-8 md:p-10">
                  <div className="space-y-6 mb-8">
                    {EXPLORE_STEPS.map((step, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#111111] text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <p className="text-lg text-[#333333] pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => navigate('/upload?mode=explore')}
                    variant="outline"
                    className="w-full border-[1.5px] border-[#e0e0e0] hover:border-black rounded-xl font-medium"
                  >
                    Explore styles
                  </Button>
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={() => navigate('/upload?mode=find')}
                      className="text-sm font-normal text-[#666666] hover:text-black hover:underline cursor-pointer"
                    >
                      Or find one specific item →
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src={EXPLORE_IMAGES[exploreSlide].url}
                      alt={EXPLORE_IMAGES[exploreSlide].alt}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={prevExplore}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="w-6 h-6 text-[#111111]" />
                    </button>
                    <button
                      onClick={nextExplore}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                      aria-label="Next"
                    >
                      <ChevronRight className="w-6 h-6 text-[#111111]" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {EXPLORE_IMAGES.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setExploreSlide(i)}
                          className={`h-2 rounded-full transition-all ${
                            i === exploreSlide ? 'bg-white w-8' : 'bg-white/50 w-2'
                          }`}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* From Inspiration to Shopping List Section - tighter desktop spacing */}
      <section className="bg-white py-16 md:py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-[#111111]">
                From Inspiration to a Clear Shopping List
              </h2>
              <p className="text-base md:text-lg text-[#555555]">
                See how a single photo turns into an organized list you can save and come back to when you're ready.
              </p>
            </div>

            {/* Carousel */}
            <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 md:p-8 shadow-lg mb-8">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                {/* Left: Inspiration Photo */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={CAROUSEL_EXAMPLES[carouselSlide].image}
                    alt={CAROUSEL_EXAMPLES[carouselSlide].imageAlt}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Right: Checklist */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    {CAROUSEL_EXAMPLES[carouselSlide].checklist.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                        <span className="text-[#111111] font-medium">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-[#777777] mb-2">
                      Example list generated by Homable
                    </p>
                    <p className="text-sm text-[#555555] italic">
                      Saved as a checklist. Buy when you're ready.
                    </p>
                  </div>
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={prevCarousel}
                  className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5 text-[#111111]" />
                </button>

                <div className="flex gap-2">
                  {CAROUSEL_EXAMPLES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCarouselSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === carouselSlide
                          ? 'bg-[#111111] w-6'
                          : 'bg-gray-300'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextCarousel}
                  className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5 text-[#111111]" />
                </button>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 max-w-3xl mx-auto">
              <p className="text-base text-[#333333] italic text-center">
                "I like how I'm able to see everything I need to replicate the idea. The job is half done for me."
              </p>
            </div>

            {/* Footer Microcopy */}
            <div className="text-center">
              <p className="text-sm text-[#777777]">
                No pressure to buy. Your list stays saved for when you're ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - tighter desktop spacing */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-12">
        <div className="max-w-4xl mx-auto bg-black rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Create Your Dream Space?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands discovering affordable ways to bring their home decor dreams to life.
          </p>
          <Button
            onClick={() => navigate('/upload?mode=inspiration')}
            size="lg"
            className="bg-white hover:bg-gray-100 text-black px-8 py-6 text-lg rounded-full"
          >
            <Upload className="mr-2 h-5 w-5" />
            Start Creating Your Look
          </Button>
        </div>
      </section>
      {/* Floating scroll navigation button (mobile only, NG homepage) */}
      {country === 'NG' && showScrollButton && (
        <button
          type="button"
          className="fixed bottom-20 right-4 z-40 md:hidden rounded-full bg-black text-white p-3 shadow-lg border border-black/10 flex items-center justify-center"
          onClick={() => {
            if (scrollDirection === 'down') {
              window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth',
              });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          aria-label={scrollDirection === 'down' ? 'Scroll to bottom' : 'Scroll to top'}
        >
          {scrollDirection === 'down' ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
      )}

    </div>
  );
}
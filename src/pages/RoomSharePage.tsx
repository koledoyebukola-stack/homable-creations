import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveStorefrontsByLocation, getProductsByIds, getSimilarProducts } from '@/lib/api';
import { AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import type { Storefront, VendorProduct, VendorProductWithAttributes } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Loader2, Share2, Bookmark, X } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

const LOCATION = 'NG';

const PLACEHOLDER_AI_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Noir%20Botanical%20Living%20Room.png';

const ROOM_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'living_room', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'dining_room', label: 'Dining room' },
  { id: 'home_office', label: 'Home office' },
  { id: 'wall_styling', label: 'Wall styling' },
];

function formatNgn(value: number): string {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function formatPrice(product: VendorProduct): string {
  const { price_min, price_max } = product;
  if (price_min != null && price_max != null && price_min !== price_max) {
    return `${formatNgn(price_min)} – ${formatNgn(price_max)}`;
  }
  if (price_min != null) return `From ${formatNgn(price_min)}`;
  if (price_max != null) return `From ${formatNgn(price_max)}`;
  return 'Price on request';
}

function formatVendorPrice(p: VendorProduct): string {
  return formatPrice(p);
}

function formatVendorDimensions(p: VendorProduct): string | null {
  const { dimension_width, dimension_height, dimension_unit } = p;
  if (!dimension_width || !dimension_height || !dimension_unit) return null;
  return `${dimension_width} × ${dimension_height} ${dimension_unit}`;
}

function getVendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'V';
}

function getVendorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

type SimilarReadyRow = { product: VendorProductWithAttributes; storefront: Storefront | null };
type SimilarSlot =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; rows: SimilarReadyRow[] };

type AiGenRow = {
  id: string;
  user_id: string | null;
  mood: string;
  room_type: string | null;
  original_image_url: string;
  generated_image_url: string | null;
  product_ids: string[];
  share_slug: string | null;
};

export default function RoomSharePage() {
  const { shareSlug: shareSlugParam } = useParams<{ shareSlug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<AiGenRow | null>(null);
  const [productsInRender, setProductsInRender] = useState<VendorProduct[]>([]);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [similarByProductId, setSimilarByProductId] = useState<Record<string, SimilarSlot>>({});
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [afterImageModalOpen, setAfterImageModalOpen] = useState(false);
  const [ownerSheetEntered, setOwnerSheetEntered] = useState(false);

  const shareSlug = shareSlugParam?.trim() ?? '';

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data: { user } }) => setSessionUser(user));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingVendors(true);
    getActiveStorefrontsByLocation(LOCATION)
      .then((res) => {
        if (!cancelled) setStorefronts(res.storefronts);
      })
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!shareSlug) {
        setError('Invalid link');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_generation_by_share_slug', {
        p_slug: shareSlug,
      });
      if (cancelled) return;
      if (rpcError) {
        console.error(rpcError);
        setError('Could not load this room.');
        setLoading(false);
        return;
      }
      const raw = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!raw) {
        setError('This room could not be found.');
        setLoading(false);
        return;
      }
      const gen = raw as AiGenRow;
      setRow(gen);

      const ids = (gen.product_ids || []) as string[];
      if (ids.length === 0) {
        setProductsInRender([]);
        setLoading(false);
        return;
      }

      const resolved = await getProductsByIds(ids);
      const mapped: VendorProduct[] = [];
      resolved.forEach((r) => {
        if (r) mapped.push(r.product);
      });
      setProductsInRender(mapped);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  useEffect(() => {
    if (productsInRender.length === 0) {
      setSimilarByProductId({});
      return;
    }
    let cancelled = false;
    const renderIds = new Set(productsInRender.map((p) => p.id));
    const initial: Record<string, SimilarSlot> = {};
    productsInRender.forEach((p) => {
      initial[p.id] = { status: 'loading' };
    });
    setSimilarByProductId(initial);

    void (async () => {
      await Promise.all(
        productsInRender.map(async (product) => {
          try {
            const raw = await getSimilarProducts(product.id, { limit: 6 });
            const filtered = raw.filter((p) => !renderIds.has(p.id));
            if (cancelled) return;
            if (filtered.length === 0) {
              setSimilarByProductId((prev) => ({ ...prev, [product.id]: { status: 'empty' } }));
              return;
            }
            const sfIds = [...new Set(filtered.map((p) => p.storefront_id))];
            const { data: srows } = await supabase.from('storefronts').select('*').in('id', sfIds);
            if (cancelled) return;
            const storefrontList = (srows as Storefront[] | null) ?? [];
            const smap = new Map(storefrontList.map((s) => [s.id, s]));
            const rows: SimilarReadyRow[] = filtered.map((p) => ({
              product: p,
              storefront: smap.get(p.storefront_id) ?? null,
            }));
            setSimilarByProductId((prev) => ({ ...prev, [product.id]: { status: 'ready', rows } }));
          } catch {
            if (!cancelled) {
              setSimilarByProductId((prev) => ({ ...prev, [product.id]: { status: 'empty' } }));
            }
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [productsInRender]);

  const isOwner = Boolean(
    sessionUser?.id && row?.user_id && sessionUser.id === row.user_id,
  );

  useEffect(() => {
    if (!isOwner || !row) {
      setOwnerSheetEntered(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setOwnerSheetEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [isOwner, row?.id]);

  const carpenters = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'carpenter'),
    [storefronts],
  );
  const decorVendors = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'decor_store'),
    [storefronts],
  );

  const mood = row?.mood ? AI_ROOM_MOOD_BY_ID[row.mood as AiRoomMoodId] : null;
  const roomTypeLabel =
    row?.room_type != null
      ? ROOM_TYPE_OPTIONS.find((r) => r.id === row.room_type)?.label ?? row.room_type
      : 'room';

  const minimumSpend = useMemo(() => {
    const prices = productsInRender.map((p) => p.price_min).filter((v): v is number => typeof v === 'number');
    return prices.length ? prices.reduce((a, b) => a + b, 0) : null;
  }, [productsInRender]);

  const roomPublicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${encodeURIComponent(shareSlug)}`;

  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomPublicUrl).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link'),
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !row || !row.generated_image_url) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] px-4">
        <p className="text-gray-700 mb-4">{error ?? 'Room not found.'}</p>
        <Button variant="outline" className="rounded-full" onClick={() => navigate('/')}>
          Go home
        </Button>
      </div>
    );
  }

  const generatedImageUrl = row.generated_image_url;

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto max-w-4xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={copyRoomLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/history')}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                View in history
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 sm:sr-only">Shared AI room</p>
          )}
          {!isOwner && (
            <Button asChild className="rounded-full bg-[#111] text-white hover:bg-gray-800 w-fit sm:ml-auto">
              <Link to="/ai-room-generator">
                Like this? Create your own →
              </Link>
            </Button>
          )}
        </div>
      </div>

      <main
        className={cn(
          'flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-4xl space-y-10',
          isOwner && 'pb-28 md:pb-32',
        )}
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Your {roomTypeLabel} is ready</h2>
          {mood && <p className="mt-2 text-sm text-gray-500">{mood.label}</p>}

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Before</p>
              <div className="h-[140px] w-full rounded-xl overflow-hidden bg-gray-100">
                {row.original_image_url ? (
                  <img
                    src={row.original_image_url}
                    alt="Your room"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">After</p>
              <button
                type="button"
                onClick={() => setAfterImageModalOpen(true)}
                className="block h-[380px] w-full overflow-hidden rounded-xl bg-gray-100 text-left ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 md:h-[480px]"
              >
                <img
                  src={generatedImageUrl || PLACEHOLDER_AI_IMAGE}
                  alt="AI-generated room"
                  className="w-full h-full object-cover"
                />
              </button>
              <p className="mt-1.5 text-xs text-gray-500">Tap image to view full screen</p>
            </div>
          </div>

          {(productsInRender.length > 0 || (minimumSpend != null && minimumSpend > 0)) && (
            <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/80 p-4 md:p-5">
              <p className="text-sm font-medium text-gray-500">Minimum spend to achieve this look</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatNgn(minimumSpend ?? 0)}</p>
              <p className="mt-2 text-xs text-gray-500">
                Based on {productsInRender.length} vendor product{productsInRender.length !== 1 ? 's' : ''} featured in
                your render.
              </p>
            </div>
          )}

          {afterImageModalOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90"
              role="dialog"
              aria-modal="true"
              aria-label="Generated room full screen"
              style={{ minHeight: '100dvh' }}
            >
              <div
                role="button"
                tabIndex={0}
                className="relative w-full max-w-4xl cursor-pointer px-4"
                onClick={() => setAfterImageModalOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAfterImageModalOpen(false);
                  }
                }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  <img
                    src={generatedImageUrl || PLACEHOLDER_AI_IMAGE}
                    alt="AI-generated room full size"
                    className="pointer-events-none h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute z-10 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/60"
                    style={{
                      top: 'max(0.75rem, env(safe-area-inset-top))',
                      right: 'max(0.75rem, env(safe-area-inset-right))',
                    }}
                    aria-label="Close full screen image"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAfterImageModalOpen(false);
                    }}
                  >
                    <X className="h-7 w-7" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={copyRoomLink} className="rounded-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share my room
              </Button>
              <Button
                type="button"
                className="rounded-full border-0 bg-[#25D366] font-semibold text-white hover:bg-[#20BD5A]"
                onClick={() => navigate('/history')}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                View in history
              </Button>
            </div>
          )}
        </div>

        {productsInRender.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h3 className="text-base font-semibold text-gray-900">Products in your render</h3>
            <p className="mt-1 text-sm text-gray-600">
              These exact products were used to generate your room. Tap any item to contact the vendor directly.
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productsInRender.map((product) => {
                const storefront = storefronts.find((sf) => sf.id === product.storefront_id);
                return (
                  <a
                    key={product.id}
                    href={`${window.location.origin}/shops/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-gray-200 overflow-hidden text-left hover:border-gray-300 hover:shadow-lg transition-all flex flex-col"
                  >
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                      {storefront && (
                        <div className="absolute top-2 left-2 max-w-[90%]">
                          <span className="inline-flex items-center rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-1">
                            <span
                              className="relative h-6 w-6 rounded-full border border-white/70 overflow-hidden flex items-center justify-center text-[10px] font-semibold mr-1 flex-shrink-0"
                              style={{ backgroundColor: getVendorColor(storefront.name) }}
                            >
                              {storefront.logo_url ? (
                                <img src={storefront.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getVendorInitials(storefront.name)
                              )}
                            </span>
                            <span className="truncate max-w-[80px]">{storefront.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 pt-2.5 pb-3">
                      <h4 className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</h4>
                      <p className="text-xs text-gray-700 mt-1">{formatPrice(product)}</p>
                    </div>
                  </a>
                );
              })}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="rounded-full" onClick={() => navigate('/shops')}>
                See more products
              </Button>
            </div>
          </div>
        )}

        {productsInRender.length > 0 &&
          (() => {
            const hasAnySimilar = productsInRender.some((p) => {
              const s = similarByProductId[p.id];
              return s?.status === 'loading' || (s?.status === 'ready' && s.rows.length > 0);
            });
            if (!hasAnySimilar) return null;
            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <h2 className="text-xl font-semibold text-[#111111] mb-2">Explore Similar Options</h2>
                <p className="text-sm text-gray-600 mb-6">Based on products in your render</p>
                <div className="space-y-8">
                  {productsInRender.map((product) => {
                    const slot = similarByProductId[product.id];
                    if (slot?.status === 'loading') {
                      return (
                        <div key={product.id}>
                          <h3
                            className="text-sm font-medium mb-3"
                            style={{ color: 'hsl(var(--foreground))' }}
                          >
                            Similar to {product.name}
                          </h3>
                          <div className="flex gap-3 overflow-x-auto scroll-pills-hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                            {[0, 1, 2].map((sk) => (
                              <Skeleton
                                key={sk}
                                className="w-[150px] flex-shrink-0 aspect-[3/4] rounded-2xl"
                              />
                            ))}
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              className="text-sm font-medium border-0 bg-transparent p-0 cursor-pointer hover:underline text-[#111111]"
                              onClick={() => navigate('/shops')}
                            >
                              See all →
                            </button>
                          </div>
                        </div>
                      );
                    }
                    if (slot?.status === 'ready' && slot.rows.length > 0) {
                      return (
                        <div key={product.id}>
                          <h3
                            className="text-sm font-medium mb-3"
                            style={{ color: 'hsl(var(--foreground))' }}
                          >
                            Similar to {product.name}
                          </h3>
                          <div className="flex gap-3 overflow-x-auto scroll-pills-hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                            {slot.rows.map(({ product: sp, storefront: sf }) => {
                              const miniDim = formatVendorDimensions(sp);
                              return (
                                <div
                                  key={sp.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => navigate(`/shops/products/${sp.slug}`)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      navigate(`/shops/products/${sp.slug}`);
                                    }
                                  }}
                                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer border border-[#e5e5e5] flex flex-col flex-shrink-0 w-[150px]"
                                >
                                  <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                                    {sp.image_url ? (
                                      <img
                                        src={sp.image_url}
                                        alt={sp.name}
                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[#999] text-[11px]">
                                        No image
                                      </div>
                                    )}
                                    <div className="absolute top-1.5 left-1.5 z-[1]">
                                      <Badge className="bg-gray-900 text-white text-[9px] font-medium border-0 shadow-sm px-1.5 py-0.5 rounded-full max-w-[120px] truncate">
                                        Sold by{' '}
                                        {sf?.name ? sf.name.split(' ').slice(0, 2).join(' ') : 'vendor'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="px-2 pt-2 pb-2.5">
                                    <h4 className="text-[11px] font-semibold text-gray-900 leading-snug line-clamp-2">
                                      {sp.name}
                                    </h4>
                                    <p className="text-[10px] text-gray-600 mt-0.5">{formatVendorPrice(sp)}</p>
                                    {miniDim && <p className="text-[9px] text-gray-500 mt-0.5">{miniDim}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              className="text-sm font-medium border-0 bg-transparent p-0 cursor-pointer hover:underline text-[#111111]"
                              onClick={() => navigate('/shops')}
                            >
                              See all →
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })()}

        {carpenters.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h3 className="text-base font-semibold text-gray-900">Furniture makers</h3>
            <p className="mt-1 text-sm text-gray-600">Active carpenter storefronts.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {carpenters.map((sf) => (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => navigate(`/stores/${sf.slug}`)}
                  className="rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-3"
                >
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: getVendorColor(sf.name) }}
                  >
                    {sf.logo_url ? (
                      <img src={sf.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getVendorInitials(sf.name)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{sf.name}</p>
                    <p className="text-xs text-gray-500 truncate">{sf.location_display || sf.location || 'Nigeria'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {decorVendors.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h3 className="text-base font-semibold text-gray-900">Decor sellers</h3>
            <p className="mt-1 text-sm text-gray-600">Active decor storefronts.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decorVendors.map((sf) => (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => navigate(`/stores/${sf.slug}`)}
                  className="rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-3"
                >
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: getVendorColor(sf.name) }}
                  >
                    {sf.logo_url ? (
                      <img src={sf.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getVendorInitials(sf.name)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{sf.name}</p>
                    <p className="text-xs text-gray-500 truncate">{sf.location_display || sf.location || 'Nigeria'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingVendors && (
          <p className="text-center text-sm text-gray-500">Loading vendors and products…</p>
        )}
      </main>

      {isOwner && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 flex min-h-[72px] items-center bg-white border-t border-[#E5E7EB] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out',
            ownerSheetEntered ? 'translate-y-0' : 'translate-y-full',
          )}
          style={{
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
          role="region"
          aria-label="Generate another room"
        >
          <div className="container mx-auto w-full max-w-4xl px-4 md:px-6">
            <Button
              type="button"
              className="w-full rounded-full bg-[#111] py-3 font-semibold text-white h-12 hover:bg-gray-900"
              onClick={() => navigate('/ai-room-generator')}
            >
              Generate another room
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getActiveStorefrontsByLocation, getProductsByIds, getSimilarProducts } from '@/lib/api';
import { AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import type { Storefront, VendorProduct } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Loader2, ChevronRight } from 'lucide-react';

const LOCATION = 'NG';

const ROOM_TYPE_LABELS: Record<string, string> = {
  living_room: 'Living room',
  bedroom: 'Bedroom',
  dining_room: 'Dining room',
  home_office: 'Home office',
  wall_styling: 'Wall styling',
};

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

type AiGenRow = {
  id: string;
  mood: string;
  room_type: string | null;
  original_image_url: string;
  generated_image_url: string | null;
  product_ids: string[];
};

export default function RoomSharePage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<AiGenRow | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [similar, setSimilar] = useState<VendorProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    getActiveStorefrontsByLocation(LOCATION)
      .then((res) => {
        if (cancelled) return;
        setStorefronts(res.storefronts);
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!shareSlug?.trim()) {
        setError('Invalid link');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_generation_by_share_slug', {
        p_slug: shareSlug.trim(),
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
        setProducts([]);
        setLoading(false);
        return;
      }

      const resolved = await getProductsByIds(ids);
      const mapped: VendorProduct[] = [];
      resolved.forEach((r) => {
        if (r) mapped.push(r.product);
      });
      setProducts(mapped);

      if (mapped[0]?.id) {
        const sim = await getSimilarProducts(mapped[0].id, { limit: 8 });
        setSimilar(sim.map((s) => s as VendorProduct));
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  const carpenters = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'carpenter'),
    [storefronts],
  );
  const decorVendors = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'decor_store'),
    [storefronts],
  );

  const moodLabel = row?.mood ? AI_ROOM_MOOD_BY_ID[row.mood as AiRoomMoodId]?.label ?? row.mood : '';
  const roomLabel = row?.room_type ? ROOM_TYPE_LABELS[row.room_type] ?? row.room_type : '';

  const minimumSpend = useMemo(() => {
    const prices = products.map((p) => p.price_min).filter((v): v is number => typeof v === 'number');
    return prices.length ? prices.reduce((a, b) => a + b, 0) : null;
  }, [products]);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto max-w-4xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-600">Shared AI room</p>
          <Button asChild className="rounded-full bg-[#111] text-white hover:bg-gray-800 w-fit">
            <Link to="/ai-room-generator">
              Like this? Create your own
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-4xl space-y-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <h1 className="text-lg font-semibold text-gray-900">AI room</h1>
          <p className="mt-1 text-sm text-gray-600">
            {moodLabel}
            {roomLabel ? ` · ${roomLabel}` : ''}
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Before</p>
              <div className="h-[140px] w-full rounded-xl overflow-hidden bg-gray-100">
                <img src={row.original_image_url} alt="Original room" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">After</p>
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[4/3]">
                <img src={row.generated_image_url} alt="Generated room" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h2 className="text-base font-semibold text-gray-900">Products in this room</h2>
            <p className="mt-1 text-sm text-gray-600">Tap an item to view the product page.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const storefront = storefronts.find((sf) => sf.id === product.storefront_id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate(`/shops/products/${product.slug}`)}
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
                      <h3 className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</h3>
                      <p className="text-xs text-gray-700 mt-1">{formatPrice(product)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(products.length > 0 || (minimumSpend != null && minimumSpend > 0)) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <p className="text-sm font-medium text-gray-500">Minimum spend to achieve this look</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatNgn(minimumSpend ?? 0)}</p>
            <p className="mt-2 text-xs text-gray-500">
              Based on {products.length} vendor product{products.length !== 1 ? 's' : ''} featured in this render.
            </p>
          </div>
        )}

        {similar.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h2 className="text-base font-semibold text-gray-900">Similar items</h2>
            <p className="mt-1 text-sm text-gray-600">Curated picks in a similar style.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.slice(0, 8).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => navigate(`/shops/products/${product.slug}`)}
                  className="rounded-xl border border-gray-200 overflow-hidden text-left hover:border-gray-300 transition-all"
                >
                  <div className="aspect-square bg-gray-100">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{formatPrice(product)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {carpenters.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <h2 className="text-base font-semibold text-gray-900">Furniture makers</h2>
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
            <h2 className="text-base font-semibold text-gray-900">Decor sellers</h2>
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

        {loadingData && <p className="text-center text-sm text-gray-500">Loading vendors…</p>}
      </main>
    </div>
  );
}

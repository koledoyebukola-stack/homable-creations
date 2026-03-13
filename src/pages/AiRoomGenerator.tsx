import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getActiveStorefrontsByLocation } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';
import { AI_ROOM_MOODS, AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import { Upload, Sparkles, CreditCard, ImageIcon, Share2, Bookmark, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const LOCATION = 'NG';
const PRICE_KOBO = 200_000; // ₦2,000
const PLACEHOLDER_AI_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Noir%20Botanical%20Living%20Room.png';

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

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

/** Compute Essential / Recommended / Premium budget tiers from products in mood categories. */
function computeBudgetTiers(
  products: VendorProduct[],
  moodCategories: string[]
): { essential: number; recommended: number; premium: number } {
  const byCategory = new Map<string, number[]>();
  for (const p of products) {
    const cat = p.category;
    if (!cat || !moodCategories.includes(cat)) continue;
    const price = p.price_min ?? p.price_max ?? 0;
    if (price <= 0) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(price);
  }
  let essential = 0,
    recommended = 0,
    premium = 0;
  byCategory.forEach((prices) => {
    prices.sort((a, b) => a - b);
    const len = prices.length;
    if (len === 0) return;
    essential += prices[0] ?? 0;
    recommended += prices[Math.floor(len * 0.5)] ?? prices[0] ?? 0;
    premium += prices[len - 1] ?? 0;
  });
  return { essential, recommended, premium };
}

type Step = 1 | 2 | 3 | 4;

export default function AiRoomGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [roomPreviewUrl, setRoomPreviewUrl] = useState<string | null>(null);
  const [moodId, setMoodId] = useState<AiRoomMoodId | null>(null);
  const [paying, setPaying] = useState(false);
  const [mockGenerationId, setMockGenerationId] = useState<string | null>(null);

  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    getActiveStorefrontsByLocation(LOCATION)
      .then((res) => {
        if (cancelled) return;
        setStorefronts(res.storefronts);
        setProducts(res.products);
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const carpenters = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'carpenter'),
    [storefronts],
  );
  const decorVendors = useMemo(
    () => storefronts.filter((sf) => sf.vendor_type === 'decor_store'),
    [storefronts],
  );

  const mood = moodId ? AI_ROOM_MOOD_BY_ID[moodId] : null;
  const productsByMood = useMemo(() => {
    if (!mood) return [];
    return products.filter((p) => p.category && mood.categories.includes(p.category));
  }, [products, mood]);

  const budgetTiers = useMemo(() => {
    if (!mood) return { essential: 0, recommended: 0, premium: 0 };
    return computeBudgetTiers(products, mood.categories);
  }, [products, mood]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Please choose a JPEG or PNG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.');
      return;
    }
    if (roomPreviewUrl) URL.revokeObjectURL(roomPreviewUrl);
    setRoomFile(file);
    setRoomPreviewUrl(URL.createObjectURL(file));
  };

  const handleMockPay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 800));
    setMockGenerationId(`mock-${crypto.randomUUID()}`);
    setStep(4);
    setPaying(false);
    toast.success('Payment simulated. Your room is ready!');
  };

  const handleShare = () => {
    const url = window.location.origin + '/ai-room-generator';
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link'),
    );
  };

  const handleSave = () => {
    toast.success('Saved to your profile (mock).');
  };

  const resetFlow = () => {
    if (roomPreviewUrl) URL.revokeObjectURL(roomPreviewUrl);
    setRoomFile(null);
    setRoomPreviewUrl(null);
    setMoodId(null);
    setMockGenerationId(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-4xl">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI Room Generator</h1>
          <p className="mt-2 text-gray-600 text-sm md:text-base">
            Reimagine your space with Nigerian-inspired styles. Upload a photo, pick a mood, and get a fresh vision.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>Step {step} of 4</span>
            <div className="flex gap-1">
              {([1, 2, 3, 4] as const).map((s) => (
                <span
                  key={s}
                  className={`w-2 h-2 rounded-full ${s <= step ? 'bg-[#111]' : 'bg-gray-300'}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </header>

        {step === 1 && (
          <section className="space-y-6" aria-label="Upload room photo">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload your room photo
              </h2>
              <p className="mt-2 text-gray-600 text-sm">
                JPG or PNG, any angle. We’ll use it to reimagine your space in your chosen mood.
              </p>
              <label className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 py-12 px-6 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {roomPreviewUrl ? (
                  <div className="w-full max-w-sm aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={roomPreviewUrl}
                      alt="Your room"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                    <span className="mt-2 text-sm font-medium text-gray-600">Click to choose a photo</span>
                    <span className="text-xs text-gray-500 mt-1">JPEG or PNG, max 10MB</span>
                  </>
                )}
              </label>
              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!roomFile}
                  onClick={() => setStep(2)}
                  className="rounded-full bg-[#111] text-white hover:bg-gray-800"
                >
                  Next: Pick a mood
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6" aria-label="Pick a mood">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Pick a mood
              </h2>
              <p className="mt-2 text-gray-600 text-sm">
                Choose the style direction for your AI-generated room.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AI_ROOM_MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMoodId(m.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      moodId === m.id
                        ? 'border-[#111] bg-gray-50 ring-2 ring-[#111] ring-offset-2'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{m.label}</span>
                    <p className="mt-1 text-xs text-gray-600">{m.subtitle}</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-full">
                  Back
                </Button>
                <Button
                  disabled={!moodId}
                  onClick={() => setStep(3)}
                  className="rounded-full bg-[#111] text-white hover:bg-gray-800"
                >
                  Next: Review & pay
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6" aria-label="Review and pay">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Review & pay
              </h2>
              <p className="mt-2 text-gray-600 text-sm">
                Confirm your photo and mood, then pay ₦2,000 to generate your room.
              </p>
              <div className="mt-6 flex flex-col md:flex-row gap-6">
                {roomPreviewUrl && (
                  <div className="w-full md:w-48 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                    <img src={roomPreviewUrl} alt="Your room" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  {mood && (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <span className="text-xs text-gray-500">Mood</span>
                      <p className="font-semibold text-gray-900">{mood.label}</p>
                      <p className="text-sm text-gray-600">{mood.subtitle}</p>
                    </div>
                  )}
                  <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    AI reimagines your space for inspiration — not an exact architectural render.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{formatNgn(PRICE_KOBO / 100)}</span>
                    <span className="text-gray-500 text-sm">per generation</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-full">
                  Back
                </Button>
                <Button
                  disabled={paying}
                  onClick={handleMockPay}
                  className="rounded-full bg-[#111] text-white hover:bg-gray-800"
                >
                  {paying ? 'Processing…' : 'Pay ₦2,000 (mock)'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-10" aria-label="Your generated room">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900">Your reimagined room</h2>
              <p className="mt-1 text-sm text-gray-600">
                Before and after. Budget and vendor sections use real data for your chosen mood.
              </p>

              {/* Before / After */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Before</p>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                    {roomPreviewUrl ? (
                      <img src={roomPreviewUrl} alt="Your room" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">After (AI — placeholder)</p>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={PLACEHOLDER_AI_IMAGE}
                      alt="AI-generated room (placeholder)"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                AI reimagines your space for inspiration — not an exact architectural render.
              </p>

              {/* Share + Save */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleShare} className="rounded-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share my room
                </Button>
                <Button variant="outline" onClick={handleSave} className="rounded-full">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save to profile
                </Button>
                <Button variant="ghost" onClick={resetFlow} className="rounded-full text-gray-600">
                  Generate another room
                </Button>
              </div>
            </div>

            {/* Budget tiers — real data */}
            {mood && (budgetTiers.essential > 0 || budgetTiers.recommended > 0 || budgetTiers.premium > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <h3 className="text-base font-semibold text-gray-900">Estimated budget tiers</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Based on real products matching the {mood.label} mood.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500">Essential</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{formatNgn(budgetTiers.essential)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500">Recommended</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{formatNgn(budgetTiers.recommended)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500">Premium</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{formatNgn(budgetTiers.premium)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Furniture makers — real carpenters */}
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

            {/* Decor sellers — real decor storefronts */}
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

            {/* See similar items — real products by mood */}
            {productsByMood.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <h3 className="text-base font-semibold text-gray-900">See similar items</h3>
                <p className="mt-1 text-sm text-gray-600">Products matching the {mood?.label ?? 'selected'} mood.</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productsByMood.slice(0, 8).map((product) => {
                    const storefront = storefronts.find((sf) => sf.id === product.storefront_id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => navigate(`/shops/products/${product.slug}`)}
                        className="rounded-xl border border-gray-200 overflow-hidden text-left hover:border-gray-300 hover:shadow-md transition-all"
                      >
                        <div className="aspect-[3/4] bg-gray-100 relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                          )}
                          {storefront && (
                            <span
                              className="absolute top-1.5 left-1.5 rounded-full bg-black/80 text-white text-[10px] font-medium px-2 py-0.5 truncate max-w-[90%]"
                              style={{ backgroundColor: getVendorColor(storefront.name) }}
                            >
                              {storefront.name}
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 line-clamp-2">{product.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{formatPrice(product)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => navigate('/shops')}
                  >
                    Browse all products
                  </Button>
                </div>
              </div>
            )}

            {loadingData && (
              <p className="text-center text-sm text-gray-500">Loading vendors and products…</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

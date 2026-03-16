import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getActiveStorefrontsByLocation } from '@/lib/api';
import type { Storefront, VendorProduct } from '@/lib/types';
import { AI_ROOM_MOODS, AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import { Upload, Sparkles, CreditCard, ImageIcon, Share2, Bookmark, ChevronRight, Check, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { AI_ROOM_PRODUCTS_MIN } from '@/lib/ai-room-generate-types';

const LOCATION = 'NG';
const PRICE_KOBO = 200_000; // ₦2,000
const PLACEHOLDER_AI_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Noir%20Botanical%20Living%20Room.png';

/** Sample empty Nigerian room photos — user can tap one instead of uploading. */
const SAMPLE_ROOM_PHOTOS: { id: string; label: string; url: string }[] = [
  {
    id: 'living',
    label: 'Living room',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Empty%20Nigerian%20Living%20Room.png',
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Empty%20Nigerian%20Bedroom.png',
  },
  {
    id: 'office',
    label: 'Home office',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Empty%20Nigerian%20Living%20Room.png',
  },
  {
    id: 'dining',
    label: 'Dining room',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Empty%20Nigerian%20Dining%20Room.png',
  },
  {
    id: 'wall',
    label: 'Bare wall',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Bare%20Wall%20For%20Wall%20Styling.png',
  },
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

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

type Step = 1 | 2 | 3 | 4;

export default function AiRoomGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [roomPreviewUrl, setRoomPreviewUrl] = useState<string | null>(null);
  /** 'upload' = user selected file, 'sample' = user picked a sample room photo */
  const [roomSource, setRoomSource] = useState<'upload' | 'sample' | null>(null);
  const [roomPhotoError, setRoomPhotoError] = useState<string | null>(null);
  const [moodId, setMoodId] = useState<AiRoomMoodId | null>(null);
  const [paying, setPaying] = useState(false);
  const [mockGenerationId, setMockGenerationId] = useState<string | null>(null);
  /** Products passed to OpenAI for this generation (mock: 5–6 from productsByMood at pay time) */
  const [productsInRender, setProductsInRender] = useState<VendorProduct[]>([]);

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

  /** Minimum spend = sum of price_min of products in this render */
  const minimumSpend = useMemo(
    () => productsInRender.reduce((sum, p) => sum + (p.price_min ?? p.price_max ?? 0), 0),
    [productsInRender],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRoomPhotoError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG or PNG image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Image must be under 10MB.');
      return;
    }
    if (roomPreviewUrl && roomSource === 'upload') URL.revokeObjectURL(roomPreviewUrl);
    setRoomFile(file);
    setRoomPreviewUrl(URL.createObjectURL(file));
    setRoomSource('upload');
  };

  /** Same guardrail as Analyze flow: when backend says image is not a room, show this. */
  const setNotRoomError = () => setRoomPhotoError('Please upload a photo of a room or space.');

  const handleSampleRoomSelect = (url: string) => {
    setRoomPhotoError(null);
    if (roomPreviewUrl && roomSource === 'upload') URL.revokeObjectURL(roomPreviewUrl);
    setRoomFile(null);
    setRoomPreviewUrl(url);
    setRoomSource('sample');
  };

  const handleMockPay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 800));
    setMockGenerationId(`mock-${crypto.randomUUID()}`);
    const count = Math.min(AI_ROOM_PRODUCTS_MIN + Math.floor(Math.random() * 2), Math.max(productsByMood.length, AI_ROOM_PRODUCTS_MIN), 6);
    const shuffled = [...productsByMood].sort(() => Math.random() - 0.5);
    setProductsInRender(shuffled.slice(0, count));
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
    if (roomPreviewUrl && roomSource === 'upload') URL.revokeObjectURL(roomPreviewUrl);
    setRoomFile(null);
    setRoomPreviewUrl(null);
    setRoomSource(null);
    setRoomPhotoError(null);
    setMoodId(null);
    setMockGenerationId(null);
    setProductsInRender([]);
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
              {roomPhotoError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {roomPhotoError}
                </p>
              )}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700">Don&apos;t have a photo?</p>
                <p className="text-xs text-gray-500 mt-0.5">Tap a sample room to use instead.</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {SAMPLE_ROOM_PHOTOS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSampleRoomSelect(sample.url)}
                      className={`relative rounded-xl overflow-hidden border-2 aspect-[4/3] bg-gray-100 transition-all ${
                        roomPreviewUrl === sample.url ? 'border-[#111] ring-2 ring-[#111] ring-offset-2' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={sample.url} alt={sample.label} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5">
                        <span className="inline-flex items-center rounded-full bg-black/75 text-white text-[10px] font-medium px-2 py-0.5">
                          {sample.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Living room · Bedroom · Home office · Dining room · Empty wall
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!roomPreviewUrl}
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
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{formatNgn(PRICE_KOBO / 100)}</span>
                    <span className="text-gray-500 text-sm">per generation</span>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-base font-semibold text-gray-900">What you get for ₦2,000</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>AI room transformation in your chosen style</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Real verified Nigerian vendor products built into your render — not AI invented furniture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Every item is sourceable and available to buy today</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Interior decorators charge ₦150,000–₦500,000 for a mood board. This is ₦2,000.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Payment secured by Paystack — Nigeria&apos;s most trusted payment gateway</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  AI-generated results may vary based on photo quality. All vendor products shown are real and available.
                </p>
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
                Before and after. Every product in your render is from verified Nigerian vendors.
              </p>

              {/* 1. Before / After */}
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

              {/* 2. Share + Save */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleShare} className="rounded-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share my room
                </Button>
                <Button variant="outline" onClick={handleSave} className="rounded-full">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save to profile
                </Button>
              </div>
            </div>

            {/* 3. Products in your render */}
            {productsInRender.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <h3 className="text-base font-semibold text-gray-900">Products in your render</h3>
                <p className="mt-1 text-sm text-gray-600">
                  These exact products were used to generate your room.
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productsInRender.map((product) => {
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
                          <h4 className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</h4>
                          <p className="text-xs text-gray-700 mt-1">{formatPrice(product)}</p>
                        </div>
                      </button>
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

            {/* 4. Minimum spend to achieve this look */}
            {(productsInRender.length > 0 || minimumSpend > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <p className="text-sm font-medium text-gray-500">Minimum spend to achieve this look</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatNgn(minimumSpend)}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Based on {productsInRender.length} vendor product{productsInRender.length !== 1 ? 's' : ''} featured in your render.
                </p>
              </div>
            )}

            {/* 5. Furniture makers — real carpenters */}
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

            {loadingData && (
              <p className="text-center text-sm text-gray-500">Loading vendors and products…</p>
            )}

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={resetFlow} className="rounded-full text-gray-700">
                Generate another room
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

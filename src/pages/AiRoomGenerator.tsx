import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUploader from '@/components/ImageUploader';
import { getActiveStorefrontsByLocation, getSimilarProducts } from '@/lib/api';
import type { Storefront, VendorProduct, VendorProductWithAttributes } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AI_ROOM_MOODS, AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import { Upload, CreditCard, Info, AlertCircle, Share2, Bookmark, Check, Shield, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const LOCATION = 'NG';
const PRICE_KOBO = 200_000; // ₦2,000
const PLACEHOLDER_AI_IMAGE =
  'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Noir%20Botanical%20Living%20Room.png';

/** Sample empty Nigerian room photos — user can tap one instead of uploading. */
const SAMPLE_ROOM_PHOTOS: { id: string; label: string; url: string }[] = [
  {
    id: 'living',
    label: 'Living room',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Updated%20Living%20Room.png',
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Updated%20bedroom.png',
  },
  {
    id: 'office',
    label: 'Home office',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Nigerian%20Home%20Office.png',
  },
  {
    id: 'dining',
    label: 'Dining room',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Updated%20Dining%20Room.png',
  },
  {
    id: 'wall',
    label: 'Bare wall',
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Bare%20Wall%20For%20Wall%20Styling.png',
  },
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

const ROOM_TYPE_OPTIONS: { id: string; icon: string; label: string }[] = [
  { id: 'living_room', icon: '🛋', label: 'Living room' },
  { id: 'bedroom', icon: '🛏', label: 'Bedroom' },
  { id: 'dining_room', icon: '🍽', label: 'Dining room' },
  { id: 'home_office', icon: '💼', label: 'Home office' },
  { id: 'wall_styling', icon: '🖼', label: 'Wall styling' },
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

/** Matches Explore scene detail `formatVendorPrice` for similar-product cards. */
function formatVendorPrice(p: VendorProduct): string {
  return formatPrice(p);
}

/** Matches Explore scene detail `formatVendorDimensions`. */
function formatVendorDimensions(p: VendorProduct): string | null {
  const { dimension_width, dimension_height, dimension_unit } = p;
  if (!dimension_width || !dimension_height || !dimension_unit) return null;
  return `${dimension_width} × ${dimension_height} ${dimension_unit}`;
}

type SimilarReadyRow = { product: VendorProductWithAttributes; storefront: Storefront | null };
type SimilarSlot =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; rows: SimilarReadyRow[] };

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

type Step = 1 | 2 | 3 | 4 | 5;

export default function AiRoomGenerator() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [roomPreviewUrl, setRoomPreviewUrl] = useState<string | null>(null);
  /** 'upload' = user selected file, 'sample' = user picked a sample room photo */
  const [roomSource, setRoomSource] = useState<'upload' | 'sample' | null>(null);
  const [roomPhotoError, setRoomPhotoError] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string | null>(null);
  const [moodId, setMoodId] = useState<AiRoomMoodId | null>(null);
  const [paying, setPaying] = useState(false);
  const [processingMessages, setProcessingMessages] = useState<string[]>([]);
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);
  const [afterImageModalOpen, setAfterImageModalOpen] = useState(false);
  const [mockGenerationId, setMockGenerationId] = useState<string | null>(null);
  /** Products passed to OpenAI for this generation (mock: 5–6 from productsByMood at pay time) */
  const [productsInRender, setProductsInRender] = useState<VendorProduct[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [minimumSpend, setMinimumSpend] = useState<number | null>(null);
  const [similarByProductId, setSimilarByProductId] = useState<Record<string, SimilarSlot>>({});
  const [resultSheetEntered, setResultSheetEntered] = useState(false);

  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Require login before showing wizard
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setUser(user);
      setIsAuthenticated(!!user);
      setAuthLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!paying || step !== 4) return;
    const moodLabel = moodId ? AI_ROOM_MOOD_BY_ID[moodId]?.label ?? 'your chosen' : 'your chosen';
    const messages = [
      'Analysing your room…',
      `Applying ${moodLabel} style…`,
      'Sourcing Nigerian vendor products…',
      'Building your render…',
    ];
    setProcessingMessages(messages);
    setProcessingMsgIndex(0);
    const id = window.setInterval(() => {
      setProcessingMsgIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paying, step, moodId]);

  useEffect(() => {
    if (step !== 5 || productsInRender.length === 0) {
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
            const ids = [...new Set(filtered.map((p) => p.storefront_id))];
            const { data: srows } = await supabase.from('storefronts').select('*').in('id', ids);
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
  }, [step, productsInRender]);

  useEffect(() => {
    if (step !== 5) {
      setResultSheetEntered(false);
      return;
    }
    const id = window.requestAnimationFrame(() => {
      setResultSheetEntered(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [step]);

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

  /** Mirrors `Upload.tsx` `handleImageSelect` lifecycle (file preview via object URL). */
  const handleImageSelect = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG or PNG image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Image must be under 10MB.');
      return;
    }
    setRoomFile(file);
    setRoomPhotoError(null);
    setRoomSource('upload');
    const url = URL.createObjectURL(file);
    setRoomPreviewUrl(url);
  };

  /** Mirrors `Upload.tsx` `handleClear` lifecycle (revoke blob URL when from upload). */
  const handleClear = () => {
    setRoomFile(null);
    setRoomPhotoError(null);
    setRoomSource(null);
    if (roomPreviewUrl && roomSource === 'upload') {
      URL.revokeObjectURL(roomPreviewUrl);
    }
    setRoomPreviewUrl(null);
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

  const handlePayAndGenerate = async () => {
    if (!roomPreviewUrl || !moodId || !roomType || !user?.id) return;
    setPaying(true);

    try {
      let imageUrlForEdgeFunction = roomPreviewUrl;

      if (roomSource === 'upload' && roomFile) {
        const ext = roomFile.name.split('.').pop() ?? 'jpg';
        const uploadPath = `uploads/${user.id}/${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ai-rooms')
          .upload(uploadPath, roomFile, {
            contentType: roomFile.type,
            upsert: false,
          });

        if (uploadError) {
          toast.error('Failed to upload your photo. Please try again.');
          setPaying(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('ai-rooms').getPublicUrl(uploadData.path);

        imageUrlForEdgeFunction = urlData.publicUrl;

        if (roomPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(roomPreviewUrl);
        }
        setRoomPreviewUrl(urlData.publicUrl);
      }

      const reference = `test_${crypto.randomUUID()}`;

      const { data, error } = await supabase.functions.invoke('ai-room-generate', {
        body: {
          mood: moodId,
          room_type: roomType,
          paystack_reference: reference,
          original_image_url: imageUrlForEdgeFunction,
          user_id: user.id,
          test_mode: true,
        },
      });

      if (error || !data) {
        console.error('ai-room-generate error', error);
        toast.error('Room generation failed. Please try again.');
        return;
      }

      setGeneratedImageUrl(data.generated_image_url || null);
      setProductsInRender(data.products || []);
      setMinimumSpend(
        typeof data.minimum_spend === 'number' ? data.minimum_spend : null,
      );
      setStep(5);
    } finally {
      setPaying(false);
    }
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
    setRoomType(null);
    setMoodId(null);
    setMockGenerationId(null);
    setAfterImageModalOpen(false);
    setProductsInRender([]);
    setGeneratedImageUrl(null);
    setMinimumSpend(null);
    setSimilarByProductId({});
    setResultSheetEntered(false);
    setStep(1);
  };

  const showWizardStickyNav =
    isAuthenticated && step >= 1 && step <= 4 && !(step === 4 && paying);

  const stickyNextDisabled =
    (step === 1 && !roomPreviewUrl) ||
    (step === 2 && !roomType) ||
    (step === 3 && !moodId) ||
    (step === 4 && paying);

  const stickyPrimaryLabel =
    step === 1
      ? 'Next: Room type'
      : step === 2
        ? 'Next: Pick a mood'
        : step === 3
          ? 'Next: Review'
          : 'Generate my room →';

  const showResultStickyBar = isAuthenticated && step === 5;

  const handleStickyPrimary = () => {
    if (stickyNextDisabled) return;
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else void handlePayAndGenerate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <style>{`
        @keyframes ai-room-progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      <main
        className={cn(
          'flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-4xl',
          showWizardStickyNav && 'pb-28 md:pb-32',
          showResultStickyBar && 'pb-28 md:pb-32',
        )}
      >
        {authLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
            Checking your account…
          </div>
        ) : !isAuthenticated ? (
          <section className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 p-6 md:p-8 text-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">First, create a free account</h1>
            <p className="mt-3 text-sm text-gray-600">
              Your AI room generation will be saved to your history automatically so you can always find it.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="rounded-full px-6"
                onClick={() => navigate('/auth?mode=signup&redirect=/ai-room-generator')}
              >
                Sign up — it&apos;s free
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-6"
                onClick={() => navigate('/auth?mode=signin&redirect=/ai-room-generator')}
              >
                Log in
              </Button>
            </div>
          </section>
        ) : (
        <>
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI Room Generator</h1>
          <p className="mt-2 text-gray-600 text-sm md:text-base">
            Reimagine your space with Nigerian-inspired styles. Upload a photo, pick a mood, and get a fresh vision.
          </p>
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
              <div className="mt-6 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Homable works best with home and event decor photos.</span> Non-decor
                    images may not be analyzed.
                  </p>
                </div>
              </div>
              <ImageUploader
                onImageSelect={handleImageSelect}
                previewUrl={roomPreviewUrl ?? ''}
                onClear={handleClear}
              />
              {roomPhotoError && (
                <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-2">{roomPhotoError}</p>
                      <p className="text-xs text-amber-700">
                        Try uploading a photo that shows furniture, a room, or home decor items.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleClear}
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Try another photo
                  </Button>
                </div>
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
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6" aria-label="Choose room type">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900">What kind of room?</h2>
              <p className="mt-2 text-gray-600 text-sm">
                Pick the space you&apos;re styling so we can tailor the result.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {ROOM_TYPE_OPTIONS.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setRoomType(rt.id)}
                    className={`rounded-xl p-4 flex flex-col items-center justify-start gap-2 transition-colors min-h-[100px] ${
                      roomType === rt.id
                        ? 'border-2 border-[#111] bg-white'
                        : 'border-[0.5px] border-gray-400 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[24px] leading-none" aria-hidden>
                      {rt.icon}
                    </span>
                    <span className="text-[14px] text-gray-900 text-center leading-tight">{rt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6" aria-label="Pick a mood">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900">
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
                    className={`rounded-xl border-2 p-4 text-left transition-all flex items-center gap-3 ${
                      moodId === m.id
                        ? 'border-[#111] bg-gray-50 ring-2 ring-[#111] ring-offset-2'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex-shrink-0 border border-transparent"
                      style={
                        m.id === 'afro_luxe'
                          ? { backgroundColor: '#1e1e1e' }
                          : m.id === 'warm_earthy'
                          ? { backgroundColor: '#c4704a' }
                          : m.id === 'minimal_lagos'
                          ? { backgroundColor: '#f0ece4', borderColor: '#d0ccc4' }
                          : m.id === 'bold_colourful'
                          ? {
                              backgroundImage: 'linear-gradient(135deg, #1a6b6b 0%, #1a6b6b 50%, #d4a017 50%, #d4a017 100%)',
                            }
                          : {}
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 block truncate">{m.label}</span>
                      <p className="mt-1 text-xs text-gray-600">{m.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6" aria-label={paying ? 'Generating your room' : 'Review and pay'}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              {paying ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">Building your room...</h2>
                  <p className="mt-4 text-base text-gray-900 min-h-[3rem]">
                    {processingMessages[processingMsgIndex] ?? 'Starting…'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">This usually takes 45–90 seconds</p>
                  <div className="mt-6 relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="absolute top-0 bottom-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-gray-300 via-gray-50 to-gray-300 shadow-sm"
                      style={{ animation: 'ai-room-progress-shimmer 2s linear infinite' }}
                    />
                  </div>

                  <div
                    className="mt-8 pointer-events-none cursor-default select-none"
                    aria-hidden
                  >
                    <p className="text-xs text-gray-500 mb-3">Products going into your room</p>
                    <div className="grid grid-cols-2 gap-3">
                      {productsInRender.length > 0
                        ? productsInRender.map((product) => {
                            const storefront = storefronts.find((sf) => sf.id === product.storefront_id);
                            return (
                              <div key={product.id} className="flex flex-col gap-1.5">
                                <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gray-200" />
                                  )}
                                </div>
                                <p className="text-[12px] font-medium leading-snug text-gray-900 line-clamp-2">
                                  {product.name}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">
                                  {storefront?.name ?? 'Vendor'}
                                </p>
                              </div>
                            );
                          })
                        : Array.from({ length: 4 }).map((_, i) => (
                            <div key={`processing-product-skeleton-${i}`} className="flex flex-col gap-1.5">
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
                                <div
                                  className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-gray-300 via-gray-50 to-gray-300 opacity-90"
                                  style={{ animation: 'ai-room-progress-shimmer 2s linear infinite' }}
                                />
                              </div>
                              <div className="relative h-3 w-4/5 overflow-hidden rounded-md bg-gray-200">
                                <div
                                  className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-gray-300 via-gray-50 to-gray-300 opacity-90"
                                  style={{ animation: 'ai-room-progress-shimmer 2s linear infinite' }}
                                />
                              </div>
                              <div className="relative h-2.5 w-1/2 overflow-hidden rounded-md bg-gray-200">
                                <div
                                  className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-gray-300 via-gray-50 to-gray-300 opacity-90"
                                  style={{ animation: 'ai-room-progress-shimmer 2s linear infinite' }}
                                />
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Review & pay
                  </h2>
                  <p className="mt-2 text-gray-600 text-sm">
                    Confirm your photo, room type, and mood, then pay ₦2,000 to generate your room.
                  </p>
                  <div className="mt-6 flex flex-col md:flex-row gap-6">
                    {roomPreviewUrl && (
                      <div className="w-full md:w-48 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                        <img src={roomPreviewUrl} alt="Your room" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      {roomType && (
                        <div className="rounded-lg bg-gray-50 p-4">
                          <span className="text-xs text-gray-500">Room type</span>
                          <p className="font-semibold text-gray-900">
                            {ROOM_TYPE_OPTIONS.find((r) => r.id === roomType)?.label ?? roomType}
                          </p>
                        </div>
                      )}
                      {mood && (
                        <div className="rounded-lg bg-gray-50 p-4">
                          <span className="text-xs text-gray-500">Mood</span>
                          <p className="font-semibold text-gray-900">{mood.label}</p>
                          <p className="text-sm text-gray-600">{mood.subtitle}</p>
                        </div>
                      )}
                      <div className="flex items-baseline gap-2">
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
                </>
              )}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-10" aria-label="Your generated room">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Your {ROOM_TYPE_OPTIONS.find((r) => r.id === roomType)?.label ?? 'room'} is ready
              </h2>
              {mood && <p className="mt-2 text-sm text-gray-500">{mood.label}</p>}

              {/* 1. Before / After */}
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Before</p>
                  <div className="h-[140px] w-full rounded-xl overflow-hidden bg-gray-100">
                    {roomPreviewUrl ? (
                      <img src={roomPreviewUrl} alt="Your room" className="w-full h-full object-cover" />
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
                    className="block w-full rounded-xl overflow-hidden bg-gray-100 aspect-[4/3] text-left ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
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
                    Based on {productsInRender.length} vendor product{productsInRender.length !== 1 ? 's' : ''}{' '}
                    featured in your render.
                  </p>
                </div>
              )}

              {afterImageModalOpen && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Generated room full screen"
                  style={{
                    minHeight: '100dvh',
                    paddingTop: 'max(1rem, env(safe-area-inset-top))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAfterImageModalOpen(false)}
                    className="absolute z-[101] flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                    style={{
                      top: 'max(0.75rem, env(safe-area-inset-top))',
                      right: 'max(0.75rem, env(safe-area-inset-right))',
                    }}
                    aria-label="Close full screen image"
                  >
                    <X className="h-7 w-7" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    className="max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-4xl overflow-hidden rounded-lg"
                    onClick={() => setAfterImageModalOpen(false)}
                  >
                    <img
                      src={generatedImageUrl || PLACEHOLDER_AI_IMAGE}
                      alt="AI-generated room full size"
                      className="max-h-[85dvh] w-full object-contain"
                    />
                  </button>
                </div>
              )}

              {/* 2. Share + Save */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleShare} className="rounded-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share my room
                </Button>
                <Button variant="outline" onClick={() => navigate('/history')} className="rounded-full">
                  <Bookmark className="w-4 h-4 mr-2" />
                  View in history
                </Button>
              </div>
            </div>

            {/* 3. Products in your render */}
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
                                        {miniDim && (
                                          <p className="text-[9px] text-gray-500 mt-0.5">{miniDim}</p>
                                        )}
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

            {loadingData && (
              <p className="text-center text-sm text-gray-500">Loading vendors and products…</p>
            )}
          </section>
        )}

        {showWizardStickyNav && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex min-h-[72px] items-stretch bg-white border-t border-[#E5E7EB] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
            style={{
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            }}
            aria-label="Wizard navigation"
          >
            <div className="container mx-auto flex w-full max-w-4xl min-h-[72px] items-center gap-3 px-4 md:px-6 py-2">
              <div className="flex w-[88px] shrink-0 items-center justify-start">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                  >
                    Back
                  </Button>
                ) : (
                  <span className="inline-block w-[88px] shrink-0" aria-hidden />
                )}
              </div>
              <p className="min-w-0 flex-1 text-center text-[10px] font-medium text-gray-400">Step {step} of 5</p>
              <div className="flex min-w-[140px] shrink-0 items-center justify-end">
                <Button
                  type="button"
                  className="min-w-[140px] rounded-full bg-[#111] px-7 py-3 font-semibold text-white h-auto hover:bg-gray-900"
                  disabled={stickyNextDisabled}
                  onClick={handleStickyPrimary}
                >
                  {stickyPrimaryLabel}
                </Button>
              </div>
            </div>
          </nav>
        )}

        {showResultStickyBar && (
          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 flex min-h-[72px] items-center bg-white border-t border-[#E5E7EB] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out',
              resultSheetEntered ? 'translate-y-0' : 'translate-y-full',
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
                onClick={resetFlow}
              >
                Generate another room
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

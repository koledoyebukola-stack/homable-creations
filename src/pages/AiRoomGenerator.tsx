import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ImageUploader from '@/components/ImageUploader';
import { cn } from '@/lib/utils';
import { AI_ROOM_MOOD_BY_ID } from '@/lib/ai-room-moods';
import type { AiRoomMoodId } from '@/lib/ai-room-moods';
import { Upload, Info, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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

/** Step 1 sample templates: show subset only; full list stays in `SAMPLE_ROOM_PHOTOS`. */
const SAMPLE_ROOM_PHOTOS_STEP1 = SAMPLE_ROOM_PHOTOS.filter(
  (s) => s.id === 'living' || s.id === 'bedroom',
);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

const ROOM_TYPE_OPTIONS: { id: string; icon: string; label: string }[] = [
  { id: 'living_room', icon: '🛋', label: 'Living room' },
  { id: 'bedroom', icon: '🛏', label: 'Bedroom' },
  { id: 'dining_room', icon: '🍽', label: 'Dining room' },
  { id: 'home_office', icon: '💼', label: 'Home office' },
  { id: 'wall_styling', icon: '🖼', label: 'Wall styling' },
];

/** Step 2: show subset only; full list stays in `ROOM_TYPE_OPTIONS` for easy re-enable. */
const ROOM_TYPE_OPTIONS_STEP2 = ROOM_TYPE_OPTIONS.filter(
  (rt) => rt.id === 'living_room' || rt.id === 'bedroom',
);

/** Step 3: show subset only; display order is explicit (full moods stay in `AI_ROOM_MOODS`). */
const AI_ROOM_MOODS_STEP3 = (['minimal_lagos', 'warm_earthy'] as const).map((id) => AI_ROOM_MOOD_BY_ID[id]);

const LOADING_IMAGES = [
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Artificial%20Olive%20Tree%20Planter.jpeg',
    label: 'Planters',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Mediterranean%20Olive%20Planter.png',
    label: 'Planters',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Brushstroke%20Vase%20Planter.png',
    label: 'Planters',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Modern%20Artificial%20Floor%20Plant.jpeg',
    label: 'Planters',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/KAWS%20style%20companion%20figurine%20set.png',
    label: 'Accessories',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Abstract%20flame%20sculpture%20decor%20piece.JPG',
    label: 'Accessories',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Minimalist%20ceramic%20loop%20vase%20set.JPG',
    label: 'Accessories',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Blush%20loop%20ceramic%20vase%20set.png',
    label: 'Accessories',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Modern%20sputnik%20globe%20chandelier.jpeg',
    label: 'Lighting',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Gold%20Crystal%20Table%20Lamp.png',
    label: 'Lighting',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Chrome%20globe%20cluster%20pendant%20chandelier.jpeg',
    label: 'Lighting',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Modern%20spiral%20ring%20chandelier.jpeg',
    label: 'Lighting',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Blue%20Stripe%20Woman%20Wall%20Art.png',
    label: 'Artwork',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/African%20Market%20Scene.jpeg',
    label: 'Artwork',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Red%20Abstract%20Silhouette.png',
    label: 'Artwork',
  },
  {
    url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/storefront-assets/Elegant%20Back%20Portrait.jpeg',
    label: 'Artwork',
  },
] as const;

const LOADING_MOOD_BOARD_STEP = 4;
const LOADING_MOOD_BOARD_INTERVAL_MS = 3000;
const LOADING_MOOD_BOARD_FADE_MS = 300;

type Step = 1 | 2 | 3 | 4;

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
  const [loadingMoodBoardStart, setLoadingMoodBoardStart] = useState(0);
  const [loadingMoodBoardOpacity, setLoadingMoodBoardOpacity] = useState(1);
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
    if (roomType && !ROOM_TYPE_OPTIONS_STEP2.some((r) => r.id === roomType)) {
      setRoomType(null);
    }
  }, [roomType]);

  useEffect(() => {
    if (moodId && !AI_ROOM_MOODS_STEP3.some((m) => m.id === moodId)) {
      setMoodId(null);
    }
  }, [moodId]);

  useEffect(() => {
    if (
      roomSource === 'sample' &&
      roomPreviewUrl &&
      !SAMPLE_ROOM_PHOTOS_STEP1.some((s) => s.url === roomPreviewUrl)
    ) {
      setRoomPreviewUrl(null);
      setRoomSource(null);
    }
  }, [roomSource, roomPreviewUrl]);

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
    if (!paying || step !== 4) return;
    setLoadingMoodBoardStart(0);
    setLoadingMoodBoardOpacity(1);
  }, [paying, step]);

  useEffect(() => {
    if (!paying || step !== 4) return;
    let fadeTimeout: ReturnType<typeof window.setTimeout> | undefined;
    const intervalId = window.setInterval(() => {
      setLoadingMoodBoardOpacity(0);
      fadeTimeout = window.setTimeout(() => {
        setLoadingMoodBoardStart((s) => (s + LOADING_MOOD_BOARD_STEP) % LOADING_IMAGES.length);
        setLoadingMoodBoardOpacity(1);
      }, LOADING_MOOD_BOARD_FADE_MS);
    }, LOADING_MOOD_BOARD_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, [paying, step]);

  const mood = moodId ? AI_ROOM_MOOD_BY_ID[moodId] : null;

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

      const shareSlug =
        typeof (data as { share_slug?: unknown }).share_slug === 'string'
          ? (data as { share_slug: string }).share_slug.trim()
          : '';
      if (!shareSlug) {
        toast.error('Could not create your room link. Please try again.');
        return;
      }

      navigate(`/room/${encodeURIComponent(shareSlug)}`, { replace: true });
    } finally {
      setPaying(false);
    }
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
          ? 'Next: Review & generate'
          : 'Generate my room →';

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
                    Take a photo of your living room or bedroom. Empty works best. Natural light and a wide angle give
                    the most stunning results.
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
                <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-xl">
                  {SAMPLE_ROOM_PHOTOS_STEP1.map((sample) => (
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
                  {SAMPLE_ROOM_PHOTOS_STEP1.map((s) => s.label).join(' · ')}
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
                {ROOM_TYPE_OPTIONS_STEP2.map((rt) => (
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
                {AI_ROOM_MOODS_STEP3.map((m) => (
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
          <section className="space-y-6" aria-label={paying ? 'Generating your room' : 'Review and generate'}>
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
                    className="mt-8 grid grid-cols-2 gap-3 transition-opacity duration-300 ease-in-out pointer-events-none cursor-default select-none"
                    style={{ opacity: loadingMoodBoardOpacity }}
                    aria-hidden
                  >
                    {Array.from({ length: 4 }, (_, i) => {
                      const item = LOADING_IMAGES[(loadingMoodBoardStart + i) % LOADING_IMAGES.length];
                      return (
                        <div
                          key={`${loadingMoodBoardStart}-${i}-${item.url}`}
                          className="relative h-[140px] w-full overflow-hidden rounded-lg"
                        >
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="text-center text-xs font-medium text-white">{item.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">Review & generate</h2>
                  <p className="mt-2 text-gray-600 text-sm">
                    Confirm your photo, room type, and mood. You&apos;ve been invited as an early tester — this
                    generation is on us.
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
                    </div>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-900">What you get</h3>
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
              <p className="min-w-0 flex-1 text-center text-[10px] font-medium text-gray-400">Step {step} of 4</p>
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
        </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { ExplorePriceFilter, ExploreRoomTypeFilter } from '@/lib/explore-filters';

type Step = 1 | 2 | 3;

const SWIPE_BACK_MIN_PX = 60;

const ROOM_OPTIONS: { label: string; value: ExploreRoomTypeFilter }[] = [
  { label: 'Living Room', value: 'living_room' },
  { label: 'Bedroom', value: 'bedroom' },
  { label: 'Dining Room', value: 'dining' },
  { label: 'Home Office', value: 'office' },
];

const PRICE_OPTIONS: { label: string; value: ExplorePriceFilter }[] = [
  { label: 'Under ₦300k', value: 'under_300' },
  { label: '₦300k to ₦500k', value: '300_500' },
  { label: '₦500k to ₦1M', value: '500_1000' },
  { label: 'Over ₦1M', value: '1000_plus' },
];

export default function NigeriaHomeOnboarding({
  open,
  onDismiss,
  onComplete,
}: {
  open: boolean;
  onDismiss: () => void;
  onComplete: (room: ExploreRoomTypeFilter, price: ExplorePriceFilter) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [room, setRoom] = useState<ExploreRoomTypeFilter>('all');
  const [price, setPrice] = useState<ExplorePriceFilter>('all');
  /** True after user has left step 1 at least once (enables highlighting "Not sure" vs untouched). */
  const [hasCommittedRoom, setHasCommittedRoom] = useState(false);
  /** True after user has left step 2 at least once. */
  const [hasCommittedPrice, setHasCommittedPrice] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setRoom('all');
      setPrice('all');
      setHasCommittedRoom(false);
      setHasCommittedPrice(false);
    }
  }, [open]);

  const goBack = () => {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || step <= 1) return;

    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_BACK_MIN_PX) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) goBack();
  };

  const borderSecondary = 'hsl(var(--border))';
  const textSecondary = 'hsl(var(--color-text-secondary))';

  const roomSelected = (value: ExploreRoomTypeFilter) =>
    room === value && (value !== 'all' || hasCommittedRoom);

  const priceSelected = (value: ExplorePriceFilter) =>
    price === value && (value !== 'all' || hasCommittedPrice);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center"
      aria-hidden={!open}
    >
      <div
        className="pointer-events-auto w-full rounded-t-2xl bg-white px-6 pb-10 pt-6"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        <div className="relative">
          <div className="mb-3 flex justify-center">
            <div
              className="rounded-full bg-[#e0e0e0]"
              style={{ width: 36, height: 4 }}
              aria-hidden
            />
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-5 top-5 p-1 text-[20px] leading-none"
            style={{ color: textSecondary }}
            aria-label="Dismiss"
          >
            ×
          </button>

          {/* Progress: full width of padded area, 4px segments, 6px gap, distinct from handle */}
          <div
            className="mb-5 flex w-full pr-10"
            style={{ gap: 6 }}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={step}
            aria-label={`Step ${step} of 3`}
          >
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className="flex-1 rounded-[2px]"
                style={{
                  height: 4,
                  backgroundColor: step >= s ? '#1a1a1a' : '#e0e0e0',
                  minWidth: 0,
                }}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                What are you setting up?
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Pick the space you want to set up first
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {ROOM_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRoom(value);
                      setHasCommittedRoom(true);
                      setStep(2);
                    }}
                    className="rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                    style={{
                      borderColor: borderSecondary,
                      background: roomSelected(value) ? '#1a1a1a' : 'white',
                      color: roomSelected(value) ? '#ffffff' : 'hsl(var(--foreground))',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRoom('all');
                    setHasCommittedRoom(true);
                    setStep(2);
                  }}
                  className="col-span-2 rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                  style={{
                    borderColor: borderSecondary,
                    background: roomSelected('all') ? '#1a1a1a' : 'white',
                    color: roomSelected('all') ? '#ffffff' : 'hsl(var(--foreground))',
                  }}
                >
                  Not sure yet
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="mb-2 block border-0 bg-transparent p-0 text-left font-normal shadow-none outline-none ring-0 focus-visible:underline"
                style={{ fontSize: 13, color: textSecondary }}
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                What is your budget?
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                We will show you home setup ideas within your range
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {PRICE_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPrice(value);
                      setHasCommittedPrice(true);
                      setStep(3);
                    }}
                    className="rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                    style={{
                      borderColor: borderSecondary,
                      background: priceSelected(value) ? '#1a1a1a' : 'white',
                      color: priceSelected(value) ? '#ffffff' : 'hsl(var(--foreground))',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPrice('all');
                    setHasCommittedPrice(true);
                    setStep(3);
                  }}
                  className="col-span-2 rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                  style={{
                    borderColor: borderSecondary,
                    background: priceSelected('all') ? '#1a1a1a' : 'white',
                    color: priceSelected('all') ? '#ffffff' : 'hsl(var(--foreground))',
                  }}
                >
                  Not sure yet
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="mb-2 block border-0 bg-transparent p-0 text-left font-normal shadow-none outline-none ring-0 focus-visible:underline"
                style={{ fontSize: 13, color: textSecondary }}
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">You are ready</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Here are home setup ideas matched to your space and budget. Tap any idea to see
                everything in it and how much it costs.
              </p>
              <button
                type="button"
                onClick={() => onComplete(room, price)}
                className="mt-6 w-full rounded-[10px] py-[14px] text-[15px] font-medium text-white"
                style={{ background: '#1a1a1a' }}
              >
                Show me my ideas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

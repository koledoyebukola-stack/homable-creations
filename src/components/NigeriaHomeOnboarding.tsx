import { useEffect, useState } from 'react';
import type { ExplorePriceFilter, ExploreRoomTypeFilter } from '@/lib/explore-filters';

type Step = 1 | 2 | 3;

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

  useEffect(() => {
    if (open) {
      setStep(1);
      setRoom('all');
      setPrice('all');
    }
  }, [open]);

  const borderSecondary = 'hsl(var(--border))';
  const borderTertiary = 'hsl(var(--border) / 0.55)';

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
      >
        <div className="relative">
          <div className="mb-4 flex justify-center">
            <div
              className="rounded-sm bg-[#e0e0e0]"
              style={{ width: 36, height: 4 }}
              aria-hidden
            />
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-5 top-5 p-1 text-[20px] leading-none"
            style={{ color: 'hsl(var(--color-text-secondary))' }}
            aria-label="Dismiss"
          >
            ×
          </button>

          <div className="mb-5 flex gap-1 pr-10">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className="h-[3px] flex-1 rounded-sm"
                style={{
                  background: step >= s ? '#1a1a1a' : borderTertiary,
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
                      setStep(2);
                    }}
                    className="rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                    style={{
                      borderColor: borderSecondary,
                      background: 'white',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRoom('all');
                    setStep(2);
                  }}
                  className="col-span-2 rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                  style={{
                    borderColor: borderSecondary,
                    background: 'white',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  Not sure yet
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
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
                      setStep(3);
                    }}
                    className="rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                    style={{
                      borderColor: borderSecondary,
                      background: 'white',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPrice('all');
                    setStep(3);
                  }}
                  className="col-span-2 rounded-[10px] border px-3 py-3 text-left text-sm transition-colors"
                  style={{
                    borderColor: borderSecondary,
                    background: 'white',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  Not sure yet
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
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

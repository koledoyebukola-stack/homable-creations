import { useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type WalkthroughStep = 1 | 2 | 3;

export default function NigeriaHomeOnboardingTooltip({
  open,
  step,
  targetEl,
  text,
  showNext,
  onNext,
  onDismiss,
}: {
  open: boolean;
  step: WalkthroughStep;
  targetEl: HTMLElement | null;
  text: string;
  showNext: boolean;
  onNext: () => void;
  onDismiss: () => void;
}) {
  // Temporary debug to confirm the tooltip mounts and what's controlling its visibility.
  // eslint-disable-next-line no-console
  console.log('[HB onboarding tooltip] render', {
    open,
    step,
    hasTarget: !!targetEl,
    targetTag: targetEl?.tagName,
  });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    arrowOnTop: boolean; // tooltip above target
  } | null>(null);

  const arrowSize = 12;
  const gap = 10;

  const zIndex = useMemo(() => 60, []);

  useLayoutEffect(() => {
    if (!open || !targetEl) return;

    let raf = 0;
    const compute = () => {
      const t = targetEl.getBoundingClientRect();
      const card = cardRef.current?.getBoundingClientRect();
      if (!card) return;

      const centerX = t.left + t.width / 2;
      const aboveTop = t.top - card.height - gap;

      // If not enough space above, render below target.
      const shouldRenderAbove = aboveTop >= 8;
      const top = shouldRenderAbove ? aboveTop : t.bottom + gap;

      const left = Math.max(
        8,
        Math.min(centerX - card.width / 2, window.innerWidth - card.width - 8),
      );

      const arrowLeft = Math.max(
        8,
        Math.min(centerX - left - arrowSize / 2, card.width - arrowSize - 8),
      );

      setPos({
        top,
        left,
        arrowLeft,
        arrowOnTop: !shouldRenderAbove,
      });
    };

    raf = window.requestAnimationFrame(compute);
    return () => window.cancelAnimationFrame(raf);
  }, [open, targetEl, step, text, showNext]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      // Re-trigger the layout effect by updating state; easiest is to recompute directly.
      const t = targetEl?.getBoundingClientRect();
      const card = cardRef.current?.getBoundingClientRect();
      if (!t || !card) return;

      const centerX = t.left + t.width / 2;
      const aboveTop = t.top - card.height - gap;
      const shouldRenderAbove = aboveTop >= 8;
      const top = shouldRenderAbove ? aboveTop : t.bottom + gap;
      const left = Math.max(8, Math.min(centerX - card.width / 2, window.innerWidth - card.width - 8));
      const arrowLeft = Math.max(
        8,
        Math.min(centerX - left - arrowSize / 2, card.width - arrowSize - 8),
      );

      setPos({
        top,
        left,
        arrowLeft,
        arrowOnTop: !shouldRenderAbove,
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [open, targetEl]);

  if (!open || !targetEl || !pos) return null;

  const arrowStyle: CSSProperties = {
    width: arrowSize,
    height: arrowSize,
    background: '#ffffff',
    position: 'absolute',
    left: pos.arrowLeft,
    transform: 'rotate(45deg)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    ...(pos.arrowOnTop ? { top: -Math.floor(arrowSize / 2) } : { bottom: -Math.floor(arrowSize / 2) }),
    zIndex,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex,
        maxWidth: 260,
        width: 260,
        pointerEvents: 'none', // allow clicks through; only buttons will be clickable.
      }}
      aria-hidden={false}
    >
      <div
        ref={cardRef}
        style={{
          pointerEvents: 'none',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          padding: '14px 12px 12px 12px',
          position: 'relative',
          fontSize: 13,
          color: 'hsl(var(--foreground))',
        }}
      >
        <div style={arrowStyle} />

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss onboarding"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            color: 'hsl(var(--color-text-secondary))',
            fontSize: 18,
            lineHeight: '22px',
            padding: 0,
          }}
        >
          ×
        </button>

        <p style={{ marginRight: 24, whiteSpace: 'pre-line', lineHeight: 1.35 }}>{text}</p>

        {showNext && (
          <button
            type="button"
            onClick={onNext}
            style={{
              marginTop: 10,
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#111111',
              color: '#ffffff',
              borderRadius: 10,
              padding: '9px 12px',
              border: '1px solid #111111',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}


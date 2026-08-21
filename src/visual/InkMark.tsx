import { useEffect, useRef } from 'react';
import HanziWriter, { type CharacterJson } from 'hanzi-writer';
import localSiData from '../assets/hanzi/似.json';

interface InkMarkProps {
  variant?: 'intro' | 'ending';
}

const SI_DATA: CharacterJson = localSiData;

const WRITER_OPTIONS = {
  intro: {
    strokeAnimationSpeed: 1.8,
    delayBetweenStrokes: 200,
    strokeFadeDuration: 180,
  },
  ending: {
    strokeAnimationSpeed: 2.5,
    delayBetweenStrokes: 80,
    strokeFadeDuration: 140,
  },
} as const;

function getInitialSize(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  return Math.max(1, Math.round(size || 160));
}

function getStrokeColor(element: HTMLElement): string {
  const color = window.getComputedStyle(element).color.trim();
  return color || '#58422e';
}

/** Renders the official Hanzi Writer character data without a second glyph implementation. */
export function InkMark({ variant = 'intro' }: InkMarkProps) {
  const markRef = useRef<HTMLSpanElement>(null);
  const writerContainerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    const container = writerContainerRef.current;
    if (!mark || !container) return undefined;

    let disposed = false;
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = getInitialSize(container);
    const writer = HanziWriter.create(container, '似', {
      width: size,
      height: size,
      padding: 8,
      charDataLoader: () => SI_DATA,
      showOutline: false,
      showCharacter: false,
      strokeColor: getStrokeColor(mark),
      ...WRITER_OPTIONS[variant],
    });

    let lastSize = size;
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(([entry]) => {
        if (disposed || !entry) return;
        const nextSize = Math.max(1, Math.round(Math.min(entry.contentRect.width, entry.contentRect.height)));
        if (!nextSize || nextSize === lastSize) return;
        lastSize = nextSize;
        writer.updateDimensions({ width: nextSize, height: nextSize });
      });

    resizeObserver?.observe(container);

    void writer.getCharacterData()
      .then(() => {
        if (disposed) return undefined;
        return reducedMotion ? writer.showCharacter() : writer.animateCharacter();
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('[InkMark] failed to load local Hanzi Writer data', error);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();

      // Hanzi Writer exposes the active renderer/state for integrations; stop both
      // before removing its SVG so StrictMode cannot leave a late render behind.
      writer._loadingManager.loadingFailed = true;
      writer.cancelQuiz();
      writer._renderState?.cancelAll();
      writer._hanziWriterRenderer?.destroy();
      writer._hanziWriterRenderer = null;
      container.replaceChildren();
    };
  }, [variant]);

  return (
    <span className={`ink-mark-wrap ink-mark-wrap--${variant}`}>
      <span ref={markRef} className={`ink-mark ink-mark--${variant}`} role="img" aria-label="似">
        <span ref={writerContainerRef} className="ink-mark-canvas" aria-hidden="true" />
      </span>
    </span>
  );
}

export default InkMark;

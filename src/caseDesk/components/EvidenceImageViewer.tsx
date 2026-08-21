import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { acquireScrollLock } from '../../core/scrollLock';

export const EVIDENCE_VIEWER_MIN_SCALE = 1;
export const EVIDENCE_VIEWER_MAX_SCALE = 4;

type ViewerLoadState = 'loading' | 'loaded' | 'error';
type PointerPoint = { x: number; y: number };
type Gesture =
  | { kind: 'none' }
  | { kind: 'drag'; startX: number; startY: number; startTranslateX: number; startTranslateY: number }
  | { kind: 'pinch'; startDistance: number; startScale: number };

export interface EvidenceImageViewerProps {
  open: boolean;
  /** The already-resolved player-safe URL supplied by ContentRegistry. */
  imageSrc: string | null;
  /** Kept as a source identity only; it is never rendered in player UI. */
  imageRef?: string | null;
  title: string;
  caption?: string | null;
  alt?: string;
  onClose: () => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

function clampScale(value: number): number {
  return Math.min(Math.max(value, EVIDENCE_VIEWER_MIN_SCALE), EVIDENCE_VIEWER_MAX_SCALE);
}

export function clampEvidenceImageScale(value: number): number {
  return clampScale(value);
}

function distanceBetween(first: PointerPoint, second: PointerPoint): number {
  return Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

function focusWithoutScroll(element: HTMLElement | null): void {
  if (!element || !document.contains(element)) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function EvidenceImageViewer({ open, imageSrc, title, caption, alt, onClose, restoreFocusRef }: EvidenceImageViewerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<Gesture>({ kind: 'none' });
  const onCloseRef = useRef(onClose);
  const [loadState, setLoadState] = useState<ViewerLoadState>(imageSrc ? 'loading' : 'error');
  const [scale, setScale] = useState(EVIDENCE_VIEWER_MIN_SCALE);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    setLoadState(imageSrc ? 'loading' : 'error');
    setScale(EVIDENCE_VIEWER_MIN_SCALE);
    setTranslateX(0);
    setTranslateY(0);
    pointersRef.current.clear();
    gestureRef.current = { kind: 'none' };
    return undefined;
  }, [imageSrc, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = restoreFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const releaseScrollLock = acquireScrollLock();
    const focusTimer = window.setTimeout(() => focusWithoutScroll(closeButtonRef.current), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = focusableElements(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      pointersRef.current.clear();
      gestureRef.current = { kind: 'none' };
      releaseScrollLock();
      focusWithoutScroll(restoreFocusRef?.current ?? previousFocus);
    };
  }, [open, restoreFocusRef]);

  const constrainTranslation = (x: number, y: number, nextScale: number): PointerPoint => {
    const stage = stageRef.current;
    const image = imageElementRef.current;
    if (!stage || !image || image.offsetWidth < 1 || image.offsetHeight < 1) return { x, y };
    const aspectRatio = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : image.offsetWidth / image.offsetHeight;
    const fitWidth = Math.min(stage.clientWidth, stage.clientHeight * aspectRatio);
    const fitHeight = Math.min(stage.clientHeight, stage.clientWidth / aspectRatio);
    const maxX = Math.max(0, (fitWidth * nextScale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (fitHeight * nextScale - stage.clientHeight) / 2);
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY)
    };
  };

  const setZoom = (nextScale: number) => {
    const safeScale = clampScale(nextScale);
    setScale(safeScale);
    const constrained = constrainTranslation(translateX, translateY, safeScale);
    setTranslateX(constrained.x);
    setTranslateY(constrained.y);
  };

  const resetImage = () => {
    setScale(EVIDENCE_VIEWER_MIN_SCALE);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (loadState !== 'loaded') return;
    event.preventDefault();
    setZoom(event.deltaY < 0 ? scale * 1.2 : scale / 1.2);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    stageRef.current?.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length >= 2) {
      gestureRef.current = { kind: 'pinch', startDistance: distanceBetween(points[0], points[1]), startScale: scale };
    } else if (scale > EVIDENCE_VIEWER_MIN_SCALE) {
      gestureRef.current = {
        kind: 'drag',
        startX: event.clientX,
        startY: event.clientY,
        startTranslateX: translateX,
        startTranslateY: translateY
      };
    } else {
      gestureRef.current = { kind: 'none' };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (points.length >= 2 && gesture.kind === 'pinch') {
      event.preventDefault();
      setZoom(gesture.startScale * distanceBetween(points[0], points[1]) / gesture.startDistance);
      return;
    }
    if (points.length === 1 && gesture.kind === 'drag' && scale > EVIDENCE_VIEWER_MIN_SCALE) {
      event.preventDefault();
      const next = constrainTranslation(
        gesture.startTranslateX + event.clientX - gesture.startX,
        gesture.startTranslateY + event.clientY - gesture.startY,
        scale
      );
      setTranslateX(next.x);
      setTranslateY(next.y);
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    try {
      stageRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }
    const remaining = [...pointersRef.current.entries()];
    if (remaining.length === 1 && scale > EVIDENCE_VIEWER_MIN_SCALE) {
      const [pointerId, point] = remaining[0];
      gestureRef.current = {
        kind: 'drag',
        startX: point.x,
        startY: point.y,
        startTranslateX: translateX,
        startTranslateY: translateY
      };
      pointersRef.current.set(pointerId, point);
    } else {
      gestureRef.current = { kind: 'none' };
    }
  };

  const handleResize = () => {
    const constrained = constrainTranslation(translateX, translateY, scale);
    setTranslateX(constrained.x);
    setTranslateY(constrained.y);
  };

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [open, scale, translateX, translateY]);

  if (!open) return null;

  const titleId = 'evidence-image-viewer-title';
  const imageAlt = alt ?? `${title}图片`;
  const viewer = (
    <section
      ref={dialogRef}
      className="evidence-viewer-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}
    >
      <div className="evidence-viewer-shell" onClick={(event) => event.stopPropagation()}>
        <header className="evidence-viewer-header">
          <div className="evidence-viewer-heading">
            <p className="eyebrow">图片查看</p>
            <h2 id={titleId}>{title}</h2>
            {caption ? <p className="evidence-viewer-caption">{caption}</p> : null}
          </div>
          <button ref={closeButtonRef} type="button" className="evidence-viewer-close" onClick={() => onCloseRef.current()} aria-label="关闭图片查看器">×</button>
        </header>

        <div
          ref={stageRef}
          className="evidence-viewer-stage"
          aria-label="图片查看区域"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {loadState === 'loading' ? <p className="evidence-viewer-status" role="status">正在加载图片……</p> : null}
          {loadState === 'error' ? <p className="evidence-viewer-status" role="alert">图片暂时无法显示</p> : null}
          {imageSrc ? (
            <img
              ref={imageElementRef}
              className={`evidence-viewer-image${loadState === 'error' ? ' is-error' : ''}`}
              src={imageSrc}
              alt={imageAlt}
              draggable={false}
              onLoad={() => setLoadState('loaded')}
              onError={() => setLoadState('error')}
              style={{ transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})` }}
            />
          ) : null}
        </div>

        <footer className="evidence-viewer-controls" aria-label="图片缩放控制">
          <button type="button" className="evidence-viewer-control" onClick={() => setZoom(scale / 1.25)} disabled={loadState !== 'loaded' || scale <= EVIDENCE_VIEWER_MIN_SCALE} aria-label="缩小图片">−</button>
          <button type="button" className="evidence-viewer-reset" onClick={resetImage} disabled={loadState !== 'loaded'} aria-label="重置图片大小">重置</button>
          <span className="evidence-viewer-scale" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button type="button" className="evidence-viewer-control" onClick={() => setZoom(scale * 1.25)} disabled={loadState !== 'loaded' || scale >= EVIDENCE_VIEWER_MAX_SCALE} aria-label="放大图片">＋</button>
        </footer>
      </div>
    </section>
  );

  return typeof document === 'undefined' ? viewer : createPortal(viewer, document.body);
}

export default EvidenceImageViewer;

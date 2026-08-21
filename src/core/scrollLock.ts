let activeLocks = 0;
let previousOverflow = '';
let previousOverscrollBehavior = '';

/**
 * A small reference-counted lock shared by the formal overlays added to the
 * player. Nested overlays therefore restore the lock held by their parent
 * instead of unexpectedly re-enabling page scroll.
 */
export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined' || !document.body) return () => undefined;

  if (activeLocks === 0) {
    previousOverflow = document.body.style.overflow;
    previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0 && document.body) {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    }
  };
}

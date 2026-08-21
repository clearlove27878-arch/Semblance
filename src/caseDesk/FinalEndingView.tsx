import { useEffect, useState } from 'react';
import { InkMark } from '../visual/InkMark';
import { AuthorCredit } from '../visual/AuthorCredit';

interface FinalEndingViewProps {
  onReturnToStart: () => void;
}

/** The persisted last screen: a quiet final mark with an explicit return entry. */
export function FinalEndingView({ onReturnToStart }: FinalEndingViewProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className={`final-ending-page${visible ? ' is-visible' : ''}`} aria-label="终幕">
      <div className="final-ending-content">
        <button type="button" className="final-ending-mark" onClick={onReturnToStart} aria-label="回到开场"><InkMark variant="ending" /></button>
        <AuthorCredit className="final-ending-credit" />
        <button type="button" className="secondary-button final-ending-return-button" onClick={onReturnToStart}>回到开头</button>
      </div>
    </main>
  );
}

export default FinalEndingView;

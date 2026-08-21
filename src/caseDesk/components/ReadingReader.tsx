import { useEffect, useMemo, useRef, useState } from 'react';
import type { BodyBlock } from '../../content/types';
import type { StoryContent } from '../content/types';
import { clampReadingPageIndex, getReadingReaderPages } from './readingReaderModel';

export interface ReadingReaderChapterOption {
  id: string;
  title: string;
}

export interface ReadingReaderDevTools {
  chapters: readonly ReadingReaderChapterOption[];
  onSelectChapter: (chapterId: string) => void;
}

interface ReadingReaderProps {
  story: StoryContent;
  pageIndex: number;
  completed?: boolean;
  onPageChange: (pageIndex: number) => void;
  onComplete?: (pageIndex: number, totalPages: number) => void;
  onEnd?: (pageIndex: number, totalPages: number) => void;
  onBack: () => void;
  devTools?: ReadingReaderDevTools;
}

function isEditableOrInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest('input, textarea, select, button, a, [role="dialog"]'));
}

function ReadingBlocks({ blocks }: { blocks: readonly BodyBlock[] }) {
  return (
    <div className="reading-reader-blocks">
      {blocks.map((block, index) => {
        if (block.kind === 'divider') return <hr className="reading-divider" key={`divider-${index}`} aria-hidden="true" />;
        if (block.kind === 'pageBreak') return null;
        return <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={`${index}-${block.text.slice(0, 16)}`}>{block.text}</p>;
      })}
    </div>
  );
}

function ReadingHeader({
  story,
  pageIndex,
  totalPages,
  progressId,
  headingRef
}: {
  story: StoryContent;
  pageIndex: number;
  totalPages: number;
  progressId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header className="reading-reader-header">
      <div>
        <p className="eyebrow">阅读</p>
        <h1 ref={headingRef} id="reading-reader-heading" tabIndex={-1}>{story.title}</h1>
        {story.subtitle ? <p className="reading-reader-subtitle">{story.subtitle}</p> : null}
      </div>
      <span id={progressId} className="reading-reader-progress" aria-label={`第 ${pageIndex + 1} 页，共 ${totalPages} 页`} aria-live="polite">
        {pageIndex + 1} / {totalPages}
      </span>
    </header>
  );
}

function ReadingImage({ image, position }: { image: NonNullable<StoryContent['openingImage']>; position: 'opening' | 'ending' }) {
  return (
    <div className={`reading-reader-image reading-reader-${position}-image`}>
      <img src={image.src} alt={image.kind === 'portrait' ? '人物画像' : ''} />
    </div>
  );
}

function ReadingPage({ story, pageIndex, blocks, progressId, totalPages }: {
  story: StoryContent;
  pageIndex: number;
  blocks: readonly BodyBlock[];
  progressId: string;
  totalPages: number;
}) {
  const isFirstPage = pageIndex === 0;
  const isLastPage = totalPages > 0 && pageIndex === totalPages - 1;
  const openingImage = isFirstPage ? story.openingImage : null;
  const endingImage = isLastPage ? story.endingImage : null;
  return (
    <article
      key={`${story.id}-${pageIndex}`}
      className={`reading-reader-card${endingImage ? ' has-ending-image' : ''}`}
      aria-labelledby="reading-reader-heading"
      aria-describedby={progressId}
    >
      <div className="reading-reader-copy">
        {openingImage ? <ReadingImage image={openingImage} position="opening" /> : null}
        <ReadingBlocks blocks={blocks} />
        {endingImage ? <ReadingImage image={endingImage} position="ending" /> : null}
      </div>
    </article>
  );
}

function ReadingControls({
  pageIndex,
  totalPages,
  isLastPage,
  completed,
  finalActionLabel,
  onPrevious,
  onNext,
  onComplete,
  endingChapter,
  onBack
}: {
  pageIndex: number;
  totalPages: number;
  isLastPage: boolean;
  completed: boolean;
  finalActionLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  endingChapter: boolean;
  onBack: () => void;
}) {
  return (
    <footer className="reading-reader-actions" aria-label="阅读操作">
      <button type="button" className="secondary-button reading-reader-exit" onClick={onBack}>返回阅读</button>
      <div className="reading-reader-page-actions">
        <button type="button" className="secondary-button" onClick={onPrevious} disabled={pageIndex <= 0} aria-label="上一页">
          上一页
        </button>
        {isLastPage ? endingChapter ? null : (
          <button type="button" className="primary-button" onClick={onComplete} disabled={completed} aria-label={completed ? '已读' : finalActionLabel}>
            {completed ? '已读' : finalActionLabel}
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={onNext} aria-label={`下一页，第 ${pageIndex + 2} 页，共 ${totalPages} 页`}>
            下一页
          </button>
        )}
      </div>
    </footer>
  );
}

function ReadingDevTools({
  story,
  pageIndex,
  totalPages,
  blocks,
  tools,
  onPageChange
}: {
  story: StoryContent;
  pageIndex: number;
  totalPages: number;
  blocks: readonly BodyBlock[];
  tools: ReadingReaderDevTools;
  onPageChange: (pageIndex: number) => void;
}) {
  const [jumpPage, setJumpPage] = useState(String(pageIndex + 1));

  useEffect(() => {
    setJumpPage(String(pageIndex + 1));
  }, [pageIndex, story.id]);

  const commitJump = () => {
    const requested = Number.parseInt(jumpPage, 10);
    if (!Number.isFinite(requested)) return;
    onPageChange(clampReadingPageIndex(requested - 1, totalPages));
  };

  return (
    <details className="reading-reader-dev-tools">
      <summary>DEV · {blocks.length} 个当前页区块</summary>
      <div className="reading-reader-dev-panel">
        <label>
          章节
          <select value={story.id} onChange={(event) => tools.onSelectChapter(event.target.value)}>
            {tools.chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}
          </select>
        </label>
        <label>
          页码
          <input type="number" min={1} max={Math.max(totalPages, 1)} value={jumpPage} onChange={(event) => setJumpPage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitJump(); }} />
        </label>
        <button type="button" className="secondary-button" onClick={commitJump}>跳转</button>
        <span className="reading-reader-dev-meta">本章 {totalPages} 页 · 当前页 {blocks.length} 个区块</span>
      </div>
    </details>
  );
}

export function ReadingReader({ story, pageIndex, completed = false, onPageChange, onComplete, onEnd, onBack, devTools }: ReadingReaderProps) {
  const pages = useMemo(() => getReadingReaderPages(story), [story]);
  const safePageIndex = clampReadingPageIndex(pageIndex, pages.length);
  const totalPages = pages.length;
  const isLastPage = totalPages > 0 && safePageIndex === totalPages - 1;
  const finalActionLabel = '标记已读';
  const endingChapter = story.id === 'lan-death';
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const endingTimerRef = useRef<number | null>(null);
  const [endingTransitioning, setEndingTransitioning] = useState(false);
  const progressId = `reading-reader-progress-${story.id}`;
  const currentBlocks = pages[safePageIndex] ?? [];

  useEffect(() => () => {
    if (endingTimerRef.current !== null) window.clearTimeout(endingTimerRef.current);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus({ preventScroll: true });
  }, [story.id, safePageIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableOrInteractiveTarget(event.target)) return;
      if (event.key === 'ArrowLeft' && safePageIndex > 0) {
        event.preventDefault();
        onPageChange(safePageIndex - 1);
      } else if (event.key === 'ArrowRight' && !isLastPage) {
        event.preventDefault();
        onPageChange(safePageIndex + 1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isLastPage, onPageChange, safePageIndex]);

  const handleEnd = () => {
    if (!onEnd || endingTransitioning) return;
    setEndingTransitioning(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 700;
    endingTimerRef.current = window.setTimeout(() => {
      endingTimerRef.current = null;
      onEnd(safePageIndex, totalPages);
    }, duration);
  };

  return (
    <main className={`reading-reader-page${endingTransitioning ? ' is-ending-transition' : ''}`} aria-label={`${story.title}阅读`} aria-busy={endingTransitioning} data-reading-reader="true">
      <ReadingHeader story={story} pageIndex={safePageIndex} totalPages={totalPages} progressId={progressId} headingRef={headingRef} />
      {totalPages > 0 ? (
        <ReadingPage story={story} pageIndex={safePageIndex} blocks={currentBlocks} progressId={progressId} totalPages={totalPages} />
      ) : (
        <article className="reading-reader-card" aria-labelledby="reading-reader-heading"><p className="reading-reader-empty">正文页面暂不可用。</p></article>
      )}
      {endingChapter && isLastPage ? (
        <div className="reading-reader-ending-action" aria-label="终幕操作">
          <button type="button" className="reading-reader-end-button" onClick={handleEnd} disabled={endingTransitioning}>结束</button>
        </div>
      ) : null}
      <ReadingControls
        pageIndex={safePageIndex}
        totalPages={totalPages}
        isLastPage={isLastPage}
        completed={completed}
        finalActionLabel={finalActionLabel}
        endingChapter={endingChapter}
        onPrevious={() => onPageChange(safePageIndex - 1)}
        onNext={() => onPageChange(safePageIndex + 1)}
        onComplete={() => onComplete?.(safePageIndex, totalPages)}
        onBack={onBack}
      />
      {devTools ? <ReadingDevTools story={story} pageIndex={safePageIndex} totalPages={totalPages} blocks={currentBlocks} tools={devTools} onPageChange={onPageChange} /> : null}
    </main>
  );
}

export default ReadingReader;

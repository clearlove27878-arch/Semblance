import { useRef, useState } from 'react';
import type { CaseClue } from './types';
import { EvidenceImageViewer } from './EvidenceImageViewer';
import { normalizeSearchInput } from '../../core/searchNormalize';

function compareKey(value: string): string {
  return normalizeSearchInput(value);
}

interface MainEvidencePanelProps {
  clue: CaseClue;
  onAddRelation: () => void;
  onCopyName: () => void;
  relationAdded: boolean;
  copied: boolean;
  showTitle?: boolean;
  viewerOpen?: boolean;
  onViewerOpen?: () => void;
  onViewerClose?: () => void;
}

export function MainEvidencePanel({ clue, onAddRelation, onCopyName, relationAdded, copied, showTitle = true, viewerOpen: controlledViewerOpen, onViewerOpen, onViewerClose }: MainEvidencePanelProps) {
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledViewerOpen, setUncontrolledViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = clue.images?.length
    ? clue.images
    : clue.image
      ? [{ src: clue.image, kind: 'evidence' as const }]
      : [];
  const activeImage = images[activeImageIndex] ?? images[0] ?? null;
  const viewerOpen = controlledViewerOpen ?? uncontrolledViewerOpen;
  const openViewer = (index: number) => {
    setActiveImageIndex(index);
    setUncontrolledViewerOpen(true);
    onViewerOpen?.();
  };
  const closeViewer = () => {
    setUncontrolledViewerOpen(false);
    onViewerClose?.();
  };

  return (
    <article className="main-evidence-panel">
      <div className="evidence-heading">
        <p className="eyebrow">{clue.category}</p>
        {showTitle ? <h2>{clue.title}</h2> : null}
        {clue.summary ? <p className="evidence-summary">{clue.summary}</p> : null}
      </div>

      {images.length > 0 ? (
        <div className={`evidence-media-grid${images.length > 1 ? ' is-multiple' : ''}`}>
          {images.map((item, index) => (
            <div className={`evidence-media has-image is-${item.kind}`} key={item.src}>
              <button
                ref={index === activeImageIndex ? imageButtonRef : undefined}
                type="button"
                className="evidence-image-trigger"
                onClick={() => openViewer(index)}
                aria-label={`放大查看${clue.title}${images.length > 1 ? `图片${index + 1}` : ''}`}
              >
                <img src={item.src} alt={`${clue.title}图片${images.length > 1 ? index + 1 : ''}`} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="evidence-copy" aria-label="案件正文">
        <p className="evidence-copy-label">案件正文</p>
        {(clue.bodyBlocks ?? clue.body.map((text) => ({ kind: 'paragraph' as const, text }))).map((block, index) => {
          if (block.kind === 'divider') return <hr className="evidence-divider" key={`${clue.id}-divider-${index}`} />;
          if (block.kind === 'pageBreak') return <div className="evidence-page-break" aria-label={block.label ?? '翻页'} key={`${clue.id}-page-${index}`} />;
          return <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={`${clue.id}-${index}`}>{block.text}</p>;
        })}
      </div>

      {(() => {
        const bodyHighlightKeys = new Set((clue.bodyBlocks ?? []).flatMap((block) => block.kind === 'highlight' ? [compareKey(block.text)] : []));
        const highlights = (clue.visibleHighlights ?? clue.highlights ?? []).filter((highlight) => !bodyHighlightKeys.has(compareKey(highlight)));
        return highlights.length > 0 ? (
        <aside className="evidence-highlights" aria-label="补充正文">
          {highlights.map((highlight) => <p className="content-key-emphasis" key={highlight}>{highlight}</p>)}
        </aside>
        ) : null;
      })()}

      <div className="evidence-actions">
        <button type="button" className="primary-button" onClick={onAddRelation} disabled={relationAdded}>{relationAdded ? '已加入推理' : '加入推理'}</button>
        <button type="button" className="secondary-button" onClick={onCopyName}>{copied ? '已复制名称' : '复制名称'}</button>
      </div>

      {activeImage ? (
        <EvidenceImageViewer
          open={viewerOpen}
          imageSrc={activeImage.src}
          title={clue.displayTitle || clue.title}
          alt={`${clue.displayTitle || clue.title}图片${images.length > 1 ? activeImageIndex + 1 : ''}`}
          onClose={closeViewer}
          restoreFocusRef={imageButtonRef}
        />
      ) : null}
    </article>
  );
}

export default MainEvidencePanel;

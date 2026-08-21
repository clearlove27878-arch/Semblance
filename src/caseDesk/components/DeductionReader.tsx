import type { BodyBlock } from '../../content/types';
import type { StoryContent } from '../content/types';
import { BackToDesk } from './BackToDesk';

interface DeductionReaderProps {
  story: StoryContent;
  unlockedDeductionIds: readonly string[];
  onBackToShelf: () => void;
  onBackToDesk: () => void;
}

function ReadingBlocks({ blocks }: { blocks: readonly BodyBlock[] }) {
  return (
    <div className="deduction-reader-copy">
      {blocks.map((block, index) => {
        if (block.kind === 'divider') return <hr className="reading-divider" key={`divider-${index}`} />;
        if (block.kind === 'pageBreak') return <div className="reading-page-break" aria-label={block.label ?? '段落分隔'} key={`page-${index}`}><span>{block.label ?? ''}</span></div>;
        return <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={`${index}-${block.text.slice(0, 12)}`}>{block.text}</p>;
      })}
    </div>
  );
}

export function DeductionReader({ story, unlockedDeductionIds, onBackToShelf, onBackToDesk }: DeductionReaderProps) {
  if (!unlockedDeductionIds.includes(story.id)) {
    return (
      <main className="deduction-reader-page" aria-labelledby="deduction-reader-title">
        <div className="deduction-reader-frame">
          <header className="deduction-reader-header">
            <button type="button" className="text-button deduction-reader-back" onClick={onBackToShelf}>← 返回推理记录</button>
            <p className="eyebrow">推理记录</p>
            <h1 id="deduction-reader-title">记录未解锁</h1>
          </header>
          <article className="deduction-reader-article">
            <div className="deduction-reader-copy"><p>这条推理记录尚未通过关键词搜索解锁。</p></div>
          </article>
          <footer className="deduction-reader-footer">
            <BackToDesk onClick={onBackToDesk} />
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="deduction-reader-page" aria-labelledby="deduction-reader-title">
      <div className="deduction-reader-frame">
        <header className="deduction-reader-header">
          <button type="button" className="text-button deduction-reader-back" onClick={onBackToShelf}>← 返回推理记录</button>
          <p className="eyebrow">推理记录</p>
          <h1 id="deduction-reader-title">《{story.title}》</h1>
          <p className="deduction-reader-source">小陈的推理</p>
        </header>

        <article className="deduction-reader-article">
          {story.bodyBlocks ? <ReadingBlocks blocks={story.bodyBlocks} /> : (
            <div className="deduction-reader-copy">
              {story.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)}
            </div>
          )}
        </article>

        <footer className="deduction-reader-footer">
          <BackToDesk onClick={onBackToDesk} />
        </footer>
      </div>
    </main>
  );
}

export default DeductionReader;

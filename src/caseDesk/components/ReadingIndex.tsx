import type { CaseState } from '../types';
import { getReadingChapterTitle, READING_INDEX_ENTRIES } from '../readingIndex';

interface ReadingIndexProps {
  state: CaseState;
  notice?: string;
  onOpenEntry: (entry: (typeof READING_INDEX_ENTRIES)[number]) => void;
}

export function ReadingIndex({ state, notice, onOpenEntry }: ReadingIndexProps) {
  return (
    <main className="reading-index-page" aria-labelledby="reading-index-title">
      <div className="reading-index-frame">
        <header className="reading-index-header">
          <p className="eyebrow">阅读索引</p>
          <h1 id="reading-index-title">阅读</h1>
          <p>已经知道的故事可以反复回看；尚未发现的内容会留在这里。</p>
        </header>

        <section className="reading-index-section" aria-label="阅读内容">
          <div className="section-heading">
            <div>
              <p className="eyebrow">内容索引</p>
              <h2>从这里选择要读的内容</h2>
            </div>
          </div>
          <div className="reading-index-grid">
            {READING_INDEX_ENTRIES.map((entry) => {
              const unlocked = entry.kind === 'existing' || state.unlockedReadingChapterIds.includes(entry.id);
              const title = unlocked
                ? entry.kind === 'existing' ? entry.title : getReadingChapterTitle(entry.id)
                : null;
              const available = unlocked && Boolean(title);
              const completed = available && state.completedTerminalIds.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`reading-index-card${available ? ' is-unlocked' : ' is-locked'}`}
                  disabled={!available}
                  aria-label={available ? `打开${title}` : '未发现的阅读内容'}
                  onClick={() => onOpenEntry(entry)}
                >
                  <span className="reading-index-card-status">{available ? completed ? '已读' : '已解锁' : '未发现'}</span>
                  <span className="reading-index-card-title">{available ? title : '？？？'}</span>
                  <span className="reading-index-card-action">{available ? '打开阅读' : '暂不可进入'}</span>
                </button>
              );
            })}
          </div>
        </section>

        {notice ? <p className="reading-index-notice" role="status" aria-live="polite">{notice}</p> : null}
      </div>
    </main>
  );
}

export default ReadingIndex;

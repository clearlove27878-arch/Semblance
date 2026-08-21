import type { DeductionShelfItem } from '../deductionShelfModel';

interface DeductionShelfProps {
  items: readonly DeductionShelfItem[];
  onOpen: (item: DeductionShelfItem) => void;
  onBackToDesk: () => void;
}

export function DeductionShelf({ items, onOpen, onBackToDesk }: DeductionShelfProps) {
  return (
    <main className="deduction-shelf-page" aria-labelledby="deduction-shelf-title">
      <div className="deduction-shelf-frame">
        <header className="deduction-shelf-header">
          <div>
            <p className="eyebrow">推理记录</p>
            <h1 id="deduction-shelf-title">虚构推理</h1>
            <p className="deduction-shelf-lead">一套推理，留在案件桌旁。</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBackToDesk}>返回案件桌</button>
        </header>

        {items.length === 0 ? (
          <p className="deduction-shelf-empty">尚无推理记录。</p>
        ) : (
          <ol className="deduction-shelf-list" aria-label="已发现的推理记录">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className={`deduction-shelf-item${item.unlocked && !item.viewed ? ' is-unread' : ''}${item.unlocked ? '' : ' is-locked'}`} onClick={() => { if (item.unlocked) onOpen(item); }} disabled={!item.unlocked} aria-label={item.unlocked ? `打开已解锁推理记录《${item.title}》` : '推理记录未解锁'}>
                  <span className="deduction-shelf-item-copy">
                    <span className="deduction-shelf-item-meta">推理记录 · 小陈的推理</span>
                    <span className="deduction-shelf-item-title">{item.unlocked ? `《${item.title}》` : item.title}</span>
                  </span>
                  <span className="deduction-shelf-item-state">
                    {item.unlocked ? (!item.viewed ? <span className="deduction-shelf-new" aria-label="未读">新</span> : <span>已读</span>) : <span>未解锁</span>}
                    <span className="deduction-shelf-open">{item.unlocked ? '打开' : 'LOCKED'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

export default DeductionShelf;

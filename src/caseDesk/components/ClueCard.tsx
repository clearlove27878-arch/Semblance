import type { CaseClue } from './types';

interface ClueCardProps {
  item: CaseClue;
  selected?: boolean;
  onSelect: () => void;
}

export function ClueCard({ item, selected = false, onSelect }: ClueCardProps) {
  return (
    <button
      type="button"
      className={`clue-card${selected ? ' is-selected' : ''}${item.viewed ? ' is-viewed' : ' is-unread'}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="clue-card-top">
        <span className="clue-thumb" aria-hidden="true">
          {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span>档</span>}
        </span>
        <span className="clue-status">{item.viewed ? '已阅' : '未阅'}</span>
      </span>
      <span className="clue-card-title">{item.title}</span>
      {item.summary ? <span className="clue-card-summary">{item.summary}</span> : <span className="clue-card-summary clue-card-summary-empty">暂无摘要</span>}
      <span className="clue-card-category">{item.category}</span>
    </button>
  );
}

export default ClueCard;

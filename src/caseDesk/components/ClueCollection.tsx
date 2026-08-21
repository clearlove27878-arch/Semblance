import type { CaseClue } from './types';
import { ClueCard } from './ClueCard';

export type MaterialSectionFilter = 'all' | 'case' | 'police';

interface ClueCollectionProps {
  items: CaseClue[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (item: CaseClue) => void;
  activeSection?: MaterialSectionFilter;
  availableSections?: readonly MaterialSectionFilter[];
  onSectionChange?: (section: MaterialSectionFilter) => void;
}

export const MATERIAL_SECTION_LABELS: Record<MaterialSectionFilter, string> = {
  all: '全部已解锁',
  case: '案件资料',
  police: '警方调查'
};

export function ClueCollection({ items, totalCount, selectedId, onSelect, activeSection = 'all', availableSections = ['all'], onSectionChange }: ClueCollectionProps) {
  return (
    <section id="case-materials" className="clue-collection" aria-labelledby="clue-collection-title">
      <div className="section-heading clue-collection-heading">
        <div>
          <p className="eyebrow">调查索引下的已解锁内容</p>
          <h2 id="clue-collection-title">已解锁案件材料</h2>
        </div>
        <span className="section-count" aria-label={`共 ${totalCount} 条线索`}>{items.length === totalCount ? totalCount : `${items.length}/${totalCount}`}</span>
      </div>
      {onSectionChange && availableSections.length > 1 ? (
        <div className="clue-collection-filters" role="tablist" aria-label="案件资料范围">
            {availableSections.map((section) => (
            <button key={section} type="button" role="tab" aria-selected={activeSection === section} className={`clue-collection-filter${activeSection === section ? ' is-active' : ''}`} onClick={() => onSectionChange(section)}>{MATERIAL_SECTION_LABELS[section]}</button>
          ))}
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="clue-collection-scroll">
          {items.map((item) => <ClueCard key={item.id} item={item} selected={item.id === selectedId} onSelect={() => onSelect(item)} />)}
        </div>
      ) : (
        <p className="clue-empty">没有匹配的线索。</p>
      )}
    </section>
  );
}

export default ClueCollection;

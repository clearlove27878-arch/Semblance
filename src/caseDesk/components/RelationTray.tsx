import type { RelationChipData } from './types';
import { RelationChip } from './RelationChip';

interface RelationTrayProps {
  items: RelationChipData[];
  maxObjects?: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAddObject?: () => void;
}

export function RelationTray({ items, maxObjects = 4, onRemove, onClear, onAddObject }: RelationTrayProps) {
  return (
    <section className="relation-tray" aria-label="推理对象">
      <div className="relation-tray-heading">
        <span>推理对象</span>
        <span className="relation-tray-count">{items.length}/{maxObjects}</span>
        {items.length > 0 ? <button type="button" className="relation-clear" onClick={onClear}>清空</button> : null}
        {onAddObject ? <button type="button" className="relation-add-object" onClick={onAddObject}>＋ 添加对象</button> : null}
      </div>
      <div className="relation-chip-list">
        {items.length > 0 ? items.map((item) => <RelationChip key={item.id} item={item} onRemove={() => onRemove(item.id)} />) : <span className="relation-empty">从线索详情加入对象</span>}
      </div>
    </section>
  );
}

export default RelationTray;

import type { RelationChipData } from './types';

interface RelationChipProps {
  item: RelationChipData;
  onRemove: () => void;
}

export function RelationChip({ item, onRemove }: RelationChipProps) {
  return (
    <span className="relation-chip">
      <span>{item.label}</span>
      <button type="button" onClick={onRemove} aria-label={`移除 ${item.label}`}>×</button>
    </span>
  );
}

export default RelationChip;

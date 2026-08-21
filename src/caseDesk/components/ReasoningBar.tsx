import { useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { RelationChipData, ReasoningMode } from './types';
import { RelationTray } from './RelationTray';

interface ReasoningBarProps {
  mode: ReasoningMode;
  query: string;
  relationChips: RelationChipData[];
  onModeChange: (mode: ReasoningMode) => void;
  onQueryChange: (value: string) => void;
  onRemoveRelation: (id: string) => void;
  onClearRelations: () => void;
  onSubmit?: () => void;
  onOpenObjectPicker?: () => void;
  relationMaxObjects?: number;
  inputDisabled?: boolean;
  modeLocked?: boolean;
  submitDisabled?: boolean;
  autoFocus?: boolean;
}

const MODE_LABELS: Record<ReasoningMode, string> = {
  search: '搜索',
  answer: '答案',
  relation: '关系'
};

export function shouldSubmitReasoningBarEnter({
  key,
  shiftKey,
  inputDisabled,
  mode,
  isComposing,
  keyCode
}: {
  key: string;
  shiftKey: boolean;
  inputDisabled: boolean;
  mode: ReasoningMode;
  isComposing: boolean;
  keyCode: number;
}): boolean {
  return key === 'Enter'
    && !shiftKey
    && !inputDisabled
    && (mode === 'answer' || mode === 'search')
    && !isComposing
    && keyCode !== 229;
}

export function ReasoningBar({ mode, query, relationChips, onModeChange, onQueryChange, onRemoveRelation, onClearRelations, onSubmit, onOpenObjectPicker, relationMaxObjects = 4, inputDisabled = false, modeLocked = false, submitDisabled = false, autoFocus = false }: ReasoningBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const placeholder = mode === 'search' ? '搜索线索……' : mode === 'answer' ? '输入你的判断……' : '从线索详情加入对象';

  useEffect(() => {
    if (autoFocus && !inputDisabled) inputRef.current?.focus();
  }, [autoFocus, inputDisabled]);

  const submit = () => {
    if (inputDisabled || submitDisabled) return;
    onSubmit?.();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composingRef.current) return;
    submit();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!shouldSubmitReasoningBarEnter({
      key: event.key,
      shiftKey: event.shiftKey,
      inputDisabled,
      mode,
      isComposing: composingRef.current || event.nativeEvent.isComposing,
      keyCode: event.keyCode
    })) return;
    event.preventDefault();
    submit();
  };

  return (
    <footer className="reasoning-bar-wrap">
      <div className="reasoning-bar-content">
        <RelationTray items={relationChips} maxObjects={relationMaxObjects} onRemove={onRemoveRelation} onClear={onClearRelations} onAddObject={onOpenObjectPicker} />
        <form className="reasoning-bar" aria-label="搜索与推理栏" onSubmit={handleFormSubmit}>
          <div className="reasoning-modes" role="tablist" aria-label="输入模式">
            {(Object.keys(MODE_LABELS) as ReasoningMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className={`reasoning-mode${mode === item ? ' is-active' : ''}`} disabled={modeLocked && mode !== item} onClick={() => onModeChange(item)}>{MODE_LABELS[item]}</button>)}
          </div>
          <label className="reasoning-input-wrap">
            <span className="reasoning-icon" aria-hidden="true">⌕</span>
            <span className="sr-only">{MODE_LABELS[mode]}输入</span>
            <input ref={inputRef} value={query} onChange={(event) => onQueryChange(event.target.value)} onKeyDown={handleKeyDown} onCompositionStart={() => { composingRef.current = true; }} onCompositionEnd={() => { composingRef.current = false; }} placeholder={placeholder} disabled={inputDisabled} aria-label={`${MODE_LABELS[mode]}输入`} />
          </label>
          {mode === 'search' ? <button type="submit" className="primary-button reasoning-submit" onClick={(event) => { event.preventDefault(); submit(); }} disabled={inputDisabled || submitDisabled}>搜索</button> : null}
          {mode === 'answer' ? <button type="button" className="primary-button reasoning-submit" onClick={onSubmit} disabled={inputDisabled || submitDisabled}>{inputDisabled ? '已完成' : '提交判断'}</button> : null}
          {mode === 'relation' ? <span className="reasoning-hint">选择线索后加入</span> : null}
        </form>
      </div>
    </footer>
  );
}

export default ReasoningBar;

import { useState, type ReactNode } from 'react';
import type { EvidenceId } from '../core/types';

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title ? <h2>{title}</h2> : null}{children}</section>;
}

export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'quiet' | 'attention' }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function Choice({ selected, children, onClick, disabled = false }: { selected?: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={`choice ${selected ? 'is-selected' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function EvidenceButton({ id, title, selected, onClick, disabled = false }: { id: EvidenceId; title: string; selected?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={`evidence-button ${selected ? 'is-selected' : ''}`} onClick={onClick} disabled={disabled}>
    <span className="evidence-id">{id}</span><span>{title}</span>
  </button>;
}

export function TextField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function TextAreaField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="field"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function SubmitButton({ children = '提交推理', disabled = false, onClick }: { children?: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className="primary-button" disabled={disabled} onClick={onClick}>{children}</button>;
}

export function SecondaryButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="secondary-button" onClick={onClick} disabled={disabled}>{children}</button>;
}

export function EvidenceShelf({ items, selected, onToggle, title = '可用材料' }: { items: Array<{ id: EvidenceId; title: string }>; selected?: EvidenceId[]; onToggle: (id: EvidenceId) => void; title?: string }) {
  return <div className="evidence-shelf"><h3>{title}</h3><div className="evidence-grid">{items.map((item) => <EvidenceButton key={item.id} id={item.id} title={item.title} selected={selected?.includes(item.id)} onClick={() => onToggle(item.id)} />)}</div></div>;
}

export function EvidenceModal({ title, body, onClose }: { title: string; body: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card"><div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="关闭">×</button></div><div className="modal-body">{body}</div><SecondaryButton onClick={onClose}>返回当前调查</SecondaryButton></div></div>;
}

export function StageFooter({ children }: { children: ReactNode }) {
  return <div className="stage-footer">{children}</div>;
}

export function SupplementalAnswer({ label = '其他回答', placeholder = '补充回答', onSubmit }: { label?: string; placeholder?: string; onSubmit: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  if (!open) return <div className="supplemental-answer"><button type="button" className="supplemental-toggle" onClick={() => setOpen(true)}>{label}</button></div>;
  return <div className="supplemental-answer supplemental-open"><label className="field"><span>{placeholder}</span><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /></label><div className="supplemental-actions"><SecondaryButton onClick={() => { onSubmit(value); setValue(''); }}>提交补充回答</SecondaryButton><button type="button" className="text-button" onClick={() => setOpen(false)}>收起</button></div></div>;
}

export function StageIntro({ question, children }: { question: string; children?: ReactNode }) {
  return <div className="stage-intro"><p className="question">{question}</p>{children}</div>;
}

export function useModal() {
  const [active, setActive] = useState<{ title: string; body: ReactNode } | null>(null);
  return { active, open: (title: string, body: ReactNode) => setActive({ title, body }), close: () => setActive(null) };
}

export function SimpleEvidenceList({ items, onOpen }: { items: Array<{ id: EvidenceId; title: string; body: ReactNode }>; onOpen: (item: { id: EvidenceId; title: string; body: ReactNode }) => void }) {
  return <div className="evidence-list">{items.map((item) => <div key={item.id} className="evidence-row"><div><span className="evidence-id">{item.id}</span><strong>{item.title}</strong></div><SecondaryButton onClick={() => onOpen(item)}>查看</SecondaryButton></div>)}</div>;
}

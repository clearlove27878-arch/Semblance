import { useMemo } from 'react';
import { getInvestigationNavModel } from '../navigation/investigationNav';
import type { InvestigationNavState, NavRouteTarget, NavSectionId } from '../navigation/types';

interface InvestigationNavProps {
  state: InvestigationNavState;
  activeSection?: NavSectionId | null;
  activeGateId?: InvestigationNavState['solvedGateIds'][number] | null;
  onNavigate: (target: NavRouteTarget) => void;
}

function UnreadMark({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="investigation-nav-unread" aria-label={`${count} 条未读`}>{count}</span>;
}

function SectionButton({
  section,
  onClick,
  compact = false,
  mobile = false
}: {
  section: ReturnType<typeof getInvestigationNavModel>['sections'][number];
  onClick: () => void;
  compact?: boolean;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      className={`investigation-nav-section${section.active ? ' is-active' : ''}${section.status === 'active' ? ' is-current' : ''}${compact ? ' is-sheet-item' : ''}${mobile ? ' is-mobile-item' : ''}`}
      aria-current={section.active ? 'location' : undefined}
      data-section-id={section.id}
      onClick={onClick}
    >
      <span className="investigation-nav-section-main">
        <span className="investigation-nav-section-label">{section.label}</span>
        <UnreadMark count={section.unreadCount} />
      </span>
      {section.detail ? <small>{section.detail}</small> : null}
      {import.meta.env.DEV ? <small className="investigation-nav-debug">{section.id} · {section.status ?? 'open'}</small> : null}
    </button>
  );
}

export function InvestigationNav({ state, activeSection = null, activeGateId = null, onNavigate }: InvestigationNavProps) {
  const model = useMemo(() => getInvestigationNavModel(state, { activeSection, activeGateId }), [activeGateId, activeSection, state]);

  const navigate = (target: NavRouteTarget) => {
    onNavigate(target);
  };

  return (
    <nav className={`investigation-nav${model.terminalMode ? ' is-terminal-mode' : ''}`} aria-label="调查索引">
      <div className="investigation-nav-desktop">
        <span className="investigation-nav-kicker">调查索引</span>
        <div className="investigation-nav-rail" role="list">
          {model.sections.map((section, index) => (
            <div className="investigation-nav-rail-item" role="listitem" key={section.id}>
              <SectionButton section={section} onClick={() => navigate(section.routeTarget)} />
              {index < model.sections.length - 1 ? <span className="investigation-nav-divider" aria-hidden="true">—</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="investigation-nav-mobile">
        <span className="investigation-nav-mobile-label">调查索引</span>
        <div className="investigation-nav-mobile-list" role="list" aria-label="已开放的调查区域">
          {model.sections.map((section) => <SectionButton key={section.id} section={section} mobile onClick={() => navigate(section.routeTarget)} />)}
        </div>
      </div>
    </nav>
  );
}

export default InvestigationNav;

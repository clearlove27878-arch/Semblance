import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinalEndingView } from '../src/caseDesk/FinalEndingView';
import { AUTHOR_CREDIT } from '../src/visual/AuthorCredit';

describe('FinalEndingView', () => {
  it('renders the Hanzi ending, shared author credit, and quiet return button', () => {
    const html = renderToStaticMarkup(createElement(FinalEndingView, { onReturnToStart: () => undefined }));

    expect(html).toContain('终幕');
    expect(html).toContain('final-ending-mark');
    expect(html).toContain(AUTHOR_CREDIT);
    expect(html).toContain('final-ending-return-button');
    expect(html).toContain('回到开头');
    expect(html).not.toContain('THE END');
    expect(html).not.toContain('Credits');
    expect(html).not.toContain('通关');
  });
});

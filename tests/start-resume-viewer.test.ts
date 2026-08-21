import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialCaseState } from '../src/caseDesk/state';
import { EvidenceImageViewer, clampEvidenceImageScale } from '../src/caseDesk/components/EvidenceImageViewer';
import { CASE_DESK_SAVE_KEY, loadCaseDeskState } from '../src/caseDesk/persistence';
import { hasValidProgress, StartResume } from '../src/StartResume';

describe('StartResume', () => {
  it('untouched state shows only the neutral start action', () => {
    const state = createInitialCaseState();
    expect(hasValidProgress(state)).toBe(false);
    const html = renderToStaticMarkup(createElement(StartResume, {
      hasValidProgress: false,
      onStart: () => undefined,
      onResume: () => undefined,
      onReset: () => undefined
    }));

    expect(html).toContain('开始调查');
    expect(html).not.toContain('继续调查');
    expect(html).not.toContain('尸体');
    expect(html).not.toContain('真凶');
  });

  it('progress state shows continue and a weaker reset entry without plot text', () => {
    const state = { ...createInitialCaseState(), screen: 'DESK' as const };
    expect(hasValidProgress(state)).toBe(true);
    const html = renderToStaticMarkup(createElement(StartResume, {
      hasValidProgress: true,
      onStart: () => undefined,
      onResume: () => undefined,
      onReset: () => undefined
    }));

    expect(html).toContain('继续调查');
    expect(html).toContain('重新开始');
    expect(html).not.toContain('四个 Force');
    expect(html).not.toContain('蛇符');
    expect(html).not.toContain('岚');
  });

  it('incompatible progress is explained without exposing storage details', () => {
    const html = renderToStaticMarkup(createElement(StartResume, {
      hasValidProgress: false,
      saveStatus: 'incompatible',
      onStart: () => undefined,
      onResume: () => undefined,
      onReset: () => undefined
    }));

    expect(html).toContain('现有调查记录无法恢复');
    expect(html).toContain('重新开始调查');
    expect(html).not.toContain('flowVersion');
    expect(html).not.toContain('localStorage');
  });

  it('corrupt storage is reported as incompatible instead of throwing', () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = {
      getItem: (key: string) => key === CASE_DESK_SAVE_KEY ? '{not-json' : null,
      setItem: () => undefined,
      removeItem: () => undefined
    };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      expect(loadCaseDeskState()).toMatchObject({ incompatible: true, legacySaveDetected: false });
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe('EvidenceImageViewer', () => {
  it('renders a player-safe image URL, title and accessible controls without imageRef', () => {
    const html = renderToStaticMarkup(createElement(EvidenceImageViewer, {
      open: true,
      imageSrc: '/content-assets/m02-c-start-tape.png',
      imageRef: 'private-label.png',
      title: '“始”磁带',
      onClose: () => undefined
    }));

    expect(html).toContain('/content-assets/m02-c-start-tape.png');
    expect(html).toContain('“始”磁带');
    expect(html).toContain('关闭图片查看器');
    expect(html).toContain('放大图片');
    expect(html).toContain('缩小图片');
    expect(html).toContain('重置图片大小');
    expect(html).not.toContain('private-label.png');
  });

  it('provides a graceful missing-image state and clamps zoom', () => {
    const html = renderToStaticMarkup(createElement(EvidenceImageViewer, {
      open: true,
      imageSrc: null,
      imageRef: 'private-path.png',
      title: '图片证据',
      onClose: () => undefined
    }));

    expect(html).toContain('图片暂时无法显示');
    expect(html).not.toContain('private-path.png');
    expect(clampEvidenceImageScale(0)).toBe(1);
    expect(clampEvidenceImageScale(99)).toBe(4);
  });

  it('does not render when closed', () => {
    const html = renderToStaticMarkup(createElement(EvidenceImageViewer, {
      open: false,
      imageSrc: '/content-assets/wang-collage-photo.png',
      title: '王峥的拼接照片',
      onClose: () => undefined
    }));
    expect(html).toBe('');
  });
});

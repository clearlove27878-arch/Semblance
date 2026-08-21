import { describe, expect, it } from 'vitest';
import { getDeductionShelfItems, validateDeductionRegistry, validateUnlockedDeductionIds } from '../src/caseDesk/deductionShelfModel';
import { contentRegistry } from '../src/content/ContentRegistry';
import { getReasoningObjects } from '../src/content/ReasoningObjectRegistry';

describe('DeductionShelf 内容边界与状态模型', () => {
  it('四篇正式虚构推理均来自 Registry，标题、类型和正文有效', () => {
    expect(validateDeductionRegistry()).toEqual([]);

    const records = ['story-letter', 'story-question', 'story-silent-letter', 'story-snake-bride'].map((id) => contentRegistry.getStory(id));
    expect(records.every((record) => record?.type === 'fictional_deduction')).toBe(true);
    expect(records.every((record) => record?.displayTitle && record.body.length > 0)).toBe(true);
    expect(JSON.stringify(records)).not.toContain('internalNotes');
  });

  it('按正式编号显示全部记录，未解锁项目只显示占位而不泄露标题', () => {
    const items = getDeductionShelfItems(['story-silent-letter', 'story-letter', 'unknown-id'], []);
    expect(items.map((item) => item.id)).toEqual(['story-letter', 'story-question', 'story-silent-letter', 'story-snake-bride']);
    expect(items.map((item) => item.title)).toEqual(['磁带传音', '???', '无字情书', '???']);
    expect(items.map((item) => item.unlocked)).toEqual([true, false, true, false]);
    expect(JSON.stringify(items.filter((item) => !item.unlocked))).not.toContain('往日重现');
    expect(JSON.stringify(items.filter((item) => !item.unlocked))).not.toContain('蛇选新娘');
  });

  it('unread 由 unlocked 与 viewed 的差集派生，阅读后只变为 viewed', () => {
    const unread = getDeductionShelfItems(['story-letter', 'story-question'], []);
    expect(unread.filter((item) => item.unlocked).map((item) => item.viewed)).toEqual([false, false]);

    const viewed = getDeductionShelfItems(['story-letter', 'story-question'], ['story-letter']);
    expect(viewed.filter((item) => item.unlocked).map((item) => item.viewed)).toEqual([true, false]);
  });

  it('非法 unlockedDeductionIds 不会被 Shelf 消费', () => {
    expect(validateUnlockedDeductionIds(['story-letter', 'story-letter', 'not-a-deduction'])).toEqual(['not-a-deduction']);
  });

  it('四篇虚构推理不注册为 ReasoningObject', () => {
    const deductionIds = new Set(['story-letter', 'story-question', 'story-silent-letter', 'story-snake-bride']);
    expect(getReasoningObjects().some((object) => deductionIds.has(object.id))).toBe(false);
    expect(getReasoningObjects().some((object) => object.sourceContentIds.some((id) => deductionIds.has(id)))).toBe(false);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContentValidationError, parseGate, parsePlainContent } from '../scripts/content-parser.mjs';
import { contentRegistry } from '../src/content/ContentRegistry';
import { loadDeskContent, loadReadingChapter, loadPrologue, loadStory } from '../src/caseDesk/contentLoader';
import { CASE_DESK_SAVE_KEY, loadCaseDeskState, saveCaseDeskState } from '../src/caseDesk/persistence';
import { REASONING_DRAFTS_KEY } from '../src/caseDesk/reasoningDraftPersistence';
import {
  acknowledgeLingReflection,
  advanceAftermath,
  advanceEvidence,
  advanceInvestigation,
  advanceInvestigationAfterForce,
  advancePoliceHalt,
  advanceRitual,
  continueIntro,
  createInitialCaseState,
  enterEnding,
  finishEnding,
  INTRO_STEP_COUNT,
  markForceOpened,
  markMaterialViewed,
  passMethodGate,
  passSnakeGate,
  passTappingGate,
  startCase,
  SCENE_MATERIAL_IDS,
  HOME_FIRST_MATERIAL_IDS,
  HOME_SECOND_MATERIAL_IDS
} from '../src/caseDesk/state';
import { FINAL_GATE_DEFINITION, FORCE_GATE_DEFINITION, FORMAL_GATE_DEFINITIONS, TAPPING_GATE_DEFINITION } from '../src/caseDesk/gates/caseGateDefinitions';
import { matchesAcceptedTextAnswer, matchesFinalSlots, matchesPartialTextAnswer, matchesRelationSet, normalizeTextAnswer } from '../src/caseDesk/gates/reasoningGate';
import { clampReadingPageIndex, getReadingReaderPages } from '../src/caseDesk/components/readingReaderModel';
import { filterClues, materialToClue } from '../src/caseDesk/components/types';
import { shouldSubmitReasoningBarEnter } from '../src/caseDesk/components/ReasoningBar';
import { ReasoningGate } from '../src/caseDesk/components/ReasoningGate';
import { normalizeSearchInput } from '../src/core/searchNormalize';
import { PRODUCTION_FLOW } from '../src/caseDesk/flow/flowDefinition';

const generatedPlayerData = JSON.parse(readFileSync(fileURLToPath(new URL('../src/content/generated/content.player.generated.json', import.meta.url)), 'utf8')) as {
  sourceRoot?: unknown;
  contents: Array<Record<string, unknown>>;
  gates: Array<Record<string, unknown>>;
};
const generatedRuntimeData = JSON.parse(readFileSync(fileURLToPath(new URL('../src/content/generated/content.runtime.generated.json', import.meta.url)), 'utf8')) as {
  gates: Array<Record<string, unknown>>;
};
const authoringSummary = JSON.parse(readFileSync(fileURLToPath(new URL('../src/content/generated/content.registry.summary.json', import.meta.url)), 'utf8')) as {
  entries: Array<{ id: string; sourcePath?: string }>;
};

function enterDesk() {
  let state = startCase(createInitialCaseState());
  for (let index = 0; index < INTRO_STEP_COUNT; index += 1) state = continueIntro(state);
  return state;
}

function viewMaterials(state: ReturnType<typeof createInitialCaseState>, ids: readonly string[]) {
  return ids.reduce((next, id) => markMaterialViewed(next, id), state);
}

function reachTappingGate() {
  let state = enterDesk();
  state = viewMaterials(state, SCENE_MATERIAL_IDS);
  state = advanceInvestigation(state);
  state = viewMaterials(state, HOME_FIRST_MATERIAL_IDS);
  state = advanceInvestigation(state);
  state = viewMaterials(state, HOME_SECOND_MATERIAL_IDS);
  return advanceInvestigation(state);
}

function reachPeople() {
  return passTappingGate(reachTappingGate());
}

describe('ContentRegistry 源接入与玩家安全边界', () => {
  it('构建结果覆盖 34 份网页文本源和 3 个 Gate', () => {
    expect(contentRegistry.getAllContents()).toHaveLength(34);
    expect(contentRegistry.getAllGates()).toHaveLength(3);
    const ids = contentRegistry.getAllContents().map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(contentRegistry.getSummary().counts).toMatchObject({
      prologue: 1,
      case_clue: 11,
      police_clue: 6,
      visual_clue: 2,
      recording: 1,
      fictional_deduction: 4,
      terminal_chapter: 9,
      gate: 3
    });
  });

  it('PLAYER/runtime payload 去除 authoring metadata，但构建摘要仍保留源路径', () => {
    expect(generatedPlayerData).not.toHaveProperty('sourceRoot');
    expect(generatedPlayerData.contents.every((item) => !Object.prototype.hasOwnProperty.call(item, 'sourcePath'))).toBe(true);
    expect(generatedPlayerData.gates.every((item) => !Object.prototype.hasOwnProperty.call(item, 'sourcePath'))).toBe(true);
    expect(generatedRuntimeData.gates.every((item) => !Object.prototype.hasOwnProperty.call(item, 'sourcePath'))).toBe(true);
    expect(authoringSummary.entries.find((item) => item.id === 'forensic-report')?.sourcePath).toBe('案件文本/03_法医鉴定.txt');
    expect(contentRegistry.getSummary()).not.toHaveProperty('sourceRoot');
  });

  it('保留稳定 ID、搜索别名、重点句、分页和图片映射', () => {
    const forensic = contentRegistry.getClueById('forensic-report');
    const prologue = contentRegistry.getPrologue();
    const tape = contentRegistry.getContentById('tape-supplement');
    expect(forensic).not.toHaveProperty('sourcePath');
    expect(contentRegistry.searchContent('蛇毒').map((item) => item.id)).toContain('forensic-report');
    expect(contentRegistry.searchContent('拼接照片').map((item) => item.id)).toContain('wang-collage-photo');
    expect(contentRegistry.searchContent('王峥的拼接照片').map((item) => item.id)).toContain('wang-collage-photo');
    expect(contentRegistry.searchContent('一个患者').map((item) => item.id)).toContain('statement-wang');
    expect(contentRegistry.searchContent('匿名推荐').map((item) => item.id)).toContain('statement-wang');
    expect(contentRegistry.getContentById('statement-ling')).toMatchObject({ title: '许玲｜警方已知', displayTitle: '玲｜警方已知' });
    expect(forensic?.visibleHighlights.length).toBeGreaterThan(0);
    expect(prologue?.pages).toHaveLength(6);
    expect(prologue?.bodyBlocks.some((block) => block.kind === 'pageBreak')).toBe(true);
    expect(tape?.imageRef).toBe('m02-c-start-tape.png');
    expect(tape?.image).toBe('/content-assets/m02-c-start-tape.png');
    expect(tape?.images).toEqual([{ src: '/content-assets/m02-c-start-tape.png', kind: 'evidence' }]);
    expect(contentRegistry.getClueById('feng-home')?.images).toEqual([
      { src: '/content-assets/feng-home-floor-plan.png', kind: 'scene' },
      { src: '/content-assets/feng-home-exterior.png', kind: 'scene' }
    ]);
    expect(contentRegistry.getClueById('snake-charm')?.images).toHaveLength(2);
    expect(contentRegistry.getContentById('statement-ling')?.images).toEqual([
      { src: '/content-assets/xu-ling-profile.png', kind: 'portrait' }
    ]);
  });

  it('警方阶段释放振华磁带资料，六个正式输入均指向同一内容', () => {
    const zhenhua = contentRegistry.getContentById('zhenhua-investigation-initial');
    expect(zhenhua).toBeDefined();
    expect(PRODUCTION_FLOW.policeInvestigationContentIds).toContain('zhenhua-investigation-initial');
    for (const input of ['振华磁带调查', '赵振华带回的磁带', '振华磁带', '清洗磁带', '黄色磁带', '儿童故事带']) {
      expect(contentRegistry.searchContent(input, ['zhenhua-investigation-initial']).map((item) => item.id)).toEqual(['zhenhua-investigation-initial']);
    }
  });

  it('基础搜索 Normalize 在案件资料中接受书名号和不可见空格', () => {
    expect(normalizeSearchInput('  《死亡现场》  ')).toBe('死亡现场');
    expect(normalizeSearchInput('磁\u200B带传音')).toBe('磁带传音');
    const deathScene = contentRegistry.getClueById('death-scene');
    expect(deathScene).toBeDefined();
    expect(filterClues([materialToClue(deathScene!, false)], '《死亡现场》').map((item) => item.id)).toEqual(['death-scene']);
  });

  it('手指伤口不再作为两个资料的人工 alias', () => {
    expect(contentRegistry.getClueById('body-injuries')?.aliases).not.toContain('手指伤口');
    expect(contentRegistry.getClueById('feng-hand-injury')?.aliases).not.toContain('手指伤口');
    expect(contentRegistry.searchContent('拇指伤口', ['body-injuries', 'feng-hand-injury']).map((item) => item.id)).toEqual(['body-injuries']);
    expect(contentRegistry.searchContent('中指伤', ['body-injuries', 'feng-hand-injury']).map((item) => item.id)).toEqual(['feng-hand-injury']);
  });

  it('玩家 JSON 不含内部备注或 Gate 判定字段', () => {
    const serialized = JSON.stringify({ contents: contentRegistry.getAllContents(), gates: contentRegistry.getAllGates() });
    expect(serialized).not.toContain('内部备注');
    expect(serialized).not.toContain('内部判定规则');
    expect(serialized).not.toContain('内部槽位映射');
    expect(serialized).not.toContain('Codex开发指令');
    expect(serialized).not.toContain('[重点]');
    expect(serialized).not.toContain('【重点】');
  });
});

describe('网页正文解析与长阅读', () => {
  it('未知字段和缺失 PLAYER正文会在 build-time 严格失败', () => {
    const manifest = { id: 'inline', type: 'case_clue', category: '测试', images: {} };
    expect(() => parsePlainContent({
      raw: '[显示标题]\n\n测试\n\n[PLAYER正文]\n\n正文\n\n[未知字段]\n\n不能静默忽略',
      file: 'inline-unknown.txt',
      manifest
    })).toThrowError(ContentValidationError);
    expect(() => parsePlainContent({
      raw: '[显示标题]\n\n测试',
      file: 'inline-missing.txt',
      manifest
    })).toThrowError(/PLAYER正文/);
  });

  it('图片字段允许多行但拒绝重复或未登记引用', () => {
    const manifest = {
      id: 'inline-images',
      type: 'case_clue',
      category: '测试',
      images: {
        'inline-images.txt::one.png': { publicPath: '/content-assets/one.png', kind: 'scene' },
        'inline-images.txt::two.png': { publicPath: '/content-assets/two.png', kind: 'evidence' }
      }
    };
    expect(parsePlainContent({
      raw: '[显示标题]\n\n测试\n\n[PLAYER正文]\n\n正文\n\n[图片]\n\none.png\ntwo.png',
      file: 'inline-images.txt',
      manifest
    }).images).toEqual([
      { src: '/content-assets/one.png', kind: 'scene' },
      { src: '/content-assets/two.png', kind: 'evidence' }
    ]);
    expect(() => parsePlainContent({
      raw: '[显示标题]\n\n测试\n\n[PLAYER正文]\n\n正文\n\n[图片]\n\none.png\none.png',
      file: 'inline-images.txt',
      manifest
    })).toThrowError(/不得重复/);
    expect(() => parsePlainContent({
      raw: '[显示标题]\n\n测试\n\n[PLAYER正文]\n\n正文\n\n[图片]\n\nmissing.png',
      file: 'inline-images.txt',
      manifest
    })).toThrowError(/没有建立 asset mapping/);
  });

  it('统一解析 [重点] 与 【重点】 为单个 highlight block，并在下一普通 block 恢复', () => {
    const parsed = parsePlainContent({
      raw: '[显示标题]\n\n测试\n\n[PLAYER正文]\n\n普通 A\n\n[重点]\n\n重点 B\n\n普通 C\n\n【重点】\n\n重点 D',
      file: 'inline-emphasis.txt',
      manifest: { id: 'inline-emphasis', type: 'case_clue', category: '测试', images: {} }
    });
    expect(parsed.bodyBlocks.filter((block) => block.kind === 'paragraph' || block.kind === 'highlight').map((block) => [block.kind, block.text])).toEqual([
      ['paragraph', '普通 A'],
      ['highlight', '重点 B'],
      ['paragraph', '普通 C'],
      ['highlight', '重点 D']
    ]);
    expect(JSON.stringify(parsed)).not.toContain('[重点]');
    expect(JSON.stringify(parsed)).not.toContain('【重点】');
  });

  it('支持显式多行重点块，并保留块内换行与既有 highlight 语义', () => {
    const parsed = parsePlainContent({
      raw: '[显示标题]\n\n测试章节\n\n[PLAYER正文]\n\n普通 A\n\n[重点开始]\n\n行一\n行二\n行三\n\n[重点结束]\n\n普通 B',
      file: 'inline-multiline-emphasis.txt',
      manifest: { id: 'inline-multiline-emphasis', type: 'terminal_chapter', category: '测试', images: {} }
    });
    expect(parsed.bodyBlocks.filter((block) => block.kind === 'paragraph' || block.kind === 'highlight').map((block) => [block.kind, block.text])).toEqual([
      ['paragraph', '普通 A'],
      ['highlight', '行一\n行二\n行三'],
      ['paragraph', '普通 B']
    ]);
    expect(JSON.stringify(parsed)).not.toContain('重点开始');
    expect(JSON.stringify(parsed)).not.toContain('重点结束');
  });

  it('Gate 文本沿用同一重点语义，玩家字符串不保留控制标记', () => {
    const gate = parseGate({
      raw: '[显示标题]\n\n测试 Gate\n\n[PLAYER问题]\n\n普通问题\n\n【重点】\n\n重点问题\n\n[输入方式]\n\n输入答案\n\n[可接受答案]\n\n正确\n\n[部分正确反馈]\n\n再想想\n\n[错误反馈]\n\n不对\n\n[通过反馈]\n\n通过\n\n[通过后揭露]\n\n揭露',
      file: 'inline-gate-emphasis.txt',
      manifest: { id: 'inline-gate-emphasis', type: 'text_answer' },
      objectMap: {}
    });
    expect(gate.promptTextBlocks).toEqual([
      { kind: 'paragraph', text: '普通问题' },
      { kind: 'highlight', text: '重点问题' }
    ]);
    expect(JSON.stringify(gate)).not.toContain('[重点]');
    expect(JSON.stringify(gate)).not.toContain('【重点】');
  });

  it('保留重点块和正式阅读章节，不把正文重新拆章', async () => {
    const prologue = loadPrologue();
    expect(prologue.pages).toHaveLength(6);
    expect(prologue.bodyBlocks.some((block) => block.kind === 'highlight')).toBe(true);

    const stories = await Promise.all(['story-letter', 'story-question', 'story-silent-letter', 'story-snake-bride'].map(loadStory));
    expect(stories.map((story) => story.title)).toEqual(['磁带传音', '往日重现', '无字情书', '蛇选新娘']);
    for (const story of stories) expect(story.paragraphs.length).toBeGreaterThan(60);

    const lanPast = await loadReadingChapter('lan-past');
    const snakebite = await loadReadingChapter('lan-snakebite');
    expect(lanPast.title).toBe('岚的过去');
    expect(snakebite.title).toBe('蛇咬');
    expect(lanPast.paragraphs[0]).toContain('我从医学院毕业那年');
    expect(snakebite.paragraphs.at(-1)).toContain('不知道');
    expect(lanPast.openingImage).toEqual({ src: '/content-assets/cheng-lan-profile.png', kind: 'portrait' });
    expect(snakebite.endingImage).toEqual({ src: '/content-assets/插画/L02_似_岚从枫侧后方低语.png', kind: 'scene' });
  });

  it('阅读器只使用 Registry 的九个正式章节，页内不重新分页且没有空页或重复重点句', async () => {
    const chapterIds = [
      'novel-ling',
      'novel-feng',
      'lan-past',
      'lan-and-zheng',
      'lan-leaving-and-threat',
      'lan-first-meeting',
      'lan-snakebite',
      'lan-case-day',
      'lan-death'
    ];
    const chapters = await Promise.all(chapterIds.map(loadReadingChapter));
    expect(chapters.map((chapter) => chapter.title)).toEqual(['玲', '枫', '岚的过去', '岚与峥', '离开与威胁', '初识', '蛇咬', '案发当日', '岚之死']);

    for (const chapter of chapters) {
      const pages = getReadingReaderPages(chapter);
      expect(pages.length).toBeGreaterThan(0);
      expect(pages.every((page) => page.some((block) => block.kind === 'paragraph' || block.kind === 'highlight'))).toBe(true);
      expect(pages.flat().some((block) => block.kind === 'pageBreak')).toBe(false);
      expect(chapter.bodyBlocks?.filter((block) => block.kind === 'pageBreak').length).toBe(pages.length - 1);

      const bodyHighlights = new Set((chapter.bodyBlocks ?? []).flatMap((block) => block.kind === 'highlight' ? [block.text.normalize('NFKC').replace(/[\s\p{P}\p{S}]+/gu, '')] : []));
      expect(chapter.bodyBlocks?.filter((block) => block.kind === 'highlight').every((block) => block.text.trim().length > 0)).toBe(true);
      const registryRecord = contentRegistry.getTerminalChapter(chapter.id);
      expect((registryRecord?.visibleHighlights ?? []).every((highlight) => !bodyHighlights.has(highlight.normalize('NFKC').replace(/[\s\p{P}\p{S}]+/gu, '')))).toBe(true);
      expect(chapter).not.toHaveProperty('sourcePath');
      expect(JSON.stringify(chapter)).not.toContain('internalNotes');
    }

    expect(chapters[0]?.pages).toHaveLength(6);
    expect(chapters[1]?.pages).toHaveLength(7);
    expect(chapters.slice(2).every((chapter) => Boolean(chapter.pages))).toBe(true);
    expect(chapters.slice(2).every((chapter) => chapter.pages?.length === 1)).toBe(true);
    expect(chapters.at(-1)?.bodyBlocks.filter((block) => block.kind === 'highlight').map((block) => block.text)).toContain('好像啊，\n天，\n好像真的黑下来了啊—');
    expect(chapters.slice(2).every((chapter) => chapter.paragraphs.length === chapter.pages?.flat().filter((block) => block.kind === 'paragraph' || block.kind === 'highlight').length)).toBe(true);
    expect(clampReadingPageIndex(-2, 6)).toBe(0);
    expect(clampReadingPageIndex(99, 6)).toBe(5);
  });
});

describe('调查桌分批与 Registry 内容加载', () => {
  it('序读完只发布三份尸阶段材料', () => {
    const state = enterDesk();
    expect(state.case_phase).toBe('CORPSE');
    expect(state.published_material_ids).toEqual([...SCENE_MATERIAL_IDS]);
    expect(state.published_material_ids).not.toContain('feng-home');
  });

  it('尸、家材料按 3 / 4 / 3 分批推进并从真实来源加载', async () => {
    let state = enterDesk();
    expect(advanceInvestigation(state)).toBe(state);
    state = viewMaterials(state, SCENE_MATERIAL_IDS);
    state = advanceInvestigation(state);
    expect(state.case_phase).toBe('HOME_FIRST');
    state = viewMaterials(state, HOME_FIRST_MATERIAL_IDS);
    state = advanceInvestigation(state);
    state = viewMaterials(state, HOME_SECOND_MATERIAL_IDS);
    state = advanceInvestigation(state);
    expect(state.case_phase).toBe('TAPPING_GATE');
    const content = await loadDeskContent(state);
    expect(content.materials.map((item) => item.id)).toContain('tapes-initial');
    expect(content.materials.find((item) => item.id === 'tapes-initial')).not.toHaveProperty('sourcePath');
  });

  it('Gate 1 后加载 Gate 专用玩家文本和 Force 前的真实人物材料', async () => {
    const before = await loadDeskContent(reachTappingGate());
    expect(before.specialReadings).toEqual([]);

    const people = await loadDeskContent(reachPeople());
    expect(people.specialReadings[0]).not.toHaveProperty('sourcePath');
    expect(people.materials.map((item) => item.id)).toEqual(expect.arrayContaining(['statement-ling', 'statement-feng', 'statement-wang']));

    const investigation = await loadDeskContent(markForceOpened(reachPeople()));
    expect(investigation.stories).toEqual([]);

    const searched = { ...markForceOpened(reachPeople()), unlockedDeductionIds: ['story-letter'] };
    const searchedContent = await loadDeskContent(searched);
    expect(searchedContent.stories.map((item) => item.title)).toEqual(['磁带传音']);
  });
});

describe('ReasoningGate Registry 契约', () => {
  it('Final Gate 成功态把正式通过后揭露渲染进玩家可见区域', () => {
    const html = renderToStaticMarkup(createElement(ReasoningGate, {
      gate: FINAL_GATE_DEFINITION,
      status: 'success',
      open: true,
      onBack: () => undefined
    }));
    expect(html).toContain('通过后揭露');
    expect(html).toContain('赵振华改变了关键物证状态，但不是本案共犯。');
  });

  it('三个正式 Gate 都带有玩家反馈和 Registry runtime', () => {
    expect(FORMAL_GATE_DEFINITIONS).toHaveLength(3);
    expect(TAPPING_GATE_DEFINITION).not.toHaveProperty('sourcePath');
    expect(TAPPING_GATE_DEFINITION.acceptedAnswers).toContain('你理解错了');
    expect(FORCE_GATE_DEFINITION).not.toHaveProperty('sourcePath');
    expect(FORCE_GATE_DEFINITION.standardSets).toHaveLength(4);
    expect(FORCE_GATE_DEFINITION.standardSets?.map((item) => item.forceId)).toEqual([
      'F1_PHOTO',
      'F2_INTERPRETATION',
      'F3_TALISMAN',
      'F4_TAPE'
    ]);
    expect(FORCE_GATE_DEFINITION.standardSets?.map((item) => item.objectIds)).toContainEqual(['WANG_ZHENG', 'WANG_ZHENG_SPLICED_PHOTO', 'XU_LING']);
    expect(FORCE_GATE_DEFINITION.forceFeedback?.[0].success.join('\n')).toContain('照片');
    expect(FORCE_GATE_DEFINITION.feedback?.success.join('\n')).toContain('一张被重新拼接的照片');
    expect(FORCE_GATE_DEFINITION.feedback?.success.join('\n')).not.toContain('匿名推荐');
    expect(FINAL_GATE_DEFINITION).not.toHaveProperty('sourcePath');
    expect(FINAL_GATE_DEFINITION.feedback?.reveal.join('\n')).toContain('赵振华改变了关键物证状态，但不是本案共犯。');
    expect(FINAL_GATE_DEFINITION.slots?.map((slot) => slot.slotId)).toEqual(['killer_slot', 'medium_slot', 'action_slot', 'wound_slot', 'disposal_slot']);
    expect(FINAL_GATE_DEFINITION.slots?.find((slot) => slot.slotId === 'disposal_slot')?.objectId).toBe('TAPE_DISPOSAL');
    expect(contentRegistry.getGateObject('TAPE_DISPOSAL')).toMatchObject({ contentId: 'zhenhua-investigation-initial', kind: 'clue' });
    expect(FINAL_GATE_DEFINITION.feedbackSections?.find((section) => section.key === '凶器处理判定')?.blocks.join('\n')).toContain('不是这一格要找的答案');
    for (const set of FORCE_GATE_DEFINITION.standardSets ?? []) {
      for (const objectId of set.objectIds) expect(contentRegistry.getGateObject(objectId)).toBeDefined();
    }
    for (const slot of FINAL_GATE_DEFINITION.slots ?? []) expect(contentRegistry.getGateObject(slot.objectId)).toBeDefined();
    expect(contentRegistry.getContentById('recording-old-treatment')?.type).toBe('recording');
  });

  it('文本、无序关系集合和语义槽位均按明确契约匹配', () => {
    expect(normalizeTextAnswer('  你理解错了！ ')).toBe('你理解错了');
    expect(matchesAcceptedTextAnswer('你理解错了！', TAPPING_GATE_DEFINITION.acceptedAnswers)).toBe(true);
    expect(matchesAcceptedTextAnswer('我觉得你理解错了', TAPPING_GATE_DEFINITION.acceptedAnswers)).toBe(false);
    expect(matchesPartialTextAnswer('拒绝', TAPPING_GATE_DEFINITION.partialAnswers ?? [])).toBe(true);
    expect(matchesPartialTextAnswer('拒绝', TAPPING_GATE_DEFINITION.acceptedAnswers)).toBe(false);
    expect(matchesPartialTextAnswer('完全正确', TAPPING_GATE_DEFINITION.partialAnswers ?? [])).toBe(false);

    const firstForce = FORCE_GATE_DEFINITION.standardSets?.[0];
    expect(firstForce).toBeDefined();
    expect(matchesRelationSet([...(firstForce?.objectIds ?? [])].reverse(), FORCE_GATE_DEFINITION.standardSets ?? [])).toBe('F1_PHOTO');
    expect(matchesRelationSet(['WANG_ZHENG', 'ANON_RECOMMENDATION', 'XU_LING'], FORCE_GATE_DEFINITION.standardSets ?? [])).toBeNull();

    const finalAnswer = Object.fromEntries((FINAL_GATE_DEFINITION.slots ?? []).map((slot) => [slot.slotId, slot.objectId]));
    expect(matchesFinalSlots(finalAnswer, FINAL_GATE_DEFINITION.slots ?? [])).toBe(true);
    expect(matchesFinalSlots({ killer_slot: 'FENG', medium_slot: 'TAPE_START', action_slot: 'OLD_RECORDER_REWIND', wound_slot: 'LAN_THUMB_WOUND' }, FINAL_GATE_DEFINITION.slots ?? [])).toBe(false);
  });

  it('ReasoningBar 只在非 IME 的 Enter 上提交，composition 确认键不提交', () => {
    const base = { key: 'Enter', shiftKey: false, inputDisabled: false, mode: 'search' as const, isComposing: false, keyCode: 13 };
    expect(shouldSubmitReasoningBarEnter(base)).toBe(true);
    expect(shouldSubmitReasoningBarEnter({ ...base, isComposing: true })).toBe(false);
    expect(shouldSubmitReasoningBarEnter({ ...base, keyCode: 229 })).toBe(false);
    expect(shouldSubmitReasoningBarEnter({ ...base, mode: 'relation' })).toBe(false);
  });
});

describe('ReasoningGate 完成状态持久化', () => {
  it('Gate 1 成功后保存并回读 tapping_gate_passed 与后续阶段', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const solved = passTappingGate(reachTappingGate());
      saveCaseDeskState(solved);
      const loaded = loadCaseDeskState();
      expect(loaded.incompatible).toBe(false);
      expect(loaded.state.tapping_gate_passed).toBe(true);
      expect(loaded.state.case_phase).toBe('PEOPLE');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('旧 Force schema 移除旧 F1，不把它自动转换为 F1_PHOTO，并保留其他 Force', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const oldState = {
        ...createInitialCaseState(),
        screen: 'DESK',
        flowVersion: 1,
        forceSchemaVersion: 1,
        currentPhase: 'DEDUCTION_PHASE',
        unlockedContentIds: [...SCENE_MATERIAL_IDS, ...HOME_FIRST_MATERIAL_IDS, ...HOME_SECOND_MATERIAL_IDS, 'statement-ling', 'statement-feng', 'statement-zhenhua', 'statement-wang', 'wang-investigation-initial', 'recording-old-treatment', 'old-recorder-rewind', 'tape-supplement', 'wang-collage-photo', 'story-letter'],
        solvedGateIds: ['tapping', 'force'],
        solvedForceIds: ['F1_RECOMMENDATION', 'F2_INTERPRETATION', 'F3_TALISMAN'],
        unlockedDeductionIds: ['story-letter'],
        openedContentIds: ['story-letter'],
        force_opened: true
      };
      values.set(CASE_DESK_SAVE_KEY, JSON.stringify(oldState));
      values.set(REASONING_DRAFTS_KEY, JSON.stringify({ force: { relationObjectIds: ['ANON_RECOMMENDATION'], finalSlotValues: {} } }));

      const loaded = loadCaseDeskState();
      expect(loaded.incompatible).toBe(false);
      expect(loaded.state.forceSchemaVersion).toBe(2);
      expect(loaded.state.currentPhase).toBe('FORCE_GATE');
      expect(loaded.state.solvedForceIds).toEqual(['F2_INTERPRETATION', 'F3_TALISMAN']);
      expect(loaded.state.solvedGateIds).toEqual(['tapping']);
      expect(loaded.state.unlockedDeductionIds).toEqual([]);
      expect(loaded.state.terminalProgress).toBeNull();
      expect(JSON.parse(values.get(CASE_DESK_SAVE_KEY) ?? '{}').solvedForceIds).toEqual(['F2_INTERPRETATION', 'F3_TALISMAN']);
      expect(JSON.stringify(JSON.parse(values.get(REASONING_DRAFTS_KEY) ?? '{}'))).not.toContain('ANON_RECOMMENDATION');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe('旧状态机不被本轮 ContentRegistry 改写', () => {
  it('结束状态不再生成旧整章岚 ID', () => {
    let state = reachPeople();
    state = markForceOpened(state);
    state = advanceInvestigationAfterForce(state);
    state = advanceEvidence(state);
    state = advancePoliceHalt(state);
    state = passSnakeGate(state);
    state = acknowledgeLingReflection(state);
    state = passMethodGate(state);
    state = advanceAftermath(state);
    for (let index = 0; index < 4; index += 1) state = advanceRitual(state);
    state = enterEnding(state);
    state = finishEnding(state);
    expect(state.case_phase).toBe('FINISHED');
    expect(state.finished).toBe(true);
    expect(state.opened_chapter_ids).not.toContain('novel-cheng');
    expect(state.read_chapter_ids).not.toContain('novel-cheng');
  });

  it('玩家入口没有重新挂载旧开发路由或旧演示入口', () => {
    const app = readFileSync(fileURLToPath(new URL('../src/App.tsx', import.meta.url)), 'utf8');
    expect(app).not.toContain('CaseDeskDemo');
    expect(app).not.toContain('__deduction_dev');
    expect(app).toContain('__content_debug');
  });
});

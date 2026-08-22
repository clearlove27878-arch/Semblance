const FIELD_RE = /^\[([^\]]+)\]$/;
const PAGE_RE = /^第\s*([0-9一二三四五六七八九十百]+)\s*页$/;
const PAGE_BREAK_RE = /^(?:——\s*翻页\s*——|---)$/;
const DIVIDER_RE = /^-{3,}$/;
const PLAYER_BODY_LABEL_RE = /^录音片段(?:[0-9一二三四五六七八九十百]+)$/;
const HIGHLIGHT_MARKERS = new Set(['重点', '[重点]', '【重点】']);
const HIGHLIGHT_BLOCK_START_MARKERS = new Set(['重点开始', '[重点开始]', '【重点开始】']);
const HIGHLIGHT_BLOCK_END_MARKERS = new Set(['重点结束', '[重点结束]', '【重点结束】']);

function isHighlightMarker(value) {
  return HIGHLIGHT_MARKERS.has(String(value).trim());
}

function isHighlightBlockStart(value) {
  return HIGHLIGHT_BLOCK_START_MARKERS.has(String(value).trim());
}

function isHighlightBlockEnd(value) {
  return HIGHLIGHT_BLOCK_END_MARKERS.has(String(value).trim());
}

export class ContentValidationError extends Error {
  constructor({ file = '<inline>', field = '<document>', reason }) {
    super(`[ContentValidationError]\nfile: ${file}\nfield: ${field}\nreason: ${reason}`);
    this.name = 'ContentValidationError';
    this.file = file;
    this.field = field;
    this.reason = reason;
  }
}

function fail(file, field, reason) {
  throw new ContentValidationError({ file, field, reason });
}

function nonEmptyLines(lines) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function normalizeRaw(raw) {
  return String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
}

function splitBlocks(lines) {
  const blocks = [];
  let current = [];
  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join('\n'));
      current = [];
    }
  };
  for (const line of lines) {
    if (line.trim() === '') flush();
    else current.push(line);
  }
  flush();
  return blocks;
}

function stripListPrefix(value) {
  return value.replace(/^\s*(?:\d+|[一二三四五六七八九十百]+)[、.．]\s*/, '').trim();
}

function normalizedForCompare(value) {
  return value.normalize('NFKC').replace(/[\s\p{P}\p{S}]+/gu, '');
}

function parsePlayerBody(lines, file, { lineParagraphs = false } = {}) {
  const sourceBlocks = lineParagraphs ? lines.filter((line) => line.trim() !== '') : splitBlocks(lines);
  const blocks = [];
  const pageLabels = [];
  let pendingHighlight = false;
  let explicitHighlightLines = null;
  let firstPageLabel = null;

  for (const sourceBlock of sourceBlocks) {
    const trimmed = sourceBlock.trim();
    const sourceLines = sourceBlock.split('\n');
    if (sourceLines.length > 1 && isHighlightMarker(sourceLines[0].trim())) {
      blocks.push({ kind: 'highlight', text: sourceLines.slice(1).join('\n') });
      pendingHighlight = false;
      continue;
    }
    const pageMarker = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1).trim() : trimmed;
    if (isHighlightBlockStart(trimmed) || isHighlightBlockStart(pageMarker)) {
      if (explicitHighlightLines) fail(file, 'PLAYER正文', '重点块不能嵌套');
      if (pendingHighlight) fail(file, 'PLAYER正文', '单段重点标记不能直接开启重点块');
      explicitHighlightLines = [];
      continue;
    }
    if (isHighlightBlockEnd(trimmed) || isHighlightBlockEnd(pageMarker)) {
      if (!explicitHighlightLines || explicitHighlightLines.length === 0) fail(file, 'PLAYER正文', '重点块结束标记没有对应的开始标记或正文');
      blocks.push({ kind: 'highlight', text: explicitHighlightLines.join(lineParagraphs ? '\n' : '\n\n') });
      explicitHighlightLines = null;
      continue;
    }
    if (explicitHighlightLines) {
      explicitHighlightLines.push(sourceBlock);
      continue;
    }
    const pageMatch = PAGE_RE.exec(pageMarker);
    if (pageMatch) {
      const label = `第${pageMatch[1]}页`;
      if (blocks.length > 0 && blocks[blocks.length - 1].kind === 'pageBreak') blocks[blocks.length - 1].label = label;
      else if (blocks.length > 0) blocks.push({ kind: 'pageBreak', label });
      else firstPageLabel = label;
      pageLabels.push(label);
      pendingHighlight = false;
      continue;
    }
    if (PAGE_BREAK_RE.test(trimmed)) {
      blocks.push({ kind: 'pageBreak', label: '翻页' });
      pendingHighlight = false;
      continue;
    }
    if (DIVIDER_RE.test(trimmed)) {
      blocks.push({ kind: 'divider' });
      pendingHighlight = false;
      continue;
    }
    if (isHighlightMarker(trimmed) || isHighlightMarker(pageMarker)) {
      pendingHighlight = true;
      continue;
    }

    const kind = pendingHighlight ? 'highlight' : 'paragraph';
    blocks.push({ kind, text: sourceBlock });
    pendingHighlight = false;
  }

  if (explicitHighlightLines) fail(file, 'PLAYER正文', '重点块缺少结束标记');
  if (pendingHighlight) fail(file, 'PLAYER正文', '末尾存在没有正文承接的重点标记');

  const paragraphs = blocks.filter((block) => block.kind === 'paragraph' || block.kind === 'highlight').map((block) => block.text);
  const pages = [];
  let page = [];
  for (const block of blocks) {
    if (block.kind === 'pageBreak') {
      pages.push(page);
      page = [];
      continue;
    }
    page.push(block);
  }
  if (page.length > 0 || pages.length === 0) pages.push(page);

  return {
    bodyBlocks: blocks,
    paragraphs,
    pages,
    pageLabels: pageLabels.length > 0 ? pageLabels : firstPageLabel ? [firstPageLabel] : []
  };
}

function collectPlainSections(lines, file) {
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const match = FIELD_RE.exec(line.trim());
    if (current === 'PLAYER正文' && match && (isHighlightMarker(match[1]) || isHighlightBlockStart(match[1]) || isHighlightBlockEnd(match[1]))) {
      sections.get(current).push(line);
      continue;
    }
    if (current === 'PLAYER正文' && match && PAGE_RE.test(match[1])) {
      sections.get(current).push(line);
      continue;
    }
    if (current === 'PLAYER正文' && match && PLAYER_BODY_LABEL_RE.test(match[1].trim())) {
      // A recording source may use bracketed, player-visible clip labels as
      // body structure. Keep the source line in the player body; do not treat
      // it as a new metadata field.
      sections.get(current).push(line);
      continue;
    }
    if (match) {
      current = match[1];
      if (sections.has(current)) fail(file, current, '字段重复');
      sections.set(current, []);
      continue;
    }
    if (current) sections.get(current).push(line);
    else if (line.trim()) fail(file, '<document>', '正文出现在第一个字段之前');
  }
  return sections;
}

function requireSection(sections, name, file) {
  const value = sections.get(name);
  if (!value) fail(file, name, '必要字段缺失');
  return value;
}

function singleValue(sections, name, file, { required = false } = {}) {
  const lines = sections.get(name);
  if (!lines) {
    if (required) fail(file, name, '必要字段缺失');
    return null;
  }
  const values = nonEmptyLines(lines);
  if (values.length === 0) {
    if (required) fail(file, name, '字段不能为空');
    return null;
  }
  if (values.length !== 1) fail(file, name, '该字段只能包含一行非空内容');
  return values[0];
}

function aliasesValue(sections, file) {
  const lines = sections.get('搜索别名');
  if (!lines) return [];
  return nonEmptyLines(lines);
}

function searchAliasesValue(manifest, file) {
  if (manifest.searchAliases === undefined) return [];
  if (!Array.isArray(manifest.searchAliases)) fail(file, '搜索别名映射', 'searchAliases 必须为数组');
  return nonEmptyLines(manifest.searchAliases);
}

function highlightsValue(sections, file) {
  const lines = sections.get('重点句');
  if (!lines) return [];
  return nonEmptyLines(lines).map(stripListPrefix).filter(Boolean);
}

function imageRefsValue(sections, file) {
  const lines = sections.get('图片');
  if (!lines) return [];
  const refs = nonEmptyLines(lines);
  if (new Set(refs).size !== refs.length) fail(file, '图片', '图片引用不得重复');
  return refs;
}

function mappedImageValue(reference, manifest, file, field) {
  if (reference === undefined || reference === null) return null;
  if (typeof reference !== 'string' || !reference.trim()) fail(file, field, '图片引用必须为非空字符串');
  const imageKey = `${file}::${reference}`;
  const mapping = manifest.images?.[imageKey];
  if (!mapping) fail(file, field, `图片引用没有建立 asset mapping: ${reference}`);
  const kind = mapping.kind ?? 'evidence';
  if (!['portrait', 'evidence', 'scene'].includes(kind)) fail(file, field, `图片类型无效: ${kind}`);
  return { src: mapping.publicPath, kind };
}

export function parsePlainContent({ raw, file, manifest }) {
  const lines = normalizeRaw(raw).split('\n');
  const sections = collectPlainSections(lines, file);
  const allowed = new Set(['显示标题', '标准名称', '搜索别名', 'PLAYER正文', '重点句', '图片', '内部备注']);
  for (const field of sections.keys()) {
    if (!allowed.has(field)) fail(file, field, '未知字段');
  }

  const sourceDisplayTitle = singleValue(sections, '显示标题', file, { required: true });
  if (manifest.playerDisplayTitle !== undefined && (typeof manifest.playerDisplayTitle !== 'string' || !manifest.playerDisplayTitle.trim())) {
    fail(file, '玩家显示标题映射', 'playerDisplayTitle 必须为非空字符串');
  }
  const displayTitle = manifest.playerDisplayTitle?.trim() ?? sourceDisplayTitle;
  const bodyLines = requireSection(sections, 'PLAYER正文', file);
  if (!nonEmptyLines(bodyLines).length) fail(file, 'PLAYER正文', '玩家正文不能为空');
  const body = parsePlayerBody(bodyLines, file, { lineParagraphs: manifest.type === 'terminal_chapter' });
  const standardName = singleValue(sections, '标准名称', file);
  const aliases = aliasesValue(sections, file);
  const searchAliases = searchAliasesValue(manifest, file);
  const imageRefs = imageRefsValue(sections, file);
  const highlights = highlightsValue(sections, file);

  const images = imageRefs.map((imageRef) => mappedImageValue(imageRef, manifest, file, '图片'));
  const imageRef = imageRefs[0] ?? null;
  const image = images[0]?.src ?? null;
  const openingImage = mappedImageValue(manifest.openingImage, manifest, file, 'openingImage');
  const endingImage = mappedImageValue(manifest.endingImage, manifest, file, 'endingImage');

  const bodyHighlightTexts = body.bodyBlocks
    .filter((block) => block.kind === 'highlight')
    .map((block) => block.text);
  const bodyHighlightKeys = new Set(bodyHighlightTexts.map(normalizedForCompare));
  const visibleHighlights = highlights.filter((highlight) => !bodyHighlightKeys.has(normalizedForCompare(highlight)));

  return {
    id: manifest.id,
    type: manifest.type,
    category: manifest.category,
    sourcePath: file,
    title: sourceDisplayTitle,
    displayTitle,
    standardName,
    aliases,
    searchAliases,
    body: body.paragraphs,
    bodyBlocks: body.bodyBlocks,
    pages: body.pages,
    pageLabels: body.pageLabels,
    highlights,
    visibleHighlights,
    imageRef,
    image,
    images,
    openingImage,
    endingImage,
    relationObjectId: manifest.relationObjectId ?? null
  };
}

export function collectGateSections(raw, file) {
  const lines = normalizeRaw(raw).split('\n');
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const match = FIELD_RE.exec(trimmed);
    if (match) {
      current = match[1];
      if (sections.has(current)) {
        // Gate files intentionally repeat per-force/per-slot labels. Preserve them
        // as indexed entries instead of silently overwriting either section.
        const existing = sections.get(current);
        if (Array.isArray(existing)) existing.push([]);
      } else {
        sections.set(current, [[]]);
      }
      continue;
    }
    if (!current) continue;
    const bucket = sections.get(current);
    bucket[bucket.length - 1].push(line);
  }
  return { lines, sections };
}

function firstGateSection(sections, name, file, { required = true } = {}) {
  const values = sections.get(name)?.[0];
  if (!values) {
    if (required) fail(file, name, '必要字段缺失');
    return [];
  }
  if (required && !nonEmptyLines(values).length) fail(file, name, '字段不能为空');
  return values;
}

function gateBlocks(sections, name, file, options) {
  return gateTextBlocks(sections, name, file, options).map((block) => block.text);
}

function markedTextBlocks(lines, file, { field = '<text>' } = {}) {
  const blocks = [];
  let pendingHighlight = false;
  for (const rawBlock of splitBlocks(lines)) {
    const block = rawBlock.trim();
    if (!block || /^[=-]{3,}$/.test(block)) continue;
    if (isHighlightMarker(block)) {
      pendingHighlight = true;
      continue;
    }
    blocks.push({ kind: pendingHighlight ? 'highlight' : 'paragraph', text: rawBlock });
    pendingHighlight = false;
  }
  if (pendingHighlight) fail(file, field, '末尾存在没有正文承接的重点标记');
  return blocks;
}

function gateTextBlocks(sections, name, file, options) {
  return markedTextBlocks(firstGateSection(sections, name, file, options), file, { field: name });
}

function sectionText(sections, name, file, options) {
  return gateBlocks(sections, name, file, options).join('\n\n');
}

function parseForceRuntime(raw, file, objectMap) {
  const internalStart = raw.indexOf('[内部标准记录]');
  if (internalStart < 0) fail(file, '内部标准记录', 'Force 标准记录缺失');
  const internal = raw.slice(internalStart);
  const matches = [...internal.matchAll(/forceId：\s*\n\s*([A-Z0-9_]+)[\s\S]*?程序标准集合：\s*\n\s*\{([\s\S]*?)\}/g)];
  if (matches.length !== 4) fail(file, '程序标准集合', `应解析 4 条 Force，实际得到 ${matches.length} 条`);
  const standardSets = matches.map((match) => {
    const forceId = match[1];
    const objectIds = [...match[2].matchAll(/\b[A-Z][A-Z0-9_]+\b/g)].map((item) => item[0]);
    if (objectIds.length !== 3) fail(file, `程序标准集合:${forceId}`, '每条 Force 必须包含 3 个对象');
    for (const objectId of objectIds) {
      if (!objectMap[objectId]) fail(file, `程序标准集合:${forceId}`, `引用了未映射的内部对象 ${objectId}`);
    }
    return { forceId, objectIds };
  });
  return { matching: 'unordered_set', requiredCount: 4, standardSets };
}

function parseFinalRuntime(raw, file, objectMap) {
  const internalStart = raw.indexOf('[内部槽位映射]');
  const internalEnd = raw.indexOf('[反馈判定优先级]');
  if (internalStart < 0 || internalEnd < 0) fail(file, '内部槽位映射', 'Final Gate 槽位映射缺失');
  const internal = raw.slice(internalStart, internalEnd);
  const matches = [...internal.matchAll(/^内部ID：\s*\n\s*([A-Z0-9_]+)[\s\S]*?^正确槽位：\s*\n\s*([a-z_]+)/gm)];
  if (matches.length !== 5) fail(file, '内部槽位映射', `应解析 5 个槽位，实际得到 ${matches.length} 个`);
  const slots = matches.map((match) => ({ objectId: match[1], slotId: match[2] }));
  const expectedSlots = new Set(['killer_slot', 'medium_slot', 'action_slot', 'wound_slot', 'disposal_slot']);
  if (new Set(slots.map((item) => item.slotId)).size !== 5 || slots.some((item) => !expectedSlots.has(item.slotId))) {
    fail(file, '内部槽位映射', '五个固定语义槽位不完整或重复');
  }
  for (const slot of slots) {
    if (!objectMap[slot.objectId]) fail(file, slot.slotId, `引用了未映射的内部对象 ${slot.objectId}`);
  }
  return { matching: 'semantic_slots', slots };
}

function gateBase({ file, manifest, sections }) {
  const displayTitle = singleValue(new Map([['显示标题', firstGateSection(sections, '显示标题', file)]]), '显示标题', file, { required: true });
  const promptTextBlocks = gateTextBlocks(sections, 'PLAYER问题', file);
  const promptBlocks = promptTextBlocks.map((block) => block.text);
  return {
    id: manifest.id,
    type: manifest.type,
    sourcePath: file,
    title: displayTitle,
    displayTitle,
    prompt: promptBlocks.join('\n\n'),
    promptBlocks,
    promptTextBlocks
  };
}

export function parseTappingGate({ raw, file, manifest }) {
  const { sections } = collectGateSections(raw, file);
  const base = gateBase({ file, manifest, sections });
  const instructionsTextBlocks = gateTextBlocks(sections, '输入方式', file);
  const instructionsBlocks = instructionsTextBlocks.map((block) => block.text);
  const acceptedAnswers = nonEmptyLines(firstGateSection(sections, '可接受答案', file));
  if (acceptedAnswers.length === 0) fail(file, '可接受答案', '至少需要一个可接受答案');
  const partialTextBlocks = gateTextBlocks(sections, '部分正确反馈', file);
  const partialBlocks = partialTextBlocks.map((block) => block.text);
  const incorrectTextBlocks = gateTextBlocks(sections, '错误反馈', file);
  const successTextBlocks = gateTextBlocks(sections, '通过反馈', file);
  const revealTextBlocks = gateTextBlocks(sections, '通过后揭露', file);
  const partialAliases = partialBlocks
    .flatMap((block) => block.split('\n'))
    .map((line) => line.trim())
    .filter((line) => ['不同意', '不认可', '拒绝', '否认'].includes(line));
  return {
    ...base,
    player: {
      instructionsBlocks,
      feedback: {
        partial: partialBlocks,
        incorrect: incorrectTextBlocks.map((block) => block.text),
        success: successTextBlocks.map((block) => block.text),
        reveal: revealTextBlocks.map((block) => block.text)
      },
      textBlocks: {
        instructions: instructionsTextBlocks,
        feedback: {
          partial: partialTextBlocks,
          incorrect: incorrectTextBlocks,
          success: successTextBlocks,
          reveal: revealTextBlocks
        }
      }
    },
    runtime: {
      normalization: 'NFKC_trim_lowercase_remove_space_punctuation_symbols',
      acceptedAnswers,
      partialAliases
    }
  };
}

export function parseForceGate({ raw, file, manifest, objectMap }) {
  const { sections } = collectGateSections(raw, file);
  const base = gateBase({ file, manifest, sections });
  const forceHeadings = [...sections.keys()].filter((name) => /^Force\s+\d+/.test(name));
  if (forceHeadings.length !== 4) fail(file, 'Force sections', `应有 4 条 Force，实际得到 ${forceHeadings.length} 条`);
  const forceFeedback = forceHeadings.map((heading, index) => {
    const getTextBlocks = (name, required = true) => {
      const values = sections.get(name)?.[index];
      if (!values && required) fail(file, `${heading}:${name}`, 'Gate 玩家反馈缺失');
      return values ? markedTextBlocks(values, file, { field: `${heading}:${name}` }) : [];
    };
    return {
      label: heading,
      success: getTextBlocks('单条通过反馈').map((block) => block.text),
      partial: getTextBlocks('部分正确反馈').map((block) => block.text),
      incorrect: getTextBlocks('错误方向').map((block) => block.text),
      textBlocks: {
        success: getTextBlocks('单条通过反馈'),
        partial: getTextBlocks('部分正确反馈'),
        incorrect: getTextBlocks('错误方向')
      }
    };
  });
  const instructionsTextBlocks = gateTextBlocks(sections, 'PLAYER操作提示', file);
  const partialTextBlocks = gateTextBlocks(sections, '通用部分正确反馈', file);
  const incorrectTextBlocks = gateTextBlocks(sections, '通用错误反馈', file);
  const successTextBlocks = gateTextBlocks(sections, '通过反馈', file);
  const revealTextBlocks = gateTextBlocks(sections, '通过后揭露', file);
  return {
    ...base,
    player: {
      instructionsBlocks: instructionsTextBlocks.map((block) => block.text),
      feedback: {
        partial: partialTextBlocks.map((block) => block.text),
        incorrect: incorrectTextBlocks.map((block) => block.text),
        success: successTextBlocks.map((block) => block.text),
        reveal: revealTextBlocks.map((block) => block.text)
      },
      textBlocks: {
        instructions: instructionsTextBlocks,
        feedback: {
          partial: partialTextBlocks,
          incorrect: incorrectTextBlocks,
          success: successTextBlocks,
          reveal: revealTextBlocks
        },
        forceFeedback: forceFeedback.map((item) => item.textBlocks)
      },
      forceFeedback
    },
    runtime: parseForceRuntime(raw, file, objectMap)
  };
}

export function parseFinalGate({ raw, file, manifest, objectMap }) {
  const { sections } = collectGateSections(raw, file);
  const base = gateBase({ file, manifest, sections });
  const feedbackSections = ['人物判定', '凶器处理判定', '关键线索判定', '强错误线索反馈', '通用错误反馈']
    .filter((name) => sections.has(name))
    .map((name) => ({
      key: name,
      blocks: gateBlocks(sections, name, file),
      textBlocks: gateTextBlocks(sections, name, file)
    }));
  const instructionsTextBlocks = gateTextBlocks(sections, 'PLAYER操作提示', file);
  const partialTextBlocks = sections.has('关键线索判定') ? gateTextBlocks(sections, '关键线索判定', file) : [];
  const incorrectTextBlocks = sections.has('通用错误反馈') ? gateTextBlocks(sections, '通用错误反馈', file) : [];
  const successTextBlocks = gateTextBlocks(sections, '五项全部正确', file);
  const revealTextBlocks = gateTextBlocks(sections, '通过后揭露', file);
  return {
    ...base,
    player: {
      instructionsBlocks: instructionsTextBlocks.map((block) => block.text),
      feedback: {
        partial: partialTextBlocks.map((block) => block.text),
        incorrect: incorrectTextBlocks.map((block) => block.text),
        success: successTextBlocks.map((block) => block.text),
        reveal: revealTextBlocks.map((block) => block.text)
      },
      textBlocks: {
        instructions: instructionsTextBlocks,
        feedback: {
          partial: partialTextBlocks,
          incorrect: incorrectTextBlocks,
          success: successTextBlocks,
          reveal: revealTextBlocks
        }
      },
      feedbackSections
    },
    runtime: parseFinalRuntime(raw, file, objectMap)
  };
}

export function parseGate({ raw, file, manifest, objectMap }) {
  if (manifest.type === 'text_answer') return parseTappingGate({ raw, file, manifest });
  if (manifest.type === 'relation') return parseForceGate({ raw, file, manifest, objectMap });
  if (manifest.type === 'final') return parseFinalGate({ raw, file, manifest, objectMap });
  fail(file, '<gate>', `未知 Gate 类型 ${manifest.type}`);
}

export function assertPlayerSafe(playerData, file = '<generated>') {
  function assertNoAuthoringMetadata(value, pathLabel = '$') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertNoAuthoringMetadata(item, `${pathLabel}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'sourceRoot' || key === 'sourcePath') {
        throw new ContentValidationError({ file, field: `${pathLabel}.${key}`, reason: 'PLAYER/runtime payload 不得包含 authoring metadata' });
      }
      assertNoAuthoringMetadata(child, `${pathLabel}.${key}`);
    }
  }

  assertNoAuthoringMetadata(playerData);
  const serialized = JSON.stringify(playerData);
  for (const forbidden of ['internalNotes', '内部备注', '内部判定规则', 'Codex开发指令', '防止程序泄题', '内部槽位映射']) {
    if (serialized.includes(forbidden)) fail(file, 'player-safe data', `玩家数据包含被禁止的内部内容: ${forbidden}`);
  }
}

export { normalizeRaw, splitBlocks, parsePlayerBody, normalizedForCompare };

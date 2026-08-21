import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_MANIFEST, ENTITY_OBJECT_MAP, FINAL_OBJECT_MAP, FORCE_OBJECT_MAP } from './content-manifest.mjs';
import { ContentValidationError, assertPlayerSafe, normalizedForCompare, parseGate, parsePlainContent } from './content-parser.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const embeddedSourceRoot = path.join(projectRoot, '网页文本源');
const sourceOverride = process.env.SI_CONTENT_SOURCE?.trim();
const sourceRoot = path.resolve(sourceOverride || embeddedSourceRoot);
const usesEmbeddedSource = !sourceOverride;
const sourceAssetRoot = usesEmbeddedSource ? null : path.resolve(sourceRoot, '..');
const generatedRoot = path.join(projectRoot, 'src', 'content', 'generated');
const publicAssetsRoot = path.join(projectRoot, 'public', 'content-assets');

const EXPECTED_FORCE_STANDARD_SETS = [
  { forceId: 'F1_PHOTO', objectIds: ['WANG_ZHENG', 'WANG_ZHENG_SPLICED_PHOTO', 'XU_LING'] },
  { forceId: 'F2_INTERPRETATION', objectIds: ['CHENG_LAN', 'OLD_TREATMENT_INTERPRETATION', 'WANG_WIFE'] },
  { forceId: 'F3_TALISMAN', objectIds: ['XU_LING', 'NEW_TALISMAN', 'CHENG_LAN'] },
  { forceId: 'F4_TAPE', objectIds: ['ZHOU_FENG', 'START_TAPE', 'CHENG_LAN'] }
];

function slash(value) {
  return value.split(path.sep).join('/');
}

function contentError(file, field, reason) {
  throw new ContentValidationError({ file, field, reason });
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) files.push(full);
  }
  return files.sort();
}

function assertManifestCoverage(files, manifest, root) {
  const actual = new Set(files.map((file) => slash(path.relative(root, file))));
  const expected = new Set([...Object.keys(manifest.files), ...Object.keys(manifest.gates)]);
  const isArchivedLanSource = (file) => /(?:^|\/)终盘\/.*C03.*岚.*全文.*\.txt$/i.test(file);
  for (const file of actual) {
    if (!expected.has(file) && !isArchivedLanSource(file)) {
      contentError(file, '<manifest>', '文本源文件没有登记到 content-manifest.mjs');
    }
  }
  for (const file of expected) if (!actual.has(file)) contentError(file, '<manifest>', 'manifest 登记了不存在的文本源文件');
}

function assertUnique(values, label) {
  const seen = new Map();
  for (const value of values) {
    const key = value.value;
    if (!key) contentError(value.file, label, 'ID 或名称不能为空');
    if (seen.has(key)) contentError(value.file, label, `重复值 ${key}，已在 ${seen.get(key)} 出现`);
    seen.set(key, value.file);
  }
}

function contentSummary(contents, gates) {
  const count = (type) => contents.filter((item) => item.type === type).length;
  return {
    caseClues: count('case_clue'),
    policeClues: count('police_clue'),
    visualClues: count('visual_clue'),
    recordings: count('recording'),
    fictionalDeductions: count('fictional_deduction'),
    terminalChapters: count('terminal_chapter'),
    prologues: count('prologue'),
    gates: gates.length,
    entries: [...contents, ...gates].map((item) => ({ id: item.id, type: item.type, title: item.title, sourcePath: item.sourcePath }))
  };
}

const READING_CHAPTER_ORDER = [
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

function assertTerminalChapters(contents) {
  const byId = new Map(contents.filter((item) => item.type === 'terminal_chapter').map((item) => [item.id, item]));
  if (byId.size !== READING_CHAPTER_ORDER.length) {
    contentError('终盘', 'terminal_chapter', `应有 ${READING_CHAPTER_ORDER.length} 个阅读章节，实际得到 ${byId.size} 个`);
  }

  for (const chapterId of READING_CHAPTER_ORDER) {
    const chapter = byId.get(chapterId);
    if (!chapter) contentError('终盘', 'terminal_chapter', `缺少阅读章节 ${chapterId}`);
    if (chapter.type !== 'terminal_chapter') contentError(chapter.sourcePath, 'type', '终盘章节 type 必须为 terminal_chapter');
    if (!Array.isArray(chapter.pages) || chapter.pages.length < 1) contentError(chapter.sourcePath, 'pages', '终盘章节至少需要 1 个作者页');

    const pageBreakCount = chapter.bodyBlocks.filter((block) => block.kind === 'pageBreak').length;
    if (pageBreakCount !== chapter.pages.length - 1) {
      contentError(chapter.sourcePath, 'pageBreak', `作者分页解析不一致：pageBreak=${pageBreakCount}，pages=${chapter.pages.length}`);
    }
    if (chapter.pageLabels.length > 0 && chapter.pageLabels.length !== chapter.pages.length) {
      contentError(chapter.sourcePath, 'pageLabels', '作者页标签数量必须与 pages 一致');
    }

    for (const [pageIndex, page] of chapter.pages.entries()) {
      const hasText = page.some((block) => (block.kind === 'paragraph' || block.kind === 'highlight') && block.text.trim().length > 0);
      if (!hasText) contentError(chapter.sourcePath, `pages[${pageIndex}]`, '作者页不得为空');
      for (const block of page) {
        if (block.kind === 'highlight' && !block.text.trim()) contentError(chapter.sourcePath, `pages[${pageIndex}]`, 'highlight block 不能为空');
      }
    }

    const bodyHighlightKeys = new Set(chapter.bodyBlocks
      .filter((block) => block.kind === 'highlight')
      .map((block) => normalizedForCompare(block.text)));
    if (chapter.visibleHighlights.some((highlight) => bodyHighlightKeys.has(normalizedForCompare(highlight)))) {
      contentError(chapter.sourcePath, '重点句', '正文中的 highlight 不得在页面底部重复出现');
    }
  }
}

async function copyMappedAssets() {
  const assetEntries = Object.values(CONTENT_MANIFEST.images);
  await mkdir(publicAssetsRoot, { recursive: true });
  for (const asset of assetEntries) {
    const target = path.join(publicAssetsRoot, asset.publicPath.replace(/^\/content-assets\//, ''));
    if (usesEmbeddedSource) {
      if (!existsSync(target)) contentError(asset.publicPath, '图片', '默认项目内图片源缺少正式资源');
      continue;
    }
    const source = path.join(sourceAssetRoot, asset.sourcePath);
    if (!existsSync(source)) contentError(asset.sourcePath, '图片', 'SI_CONTENT_SOURCE source-side asset mapping 指向的图片不存在');
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { force: true });
  }
}

function assertObjectMappings(contents) {
  const ids = new Set(contents.map((item) => item.id));
  const allMappings = { ...FORCE_OBJECT_MAP, ...FINAL_OBJECT_MAP, ...ENTITY_OBJECT_MAP };
  for (const [objectId, mapping] of Object.entries(allMappings)) {
    if (!ids.has(mapping.contentId)) contentError('Gate专用文本源/对象映射', objectId, `映射的内容对象不存在: ${mapping.contentId}`);
    if (!['person', 'clue', 'fact'].includes(mapping.kind)) contentError('Gate专用文本源/对象映射', objectId, `对象 kind 无效: ${mapping.kind}`);
    if (mapping.canonicalId && !allMappings[mapping.canonicalId] && !ids.has(mapping.canonicalId)) {
      contentError('Gate专用文本源/对象映射', objectId, `canonicalId 不存在: ${mapping.canonicalId}`);
    }
  }
}

function assertForceRuntime(gates, contents) {
  const force = gates.find((gate) => gate.id === 'force');
  if (!force || force.type !== 'relation' || !force.runtime || force.runtime.matching !== 'unordered_set') {
    contentError('Gate专用文本源/四个Force.txt', 'runtime', 'Force runtime 未生成有效的 unordered_set 配置');
  }

  const actual = force.runtime.standardSets ?? [];
  if (force.runtime.requiredCount !== 4 || actual.length !== 4) {
    contentError(force.sourcePath, '程序标准集合', 'Force 总数必须保持为 4');
  }

  const actualById = new Map(actual.map((set) => [set.forceId, set]));
  for (const expected of EXPECTED_FORCE_STANDARD_SETS) {
    const found = actualById.get(expected.forceId);
    if (!found || [...found.objectIds].sort().join('|') !== [...expected.objectIds].sort().join('|')) {
      contentError(force.sourcePath, `程序标准集合:${expected.forceId}`, '新版四个Force.txt 与生成的 Force runtime 不一致');
    }
  }
  if (actual.some((set) => set.forceId === 'F1_RECOMMENDATION')) {
    contentError(force.sourcePath, '程序标准集合', '旧 F1_RECOMMENDATION 不得出现在 Force runtime');
  }
  if (actual.some((set) => set.objectIds.includes('ANON_RECOMMENDATION'))) {
    contentError(force.sourcePath, '程序标准集合', 'ANON_RECOMMENDATION 不得作为 Force accepted object');
  }

  const photoMapping = FORCE_OBJECT_MAP.WANG_ZHENG_SPLICED_PHOTO;
  const contentIds = new Set(contents.map((item) => item.id));
  if (!photoMapping || photoMapping.contentId !== 'wang-collage-photo' || photoMapping.canonicalId !== 'wang-collage-photo' || photoMapping.kind !== 'clue' || !contentIds.has('wang-collage-photo')) {
    contentError('Gate专用文本源/对象映射', 'WANG_ZHENG_SPLICED_PHOTO', '拼接照片必须复用现有 wang-collage-photo clue ID');
  }
}

export async function buildContent() {
  if (!existsSync(sourceRoot)) contentError(slash(path.relative(projectRoot, sourceRoot)), '<sourceRoot>', '网页文本源目录不存在');
  const files = await listFiles(sourceRoot);
  assertManifestCoverage(files, CONTENT_MANIFEST, sourceRoot);
  const contents = [];
  const contentFiles = files.filter((fullPath) => CONTENT_MANIFEST.files[slash(path.relative(sourceRoot, fullPath))]);
  for (const fullPath of contentFiles) {
    const sourcePath = slash(path.relative(sourceRoot, fullPath));
    const raw = await readFile(fullPath, 'utf8');
    const manifest = CONTENT_MANIFEST.files[sourcePath];
    const parsed = parsePlainContent({ raw, file: sourcePath, manifest: { ...manifest, images: CONTENT_MANIFEST.images } });
    contents.push(parsed);
  }

  assertTerminalChapters(contents);

  const gates = [];
  for (const [sourcePath, manifest] of Object.entries(CONTENT_MANIFEST.gates)) {
    const fullPath = path.join(sourceRoot, sourcePath);
    if (!existsSync(fullPath)) contentError(sourcePath, '<gate>', 'Gate 文本源不存在');
    const raw = await readFile(fullPath, 'utf8');
    gates.push(parseGate({ raw, file: sourcePath, manifest, objectMap: { ...FORCE_OBJECT_MAP, ...FINAL_OBJECT_MAP } }));
  }

  assertUnique([...contents, ...gates].map((item) => ({ value: item.id, file: item.sourcePath })), 'content ID');
  assertUnique(contents.filter((item) => item.standardName).map((item) => ({ value: item.standardName, file: item.sourcePath })), '标准名称');
  for (const item of contents) {
    if (!Array.isArray(item.aliases)) contentError(item.sourcePath, '搜索别名', 'aliases 必须为数组');
    if (!Array.isArray(item.searchAliases)) contentError(item.sourcePath, '搜索别名映射', 'searchAliases 必须为数组');
    if (!item.sourcePath) contentError(item.sourcePath, 'sourcePath', 'sourcePath 不能为空');
    if (!item.body?.length) contentError(item.sourcePath, 'PLAYER正文', 'PLAYER 正文解析为空');
  }
  assertObjectMappings(contents);
  assertForceRuntime(gates, contents);
  await copyMappedAssets();

  // Keep sourcePath in the build-time records and the authoring summary, but do
  // not send it to the PLAYER registry. It is not consumed by the player path.
  const playerContents = contents.map(({ internalNotes, sourcePath, ...safe }) => safe);
  const playerGates = gates.map(({ runtime, sourcePath, ...safe }) => safe);
  const runtimeGates = gates.map((gate) => ({ id: gate.id, type: gate.type, runtime: gate.runtime }));
  const playerData = { version: 1, contents: playerContents, gates: playerGates };
  const runtimeData = {
    version: 1,
    gates: runtimeGates,
    objectMap: { ...FORCE_OBJECT_MAP, ...FINAL_OBJECT_MAP, ...ENTITY_OBJECT_MAP }
  };
  assertPlayerSafe(playerData, 'generated/content.player.generated.json');
  assertPlayerSafe(runtimeData, 'generated/content.runtime.generated.json');
  await mkdir(generatedRoot, { recursive: true });
  await writeFile(path.join(generatedRoot, 'content.player.generated.json'), `${JSON.stringify(playerData, null, 2)}\n`, 'utf8');
  await writeFile(path.join(generatedRoot, 'content.runtime.generated.json'), `${JSON.stringify(runtimeData, null, 2)}\n`, 'utf8');
  await writeFile(path.join(generatedRoot, 'content.registry.summary.json'), `${JSON.stringify(contentSummary(contents, gates), null, 2)}\n`, 'utf8');
  return { sourceRoot, contents, gates, summary: contentSummary(contents, gates) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await buildContent();
    console.log(`[ContentRegistry] parsed ${result.contents.length} content files and ${result.gates.length} gates from ${result.sourceRoot}`);
    console.log(JSON.stringify(result.summary, null, 2));
  } catch (error) {
    if (error instanceof ContentValidationError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

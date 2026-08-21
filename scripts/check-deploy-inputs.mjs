import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const generatedRoot = path.join(projectRoot, 'src', 'content', 'generated');
const assetsRoot = path.join(projectRoot, 'public', 'content-assets');

const requiredFiles = [
  'src/content/generated/content.player.generated.json',
  'src/content/generated/content.runtime.generated.json',
  'src/content/generated/content.registry.summary.json',
  'src/assets/hanzi/似.json',
  'src/assets/decor/tabler-leaf.svg'
];

function fail(message) {
  console.error(`[deploy-check] FAIL: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`${relativePath} 不存在或不是有效 JSON：${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!statSync(absolutePath, { throwIfNoEntry: false })?.isFile()) {
    fail(`缺少部署必需文件 ${relativePath}`);
  }
}

if (!statSync(assetsRoot, { throwIfNoEntry: false })?.isDirectory()) {
  fail('缺少部署必需目录 public/content-assets/');
}

const playerData = readJson('src/content/generated/content.player.generated.json');
const runtimeData = readJson('src/content/generated/content.runtime.generated.json');
const summaryData = readJson('src/content/generated/content.registry.summary.json');

if (!Array.isArray(playerData.contents) || playerData.contents.length !== 34) {
  fail('PLAYER generated data 不完整：预期 34 个 content');
}
if (!Array.isArray(playerData.gates) || playerData.gates.length !== 3) {
  fail('PLAYER generated data 不完整：预期 3 个 Gate');
}
if (!Array.isArray(runtimeData.gates) || runtimeData.gates.length !== 3 || !runtimeData.objectMap || typeof runtimeData.objectMap !== 'object') {
  fail('runtime generated data 不完整：Gate 或 objectMap 缺失');
}
if (!Array.isArray(summaryData.entries) || summaryData.entries.length !== 37) {
  fail('content registry summary 不完整：预期 34 个 content + 3 个 Gate');
}

const assetRefs = new Set();
function collectAssetRefs(value) {
  if (Array.isArray(value)) {
    for (const item of value) collectAssetRefs(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'src' || key === 'image') && typeof child === 'string' && child.startsWith('/content-assets/')) {
      assetRefs.add(child.slice('/content-assets/'.length));
    }
    collectAssetRefs(child);
  }
}
collectAssetRefs(playerData);

if (assetRefs.size === 0) fail('PLAYER generated data 没有发现 content-assets 图片映射');
for (const relativePath of assetRefs) {
  const absolutePath = path.join(assetsRoot, relativePath);
  if (!statSync(absolutePath, { throwIfNoEntry: false })?.isFile()) {
    fail(`缺少 PLAYER/runtime 所需图片资源 public/content-assets/${relativePath}`);
  }
}

console.log(`[deploy-check] PASS: PLAYER ${playerData.contents.length} content, ${playerData.gates.length} gates, ${assetRefs.size} mapped assets, local Hanzi Writer and Tabler leaf present`);

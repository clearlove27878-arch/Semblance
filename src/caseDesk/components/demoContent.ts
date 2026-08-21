import type { CaseClue } from './types';

const DEMO_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg" width="720" height="420" viewBox="0 0 720 420"%3E%3Crect width="720" height="420" fill="%23eee8de"%2F%3E%3Cpath d="M70 330L210 180l100 90 80-120 260 180" fill="none" stroke="%2380684c" stroke-width="5"%2F%3E%3Ccircle cx="500" cy="130" r="48" fill="none" stroke="%2380684c" stroke-width="5"%2F%3E%3Cpath d="M500 90v80M460 130h80" stroke="%2380684c" stroke-width="4"%2F%3E%3Ctext x="36" y="48" fill="%235f4c38" font-size="22" font-family="sans-serif"%3EUI EVIDENCE PREVIEW%3C%2Ftext%3E%3C%2Fsvg%3E';

export const CASE_DESK_DEMO_CLUES: CaseClue[] = [
  {
    id: 'demo-death-scene',
    title: '死亡现场',
    category: '现场与法医',
    summary: '无图片状态的中性测试线索。',
    body: ['这是一条只用于验证案件桌正文排版的灰盒数据。', '正文可以很短，也可以继续增加段落；组件不会把内容写死在模板里。'],
    highlights: ['重点句只在数据提供时出现。'],
    viewed: false
  },
  {
    id: 'demo-forensic',
    title: '法医鉴定',
    category: '人物与口供',
    summary: '带图片状态的中性测试线索。',
    body: ['这条线索附带一张中性示意图，用来确认图片自动适配宽度。', '图片与正文都由数据对象提供，后续可替换为正式来源。'],
    image: DEMO_IMAGE,
    viewed: false
  },
  {
    id: 'demo-mirror',
    title: '治疗镜',
    category: '枫家',
    summary: '用于测试较长标题和对象名称。',
    body: ['对象名称可以复制，也可以加入底部推理对象栏。'],
    viewed: false
  },
  {
    id: 'demo-cabinet',
    title: '蛇柜',
    category: '枫家',
    summary: '用于测试同类线索的并列阅读。',
    body: ['同类线索仍然保持独立卡片，搜索时可以按标题或类别匹配。'],
    viewed: false
  },
  {
    id: 'demo-tape-box',
    title: '磁带箱',
    category: '调查补充',
    summary: '用于测试第五个线索与横向滚动。',
    body: ['线索数量增加后，桌面端线索带保持横向滚动，正文区域不会被压窄。'],
    viewed: false
  }
];

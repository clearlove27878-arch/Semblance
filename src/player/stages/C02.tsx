import type { StageViewProps } from '../types';
import { Panel, SecondaryButton } from '../components';

export const meta = { id: 'C02', chapter: '似', title: '一道没有答案的推理题', view: 'reading' as const };

const paragraphs = [
  ['王峥根本不需要进现场', '小陈提出：如果王峥真的想杀程岚，为什么一定要亲自进去？他最了解的不是房间，而是程岚曾经接触过的人和物。'],
  ['让她知道“我回来了”', '王峥回到当地后亲自去诊所见过程岚。小陈把这次重逢写成一个疑问，但这只是小陈的联想，不是程岚当时说过的话。'],
  ['把她送进一个相似家庭', '一个同样有表达障碍的年轻男人成为她的新患者。小陈把零散材料拼成布局故事，但没有一条材料直接说明这就是王峥的安排。'],
  ['旧磁带不是答案，是谜面', '许玲调查旧案后，王峥送来一批旧磁带。小陈说它们适合当诱饵，让答案看起来已经被放进这个家。'],
  ['严重残损的标签', '磁带堆里有一盘标签严重残损的旧儿童磁带。正常看，它只是无法完整辨认的旧标签；小陈把残损列入布局故事中的可能提示。'],
  ['越危险，越像答案', '房间里还有碎镜、新蛇符、被翻乱的磁带和蛇柜。小陈把“危险”和“重要”连成一段故事。'],
  ['故事逐渐闭合', '小陈把王峥、旧磁带、残损标签、碎镜、蛇符和蛇柜全看成同一套布局的线索，并认为这套布局足以让人主动靠近危险。'],
  ['那句“自白”', '小陈翻出王峥的一句话：“一个人自己不动手，只说几句话，放几样东西，最后另一个人死了。这种人，也算凶手？”小陈几乎认定这是自白。'],
  ['老吴只问一件事', '老吴不急着否定，只问：“这些意思，有哪一句是程岚自己说过的？”小陈无法回答。故事结尾：目前没有一条可核对的指令。']
] as const;

export default function C02({ state, continueReading, updateReadingExit }: StageViewProps) {
  const reading = state.reading.C02;
  const paragraph = paragraphs[Math.min(reading.current_paragraph, paragraphs.length) - 1];
  const isLast = reading.current_paragraph >= paragraphs.length;
  return <div className="stage-board"><div className="stage-heading"><h1>一道没有答案的推理题</h1><p>小陈正在讲故事，不是在让你替他投票。</p></div><Panel className="story-card"><div><div className="story-kicker">第 {reading.current_paragraph} / {paragraphs.length} 段｜{paragraph[0]}</div><p className="story-text">{paragraph[1]}</p></div><div className="paragraph-progress">已读到第 {reading.max_unlocked_paragraph} 段</div></Panel><div className="stage-footer">{isLast ? <SecondaryButton onClick={() => continueReading('C02', paragraphs.length)}>返回调查</SecondaryButton> : <button type="button" className="primary-button" onClick={() => { updateReadingExit('C02'); continueReading('C02', paragraphs.length); }}>继续</button>}</div></div>;
}

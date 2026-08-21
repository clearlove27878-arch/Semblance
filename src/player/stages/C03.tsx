import type { StageViewProps } from '../types';
import { Panel } from '../components';

export const meta = { id: 'C03', chapter: '证', title: '一封哑巴从未写过的情书', view: 'reading' as const };

const paragraphs = [
  ['许玲最恨的可能不是漂亮', '小陈把程岚年轻漂亮和她自称听得懂周枫并置起来，猜许玲的敌意也许可以从这里解释。'],
  ['蛇符里装的是我', '新蛇符里有许玲的头发、红线和名字。小陈却把几句零散话连成一个故事。'],
  ['钥匙消失', '旧蛇符过去与备用钥匙有关，新蛇符却没有钥匙。小陈把它写成女人失去位置。'],
  ['镜子碎了', '镜子长期用于周枫的语言治疗，案发当天却碎了。小陈把它写成治疗结束的暗语。'],
  ['残损儿童磁带的标签', '磁带堆里又有一盘标签残损的旧儿童带。残留下来的字无法还原成完整句子。'],
  ['最后一句在哪里', '小陈把房间写成周枫留给程岚的秘密表达，认为最后一句当然在蛇柜。'],
  ['危险被拼成最后一句', '小陈承认毒蛇危险，却把靠近蛇柜继续写成这封信的阅读动作。'],
  ['一封从未写过的情书', '在这套故事里，没有明确指令，只有真实物件被排列在一起。小陈把它写成了一封从未写过的情书。'],
  ['老吴拆解', '老吴逐项追问：蛇符、钥匙、镜子、残损标签和蛇柜，哪一个字是死者自己确认过的？小陈答不出来。故事结尾：故事很漂亮。证据在哪里？']
] as const;

export default function C03({ state, continueReading, updateReadingExit }: StageViewProps) {
  const reading = state.reading.C03; const paragraph = paragraphs[Math.min(reading.current_paragraph, paragraphs.length) - 1]; const last = reading.current_paragraph >= paragraphs.length;
  return <div className="stage-board"><div className="stage-heading"><h1>一封哑巴从未写过的情书</h1><p>这是一套解释，不是新的硬证据。</p></div><Panel className="story-card"><div><div className="story-kicker">第 {reading.current_paragraph} / {paragraphs.length} 段｜{paragraph[0]}</div><p className="story-text">{paragraph[1]}</p></div><div className="paragraph-progress">逐段阅读，不能跳到结尾</div></Panel><div className="stage-footer">{last ? <button type="button" className="secondary-button" onClick={() => continueReading('C03', paragraphs.length)}>返回证据争点</button> : <button type="button" className="primary-button" onClick={() => { updateReadingExit('C03'); continueReading('C03', paragraphs.length); }}>继续</button>}</div></div>;
}

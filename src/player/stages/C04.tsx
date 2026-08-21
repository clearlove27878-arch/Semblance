import type { StageViewProps } from '../types';
import { Panel } from '../components';

export const meta = { id: 'C04', chapter: '证', title: '蛇选新娘', view: 'reading' as const };

const paragraphs = [
  ['治疗师也许不是在找东西', '小陈提出：程岚靠近蛇柜，也许是让周枫最珍爱的蛇替周枫回答一个他说不出口的问题。'],
  ['蛇成了第二张嘴', '小陈把眼神、停顿和动作整理成“她能读懂他”的前提，又让一条蛇承担替周枫给出答案的角色。'],
  ['民俗被拼成蛇选新娘', '村里真正存在的只是家蛇认熟人、外人不要随便碰等零碎说法。小陈却拼出完整规矩。'],
  ['蛇符成了现任新娘名牌', '新蛇符里有许玲头发、红线和名字。小陈把它写成现任新娘的名牌。'],
  ['小陈拼出的选择场景', '小陈把蛇符、成年毒蛇和周枫不给明确答案排列成选择场景，并替故事写出一句话。'],
  ['这场选择并不公平', '周枫以前是蛇农，比所有人更了解那条蛇。小陈把接近写成一场不对等的选拔。'],
  ['危险被写成答案', '小陈承认蛇有危险，却把这次接近写成越危险越像答案。'],
  ['两根手指，两颗毒牙', '警方问周枫程岚以前是否被家中蛇咬过，他否认时右手两根手指轻微同时抬起，其中一根还有新伤。小陈说两根手指，两颗毒牙。'],
  ['最后的答案', '警方问周枫是否喜欢程岚，他写“医生”，再追问写“我要结婚”。小陈把这两句当成故事结局。'],
  ['老吴拆解', '老吴逐项追问：谁证明真有蛇选新娘？谁证明两根手指是毒牙？小陈一句句答不出来。']
] as const;

export default function C04({ state, continueReading, updateReadingExit }: StageViewProps) {
  const reading = state.reading.C04; const paragraph = paragraphs[Math.min(reading.current_paragraph, paragraphs.length) - 1]; const last = reading.current_paragraph >= paragraphs.length;
  return <div className="stage-board"><div className="stage-heading"><h1>蛇选新娘</h1><p>虚构故事不会自动成为硬事实。</p></div><Panel className="story-card"><div><div className="story-kicker">第 {reading.current_paragraph} / {paragraphs.length} 段｜{paragraph[0]}</div><p className="story-text">{paragraph[1]}</p></div><div className="paragraph-progress">读完后返回 T04 审查</div></Panel><div className="stage-footer">{last ? <button type="button" className="secondary-button" onClick={() => continueReading('C04', paragraphs.length)}>返回证据争点</button> : <button type="button" className="primary-button" onClick={() => { updateReadingExit('C04'); continueReading('C04', paragraphs.length); }}>继续</button>}</div></div>;
}

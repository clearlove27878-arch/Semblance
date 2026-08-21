import type { StageViewProps } from '../types';
import { Panel, SecondaryButton, StageFooter } from '../components';

export const meta = { id: 'C01', chapter: '家', title: '女儿一直在替他们送情书', view: 'reading' as const };

const paragraphs = [
  ['妻子可能说对了一半', '赵振华的妻子知道丈夫经常去周枫家，也知道死者年轻漂亮。案发后，丈夫从现场抱回几盘磁带，在水池边认真清洗。她骂：“你洗什么？洗证据啊？”小陈翻完笔录后发现：她引用的每一个事实都是真的。'],
  ['儿童磁带，也许根本不是儿童磁带', '周枫家堆着廉价旧儿童磁带，程岚每周来治疗，赵振华也常以“给女儿拿故事带”为由进来。小陈提出：如果两个人不想留下电话和纸条，谁都懒得仔细听的破儿童磁带，反而可能是一只安全邮箱。'],
  ['为什么他每次都洗', '警方确认赵振华长期会清洗从周枫家拿回的旧磁带。这原本是无辜证据。小陈却说：正因为他每一次都洗，案发当天再洗才不会显得特别。'],
  ['但警方明明听过磁带', '老吴反问：“磁带我们听过。哪来的情书？”小陈翻出清单：有些磁带受潮、磨损、断裂，只能播放部分内容。于是他补出一层：真正的私密录音可能藏在已经坏掉的磁带里。'],
  ['女儿真的听见了程岚', '案发后，赵振华带回的磁带中，女儿真的听到一个女人讲话。小女孩说：“可甜可甜了，超好听的。”女性、单独录音、就在案发现场带回的磁带里。'],
  ['这个证据是真的', '警方重新播放。声音确实可以确认是程岚，但仅凭现有这段录音，无法确认它是什么时候录下的，也无法确认原本是录给谁的。女孩没有说错：她确实听见了程岚。'],
  ['小陈还是不死心', '小陈继续把故事往下编：赵振华也许以为自己在偷情，其实只是被程岚当成住在周枫家旁边的一只眼睛。她可能通过他打听周枫、许玲、备用钥匙和家里新增的东西。'],
  ['案发当天的磁带故事', '小陈猜程岚案发前可能准备结束某段关系，屋里也许留着一盘最后的录音。他把程岚进入周枫家和赵振华进入现场拼进同一个故事。'],
  ['时间线对不上', '老吴没有先问磁带，而是问：“你还记得时间线吗？”现有记录显示：程岚先离开周枫家，赵振华后来才进入。两个人没有在屋里碰上。'],
  ['洗磁带仍然可疑', '小陈只好改写故事：程岚离开以后，赵振华才进入现场，拿走几盘磁带，回家照例清洗。妻子看到丈夫刚去过命案现场、丈夫抱回磁带还在水池边清洗，仍然觉得这几乎符合销证故事。'],
  ['老吴拆故事', '老吴逐项追问：两人是否在屋里碰上？时间线不支持。赵振华是否确实进入并拿走磁带？是。清洗是不是他以前一直有的习惯？需要继续调查。女儿是否真的听见程岚？是。你把几件真实材料拼成了一个故事，但故事里的关键关系还没有被证明。']
] as const;

export default function C01({ state, continueReading, updateReadingExit }: StageViewProps) {
  const reading = state.reading.C01;
  const paragraph = paragraphs[Math.min(reading.current_paragraph, paragraphs.length) - 1];
  const isLast = reading.current_paragraph >= paragraphs.length;
  return <div className="stage-board"><div className="stage-heading"><h1>女儿一直在替他们送情书</h1><p>这不是待解的选择题。请听完小陈的想法，再回到调查页面。</p></div><Panel className="story-card"><div><div className="story-kicker">第 {reading.current_paragraph} / {paragraphs.length} 段｜{paragraph[0]}</div><p className="story-text">{paragraph[1]}</p></div><div className="paragraph-progress">已读到第 {reading.max_unlocked_paragraph} 段</div></Panel><StageFooter>{isLast ? <SecondaryButton onClick={() => continueReading('C01', paragraphs.length)}>返回调查</SecondaryButton> : <button type="button" className="primary-button" onClick={() => { updateReadingExit('C01'); continueReading('C01', paragraphs.length); }}>继续</button>}</StageFooter></div>;
}

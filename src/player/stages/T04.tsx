import { TrialBoard, type TrialConfig } from './TrialBoard';
import type { StageViewProps } from '../types';
export const meta = { id: 'T04', chapter: '证', title: '周枫：高度可疑 = 已证明实施？', view: 'assessment' as const };
const config: TrialConfig = { id: 'T04', title: '周枫：高度可疑 = 已证明实施？', statement: '“周枫懂蛇、手上有新伤，口供又存在异常，所以可以证明他主动制造了程岚的中毒。”', prompt: '异常很多，但具体毒液进入方式还缺什么？', items: [{ id: 'E002', title: '野道尸体现场' }, { id: 'E024', title: '周枫简化口供' }, { id: 'E025', title: '两指微动作' }, { id: 'E026', title: '周枫新伤' }] };
export default function T04(props: StageViewProps) { return <TrialBoard {...props} config={config} />; }

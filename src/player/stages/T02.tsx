import { TrialBoard, type TrialConfig } from './TrialBoard';
import type { StageViewProps } from '../types';
export const meta = { id: 'T02', chapter: '证', title: '王峥：布局 = 杀人？', view: 'assessment' as const };
const config: TrialConfig = { id: 'T02', title: '王峥：布局 = 杀人？', statement: '“王峥把程岚送进这个家庭，又送磁带，所以他已经完成了幕后杀人布局。”', prompt: '实施链具体缺在哪里？', items: [{ id: 'E016', title: '近期诊所接触' }, { id: 'E017', title: '匿名推荐' }, { id: 'E018', title: '磁带包裹' }, { id: 'E022', title: '第二次审讯' }] };
export default function T02(props: StageViewProps) { return <TrialBoard {...props} config={config} />; }

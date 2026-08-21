import { TrialBoard, type TrialConfig } from './TrialBoard';
import type { StageViewProps } from '../types';
export const meta = { id: 'T01', chapter: '证', title: '赵振华：洗带 = 销证？', view: 'assessment' as const };
const config: TrialConfig = { id: 'T01', title: '赵振华：洗带 = 销证？', statement: '“赵振华案发后拿走并清洗磁带，所以清洗就是销毁犯罪证据。”', prompt: '哪里不能把“洗过”直接写成“销证”？', items: [{ id: 'E012', title: '长期清洗习惯' }, { id: 'E013', title: '女儿听见的声音' }] };
export default function T01(props: StageViewProps) { return <TrialBoard {...props} config={config} />; }

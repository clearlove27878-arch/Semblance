import { TrialBoard, type TrialConfig } from './TrialBoard';
import type { StageViewProps } from '../types';
export const meta = { id: 'T03', chapter: '证', title: '许玲：杀意＋蛇符 = 致死？', view: 'assessment' as const };
const config: TrialConfig = { id: 'T03', title: '许玲：杀意＋蛇符 = 致死？', statement: '“许玲有明确敌意，新蛇符又在案发前刚做，因此蛇符就是致死机关。”', prompt: '为什么敌意和准备仍没有闭合到死者伤口？', items: [{ id: 'E008', title: '新蛇符' }, { id: 'E023', title: '许玲简化口供' }] };
export default function T03(props: StageViewProps) { return <TrialBoard {...props} config={config} />; }

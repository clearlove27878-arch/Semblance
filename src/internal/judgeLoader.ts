import type { JudgeResult, StageId } from '../core/types';

type JudgeModule = { judge: (payload: Record<string, unknown>) => JudgeResult };

const LOADERS: Partial<Record<StageId, () => Promise<JudgeModule>>> = {
  G01: () => import('./judgements/G01'), G02: () => import('./judgements/G02'), G03: () => import('./judgements/G03'),
  G04: () => import('./judgements/G04'), G05: () => import('./judgements/G05'), G06: () => import('./judgements/G06'), G07: () => import('./judgements/G07'),
  T01: () => import('./judgements/T01'), T02: () => import('./judgements/T02'), T03: () => import('./judgements/T03'), T04: () => import('./judgements/T04'),
  F01: () => import('./judgements/F01'), F02: () => import('./judgements/F02'), F03: () => import('./judgements/F03'), F04: () => import('./judgements/F04'),
  F05: () => import('./judgements/F05'), F06: () => import('./judgements/F06'), F07: () => import('./judgements/F07'), F08: () => import('./judgements/F08'), F09: () => import('./judgements/F09'),
  E030: () => import('./judgements/E030')
};

export async function judgeStage(id: StageId, payload: Record<string, unknown>): Promise<JudgeResult> {
  const loader = LOADERS[id];
  if (!loader) return { kind: 'INFO', code: 'NO_JUDGE' };
  const module = await loader();
  return module.judge(payload);
}

import type { StageId } from '../core/types';
import type { StageModule } from './types';

const LOADERS: Record<StageId, () => Promise<StageModule>> = {
  G01: () => import('./stages/G01'),
  G02: () => import('./stages/G02'),
  G03: () => import('./stages/G03'),
  C01: () => import('./stages/C01'),
  G04: () => import('./stages/G04'),
  G05: () => import('./stages/G05'),
  C02: () => import('./stages/C02'),
  G06: () => import('./stages/G06'),
  C03: () => import('./stages/C03'),
  C04: () => import('./stages/C04'),
  T01: () => import('./stages/T01'),
  T02: () => import('./stages/T02'),
  T03: () => import('./stages/T03'),
  T04: () => import('./stages/T04'),
  G07: () => import('./stages/G07'),
  F01: () => import('./stages/F01'),
  F02: () => import('./stages/F02'),
  F03: () => import('./stages/F03'),
  E030: () => import('./stages/E030'),
  F04: () => import('./stages/F04'),
  F05: () => import('./stages/F05'),
  F06: () => import('./stages/F06'),
  F07: () => import('./stages/F07'),
  F08: () => import('./stages/F08'),
  F09: () => import('./stages/F09')
};

export function loadStageModule(id: StageId): Promise<StageModule> {
  return LOADERS[id]();
}

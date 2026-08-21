export interface IntroSegment {
  kicker: string;
  body: string;
}

const SEGMENT_LOADERS: Array<() => Promise<{ default: IntroSegment }>> = [
  () => import('./intro-content/segment1'),
  () => import('./intro-content/segment2'),
  () => import('./intro-content/segment3'),
  () => import('./intro-content/segment4')
];

export function loadIntroSegment(step: number): Promise<IntroSegment> {
  const loader = SEGMENT_LOADERS[step - 1];
  if (!loader) return Promise.reject(new Error('Unknown intro step'));
  return loader().then((module) => module.default);
}

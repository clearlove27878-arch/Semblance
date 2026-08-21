import type { ReactNode } from 'react';
import { AmbientBackground, type AmbientVariant } from './AmbientBackground';

interface AmbientSceneProps {
  children: ReactNode;
  sceneKey: string;
  variant?: AmbientVariant;
}

/** Adds the fixed atmospheric layer without changing the page's content flow. */
export function AmbientScene({ children, sceneKey, variant = 'normal' }: AmbientSceneProps) {
  return (
    <>
      <AmbientBackground variant={variant} />
      <div className="visual-scene" data-visual-scene={sceneKey} key={sceneKey}>{children}</div>
    </>
  );
}

export default AmbientScene;

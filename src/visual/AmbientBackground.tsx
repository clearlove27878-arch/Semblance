import type { CSSProperties } from 'react';
import tablerLeafUrl from '../assets/decor/tabler-leaf.svg';

export type AmbientVariant = 'normal' | 'reading-index' | 'reader' | 'quiet';

interface LeafConfig {
  left: string;
  delay: string;
  duration: string;
  size: string;
  drift: string;
  spin: string;
  rotation: string;
  alpha: number;
  tone: string;
  distance: 'near' | 'far';
}

type LeafStyle = CSSProperties & Record<`--${string}`, string | number>;

// One small, deterministic field is enough to keep the ambient layer quiet.
// CSS owns the animation after mount; React never updates these values per frame.
const LEAVES: readonly LeafConfig[] = [
  { left: '4%', delay: '-11s', duration: '31s', size: '22px', drift: '42px', spin: '34deg', rotation: '-24deg', alpha: .96, tone: '#6B4E34', distance: 'near' },
  { left: '17%', delay: '-26s', duration: '38s', size: '27px', drift: '-36px', spin: '-28deg', rotation: '42deg', alpha: .76, tone: '#806A54', distance: 'far' },
  { left: '31%', delay: '-4s', duration: '27s', size: '18px', drift: '28px', spin: '24deg', rotation: '-55deg', alpha: .92, tone: '#7A5A3A', distance: 'near' },
  { left: '47%', delay: '-21s', duration: '35s', size: '24px', drift: '-46px', spin: '-38deg', rotation: '26deg', alpha: .72, tone: '#786552', distance: 'far' },
  { left: '62%', delay: '-15s', duration: '29s', size: '20px', drift: '34px', spin: '31deg', rotation: '66deg', alpha: .94, tone: '#5E4938', distance: 'near' },
  { left: '74%', delay: '-34s', duration: '40s', size: '30px', drift: '-30px', spin: '-26deg', rotation: '-38deg', alpha: .68, tone: '#88715B', distance: 'far' },
  { left: '86%', delay: '-8s', duration: '33s', size: '23px', drift: '39px', spin: '36deg', rotation: '18deg', alpha: .9, tone: '#74563D', distance: 'near' },
  { left: '95%', delay: '-19s', duration: '26s', size: '18px', drift: '-22px', spin: '-30deg', rotation: '-48deg', alpha: .74, tone: '#7E6955', distance: 'far' },
];

function leafStyle(leaf: LeafConfig): LeafStyle {
  return {
    '--leaf-left': leaf.left,
    '--leaf-delay': leaf.delay,
    '--leaf-duration': leaf.duration,
    '--leaf-size': leaf.size,
    '--leaf-drift': leaf.drift,
    '--leaf-spin': leaf.spin,
    '--leaf-rotation': leaf.rotation,
    '--leaf-alpha': leaf.alpha,
    '--leaf-tone': leaf.tone,
  };
}

export function AmbientBackground({ variant = 'normal' }: { variant?: AmbientVariant }) {
  return (
    <div className={`ambient-background ambient-background--${variant}`} aria-hidden="true">
      <svg className="ambient-filter-definitions" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="ambient-leaf-texture" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="1" seed="17" result="leaf-noise" />
            <feColorMatrix in="leaf-noise" type="matrix" values="0 0 0 0 .35 0 0 0 0 .28 0 0 0 0 .18 0 0 0 .075 0" result="leaf-noise-tint" />
            <feComposite in="leaf-noise-tint" in2="SourceGraphic" operator="in" result="leaf-noise-clipped" />
            <feBlend in="SourceGraphic" in2="leaf-noise-clipped" mode="soft-light" />
          </filter>
        </defs>
      </svg>
      <div className="ambient-leaf-field">
        {LEAVES.map((leaf, index) => (
          <span className={`ambient-leaf ambient-leaf--${leaf.distance}`} key={index} style={leafStyle(leaf)}>
            <span className="ambient-leaf-shape" style={{ '--leaf-mask': `url("${tablerLeafUrl}")` } as CSSProperties} />
          </span>
        ))}
      </div>
    </div>
  );
}

export default AmbientBackground;

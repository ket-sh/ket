export type Status = 'done' | 'active' | 'pending' | 'blocked';

export const BLINK_FRAMES = 1;

export const FRAME_INTERVAL = 420;

const ACTIVE_LIT = '#e08c3c';

const ACTIVE_DIM = '#8a5a28';

const SETTLED: Record<Exclude<Status, 'active'>, { color: string; mark: string }> = {
  done: { color: '#57ab5a', mark: '✓' },
  pending: { color: '#5f5f5f', mark: '○' },
  blocked: { color: '#dbab57', mark: '⏸' },
};

export interface Appearance {
  color: string;
  mark: string;
}

function activeAppearance(tick: number): Appearance {
  const lit = Math.floor(tick / BLINK_FRAMES) % 2 === 0;

  return { color: lit ? ACTIVE_LIT : ACTIVE_DIM, mark: '' };
}

export function appearanceOf(status: Status, tick: number): Appearance {
  if (status === 'active') {
    return activeAppearance(tick);
  }

  return SETTLED[status];
}

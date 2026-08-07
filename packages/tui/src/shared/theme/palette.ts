export const BASE = '#1f1f28';

export const SURFACE1 = '#363646';

export const OVERLAY = '#54546d';

export const TEXT = '#dcd7ba';

export const SUBTEXT = '#c8c093';

export const BLUE = '#7fb4ca';

export const GREEN = '#98bb6c';

export const YELLOW = '#e6c384';

export const PINK = '#d27e99';

export const RED = '#ff5d62';

const GRAY = '#727169';

const AQUA = '#7aa89f';

const ORANGE = '#ffa066';

export const VIOLET = '#957fb8';

const VIOLET_MUTED = '#938aa9';

export const STAGE_COLOR: Record<string, string> = {
  idea: GRAY,
  triaged: BLUE,
  designing: VIOLET,
  'awaiting-approval': YELLOW,
  implementing: ORANGE,
  verifying: AQUA,
  'awaiting-merge': VIOLET_MUTED,
  shipped: GREEN,
};

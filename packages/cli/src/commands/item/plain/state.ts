import { createHash } from 'node:crypto';

export type PlainState = 'fresh' | 'stale' | 'unstamped';

const SOURCE_OPENER = 'Source: ';

export function fingerprintOf(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 12);
}

function splitAtTitle(plain: string): { lead: string[]; rest: string[] } {
  const lines = plain.split('\n');
  const at = lines.findIndex((line) => line.startsWith('# '));
  const cut = at === -1 ? lines.length : at;

  return { lead: lines.slice(0, cut), rest: lines.slice(cut) };
}

function stampOf(plain: string): string | undefined {
  for (const line of splitAtTitle(plain).lead) {
    const trimmed = line.trim();

    if (trimmed.startsWith(SOURCE_OPENER)) {
      return trimmed.slice(SOURCE_OPENER.length).trim();
    }
  }

  return undefined;
}

export function stamped(technical: string, plain: string): string {
  const mark = `${SOURCE_OPENER}${fingerprintOf(technical)}`;
  const { lead, rest } = splitAtTitle(plain);
  const kept = lead.filter((line) => !line.trim().startsWith(SOURCE_OPENER));
  const below = [...kept, ...rest];
  const spaced = below[0] === '' ? below : ['', ...below];

  return [mark, ...spaced].join('\n');
}

export function plainState(technical: string, plain: string): PlainState {
  const stamp = stampOf(plain);

  if (stamp === undefined) {
    return 'unstamped';
  }

  return stamp === fingerprintOf(technical) ? 'fresh' : 'stale';
}

import type { Sketch } from './sketch.ts';

export interface DesignCallout {
  claim: string;
  shape: string;
}

function wordAt(entry: object, field: string): boolean {
  const held: unknown = Reflect.get(entry, field);

  return typeof held === 'string' && held !== '';
}

function isCallout(entry: unknown): entry is DesignCallout {
  return (
    entry !== null && typeof entry === 'object' && wordAt(entry, 'claim') && wordAt(entry, 'shape')
  );
}

export function calloutsOf(source: string | undefined): DesignCallout[] {
  if (source === undefined) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(source);

    return Array.isArray(parsed) ? parsed.filter(isCallout) : [];
  } catch {
    return [];
  }
}

export interface VerdictRow {
  option: string;
  chosen: boolean;
  glyphs: string[];
}

export interface LedgerLine {
  at: string;
  text: string;
  refused: boolean;
}

interface AudienceSides {
  label: string;
  tech: string;
  plain: string | undefined;
  note: string | undefined;
}

export type SurfaceDoc =
  | ({ kind: 'prose' } & AudienceSides)
  | ({ kind: 'design'; callouts: DesignCallout[]; sketch: Sketch | undefined } & AudienceSides)
  | { kind: 'sketch'; label: string; sketch: Sketch; callouts: DesignCallout[] }
  | { kind: 'criteria'; label: string; name: string; source: string }
  | {
      kind: 'decision';
      label: string;
      tech: string;
      plain: string | undefined;
      drivers: string[];
      rows: VerdictRow[];
    }
  | { kind: 'diff'; label: string; text: string }
  | {
      kind: 'blast';
      label: string;
      base: string;
      collapse: number;
      budget: number;
      shown: number;
      uncollapsedNodes: number;
      uncollapsedEdges: number;
      sketch: Sketch;
    }
  | { kind: 'ledger'; label: string; lines: LedgerLine[] };

import type { Journey, SurfaceDoc } from '../../shared/journey.ts';
import type { LoggedEvent } from '../../shared/kanban.ts';
import type { Sketch } from '../../shared/sketch.ts';
import type { LedgerLine, VerdictRow } from '../../shared/surface-doc.ts';

import { readArtifact, readBlast } from '../../shared/artifact-store.ts';
import { eventsAbout } from '../../shared/kanban.ts';
import { matrixOf, withoutMatrixLines } from '../../shared/matrix.ts';
import { plainState } from '../../shared/plain-state.ts';
import { sketchOf } from '../../shared/sketch.ts';
import { calloutsOf } from '../../shared/surface-doc.ts';

const LAG_NOTE = 'Plain version lags behind its source.';

interface Shelf {
  spec: SurfaceDoc | undefined;
  design: SurfaceDoc | undefined;
  sketch: SurfaceDoc | undefined;
  decision: SurfaceDoc | undefined;
  brief: SurfaceDoc | undefined;
  findings: SurfaceDoc | undefined;
  diff: SurfaceDoc | undefined;
  blast: SurfaceDoc | undefined;
}

function noteOf(tech: string | undefined, plain: string | undefined): string | undefined {
  if (plain === undefined) {
    return undefined;
  }

  const lags = tech === undefined || plainState(tech, plain) === 'stale';

  return lags ? LAG_NOTE : undefined;
}

function proseDoc(
  label: string,
  tech: string | undefined,
  plain: string | undefined,
): SurfaceDoc | undefined {
  if (tech === undefined && plain === undefined) {
    return undefined;
  }

  return { kind: 'prose', label, tech: tech ?? '', plain, note: noteOf(tech, plain) };
}

function designDoc(
  tech: string | undefined,
  plain: string | undefined,
  callouts: string | undefined,
  drawing: Sketch | undefined,
): SurfaceDoc | undefined {
  if (tech === undefined) {
    return undefined;
  }

  return {
    kind: 'design',
    label: 'Design',
    tech,
    plain,
    note: noteOf(tech, plain),
    callouts: calloutsOf(callouts),
    sketch: drawing,
  };
}

function sketchDoc(
  drawing: Sketch | undefined,
  callouts: string | undefined,
): SurfaceDoc | undefined {
  if (drawing === undefined) {
    return undefined;
  }

  return { kind: 'sketch', label: 'Diagram', sketch: drawing, callouts: calloutsOf(callouts) };
}

function verdictRows(source: string): VerdictRow[] {
  const matrix = matrixOf(source);

  return (matrix?.rows ?? []).map((row) => ({
    option: row.option,
    chosen: row.chosen,
    glyphs: row.cells.map((cell) => cell.glyph),
  }));
}

function decisionDoc(tech: string | undefined, plain: string | undefined): SurfaceDoc | undefined {
  if (tech === undefined) {
    return undefined;
  }

  return {
    kind: 'decision',
    label: 'Decision',
    tech: withoutMatrixLines(tech),
    plain,
    drivers: matrixOf(tech)?.drivers ?? [],
    rows: verdictRows(tech),
  };
}

function diffDoc(text: string | undefined): SurfaceDoc | undefined {
  return text === undefined ? undefined : { kind: 'diff', label: 'Diff', text };
}

function numberAt(measure: object, field: string): number {
  const held: unknown = Reflect.get(measure, field);

  return typeof held === 'number' ? held : 0;
}

function wordAt(measure: object, field: string): string {
  const held: unknown = Reflect.get(measure, field);

  return typeof held === 'string' ? held : '';
}

function measureOf(raw: string | undefined): object {
  if (raw === undefined) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function blastDoc(source: string | undefined, measure: string | undefined): SurfaceDoc | undefined {
  if (source === undefined) {
    return undefined;
  }

  const drawing = sketchOf(source);
  const numbers = measureOf(measure);

  return {
    kind: 'blast',
    label: 'Blast',
    base: wordAt(numbers, 'base'),
    collapse: numberAt(numbers, 'collapse'),
    budget: numberAt(numbers, 'budget'),
    shown: drawing.nodes.length,
    uncollapsedNodes: numberAt(numbers, 'uncollapsedNodes'),
    uncollapsedEdges: numberAt(numbers, 'uncollapsedEdges'),
    sketch: drawing,
  };
}

async function shelfOf(itemDir: string): Promise<Shelf> {
  const spec = await readArtifact(itemDir, 'spec.md');
  const design = await readArtifact(itemDir, 'solution-design.md');
  const architecture = await readArtifact(itemDir, 'architecture.d2');
  const callouts = await readArtifact(itemDir, 'callouts.json');
  const adr = await readArtifact(itemDir, 'adr.md');
  const blast = await readBlast(itemDir);
  const drawing = architecture === undefined ? undefined : sketchOf(architecture);

  return {
    spec: proseDoc('Spec', spec, await readArtifact(itemDir, 'spec.plain.md')),
    design: designDoc(
      design,
      await readArtifact(itemDir, 'solution-design.plain.md'),
      callouts,
      drawing,
    ),
    sketch: sketchDoc(drawing, callouts),
    decision: decisionDoc(adr, await readArtifact(itemDir, 'adr.plain.md')),
    brief: proseDoc('Brief', await readArtifact(itemDir, 'change-brief.md'), undefined),
    findings: proseDoc('Findings', await readArtifact(itemDir, 'findings.md'), undefined),
    diff: diffDoc(await readArtifact(itemDir, 'change.diff')),
    blast: blastDoc(blast?.source, blast?.measure),
  };
}

const NAMED: Record<string, keyof Shelf> = {
  'spec.md': 'spec',
  'spec.plain.md': 'spec',
  'solution-design.md': 'design',
  'solution-design.plain.md': 'design',
  'architecture.d2': 'sketch',
  'callouts.json': 'sketch',
  'adr.md': 'decision',
  'adr.plain.md': 'decision',
  'change-brief.md': 'brief',
  'findings.md': 'findings',
  'change.diff': 'diff',
  'blast.d2': 'blast',
  'blast.json': 'blast',
};

async function criteriaDoc(itemDir: string, name: string): Promise<SurfaceDoc | undefined> {
  const source = await readArtifact(itemDir, `features/${name}`);

  return source === undefined ? undefined : { kind: 'criteria', label: 'Criteria', name, source };
}

async function artifactDoc(
  itemDir: string,
  shelf: Shelf,
  title: string,
): Promise<SurfaceDoc | undefined> {
  if (title.endsWith('.feature')) {
    return criteriaDoc(itemDir, title);
  }

  const named = NAMED[title];

  return named === undefined ? undefined : shelf[named];
}

function spokenOf(event: LoggedEvent): string {
  const words = [event.gate, event.outcome, event.about, event.reason];

  return words.filter((word): word is string => word !== undefined && word !== '').join(' · ');
}

function lineOf(event: LoggedEvent): LedgerLine | undefined {
  if (event.at === undefined) {
    return undefined;
  }

  return { at: event.at, text: spokenOf(event), refused: event.outcome === 'refused' };
}

function windowed(events: LoggedEvent[], from: string, until: string | undefined): LedgerLine[] {
  return events
    .flatMap((event) => {
      const line = lineOf(event);

      return line === undefined ? [] : [line];
    })
    .filter((line) => line.at >= from)
    .filter((line) => until === undefined || line.at < until);
}

function stageLedgers(journey: Journey, events: LoggedEvent[]): Map<string, SurfaceDoc> {
  const stages = journey.nodes.filter((node) => node.kind === 'stage');
  const ledgers = new Map<string, SurfaceDoc>();

  stages.forEach((stage, at) => {
    if (stage.at !== undefined) {
      ledgers.set(stage.id, {
        kind: 'ledger',
        label: 'Ledger',
        lines: windowed(events, stage.at, stages[at + 1]?.at),
      });
    }
  });

  return ledgers;
}

export async function docsFor(itemDir: string, log: string, journey: Journey): Promise<Journey> {
  const shelf = await shelfOf(itemDir);
  const ledgers = stageLedgers(journey, eventsAbout(log, journey.item));
  const nodes = await Promise.all(
    journey.nodes.map(async (node) =>
      node.kind === 'artifact'
        ? { ...node, doc: await artifactDoc(itemDir, shelf, node.title) }
        : { ...node, doc: ledgers.get(node.id) },
    ),
  );

  return { ...journey, nodes };
}

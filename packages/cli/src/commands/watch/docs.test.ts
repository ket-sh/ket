import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Journey, SurfaceDoc } from '../../shared/journey.ts';

import { foldJourney } from '../../shared/journey.ts';
import { docsFor } from './docs.ts';

let itemDir = '';

const ADR = [
  '# The call',
  '',
  '## Decision drivers',
  '- durability',
  '- simplicity',
  '',
  '## Decision',
  'Option: session store',
  'Verdicts: ++|+',
  'The counter lives with the session.',
  '',
  '## Alternatives',
  '### database',
  'Verdicts: +|-',
].join('\n');

const WROTE = [
  'spec.md',
  'solution-design.md',
  'architecture.d2',
  'adr.md',
  'features/locking.feature',
  'change.diff',
  'blast.d2',
  'change-brief.md',
  'findings.md',
  'ghost.md',
];

function logOf(): string {
  const moves = [
    { about: 'triaged', at: '2026-08-07T08:00:00.000Z' },
    { about: 'designing', at: '2026-08-07T09:00:00.000Z' },
  ].map((move) =>
    JSON.stringify({
      gate: 'transition',
      outcome: 'allowed',
      about: move.about,
      item: 'K-1',
      at: move.at,
    }),
  );
  const writes = WROTE.map((name, index) =>
    JSON.stringify({
      gate: 'write',
      outcome: 'allowed',
      about: `.ket/items/K-1/${name}`,
      item: 'K-1',
      at: `2026-08-07T09:${String(10 + index).padStart(2, '0')}:00.000Z`,
    }),
  );
  const refusal = JSON.stringify({
    gate: 'write',
    outcome: 'refused',
    about: 'src/auth.ts',
    item: 'K-1',
    reason: 'no failing test covers it',
    at: '2026-08-07T09:30:00.000Z',
  });

  return [...moves, ...writes, refusal, ''].join('\n');
}

const STORED = [
  {
    key: 'K-1',
    contents:
      'title: The watched item\nkind: feature\nsize: story\nstatus: designing\nchildren: []\n',
  },
];

async function decorated(): Promise<Journey> {
  const journey = foldJourney(STORED, logOf(), 'K-1');

  if (journey === undefined) {
    throw new Error('the fixture journey never folded');
  }

  const grown = await docsFor(itemDir, logOf(), journey);

  return grown;
}

function docOf(journey: Journey, name: string): SurfaceDoc | undefined {
  return journey.artifacts.find((artifact) => artifact.name === name)?.doc;
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-docs-'));
  await mkdir(join(itemDir, 'features'), { recursive: true });
  await writeFile(join(itemDir, 'spec.md'), '# The spec\n\nFive failures lock the account.\n');
  await writeFile(
    join(itemDir, 'spec.plain.md'),
    'Source: not-the-fingerprint\n\n# Plainly\n\nFive tries and you wait.\n',
  );
  await writeFile(
    join(itemDir, 'solution-design.md'),
    '# The design\n\nThe account locks after five failures.\n',
  );
  await writeFile(
    join(itemDir, 'solution-design.plain.md'),
    'Source: not-the-fingerprint\n\nPlainly the account locks.\n',
  );
  await writeFile(join(itemDir, 'adr.plain.md'), 'The plain call.\n');
  await writeFile(join(itemDir, 'change-brief.md'), '# Brief\n\nThe change in brief.\n');
  await writeFile(join(itemDir, 'findings.md'), '# Findings\n\nWhat the review found.\n');
  await writeFile(join(itemDir, 'callouts.json'), '[{"claim":"locks after five","shape":"lock"}]');
  await writeFile(
    join(itemDir, 'architecture.d2'),
    'login: the screen\nlock: the keeper\nlogin -> lock: fifth failure\n',
  );
  await writeFile(join(itemDir, 'adr.md'), ADR);
  await writeFile(
    join(itemDir, 'features', 'locking.feature'),
    'Feature: locking\n\n  Scenario: the fifth failure locks\n    Given four failures\n',
  );
  await writeFile(join(itemDir, 'change.diff'), '--- a/src/auth.ts\n+++ b/src/auth.ts\n');
  await writeFile(join(itemDir, 'blast.d2'), 'gate: the keeper\ngate -> screen\n');
  await writeFile(
    join(itemDir, 'blast.json'),
    '{"base":"main","collapse":2,"budget":24,"uncollapsedNodes":31,"uncollapsedEdges":58}',
  );
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

describe('the prose docs the journey carries', () => {
  it('folds the spec with its plain sibling and the lag note', async () => {
    const doc = docOf(await decorated(), 'spec.md');

    expect(doc?.kind).toBe('prose');

    if (doc?.kind === 'prose') {
      expect(doc.label).toBe('Spec');
      expect(doc.tech).toContain('Five failures lock the account.');
      expect(doc.plain).toContain('Five tries and you wait.');
      expect(doc.note).toBe('Plain version lags behind its source.');
    }
  });

  it('leaves a node without a doc when nothing was written for it', async () => {
    expect(docOf(await decorated(), 'ghost.md')).toBeUndefined();
  });
});

function designOf(journey: Journey): Extract<SurfaceDoc, { kind: 'design' }> {
  const doc = docOf(journey, 'solution-design.md');

  if (doc?.kind !== 'design') {
    throw new Error('the design doc never folded');
  }

  return doc;
}

describe('the design and its sketch', () => {
  it('folds the design with its callouts and the parsed architecture', async () => {
    const doc = designOf(await decorated());

    expect(doc.label).toBe('Design');
    expect(doc.plain).toContain('Plainly the account locks.');
    expect(doc.callouts).toStrictEqual([{ claim: 'locks after five', shape: 'lock' }]);
    expect(doc.sketch?.nodes).toContainEqual({ id: 'lock', label: 'the keeper' });
    expect(doc.sketch?.edges).toContainEqual({
      from: 'login',
      to: 'lock',
      label: 'fifth failure',
    });
  });

  it('folds the architecture file to the sketch alone', async () => {
    const doc = docOf(await decorated(), 'architecture.d2');

    expect(doc?.kind).toBe('sketch');

    if (doc?.kind === 'sketch') {
      expect(doc.label).toBe('Diagram');
    }
  });
});

describe('the brief and the findings', () => {
  it('folds each as labeled prose of its own file', async () => {
    const journey = await decorated();
    const brief = docOf(journey, 'change-brief.md');
    const findings = docOf(journey, 'findings.md');

    expect(brief?.kind === 'prose' ? [brief.label, brief.tech] : []).toStrictEqual([
      'Brief',
      '# Brief\n\nThe change in brief.\n',
    ]);
    expect(findings?.kind === 'prose' ? [findings.label, findings.tech] : []).toStrictEqual([
      'Findings',
      '# Findings\n\nWhat the review found.\n',
    ]);
  });
});

describe('the shelf where a file falls short', () => {
  it('folds a decision without a matrix to empty drivers and rows', async () => {
    await writeFile(join(itemDir, 'adr.md'), '# The call\n\nNo matrix was drawn.\n');

    const doc = docOf(await decorated(), 'adr.md');

    expect(doc?.kind === 'decision' ? [doc.drivers, doc.rows] : []).toStrictEqual([[], []]);
  });

  it('folds a blast whose measure says nothing to bare figures', async () => {
    await writeFile(join(itemDir, 'blast.json'), '{}');

    const doc = docOf(await decorated(), 'blast.d2');

    expect(doc?.kind === 'blast' ? [doc.base, doc.collapse, doc.budget] : []).toStrictEqual([
      '',
      0,
      0,
    ]);
  });
});

describe('the decision and its matrix', () => {
  it('folds drivers, verdict rows, and the prose without matrix lines', async () => {
    const doc = docOf(await decorated(), 'adr.md');

    expect(doc?.kind).toBe('decision');

    if (doc?.kind === 'decision') {
      expect(doc.label).toBe('Decision');
      expect(doc.plain).toBe('The plain call.\n');
      expect(doc.drivers).toStrictEqual(['durability', 'simplicity']);
      expect(doc.rows).toStrictEqual([
        { option: 'session store', chosen: true, glyphs: ['++', '+'] },
        { option: 'database', chosen: false, glyphs: ['+', '-'] },
      ]);
      expect(doc.tech).toContain('The counter lives with the session.');
      expect(doc.tech).not.toContain('Verdicts:');
    }
  });
});

describe('the criteria, the diff, and the blast', () => {
  it('folds a feature file to a named criteria doc', async () => {
    const doc = docOf(await decorated(), 'locking.feature');

    expect(doc?.kind).toBe('criteria');

    if (doc?.kind === 'criteria') {
      expect(doc.label).toBe('Criteria');
      expect(doc.name).toBe('locking.feature');
      expect(doc.source).toContain('Scenario: the fifth failure locks');
    }
  });

  it('folds the diff text as it stands', async () => {
    const doc = docOf(await decorated(), 'change.diff');

    expect(doc?.kind).toBe('diff');

    if (doc?.kind === 'diff') {
      expect(doc.label).toBe('Diff');
    }
  });

  it('folds the blast with its numbers and its sketch', async () => {
    const doc = docOf(await decorated(), 'blast.d2');

    expect(doc?.kind).toBe('blast');

    if (doc?.kind === 'blast') {
      expect(doc.label).toBe('Blast');
      expect(doc.base).toBe('main');
      expect(doc.collapse).toBe(2);
      expect(doc.budget).toBe(24);
      expect(doc.uncollapsedNodes).toBe(31);
      expect(doc.uncollapsedEdges).toBe(58);
      expect(doc.shown).toBe(2);
    }
  });
});

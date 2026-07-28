import { describe, expect, it } from 'vitest';

import { RETURNS_TO, returnsWithin, stagesFor } from './pipeline.ts';

describe('choosing which stages a size runs', () => {
  it('sends an epic through decompose and never to implement', () => {
    const stages = stagesFor('epic');

    expect(stages).toContain('decompose');
    expect(stages).not.toContain('implement');
    expect(stages).not.toContain('ship');
  });

  it('runs a story from research all the way to ship', () => {
    expect(stagesFor('story')).toStrictEqual([
      'triage',
      'research',
      'brainstorm',
      'design',
      'approve',
      'implement',
      'verify',
      'ship',
    ]);
  });

  it('drops research and brainstorm for a subtask but keeps the gate', () => {
    const stages = stagesFor('subtask');

    expect(stages).not.toContain('research');
    expect(stages).not.toContain('brainstorm');
    expect(stages).toContain('approve');
    expect(stages).toContain('design');
  });

  it('leaves a trivial change with nothing but the work itself', () => {
    expect(stagesFor('trivial')).toStrictEqual(['triage', 'implement', 'verify', 'ship']);
  });

  it('starts every size at triage', () => {
    for (const size of ['epic', 'story', 'subtask', 'trivial'] as const) {
      expect(stagesFor(size)[0]).toBe('triage');
    }
  });
});

describe('the loop the pipeline carries', () => {
  it('returns verify to implement, which a row of boxes cannot show', () => {
    expect(RETURNS_TO).toStrictEqual({ verify: 'implement' });
  });

  it('reports the loop when a run carries both of its ends', () => {
    expect(returnsWithin(stagesFor('story'))).toStrictEqual([{ from: 'verify', to: 'implement' }]);
  });

  it('reports nothing for a run that never verifies', () => {
    expect(returnsWithin(stagesFor('epic'))).toStrictEqual([]);
  });

  it('reports nothing when only one end of the loop is present', () => {
    expect(returnsWithin(['verify'])).toStrictEqual([]);
  });
});

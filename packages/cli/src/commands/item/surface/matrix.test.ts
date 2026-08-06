import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { driverMatrix, withoutMatrixLines } from './matrix.ts';

const ADR = `# Retune the brand pair

## Context

The scaffold paints ket and the product wants cobalt.

## Decision drivers

- Reads as cobalt
- Contrast passes

## Decision

Option: Retune the pair
Verdicts: ++ | +

The pair moves to hue 257.

## Alternatives

### Adopt the anchor verbatim

Verdicts: -- | ++

### Keep the scaffold hue

Verdicts: X | ?

### Paint the note by hand

Verdicts: 0 | -
`;

function matrixSourceOf(verdicts: string[], alternatives: number): string {
  const drivers = verdicts.map((glyph, index) => `- Driver ${String(index)} ${glyph}`);
  const row = `Verdicts: ${verdicts.join(' | ')}`;
  const parts: string[] = [];

  for (let index = 0; index < alternatives; index += 1) {
    parts.push(`### Alternative ${String(index)}\n\n${row}\n`);
  }

  return `# A record\n\n## Decision drivers\n\n${drivers.join('\n')}\n\n## Decision\n\nOption: Chosen\n${row}\n\n## Alternatives\n\n${parts.join('\n')}`;
}

function rowsStayDriverWide(verdicts: string[], alternatives: number): void {
  const body = driverMatrix(matrixSourceOf(verdicts, alternatives))?.body ?? '';
  const rows = body.match(/<tr class="matrix-row/g) ?? [];
  const cells = body.match(/<td class="matrix-cell/g) ?? [];

  expect(rows).toHaveLength(alternatives + 1);
  expect(cells).toHaveLength((alternatives + 1) * verdicts.length);
}

describe('the sources a matrix refuses', () => {
  it('answers no matrix for a source without decision drivers', () => {
    expect(driverMatrix('# A record\n\n## Decision\n\nOption: A\nVerdicts: ++\n')).toBeUndefined();
  });

  it('answers no matrix when no row carries verdicts', () => {
    expect(
      driverMatrix('# A record\n\n## Decision drivers\n\n- Reads well\n\n## Decision\n\nProse.\n'),
    ).toBeUndefined();
  });

  it('answers no matrix for an empty source', () => {
    expect(driverMatrix('')).toBeUndefined();
  });

  it('answers no matrix when every verdict row fails', () => {
    const bare = ADR.split('\n')
      .map((line) => (line.startsWith('Verdicts:') ? 'Verdicts: ~ | ~' : line))
      .join('\n');

    expect(driverMatrix(bare)).toBeUndefined();
  });
});

describe('the table the matrix lays', () => {
  it('heads the table with the option corner and every driver in order', () => {
    expect(driverMatrix(ADR)?.body).toContain(
      '<thead><tr><th scope="col" class="matrix-corner">Option</th><th scope="col" class="matrix-driver">Reads as cobalt</th><th scope="col" class="matrix-driver">Contrast passes</th></tr></thead>',
    );
  });

  it('seats the chosen option first, marked, with its verdict glyphs', () => {
    expect(driverMatrix(ADR)?.body).toContain(
      '<tbody><tr class="matrix-row is-chosen"><th scope="row" class="matrix-option">Retune the pair<span class="matrix-chosen">chosen</span></th><td class="matrix-cell matrix-strong-yes"><span class="matrix-glyph">++</span></td><td class="matrix-cell matrix-yes"><span class="matrix-glyph">+</span></td></tr>',
    );
  });

  it('keeps the chosen mark off an alternative row and seats it flush behind', () => {
    expect(driverMatrix(ADR)?.body).toContain(
      '</tr><tr class="matrix-row"><th scope="row" class="matrix-option">Adopt the anchor verbatim</th><td class="matrix-cell matrix-strong-no"><span class="matrix-glyph">--</span></td><td class="matrix-cell matrix-strong-yes"><span class="matrix-glyph">++</span></td></tr>',
    );
  });

  it('names every glyph family by its class', () => {
    expect(driverMatrix(ADR)?.body).toContain('matrix-out');
    expect(driverMatrix(ADR)?.body).toContain('matrix-unknown');
    expect(driverMatrix(ADR)?.body).toContain(
      '<td class="matrix-cell matrix-even"><span class="matrix-glyph">0</span></td><td class="matrix-cell matrix-no"><span class="matrix-glyph">-</span></td>',
    );
  });

  it('collapses behind a Drivers head', () => {
    expect(driverMatrix(ADR)?.label).toBe('Drivers');
    expect(driverMatrix(ADR)?.frame).toBe('collapsible');
  });

  it('keeps every row exactly as wide as the driver list', () => {
    const glyph = fc.constantFrom('++', '+', '0', '-', '--', 'X', '?');

    fc.assert(
      fc.property(
        fc.array(glyph, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 4 }),
        rowsStayDriverWide,
      ),
    );
  });
});

describe('the rows the matrix drops', () => {
  it('drops a row whose verdict count misses the driver count', () => {
    const short = ADR.replace('Verdicts: -- | ++', 'Verdicts: --');
    const panel = driverMatrix(short);

    expect(panel?.body).not.toContain('Adopt the anchor verbatim');
    expect(panel?.body).toContain('Keep the scaffold hue');
  });

  it('drops a row carrying a glyph outside the vocabulary', () => {
    const odd = ADR.replace('Verdicts: -- | ++', 'Verdicts: -- | +++');

    expect(driverMatrix(odd)?.body).not.toContain('Adopt the anchor verbatim');
  });

  it('drops a miscounted row even when the stray glyph is the unknown one', () => {
    const padded = ADR.replace('Verdicts: -- | ++', 'Verdicts: -- | ~ | ++');

    expect(driverMatrix(padded)?.body).not.toContain('Adopt the anchor verbatim');
  });
});

describe('the authoring slack the matrix tolerates', () => {
  it('reads an option and verdicts the author indented', () => {
    const indented = ADR.replace('Option: Retune the pair', '  Option: Retune the pair').replace(
      'Verdicts: ++ | +',
      '\tVerdicts: ++ | +',
    );

    expect(driverMatrix(indented)?.body).toContain('Retune the pair<span class="matrix-chosen">');
  });

  it('reads a driver bullet the author padded or indented', () => {
    const padded = ADR.replace('- Reads as cobalt', '-   Reads as cobalt  ').replace(
      '- Contrast passes',
      '  - Contrast passes',
    );

    expect(driverMatrix(padded)?.body).toContain(
      '<th scope="col" class="matrix-driver">Reads as cobalt</th><th scope="col" class="matrix-driver">Contrast passes</th>',
    );
  });

  it('keeps a hostile driver and option name inert', () => {
    const hostile = ADR.replace('- Reads as cobalt', '- <script>boom</script>').replace(
      'Option: Retune the pair',
      'Option: <img src=x onerror=boom>',
    );
    const panel = driverMatrix(hostile);

    expect(panel?.body).not.toContain('<script>boom</script>');
    expect(panel?.body).not.toContain('<img src=x onerror=boom>');
    expect(panel?.body).toContain('&lt;script&gt;boom&lt;/script&gt;');
  });
});

describe('the legend the matrix explains itself with', () => {
  it('explains every glyph and keeps the decision in the prose', () => {
    const panel = driverMatrix(ADR);

    for (const explained of [
      '<code>++</code> strongly meets',
      '<code>+</code> meets',
      '<code>0</code> neutral',
      '<code>-</code> misses',
      '<code>--</code> strongly misses',
      '<code>X</code> ruled out',
      '<code>?</code> unknown',
    ]) {
      expect(panel?.body).toContain(explained);
    }

    expect(panel?.body).toContain('class="matrix-note"');
  });
});

describe('the prose the matrix lines leave', () => {
  it('strips every option and verdict line wherever it sits', () => {
    expect(
      withoutMatrixLines('# A\n\nOption: X\nProse stays.\n  Verdicts: ++\n\tOption: Y\nEnd.'),
    ).toBe('# A\n\nProse stays.\nEnd.');
  });

  it('keeps a line that only mentions verdicts mid-sentence', () => {
    expect(withoutMatrixLines('The Verdicts: line explains itself.')).toBe(
      'The Verdicts: line explains itself.',
    );
  });
});

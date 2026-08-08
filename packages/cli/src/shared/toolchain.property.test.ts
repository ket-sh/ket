import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { arrivalsIn, recordAdvised, seenUnder } from './toolchain.ts';

const packageName = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/);

const names = fc.array(packageName, { maxLength: 12 });

function readBack(record: string): string[] {
  const written: unknown = parse(record);

  return seenUnder(written, 'dependencies');
}

describe('what arrived, over arbitrary toolchains', () => {
  it('names only a dependency the project declares and ket has not covered', () => {
    fc.assert(
      fc.property(names, names, names, (declared, shipped, seen) => {
        for (const arrival of arrivalsIn({ declared, shipped, seen })) {
          expect({
            arrival,
            declared: declared.includes(arrival),
            covered: shipped.includes(arrival) || seen.includes(arrival),
          }).toStrictEqual({ arrival, declared: true, covered: false });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('names every dependency the project declares that ket has not covered', () => {
    fc.assert(
      fc.property(names, names, names, (declared, shipped, seen) => {
        const arrivals = arrivalsIn({ declared, shipped, seen });

        for (const name of declared) {
          if (!shipped.includes(name) && !seen.includes(name)) {
            expect({ name, named: arrivals.includes(name) }).toStrictEqual({ name, named: true });
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('says nothing a second time once what it named is recorded', () => {
    fc.assert(
      fc.property(names, names, names, (declared, shipped, seen) => {
        const arrivals = arrivalsIn({ declared, shipped, seen });
        const recorded = readBack(
          recordAdvised({ dependencies: [...seen, ...arrivals], decisions: [], kinds: [] }),
        );

        expect(arrivalsIn({ declared, shipped, seen: recorded })).toStrictEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});

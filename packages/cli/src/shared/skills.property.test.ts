import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { skillsAbsentFrom } from './skills.ts';

const NAME = fc.string({ minLength: 1, maxLength: 10 });

const SKILL = fc.record({ name: NAME, source: NAME });

const PROMISED = fc.array(SKILL, { maxLength: 8 });

const HELD = fc.array(NAME, { maxLength: 8 });

describe('choosing what to install, over arbitrary projects and locks', () => {
  it('never names a skill the project already holds', () => {
    fc.assert(
      fc.property(HELD, PROMISED, (held, promised) => {
        for (const skill of skillsAbsentFrom(held, promised)) {
          expect(held).not.toContain(skill.name);
        }
      }),
    );
  });

  it('never names a skill no preset promised', () => {
    fc.assert(
      fc.property(HELD, PROMISED, (held, promised) => {
        for (const skill of skillsAbsentFrom(held, promised)) {
          expect(promised).toContainEqual(skill);
        }
      }),
    );
  });

  it('leaves nothing promised behind that the project is missing', () => {
    fc.assert(
      fc.property(HELD, PROMISED, (held, promised) => {
        const absent = skillsAbsentFrom(held, promised);

        for (const skill of promised) {
          expect(held.includes(skill.name) || absent.includes(skill)).toBe(true);
        }
      }),
    );
  });
});

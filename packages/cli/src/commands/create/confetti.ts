export const SPARKS = '✦✧⋆·˚';

const GAP = ' ';

const SPARSENESS = 2;

const OFFSET = 2166136261;

const PRIME = 16777619;

const STEP = 1103515245;

const SHIFT = 12345;

const LOW_BITS = 16;

function seedFrom(name: string): number {
  let seeded = OFFSET;

  for (const letter of name) {
    seeded = Math.imul(seeded ^ letter.charCodeAt(0), PRIME) >>> 0;
  }

  return seeded;
}

export function confetti(width: number, seed: string): string[] {
  let state = seedFrom(seed);

  return Array.from({ length: width }, () => {
    state = (Math.imul(state, STEP) + SHIFT) >>> 0;

    const roll = state >>> LOW_BITS;

    return roll % SPARSENESS === 0 ? SPARKS.charAt(roll % SPARKS.length) : GAP;
  });
}

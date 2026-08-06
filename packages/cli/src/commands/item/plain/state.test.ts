import { describe, expect, it } from 'vitest';

import { fingerprintOf, plainState, stamped } from './state.ts';

const TECHNICAL = '# The design\n\nThe modules that change.\n';

const PLAIN = '# What changes\n\nThe page you see gets a new shell.\n';

describe('the fingerprint a source leaves', () => {
  it('prints twelve hex characters of the source digest', () => {
    expect(fingerprintOf('')).toBe('e3b0c44298fc');
    expect(fingerprintOf('a')).toBe('ca978112ca1b');
  });

  it('tells two sources apart', () => {
    expect(fingerprintOf(TECHNICAL)).not.toBe(fingerprintOf(`${TECHNICAL} `));
  });
});

describe('the stamp a plain sibling wears', () => {
  it('seats the source line above the title where the page never reads', () => {
    expect(stamped(TECHNICAL, PLAIN)).toBe(
      `Source: ${fingerprintOf(TECHNICAL)}\n\n# What changes\n\nThe page you see gets a new shell.\n`,
    );
  });

  it('replaces a stamp that already sits in the lead', () => {
    const once = stamped('old source', PLAIN);
    const again = stamped(TECHNICAL, once);

    expect(again).toBe(stamped(TECHNICAL, PLAIN));
    expect(again.match(/Source: /g)).toHaveLength(1);
  });

  it('leaves a source line inside the prose alone', () => {
    const chatty = '# What changes\n\nSource: the internet says so.\n';

    expect(stamped(TECHNICAL, chatty)).toContain('Source: the internet says so.');
    expect(stamped(TECHNICAL, chatty).match(/Source: /g)).toHaveLength(2);
  });

  it('stamps a plain sibling that never had a title', () => {
    const bare = 'Just a paragraph.\n';

    expect(stamped(TECHNICAL, bare)).toBe(
      `Source: ${fingerprintOf(TECHNICAL)}\n\nJust a paragraph.\n`,
    );
  });
});

describe('the drift a plain sibling admits', () => {
  it('reads an unstamped sibling as unstamped', () => {
    expect(plainState(TECHNICAL, PLAIN)).toBe('unstamped');
  });

  it('reads a matching stamp as fresh', () => {
    expect(plainState(TECHNICAL, stamped(TECHNICAL, PLAIN))).toBe('fresh');
  });

  it('reads a stamp of an older source as stale', () => {
    const before = stamped(TECHNICAL, PLAIN);

    expect(plainState(`${TECHNICAL}\nA new paragraph.\n`, before)).toBe('stale');
  });

  it('never trusts a source line below the title', () => {
    const smuggled = `# What changes\n\nSource: ${fingerprintOf(TECHNICAL)}\n`;

    expect(plainState(TECHNICAL, smuggled)).toBe('unstamped');
  });

  it('never trusts a source line below a title the lead delays', () => {
    const delayed = `An intro line.\n# What changes\nSource: ${fingerprintOf(TECHNICAL)}\n`;

    expect(plainState(TECHNICAL, delayed)).toBe('unstamped');
  });

  it('reads a plain lead without any stamp as unstamped, never stale', () => {
    expect(plainState(TECHNICAL, 'An intro line.\n\n# What changes\n')).toBe('unstamped');
  });

  it('forgives padding around the stamp line', () => {
    const padded = `  Source: ${fingerprintOf(TECHNICAL)}  \n\n# What changes\n`;

    expect(plainState(TECHNICAL, padded)).toBe('fresh');
  });

  it('forgives a second space before the stamp value', () => {
    expect(plainState(TECHNICAL, `Source:  ${fingerprintOf(TECHNICAL)}\n\n# What changes\n`)).toBe(
      'fresh',
    );
  });

  it('reads a stamp standing as the very last line', () => {
    expect(plainState(TECHNICAL, `Source: ${fingerprintOf(TECHNICAL)}`)).toBe('fresh');
  });

  it('replaces a hand-indented stamp instead of doubling it', () => {
    const indented = stamped(TECHNICAL, '  Source: old\n\n# What changes\n');

    expect(indented.match(/Source: /g)).toHaveLength(1);
  });
});

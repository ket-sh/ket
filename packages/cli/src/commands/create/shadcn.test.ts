import type { PresetItem } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import {
  appliesLaterWith,
  applyArgvFor,
  applyRefusalFor,
  consumesShadcnPreset,
  refuseShadcnPreset,
  shadcnPresetFrom,
  shadcnPresetNote,
  TOOLCHAIN_ARGV,
} from './shadcn.ts';

const A_CODE = 'b2D0vQ7G4';

const MALFORMED = 'b_23 is not a shadcn preset code. Copy yours from ui.shadcn.com/create';

function aPresetThat(ships: Partial<PresetItem>): PresetItem {
  return {
    $schema: '',
    name: 'a-preset',
    type: 'registry:item',
    title: '',
    description: '',
    dependencies: [],
    devDependencies: [],
    files: [],
    integrations: [],
    ...ships,
  };
}

describe('the codes the ui.shadcn.com/create builder emits', () => {
  it('accepts a code of a known version and a base62 payload', () => {
    expect(refuseShadcnPreset('b2D0vQ7G4')).toBeUndefined();
    expect(refuseShadcnPreset('a2r6bw')).toBeUndefined();
  });

  it('refuses a code carrying a character outside base62', () => {
    expect(refuseShadcnPreset('b_23')).toBe(MALFORMED);
  });

  it('refuses a version the official CLI cannot decode', () => {
    expect(refuseShadcnPreset('z2r6bw')).toBe(
      'z2r6bw is not a shadcn preset code. Copy yours from ui.shadcn.com/create',
    );
  });

  it('refuses a lone version character, since a code carries a payload', () => {
    expect(refuseShadcnPreset('a')).toBeDefined();
  });

  it('refuses a code longer than the official CLI reads', () => {
    expect(refuseShadcnPreset('b0123456789')).toBeDefined();
    expect(refuseShadcnPreset('a123456789')).toBeUndefined();
  });
});

describe('which preset a shadcn preset code has something to restyle in', () => {
  it('consumes a code when the preset names shadcn its design system', () => {
    expect(consumesShadcnPreset(aPresetThat({ designSystem: 'shadcn' }))).toBe(true);
  });

  it('consumes nothing when the preset names no design system', () => {
    expect(consumesShadcnPreset(aPresetThat({}))).toBe(false);
  });
});

describe('reading the shadcn preset code the create flags carry', () => {
  const WEB_LIKE = aPresetThat({ designSystem: 'shadcn' });

  it('carries no code when no flag was given', () => {
    expect(shadcnPresetFrom(undefined, 'web', WEB_LIKE)).toStrictEqual({ code: undefined });
  });

  it('refuses a code aimed at a preset that ships no shadcn', () => {
    expect(shadcnPresetFrom(A_CODE, 'cli', aPresetThat({}))).toStrictEqual({
      refused: `the cli preset ships no shadcn for ${A_CODE} to restyle`,
    });
  });

  it('refuses a malformed code in the words of the code gate', () => {
    expect(shadcnPresetFrom('b_23', 'web', WEB_LIKE)).toStrictEqual({ refused: MALFORMED });
  });

  it('carries a well-formed code aimed at a shadcn preset', () => {
    expect(shadcnPresetFrom(A_CODE, 'web', WEB_LIKE)).toStrictEqual({ code: A_CODE });
  });
});

describe('the commands that land a shadcn preset in a scaffold', () => {
  it('installs the toolchain with bun, so the official CLI detects bun', () => {
    expect(TOOLCHAIN_ARGV).toStrictEqual(['bun', 'install']);
  });

  it('applies through the pinned official CLI, non-interactively', () => {
    expect(applyArgvFor(A_CODE)).toStrictEqual([
      'bunx',
      'shadcn@4.16.2',
      'apply',
      '--preset',
      A_CODE,
      '--yes',
    ]);
  });

  it('spells the whole recovery as one command a person can paste', () => {
    expect(appliesLaterWith(A_CODE)).toBe(
      `bun install && bunx shadcn@4.16.2 apply --preset ${A_CODE} --yes`,
    );
  });
});

describe('what create says when a shadcn preset did not land', () => {
  it('quotes the tool and names the recovery command', () => {
    expect(applyRefusalFor(A_CODE, 'could not reach the registry')).toBe(
      [
        `${A_CODE} did not apply: could not reach the registry`,
        `Apply it in the project later with: bun install && bunx shadcn@4.16.2 apply --preset ${A_CODE} --yes`,
      ].join('\n'),
    );
  });

  it('notes a refusal under a heading that says the project still stands', () => {
    expect(shadcnPresetNote({ refused: 'line one\nline two' })).toStrictEqual([
      'The project is ready, but your shadcn preset did not apply:',
      'line one',
      'line two',
    ]);
  });

  it('says nothing when the preset applied', () => {
    expect(shadcnPresetNote({ applied: A_CODE })).toStrictEqual([]);
  });

  it('says nothing when nobody gave a code', () => {
    expect(shadcnPresetNote({ absent: true })).toStrictEqual([]);
  });
});

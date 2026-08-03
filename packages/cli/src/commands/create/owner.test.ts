import { describe, expect, it } from 'vitest';

import { OWNER_ARGUMENTS, OWNER_BINARY, ownerIn, ownerSaid } from './owner.ts';

describe('what create asks github to find out who is running it', () => {
  it('runs the github cli rather than anything else on the machine', () => {
    expect(OWNER_BINARY).toBe('gh');
  });

  it('asks it for the login of whoever is signed in', () => {
    expect(OWNER_ARGUMENTS).toStrictEqual(['api', 'user', '--jq', '.login']);
  });
});

describe('reading an owner out of an answer somebody gave', () => {
  it('reads the login that was given', () => {
    expect(ownerIn('reyz')).toBe('reyz');
  });

  it('drops the newline a tool ends its answer with', () => {
    expect(ownerIn('reyz\n')).toBe('reyz');
  });

  it('reads no owner out of an answer nobody typed', () => {
    expect(ownerIn('')).toBeUndefined();
  });

  it('reads no owner out of an answer that is only blank space', () => {
    expect(ownerIn('   ')).toBeUndefined();
  });
});

describe('reading an owner out of what the github cli said and how it ended', () => {
  it('reads the login when the cli answered', () => {
    expect(ownerSaid(0, 'reyz\n')).toBe('reyz');
  });

  it('reads no owner when the machine has no github cli on it', () => {
    expect(ownerSaid(127, '')).toBeUndefined();
  });

  it('reads no owner when the cli is there but nobody is signed in', () => {
    expect(ownerSaid(4, 'gh: To get started, please run: gh auth login\n')).toBeUndefined();
  });

  it('reads no owner when the cli refused for any other reason it has', () => {
    expect(ownerSaid(1, 'reyz')).toBeUndefined();
  });

  it('reads no owner when the cli succeeded and said nothing', () => {
    expect(ownerSaid(0, '')).toBeUndefined();
  });

  it('reads no owner when the cli was killed before it could answer', () => {
    expect(ownerSaid(null, 'reyz')).toBeUndefined();
  });
});

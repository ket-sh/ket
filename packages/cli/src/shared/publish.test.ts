import { describe, expect, it } from 'vitest';

import { publishesWork } from './publish.ts';

describe('a command that puts work in front of somebody else', () => {
  it('reads a push as publishing', () => {
    expect(publishesWork('git push')).toBe(true);
  });

  it('reads a push with a remote and a branch as publishing', () => {
    expect(publishesWork('git push origin feat/lockout')).toBe(true);
  });

  it('reads opening a pull request as publishing', () => {
    expect(publishesWork('gh pr create --fill')).toBe(true);
  });

  it('reads a push hidden after another command as publishing', () => {
    expect(publishesWork('bun run test && git push')).toBe(true);
  });

  it('reads a push after a semicolon as publishing', () => {
    expect(publishesWork('bun run test; git push')).toBe(true);
  });

  it('reads a commit as work that has not left the machine', () => {
    expect(publishesWork('git commit --message x')).toBe(false);
  });

  it('reads a fetch as nothing leaving the machine', () => {
    expect(publishesWork('git fetch origin')).toBe(false);
  });

  it('reads listing pull requests as nothing leaving the machine', () => {
    expect(publishesWork('gh pr list')).toBe(false);
  });

  it('does not read a push named inside a quoted message as publishing', () => {
    expect(publishesWork("git commit --message 'git push comes later'")).toBe(false);
  });

  it('does not read a path that merely contains the word as publishing', () => {
    expect(publishesWork('cat docs/git-push-notes.md')).toBe(false);
  });
});

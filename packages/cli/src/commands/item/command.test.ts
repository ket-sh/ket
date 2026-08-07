import { describe, expect, it } from 'vitest';

import item from './command.ts';

describe('the item command', () => {
  it('carries the blast capture beside the stages and the plain siblings', () => {
    expect(Object.keys(item.subCommands ?? {})).toContain('blast');
  });
});

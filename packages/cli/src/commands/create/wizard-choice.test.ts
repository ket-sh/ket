import { describe, expect, it } from 'vitest';

import { runsWizard } from './wizard-choice.ts';

describe('choosing between the wizard and the flags', () => {
  it('opens the wizard when a terminal is attached and nothing was asked', () => {
    expect(runsWizard(true, undefined)).toBe(true);
  });

  it('stays headless when the preset flag already answers the question', () => {
    expect(runsWizard(true, 'web')).toBe(false);
  });

  it('stays headless without a terminal, whatever was asked', () => {
    expect(runsWizard(false, undefined)).toBe(false);
    expect(runsWizard(false, 'web')).toBe(false);
  });
});

import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vitest';

import { noBooleanSwitchParam } from './no-boolean-switch-param.ts';

RuleTester.describe = (name, run) => {
  describe(name, run);
};

RuleTester.it = (name, run) => {
  it(name, run);
};

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });

const splitsIntoTwoFunctions =
  'a boolean parameter that switches a function splits into two functions';

tester.run('no-boolean-switch-param', noBooleanSwitchParam, {
  valid: [
    {
      name: 'a boolean parameter the function only passes along stays whole',
      code: 'function ship(dryRun: boolean): void { log(dryRun); }',
    },
    {
      name: 'a local boolean the function reads for itself is not a parameter',
      code: 'function ship(): void { const dryRun: boolean = read(); if (dryRun) { plan(); } else { push(); } }',
    },
    {
      name: 'a parameter annotated something other than boolean is left alone',
      code: 'function retry(attempts: number): void { if (attempts) { again(); } }',
    },
    {
      name: 'an options object carrying the flag is the recommended shape',
      code: 'function ship({ dryRun }: { dryRun: boolean }): void { if (dryRun) { plan(); } else { push(); } }',
    },
    {
      name: 'a boolean parameter driving a loop is not a switch',
      code: 'function drain(more: boolean): void { while (more) { more = step(); } }',
    },
    {
      name: 'a boolean parameter chosen by a condition is not the condition',
      code: 'function pick(fallback: boolean): boolean { return ready() ? fallback : false; }',
    },
  ],
  invalid: [
    {
      name: 'an if statement testing the parameter reports the parameter',
      code: 'function ship(dryRun: boolean): void { if (dryRun) { plan(); } else { push(); } }',
      errors: [{ message: splitsIntoTwoFunctions }],
    },
    {
      name: 'a conditional expression testing the parameter reports the parameter',
      code: "const label = (short: boolean): string => (short ? 'ket' : 'ket cli');",
      errors: [{ message: splitsIntoTwoFunctions }],
    },
    {
      name: 'a switch alongside a pass-along read still reports',
      code: 'function ship(dryRun: boolean): void { log(dryRun); if (dryRun) { plan(); } else { push(); } }',
      errors: [{ message: splitsIntoTwoFunctions }],
    },
    {
      name: 'a method switching on its boolean parameter reports too',
      code: 'const shipper = { ship(dryRun: boolean): void { if (dryRun) { plan(); } else { push(); } } };',
      errors: [{ message: splitsIntoTwoFunctions }],
    },
  ],
});

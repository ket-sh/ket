import type { GateSemantics } from '@ket/preset';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { declaredGatesRunBy } from './declared-gates.ts';

const SCRIPT_POOL = ['lint', 'lint:dup', 'lint:spell', 'check-types', 'test', 'fmt:check'];

function gateOf(script: string): GateSemantics {
  return { script, guards: `It guards ${script}.`, commitJob: script, ciJob: 'check' };
}

const someScripts = fc.subarray(SCRIPT_POOL);

const someWord = fc.stringMatching(/^[A-Za-z0-9./:_-]{1,12}$/u);

const someSegment = fc
  .array(someWord, { minLength: 1, maxLength: 4 })
  .map((words) => words.join(' '));

const someNoise = fc
  .array(someSegment, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join(' && '));

function namesOnlyDeclaredGates(command: string, scripts: string[]): void {
  for (const named of declaredGatesRunBy(command, scripts.map(gateOf))) {
    expect(scripts).toContain(named);
  }
}

function findsEveryChainedRun(noise: string, scripts: string[]): void {
  const chain = scripts.map((script) => `bun run ${script}`).join(' && ');
  const named = declaredGatesRunBy(`${noise} && ${chain}`, scripts.map(gateOf));

  for (const script of scripts) {
    expect(named).toContain(script);
  }
}

describe('the invariants the declared-gate mapping keeps', () => {
  it('never names a gate the preset did not declare, whatever the command says', () => {
    fc.assert(fc.property(someNoise, someScripts, namesOnlyDeclaredGates));
  });

  it('finds every declared run a chain carries, wherever the chain starts', () => {
    fc.assert(fc.property(someNoise, someScripts, findsEveryChainedRun));
  });
});

import type { OfferedCategory, PresetIntegration } from '@ket/preset';

import { writes } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { choicesFor, pickedNames, promptFor } from './integration-prompt.ts';

function offering(name: string): PresetIntegration {
  return {
    name,
    category: 'coverage',
    asks: `${name} costs nothing on a public repository and something on a private one.`,
    files: [writes(`${name}.yml`, `.github/workflows/${name}.yml`)],
  };
}

function takingOne(offers: PresetIntegration[]): OfferedCategory {
  return { category: 'coverage', admits: 'one', offers };
}

function takingSeveral(offers: PresetIntegration[]): OfferedCategory {
  return { category: 'AI pull-request review', admits: 'several', offers };
}

describe('what a person is asked for a category', () => {
  it('asks for a single service where the category takes one', () => {
    expect(promptFor(takingOne([offering('codecov')]))).toBe('Which coverage service do you want?');
  });

  it('asks for services where the category takes several', () => {
    expect(promptFor(takingSeveral([offering('coderabbit')]))).toBe(
      'Which AI pull-request review services do you want?',
    );
  });
});

describe('what a person picks from', () => {
  it('offers each tool by name, with the sentence that says what it costs', () => {
    expect(choicesFor(takingSeveral([offering('coderabbit')]))).toStrictEqual([
      {
        value: 'coderabbit',
        label: 'coderabbit',
        hint: 'coderabbit costs nothing on a public repository and something on a private one.',
      },
    ]);
  });

  it('lets a category that takes one be answered with none, since no tool is required', () => {
    const choices = choicesFor(takingOne([offering('codecov'), offering('qlty')]));

    expect(choices.map((choice) => choice.value)).toStrictEqual(['', 'codecov', 'qlty']);
  });

  it('offers no such answer where the category takes several, since none is an empty pick', () => {
    const choices = choicesFor(takingSeveral([offering('coderabbit'), offering('greptile')]));

    expect(choices.map((choice) => choice.value)).toStrictEqual(['coderabbit', 'greptile']);
  });

  it('names the answer that takes no tool in words a person reads', () => {
    const [first] = choicesFor(takingOne([offering('codecov')]));

    expect(first).toStrictEqual({ value: '', label: 'none', hint: 'no such service' });
  });
});

describe('reading back what a person picked for a category that takes one', () => {
  const COVERAGE = takingOne([offering('codecov'), offering('qlty')]);

  it('reads a named tool as the one tool that category got', () => {
    expect(pickedNames('codecov', COVERAGE)).toStrictEqual(['codecov']);
  });

  it('reads the answer that takes no tool as no tool at all, not as a tool with no name', () => {
    expect(pickedNames('', COVERAGE)).toStrictEqual([]);
  });

  it('reads an answer naming no tool the category offered as none, whatever it says', () => {
    expect(pickedNames('argos', COVERAGE)).toStrictEqual([]);
  });
});

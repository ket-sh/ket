import { describe, expect, it } from 'vitest';

import type { PipelineCommand } from './pipeline-commands.generated.ts';

import { commandTable } from './command-table.ts';

const FILING: PipelineCommand = { name: 'feature', says: 'File a piece of work' };

const APPROVING: PipelineCommand = { name: 'approve', says: 'Pass the human gate' };

const ANSI = /\[\d+m/gu;

function bare(line: string): string {
  return line.replaceAll(ANSI, '');
}

function linesOf(commands: PipelineCommand[]): string[] {
  return commandTable(commands).split('\n').map(bare);
}

describe('the table of commands a created project is told about', () => {
  it('writes each command the way a person types it', () => {
    const drawn = linesOf([FILING, APPROVING]);

    expect(drawn.some((line) => line.includes('/ket:feature'))).toBe(true);
    expect(drawn.some((line) => line.includes('/ket:approve'))).toBe(true);
  });

  it('says what each command is for, beside the command', () => {
    const row = linesOf([FILING]).find((line) => line.includes('/ket:feature')) ?? '';

    expect(row).toContain('File a piece of work');
  });

  it('closes with what the pipeline does between the gates', () => {
    expect(linesOf([FILING]).join('\n')).toContain(
      'the pipeline runs itself between the two gates it waits at',
    );
  });

  it('indents every line, so the table sits under the outro rather than beside it', () => {
    for (const line of linesOf([FILING])) {
      expect({ line, indented: line.startsWith('   ') }).toStrictEqual({ line, indented: true });
    }
  });

  it('draws a heading over each column, so a reader knows which is which', () => {
    const heading = linesOf([FILING]).slice(0, 2).join('\n');

    expect(heading).toContain('type');
    expect(heading).toContain('what it does');
  });
});

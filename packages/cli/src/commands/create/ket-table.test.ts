import { describe, expect, it } from 'vitest';

import { ketTable } from './ket-table.ts';

const ANSI = /\[\d+m/gu;

function bare(line: string): string {
  return line.replaceAll(ANSI, '');
}

function lines(): string[] {
  return ketTable().split('\n').map(bare);
}

describe('the table that explains the ket command itself', () => {
  it('writes each part the way a person types it', () => {
    const drawn = lines();

    expect(drawn.some((line) => line.includes('ket create'))).toBe(true);
    expect(drawn.some((line) => line.includes('ket update'))).toBe(true);
    expect(drawn.some((line) => line.includes('ket watch'))).toBe(true);
    expect(drawn.some((line) => line.includes('ket map'))).toBe(true);
    expect(drawn.some((line) => line.includes('ket retro'))).toBe(true);
  });

  it('says what each part is for, beside it', () => {
    const row = lines().find((line) => line.includes('ket watch')) ?? '';

    expect(row).toContain('Watch the pipeline as it runs');
  });

  it('closes by pointing at the help each part carries', () => {
    expect(lines().join('\n')).toContain('ket <command> --help says more about each');
  });

  it('indents every line, so the table sits under the outro rather than beside it', () => {
    for (const line of lines()) {
      expect({ line, indented: line.startsWith('   ') }).toStrictEqual({ line, indented: true });
    }
  });

  it('draws a heading over each column, so a reader knows which is which', () => {
    const heading = lines().slice(0, 2).join('\n');

    expect(heading).toContain('command');
    expect(heading).toContain('what it does');
  });
});

import { describe, expect, it } from 'vitest';

import {
  fateOf,
  hashOf,
  parseScaffoldRecord,
  recordedAmong,
  renderScaffoldRecord,
  scaffoldRecordFile,
  scaffoldRecordOf,
  updatePlanOf,
} from './scaffold-manifest.ts';

const FILES = [
  { path: 'tsconfig.json', contents: '{"strict": true}\n' },
  { path: 'CLAUDE.md', contents: '# The law\n' },
];

describe('recording what ket wrote', () => {
  it('records a fingerprint per written path under the writing version', () => {
    const record = scaffoldRecordOf(FILES, '0.0.0');

    expect(record.version).toBe(1);
    expect(record.ket).toBe('0.0.0');
    expect(Object.keys(record.files)).toStrictEqual(['tsconfig.json', 'CLAUDE.md']);
    expect(record.files['tsconfig.json']).toBe(hashOf('{"strict": true}\n'));
  });

  it('renders a record its own parser reads back', () => {
    const record = scaffoldRecordOf(FILES, '0.0.0');

    expect(parseScaffoldRecord(renderScaffoldRecord(record))).toStrictEqual(record);
  });

  it('renders the record as yaml, the way the rest of the ket directory reads', () => {
    const rendered = renderScaffoldRecord(scaffoldRecordOf(FILES, '0.0.0'));

    expect(rendered.startsWith('version: 1\nket: 0.0.0\nfiles:\n')).toBe(true);
  });

  it('reads a record written as yaml by hand', () => {
    expect(parseScaffoldRecord('version: 1\nket: 0.0.0\nfiles:\n  a.ts: 0f\n')).toStrictEqual({
      version: 1,
      ket: '0.0.0',
      files: { 'a.ts': '0f' },
    });
  });
});

describe('a scaffold record nothing can compare against', () => {
  it('parses nothing from a document that is not a record', () => {
    expect(parseScaffoldRecord('not json')).toBeUndefined();
    expect(parseScaffoldRecord('{"version": 2, "ket": "0.0.0", "files": {}}')).toBeUndefined();
    expect(parseScaffoldRecord('{"version": 1, "ket": "0.0.0", "files": ["x"]}')).toBeUndefined();
    expect(parseScaffoldRecord('{"version": 1, "ket": "0.0.0", "files": null}')).toBeUndefined();
    expect(parseScaffoldRecord('{"version": 1, "ket": "0.0.0", "files": 7}')).toBeUndefined();
  });

  it('parses nothing from a record whose hashes are not all strings', () => {
    const mixed = '{"version": 1, "ket": "0.0.0", "files": {"a.ts": 7, "b.ts": "0f"}}';

    expect(parseScaffoldRecord(mixed)).toBeUndefined();
  });

  it('fingerprints a base64 file by the bytes it lands on disk', () => {
    const record = scaffoldRecordOf(
      [{ path: 'logo.png', contents: Buffer.from('PNG').toString('base64'), encoding: 'base64' }],
      '0.0.0',
    );

    expect(record.files['logo.png']).toBe(hashOf(Buffer.from('PNG')));
  });

  it('keeps the merged gitignore out of the record, since ket appends to it after writing', () => {
    const merged = [{ path: '.gitignore', contents: 'node_modules/\n' }, ...FILES];

    expect(recordedAmong(merged).map((file) => file.path)).toStrictEqual([
      'tsconfig.json',
      'CLAUDE.md',
    ]);
  });

  it('writes the record where the update command reads it', () => {
    const file = scaffoldRecordFile(FILES, '0.0.0');

    expect(file.path).toBe('.ket/scaffold.yaml');
    expect(parseScaffoldRecord(file.contents)).toStrictEqual(scaffoldRecordOf(FILES, '0.0.0'));
  });
});

describe('planning an update across the whole scaffold', () => {
  it('gives every shipped and every recorded path exactly one fate', () => {
    const record = scaffoldRecordOf(FILES, '0.0.0');
    const fresh = [
      { path: 'tsconfig.json', contents: '{"strict": true}\n' },
      { path: 'CLAUDE.md', contents: '# The new law\n' },
      { path: 'mise.toml', contents: '[tools]\n' },
    ];
    const disk = {
      'tsconfig.json': hashOf('{"strict": true}\n'),
      'CLAUDE.md': hashOf('# The law\n'),
    };

    expect(updatePlanOf(record, disk, fresh)).toStrictEqual([
      { path: 'tsconfig.json', fate: 'settled' },
      { path: 'CLAUDE.md', fate: 'refreshed' },
      { path: 'mise.toml', fate: 'arrived' },
    ]);
  });

  it('reports a recorded path the preset no longer ships as departed', () => {
    const record = scaffoldRecordOf(FILES, '0.0.0');
    const fresh = [{ path: 'tsconfig.json', contents: '{"strict": true}\n' }];
    const disk = { 'tsconfig.json': hashOf('{"strict": true}\n') };

    expect(updatePlanOf(record, disk, fresh)).toStrictEqual([
      { path: 'tsconfig.json', fate: 'settled' },
      { path: 'CLAUDE.md', fate: 'departed' },
    ]);
  });
});

describe('the fate of a managed file at update time', () => {
  const recorded = hashOf('as written');
  const edited = hashOf('as edited');
  const fresh = hashOf('as shipped now');

  it('settles a file nobody changed on either side', () => {
    expect(fateOf(recorded, recorded, recorded)).toBe('settled');
  });

  it('refreshes an untouched file whose shipped bytes moved', () => {
    expect(fateOf(recorded, recorded, fresh)).toBe('refreshed');
  });

  it('restores a managed file that is gone from disk', () => {
    expect(fateOf(recorded, undefined, fresh)).toBe('restored');
  });

  it('converges a record whose file already matches the shipped bytes', () => {
    expect(fateOf(recorded, fresh, fresh)).toBe('converged');
  });

  it('holds a file the user edited rather than destroying their work', () => {
    expect(fateOf(recorded, edited, fresh)).toBe('held');
  });

  it('lets a new shipped file arrive where nothing sits', () => {
    expect(fateOf(undefined, undefined, fresh)).toBe('arrived');
  });

  it('converges a new shipped file the project already carries verbatim', () => {
    expect(fateOf(undefined, fresh, fresh)).toBe('converged');
  });

  it("holds a new shipped file that would land on the user's own bytes", () => {
    expect(fateOf(undefined, edited, fresh)).toBe('held');
  });
});

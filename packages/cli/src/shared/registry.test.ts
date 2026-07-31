import { filesOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { governingPresets, presetNamed, registeredPresets } from './registry.ts';

describe('the preset that governs a target', () => {
  it('carries the preset ket writes a command line with', () => {
    expect(presetNamed('cli')?.item.name).toBe('ket-cli');
  });

  it('carries the preset ket writes a frontend with', () => {
    expect(presetNamed('web')?.item.name).toBe('ket-web');
  });

  it('names nothing for a target ket has yet to write a preset for', () => {
    expect(presetNamed('mobile')).toBeUndefined();
  });

  it('registers a target under the name it is asked for', () => {
    expect(registeredPresets().map((registered) => registered.name)).toStrictEqual(['cli', 'web']);
  });
});

describe('the presets governing a set of targets', () => {
  it('names the preset behind each target', () => {
    expect(governingPresets(['web']).map((registered) => registered.name)).toStrictEqual(['web']);
  });

  it('names a preset once when two targets share it', () => {
    expect(governingPresets(['cli', 'cli']).map((registered) => registered.name)).toStrictEqual([
      'cli',
    ]);
  });

  it('leaves out a target whose preset ket has yet to write', () => {
    expect(governingPresets(['cli', 'mobile']).map((registered) => registered.name)).toStrictEqual([
      'cli',
    ]);
  });

  it('names nothing when no target has a preset behind it', () => {
    expect(governingPresets(['mobile', 'desktop'])).toStrictEqual([]);
  });
});

describe('what a registered preset promises against what it carries', () => {
  it('reads back every file each registered preset promises to write', () => {
    for (const { name, item, contentOf } of registeredPresets()) {
      for (const file of item.files) {
        expect(() => contentOf(file.path), `${name} promises ${file.path}`).not.toThrow();
      }
    }
  });

  it('reads back every file each registered preset offers as an integration', () => {
    for (const { name, item, contentOf } of registeredPresets()) {
      for (const file of item.integrations.flatMap(filesOf)) {
        expect(() => contentOf(file.path), `${name} offers ${file.path}`).not.toThrow();
      }
    }
  });

  it('gives each registered preset the scripts its own gates name', () => {
    for (const { name, semantics } of registeredPresets()) {
      const unscripted = semantics.gates
        .map((gate) => gate.script)
        .filter((script) => semantics.scripts[script] === undefined);

      expect({ name, unscripted }).toStrictEqual({ name, unscripted: [] });
    }
  });
});

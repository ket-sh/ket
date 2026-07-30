import { describe, expect, it } from 'vitest';

import type { Verdict } from './verdict.ts';
import type { GovernedItem, WriteAttempt } from './write-gate.ts';

import { verdictFor } from './write-gate.ts';

const IMPLEMENTING: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
};

function verdictOver(path: string, over: Partial<WriteAttempt> = {}): Verdict {
  return verdictFor({
    path,
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    lockfile: 'bun.lock',
    inFlight: [IMPLEMENTING],
    ...over,
  });
}

function refusalFor(path: string, over?: Partial<WriteAttempt>): string | undefined {
  const verdict = verdictOver(path, over);

  return 'refused' in verdict ? verdict.refused : undefined;
}

describe('a lockfile, which a tool writes and a person does not', () => {
  it('refuses the lockfile the target declares', () => {
    expect(refusalFor('bun.lock')).toBe(
      'bun.lock is a lockfile. Install the dependency rather than editing the record of one.',
    );
  });

  it('refuses it in any directory, since a workspace keeps one in each', () => {
    expect(refusalFor('packages/api/bun.lock')).toBe(
      'packages/api/bun.lock is a lockfile. Install the dependency rather than editing the record of one.',
    );
  });

  it('refuses it while nothing is in flight, since a tool owns the file either way', () => {
    expect(refusalFor('bun.lock', { inFlight: [] })).toBe(
      'bun.lock is a lockfile. Install the dependency rather than editing the record of one.',
    );
  });

  it('reads the name the target declares, not one ket happens to keep', () => {
    expect(refusalFor('pnpm-lock.yaml', { lockfile: 'pnpm-lock.yaml' })).toBe(
      'pnpm-lock.yaml is a lockfile. Install the dependency rather than editing the record of one.',
    );
  });

  it('allows the lockfile of a toolchain this target does not use', () => {
    expect(refusalFor('pnpm-lock.yaml')).toBeUndefined();
  });

  it('allows a file merely named after the lockfile', () => {
    expect(refusalFor('docs/bun.lock.md')).toBeUndefined();
  });
});

describe('a file that holds secrets', () => {
  it('refuses the environment file itself', () => {
    expect(refusalFor('.env')).toBe('.env holds secrets. The person who owns them edits it.');
  });

  it('refuses every environment a project keeps apart', () => {
    for (const name of ['.env.local', '.env.production', '.env.test']) {
      expect({ name, refusal: refusalFor(name) }).toStrictEqual({
        name,
        refusal: `${name} holds secrets. The person who owns them edits it.`,
      });
    }
  });

  it('refuses one nested under a package, since a path is not a name', () => {
    expect(refusalFor('apps/api/.env')).toBe(
      'apps/api/.env holds secrets. The person who owns them edits it.',
    );
  });

  it('allows the example, since it carries the shape rather than the secrets', () => {
    expect(refusalFor('.env.example')).toBeUndefined();
  });

  it('allows a file whose name merely ends that way', () => {
    expect(refusalFor('src/read.env.ts')).toBeUndefined();
  });

  it('allows source that reads the environment', () => {
    expect(refusalFor('src/env.ts')).toBeUndefined();
  });

  it('allows every other dotfile, since a project is made of them', () => {
    for (const path of ['.gitignore', '.oxlintrc.json', '.envoy.yml']) {
      expect({ path, refusal: refusalFor(path) }).toStrictEqual({ path, refusal: undefined });
    }
  });
});

describe('key material', () => {
  it('refuses every shape a key arrives in', () => {
    for (const name of ['server.pem', 'api.key', 'bundle.p12']) {
      expect({ name, refusal: refusalFor(name) }).toStrictEqual({
        name,
        refusal: `${name} is key material. The person who owns it edits it.`,
      });
    }
  });

  it('refuses the keys an agent finds beside a checkout', () => {
    for (const name of ['id_rsa', 'id_rsa.pub', 'id_ed25519']) {
      expect({ name, refusal: refusalFor(`.ssh/${name}`) }).toStrictEqual({
        name,
        refusal: `.ssh/${name} is key material. The person who owns it edits it.`,
      });
    }
  });

  it('allows source that merely speaks about keys', () => {
    for (const path of ['src/key.ts', 'src/keys/project-key.ts', 'src/identity.ts']) {
      expect({ path, refusal: refusalFor(path) }).toStrictEqual({ path, refusal: undefined });
    }
  });
});

describe('a sealed file against the rest of the gate', () => {
  it('refuses a secret before it reads the item, since no approval unseals it', () => {
    expect(refusalFor('src/.env', { inFlight: [{ ...IMPLEMENTING, status: 'triaged' }] })).toBe(
      'src/.env holds secrets. The person who owns them edits it.',
    );
  });

  it('leaves an ordinary source write to the item that governs it', () => {
    expect(refusalFor('src/auth.ts', { inFlight: [{ ...IMPLEMENTING, status: 'triaged' }] })).toBe(
      'AUTH-1 is triaged, not implementing. Approval comes before source.',
    );
  });
});

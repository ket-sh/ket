import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readSurface } from './artifacts.ts';

let itemDir = '';

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-artifacts-'));
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

describe('the manifest the surface reads', () => {
  it('takes the key, the title, and the stage from the manifest lines', async () => {
    await writeFile(
      join(itemDir, 'item.yaml'),
      'key: K-9\ntitle: The gate work\nstatus: verifying\n',
    );

    const surface = await readSurface(itemDir);

    expect(surface.key).toBe('K-9');
    expect(surface.title).toBe('The gate work');
    expect(surface.status).toBe('verifying');
  });

  it('trims the padding a manifest value carries', async () => {
    await writeFile(join(itemDir, 'item.yaml'), 'status: verifying  \n');

    const surface = await readSurface(itemDir);

    expect(surface.status).toBe('verifying');
  });

  it('names the surface after its directory and the triaged stage without a manifest', async () => {
    const surface = await readSurface(itemDir);

    expect(surface.key).toBe(basename(itemDir));
    expect(surface.title).toBe(basename(itemDir));
    expect(surface.status).toBe('triaged');
  });
});

describe('the artifacts the surface gathers', () => {
  it('reads every artifact slot from its own file', async () => {
    await writeFile(join(itemDir, 'spec.md'), 'the spec text\n');
    await writeFile(join(itemDir, 'solution-design.md'), 'the design text\n');
    await writeFile(join(itemDir, 'adr.md'), 'the adr text\n');
    await writeFile(join(itemDir, 'change-brief.md'), 'the brief text\n');
    await writeFile(join(itemDir, 'findings.md'), 'the findings text\n');

    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.spec).toBe('the spec text\n');
    expect(artifacts.design).toBe('the design text\n');
    expect(artifacts.adr).toBe('the adr text\n');
    expect(artifacts.brief).toBe('the brief text\n');
    expect(artifacts.findings).toBe('the findings text\n');
  });

  it('leaves the slot of a missing artifact empty', async () => {
    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.spec).toBeUndefined();
    expect(artifacts.design).toBeUndefined();
  });

  it('reads the plain-language sibling of each prose artifact', async () => {
    await writeFile(join(itemDir, 'spec.plain.md'), 'the plain spec\n');
    await writeFile(join(itemDir, 'solution-design.plain.md'), 'the plain design\n');
    await writeFile(join(itemDir, 'adr.plain.md'), 'the plain adr\n');

    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.specPlain).toBe('the plain spec\n');
    expect(artifacts.designPlain).toBe('the plain design\n');
    expect(artifacts.adrPlain).toBe('the plain adr\n');
  });

  it('leaves the plain slots empty until somebody translates', async () => {
    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.specPlain).toBeUndefined();
    expect(artifacts.designPlain).toBeUndefined();
    expect(artifacts.adrPlain).toBeUndefined();
  });
});

describe('the features the surface lists', () => {
  it('lists only the feature files inside the features directory', async () => {
    await mkdir(join(itemDir, 'features'));
    await writeFile(join(itemDir, 'features', 'journey.feature'), 'Feature: Journey\n');
    await writeFile(join(itemDir, 'features', 'notes.txt'), 'plain notes\n');
    await writeFile(join(itemDir, 'root.feature'), 'Feature: Decoy\n');

    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.features).toEqual([{ name: 'journey.feature', source: 'Feature: Journey\n' }]);
  });

  it('lists no features without a features directory', async () => {
    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.features).toEqual([]);
  });

  it('lists an unreadable feature with an empty source', async () => {
    await mkdir(join(itemDir, 'features', 'broken.feature'), { recursive: true });

    const { artifacts } = await readSurface(itemDir);

    expect(artifacts.features).toEqual([{ name: 'broken.feature', source: '' }]);
  });
});

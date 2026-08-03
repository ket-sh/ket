# Web preset hero page implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The web preset scaffolds a single viewport hero page over the ket torii artwork, and the preset pipeline learns to ship binary files.

**Architecture:** The pipeline change lands first, inside out: `@ket/preset` learns a `copies()` promise that carries bytes as base64 through the generated contents module, then `@ket/cli` learns to write those bytes back untouched. The page work follows: a `welcome` entity replaces `greeting`, the route becomes the hero, and the artwork rides the preset as real files.

**Tech Stack:** TypeScript, Vitest, fast-check, Stryker, TanStack Start, Tailwind v4, shadcn components, `playwright-bdd`, Fontsource.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-02-web-preset-hero-page-design.md`.
- Test-first, always. probity blocks production writes under `packages/*/src` and `presets/*/src` until a failing test covers them. Template files under `presets/web/files/` sit outside that gate, and their tests run inside scaffolded projects instead.
- No code comments. No `any`, no `as` casts. No em dash in any authored prose.
- Every commit message follows the caveman-commit skill, and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work stays on the branch `feat/a-home-page-that-shows-the-parts`.
- Font pins: `@fontsource-variable/google-sans-flex@5.3.1` and `@fontsource-variable/google-sans-code@5.3.0`, both devDependencies of the scaffold.
- Headline copy: `Welcome to __PROJECT_NAME__.` with the fallback `Welcome to your project.`
- Asset budget: the re-encoded video stays under 1 MB, and the recompressed poster stays under 0.5 MB.
- The `ket:tdd`, `ket:design-tokens`, and `ket:gherkin` skills apply to their tasks. Read each one before its task.

---

### Task 0: Commit the standing groundwork

The working tree carries the shadcn foundation from the earlier session: `shared/ui/` components, the token bridge in `styles.css`, and the jscpd and knip adjustments. Commit it as its own change before new work starts.

**Files:**

- Commit as-is: everything `git status` reports, including the untracked `presets/web/files/source/shared/ui/`.

- [ ] **Step 1: Confirm the tree holds only the expected changes**

Run: `git status --short`
Expected: modifications under `packages/preset/files/`, `presets/cli/src/`, `presets/web/`, and the untracked `presets/web/files/source/shared/ui/`. Nothing else.

- [ ] **Step 2: Regenerate both presets so carried bytes match disk**

Run: `cd presets/web && bun run generate && cd ../cli && bun run generate && cd ../..`
Expected: exits zero.

- [ ] **Step 3: Run the invariants**

Run: `cd presets/web && bun run test && cd ../cli && bun run test && cd ../..`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(presets): add shadcn foundation to the web preset

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 1: A promise to copy bytes

`@ket/preset` gains `copies()`, the constructor beside `writes()` that marks a shipped file as binary.

**Files:**

- Modify: `packages/preset/src/item.ts`
- Modify: `packages/preset/src/index.ts`
- Test: `packages/preset/src/item.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `PresetFile` gains the optional field `encoding?: 'base64'`, and `copies(path: string, target: string): PresetFile` returns `{ path: 'files/' + path, type: 'registry:file', target: '~/' + target, encoding: 'base64' }`. Later tasks import `copies` from `@ket/preset`.

- [ ] **Step 1: Write the failing test**

Add to `packages/preset/src/item.test.ts`, mirroring the existing `writes` cases:

```ts
describe('a promise to copy bytes', () => {
  it('marks the file as base64 under files/ and the home marker', () => {
    expect(copies('source/hero/ket-bg.mp4', 'public/ket-bg.mp4')).toStrictEqual({
      path: 'files/source/hero/ket-bg.mp4',
      type: 'registry:file',
      target: '~/public/ket-bg.mp4',
      encoding: 'base64',
    });
  });

  it('writes text with no encoding mark at all', () => {
    expect(writes('vite.config.ts', 'vite.config.ts')).toStrictEqual({
      path: 'files/vite.config.ts',
      type: 'registry:file',
      target: '~/vite.config.ts',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/preset && bunx vitest run src/item.test.ts`
Expected: red. Nothing exports `copies` yet.

- [ ] **Step 3: Implement**

In `packages/preset/src/item.ts`, extend the interface and add the constructor beside `writes()`:

```ts
export interface PresetFile {
  path: string;
  type: 'registry:file';
  target: string;
  encoding?: 'base64';
}

export function copies(path: string, target: string): PresetFile {
  return {
    path: `files/${path}`,
    type: 'registry:file',
    target: `~/${target}`,
    encoding: 'base64',
  };
}
```

In `packages/preset/src/index.ts`, extend the item export line:

```ts
export { copies, dependencyNamesOf, filesOf, installsOf, reachesNothing, writes } from './item.ts';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/preset && bunx vitest run src/item.test.ts`
Expected: green.

- [ ] **Step 5: Run the package suite and commit**

Run: `cd packages/preset && bun run test`
Expected: green.

```bash
git add packages/preset/src/item.ts packages/preset/src/index.ts packages/preset/src/item.test.ts
git commit -m "feat(preset): let a preset promise to copy bytes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Shipped bytes ride as base64

`shippedFilesOf` reads a binary promise as base64 and a text promise as before. The generated module keeps its `Record<string, string>` shape.

**Files:**

- Modify: `packages/preset/src/shipped.ts`
- Test: `packages/preset/src/shipped.test.ts`

**Interfaces:**

- Consumes: `PresetFile.encoding` and `copies()` from Task 1.
- Produces: `shippedFilesOf(item, root, shared?)` keeps its signature. A path promised through `copies()` maps to the base64 of the bytes on disk.

- [ ] **Step 1: Write the failing tests**

Add to `packages/preset/src/shipped.test.ts`, following the existing temporary-directory pattern in that file. The example test pins bytes that no utf8 round trip survives, and the property holds the spec's invariant:

```ts
describe('shipping a promise to copy bytes', () => {
  it('carries the bytes as base64', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-shipped-'));
    const bytes = Buffer.from([0, 255, 254, 147, 10, 13, 0, 128]);
    await mkdir(join(root, 'files', 'hero'), { recursive: true });
    await writeFile(join(root, 'files', 'hero', 'bg.mp4'), bytes);

    const shipped = await shippedFilesOf(itemWith([copies('hero/bg.mp4', 'public/bg.mp4')]), root);

    expect(shipped['files/hero/bg.mp4']).toBe(bytes.toString('base64'));
  });

  it('carries any bytes whole through the base64 round trip', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 1 }), async (raw) => {
        const root = await mkdtemp(join(tmpdir(), 'ket-shipped-'));
        await mkdir(join(root, 'files'), { recursive: true });
        await writeFile(join(root, 'files', 'blob.bin'), raw);

        const shipped = await shippedFilesOf(itemWith([copies('blob.bin', 'blob.bin')]), root);
        const carried = shipped['files/blob.bin'];

        expect(carried).toBeDefined();
        expect(new Uint8Array(Buffer.from(carried ?? '', 'base64'))).toStrictEqual(raw);
      }),
    );
  });
});
```

Reuse the file's existing item fixture helper if one exists. Otherwise add `itemWith(files: PresetFile[]): PresetItem` as a local helper that fills the other `PresetItem` fields with empty values. Import `fc` from `fast-check`, and `mkdtemp`, `mkdir`, `writeFile` from `node:fs/promises`, `tmpdir` from `node:os`, matching the imports already in the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/preset && bunx vitest run src/shipped.test.ts`
Expected: red. The utf8 read mangles the bytes, so the base64 comparison misses.

- [ ] **Step 3: Implement**

Rework `packages/preset/src/shipped.ts` so the read is encoding-aware. The branch is an explicit comparison, not a truthiness read, so no mutant is equivalent:

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetContents } from './contents.ts';
import type { PresetFile, PresetItem } from './item.ts';

import { everyFileOf } from './item.ts';

async function bytesOf(
  file: PresetFile,
  root: string,
  shared: string | undefined,
): Promise<string> {
  const looked = shared === undefined ? [root] : [root, shared];

  for (const from of looked) {
    const kept = await readFile(join(from, file.path)).catch(() => undefined);

    if (kept !== undefined) {
      return file.encoding === 'base64' ? kept.toString('base64') : kept.toString('utf8');
    }
  }

  throw new Error(`the preset promises ${file.path} and nowhere it reads from holds it`);
}

export async function shippedFilesOf(
  item: PresetItem,
  root: string,
  shared?: string,
): Promise<PresetContents> {
  const files = everyFileOf(item).toSorted((one, other) => one.path.localeCompare(other.path));

  const read = await Promise.all(
    files.map(async (file): Promise<[string, string]> => [
      file.path,
      await bytesOf(file, root, shared),
    ]),
  );

  return Object.fromEntries(read);
}
```

Keep the existing comment above `bytesOf` about shared bytes. It states the lookup contract.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/preset && bunx vitest run src/shipped.test.ts`
Expected: green.

- [ ] **Step 5: Run the package suite and the mutation gate**

Run: `cd packages/preset && bun run test && bun run test:mutation`
Expected: green with zero survivors. If a mutant survives in the new branch, add the missing assertion rather than touching the threshold.

- [ ] **Step 6: Commit**

```bash
git add packages/preset/src/shipped.ts packages/preset/src/shipped.test.ts
git commit -m "feat(preset): ship a copied file as base64 bytes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The scaffold writes bytes back

`writeFiles` in `@ket/cli` decodes a base64 `ScaffoldFile` and writes bytes. Text keeps flowing as utf8.

**Files:**

- Modify: `packages/cli/src/shared/write-files.ts`
- Test: `packages/cli/src/shared/write-files.test.ts`

**Interfaces:**

- Consumes: nothing from other tasks; the encoding mark mirrors Task 1's field.
- Produces: `ScaffoldFile` gains `encoding?: 'base64'`. `writeFiles(root, files)` writes decoded bytes for a base64 file. Task 4 relies on both.

- [ ] **Step 1: Write the failing tests**

Add to `packages/cli/src/shared/write-files.test.ts`, following its existing temporary-directory pattern:

```ts
describe('writing bytes', () => {
  it('writes a base64 file as the bytes it encodes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-write-'));
    const bytes = Buffer.from([0, 255, 254, 147, 10, 13, 0, 128]);

    await writeFiles(root, [
      { path: 'public/bg.mp4', contents: bytes.toString('base64'), encoding: 'base64' },
    ]);

    expect(await readFile(join(root, 'public', 'bg.mp4'))).toStrictEqual(bytes);
  });

  it('writes any bytes whole from their base64', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 1 }), async (raw) => {
        const root = await mkdtemp(join(tmpdir(), 'ket-write-'));

        await writeFiles(root, [
          { path: 'blob.bin', contents: Buffer.from(raw).toString('base64'), encoding: 'base64' },
        ]);

        expect(new Uint8Array(await readFile(join(root, 'blob.bin')))).toStrictEqual(raw);
      }),
    );
  });

  it('keeps writing text as text', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-write-'));

    await writeFiles(root, [{ path: 'a.txt', contents: 'plain text' }]);

    expect(await readFile(join(root, 'a.txt'), 'utf8')).toBe('plain text');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/cli && bunx vitest run src/shared/write-files.test.ts`
Expected: red. The type refuses `encoding`, and the base64 text lands verbatim.

- [ ] **Step 3: Implement**

In `packages/cli/src/shared/write-files.ts`:

```ts
import { Buffer } from 'node:buffer';

export interface ScaffoldFile {
  path: string;
  contents: string;
  encoding?: 'base64';
}

export async function writeFiles(root: string, files: ScaffoldFile[]): Promise<void> {
  for (const file of files) {
    const target = resolveInside(root, file.path);

    await mkdir(dirname(target), { recursive: true });

    if (file.encoding === 'base64') {
      await writeFile(target, Buffer.from(file.contents, 'base64'));
    } else {
      await writeFile(target, file.contents, 'utf8');
    }
  }
}
```

`resolveInside` and `readTextIfPresent` stay as they are.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/cli && bunx vitest run src/shared/write-files.test.ts`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/shared/write-files.ts packages/cli/src/shared/write-files.test.ts
git commit -m "feat(cli): write a base64 scaffold file as bytes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Bytes skip the name token

`filesToInstall` substitutes `__PROJECT_NAME__` in text and leaves bytes untouched. Integration files carry their encoding through as well.

**Files:**

- Modify: `packages/cli/src/commands/create/install.ts`
- Modify: `packages/cli/src/commands/create/integrations.ts`
- Test: `packages/cli/src/commands/create/install.test.ts`

**Interfaces:**

- Consumes: `PresetFile.encoding` from Task 1, `ScaffoldFile.encoding` from Task 3.
- Produces: `filesToInstall(targets, project)` and `filesFor(presets, chosen)` return `ScaffoldFile[]` where a base64 entry keeps its encoding and its contents verbatim.

- [ ] **Step 1: Write the failing test**

Add to `packages/cli/src/commands/create/install.test.ts`, using the file's existing pattern for registering a fake preset. The base64 contents below decode to text that contains the token, which pins the rule: substitution never reaches bytes.

```ts
describe('installing a promise to copy bytes', () => {
  it('leaves base64 contents untouched by the project name', () => {
    const carried = Buffer.from('__PROJECT_NAME__ stays as bytes').toString('base64');

    const installed = filesToInstallFrom(
      presetWith([{ file: copies('hero/bg.mp4', 'public/bg.mp4'), contents: carried }]),
      { name: 'atlas', key: 'atlas' },
    );

    expect(installed).toStrictEqual([
      { path: 'public/bg.mp4', contents: carried, encoding: 'base64' },
    ]);
  });
});
```

Adapt the helper names to what `install.test.ts` already uses for building a preset double. If the file drives `filesToInstall` through the real registry, follow that pattern instead, and assert on the two hero paths after Task 8 lands the real entries. The assertion that matters: contents equal the carried base64, and `encoding` is `'base64'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/cli && bunx vitest run src/commands/create/install.test.ts`
Expected: red. Today every file runs through `withProjectNames` and no encoding survives.

- [ ] **Step 3: Implement**

In `packages/cli/src/commands/create/install.ts`, replace the mapping inside `filesOf`:

```ts
function scaffolded(file: PresetFile, contents: string, project: ProjectNames): ScaffoldFile {
  return file.encoding === 'base64'
    ? { path: pathInProject(file.target), contents, encoding: 'base64' }
    : { path: pathInProject(file.target), contents: withProjectNames(contents, project) };
}

function filesOf(preset: RegisteredPreset, project: ProjectNames): ScaffoldFile[] {
  return preset.item.files.map((file) => scaffolded(file, preset.contentOf(file.path), project));
}
```

Import `PresetFile` as a type from `@ket/preset`. In `packages/cli/src/commands/create/integrations.ts`, extend the entry that builds a `ScaffoldFile` so a binary integration file keeps its mark:

```ts
{
  path: pathInProject(file.target),
  contents: preset.contentOf(file.path),
  ...(file.encoding === 'base64' ? { encoding: 'base64' as const } : {}),
}
```

Match the surrounding shape of `filesFor`. Only the object literal changes.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/cli && bunx vitest run src/commands/create/`
Expected: green, including the untouched integration tests.

- [ ] **Step 5: Run the package suite and the mutation gate**

Run: `cd packages/cli && bun run test && bun run test:mutation`
Expected: green with zero survivors.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/create/install.ts packages/cli/src/commands/create/integrations.ts packages/cli/src/commands/create/install.test.ts
git commit -m "feat(cli): install copied bytes untouched by the name token

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: The artwork lands in the repository

Re-encode the source assets from `~/Downloads/ket/` into the preset, and teach the repository's own spell gate to leave binary payloads alone.

**Files:**

- Create: `presets/web/files/source/hero/ket-bg.mp4`
- Create: `presets/web/files/source/hero/ket-bg-poster.webp`
- Modify: `cspell.json` (repository root)

- [ ] **Step 1: Re-encode the video and recompress the poster**

```bash
mkdir -p presets/web/files/source/hero
ffmpeg -y -i ~/Downloads/ket/ket-bg.mp4 -c:v libx264 -crf 30 -preset veryslow -pix_fmt yuv420p -movflags +faststart -an presets/web/files/source/hero/ket-bg.mp4
magick ~/Downloads/ket/ket-bg-poster.webp -quality 72 presets/web/files/source/hero/ket-bg-poster.webp
```

- [ ] **Step 2: Verify the sizes**

Run: `ls -la presets/web/files/source/hero/`
Expected: the mp4 near 0.6 MB, the webp near 0.36 MB, both inside the budget.

- [ ] **Step 3: Eyeball a frame**

```bash
ffmpeg -y -ss 1 -i presets/web/files/source/hero/ket-bg.mp4 -frames:v 1 /tmp/hero-frame.png
```

Read `/tmp/hero-frame.png` and confirm the torii, the cat, and the halftone sky read cleanly.

- [ ] **Step 4: Update the repository spell gate**

In the root `cspell.json`, extend `ignorePaths` with three entries and drop the now dead override:

```json
"ignorePaths": [
  "...existing entries...",
  "**/*.mp4",
  "**/*.webp",
  "presets/*/src/contents.generated.ts"
]
```

Remove `"presets/*/src/contents.generated.ts"` from the `overrides` filename list, keeping the `presets/*/files/oxlintrc.json` entry there.

- [ ] **Step 5: Commit**

```bash
git add presets/web/files/source/hero cspell.json
git commit -m "feat(presets): carry the torii artwork in the web preset

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: The welcome entity

The `greeting` entity becomes `welcome`. The model decides the headline, the api keeps the fetch-and-compose example, the ui renders the heading the scenario reads. These are template files under `presets/web/files/`. Their tests run inside scaffolded projects, and Task 9 runs them for real. Read the `ket:tdd` and `ket:gherkin` skills before this task.

**Files:**

- Create: `presets/web/files/source/welcome/model/welcome.ts`
- Create: `presets/web/files/source/welcome/model/welcome.test.ts`
- Create: `presets/web/files/source/welcome/model/welcome.property.test.ts`
- Create: `presets/web/files/source/welcome/api/welcomed.ts`
- Create: `presets/web/files/source/welcome/api/welcomed.integration.test.ts`
- Create: `presets/web/files/source/welcome/ui/welcome-heading.tsx`
- Create: `presets/web/files/source/welcome/index.ts`
- Create: `presets/web/files/source/features/welcome.feature`
- Create: `presets/web/files/source/e2e/steps/welcome.steps.ts`
- Delete: `presets/web/files/source/greeting/` (all six files)
- Delete: `presets/web/files/source/features/greeting.feature`
- Delete: `presets/web/files/source/e2e/steps/greeting.steps.ts`
- Modify: `presets/web/files/CLAUDE.md`

**Interfaces:**

- Consumes: `cn` from the template's `@/shared/cn.ts`.
- Produces: `welcomeTo(name: string | undefined): string`, `welcomed(from: string): Promise<string>`, and `WelcomeHeading({ project, className })` with `data-testid="welcome"`. Task 7 imports `WelcomeHeading` from `../../entities/welcome`.

- [ ] **Step 1: Write the model and its tests**

`presets/web/files/source/welcome/model/welcome.ts`:

```ts
const NAMELESS = 'your project';

export function welcomeTo(name: string | undefined): string {
  const named = name?.trim() ?? '';

  return `Welcome to ${named === '' ? NAMELESS : named}.`;
}
```

`presets/web/files/source/welcome/model/welcome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { welcomeTo } from './welcome.ts';

describe('welcoming a project', () => {
  it('welcomes by the name it was given', () => {
    expect(welcomeTo('atlas')).toBe('Welcome to atlas.');
  });

  it('welcomes the nameless project when nobody named it', () => {
    expect(welcomeTo(undefined)).toBe('Welcome to your project.');
  });

  it('welcomes the nameless project when the name is only spaces', () => {
    expect(welcomeTo('   ')).toBe('Welcome to your project.');
  });

  it('drops the spaces around a name', () => {
    expect(welcomeTo('  atlas  ')).toBe('Welcome to atlas.');
  });
});
```

`presets/web/files/source/welcome/model/welcome.property.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { welcomeTo } from './welcome.ts';

describe('what a welcome always does', () => {
  it('opens with a welcome and closes with a period', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), (name) => {
        expect(welcomeTo(name)).toMatch(/^Welcome to .+\.$/su);
      }),
    );
  });

  it('carries the name whenever the name has something in it', () => {
    fc.assert(
      fc.property(
        fc.string().filter((name) => name.trim() !== ''),
        (name) => {
          expect(welcomeTo(name)).toContain(name.trim());
        },
      ),
    );
  });
});
```

- [ ] **Step 2: Write the api and its integration test**

`presets/web/files/source/welcome/api/welcomed.ts`:

```ts
import { welcomeTo } from '../model/welcome.ts';

function nameIn(answered: unknown): string | undefined {
  if (typeof answered !== 'object' || answered === null || !('name' in answered)) {
    return undefined;
  }

  const named: unknown = answered.name;

  return typeof named === 'string' ? named : undefined;
}

export async function welcomed(from: string): Promise<string> {
  const answered = await fetch(from);

  if (!answered.ok) {
    return welcomeTo(undefined);
  }

  const body: unknown = await answered.json();

  return welcomeTo(nameIn(body));
}
```

Keep the existing two-line comment from the old `api/welcome.ts` above `welcomed`. That adapter-and-model constraint survives the rename verbatim.

`presets/web/files/source/welcome/api/welcomed.integration.test.ts`:

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../test-support/network.ts';
import { welcomed } from './welcomed.ts';

const WHOM = 'https://example.invalid/whom';

describe('welcoming whoever the network names', () => {
  it('welcomes the name the answer carries', async () => {
    server.use(http.get(WHOM, () => HttpResponse.json({ name: 'ada' })));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to ada.');
  });

  it('welcomes the nameless project when the answer names nobody', async () => {
    server.use(http.get(WHOM, () => HttpResponse.json({})));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to your project.');
  });

  it('welcomes the nameless project when the answer is a refusal', async () => {
    server.use(http.get(WHOM, () => new HttpResponse(undefined, { status: 503 })));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to your project.');
  });
});
```

- [ ] **Step 3: Write the ui and the entity index**

`presets/web/files/source/welcome/ui/welcome-heading.tsx`:

```tsx
import { cn } from '@/shared/cn.ts';

import { welcomeTo } from '../model/welcome.ts';

export function WelcomeHeading({ project, className }: { project: string; className?: string }) {
  return (
    <h1 className={cn('text-balance', className)} data-testid="welcome">
      {welcomeTo(project)}
    </h1>
  );
}
```

`presets/web/files/source/welcome/index.ts`:

```ts
export { WelcomeHeading } from './ui/welcome-heading.tsx';
```

- [ ] **Step 4: Write the scenario and its steps**

`presets/web/files/source/features/welcome.feature`:

```gherkin
Feature: Welcoming whoever arrives

  Scenario: A visitor opens the home page
    Given a visitor opens the home page
    Then the page welcomes them to "__PROJECT_NAME__"
    And the page is operable by anyone
```

`presets/web/files/source/e2e/steps/welcome.steps.ts`:

```ts
import { expectAccessible } from '../helpers/a11y.ts';
import { createBdd, expect } from '../helpers/harness.ts';

const { Given, Then } = createBdd();

Given('a visitor opens the home page', async ({ page }) => {
  await page.goto('/');
});

Then('the page welcomes them to {string}', async ({ page }, project: string) => {
  await expect(page.getByTestId('welcome')).toHaveText(`Welcome to ${project}.`);
});

Then('the page is operable by anyone', async ({ page }) => {
  await expectAccessible(page);
});
```

- [ ] **Step 5: Delete the greeting and mend the template law**

```bash
git rm -r presets/web/files/source/greeting presets/web/files/source/features/greeting.feature presets/web/files/source/e2e/steps/greeting.steps.ts
```

In `presets/web/files/CLAUDE.md`, the test-naming paragraph names a unit called `greeting`. Swap both `greeting` mentions there for `welcome` and keep the sentence otherwise as it stands.

- [ ] **Step 6: Commit**

The web preset invariants run red between here and Task 8. That red is the failing test that covers the coming `item.ts` edit, so commit the templates now and the promises there.

```bash
git add presets/web/files
git commit -m "feat(presets): recast the greeting entity as welcome

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: The hero page templates

The route becomes the hero, the root route gains the favicon, and the token file gains the art tokens and the Fontsource imports. Read the ket:design-tokens skill before this task.

**Files:**

- Modify: `presets/web/files/source/routes/index.tsx` (full replacement)
- Modify: `presets/web/files/source/routes/__root.tsx`
- Modify: `presets/web/files/source/styles.css`
- Modify: `presets/web/files/knip.json`
- Modify: `presets/web/files/cspell.json`

**Interfaces:**

- Consumes: `WelcomeHeading` from Task 6, `Badge` and `Button` from the template's `shared/ui/`, the art tokens defined below.
- Produces: the page Task 9 screenshots and the scenario from Task 6 drives.

- [ ] **Step 1: Replace the route**

`presets/web/files/source/routes/index.tsx`, whole file:

```tsx
import { createFileRoute } from '@tanstack/react-router';

import { WelcomeHeading } from '../../entities/welcome';
import { Badge } from '../../shared/ui/badge.tsx';
import { Button } from '../../shared/ui/button.tsx';

export const Route = createFileRoute('/')({ component: Home });

const PROJECT = '__PROJECT_NAME__';

function Home() {
  return (
    <div className="bg-canvas text-paper relative flex min-h-svh flex-col overflow-hidden bg-[url(/ket-bg-poster.webp)] bg-cover bg-center">
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="/ket-bg-poster.webp"
        className="absolute inset-0 size-full object-cover motion-reduce:hidden"
      >
        <source src="/ket-bg.mp4" type="video/mp4" />
      </video>
      <div className="from-scrim/55 via-scrim/10 to-scrim/40 absolute inset-0 bg-gradient-to-b" />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <a className="font-mono text-xl font-medium tracking-wide" href="https://ket.sh">
          ket
        </a>
        <Button
          asChild
          variant="secondary"
          className="bg-scrim/90 text-paper hover:bg-scrim rounded-full"
        >
          <a href="https://ket.sh/docs/presets/web">Read the docs</a>
        </Button>
      </header>

      <main className="relative flex flex-1 flex-col items-center gap-4 px-6 pt-2 text-center sm:pt-4">
        <Badge variant="outline" className="border-paper/45 text-paper font-mono backdrop-blur-xs">
          ket web preset
        </Badge>
        <WelcomeHeading
          project={PROJECT}
          className="text-5xl font-semibold tracking-tight sm:text-7xl"
        />
        <p className="max-w-xl text-lg leading-relaxed text-balance">
          Your project is scaffolded and every quality rule already runs as a machine gate. Agents
          build; the gates hold.
        </p>
      </main>

      <footer className="relative flex flex-col items-center px-6 pb-10">
        <p className="bg-scrim/35 rounded-lg px-4 py-2 font-mono text-sm backdrop-blur-sm">
          Start your first feature in Claude Code with{' '}
          <code className="text-glow">/ket:feature "your prompt"</code>
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Add the favicon to the root route**

In `presets/web/files/source/routes/__root.tsx`, extend the `links` array:

```ts
links: [
  { rel: 'stylesheet', href: styles },
  {
    rel: 'icon',
    href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛩️</text></svg>',
  },
],
```

- [ ] **Step 3: Extend the token file**

In `presets/web/files/source/styles.css`, add the Fontsource imports right after the Tailwind import, and the new tokens inside the existing light `@theme` block. The art tokens stay out of the dark block on purpose. The artwork keeps one look in either scheme, and the comment carries that constraint:

```css
@import 'tailwindcss';
@import '@fontsource-variable/google-sans-flex';
@import '@fontsource-variable/google-sans-code';
```

Inside the first `@theme` block, after the existing color tokens:

```css
--font-sans: 'Google Sans Flex Variable', system-ui, sans-serif;
--font-mono: 'Google Sans Code Variable', ui-monospace, monospace;

/* The artwork keeps its own light whatever the reader asked for, so these
     four stay constant across schemes. */
--color-paper: oklch(0.98 0.01 75);
--color-scrim: oklch(0.18 0.01 75);
--color-glow: oklch(0.9 0.08 75);
--color-canvas: oklch(0.68 0.15 40);
```

- [ ] **Step 4: Teach the scaffold's own gates about the new arrivals**

In `presets/web/files/knip.json`, extend `ignoreDependencies`, because knip doesn't follow a CSS import to a package:

```json
"ignoreDependencies": [
  "@steiger/toolkit",
  "tailwindcss",
  "@fontsource-variable/google-sans-flex",
  "@fontsource-variable/google-sans-code"
]
```

In `presets/web/files/cspell.json`, extend `ignorePaths` with `"public"`.

- [ ] **Step 5: Commit**

```bash
git add presets/web/files
git commit -m "feat(presets): make the web preset home page the torii hero

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: The item promises what the templates hold

`presets/web/src/item.ts` swaps the greeting entries for welcome ones, promises the two binary files, and pins the fonts. Regeneration turns the invariants green again.

**Files:**

- Modify: `presets/web/src/item.ts`
- Regenerate: `presets/web/src/contents.generated.ts` (via `bun run generate`, never by hand)
- Test: `presets/web/src/invariants.test.ts` (existing, unchanged)

**Interfaces:**

- Consumes: `copies` from Task 1, the template paths from Tasks 5 through 7.
- Produces: the preset item Task 9 scaffolds from.

- [ ] **Step 1: Confirm the invariants run red**

Run: `cd presets/web && bun run test`
Expected: red. The preset promises greeting files that no longer exist. This failing test covers the `item.ts` edit under probity.

- [ ] **Step 2: Edit the item**

In `presets/web/src/item.ts`:

Add `copies` to the `@ket/preset` import. In `devDependencies`, after `'@types/react-dom@19.2.4'`, add:

```ts
    '@fontsource-variable/google-sans-flex@5.3.1',
    '@fontsource-variable/google-sans-code@5.3.0',
```

In `files`, replace the six greeting `writes(...)` entries, the `greeting.feature` entry, and the `greeting.steps.ts` entry with:

```ts
    writes('source/welcome/model/welcome.ts', 'src/entities/welcome/model/welcome.ts'),
    writes('source/welcome/model/welcome.test.ts', 'src/entities/welcome/model/welcome.test.ts'),
    writes(
      'source/welcome/model/welcome.property.test.ts',
      'src/entities/welcome/model/welcome.property.test.ts',
    ),
    writes('source/welcome/api/welcomed.ts', 'src/entities/welcome/api/welcomed.ts'),
    writes(
      'source/welcome/api/welcomed.integration.test.ts',
      'src/entities/welcome/api/welcomed.integration.test.ts',
    ),
    writes('source/welcome/ui/welcome-heading.tsx', 'src/entities/welcome/ui/welcome-heading.tsx'),
    writes('source/welcome/index.ts', 'src/entities/welcome/index.ts'),
    writes('source/features/welcome.feature', 'features/welcome.feature'),
    writes('source/e2e/steps/welcome.steps.ts', 'e2e/steps/welcome.steps.ts'),
    copies('source/hero/ket-bg.mp4', 'public/ket-bg.mp4'),
    copies('source/hero/ket-bg-poster.webp', 'public/ket-bg-poster.webp'),
```

The greeting entity already promised its own `source/greeting/index.ts`, and the list above carries that entry over under the new name.

- [ ] **Step 3: Regenerate and verify green**

Run: `cd presets/web && bun run generate && bun run test`
Expected: green. The generated module now carries the base64 of both assets.

- [ ] **Step 4: Run the repository suite**

Run: `bun run test` from the repository root (or `turbo run test`).
Expected: green everywhere.

- [ ] **Step 5: Commit**

```bash
git add presets/web/src/item.ts presets/web/src/contents.generated.ts
git commit -m "feat(presets): promise the hero, the welcome, and the fonts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Scaffold a real project and watch it hold

The honest verification: create a project with the real CLI, compare bytes, run the scaffold's own gates, and screenshot the page. Never call the page done before seeing it rendered.

**Files:** none in the repository. Everything happens in a temporary directory.

- [ ] **Step 1: Scaffold**

```bash
rm -rf /tmp/hero-smoke
bun packages/cli/src/run.ts create /tmp/hero-smoke --preset web < /dev/null
```

Expected: exits zero and announces the scaffold.

- [ ] **Step 2: Compare bytes**

```bash
cmp /tmp/hero-smoke/public/ket-bg.mp4 presets/web/files/source/hero/ket-bg.mp4
cmp /tmp/hero-smoke/public/ket-bg-poster.webp presets/web/files/source/hero/ket-bg-poster.webp
grep -c "__PROJECT_NAME__" /tmp/hero-smoke/src/app/routes/index.tsx || true
```

Expected: both `cmp` calls silent (identical bytes), and the `grep` count is 0 because the token became `hero-smoke`.

- [ ] **Step 3: Run the scaffold's gates**

```bash
cd /tmp/hero-smoke && bun install
bun run test && bun run test:integration && bun run check-types && bun run lint && bun run lint:boundaries && bun run lint:dead && bun run lint:spell
```

Expected: every gate green. A failure here is a defect in a template. Fix the template in the repository, regenerate, re-scaffold, and rerun.

- [ ] **Step 4: See the page**

```bash
cd /tmp/hero-smoke && bun run dev &
sleep 3
bunx playwright screenshot --viewport-size=1440,900 http://localhost:5173 /tmp/hero-shot.png
```

Read `/tmp/hero-shot.png`. Compare against the mock at `~/Downloads/ket/index.html`. Check for the wordmark top left, the docs button top right, and the badge above the headline. Check for one intro line and the hint at the bottom, all over the torii artwork behind a scrim. Adjust spacing classes in the template until the page reads like the mock, regenerating and re-scaffolding between attempts.

- [ ] **Step 5: Run the browser scenario if the machine carries browsers**

```bash
cd /tmp/hero-smoke && bunx playwright install chromium && bun run test:browser
```

Expected: the welcome scenario and the axe step pass.

- [ ] **Step 6: Commit any template fixes this task forced**

```bash
git add presets/web
git commit -m "fix(presets): true the hero to the mock

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Skip the commit if nothing changed.

---

### Task 10: The whole chain, then the pull request

**Files:** none new.

- [ ] **Step 1: Run the full repository chain**

```bash
bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose
```

Expected: green. Add any new legitimate vocabulary to `cspell-words.txt` rather than rewording code.

- [ ] **Step 2: Run the mutation gates on the touched packages**

```bash
cd packages/preset && bun run test:mutation
cd ../cli && bun run test:mutation
```

Expected: zero survivors. Kill any survivor with a better test.

- [ ] **Step 3: Push and open the pull request**

Confirm with the user before pushing. Then:

```bash
git push -u origin feat/a-home-page-that-shows-the-parts
gh pr create --title "feat(presets): give the web preset a hero page and a binary lane" --body "..."
```

The body names the spec, the plan, and the one pipeline capability this adds. End the body with the standard generated-with line.

---

## Self-review notes

- Spec coverage: page (Task 7), welcome entity (Task 6), tokens and fonts (Task 7), binary lane (Tasks 1 through 4), assets (Task 5), item and regeneration (Task 8), test surface (Tasks 2, 3, 6, 9), out-of-scope items untouched.
- The property tests in Tasks 2 and 3 pin the spec's round-trip invariant from each side of the package boundary.
- Names stay consistent: `copies`, `encoding: 'base64'`, `welcomeTo`, `welcomed`, `WelcomeHeading`, `data-testid="welcome"` are the same strings in every task that mentions them.

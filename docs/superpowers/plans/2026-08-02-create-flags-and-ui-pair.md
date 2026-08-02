# Create flags and the ui pair implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `--preset` closes the create wizard, and every ui component in a scaffolded project ships a story and a browser test, held by a gate.

**Architecture:** The wizard decision collapses into one pure function that the create command reads in three places. The ui pair lands as templates. Storybook config, a `component` Vitest browser project, stories and tests for the three shipped components, and a `lint:ui` sibling check all wire into the scaffold's gate chain.

**Tech Stack:** citty, Vitest browser mode, `@vitest/browser-playwright`, `vitest-browser-react`, Storybook (`@storybook/react-vite`, accessibility addon).

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-02-create-flags-and-ui-pair-design.md`.
- Test-first under probity for `packages/cli/src/**` and `presets/web/src/**`. Template files under `presets/web/files/` carry no test cycle in this repository; the scaffold smoke task runs them.
- No code comments beyond a constraint the code can't express. No `any`, no `as` casts, no `@ts-ignore`.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work stays on the branch `feat/a-home-page-that-shows-the-parts`.
- Dependency pins are exact versions. Resolve each at implementation time with `npm view <package> version` and pin what it prints; never guess and never use a range.
- Gate descriptions obey the declaration invariants: the sentence matches `It <verb>...` with a lowercase verb, ends with a period, and stays at or under 42 characters.
- `bun run generate` is the only writer of `contents.generated.ts`.

---

### Task 1: One pure function decides the wizard

**Files:**

- Create: `packages/cli/src/commands/create/wizard-choice.ts`
- Create: `packages/cli/src/commands/create/wizard-choice.test.ts`
- Modify: `packages/cli/src/commands/create/command.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `runsWizard(interactive: boolean, asked: string | undefined): boolean`. The command wires it into the TUI opener, the directory prompt, and the configuration path.

- [ ] **Step 1: Write the failing test**

`packages/cli/src/commands/create/wizard-choice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { runsWizard } from './wizard-choice.ts';

describe('choosing between the wizard and the flags', () => {
  it('opens the wizard when a terminal is attached and nothing was asked', () => {
    expect(runsWizard(true, undefined)).toBe(true);
  });

  it('stays headless when the preset flag already answers the question', () => {
    expect(runsWizard(true, 'web')).toBe(false);
  });

  it('stays headless without a terminal, whatever was asked', () => {
    expect(runsWizard(false, undefined)).toBe(false);
    expect(runsWizard(false, 'web')).toBe(false);
  });
});
```

Run: `cd packages/cli && bunx vitest run src/commands/create/wizard-choice.test.ts`
Expected: red, the module doesn't exist yet.

- [ ] **Step 2: Implement the function**

`packages/cli/src/commands/create/wizard-choice.ts`:

```ts
export function runsWizard(interactive: boolean, asked: string | undefined): boolean {
  return interactive && asked === undefined;
}
```

Run the test file again. Expected: green.

- [ ] **Step 3: Wire the command**

In `packages/cli/src/commands/create/command.ts`, inside `run`, compute the choice once and thread it:

```ts
const wizard = runsWizard(isInteractive(), args.preset);

if (wizard) {
  openCreate();
}

const plan = await planCreation(await settleDirectory(args.directory, wizard));
const configuration = await settleConfiguration(plan.key, args.with, args.preset, wizard);
```

`settleDirectory(given, wizard)` prompts through `askName` only when `wizard` is true. Otherwise a missing directory throws the existing `ket create needs a directory, as in: ket create my-app` error. `settleConfiguration(key, named, asked, wizard)` runs `runWizard` when `wizard` is true and `configuredFromFlags` otherwise. Both functions drop their internal `isInteractive()` calls, because the choice arrives as the parameter. Import `runsWizard` from `./wizard-choice.ts`.

- [ ] **Step 4: Run the package suite and the mutation gate**

Run: `cd packages/cli && bun run test && bun run test:mutation`
Expected: green with zero survivors. The three example tests kill the `&&` and `===` mutants in `runsWizard`.

- [ ] **Step 5: Prove it against a terminal**

Rebuild and run under a pseudo terminal:

```bash
cd packages/cli && bun run build
rm -rf /tmp/flag-smoke && script -q /dev/null ./dist/ket create /tmp/flag-smoke --preset web < /dev/null | head -5
```

Expected: no wizard frame appears, and the scaffold announcement prints. Then confirm the error path: `script -q /dev/null ./dist/ket create --preset web < /dev/null` fails with the needs-a-directory error.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/create
git commit -m "fix(cli): let the preset flag close the create wizard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Storybook and the component test project

Everything in this task is a template under `presets/web/files/`. Nothing here compiles in this repository.

**Files:**

- Create: `presets/web/files/source/storybook/main.ts` (targets `.storybook/main.ts`)
- Create: `presets/web/files/source/storybook/preview.ts` (targets `.storybook/preview.ts`)
- Modify: `presets/web/files/vitest.config.ts`
- Modify: `presets/web/files/lefthook.yml`
- Modify: `presets/web/files/knip.json` (only if the smoke task's knip run demands entries; leave it otherwise)

**Interfaces:**

- Produces: the `component` Vitest project Task 3's tests run under, and the `.storybook/` config Task 3's stories load through.

- [ ] **Step 1: Write the Storybook config templates**

`presets/web/files/source/storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
};

export default config;
```

`presets/web/files/source/storybook/preview.ts`:

```ts
import '../src/app/styles.css';
```

- [ ] **Step 2: Add the component project to the Vitest template**

In `presets/web/files/vitest.config.ts`, add a third entry to `projects`, after `integration`. Verify the exact Vitest 4 browser API against the Context7 Vitest docs before writing. The intended shape:

```ts
{
  plugins: [react()],
  test: {
    name: 'component',
    include: ['src/**/*.browser.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
},
```

with `import react from '@vitejs/plugin-react';` and `import { playwright } from '@vitest/browser-playwright';` at the top. The `domain` project's `exclude` already skips `ui/`, so the two projects stay disjoint.

- [ ] **Step 3: Arm the commit hook**

In `presets/web/files/lefthook.yml`, add one job under `pre-commit.jobs`, beside `boundaries`:

```yaml
- name: ui
  priority: 1
  glob: 'src/**/ui/*.tsx'
  run: bun scripts/check-ui-pairs.mts
```

- [ ] **Step 4: Commit**

```bash
git add presets/web/files
git commit -m "feat(presets): give the scaffold storybook and a component runner

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The three components gain their pairs

Templates only. Each shipped component gets a story and a browser test. The story renders the variants the hero uses. The test asserts behavior a person sees, never implementation.

**Files:**

- Create: `presets/web/files/source/shared/ui/button.stories.tsx`
- Create: `presets/web/files/source/shared/ui/button.browser.test.tsx`
- Create: `presets/web/files/source/shared/ui/badge.stories.tsx`
- Create: `presets/web/files/source/shared/ui/badge.browser.test.tsx`
- Create: `presets/web/files/source/welcome/ui/welcome-heading.stories.tsx`
- Create: `presets/web/files/source/welcome/ui/welcome-heading.browser.test.tsx`

- [ ] **Step 1: Write the button pair**

`button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button.tsx';

const meta = { component: Button } satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: 'Start a feature' } };

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Read the docs' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Read the standing law' },
};
```

`button.browser.test.tsx`:

```tsx
import { render } from 'vitest-browser-react';
import { describe, expect, it } from 'vitest';

import { Button } from './button.tsx';

describe('a button', () => {
  it('carries its label to whoever reads the page', async () => {
    const screen = render(<Button>Start a feature</Button>);

    await expect.element(screen.getByRole('button', { name: 'Start a feature' })).toBeVisible();
  });

  it('becomes the anchor it wraps when asked to', async () => {
    const screen = render(
      <Button asChild>
        <a href="https://ket.sh/docs">Read the docs</a>
      </Button>,
    );

    await expect
      .element(screen.getByRole('link', { name: 'Read the docs' }))
      .toHaveAttribute('href', 'https://ket.sh/docs');
  });
});
```

- [ ] **Step 2: Write the badge pair**

`badge.stories.tsx` mirrors the button story shape with `{ component: Badge }` and two stories: `Default` with `args: { children: 'ket web preset' }`, and `Outline` with `args: { variant: 'outline', children: 'ket web preset' }`.

`badge.browser.test.tsx` mirrors the button test shape with one behavior: rendering `<Badge variant="outline">ket web preset</Badge>` and asserting `screen.getByText('ket web preset')` is visible.

- [ ] **Step 3: Write the welcome-heading pair**

`welcome-heading.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { WelcomeHeading } from './welcome-heading.tsx';

const meta = { component: WelcomeHeading } satisfies Meta<typeof WelcomeHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Named: Story = { args: { project: 'atlas' } };

export const Nameless: Story = { args: { project: '   ' } };
```

`welcome-heading.browser.test.tsx` asserts the two behaviors through the heading role: `project="atlas"` renders the level-one heading `Welcome to atlas.`, and a blank project renders `Welcome to your project.`.

- [ ] **Step 4: Commit**

```bash
git add presets/web/files/source
git commit -m "feat(presets): pair every shipped ui component

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The gate that holds the pair

**Files:**

- Create: `presets/web/files/source/scripts/check-ui-pairs.mts` (targets `scripts/check-ui-pairs.mts`)

- [ ] **Step 1: Write the check**

```ts
import { existsSync, globSync } from 'node:fs';

const SIBLING_MARKS = /\.(stories|test|browser\.test)\.tsx$/u;

function isComponent(path: string): boolean {
  return !SIBLING_MARKS.test(path);
}

function missingPair(component: string): string[] {
  const story = component.replace(/\.tsx$/u, '.stories.tsx');
  const test = component.replace(/\.tsx$/u, '.browser.test.tsx');

  return [...(existsSync(story) ? [] : [story]), ...(existsSync(test) ? [] : [test])];
}

const unpaired = globSync('src/**/ui/*.tsx')
  .filter(isComponent)
  .flatMap((component) =>
    missingPair(component).map((missing) => `${component} misses ${missing}`),
  );

if (unpaired.length > 0) {
  console.error(
    `every ui component ships its story and its browser test, and these do not:\n${unpaired
      .map((line) => `  ${line}`)
      .join('\n')}`,
  );
  process.exit(1);
}

console.log('every ui component ships its story and its browser test');
```

- [ ] **Step 2: Prove both verdicts by hand**

From a directory holding a fake `src/entities/x/ui/thing.tsx`, run `bun check-ui-pairs.mts` and see the failure name both missing siblings. Add the two sibling files and see it pass. Use a temporary directory, not the repository.

- [ ] **Step 3: Commit**

```bash
git add presets/web/files/source/scripts
git commit -m "feat(presets): gate the ui pair at the edit

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: The item promises it all

**Files:**

- Modify: `presets/web/src/item.ts`
- Modify: `presets/web/src/semantics.ts`
- Regenerate: `presets/web/src/contents.generated.ts`

**Interfaces:**

- Consumes: every template from Tasks 2 through 4.

- [ ] **Step 1: Confirm the invariants run red**

Run: `cd presets/web && bun run test`
Expected: green now, red the moment `item.ts` promises a file the module doesn't carry. The edit below must follow a red observation, so run this first and again right after editing.

- [ ] **Step 2: Promise the files and pin the dependencies**

In `item.ts`, add `writes()` entries: `source/storybook/main.ts` to `.storybook/main.ts`, `source/storybook/preview.ts` to `.storybook/preview.ts`, and `source/scripts/check-ui-pairs.mts` to `scripts/check-ui-pairs.mts`. Add the six story and test files beside their components (`src/shared/ui/...`, `src/entities/welcome/ui/...`). Add devDependencies, each pinned to what `npm view <name> version` prints today: `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`, `@vitest/browser-playwright`, `vitest-browser-react`.

In `semantics.ts`, add scripts `storybook: 'storybook dev -p 6006'`, `'storybook:build': 'storybook build'`, `'test:component': 'vitest run --project component'`, and `'lint:ui': 'bun scripts/check-ui-pairs.mts'`. Add two gates after `lint:boundaries`:

```ts
{
  script: 'lint:ui',
  guards: 'It checks a ui component ships its pair.',
  commitJob: 'ui',
  ciJob: 'check',
},
```

and after `test:integration`:

```ts
{
  script: 'test:component',
  guards: 'It checks a ui component on its own.',
  commitJob: '',
  ciJob: 'browser',
},
```

Both sentences fit the invariant: lowercase verb after `It`, a closing period, at most 42 characters.

- [ ] **Step 3: Regenerate and settle the invariants**

Run: `cd presets/web && bun run generate && bun run test`
Expected: green. A pipeline or declaration invariant may complain, say a gate naming a missing lefthook job. Fix the template or the semantics until the invariant holds, and never loosen the invariant.

- [ ] **Step 4: Run the repository suite and commit**

Run: `bun run test` from the root. Expected: green.

```bash
git add presets/web/src/item.ts presets/web/src/semantics.ts presets/web/src/contents.generated.ts
git commit -m "feat(presets): promise the ui pair and its runners

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Scaffold smoke, second round

**Files:** none in the repository. Everything happens in a temporary directory.

- [ ] **Step 1: Scaffold and install**

```bash
rm -rf /tmp/pair-smoke
bun packages/cli/src/run.ts create /tmp/pair-smoke --preset web < /dev/null
cd /tmp/pair-smoke && bun install
```

- [ ] **Step 2: Run the new gates and the old ones**

```bash
bun run lint:ui
bunx playwright install chromium
bun run test:component
bun run test && bun run test:integration && bun run check-types && bun run lint && bun run lint:boundaries && bun run lint:dead && bun run lint:spell
bun run storybook:build
bun run test:browser
```

Expected: everything green. A failure is a template defect: fix the template in the repository, regenerate, re-scaffold, and rerun.

- [ ] **Step 3: Prove the gate bites**

In the scaffold, move a story away and expect the gate to name it:

```bash
mv src/shared/ui/badge.stories.tsx /tmp/badge.stories.tsx
bun run lint:ui; echo "exit: $status"
mv /tmp/badge.stories.tsx src/shared/ui/badge.stories.tsx
```

Expected: a nonzero exit naming `badge.stories.tsx`, then green again after the restore.

- [ ] **Step 4: Commit any template fixes this task forced**

```bash
git add presets/web
git commit -m "fix(presets): true the ui pair against a real scaffold

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Skip the commit when nothing changed.

---

### Task 7: The whole chain

- [ ] **Step 1: Run the repository chain**

```bash
bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose
```

New legitimate vocabulary goes into `cspell-words.txt`.

- [ ] **Step 2: Run the mutation gates on the touched packages**

```bash
cd packages/cli && bun run test:mutation
cd ../../presets/web && bun run test:mutation
```

Expected: zero survivors. Push and the pull request wait for the user's word, as before.

---

## Self-review notes

- Spec coverage: flag behavior (Task 1), Storybook and component runner (Task 2), the three pairs (Task 3), the gate (Task 4), promises and semantics (Task 5), verification (Tasks 6 and 7). Out-of-scope items untouched.
- Names stay consistent across tasks: `runsWizard`, `check-ui-pairs.mts`, `lint:ui`, `test:component`, `*.browser.test.tsx`, `*.stories.tsx`.
- The gate's absolute sweep and the shipped pairs land in the same pull request, so a fresh scaffold starts compliant.

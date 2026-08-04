# Advisor decisions implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The advisor names two more arrivals, a recorded decision and a new file kind, beside the dependencies it already names.

**Architecture:** The pure `shared/toolchain.ts` gains the arrival logic for each new source and a three-section record. The gate adapter `gate/toolchain.ts` reads the ADRs a project holds and the kind a write reports, and folds all three arrivals into one reply. The preset gains a helper naming the file kinds it ships.

**Tech Stack:** The `ket gate toolchain` command, the preset registry, Vitest, fast-check, Stryker.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-04-advisor-decisions-design.md`.
- Work stays on `feat/advisor-decisions`; it lands through its own pull request.
- Test-first under probity for `packages/*/src`; observe the red before the write. For a symbol not yet in the code, stub it and observe the assertion red before implementing.
- Every commit follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Mutation stays at 100 with zero survivors in every touched package.
- Authored markdown passes Vale; no em dash.
- The seen record is `.ket/toolchain.json`, and its three sections are `dependencies`, `decisions`, `kinds`.
- A string that reaches the reply is one line and bounded: a decision title is its ADR's first heading, a kind is a file extension.

---

### Task 1: The record grows three sections

**Files:**

- Modify: `packages/cli/src/shared/toolchain.ts`
- Modify: `packages/cli/src/shared/toolchain.test.ts`
- Modify: `packages/cli/src/commands/gate/toolchain.ts` (adapter, reads the new record shape)

**Interfaces:**

- Produces: `type AdvisedSection = 'dependencies' | 'decisions' | 'kinds'`; `seenUnder(record: unknown, section: AdvisedSection): string[]`; `recordAdvised(sections: Record<AdvisedSection, string[]>): string`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing tests** in `toolchain.test.ts`. Replace the `seenIn` describe block with:

```ts
describe('reading what ket has already looked at, per section', () => {
  it('recovers the names recorded under a section', () => {
    expect(
      seenUnder({ dependencies: ['drizzle-orm'], decisions: [], kinds: [] }, 'dependencies'),
    ).toStrictEqual(['drizzle-orm']);
  });

  it('reads nothing from a record no project has written yet', () => {
    expect(seenUnder(undefined, 'decisions')).toStrictEqual([]);
  });

  it('reads nothing from a section that names nothing', () => {
    expect(seenUnder({ kinds: [] }, 'kinds')).toStrictEqual([]);
  });

  it('leaves out an entry that is not a name', () => {
    expect(seenUnder({ kinds: ['.tf', 7] }, 'kinds')).toStrictEqual(['.tf']);
  });

  it('reads nothing from a section that is not a list', () => {
    expect(seenUnder({ decisions: 'a decision' }, 'decisions')).toStrictEqual([]);
  });

  it('reads one section apart from another', () => {
    const record = { dependencies: ['redis'], decisions: ['a choice'], kinds: ['.tf'] };
    expect(seenUnder(record, 'decisions')).toStrictEqual(['a choice']);
  });
});
```

And replace the `recordToolchain` describe block with:

```ts
describe('recording what it has looked at, in three sections', () => {
  function readBackUnder(
    record: string,
    section: 'dependencies' | 'decisions' | 'kinds',
  ): string[] {
    return seenUnder(JSON.parse(record), section);
  }

  it('records a name under the section it belongs to', () => {
    const record = recordAdvised({ dependencies: ['drizzle-orm'], decisions: [], kinds: [] });
    expect(readBackUnder(record, 'dependencies')).toStrictEqual(['drizzle-orm']);
  });

  it('keeps the sections apart', () => {
    const record = recordAdvised({
      dependencies: ['redis'],
      decisions: ['a choice'],
      kinds: ['.tf'],
    });
    expect(readBackUnder(record, 'kinds')).toStrictEqual(['.tf']);
    expect(readBackUnder(record, 'decisions')).toStrictEqual(['a choice']);
  });

  it('records one entry per name, however many times it was given one', () => {
    const record = recordAdvised({ dependencies: ['redis', 'redis'], decisions: [], kinds: [] });
    expect(readBackUnder(record, 'dependencies')).toStrictEqual(['redis']);
  });

  it('records them in a stable order, so a diff shows what changed', () => {
    const record = recordAdvised({ dependencies: [], decisions: [], kinds: ['.ts', '.tf'] });
    expect(readBackUnder(record, 'kinds')).toStrictEqual(['.tf', '.ts']);
  });

  it('ends the record with a newline, since a file in a repository does', () => {
    expect(
      recordAdvised({ dependencies: ['redis'], decisions: [], kinds: [] }).endsWith('\n'),
    ).toBe(true);
  });
});
```

Update the import line to `import { arrivalsIn, declaredIn, recordAdvised, seenUnder } from './toolchain.ts';`.

- [ ] **Step 2: Run and watch it fail.** Run: `bun run --cwd packages/cli test src/shared/toolchain.test.ts`. Expected: it fails, `seenUnder`/`recordAdvised` not exported.

- [ ] **Step 3: Implement.** In `toolchain.ts`, replace `const SEEN = 'seen';` with nothing (drop it), and replace `seenIn`/`recordToolchain` with:

```ts
export type AdvisedSection = 'dependencies' | 'decisions' | 'kinds';

export function seenUnder(record: unknown, section: AdvisedSection): string[] {
  return isRecord(record) ? namesOf(record[section]) : [];
}

export function recordAdvised(sections: Record<AdvisedSection, string[]>): string {
  const ordered = {
    dependencies: inOneOrder(sections.dependencies),
    decisions: inOneOrder(sections.decisions),
    kinds: inOneOrder(sections.kinds),
  };

  return `${JSON.stringify(ordered, undefined, INDENT)}\n`;
}
```

- [ ] **Step 4: Update the adapter** `gate/toolchain.ts` so it reads and writes the dependency section (decisions and kinds land in Task 5). Change the import to `import { arrivalsIn, declaredIn, recordAdvised, seenUnder } from '../../shared/toolchain.ts';`, then:

```ts
const record = join(root, KET_DIRECTORY, TOOLCHAIN);
const held = await readJson(record);
const dependencies = seenUnder(held, 'dependencies');
const arrivals = arrivalsIn({
  declared: declaredIn(await readJson(join(root, MANIFEST))),
  shipped: dependencyNamesOf(governing),
  seen: dependencies,
});
const reply = proposalReply(arrivals, event);

if (reply === undefined) {
  return undefined;
}

await writeFile(
  record,
  recordAdvised({
    dependencies: [...dependencies, ...arrivals],
    decisions: seenUnder(held, 'decisions'),
    kinds: seenUnder(held, 'kinds'),
  }),
  'utf8',
);
```

- [ ] **Step 5: Run the package tests.** Run: `bun run --cwd packages/cli test`. Expected: it passes. Then `bun run --cwd packages/cli lint`.

- [ ] **Step 6: Commit** with `feat(cli): give the advised record a section per source`.

---

### Task 2: Decisions arrive from the ADRs a project holds

**Files:**

- Modify: `packages/cli/src/shared/toolchain.ts`
- Modify: `packages/cli/src/shared/toolchain.test.ts`

**Interfaces:**

- Produces: `decisionArrivalsIn(look: { titles: string[]; seen: string[] }): string[]`, the titles not yet seen, each kept to one bounded line, in one order.
- Consumes: `inOneOrder` from Task 1's module (already present).

- [ ] **Step 1: Write the failing tests.** Add to `toolchain.test.ts`:

```ts
describe('the decisions that arrived since ket last looked', () => {
  it('names a decision the project recorded', () => {
    expect(decisionArrivalsIn({ titles: ['Use Postgres over MySQL'], seen: [] })).toStrictEqual([
      'Use Postgres over MySQL',
    ]);
  });

  it('says nothing about a decision it has already named once', () => {
    expect(
      decisionArrivalsIn({
        titles: ['Use Postgres over MySQL'],
        seen: ['Use Postgres over MySQL'],
      }),
    ).toStrictEqual([]);
  });

  it('names a decision once, however many records carry the same sentence', () => {
    expect(decisionArrivalsIn({ titles: ['A choice', 'A choice'], seen: [] })).toStrictEqual([
      'A choice',
    ]);
  });

  it('names them in a stable order, so two sessions read the same way', () => {
    expect(decisionArrivalsIn({ titles: ['B choice', 'A choice'], seen: [] })).toStrictEqual([
      'A choice',
      'B choice',
    ]);
  });

  it('leaves out a title past the length a reply should carry', () => {
    const tooLong = 'x'.repeat(201);
    expect(decisionArrivalsIn({ titles: [tooLong, 'A choice'], seen: [] })).toStrictEqual([
      'A choice',
    ]);
  });

  it('leaves out a blank title, since an ADR with no heading decides nothing named', () => {
    expect(decisionArrivalsIn({ titles: ['', '   ', 'A choice'], seen: [] })).toStrictEqual([
      'A choice',
    ]);
  });
});
```

Add `decisionArrivalsIn` to the import line.

- [ ] **Step 2: Run and watch it fail.** Run: `bun run --cwd packages/cli test src/shared/toolchain.test.ts`. Expected: it fails, `decisionArrivalsIn` not exported.

- [ ] **Step 3: Implement** in `toolchain.ts`:

```ts
const TITLE_LIMIT = 200;

function carriesInAReply(title: string): boolean {
  return title.trim() !== '' && title.length <= TITLE_LIMIT;
}

export function decisionArrivalsIn(look: { titles: string[]; seen: string[] }): string[] {
  const seen = new Set(look.seen);

  return inOneOrder(look.titles.filter((title) => !seen.has(title) && carriesInAReply(title)));
}
```

- [ ] **Step 4: Run the tests.** Run: `bun run --cwd packages/cli test src/shared/toolchain.test.ts`. Expected: it passes.

- [ ] **Step 5: Commit** with `feat(cli): name the decisions an ADR records`.

---

### Task 3: Kinds arrive from the write a hook reports

**Files:**

- Modify: `packages/preset/src/item.ts` (add `fileKindsOf`)
- Modify: `packages/preset/src/index.ts` (export it)
- Create: `packages/preset/src/item.kinds.test.ts`
- Modify: `packages/cli/src/shared/toolchain.ts`
- Modify: `packages/cli/src/shared/toolchain.test.ts`

**Interfaces:**

- Produces: `fileKindsOf(item: PresetItem): string[]` (preset), the distinct extensions of every target the item writes. `kindOf(path: string): string | undefined` (cli), the extension a path carries, or undefined for a path with none. `kindArrivalsIn(look: { written: string | undefined; shipped: string[]; seen: string[] }): string[]`.
- Consumes: `everyFileOf` (already in `item.ts`), `inOneOrder` (Task 1's module).

- [ ] **Step 1: Write the failing preset test.** Create `packages/preset/src/item.kinds.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { fileKindsOf, writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [
    writes('source/main.ts', 'src/main.ts'),
    writes('features/x.feature', 'features/x.feature'),
    writes('source/other.ts', 'src/other.ts'),
  ],
  integrations: [],
};

describe('the file kinds a preset ships', () => {
  it('names the extension of every file it writes', () => {
    expect(fileKindsOf(ITEM)).toStrictEqual(['.feature', '.ts']);
  });

  it('names a kind once, however many files carry it', () => {
    expect(fileKindsOf(ITEM).filter((kind) => kind === '.ts')).toStrictEqual(['.ts']);
  });
});
```

- [ ] **Step 2: Run and watch it fail.** Run: `bun run --cwd packages/preset test src/item.kinds.test.ts`. Expected: it fails, `fileKindsOf` not exported.

- [ ] **Step 3: Implement `fileKindsOf`** in `item.ts` (after `everyFileOf`):

```ts
export function fileKindsOf(item: PresetItem): string[] {
  const kinds = everyFileOf(item)
    .map((file) => file.target.slice(file.target.lastIndexOf('/') + 1))
    .map((name) => (name.includes('.') ? name.slice(name.lastIndexOf('.')) : undefined))
    .filter((kind): kind is string => kind !== undefined);

  return [...new Set(kinds)].toSorted();
}
```

Export it from `index.ts`: change the export line to include `fileKindsOf`.

- [ ] **Step 4: Run and pass.** Run: `bun run --cwd packages/preset test src/item.kinds.test.ts`. Expected: it passes.

- [ ] **Step 5: Write the failing cli tests.** Add to `toolchain.test.ts`:

```ts
describe('the kind a path carries', () => {
  it('reads the extension a file name ends in', () => {
    expect(kindOf('infra/main.tf')).toBe('.tf');
  });

  it('reads the last extension, since a name may carry more than one dot', () => {
    expect(kindOf('src/env.d.ts')).toBe('.ts');
  });

  it('reads no kind from a path whose last segment holds no dot', () => {
    expect(kindOf('Dockerfile')).toBeUndefined();
  });

  it('reads no kind from a dotfile, whose dot opens the name rather than an extension', () => {
    expect(kindOf('.gitignore')).toBeUndefined();
  });
});

describe('the kinds that arrived with a write', () => {
  it('names the kind a write brought that the preset never ships', () => {
    expect(kindArrivalsIn({ written: 'infra/main.tf', shipped: ['.ts'], seen: [] })).toStrictEqual([
      '.tf',
    ]);
  });

  it('says nothing about a kind the preset already ships', () => {
    expect(kindArrivalsIn({ written: 'src/app.ts', shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });

  it('says nothing about a kind it has already named once', () => {
    expect(
      kindArrivalsIn({ written: 'infra/main.tf', shipped: ['.ts'], seen: ['.tf'] }),
    ).toStrictEqual([]);
  });

  it('says nothing when no write named a path', () => {
    expect(kindArrivalsIn({ written: undefined, shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });

  it('says nothing about a write whose path carries no kind', () => {
    expect(kindArrivalsIn({ written: 'Dockerfile', shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });
});
```

Add `kindArrivalsIn, kindOf` to the import line.

- [ ] **Step 6: Run and watch it fail.** Run: `bun run --cwd packages/cli test src/shared/toolchain.test.ts`. Expected: it fails.

- [ ] **Step 7: Implement** in `toolchain.ts`:

```ts
export function kindOf(path: string): string | undefined {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');

  return dot > 0 ? name.slice(dot) : undefined;
}

export function kindArrivalsIn(look: {
  written: string | undefined;
  shipped: string[];
  seen: string[];
}): string[] {
  const kind = look.written === undefined ? undefined : kindOf(look.written);
  const covered = new Set([...look.shipped, ...look.seen]);

  return kind === undefined || covered.has(kind) ? [] : [kind];
}
```

- [ ] **Step 8: Run and pass.** Run: `bun run --cwd packages/cli test src/shared/toolchain.test.ts`. Expected: it passes. Then `bun run --cwd packages/preset test` and `bun run --cwd packages/preset lint`.

- [ ] **Step 9: Commit** with `feat(preset): name the file kinds a preset ships` (preset files) and `feat(cli): name the kind a write brought` (cli files), or one commit if you prefer; keep the message under 50 chars.

---

### Task 4: The reply names each arrival for its kind

**Files:**

- Modify: `packages/cli/src/commands/gate/proposal.ts`
- Modify: `packages/cli/src/commands/gate/proposal.test.ts`

**Interfaces:**

- Produces: `proposalReply(arrivals: { dependencies: string[]; decisions: string[]; kinds: string[] }, event: ProposalEvent): ProposalReply | undefined`, a single reply naming each non-empty group under its own sentence, or undefined when all three are empty.
- Consumes: `ProposalEvent`, `proposalEventFrom` (unchanged).

- [ ] **Step 1: Rewrite the reply tests.** Replace the `proposalReply` describe block in `proposal.test.ts`:

```ts
function only(dependencies: string[]): {
  dependencies: string[];
  decisions: string[];
  kinds: string[];
} {
  return { dependencies, decisions: [], kinds: [] };
}

describe('proposing a machine and a skill for what a project brought', () => {
  it('says nothing when nothing arrived, so a look about nothing stays quiet', () => {
    expect(
      proposalReply({ dependencies: [], decisions: [], kinds: [] }, 'SessionStart'),
    ).toBeUndefined();
  });

  it('names a dependency and sends the session down both routes', () => {
    const context = proposalReply(only(['drizzle-orm']), 'SessionStart')?.hookSpecificOutput
      .additionalContext;
    expect(context).toContain('drizzle-orm');
    expect(context).toContain('mechanical-checks');
    expect(context).toContain('find-skills');
  });

  it('names a decision a project recorded', () => {
    const context = proposalReply(
      { dependencies: [], decisions: ['Use Postgres over MySQL'], kinds: [] },
      'SessionStart',
    )?.hookSpecificOutput.additionalContext;
    expect(context).toContain('Use Postgres over MySQL');
  });

  it('names a file kind a write brought', () => {
    const context = proposalReply(
      { dependencies: [], decisions: [], kinds: ['.tf'] },
      'PostToolUse',
    )?.hookSpecificOutput.additionalContext;
    expect(context).toContain('.tf');
  });

  it('names each source under its own line, so one is not read as another', () => {
    const context =
      proposalReply(
        { dependencies: ['redis'], decisions: ['A choice'], kinds: ['.tf'] },
        'PostToolUse',
      )?.hookSpecificOutput.additionalContext ?? '';
    const lines = context.split('\n');
    expect(lines.some((line) => line.includes('redis'))).toBe(true);
    expect(lines.some((line) => line.includes('A choice'))).toBe(true);
    expect(lines.some((line) => line.includes('.tf'))).toBe(true);
  });

  it('answers in the shape of the event that asked', () => {
    expect(proposalReply(only(['redis']), 'PostToolUse')?.hookSpecificOutput.hookEventName).toBe(
      'PostToolUse',
    );
  });

  it('never carries a decision key, since a look refuses nothing', () => {
    expect(Object.keys(proposalReply(only(['redis']), 'SessionStart') ?? {})).toStrictEqual([
      'hookSpecificOutput',
    ]);
  });
});
```

- [ ] **Step 2: Run and watch it fail.** Run: `bun run --cwd packages/cli test src/commands/gate/proposal.test.ts`. Expected: it fails (signature mismatch).

- [ ] **Step 3: Implement.** Replace the constants and `proposalReply` in `proposal.ts`:

```ts
const ASKING =
  'Each one brings a rule this project would otherwise keep by hand, and a craft a skill can ' +
  'teach. Use the ket:mechanical-checks skill: research the check that would keep the rule, ' +
  'judge whether it earns its cost, and propose it. Use the find-skills skill: look for a skill ' +
  'that teaches it, and propose installing it, with skills-lock.json recording a yes. Each ' +
  'proposal stands on its own. ket proposes, the user decides.';

const BETWEEN = ', ';

interface Arrivals {
  dependencies: string[];
  decisions: string[];
  kinds: string[];
}

function lineFor(heading: string, names: string[]): string[] {
  return names.length === 0 ? [] : [`${heading} ${names.join(BETWEEN)}`];
}

function headingsFor(arrivals: Arrivals): string {
  return [
    ...lineFor('new dependencies since ket last looked:', arrivals.dependencies),
    ...lineFor('decisions this project recorded:', arrivals.decisions),
    ...lineFor('file kinds new to this project:', arrivals.kinds),
  ].join('\n');
}

export function proposalReply(arrivals: Arrivals, event: ProposalEvent): ProposalReply | undefined {
  const headings = headingsFor(arrivals);

  if (headings === '') {
    return undefined;
  }

  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: `${headings}\n\n${ASKING}`,
    },
  };
}
```

Drop the old `HEADING` constant.

- [ ] **Step 4: Run and pass.** Run: `bun run --cwd packages/cli test src/commands/gate/proposal.test.ts`. Expected: it passes. The adapter still calls the old signature and won't compile yet; Task 5 fixes that.

- [ ] **Step 5: Commit** with `feat(cli): name each arrival for its own kind`.

---

### Task 5: The look ties the three sources together

**Files:**

- Modify: `packages/cli/src/commands/gate/toolchain.ts`
- Modify: `packages/cli/src/commands/gate/context.ts` (add `adrTitlesUnder`)

**Interfaces:**

- Consumes: `decisionArrivalsIn`, `kindArrivalsIn`, `arrivalsIn`, `recordAdvised`, `seenUnder` (shared); `fileKindsOf` (preset); `proposalReply` (Task 4); `pathFrom` (envelope).
- Produces: nothing later tasks rely on.

- [ ] **Step 1: Add the ADR reader** to `context.ts`. It globs the ADR records a project holds and returns each first heading. Add near `readJson`:

```ts
import { readdir } from 'node:fs/promises';

const ADR_ROOTS = [join(KET_DIRECTORY, 'items'), join('docs', 'adr')];

function headingIn(markdown: string): string | undefined {
  const heading = markdown.split('\n').find((line) => line.startsWith('# '));

  return heading === undefined ? undefined : heading.slice('# '.length).trim();
}

async function markdownUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true }).catch(
    () => [],
  );

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export async function adrTitlesUnder(root: string): Promise<string[]> {
  const paths = (await Promise.all(ADR_ROOTS.map((sub) => markdownUnder(join(root, sub))))).flat();
  const bodies = await Promise.all(paths.map((path) => readFile(path, 'utf8').catch(() => '')));

  return bodies.map(headingIn).filter((title): title is string => title !== undefined);
}
```

- [ ] **Step 2: Fold the three sources into the look** in `gate/toolchain.ts`. Replace the body of `lookAtToolchain` so it reads the envelope's written path, gathers all three arrivals, and records all three sections:

```ts
async function lookAtToolchain(
  envelope: unknown,
  event: ProposalEvent,
): Promise<ProposalReply | undefined> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const governing = await presetOf(root);

  if (governing === undefined) {
    return undefined;
  }

  const record = join(root, KET_DIRECTORY, TOOLCHAIN);
  const held = await readJson(record);
  const seen = {
    dependencies: seenUnder(held, 'dependencies'),
    decisions: seenUnder(held, 'decisions'),
    kinds: seenUnder(held, 'kinds'),
  };
  const arrivals = {
    dependencies: arrivalsIn({
      declared: declaredIn(await readJson(join(root, MANIFEST))),
      shipped: dependencyNamesOf(governing),
      seen: seen.dependencies,
    }),
    decisions: decisionArrivalsIn({ titles: await adrTitlesUnder(root), seen: seen.decisions }),
    kinds: kindArrivalsIn({
      written: pathFrom(envelope),
      shipped: fileKindsOf(governing.item),
      seen: seen.kinds,
    }),
  };
  const reply = proposalReply(arrivals, event);

  if (reply === undefined) {
    return undefined;
  }

  await writeFile(
    record,
    recordAdvised({
      dependencies: [...seen.dependencies, ...arrivals.dependencies],
      decisions: [...seen.decisions, ...arrivals.decisions],
      kinds: [...seen.kinds, ...arrivals.kinds],
    }),
    'utf8',
  );

  return reply;
}
```

Update the `run()` body to read the envelope once and pass it both ways:

```ts
  async run() {
    const envelope = await readEnvelope();
    const reply = await lookAtToolchain(envelope, proposalEventFrom(envelope));

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
```

Add the imports: `decisionArrivalsIn` and `kindArrivalsIn` from `../../shared/toolchain.ts`, `fileKindsOf` from `@ket/preset`, `pathFrom` from `./envelope.ts`, and `adrTitlesUnder` from `./context.ts`.

- [ ] **Step 3: Run the package suite and lint.** Run: `bun run --cwd packages/cli test` then `bun run --cwd packages/cli lint` and `bun run --cwd packages/cli check-types`. Expected: it passes.

- [ ] **Step 4: Commit** with `feat(cli): look at decisions and kinds beside dependencies`.

---

### Task 6: The proofs, the chain, and the pull request

**Files:**

- Modify: `scripts/acceptance-harness.sh`

- [ ] **Step 1: Add acceptance proofs** after the existing mid-session block. Prove a decision arrival and a kind arrival, each named once. Model on the existing `arrives` helper, feeding a Write envelope whose `file_path` names a new kind, and writing an ADR under the project's item directory before a look:

```bash
echo "acceptance: a recorded decision is named once"
mkdir -p "$PROJECT/.ket/items/OS-1"
printf '# Use Postgres over MySQL\n\nStatus: accepted\n' >"$PROJECT/.ket/items/OS-1/adr.md"
looks_at "$PROJECT"
echo "$LOOKED" | grep -q 'Use Postgres over MySQL' ||
  fail "the look never named the decision the ADR recorded: ${LOOKED:-nothing}"
looks_at "$PROJECT"
echo "$LOOKED" | grep -q 'Use Postgres over MySQL' &&
  fail "the look named the same decision twice"
CHECKED=$((CHECKED + 2))

echo "acceptance: a new file kind is named once"
brought_kind() {
  local status=0
  BROUGHT="$(printf '{"hook_event_name":"PostToolUse","tool_name":"Write","tool_input":{"file_path":"%s/infra/main.tf"}}' "$PROJECT" |
    (cd "$PROJECT" && "$KET" gate toolchain) 2>&1)" || status=$?
  test "$status" -eq 0 || fail "the kind look failed: exit $status, said: ${BROUGHT:-nothing}"
}
brought_kind
echo "$BROUGHT" | grep -q '\.tf' ||
  fail "the look never named the kind the write brought: ${BROUGHT:-nothing}"
brought_kind
echo "$BROUGHT" | grep -q '\.tf' &&
  fail "the look named the same kind twice"
CHECKED=$((CHECKED + 2))
```

- [ ] **Step 2: Run acceptance.** Run: `./scripts/acceptance-harness.sh </dev/null`. Expected: all decisions checked, no failure.

- [ ] **Step 3: Run the full chain and mutation.** Run from the repo root: `bun run lint && bun run check-types && bun run test && bun run fmt:check && bun run lint:dead && bun run lint:spell && bun run lint:prose`. Then `bun run --cwd packages/cli test:mutation` and `bun run --cwd packages/preset test:mutation`. Kill any survivor with a test; a threshold never moves.

- [ ] **Step 4: Push, open the pull request, watch its checks, and merge it** (squash, delete branch) when they pass, per the owner's standing instruction.

---

## Self-review notes

- Spec coverage: three sections (Task 1), decisions (Task 2), kinds (Task 3), reply (Task 4), the look wiring (Task 5), proofs and landing (Task 6).
- Names stay consistent: `AdvisedSection`, `seenUnder`, `recordAdvised`, `decisionArrivalsIn`, `kindOf`, `kindArrivalsIn`, `fileKindsOf`, `adrTitlesUnder`.
- The kind source reads only the envelope's path, so a session start names no kind, matching the spec: a kind arrives with a write.
- The registry-name filter stays on the dependency source alone. A length guard holds a decision, an extraction guards a kind, each on its own.

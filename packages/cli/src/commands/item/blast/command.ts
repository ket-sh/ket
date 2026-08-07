import { defineCommand } from 'citty';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ketRootOrThrow } from '../../../shared/locate.ts';
import { itemDirOrThrow } from '../surface/show.ts';
import { graphOf, measureOf } from './measure.ts';

const GRAPH_BUDGET = 67_108_864;

type Answer = { said: string; grumbled: string } | { refusal: string };

async function asked(binary: string, argv: string[], root: string): Promise<Answer> {
  return new Promise((settle) => {
    execFile(binary, argv, { cwd: root, maxBuffer: GRAPH_BUDGET }, (failed, stdout, stderr) => {
      if (failed?.code === 'ENOENT') {
        settle({
          refusal: `${binary} is missing: install dependency-cruiser to capture the blast radius`,
        });

        return;
      }

      settle({ said: stdout, grumbled: stderr });
    });
  });
}

function budgetOf(given: string): number {
  const budget = Number(given);

  if (!Number.isInteger(budget) || budget < 1) {
    throw new Error(`--budget takes a whole number of nodes, at least 1, and got ${given}`);
  }

  return budget;
}

function pathsOf(given: string): string[] {
  return given
    .split(',')
    .map((path) => path.trim())
    .filter((path) => path !== '');
}

async function drawn(root: string, cruise: string, collapse: number): Promise<string> {
  const held = await mkdtemp(join(tmpdir(), 'ket-blast-'));

  try {
    const source = join(held, 'cruise.json');

    await writeFile(source, cruise);

    const formatter = join(root, 'node_modules', '.bin', 'depcruise-fmt');
    const flags = collapse > 0 ? ['--collapse', String(collapse)] : [];
    const answer = await asked(formatter, ['--output-type', 'd2', ...flags, source], root);

    if ('refusal' in answer) {
      throw new Error(answer.refusal);
    }

    return answer.said;
  } finally {
    await rm(held, { recursive: true });
  }
}

function grumbleOf(grumbled: string): string {
  const said = grumbled.trim();

  return said === '' ? 'empty output' : said;
}

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

export const blast = defineCommand({
  meta: {
    name: 'blast',
    description: 'Capture the modules a change reaches, as a diagram with its measure',
  },
  args: {
    key: { type: 'positional', required: true, description: 'The item the capture sits beside' },
    base: { type: 'string', default: 'main', description: 'The git revision to measure against' },
    budget: { type: 'string', default: '30', description: 'The node budget the diagram must fit' },
    paths: { type: 'string', default: 'src', description: 'Comma-separated roots to cruise' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const itemDir = await itemDirOrThrow(root, args.key);
    const budget = budgetOf(args.budget);
    const paths = pathsOf(args.paths);
    const cruiser = join(root, 'node_modules', '.bin', 'depcruise');
    const answer = await asked(
      cruiser,
      [...paths, '--affected', args.base, '--output-type', 'json'],
      root,
    );

    if ('refusal' in answer) {
      throw new Error(answer.refusal);
    }

    const graph = graphOf(answer.said);

    if (graph === undefined) {
      throw new Error(
        `depcruise answered no readable graph for ${paths.join(', ')} against ${args.base}: ${grumbleOf(answer.grumbled)}`,
      );
    }

    const measure = measureOf(graph, {
      base: args.base,
      measuredAt: new Date().toISOString(),
      budget,
    });

    await writeFile(join(itemDir, 'blast.d2'), await drawn(root, answer.said, measure.collapse));
    await writeFile(join(itemDir, 'blast.json'), `${JSON.stringify(measure, null, 2)}\n`);
    say(
      `${args.key} blast captured: ${String(measure.uncollapsedNodes)} modules, ${String(measure.uncollapsedEdges)} edges against ${args.base}`,
    );
  },
});

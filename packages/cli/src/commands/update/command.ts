import { defineCommand, showUsage } from 'citty';
import { access, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { Configuration } from '../../shared/configuration.ts';
import type { FileFate, PlannedFate, ScaffoldRecord } from '../../shared/scaffold-manifest.ts';
import type { ProjectNames } from '../../shared/scaffold/name-token.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { CONFIGURATION_FILE, configurationIn } from '../../shared/configuration-file.ts';
import { uncommittedIn } from '../../shared/git.ts';
import { KET_DIRECTORY, ketRootOrThrow } from '../../shared/locate.ts';
import { partSays } from '../../shared/parts.ts';
import {
  hashOf,
  parseScaffoldRecord,
  recordedAmong,
  renderScaffoldRecord,
  SCAFFOLD_RECORD_PATH,
  scaffoldRecordOf,
  updatePlanOf,
} from '../../shared/scaffold-manifest.ts';
import { installedFor } from '../../shared/scaffold/install.ts';
import { crowdedRefusal, offeredIntegrations } from '../../shared/scaffold/integrations.ts';
import { heroHint } from '../../shared/scaffold/name-token.ts';
import { KET_VERSION } from '../../shared/version.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { LEGACY_STATE, legacyRefusal } from './legacy.ts';
import { withCurrentPluginNames } from './plugin-names.ts';

const WRITE_FATES = new Set<FileFate>(['refreshed', 'restored', 'arrived']);

const SETTINGS_PATH = '.claude/settings.json';

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function configurationOf(root: string): Promise<Configuration> {
  const reading = await configurationIn(root);

  if ('absent' in reading) {
    throw new Error(`no ${KET_DIRECTORY}/${CONFIGURATION_FILE} says what governs this project`);
  }

  if ('refusals' in reading) {
    throw new Error(`${KET_DIRECTORY}/${CONFIGURATION_FILE} ${reading.refusals.join(', and ')}`);
  }

  const { configuration } = reading;
  const offered = offeredIntegrations(Object.values(configuration.targets));
  const crowded = crowdedRefusal(configuration.integrations, offered);

  if (crowded !== undefined) {
    throw new Error(`${KET_DIRECTORY}/${CONFIGURATION_FILE} names ${crowded}`);
  }

  return configuration;
}

async function legacyStateIn(root: string): Promise<string[]> {
  const found = await Promise.all(
    LEGACY_STATE.map(async (path) =>
      access(join(root, path)).then(
        () => path,
        () => undefined,
      ),
    ),
  );

  return found.filter((path): path is string => path !== undefined);
}

async function refusingAnOlderScaffold(root: string): Promise<void> {
  const refusal = legacyRefusal(await legacyStateIn(root));

  if (refusal !== undefined) {
    throw new Error(refusal);
  }
}

async function plannedMigrationOf(root: string): Promise<ScaffoldFile | undefined> {
  const current = withCurrentPluginNames(await readTextIfPresent(root, SETTINGS_PATH));

  return current === undefined ? undefined : { path: SETTINGS_PATH, contents: current };
}

async function recordOf(root: string): Promise<ScaffoldRecord> {
  const read = await readFile(join(root, SCAFFOLD_RECORD_PATH), 'utf8').catch(() => undefined);
  const record = read === undefined ? undefined : parseScaffoldRecord(read);

  if (record === undefined) {
    throw new Error(
      `no readable ${SCAFFOLD_RECORD_PATH} says what ket wrote here, so there is nothing to update by hash`,
    );
  }

  return record;
}

async function refusingDirtyTree(root: string): Promise<void> {
  const dirty = await uncommittedIn(root);

  if (dirty.length > 0) {
    throw new Error(
      `the tree carries ${String(dirty.length)} uncommitted changes; commit them so the update lands as its own diff, or read the plan with --plan`,
    );
  }
}

async function diskHashesFor(
  root: string,
  paths: string[],
): Promise<Record<string, string | undefined>> {
  const entries = await Promise.all(
    paths.map(async (path) => {
      const bytes = await readFile(join(root, path)).catch(() => undefined);

      return [path, bytes === undefined ? undefined : hashOf(bytes)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

async function plannedOn(root: string, record: ScaffoldRecord, fresh: ScaffoldFile[]) {
  const paths = [...new Set([...fresh.map((file) => file.path), ...Object.keys(record.files)])];

  return updatePlanOf(record, await diskHashesFor(root, paths), fresh);
}

function saidFates(plan: PlannedFate[], migration: ScaffoldFile | undefined): void {
  for (const planned of plan.filter((fated) => fated.fate !== 'settled')) {
    say(`${planned.fate} ${planned.path}`);
  }

  if (migration !== undefined) {
    say(`migrated ${migration.path}`);
  }
}

function forced(plan: PlannedFate[], force: boolean): PlannedFate[] {
  if (!force) {
    return plan;
  }

  return plan.map((planned) =>
    planned.fate === 'held' ? { ...planned, fate: 'refreshed' as const } : planned,
  );
}

function recordAfter(
  record: ScaffoldRecord,
  fresh: ScaffoldFile[],
  fates: Map<string, FileFate>,
): string {
  const rewritable = fresh.filter((file) => fates.get(file.path) !== 'held');
  const files = scaffoldRecordOf(rewritable, KET_VERSION).files;

  for (const file of fresh.filter((held) => fates.get(held.path) === 'held')) {
    const kept = record.files[file.path];

    if (kept !== undefined) {
      files[file.path] = kept;
    }
  }

  return renderScaffoldRecord({ version: 1, ket: KET_VERSION, files });
}

async function applied(
  root: string,
  record: ScaffoldRecord,
  fresh: ScaffoldFile[],
  plan: PlannedFate[],
  migration: ScaffoldFile | undefined,
): Promise<void> {
  const fates = new Map(plan.map((planned) => [planned.path, planned.fate]));
  const writing = fresh.filter((file) => WRITE_FATES.has(fates.get(file.path) ?? 'settled'));

  await writeFiles(root, [
    ...writing,
    ...(migration === undefined ? [] : [migration]),
    { path: SCAFFOLD_RECORD_PATH, contents: recordAfter(record, fresh, fates) },
  ]);

  const held = plan.filter((planned) => planned.fate === 'held');

  if (held.length > 0) {
    process.exitCode = 1;
    say(
      `${String(held.length)} held their edits; compare each and rerun with --force to overwrite`,
    );

    return;
  }

  say(`${String(writing.length)} files brought to what ket ${KET_VERSION} ships`);
}

const update = defineCommand({
  meta: {
    name: 'update',
    description: partSays('update'),
  },
  args: {
    plan: { type: 'boolean', default: false, description: 'Say every fate and write nothing' },
    force: { type: 'boolean', default: false, description: 'Overwrite files holding your edits' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());

    await refusingAnOlderScaffold(root);

    const record = await recordOf(root);

    if (!args.plan) {
      await refusingDirtyTree(root);
    }

    const configuration = await configurationOf(root);
    const project: ProjectNames = {
      name: basename(root),
      key: configuration.key,
      hint: heroHint(configuration),
    };
    const fresh = recordedAmong(installedFor(configuration, project));
    const plan = forced(await plannedOn(root, record, fresh), args.force);
    const migration = await plannedMigrationOf(root);

    saidFates(plan, migration);

    if (args.plan) {
      return;
    }

    await applied(root, record, fresh, plan, migration);
  },
});

export async function usage(): Promise<void> {
  await showUsage(update);
}

export default update;

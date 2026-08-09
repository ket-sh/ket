import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { mcpServersFor } from '../../shared/scaffold/integrations.ts';
import {
  MANIFEST_FILE,
  manifestFileOf,
  manifestSourceFor,
} from '../../shared/scaffold/manifest.ts';
import { MCP_FILE, mcpFileOf } from '../../shared/scaffold/mcp.ts';
import { readTextIfPresent } from '../../shared/write-files.ts';
import { withCurrentPluginNames } from './plugin-names.ts';

const SETTINGS_PATH = '.claude/settings.json';

export async function plannedMigrationOf(root: string): Promise<ScaffoldFile | undefined> {
  const current = withCurrentPluginNames(await readTextIfPresent(root, SETTINGS_PATH));

  return current === undefined ? undefined : { path: SETTINGS_PATH, contents: current };
}

async function plannedRegistrationOf(
  root: string,
  configuration: Configuration,
): Promise<ScaffoldFile | undefined> {
  return mcpFileOf(
    await readTextIfPresent(root, MCP_FILE),
    mcpServersFor(Object.values(configuration.targets), configuration.integrations),
  );
}

async function plannedManifestOf(
  root: string,
  configuration: Configuration,
  name: string,
): Promise<ScaffoldFile | undefined> {
  return manifestFileOf(
    await readTextIfPresent(root, MANIFEST_FILE),
    name,
    manifestSourceFor(configuration),
  );
}

export async function plannedMergesOf(
  root: string,
  configuration: Configuration,
  name: string,
): Promise<ScaffoldFile[]> {
  const planned = [
    await plannedRegistrationOf(root, configuration),
    await plannedManifestOf(root, configuration, name),
  ];

  return planned.filter((file): file is ScaffoldFile => file !== undefined);
}

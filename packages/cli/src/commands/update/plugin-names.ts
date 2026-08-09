const GATES_WAS = 'ket@ket';

const GATES_NOW = 'ket-gates@ket';

const WORKFLOW_WAS = 'ket-workflow@ket';

const PIPELINE_NOW = 'ket@ket';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsedRecord(settings: string): Record<string, unknown> | undefined {
  try {
    const held: unknown = JSON.parse(settings);

    return isRecord(held) ? held : undefined;
  } catch {
    return undefined;
  }
}

function currentNameOf(key: string, gatesAlreadyCurrent: boolean): string {
  if (key === WORKFLOW_WAS) {
    return PIPELINE_NOW;
  }

  return key === GATES_WAS && !gatesAlreadyCurrent ? GATES_NOW : key;
}

export function withCurrentPluginNames(settings: string): string | undefined {
  const held = parsedRecord(settings);
  const enabled = held?.['enabledPlugins'];

  if (held === undefined || !isRecord(enabled)) {
    return undefined;
  }

  const gatesAlreadyCurrent = GATES_NOW in enabled;
  const renaming = Object.keys(enabled).some(
    (key) => currentNameOf(key, gatesAlreadyCurrent) !== key,
  );

  if (!renaming) {
    return undefined;
  }

  const renamed = Object.fromEntries(
    Object.entries(enabled).map(([key, value]) => [currentNameOf(key, gatesAlreadyCurrent), value]),
  );

  return `${JSON.stringify({ ...held, enabledPlugins: renamed }, undefined, 2)}\n`;
}

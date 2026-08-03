const MARKETPLACE = 'ket';

const PLUGIN = 'ket@ket';

const SOURCE = { source: 'github', repo: 'ket-sh/ket' };

const GUARD_SCRIPT = 'scripts/protect-generated.mts';

const GUARD_COMMAND = `bun ${GUARD_SCRIPT}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function existing(settings: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(settings);

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function recordUnder(settings: Record<string, unknown>, field: string): Record<string, unknown> {
  const held = settings[field];

  return isRecord(held) ? held : {};
}

function arrayUnder(settings: Record<string, unknown>, field: string): unknown[] {
  const held = settings[field];

  return Array.isArray(held) ? held : [];
}

function runsCommand(group: unknown, command: string): boolean {
  if (!isRecord(group)) {
    return false;
  }

  const commands = group['hooks'];

  return Array.isArray(commands)
    ? commands.some((hook) => isRecord(hook) && hook['command'] === command)
    : false;
}

function withGuardHook(hooks: Record<string, unknown>): Record<string, unknown> {
  const preToolUse = arrayUnder(hooks, 'PreToolUse');

  if (preToolUse.some((group) => runsCommand(group, GUARD_COMMAND))) {
    return hooks;
  }

  return {
    ...hooks,
    PreToolUse: [
      ...preToolUse,
      { matcher: 'Edit|Write', hooks: [{ type: 'command', command: GUARD_COMMAND }] },
    ],
  };
}

function withGuard(
  held: Record<string, unknown>,
  paths: string[],
): { hooks: Record<string, unknown> } | Record<string, never> {
  return paths.includes(GUARD_SCRIPT) ? { hooks: withGuardHook(recordUnder(held, 'hooks')) } : {};
}

export function withHarnessRegistered(settings: string, paths: string[]): string {
  const held = existing(settings);

  return `${JSON.stringify(
    {
      ...held,
      extraKnownMarketplaces: {
        ...recordUnder(held, 'extraKnownMarketplaces'),
        [MARKETPLACE]: { source: SOURCE },
      },
      enabledPlugins: { ...recordUnder(held, 'enabledPlugins'), [PLUGIN]: true },
      ...withGuard(held, paths),
    },
    undefined,
    2,
  )}\n`;
}

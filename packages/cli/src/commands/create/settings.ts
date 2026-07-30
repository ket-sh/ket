const MARKETPLACE = 'ket';

const PLUGIN = 'ket@ket';

const SOURCE = { source: 'github', repo: 'ket-sh/ket' };

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

export function withHarnessRegistered(settings: string): string {
  const held = existing(settings);

  return `${JSON.stringify(
    {
      ...held,
      extraKnownMarketplaces: {
        ...recordUnder(held, 'extraKnownMarketplaces'),
        [MARKETPLACE]: { source: SOURCE },
      },
      enabledPlugins: { ...recordUnder(held, 'enabledPlugins'), [PLUGIN]: true },
    },
    undefined,
    2,
  )}\n`;
}

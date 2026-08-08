export interface LoggedEvent {
  outcome: string | undefined;
  gate: string | undefined;
  about: string | undefined;
  item: string | undefined;
  reason: string | undefined;
  at: string | undefined;
  note: string | undefined;
  actor: string | undefined;
  adopted: string | undefined;
}

function wordAt(entry: object, field: string): string | undefined {
  const held: unknown = Reflect.get(entry, field);

  return typeof held === 'string' ? held : undefined;
}

function parsedOf(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function shapedEvent(parsed: object): LoggedEvent {
  return {
    outcome: wordAt(parsed, 'outcome'),
    gate: wordAt(parsed, 'gate'),
    about: wordAt(parsed, 'about'),
    item: wordAt(parsed, 'item'),
    reason: wordAt(parsed, 'reason'),
    at: wordAt(parsed, 'at'),
    note: wordAt(parsed, 'note'),
    actor: wordAt(parsed, 'actor'),
    adopted: wordAt(parsed, 'adopted'),
  };
}

function eventOf(line: string): LoggedEvent | undefined {
  const parsed = parsedOf(line);

  return parsed !== null && typeof parsed === 'object' ? shapedEvent(parsed) : undefined;
}

export function readEvents(log: string): LoggedEvent[] {
  return log
    .split('\n')
    .map((line) => eventOf(line))
    .filter((event): event is LoggedEvent => event !== undefined);
}

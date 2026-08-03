import { readFileSync } from 'node:fs';
import process from 'node:process';

const EDIT_TOOLS = new Set(['Edit', 'Write']);

const GENERATED_SUFFIX = '.gen.ts';

const EXACT_GENERATED_NAMES = new Set(['env.d.ts', 'bun.lock']);

const SECRET_NAME = '.env';

const LOCAL_ENV_OVERRIDE = /^\.env\.[^/]+\.local$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(record: Record<string, unknown>, field: string): string | undefined {
  const held = record[field];

  return typeof held === 'string' ? held : undefined;
}

function payloadFromStdin(): unknown {
  try {
    const parsed: unknown = JSON.parse(readFileSync(0, 'utf8'));

    return parsed;
  } catch {
    return undefined;
  }
}

function editedPath(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const toolName = stringField(payload, 'tool_name');

  if (toolName === undefined || !EDIT_TOOLS.has(toolName)) {
    return undefined;
  }

  const toolInput = payload['tool_input'];

  return isRecord(toolInput) ? stringField(toolInput, 'file_path') : undefined;
}

function nameOf(path: string): string {
  const segments = path.split('/');

  return segments[segments.length - 1] ?? path;
}

function isGenerated(name: string): boolean {
  return name.endsWith(GENERATED_SUFFIX) || EXACT_GENERATED_NAMES.has(name);
}

function isManagedSecret(name: string): boolean {
  return name === SECRET_NAME || LOCAL_ENV_OVERRIDE.test(name);
}

function reasonFor(path: string): string | undefined {
  const name = nameOf(path);

  if (isGenerated(name)) {
    return `${path} is generated. Edit the source and regenerate it, never by hand.`;
  }

  return isManagedSecret(name)
    ? `${path} holds a secret varlock manages. The person who owns it edits it, never an agent.`
    : undefined;
}

const path = editedPath(payloadFromStdin());
const reason = path === undefined ? undefined : reasonFor(path);

if (reason !== undefined) {
  console.error(reason);
  process.exit(2);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function heldRecordIn(source: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(source);

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

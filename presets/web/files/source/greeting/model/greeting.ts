const STRANGER = 'world';

export function greeting(who: string | undefined): string {
  const named = who?.trim() ?? '';

  return `hello ${named === '' ? STRANGER : named}`;
}

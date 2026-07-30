const EVERYONE = 'world';

export function greeting(who: string | undefined): string {
  return `hello ${who === undefined || who === '' ? EVERYONE : who}`;
}

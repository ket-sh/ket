export const escaped = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const jsonEscapedLess = String.fromCharCode(92) + 'u003c';
const jsonEscapedAmp = String.fromCharCode(92) + 'u0026';

export function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', jsonEscapedLess).replaceAll('&', jsonEscapedAmp);
}

export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

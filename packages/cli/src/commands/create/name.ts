import { isAbsolute, normalize } from 'node:path';

const PRINTABLE = /^[\x20-\x7E]*$/;

const CARRIABLE = /^[A-Za-z0-9._-]+$/;

const UNSAFE = 'A name is letters, digits, dots, underscores, and dashes.';

export function refuseProjectName(name: string): string | undefined {
  return CARRIABLE.test(name) ? undefined : UNSAFE;
}

export function refuseName(given: string): string | undefined {
  if (given.trim() === '') {
    return 'A name is required.';
  }

  if (!PRINTABLE.test(given)) {
    return 'The name carries a character a terminal cannot print.';
  }

  if (isAbsolute(given) || normalize(given).startsWith('..')) {
    return 'The name goes under the directory shown, not above it.';
  }

  return given
    .split('/')
    .map(refuseProjectName)
    .find((refusal) => refusal !== undefined);
}

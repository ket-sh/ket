import { byBytes } from './docs-stamp.ts';

const RECORD_DIRECTORIES = ['docs/adr/', 'docs/superpowers/'];

const ADR_DIRECTORY = 'docs/adr/';

export function governedDocPages(files: readonly string[]): string[] {
  return files
    .filter((file) => file.startsWith('docs/') && file.endsWith('.md'))
    .filter((file) => !RECORD_DIRECTORIES.some((directory) => file.startsWith(directory)))
    .sort(byBytes);
}

export function adrDocPages(files: readonly string[]): string[] {
  return files
    .filter((file) => file.startsWith(ADR_DIRECTORY) && file.endsWith('.md'))
    .sort(byBytes);
}

const RECORD_DIRECTORIES = ['docs/adr/', 'docs/superpowers/'];

export function governedDocPages(files: readonly string[]): string[] {
  return files
    .filter((file) => file.startsWith('docs/') && file.endsWith('.md'))
    .filter((file) => !RECORD_DIRECTORIES.some((directory) => file.startsWith(directory)))
    .sort((left, right) => (left < right ? -1 : 1));
}

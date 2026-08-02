const NAMELESS = 'your project';

export function welcomeTo(name: string | undefined): string {
  const named = name?.trim() ?? '';

  return `Welcome to ${named === '' ? NAMELESS : named}.`;
}

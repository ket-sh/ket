const HOME_MARKER = '~/';

export function pathInProject(target: string): string {
  return target.startsWith(HOME_MARKER) ? target.slice(HOME_MARKER.length) : target;
}

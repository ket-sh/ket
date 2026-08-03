const TOKEN_OPENS = '__PROJECT_';

const TOKEN_CLOSES = '__';

export interface ProjectNames {
  readonly [named: string]: string;
  readonly name: string;
  readonly key: string;
}

function tokenFor(named: string): string {
  return `${TOKEN_OPENS}${named.toUpperCase()}${TOKEN_CLOSES}`;
}

export function projectNames(name: string, key: string, owner: string | undefined): ProjectNames {
  return { name, key, ...(owner === undefined ? {} : { owner }) };
}

export function withProjectNames(contents: string, project: ProjectNames): string {
  return Object.entries(project).reduce(
    (written, [named, value]) => written.replaceAll(tokenFor(named), value),
    contents,
  );
}

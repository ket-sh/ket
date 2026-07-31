const PROJECT_NAME_TOKEN = '__PROJECT_NAME__';

const PROJECT_KEY_TOKEN = '__PROJECT_KEY__';

export interface ProjectNames {
  name: string;
  key: string;
}

export function withProjectNames(contents: string, project: ProjectNames): string {
  return contents
    .replaceAll(PROJECT_NAME_TOKEN, project.name)
    .replaceAll(PROJECT_KEY_TOKEN, project.key);
}

const PROJECT_NAME_TOKEN = '__PROJECT_NAME__';

export function withProjectName(contents: string, name: string): string {
  return contents.replaceAll(PROJECT_NAME_TOKEN, name);
}

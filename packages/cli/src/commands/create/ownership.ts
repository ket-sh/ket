import type { ScaffoldFile } from '../../shared/write-files.ts';

const CODE_OWNERS = '.github/CODEOWNERS';

export function ownedFiles(installed: ScaffoldFile[], owner: string | undefined): ScaffoldFile[] {
  return installed.filter((file) => file.path !== CODE_OWNERS || owner !== undefined);
}

export interface KetPart {
  name: string;
  says: string;
}

export const KET_PARTS: KetPart[] = [
  { name: 'create', says: 'Create a project under ket' },
  { name: 'update', says: 'Bring the files ket wrote back to what it ships now' },
  { name: 'watch', says: 'Watch the pipeline as it runs' },
  { name: 'map', says: 'Read the story map this project keeps' },
  { name: 'retro', says: 'Fold the event log into the week it covers' },
];

export function partSays(name: string): string {
  return KET_PARTS.find((part) => part.name === name)?.says ?? name;
}

export function runsWizard(interactive: boolean, asked: string | undefined): boolean {
  return interactive && asked === undefined;
}

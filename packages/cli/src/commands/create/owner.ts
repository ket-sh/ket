export const OWNER_BINARY = 'gh';

export const OWNER_ARGUMENTS = ['api', 'user', '--jq', '.login'];

export function ownerIn(said: string): string | undefined {
  const login = said.trim();

  return login === '' ? undefined : login;
}

export function ownerSaid(code: number | null, said: string): string | undefined {
  return code === 0 ? ownerIn(said) : undefined;
}

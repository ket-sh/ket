const KEY = /^[A-Z]{2,10}$/;

const ADVICE = 'Use two to ten capital letters';

export function refuseKey(given: string, suggested: string | undefined): string | undefined {
  const effective = given === '' ? (suggested ?? '') : given;

  return KEY.test(effective) ? undefined : ADVICE;
}

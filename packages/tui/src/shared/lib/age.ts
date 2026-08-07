export const AGE_TICK = 30_000;

const MINUTE = 60;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

export function ageOf(since: string, now: string): string {
  const elapsed = (Date.parse(now) - Date.parse(since)) / 1000;

  if (Number.isNaN(elapsed)) {
    return '';
  }

  const seconds = Math.max(0, Math.floor(elapsed));

  if (seconds < MINUTE) {
    return `${String(seconds)}s`;
  }

  if (seconds < HOUR) {
    return `${String(Math.floor(seconds / MINUTE))}m`;
  }

  return seconds < DAY
    ? `${String(Math.floor(seconds / HOUR))}h`
    : `${String(Math.floor(seconds / DAY))}d`;
}

export interface RetroWindow {
  from: number;
  to: number;
}

export type WindowChoice = { window: RetroWindow } | { refused: string };

const DAY = 86_400_000;

const WEEK = 7 * DAY;

const RETRO_DIRECTORY = 'docs/retro';

export function momentOf(text: string): number | undefined {
  const parsed = Date.parse(text);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function mondayIndexOf(at: number): number {
  return (new Date(at).getUTCDay() + 6) % 7;
}

function weekOpeningOf(at: number): number {
  const day = new Date(at);

  return (
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - mondayIndexOf(at) * DAY
  );
}

// The week a Thursday sits in is the week its year owns, which is what keeps a
// late December day in the next year's first week and an early January day in
// the last year's fifty-third.
function thursdayOf(at: number): number {
  return weekOpeningOf(at) + 3 * DAY;
}

function weekYearOf(at: number): number {
  return new Date(thursdayOf(at)).getUTCFullYear();
}

function weekNumberOf(at: number): number {
  const fourthOfJanuary = Date.UTC(weekYearOf(at), 0, 4);

  return Math.round((thursdayOf(at) - thursdayOf(fourthOfJanuary)) / WEEK) + 1;
}

export function weekLabelOf(window: RetroWindow): string {
  const week = String(weekNumberOf(window.to)).padStart(2, '0');

  return `${String(weekYearOf(window.to))}-W${week}`;
}

export function retroPathOf(window: RetroWindow): string {
  return `${RETRO_DIRECTORY}/${weekLabelOf(window)}.md`;
}

export function windowFrom(reportedAt: string, since: string | undefined): WindowChoice {
  const to = Date.parse(reportedAt);

  if (since === undefined) {
    return { window: { from: weekOpeningOf(to), to } };
  }

  const from = momentOf(since);

  return from === undefined
    ? { refused: `${since} is not a moment this report can read` }
    : { window: { from, to } };
}

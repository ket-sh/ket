export interface BacklogStanding {
  at: number | undefined;
  rows: number;
  filedLeft: number;
}

export interface ShelfStep {
  at: number | undefined;
  took: boolean;
}

const WITH_THE_FILED: ShelfStep = { at: undefined, took: false };

function clamp(value: number, high: number): number {
  return Math.min(Math.max(value, 0), high);
}

function entered(standing: BacklogStanding, delta: number): ShelfStep {
  return delta > 0 && standing.filedLeft === 0 ? { at: 0, took: true } : WITH_THE_FILED;
}

export function shelfStepped(standing: BacklogStanding, delta: number): ShelfStep {
  if (standing.rows === 0) {
    return WITH_THE_FILED;
  }

  if (standing.at === undefined) {
    return entered(standing, delta);
  }

  if (standing.at === 0 && delta < 0) {
    return { at: undefined, took: true };
  }

  return { at: clamp(standing.at + delta, standing.rows - 1), took: true };
}

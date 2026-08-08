import type { MapBandView, MapCardView } from '../../../shared/model';

export interface Seated {
  card: MapCardView;
  band: MapBandView;
}

export function seatsOf(bands: MapBandView[]): Seated[] {
  return bands.flatMap((band) => band.cards.map((card) => ({ card, band })));
}

export function walkedTo(seats: number, at: number, delta: number): number {
  return Math.min(Math.max(at + delta, 0), Math.max(0, seats - 1));
}

export function seatIndexOf(bands: MapBandView[], cardId: string): number | undefined {
  const found = seatsOf(bands).findIndex((seated) => seated.card.id === cardId);

  return found === -1 ? undefined : found;
}

export function detailOf(seated: Seated | undefined): string {
  if (seated === undefined) {
    return '';
  }

  return [seated.card.name, seated.card.user, seated.band.name]
    .filter((part) => part !== undefined)
    .join(' · ');
}

import type { MapBandView, MapCardView, MapRibView } from '../../../shared/model';

export interface MapColumn {
  id: string;
  name: string;
  activity: string;
}

export function columnsOf(spine: MapRibView[]): MapColumn[] {
  return spine.flatMap((rib) =>
    rib.steps.map((step) => ({ id: step.id, name: step.name, activity: rib.activity })),
  );
}

export function cardsUnder(band: MapBandView, step: string): MapCardView[] {
  return band.cards.filter((card) => card.step === step);
}

export interface MapCardView {
  id: string;
  name: string;
  step: string;
  user?: string;
}

export interface MapBandView {
  id: string | undefined;
  name: string;
  outcome: string | undefined;
  cards: MapCardView[];
}

export interface MapRibView {
  activity: string;
  steps: { id: string; name: string }[];
}

export interface StoryMapView {
  product: { name: string; idea: string };
  spine: MapRibView[];
  bands: MapBandView[];
}

export type MapReadingView = { absent: true } | { refusals: string[] } | { map: StoryMapView };

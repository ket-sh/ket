export const MAP_VERSION = 1;

export interface MapUser {
  id: string;
  name: string;
}

export interface MapRelease {
  id: string;
  name: string;
  outcome: string;
  metric: string;
}

export interface MapStory {
  id: string;
  name: string;
  user?: string;
  release?: string;
}

export interface MapStep {
  id: string;
  name: string;
  stories: MapStory[];
}

export interface MapActivity {
  id: string;
  name: string;
  steps: MapStep[];
}

export interface StoryMap {
  version: typeof MAP_VERSION;
  product: { name: string; idea: string };
  users: MapUser[];
  releases: MapRelease[];
  activities: MapActivity[];
}

export type MapReading = { absent: true } | { refusals: string[] } | { map: StoryMap };

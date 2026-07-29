export interface SliceSemantics {
  root: string;
  adapter: string;
  mutate: string[];
}

export interface AcceptanceSemantics {
  runner: string;
  drives: string;
}

export interface PresetSemantics {
  slice: SliceSemantics;
  acceptance: AcceptanceSemantics;
  substrate: string;
  gates: string[];
  testRuntime: string;
}

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

const SLICE_PLACEHOLDER = '{slice}';

const SLICE_NAME = /^[a-z][a-z0-9-]*$/;

export const CLI_SEMANTICS: PresetSemantics = {
  slice: {
    root: `src/commands/${SLICE_PLACEHOLDER}`,
    adapter: 'command.ts',
    mutate: ['**/*.ts', '!**/*.test.ts', '!command.ts', '!io/**'],
  },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  gates: [],
  testRuntime: 'vitest',
};

export function sliceDirectoryOf(semantics: PresetSemantics, slice: string): string {
  if (!SLICE_NAME.test(slice)) {
    throw new Error(`${slice} is not a slice name. Use lowercase letters, digits and hyphens`);
  }

  return semantics.slice.root.replace(SLICE_PLACEHOLDER, slice);
}

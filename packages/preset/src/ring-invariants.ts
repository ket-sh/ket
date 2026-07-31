import type { PresetSemantics, RingCheck, RingSemantics } from './semantics.ts';

const FILE_SCOPE = 'file';

const COVERING_SCOPE = 'covering';

const PROJECT_SCOPE = 'project';

const OUTSIDE_THE_PROJECT = '/';

const FORMAT_GATE = 'fmt';

function everyCheckOf(rings: RingSemantics): RingCheck[] {
  return [...rings.formats, ...rings.one, ...rings.two];
}

const ARGUMENT_SEPARATOR = ' ';

function toolOf(command: string): string {
  const arguments_ = command.indexOf(ARGUMENT_SEPARATOR);

  return arguments_ === -1 ? command : command.slice(0, arguments_);
}

function emptyRingInvariants(rings: RingSemantics): string[] {
  return [
    ...(rings.formats.length === 0
      ? ['the preset declares no formatter, so advice about formatting fixes nothing']
      : []),
    ...(rings.one.length === 0
      ? ['ring one declares no check, so a write is measured by nothing']
      : []),
    ...(rings.two.length === 0
      ? ['ring two declares no check, so a stage ends measured by nothing']
      : []),
  ];
}

function commandInvariants(rings: RingSemantics): string[] {
  return everyCheckOf(rings)
    .filter((check) => check.runs === '')
    .map(() => 'the preset declares a check that runs no command');
}

function localBinaryInvariants(rings: RingSemantics): string[] {
  return everyCheckOf(rings)
    .filter((check) => check.runs.startsWith(OUTSIDE_THE_PROJECT))
    .map((check) => `the check ${check.runs} reaches outside the project for its binary`);
}

function scopeInvariants(rings: RingSemantics): string[] {
  return [
    ...rings.formats
      .filter((check) => check.scope !== FILE_SCOPE)
      .map(
        (check) =>
          `the formatter ${check.runs} is scoped to ${check.scope} rather than to one file`,
      ),
    ...rings.one
      .filter((check) => check.scope === PROJECT_SCOPE)
      .map(
        (check) =>
          `the ring one check ${check.runs} sweeps the project, which a write cannot afford`,
      ),
    ...rings.two
      .filter((check) => check.scope !== PROJECT_SCOPE)
      .map(
        (check) =>
          `the ring two check ${check.runs} is scoped to ${check.scope} rather than to the project`,
      ),
  ];
}

function rewriteInvariants(rings: RingSemantics): string[] {
  const rewrites = new Set(rings.formats.map((check) => check.runs));

  return rings.one
    .filter((check) => rewrites.has(check.runs))
    .map((check) => `${check.runs} both rewrites a file and checks it`);
}

function runnerInvariants(semantics: PresetSemantics): string[] {
  return semantics.rings.one
    .filter(
      (check) => check.scope === COVERING_SCOPE && toolOf(check.runs) !== semantics.testRuntime,
    )
    .map((check) => `the covering check ${check.runs} does not run on ${semantics.testRuntime}`);
}

function formatterInvariants(semantics: PresetSemantics): string[] {
  const script = semantics.scripts[FORMAT_GATE];

  if (script === undefined) {
    return [`the preset writes no ${FORMAT_GATE} gate for its formatter to agree with`];
  }

  const gate = toolOf(script);

  return semantics.rings.formats
    .filter((check) => toolOf(check.runs) !== gate)
    .map(
      (check) => `the formatter ${check.runs} is not the tool the ${FORMAT_GATE} gate checks with`,
    );
}

export function ringInvariantsOf(semantics: PresetSemantics): string[] {
  return [
    ...emptyRingInvariants(semantics.rings),
    ...commandInvariants(semantics.rings),
    ...localBinaryInvariants(semantics.rings),
    ...scopeInvariants(semantics.rings),
    ...rewriteInvariants(semantics.rings),
    ...runnerInvariants(semantics),
    ...formatterInvariants(semantics),
  ];
}

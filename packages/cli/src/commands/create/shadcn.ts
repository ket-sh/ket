import type { PresetItem } from '@ket/preset';

import type { PresetName } from '../../shared/configuration.ts';
import type { ToolArgv } from '../../shared/project-tools.ts';

const SHADCN_CLI = 'shadcn@4.16.2';

export const TOOLCHAIN_ARGV: ToolArgv = ['bun', 'install'];

const EMITTED_CODE = /^[ab][0-9A-Za-z]{1,9}$/u;

const BUILDER = 'ui.shadcn.com/create';

const UNAPPLIED = 'The project is ready, but your shadcn preset did not apply:';

export type ChosenShadcnPreset = { code: string | undefined } | { refused: string };

export type ShadcnPresetApplied = { applied: string } | { refused: string } | { absent: true };

export function refuseShadcnPreset(given: string): string | undefined {
  return EMITTED_CODE.test(given)
    ? undefined
    : `${given} is not a shadcn preset code. Copy yours from ${BUILDER}`;
}

export function consumesShadcnPreset(item: PresetItem): boolean {
  return item.designSystem === 'shadcn';
}

export function shadcnPresetFrom(
  given: string | undefined,
  preset: PresetName,
  item: PresetItem | undefined,
): ChosenShadcnPreset {
  if (given === undefined) {
    return { code: undefined };
  }

  if (item === undefined || !consumesShadcnPreset(item)) {
    return { refused: `the ${preset} preset ships no shadcn for ${given} to restyle` };
  }

  const refusal = refuseShadcnPreset(given);

  return refusal === undefined ? { code: given } : { refused: refusal };
}

export function applyArgvFor(code: string): ToolArgv {
  return ['bunx', SHADCN_CLI, 'apply', '--preset', code, '--yes'];
}

export function appliesLaterWith(code: string): string {
  return `${TOOLCHAIN_ARGV.join(' ')} && ${applyArgvFor(code).join(' ')}`;
}

export function applyRefusalFor(code: string, said: string): string {
  return [
    `${code} did not apply: ${said}`,
    `Apply it in the project later with: ${appliesLaterWith(code)}`,
  ].join('\n');
}

export function shadcnPresetNote(outcome: ShadcnPresetApplied): string[] {
  return 'refused' in outcome ? [UNAPPLIED, ...outcome.refused.split('\n')] : [];
}

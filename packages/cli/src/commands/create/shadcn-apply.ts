import type { ShadcnPresetApplied } from './shadcn.ts';

import { toolRefusal } from '../../shared/project-tools.ts';
import { applyArgvFor, applyRefusalFor, TOOLCHAIN_ARGV } from './shadcn.ts';

const TOOLCHAIN_DEADLINE_MS = 600000;

const APPLY_DEADLINE_MS = 300000;

const APPLY_ENVIRONMENT: Record<string, string> = { DO_NOT_TRACK: '1' };

export async function applyShadcnPreset(
  root: string,
  code: string | undefined,
): Promise<ShadcnPresetApplied> {
  if (code === undefined) {
    return { absent: true };
  }

  const toolchainRefusal = await toolRefusal(
    TOOLCHAIN_ARGV,
    root,
    TOOLCHAIN_DEADLINE_MS,
    APPLY_ENVIRONMENT,
  );

  if (toolchainRefusal !== undefined) {
    return { refused: applyRefusalFor(code, toolchainRefusal) };
  }

  const applyRefusal = await toolRefusal(
    applyArgvFor(code),
    root,
    APPLY_DEADLINE_MS,
    APPLY_ENVIRONMENT,
  );

  return applyRefusal === undefined
    ? { applied: code }
    : { refused: applyRefusalFor(code, applyRefusal) };
}

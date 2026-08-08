import type { PressDeps } from './keys.ts';

import { narrowerOf } from './keys.ts';

export function overlayHeld(deps: PressDeps): boolean {
  return (
    deps.palette.at !== undefined ||
    deps.picker.at !== undefined ||
    deps.help.on ||
    narrowerOf(deps).typing
  );
}

function shutChooser(deps: PressDeps): boolean {
  if (deps.palette.at !== undefined) {
    deps.palette.close();

    return true;
  }

  if (deps.picker.at !== undefined) {
    deps.picker.close();

    return true;
  }

  return false;
}

export function overlayShut(deps: PressDeps): boolean {
  if (shutChooser(deps)) {
    return true;
  }

  if (deps.help.on) {
    deps.help.close();

    return true;
  }

  const narrower = narrowerOf(deps);

  if (narrower.typing) {
    narrower.clear();

    return true;
  }

  return false;
}

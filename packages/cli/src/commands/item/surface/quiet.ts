export interface QuietGate {
  hush: () => void;
  loud: () => boolean;
}

// One save can straggle several filesystem events past the watcher's debounce,
// so the gate holds quiet for a grace window rather than swallowing one event.
const GRACE_MS = 500;

export function quietGate(now: () => number = Date.now): QuietGate {
  let hushedUntil = 0;

  return {
    hush: () => {
      hushedUntil = now() + GRACE_MS;
    },
    loud: () => now() >= hushedUntil,
  };
}

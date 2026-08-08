export interface GateEvent {
  gate: 'write' | 'probe' | 'shell' | 'test-first' | 'transition' | 'citations' | 'review' | 'turn';
  outcome: 'allowed' | 'refused' | 'skipped';
  about: string;
  item?: string;
  reason?: string;
  at?: string;
}

export interface DeclaredGateEvent {
  gate: string;
  outcome: 'allowed';
  about: string;
  at?: string;
}

export interface NoteEvent {
  note: string;
  actor: string;
  item: string;
  at?: string;
}

export interface AdoptionEvent {
  adopted: string;
  reason?: string;
  item: string;
  at?: string;
}

export function renderEvent(
  event: AdoptionEvent | DeclaredGateEvent | GateEvent | NoteEvent,
): string {
  return `${JSON.stringify(event)}\n`;
}

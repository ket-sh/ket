export interface GateEvent {
  gate: 'write' | 'probe' | 'shell' | 'test-first' | 'transition' | 'citations' | 'review' | 'turn';
  outcome: 'allowed' | 'refused' | 'skipped';
  about: string;
  item?: string;
  reason?: string;
}

export function renderEvent(event: GateEvent): string {
  return `${JSON.stringify(event)}\n`;
}

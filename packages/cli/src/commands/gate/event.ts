export interface GateEvent {
  gate: 'write' | 'probe' | 'shell' | 'test-first' | 'transition';
  outcome: 'allowed' | 'refused';
  about: string;
  item?: string;
  reason?: string;
}

export function renderEvent(event: GateEvent): string {
  return `${JSON.stringify(event)}\n`;
}

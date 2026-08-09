export function readShiftOf(cur: number, held: number, room: number): number {
  return Math.floor(Math.min(Math.max(cur - room / 2, 0), Math.max(0, held - room)));
}

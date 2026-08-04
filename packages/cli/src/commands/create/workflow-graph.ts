import { painted, TORII_SHADE } from './banner.ts';

export const WORKFLOW_GRAPH = `                      ┌─────────────┐
                  ┌──▶│     adr     │───┐
                  │   └─────────────┘   │
 ┌──────────────┐ │   ┌─────────────┐   │   ╔═══ ⛩ ═══════╗
 │ /ket:feature │─┼──▶│  solution   │───┼──▶║   approve   ║
 │  file + size │ │   └─────────────┘   │   ║    (you)    ║
 └──────────────┘ │   ┌─────────────┐   │   ╚══════╦══════╝
                  ├──▶│   gherkin   │───┤          │
                  │   └─────────────┘   │          ▼
                  │   ┌─────────────┐   │   ┌─────────────┐
                  └──▶│  ui design  │───┘   │    build    │
                      └─────────────┘       │ tdd + gates │
                                            └──────┬──────┘
  ╔═══ ⛩ ═══════╗    ┌─────────────┐               │
  ║     ship    ║◀───│   review    │◀──────────────┘
  ║    (you)    ║    │  two seats  │
  ╚═════════════╝    └─────────────┘`;

const HUMAN_GATE = /[╔╚║][^╗╝║]*[╗╝║]/gu;

export function graphLines(drawing: string): string[] {
  return drawing.split('\n');
}

export function paintedGraphLines(drawing: string): string[] {
  return graphLines(drawing).map((line) =>
    line.replaceAll(HUMAN_GATE, (gate) => painted(gate, TORII_SHADE)),
  );
}

interface SketchNode {
  id: string;
  label: string;
}

interface SketchEdge {
  from: string;
  to: string;
  label: string | undefined;
}

export interface Sketch {
  nodes: SketchNode[];
  edges: SketchEdge[];
}

const RESERVED = new Set([
  'direction',
  'shape',
  'style',
  'classes',
  'vars',
  'icon',
  'label',
  'near',
  'width',
  'height',
]);

function splitOnce(line: string, mark: string): [string, string | undefined] {
  const at = line.indexOf(mark);

  return at < 0 ? [line, undefined] : [line.slice(0, at), line.slice(at + mark.length)];
}

function readable(line: string): boolean {
  return line !== '' && !line.startsWith('#') && line !== '}' && !line.endsWith('{');
}

function deeper(depth: number, line: string): number {
  if (line.endsWith('{')) {
    return depth + 1;
  }

  return line === '}' ? Math.max(0, depth - 1) : depth;
}

function declared(nodes: Map<string, string>, id: string): void {
  if (!nodes.has(id)) {
    nodes.set(id, id);
  }
}

function readEdge(nodes: Map<string, string>, edges: SketchEdge[], line: string): void {
  const [left, rest] = splitOnce(line, '->');
  const [to, label] = splitOnce(rest ?? '', ':');
  const from = left.trim();
  const target = to.trim();

  if (from === '' || target === '') {
    return;
  }

  declared(nodes, from);
  declared(nodes, target);
  edges.push({ from, to: target, label: label?.trim() });
}

function labelOf(id: string, value: string | undefined): string {
  const label = value?.trim() ?? '';

  return label === '' ? id : label;
}

function readNode(nodes: Map<string, string>, line: string): void {
  const [key, value] = splitOnce(line, ':');
  const id = key.trim();

  if (id === '' || RESERVED.has(id)) {
    return;
  }

  nodes.set(id, labelOf(id, value));
}

function readLine(nodes: Map<string, string>, edges: SketchEdge[], line: string): void {
  if (line.includes('->')) {
    readEdge(nodes, edges, line);

    return;
  }

  if (line.includes(':')) {
    readNode(nodes, line);
  }
}

function readRow(
  held: { depth: number },
  nodes: Map<string, string>,
  edges: SketchEdge[],
  raw: string,
): void {
  const line = raw.trim();
  const next = deeper(held.depth, line);

  if (held.depth === 0 && next === 0 && readable(line)) {
    readLine(nodes, edges, line);
  }

  held.depth = next;
}

export function sketchOf(source: string): Sketch {
  const nodes = new Map<string, string>();
  const edges: SketchEdge[] = [];
  const held = { depth: 0 };

  for (const raw of source.split('\n')) {
    readRow(held, nodes, edges, raw);
  }

  return {
    nodes: [...nodes.entries()].map(([id, label]) => ({ id, label })),
    edges,
  };
}

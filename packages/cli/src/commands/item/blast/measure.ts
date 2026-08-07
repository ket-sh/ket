export interface BlastGraph {
  modules: string[];
  edges: number;
}

export interface BlastMeasure {
  base: string;
  measuredAt: string;
  collapse: number;
  budget: number;
  uncollapsedNodes: number;
  uncollapsedEdges: number;
}

interface MeasureChoice {
  base: string;
  measuredAt: string;
  budget: number;
}

interface SeenModule {
  source: string;
  edges: number;
}

function moduleOf(entry: unknown): SeenModule | undefined {
  if (entry === null || typeof entry !== 'object') {
    return undefined;
  }

  const source: unknown = Reflect.get(entry, 'source');

  if (typeof source !== 'string') {
    return undefined;
  }

  const dependencies: unknown = Reflect.get(entry, 'dependencies');

  return { source, edges: Array.isArray(dependencies) ? dependencies.length : 0 };
}

function parsedOf(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return undefined;
  }
}

function seenAmong(entries: unknown[]): SeenModule[] | undefined {
  const seen: SeenModule[] = [];

  for (const entry of entries) {
    const found = moduleOf(entry);

    if (found === undefined) {
      return undefined;
    }

    seen.push(found);
  }

  return seen;
}

export function graphOf(source: string): BlastGraph | undefined {
  const parsed = parsedOf(source);

  if (parsed === null || typeof parsed !== 'object') {
    return undefined;
  }

  const entries: unknown = Reflect.get(parsed, 'modules');
  const seen = Array.isArray(entries) ? seenAmong(entries) : undefined;

  if (seen === undefined) {
    return undefined;
  }

  return {
    modules: seen.map((held) => held.source),
    edges: seen.reduce((sum, held) => sum + held.edges, 0),
  };
}

function distinctAt(segments: string[][], depth: number): number {
  return new Set(segments.map((parts) => parts.slice(0, depth).join('/'))).size;
}

export function collapseDepth(paths: string[], budget: number): number | undefined {
  if (new Set(paths).size <= budget) {
    return undefined;
  }

  const segments = paths.map((path) => path.split('/'));
  let depth = Math.max(...segments.map((parts) => parts.length));

  while (depth > 1 && distinctAt(segments, depth) > budget) {
    depth -= 1;
  }

  return depth;
}

export function measureOf(graph: BlastGraph, choice: MeasureChoice): BlastMeasure {
  return {
    base: choice.base,
    measuredAt: choice.measuredAt,
    collapse: collapseDepth(graph.modules, choice.budget) ?? 0,
    budget: choice.budget,
    uncollapsedNodes: graph.modules.length,
    uncollapsedEdges: graph.edges,
  };
}

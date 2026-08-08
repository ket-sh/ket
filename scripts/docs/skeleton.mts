import { slugify } from '../../packages/cli/src/shared/docs-architecture.ts';

export interface GraphDependency {
  resolved: string;
}

export interface GraphModule {
  source: string;
  dependencies: GraphDependency[];
}

export interface DependencyGraph {
  modules: GraphModule[];
}

const WORKSPACE_MODULE = /^(?:packages|presets)\/[^/]+\/src\//u;

function isWorkspaceModule(path: string): boolean {
  return WORKSPACE_MODULE.test(path) && !path.includes('.test.');
}

function nodeOf(path: string): string {
  const [scope = '', name = '', ...rest] = path.split('/');
  const directories = rest.slice(1, -1);
  const component = directories.length === 0 ? 'root' : directories.slice(0, 2).join('/');

  return `${scope}/${name} ${component}`;
}

function containerOf(node: string): string {
  const [container = ''] = node.split(' ');

  return container;
}

function workspaceEdges(module: GraphModule): string[] {
  const from = nodeOf(module.source);
  const targets = module.dependencies
    .map((dependency) => dependency.resolved)
    .filter(isWorkspaceModule)
    .map(nodeOf)
    .filter((to) => to !== from);

  return [...new Set(targets)];
}

function foldEdges(graph: DependencyGraph): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  const workspaceModules = graph.modules.filter((module) => isWorkspaceModule(module.source));

  for (const module of workspaceModules) {
    const from = nodeOf(module.source);
    const known = edges.get(from) ?? new Set<string>();

    for (const to of workspaceEdges(module)) {
      known.add(to);
    }

    edges.set(from, known);
  }

  return edges;
}

function byText(left: string, right: string): number {
  return left < right ? -1 : 1;
}

function renderEdges(targets: Set<string>): string {
  if (targets.size === 0) {
    return 'Depends on nothing inside the workspace.';
  }

  const links = [...targets]
    .sort(byText)
    .map((target) => `- [${target}](#${slugify(target)})`)
    .join('\n');

  return `Depends on:\n\n${links}`;
}

function renderContainer(container: string, edges: Map<string, Set<string>>): string {
  const components = [...edges.keys()]
    .filter((node) => containerOf(node) === container)
    .sort(byText);
  const sections = components.map(
    (node) => `### ${node}\n\n${renderEdges(edges.get(node) ?? new Set<string>())}`,
  );

  return [`## ${container}`, ...sections].join('\n\n');
}

const SKELETON_PREAMBLE = [
  '---',
  'category: reference',
  '---',
  '',
  '# Architecture skeleton',
  '',
  '`bun run docs:architecture` writes this page from the dependency graph `lint:boundaries` already reads. Never edit it by hand: run the command and commit the result.',
].join('\n');

export function renderSkeleton(graph: DependencyGraph): string {
  const edges = foldEdges(graph);
  const containers = [...new Set([...edges.keys()].map(containerOf))].sort(byText);
  const sections = containers.map((container) => renderContainer(container, edges));

  return [SKELETON_PREAMBLE, ...sections].join('\n\n') + '\n';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function dependencyOf(value: unknown): GraphDependency | undefined {
  if (!isRecord(value) || typeof value['resolved'] !== 'string') {
    return undefined;
  }

  return { resolved: value['resolved'] };
}

function moduleOf(value: unknown): GraphModule | undefined {
  if (!isRecord(value) || typeof value['source'] !== 'string') {
    return undefined;
  }

  const dependencies = Array.isArray(value['dependencies']) ? value['dependencies'] : [];

  return {
    source: value['source'],
    dependencies: dependencies
      .map(dependencyOf)
      .filter((dependency): dependency is GraphDependency => dependency !== undefined),
  };
}

export function parseDependencyGraph(json: string): DependencyGraph {
  const parsed: unknown = JSON.parse(json);

  if (!isRecord(parsed) || !Array.isArray(parsed['modules'])) {
    throw new Error('dependency graph JSON carries no modules list');
  }

  return {
    modules: parsed['modules']
      .map(moduleOf)
      .filter((module): module is GraphModule => module !== undefined),
  };
}

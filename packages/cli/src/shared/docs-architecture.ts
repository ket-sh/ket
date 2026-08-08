export interface ArchitectureNode {
  anchor: string;
  label: string;
  edges: string[];
}

export interface IntentPointer {
  anchor: string;
  section: string;
}

const HEADING = /^#{1,6} (?<text>.+)/u;

const COMPONENT = /^### (?<label>.+)/u;

const EDGE = /^- \[(?<label>[^\]]+)\]\(#[^)]+\)$/u;

const SKELETON_LINK = /\]\((?:\.\/)?skeleton\.md#([^)]+)\)/gu;

export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replaceAll(/[^a-z0-9 -]/gu, '')
    .replaceAll(' ', '-');
}

function headingOn(line: string): string | undefined {
  return HEADING.exec(line)?.groups?.['text'];
}

function componentOn(line: string): string | undefined {
  return COMPONENT.exec(line)?.groups?.['label'];
}

function edgeOn(line: string): string | undefined {
  return EDGE.exec(line)?.groups?.['label'];
}

export function headingAnchors(markdown: string): string[] {
  return markdown
    .split('\n')
    .map(headingOn)
    .filter((text): text is string => text !== undefined)
    .map(slugify);
}

export function architectureNodesOf(skeleton: string): ArchitectureNode[] {
  const nodes: ArchitectureNode[] = [];

  for (const line of skeleton.split('\n')) {
    const label = componentOn(line);
    const edge = edgeOn(line);

    if (label !== undefined) {
      nodes.push({ anchor: slugify(label), label, edges: [] });
    } else if (edge !== undefined) {
      nodes.at(-1)?.edges.push(edge);
    }
  }

  return nodes;
}

function anchorsOn(line: string): string[] {
  return line.split(SKELETON_LINK).flatMap((part, at) => (at % 2 === 1 ? [part] : []));
}

export function intentPointersOf(intent: string): IntentPointer[] {
  const pointers: IntentPointer[] = [];
  let section = 'intent';

  for (const line of intent.split('\n')) {
    section = headingOn(line) ?? section;

    for (const anchor of anchorsOn(line)) {
      pointers.push({ anchor, section });
    }
  }

  return pointers;
}

export function missingAnchors(intent: string, skeleton: string): string[] {
  const alive = new Set(headingAnchors(skeleton));
  const referenced = intentPointersOf(intent).map((pointer) => pointer.anchor);

  return [...new Set(referenced)].filter((anchor) => !alive.has(anchor));
}

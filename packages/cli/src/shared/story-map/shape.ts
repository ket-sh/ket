import type { MapActivity, MapRelease, MapStep, MapStory, MapUser, StoryMap } from './story-map.ts';

import { MAP_VERSION } from './story-map.ts';

export type Shaped<Node> = { node: Node } | { refusals: string[] };

interface Branch<Child> {
  id: string;
  name: string;
  children: Child[];
}

const NAMED_KEYS = ['id', 'name'];

const RELEASE_KEYS = ['id', 'name', 'outcome', 'metric'];

const PRODUCT_KEYS = ['name', 'idea'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWord(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function recordOf(held: unknown): Record<string, unknown> {
  return isRecord(held) ? held : {};
}

function entriesOf(record: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const held = record[key];

  return Array.isArray(held) ? held.map(recordOf) : [];
}

function refusalsIn<Node>(shaped: Shaped<Node>): string[] {
  return 'refusals' in shaped ? shaped.refusals : [];
}

function collect<Node>(shapes: Shaped<Node>[]): Shaped<Node[]> {
  const nodes: Node[] = [];
  const refusals: string[] = [];

  for (const shaped of shapes) {
    if ('node' in shaped) {
      nodes.push(shaped.node);
    } else {
      refusals.push(...shaped.refusals);
    }
  }

  return refusals.length > 0 ? { refusals } : { node: nodes };
}

function refusalsOfMissing(
  record: Record<string, unknown>,
  keys: string[],
  kind: string,
): string[] {
  const id = record['id'];
  const where = isWord(id) ? `the ${kind} ${id}` : `a ${kind}`;

  return keys.filter((key) => !isWord(record[key])).map((key) => `${where} carries no ${key}`);
}

function userFrom(record: Record<string, unknown>): Shaped<MapUser> {
  const { id, name } = record;

  if (isWord(id) && isWord(name)) {
    return { node: { id, name } };
  }

  return { refusals: refusalsOfMissing(record, NAMED_KEYS, 'user') };
}

function releaseFrom(record: Record<string, unknown>): Shaped<MapRelease> {
  const { id, name, outcome, metric } = record;

  if (isWord(id) && isWord(name) && isWord(outcome) && isWord(metric)) {
    return { node: { id, name, outcome, metric } };
  }

  return { refusals: refusalsOfMissing(record, RELEASE_KEYS, 'release') };
}

function pointedAt(record: Record<string, unknown>): Pick<MapStory, 'release' | 'user'> {
  const { user, release } = record;

  return {
    ...(isWord(user) ? { user } : {}),
    ...(isWord(release) ? { release } : {}),
  };
}

function storyFrom(record: Record<string, unknown>): Shaped<MapStory> {
  const { id, name } = record;

  if (isWord(id) && isWord(name)) {
    return { node: { id, name, ...pointedAt(record) } };
  }

  return { refusals: refusalsOfMissing(record, NAMED_KEYS, 'story') };
}

function branchFrom<Child>(
  record: Record<string, unknown>,
  kind: string,
  key: string,
  childFrom: (child: Record<string, unknown>) => Shaped<Child>,
): Shaped<Branch<Child>> {
  const children = collect(entriesOf(record, key).map(childFrom));
  const { id, name } = record;

  if (isWord(id) && isWord(name) && 'node' in children) {
    return { node: { id, name, children: children.node } };
  }

  return { refusals: [...refusalsOfMissing(record, NAMED_KEYS, kind), ...refusalsIn(children)] };
}

function stepFrom(record: Record<string, unknown>): Shaped<MapStep> {
  const branch = branchFrom(record, 'step', 'stories', storyFrom);

  if ('refusals' in branch) {
    return branch;
  }

  return { node: { id: branch.node.id, name: branch.node.name, stories: branch.node.children } };
}

function activityFrom(record: Record<string, unknown>): Shaped<MapActivity> {
  const branch = branchFrom(record, 'activity', 'steps', stepFrom);

  if ('refusals' in branch) {
    return branch;
  }

  return { node: { id: branch.node.id, name: branch.node.name, steps: branch.node.children } };
}

function productFrom(held: unknown): Shaped<StoryMap['product']> {
  const product = recordOf(held);
  const { name, idea } = product;

  if (isWord(name) && isWord(idea)) {
    return { node: { name, idea } };
  }

  return {
    refusals: PRODUCT_KEYS.filter((key) => !isWord(product[key])).map(
      (key) => `the map carries no product ${key}`,
    ),
  };
}

function activitiesFrom(held: Record<string, unknown>): Shaped<MapActivity[]> {
  if (!Array.isArray(held['activities'])) {
    return { refusals: ['the map carries no activities'] };
  }

  return collect(entriesOf(held, 'activities').map(activityFrom));
}

function refusalsOfVersion(held: Record<string, unknown>): string[] {
  return held['version'] === MAP_VERSION ? [] : [`the map is not version ${String(MAP_VERSION)}`];
}

function shapedMapOf(held: Record<string, unknown>): Shaped<StoryMap> {
  const product = productFrom(held['product']);
  const users = collect(entriesOf(held, 'users').map(userFrom));
  const releases = collect(entriesOf(held, 'releases').map(releaseFrom));
  const activities = activitiesFrom(held);

  if ('node' in product && 'node' in users && 'node' in releases && 'node' in activities) {
    return {
      node: {
        version: MAP_VERSION,
        product: product.node,
        users: users.node,
        releases: releases.node,
        activities: activities.node,
      },
    };
  }

  return {
    refusals: [
      ...refusalsIn(product),
      ...refusalsIn(users),
      ...refusalsIn(releases),
      ...refusalsIn(activities),
    ],
  };
}

export function mapFrom(held: unknown): Shaped<StoryMap> {
  if (!isRecord(held)) {
    return { refusals: ['the map is not a mapping of keys'] };
  }

  const shaped = shapedMapOf(held);
  const refusals = [...refusalsOfVersion(held), ...refusalsIn(shaped)];

  if (refusals.length > 0) {
    return { refusals };
  }

  return shaped;
}

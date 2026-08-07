import { describe, expect, it } from 'vitest';

import { sketchOf } from './sketch.ts';

describe('the nodes a sketch declares', () => {
  it('reads a name and its label', () => {
    expect(sketchOf('login: the screen\nlock: the keeper\n').nodes).toStrictEqual([
      { id: 'login', label: 'the screen' },
      { id: 'lock', label: 'the keeper' },
    ]);
  });

  it('reads past comments, blocks, and the keys d2 reserves', () => {
    const source = [
      '# a comment',
      'direction: right',
      'style: {',
      '  fill: red',
      '}',
      'login: the screen',
    ].join('\n');

    expect(sketchOf(source).nodes).toStrictEqual([{ id: 'login', label: 'the screen' }]);
  });
});

describe('the edges a sketch draws', () => {
  it('joins two names with a labeled arrow', () => {
    const sketch = sketchOf('a: one\nb: two\na -> b: crosses\n');

    expect(sketch.edges).toStrictEqual([{ from: 'a', to: 'b', label: 'crosses' }]);
  });

  it('joins two names without a label', () => {
    expect(sketchOf('a: one\nb: two\na -> b\n').edges).toStrictEqual([
      { from: 'a', to: 'b', label: undefined },
    ]);
  });

  it('declares an endpoint the prose never named, labeled by its id', () => {
    const sketch = sketchOf('a -> ghost\n');

    expect(sketch.nodes).toContainEqual({ id: 'a', label: 'a' });
    expect(sketch.nodes).toContainEqual({ id: 'ghost', label: 'ghost' });
  });
});

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

  it('keeps a comment with a colon out of the nodes', () => {
    expect(sketchOf('# note: not a node\nreal: kept\n').nodes).toStrictEqual([
      { id: 'real', label: 'kept' },
    ]);
  });

  it('skips every key d2 reserves, not just one', () => {
    const source = [
      'direction: right',
      'shape: rectangle',
      'style: red',
      'classes: base',
      'vars: none',
      'icon: mark',
      'label: worn',
      'near: top',
      'width: wide',
      'height: tall',
      'real: kept',
    ].join('\n');

    expect(sketchOf(source).nodes).toStrictEqual([{ id: 'real', label: 'kept' }]);
  });
});

describe('the names a sketch tidies or refuses', () => {
  it('falls back to the id where the label is empty', () => {
    expect(sketchOf('a:\n').nodes).toStrictEqual([{ id: 'a', label: 'a' }]);
  });

  it('trims the name it reads', () => {
    expect(sketchOf('padded : The label\n').nodes).toStrictEqual([
      { id: 'padded', label: 'The label' },
    ]);
  });

  it('drops a stray colon with no name before it', () => {
    expect(sketchOf(': stray\n').nodes).toStrictEqual([]);
  });

  it('reads nothing from a bare word', () => {
    expect(sketchOf('plainword\n').nodes).toStrictEqual([]);
  });
});

describe('the blocks a sketch skips over', () => {
  it('keeps everything inside nested blocks hidden until the outermost closes', () => {
    const source = [
      'a: outer',
      'wrap: {',
      '  inner: {',
      '  }',
      '  leak: hidden',
      '}',
      'after: shown',
    ].join('\n');

    expect(sketchOf(source).nodes).toStrictEqual([
      { id: 'a', label: 'outer' },
      { id: 'after', label: 'shown' },
    ]);
  });

  it('hides every row of a block, not just the first', () => {
    const source = ['wrap: {', '  one: hidden', '  two: hidden', '}', 'after: shown'].join('\n');

    expect(sketchOf(source).nodes).toStrictEqual([{ id: 'after', label: 'shown' }]);
  });

  it('minds trailing spaces around the braces', () => {
    const source = ['wrap: {   ', '  leak: hidden', '}   ', 'after: shown'].join('\n');

    expect(sketchOf(source).nodes).toStrictEqual([{ id: 'after', label: 'shown' }]);
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

  it('drops an arrow missing either end', () => {
    const gone = sketchOf('-> b\na -> \n');

    expect(gone.nodes).toStrictEqual([]);
    expect(gone.edges).toStrictEqual([]);
  });

  it('drops an arrow with a label but no source, never reading it as a name', () => {
    expect(sketchOf('-> ghost: haunt\n').nodes).toStrictEqual([]);
  });
});

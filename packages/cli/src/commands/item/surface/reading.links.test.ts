import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

const linked = (markdown: string): string => readingLayout(`# The gate surfaces\n\n${markdown}\n`);

describe('the addresses the reading layout keeps live', () => {
  it('keeps a mail address a reader can write to', () => {
    expect(linked('[write in](mailto:crew@ket.sh)')).toContain(
      '<a href="mailto:crew@ket.sh">write in</a>',
    );
  });

  it('keeps a relative address beside the artifact', () => {
    expect(linked('[the notes](./notes.md)')).toContain('<a href="./notes.md">the notes</a>');
  });

  it('keeps a dot-rooted address as relative, colon and all', () => {
    expect(linked('[the draft](./notes:draft.md)')).toContain(
      '<a href="./notes:draft.md">the draft</a>',
    );
  });

  it('keeps a web address however its scheme is capitalized', () => {
    expect(linked('[the docs](HTTPS://ket.sh/docs)')).toContain(
      '<a href="HTTPS://ket.sh/docs">the docs</a>',
    );
  });

  it('keeps a plain web address without encryption', () => {
    expect(linked('[the mirror](http://ket.sh)')).toContain(
      '<a href="http://ket.sh">the mirror</a>',
    );
  });

  it('keeps an image whose source is a plain web address', () => {
    expect(linked('![the mark](https://ket.sh/mark.png)')).toContain(
      '<img src="https://ket.sh/mark.png" alt="the mark">',
    );
  });
});

describe('the addresses the reading layout refuses', () => {
  it('drops a code scheme however loudly it shouts', () => {
    const rendered = linked('[click me](JAVASCRIPT:alert(1))');

    expect(rendered).not.toContain('JAVASCRIPT:');
    expect(rendered).toContain('<p>click me</p>');
  });

  it('reads a scheme through its full character set before refusing it', () => {
    const rendered = linked('[open the app](web+ket.app-x:payload)');

    expect(rendered).not.toContain('web+ket.app-x:');
    expect(rendered).toContain('<p>open the app</p>');
  });

  it('reads a single letter scheme as a scheme all the same', () => {
    const rendered = linked('[the probe](x:payload)');

    expect(rendered).not.toContain('x:payload');
    expect(rendered).toContain('<p>the probe</p>');
  });

  it('drops a code scheme hiding behind leading space', () => {
    const rendered = linked('[click me](< javascript:alert(1)>)');

    expect(rendered).not.toContain('javascript:');
    expect(rendered).toContain('<p>click me</p>');
  });
});

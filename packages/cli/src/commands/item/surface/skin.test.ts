import { describe, expect, it } from 'vitest';

import { schemeScoped } from './skin.ts';

describe('the dark rules the skin moves under the scheme root', () => {
  it('moves every dark rule under the scheme root and keeps the rest', () => {
    const css = '.keep{a:1}@media (prefers-color-scheme: dark){.one{b:2}.two{c:3}}.after{d:4}';

    expect(schemeScoped(css)).toBe(
      ".keep{a:1} :root[data-scheme='dark'] .one {b:2} :root[data-scheme='dark'] .two {c:3}.after{d:4}",
    );
  });

  it('walks nested braces without ending the block early', () => {
    const css = '@media (prefers-color-scheme: dark){@supports (x:y){.deep{e:5}}}.tail{f:6}';

    expect(schemeScoped(css)).toContain('.deep{e:5}');
    expect(schemeScoped(css)).toContain('.tail{f:6}');
    expect(schemeScoped(css)).not.toContain('@media (prefers-color-scheme: dark)');
    expect(schemeScoped(css)).not.toContain(":root[data-scheme='dark'] .tail");
  });

  it('reads the media query however its spaces fall', () => {
    const tight = '@media(prefers-color-scheme:dark){.a{g:7}}';
    const wide = '@media  (prefers-color-scheme:   dark)  {.a{g:7}}';

    expect(schemeScoped(tight)).toContain(":root[data-scheme='dark'] .a {g:7}");
    expect(schemeScoped(wide)).toContain(":root[data-scheme='dark'] .a {g:7}");
  });

  it('trims the selectors it moves', () => {
    const css = '@media (prefers-color-scheme: dark){  .padded  {h:8}}';

    expect(schemeScoped(css)).toContain(":root[data-scheme='dark'] .padded {h:8}");
  });

  it('leaves a whitespace-only selector segment whole', () => {
    const css = '@media (prefers-color-scheme: dark){.a{i:9} \n {j:10}}';

    expect(schemeScoped(css)).toContain(":root[data-scheme='dark'] .a {i:9} \n {j:10}");
  });

  it('hands back untouched css when no dark block exists', () => {
    const css = '.plain{k:11}';

    expect(schemeScoped(css)).toBe(css);
  });

  it('stops at the end of an unbalanced dark block', () => {
    const css = '@media (prefers-color-scheme: dark){.a{y:1}';

    expect(schemeScoped(css)).toBe(" :root[data-scheme='dark'] .a {y:1");
  });
});

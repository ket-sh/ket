const DARK_MEDIA = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/;

function blockEnd(css: string, start: number): number {
  let depth = 1;
  let index = start;

  while (index < css.length && depth > 0) {
    depth += css[index] === '{' ? 1 : css[index] === '}' ? -1 : 0;
    index += 1;
  }

  return index;
}

export function schemeScoped(css: string): string {
  const opener = DARK_MEDIA.exec(css);

  if (opener === null) {
    return css;
  }

  const start = opener.index + opener[0].length;
  const index = blockEnd(css, start);

  const forced = css
    .slice(start, index - 1)
    .replaceAll(/(^|\})\s*([^{}]+)\{/g, (whole, closer: string, selector: string) =>
      selector.trim() === '' ? whole : `${closer} :root[data-scheme='dark'] ${selector.trim()} {`,
    );

  return `${css.slice(0, opener.index)}${forced}${css.slice(index)}`;
}

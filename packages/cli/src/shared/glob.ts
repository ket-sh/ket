const CROSSES_SEGMENTS = '**';

const WITHIN_SEGMENT = '*';

function matchesSegment(part: string, segment: string): boolean {
  const star = part.indexOf(WITHIN_SEGMENT);

  if (star === -1) {
    return part === segment;
  }

  const head = part.slice(0, star);
  const tail = part.slice(star + WITHIN_SEGMENT.length);

  return (
    segment.length >= head.length + tail.length &&
    segment.startsWith(head) &&
    segment.endsWith(tail)
  );
}

function crosses(pattern: string[], path: string[]): boolean {
  return walks(pattern, path) || (path.length > 0 && crosses(pattern, path.slice(1)));
}

function walks(pattern: string[], path: string[]): boolean {
  const [part, ...beyond] = pattern;

  if (part === undefined) {
    return path.length === 0;
  }

  if (part === CROSSES_SEGMENTS) {
    return crosses(beyond, path);
  }

  const [segment] = path;

  return segment !== undefined && matchesSegment(part, segment) && walks(beyond, path.slice(1));
}

export function matchesGlob(pattern: string, path: string): boolean {
  return walks(pattern.split('/'), path.split('/'));
}

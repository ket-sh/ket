export interface Part {
  heading: string;
  body: string;
}

export interface Split {
  lead: string;
  parts: Part[];
}

export function splitOnHeading(source: string, marker: string): Split {
  const opener = `${marker} `;
  const lead: string[] = [];
  const parts: { heading: string; body: string[] }[] = [];

  for (const line of source.split('\n')) {
    if (line.startsWith(opener)) {
      parts.push({ heading: line.slice(opener.length).trim(), body: [] });
      continue;
    }

    const current = parts.at(-1);

    if (current === undefined) {
      lead.push(line);
    } else {
      current.body.push(line);
    }
  }

  return {
    lead: lead.join('\n'),
    parts: parts.map((part) => ({ heading: part.heading, body: part.body.join('\n') })),
  };
}

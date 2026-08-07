import { Marked } from 'marked';

import type { Part } from '../../../shared/prose-parts.ts';

import { splitOnHeading } from '../../../shared/prose-parts.ts';

interface Badge {
  label: string;
  value: string;
}

interface Costed {
  cost: string;
  rest: string;
}

interface Step {
  number: string;
  heading: string;
  body: string;
}

const escaped = (markup: string): string =>
  markup.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

const carriesSafeAddress = (address: string): boolean => {
  const scheme = URL_SCHEME.exec(address.trim())?.[0];

  return scheme === undefined || SAFE_SCHEMES.has(scheme.toLowerCase());
};

const MARKDOWN = new Marked({
  renderer: {
    html({ text }) {
      return escaped(text);
    },
    link(token) {
      return carriesSafeAddress(token.href) ? false : this.parser.parseInline(token.tokens);
    },
    image(token) {
      return carriesSafeAddress(token.href) ? false : escaped(token.text);
    },
  },
});

const QUOTE_MARKER = '>';

const SUMMARY_LABEL = /^\*\*TL;DR\*\*\s*/;

const BADGE_LINE = /^(Status|Date): (.+)/;

const COST_OPENER = 'Cost: ';

const ORDERED_HEADING = /^(\d+)[.)]\s(.+)/;

const MISSING_CALLOUT =
  '<aside class="tldr is-missing"><p class="tldr-label">TL;DR</p><p class="tldr-body">No summary written.</p></aside>';

function slug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

function chips(markup: string): string {
  return markup.replaceAll(/<code>([^<]+)<\/code>/g, (whole, inner: string) =>
    /\/|\.[A-Za-z0-9]+$/.test(inner) ? `<span class="chip">${inner}</span>` : whole,
  );
}

function prose(source: string): string {
  const trimmed = source.trim();

  if (trimmed === '') {
    return '';
  }

  return `<div class="prose">${chips(MARKDOWN.parse(trimmed, { async: false }))}</div>`;
}

function inline(source: string): string {
  return chips(MARKDOWN.parseInline(source, { async: false }));
}

function summaryOf(lead: string): string {
  return lead
    .split('\n')
    .filter((line) => line.startsWith(QUOTE_MARKER))
    .map((line) => line.slice(QUOTE_MARKER.length).trimStart())
    .join(' ')
    .replace(SUMMARY_LABEL, '')
    .trim();
}

function callout(summary: string): string {
  if (summary === '') {
    return MISSING_CALLOUT;
  }

  return `<aside class="tldr"><p class="tldr-label">TL;DR</p><p class="tldr-body">${inline(summary)}</p></aside>`;
}

function badgesOf(lead: string): Badge[] {
  return lead.split('\n').flatMap((line) => {
    const found = BADGE_LINE.exec(line.trim());

    const label = found?.[1];
    const value = found?.[2];

    return label !== undefined && value !== undefined ? [{ label, value }] : [];
  });
}

function badgeRow(badges: Badge[]): string {
  if (badges.length === 0) {
    return '';
  }

  const rendered = badges.map(
    (badge) =>
      `<span class="badge badge-${slug(badge.label)}"><span class="badge-label">${badge.label}</span><span class="badge-value">${escaped(badge.value)}</span></span>`,
  );

  return `<p class="badge-row">${rendered.join('')}</p>`;
}

function introOf(lead: string): string {
  return lead
    .split('\n')
    .filter((line) => !line.startsWith(QUOTE_MARKER) && !BADGE_LINE.test(line.trim()))
    .join('\n');
}

function splitCost(body: string): Costed {
  const cost: string[] = [];
  const rest: string[] = [];
  let withinCost = false;

  for (const line of body.split('\n')) {
    if (line.trim().startsWith(COST_OPENER)) {
      withinCost = true;
      cost.push(line.trim().slice(COST_OPENER.length));
      continue;
    }

    if (withinCost && line.trim() !== '') {
      cost.push(line.trim());
      continue;
    }

    withinCost = false;
    rest.push(line);
  }

  return { cost: cost.join(' '), rest: rest.join('\n') };
}

function alternativeCard(part: Part): string {
  const { cost, rest } = splitCost(part.body);
  const strip =
    cost === ''
      ? ''
      : `<p class="alt-cost"><span class="alt-cost-label">Cost</span><span>${inline(cost)}</span></p>`;

  return `<article class="alt-card"><h4 class="alt-card-head">${inline(part.heading)}</h4>${prose(rest)}${strip}</article>`;
}

function orderedRun(parts: Part[]): Step[] {
  const steps = parts.flatMap((part) => {
    const found = ORDERED_HEADING.exec(part.heading);
    const number = found?.[1];
    const heading = found?.[2];

    return number !== undefined && heading !== undefined
      ? [{ number, heading, body: part.body }]
      : [];
  });

  return steps.length === parts.length ? steps : [];
}

function stepCard(step: Step): string {
  return `<li class="step-card"><span class="step-number">${step.number}</span><div class="step-body"><h4 class="step-head">${inline(step.heading)}</h4>${prose(step.body)}</div></li>`;
}

function consequenceColumn(part: Part): string {
  return `<article class="consequence consequence-${slug(part.heading)}"><h4 class="consequence-head">${inline(part.heading)}</h4>${prose(part.body)}</article>`;
}

function consequencePair(parts: Part[]): boolean {
  return (
    parts.length === 2 &&
    parts.every((part) => ['good', 'bad'].includes(part.heading.toLowerCase()))
  );
}

function sectionCard(part: Part): string {
  const inner = splitOnHeading(part.body, '###');
  const head = `<h3 class="read-card-head">${inline(part.heading)}</h3>`;
  const intro = prose(inner.lead);
  const shell = (content: string): string =>
    `<article class="read-card read-card-${slug(part.heading)}">${head}${intro}${content}</article>`;

  if (inner.parts.length === 0) {
    return shell('');
  }

  if (consequencePair(inner.parts)) {
    return shell(`<div class="consequences">${inner.parts.map(consequenceColumn).join('')}</div>`);
  }

  const steps = orderedRun(inner.parts);

  if (steps.length > 0) {
    return shell(`<ol class="step-cards">${steps.map(stepCard).join('')}</ol>`);
  }

  return shell(`<div class="alt-cards">${inner.parts.map(alternativeCard).join('')}</div>`);
}

export function readingLayout(source: string): string {
  const document = splitOnHeading(source, '#').parts[0];

  if (document === undefined) {
    return prose(source);
  }

  const body = splitOnHeading(document.body, '##');

  return `<div class="reading">
<h2 class="reading-title">${inline(document.heading)}</h2>
${badgeRow(badgesOf(body.lead))}
${callout(summaryOf(body.lead))}
${prose(introOf(body.lead))}
${body.parts.map(sectionCard).join('')}
</div>`;
}

import type { DormantGate } from './dormant.ts';
import type { Draft } from './draft.ts';
import type { Retro, RetroAction } from './fold.ts';
import type { RefusalCluster, Rework, Stall } from './friction.ts';
import type { FlightLine, ItemLine } from './items.ts';
import type { RetroWindow } from './window.ts';

import { momentTextOf, sightingOf, timesOf, withoutStop } from './draft.ts';
import { weekLabelOf } from './window.ts';

const MINUTE = 60_000;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

const RULE_CHANGE =
  'Consider a rule change, recorded in an ADR, since a single refusal shows no pattern yet.';

const QUIET_WEEK = 'No gate refused anything in this window';

const LOG_SCOPE =
  'The log sees a gate only when a session runs its script, ' +
  'so a run at commit time or in CI leaves no line here.';

function spanOf(span: number): string {
  const days = Math.floor(span / DAY);
  const hours = Math.floor((span % DAY) / HOUR);
  const minutes = Math.floor((span % HOUR) / MINUTE);

  if (days > 0) {
    return `${String(days)}d ${String(hours)}h`;
  }

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`;
  }

  return `${String(minutes)}m`;
}

function sizeNote(size: string | undefined): string | undefined {
  return size === undefined ? undefined : `(${size})`;
}

function itemLineOf(line: ItemLine): string {
  return [`- \`${line.key}\``, line.title, sizeNote(line.size)]
    .filter((part) => part !== undefined)
    .join(' ');
}

function flightLineOf(line: FlightLine): string {
  const aged = line.age === undefined ? '' : `, ${spanOf(line.age)} old`;

  return `${itemLineOf(line)}, at ${line.status}${aged}`;
}

function clusterLineOf(cluster: RefusalCluster): string {
  return `- \`${cluster.gate}\` refused ${timesOf(cluster.count)}: ${cluster.reason}`;
}

function reworkLineOf(entry: Rework): string {
  return `- \`${entry.key}\` went backward ${timesOf(entry.count)}`;
}

function stallLinesOf(stall: Stall | undefined): string[] {
  return stall === undefined
    ? []
    : [`\`${stall.key}\` sat at ${stall.stage} for ${spanOf(stall.span)}.`];
}

function splitLinesOf(retro: Retro): string[] {
  if (retro.waiting + retro.working === 0) {
    return [];
  }

  return [
    `Waiting on a person: ${spanOf(retro.waiting)}. Machine working: ${spanOf(retro.working)}.`,
  ];
}

function checkAdvice(gate: string): string {
  return (
    `Consider a mechanical check, \`ket gate ${gate}\` run where the work starts, ` +
    'so the rule stops the edit before the edit lands.'
  );
}

function clusterActionOf(cluster: RefusalCluster): string {
  const said = withoutStop(cluster.reason);

  if (cluster.count === 1) {
    return `\`${cluster.gate}\` refused once, for this reason: ${said}. ${RULE_CHANGE}`;
  }

  const opened = `\`${cluster.gate}\` refused ${String(cluster.count)} times`;

  return `${opened}, each for the same reason: ${said}. ${checkAdvice(cluster.gate)}`;
}

function dormantActionOf(dormant: DormantGate): string {
  return (
    `${QUIET_WEEK}, and ${sightingOf(dormant)}. ${dormant.guards} ` +
    `${LOG_SCOPE} Examine whether the rule still earns its place.`
  );
}

function draftLineOf(draft: Draft): string {
  const numbered = String(draft.number);

  return `Draft ${numbered}: ${draft.sentence}. Adopt it with \`ket retro adopt ${numbered}\`.`;
}

function actionParagraphsOf(action: RetroAction): string[] {
  const prose =
    'cluster' in action ? clusterActionOf(action.cluster) : dormantActionOf(action.dormant);

  return [prose, draftLineOf(action.draft)];
}

function spaced(paragraphs: string[]): string[] {
  return paragraphs.flatMap((paragraph, held) => (held === 0 ? [paragraph] : ['', paragraph]));
}

function actionsHeadingOf(actions: RetroAction[]): string {
  return actions.length === 1 ? '## The one action' : '## The actions';
}

function partsOf(heading: string, lines: string[]): string[] {
  return lines.length === 0 ? [] : [heading, '', ...lines, ''];
}

function sectionOf(heading: string, parts: string[]): string[] {
  return parts.length === 0 ? [] : [heading, '', ...parts];
}

function weekParts(retro: Retro): string[] {
  return [
    ...partsOf(
      '### Entered',
      retro.entered.map((line) => itemLineOf(line)),
    ),
    ...partsOf(
      '### Shipped',
      retro.shipped.map((line) => itemLineOf(line)),
    ),
    ...partsOf(
      '### Still in flight',
      retro.inFlight.map((line) => flightLineOf(line)),
    ),
  ];
}

function frictionParts(retro: Retro): string[] {
  return [
    ...partsOf(
      '### Refusals by gate and reason',
      retro.clusters.map((cluster) => clusterLineOf(cluster)),
    ),
    ...partsOf('### The longest stall', stallLinesOf(retro.stall)),
    ...partsOf(
      '### Rework loops',
      retro.rework.map((entry) => reworkLineOf(entry)),
    ),
    ...partsOf('### Where the time went', splitLinesOf(retro)),
  ];
}

function coverageLineOf(window: RetroWindow, events: number): string {
  const counted = events === 1 ? '1 event' : `${String(events)} events`;
  const ran = `from ${momentTextOf(window.from)} to ${momentTextOf(window.to)}`;

  return `The window runs ${ran}, over ${counted}.`;
}

export function renderRetro(retro: Retro): string {
  return [
    `# Retro for \`${weekLabelOf(retro.window)}\``,
    '',
    ...sectionOf('## The week in items', weekParts(retro)),
    ...sectionOf('## What slowed you', frictionParts(retro)),
    ...partsOf(
      '## Items that entered and never moved',
      retro.unmoved.map((line) => itemLineOf(line)),
    ),
    ...partsOf(
      actionsHeadingOf(retro.actions),
      spaced(retro.actions.flatMap((action) => actionParagraphsOf(action))),
    ),
    '## Coverage',
    '',
    coverageLineOf(retro.window, retro.events),
    '',
  ].join('\n');
}

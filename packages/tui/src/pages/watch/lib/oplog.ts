import type { OplogEventView } from '../../../shared/model';

import { narrowedRows } from './narrowing.ts';

export function gateOf(event: OplogEventView): string {
  return event.gate ?? 'note';
}

export function textOf(event: OplogEventView): string {
  return event.reason ?? event.about ?? event.note ?? '';
}

export function seatedRow(sel: number, count: number): number {
  return Math.min(Math.max(sel, 0), Math.max(0, count - 1));
}

type Answers = (event: OplogEventView) => boolean;

function gateAnswers(wanted: string): Answers {
  return (event) => gateOf(event).toLowerCase().startsWith(wanted);
}

function outcomeAnswers(wanted: string): Answers {
  return (event) => event.outcome?.toLowerCase().startsWith(wanted) === true;
}

function itemAnswers(wanted: string): Answers {
  return (event) => event.item?.toLowerCase().startsWith(wanted) === true;
}

function spokenAnswers(word: string): Answers {
  return (event) =>
    [event.reason, event.about, event.note, event.actor].some(
      (spoken) => spoken?.toLowerCase().includes(word) === true,
    );
}

const SIGILS: Record<string, (rest: string) => Answers> = {
  'g:': gateAnswers,
  'o:': outcomeAnswers,
  'i:': itemAnswers,
};

function answersOf(token: string): Answers {
  const marked = SIGILS[token.slice(0, 2)];

  return marked === undefined ? spokenAnswers(token) : marked(token.slice(2));
}

export function narrowedEvents(events: OplogEventView[], query: string): OplogEventView[] {
  return narrowedRows(events, query, answersOf);
}

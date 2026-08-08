import type { OplogEventView } from '../../../shared/model';

export function gateOf(event: OplogEventView): string {
  return event.gate ?? 'note';
}

export function textOf(event: OplogEventView): string {
  return event.reason ?? event.about ?? event.note ?? '';
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
  const asked = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((token) => token !== '')
    .map((token) => answersOf(token));

  if (asked.length === 0) {
    return events;
  }

  return events.filter((event) => asked.every((answers) => answers(event)));
}

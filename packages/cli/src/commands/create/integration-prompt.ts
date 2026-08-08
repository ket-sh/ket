import type { OfferedCategory } from '@ket/preset';

export interface IntegrationChoice {
  value: string;
  label: string;
  hint: string;
}

// A single-select has no empty pick, so declining is itself an option.
const NO_SERVICE: IntegrationChoice = { value: '', label: 'none', hint: 'no such service' };

export function promptFor(offered: OfferedCategory): string {
  const service = offered.admits === 'several' ? 'services' : 'service';

  return `Which ${offered.category} ${service} do you want?`;
}

function offeredChoices(offered: OfferedCategory): IntegrationChoice[] {
  return offered.offers.map((offer) => ({
    value: offer.name,
    label: offer.name,
    hint: offer.asks,
  }));
}

// The answer that declines carries no tool name, and neither does a stale one,
// so what a category got is whatever of it the category actually offered.
export function pickedNames(answer: string, offered: OfferedCategory): string[] {
  return offered.offers.filter((offer) => offer.name === answer).map((offer) => offer.name);
}

export function choicesFor(offered: OfferedCategory): IntegrationChoice[] {
  return offered.admits === 'several'
    ? offeredChoices(offered)
    : [NO_SERVICE, ...offeredChoices(offered)];
}

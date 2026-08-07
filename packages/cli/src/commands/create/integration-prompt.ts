import type { OfferedCategory } from '@ket/preset';

export interface IntegrationChoice {
  value: string;
  label: string;
  hint: string;
}

// A single-select has no empty pick, so declining is itself an option.
export const NOTHING = '';

const NO_SERVICE: IntegrationChoice = { value: NOTHING, label: 'none', hint: 'no such service' };

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

export function pickedNames(answer: string): string[] {
  return answer === NOTHING ? [] : [answer];
}

export function choicesFor(offered: OfferedCategory): IntegrationChoice[] {
  return offered.admits === 'several'
    ? offeredChoices(offered)
    : [NO_SERVICE, ...offeredChoices(offered)];
}

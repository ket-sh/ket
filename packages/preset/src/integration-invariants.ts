import type { PresetIntegration, PresetItem } from './item.ts';

import { filesOf, reachesNothing } from './item.ts';

const PUBLIC_REPOSITORY = 'public';

const PRIVATE_REPOSITORY = 'private';

function fileInvariants(integration: PresetIntegration, unasked: Set<string>): string[] {
  const written = filesOf(integration)
    .filter((file) => unasked.has(file.target))
    .map(
      (file) =>
        `the integration ${integration.name} writes ${file.target}, which the preset already writes unasked`,
    );

  return reachesNothing(integration)
    ? [`the integration ${integration.name} changes nothing a project can see`]
    : written;
}

function sentenceInvariants(integration: PresetIntegration): string[] {
  const asks = integration.asks.toLowerCase();

  return [
    ...(asks.includes(integration.name)
      ? []
      : [
          `the integration ${integration.name} does not name itself in the sentence that offers it`,
        ]),
    ...(asks.includes(PUBLIC_REPOSITORY)
      ? []
      : [`the integration ${integration.name} does not say what a public repository pays`]),
    ...(asks.includes(PRIVATE_REPOSITORY)
      ? []
      : [`the integration ${integration.name} does not say what a private repository pays`]),
  ];
}

export function integrationInvariantsOf(item: PresetItem): string[] {
  const unasked = new Set(item.files.map((file) => file.target));

  return item.integrations.flatMap((integration) => [
    ...fileInvariants(integration, unasked),
    ...sentenceInvariants(integration),
  ]);
}

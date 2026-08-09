import type { PresetIntegration, PresetItem } from './item.ts';

import { substitutes } from './category.ts';
import { comes, filesOf, mcpServersOf, reachesNothing } from './item.ts';

const PUBLIC_REPOSITORY = 'public';

const PRIVATE_REPOSITORY = 'private';

const LANDS_NOWHERE = '~/';

function fileInvariants(integration: PresetIntegration): string[] {
  if (comes(integration)) {
    return [];
  }

  return reachesNothing(integration)
    ? [`the integration ${integration.name} changes nothing a project can see`]
    : [];
}

// An integration may replace what the preset writes unasked: that is how one
// swaps a spec for the version its own runner extends. Two integrations
// reaching for one target is a different thing, and whichever ran last wins.
interface Claim {
  by: PresetIntegration;
  target: string;
}

function claimsOf(integrations: PresetIntegration[]): Claim[] {
  return integrations.flatMap((integration) =>
    filesOf(integration).map((file) => ({ by: integration, target: file.target })),
  );
}

function contestedTargets(integrations: PresetIntegration[]): string[] {
  const claims = claimsOf(integrations);

  return claims.flatMap((claim, at) =>
    claims
      .slice(0, at)
      .filter((earlier) => earlier.target === claim.target)
      .filter((earlier) => !substitutes(earlier.by, claim.by))
      .map(
        (earlier) =>
          `${claim.target} is claimed by ${earlier.by.name} and by ${claim.by.name}, so one of them never arrives`,
      ),
  );
}

function sentenceInvariants(integration: PresetIntegration): string[] {
  if (comes(integration)) {
    return [];
  }

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

function shapeInvariants(integration: PresetIntegration): string[] {
  if (integration.name === '') {
    return ['an integration goes by no name, and a person picks one by name'];
  }

  if (!('reaches' in integration)) {
    return filesOf(integration)
      .filter((file) => file.target === '' || file.target === LANDS_NOWHERE)
      .map(() => `the integration ${integration.name} writes a file that lands nowhere`);
  }

  if (integration.reaches.stage.trim() === '') {
    return [`the integration ${integration.name} reaches for nothing at any named stage`];
  }

  return integration.reaches.reference.trim() === ''
    ? [
        `the integration ${integration.name} names the stage ${integration.reaches.stage} and nothing to reach for`,
      ]
    : [];
}

function mcpInvariants(integration: PresetIntegration): string[] {
  return mcpServersOf(integration).flatMap((server) => {
    if (server.name.trim() === '') {
      return [`the integration ${integration.name} registers an MCP server that goes by no name`];
    }

    return server.url.trim() === ''
      ? [
          `the integration ${integration.name} registers the MCP server ${server.name} with no url to reach it at`,
        ]
      : [];
  });
}

export function integrationInvariantsOf(item: PresetItem): string[] {
  return [
    ...item.integrations.flatMap((integration) => [
      ...shapeInvariants(integration),
      ...fileInvariants(integration),
      ...sentenceInvariants(integration),
      ...mcpInvariants(integration),
    ]),
    ...contestedTargets(item.integrations),
  ];
}

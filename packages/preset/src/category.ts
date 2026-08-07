import type { IntegrationCategory, PresetIntegration } from './item.ts';

// Two visual services keep two baseline histories, and two coverage services
// comment the same lcov twice, so those slots are substitutions. Two reviewers
// are two GitHub Apps posting reviews of their own, and both can be read.
export type CategoryAdmission = 'one' | 'several';

export interface OrderedCategory {
  category: IntegrationCategory;
  admits: CategoryAdmission;
}

export const INTEGRATION_CATEGORIES: OrderedCategory[] = [
  { category: 'design reference', admits: 'one' },
  { category: 'visual review', admits: 'one' },
  { category: 'AI pull-request review', admits: 'several' },
  { category: 'coverage', admits: 'one' },
  { category: 'supply chain', admits: 'one' },
  { category: 'code scanning', admits: 'one' },
];

export function admissionOf(category: string): CategoryAdmission | undefined {
  return INTEGRATION_CATEGORIES.find((ordered) => ordered.category === category)?.admits;
}

export interface OfferedCategory extends OrderedCategory {
  offers: PresetIntegration[];
}

export function categoriesOffering(integrations: PresetIntegration[]): OfferedCategory[] {
  return INTEGRATION_CATEGORIES.map((ordered) => ({
    ...ordered,
    offers: integrations.filter((offered) => offered.category === ordered.category),
  })).filter((offered) => offered.offers.length > 0);
}

export interface CrowdedCategory {
  category: IntegrationCategory;
  tools: string[];
}

const ONE_TOOL = 1;

export function crowdedCategoriesOf(integrations: PresetIntegration[]): CrowdedCategory[] {
  return categoriesOffering(integrations)
    .filter((offered) => offered.admits === 'one')
    .filter((offered) => offered.offers.length > ONE_TOOL)
    .map((offered) => ({
      category: offered.category,
      tools: offered.offers.map((offer) => offer.name),
    }));
}

export function substitutes(one: PresetIntegration, other: PresetIntegration): boolean {
  return (
    one.name !== other.name &&
    one.category === other.category &&
    admissionOf(one.category) === 'one'
  );
}

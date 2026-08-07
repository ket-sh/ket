import type { IntegrationCategory, PresetIntegration } from './item.ts';

type CategoryAdmission = 'one' | 'several';

const ADMISSIONS: Record<IntegrationCategory, CategoryAdmission> = {
  'design reference': 'one',
  'visual review': 'one',
  'AI pull-request review': 'several',
  coverage: 'one',
  'supply chain': 'one',
  'code scanning': 'one',
};

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  'design reference',
  'visual review',
  'AI pull-request review',
  'coverage',
  'supply chain',
  'code scanning',
];

function admissionOf(category: IntegrationCategory): CategoryAdmission {
  return ADMISSIONS[category];
}

export interface OfferedCategory {
  category: IntegrationCategory;
  admits: CategoryAdmission;
  offers: PresetIntegration[];
}

export function categoriesOffering(integrations: PresetIntegration[]): OfferedCategory[] {
  return INTEGRATION_CATEGORIES.map((category) => ({
    category,
    admits: admissionOf(category),
    offers: integrations.filter((offered) => offered.category === category),
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

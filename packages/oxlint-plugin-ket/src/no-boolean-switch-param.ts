import type { Definition, ESTree, Reference, Rule, Variable } from '@oxlint/plugins';

import { defineRule } from '@oxlint/plugins';

const SPLITS_INTO_TWO_FUNCTIONS =
  'a boolean parameter that switches a function splits into two functions';

const isBooleanAnnotated = (definition: Definition): boolean =>
  definition.name.typeAnnotation?.typeAnnotation.type === 'TSBooleanKeyword';

const switchesOnTest = (reference: Reference): boolean => {
  const { parent } = reference.identifier;

  if (parent.type !== 'IfStatement' && parent.type !== 'ConditionalExpression') {
    return false;
  }

  return parent.test === reference.identifier;
};

const switchingParametersOf = (variables: readonly Variable[]): readonly Definition[] =>
  variables
    .filter((variable) => variable.references.some(switchesOnTest))
    .flatMap((variable) => variable.defs.filter(isBooleanAnnotated));

export const noBooleanSwitchParam: Rule = defineRule({
  create(context) {
    const reportSwitchingParameters = (
      node: ESTree.Function | ESTree.ArrowFunctionExpression,
    ): void => {
      const declared = context.sourceCode.getDeclaredVariables(node);

      for (const parameter of switchingParametersOf(declared)) {
        context.report({ message: SPLITS_INTO_TWO_FUNCTIONS, node: parameter.name });
      }
    };

    return {
      FunctionDeclaration: reportSwitchingParameters,
      FunctionExpression: reportSwitchingParameters,
      ArrowFunctionExpression: reportSwitchingParameters,
    };
  },
});

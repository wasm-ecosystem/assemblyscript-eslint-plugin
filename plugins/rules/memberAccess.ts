import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
} from "@typescript-eslint/utils";
import { RuleListener, RuleModule } from "@typescript-eslint/utils/ts-eslint";
import createRule from "../utils/createRule.js";

const noRepeatedMemberAccess: ESLintUtils.RuleModule<
  "repeatedAccess", // Message ID type
  unknown[],
  unknown,
  ESLintUtils.RuleListener // Listener type
> = createRule({
  name: "no-repeated-member-access",
  defaultOptions: [{ minOccurrences: 2 }], // Provide a default object matching the options structure
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid getting member variable multiple-times in the same context",
    },
    fixable: "code",
    messages: {
      repeatedAccess:
        "Try refactor member access to a variable (e.g. 'const temp = {{ path }};') to avoid possible performance loss",
    },
    schema: [
      {
        type: "object",
        properties: {
          minOccurrences: { type: "number", minimum: 2 },
        },
      },
    ],
  },
  create(context) {
    return {};
  },
});

export default noRepeatedMemberAccess;

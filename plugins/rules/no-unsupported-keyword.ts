import { ESLintUtils } from "@typescript-eslint/utils";
import createRule from "../utils/create-rule.js";

/**
 * Rule: No Unsupported Keywords
 * Reject usage of TypeScript keywords that are not supported in AssemblyScript.
 */
const noUnsupportedKeyword: ESLintUtils.RuleModule<
  string,
  [],
  unknown,
  ESLintUtils.RuleListener
> = createRule({
  name: "no-unsupported-keyword",
  meta: {
    type: "problem",
    docs: {
      description: "Some keywords are not supported in assemblyscript",
    },
    messages: {
      noNever: "'never' is not supported in AssemblyScript.",
      noAny: "'any' is not supported in AssemblyScript.",
      noUndefined: "'undefined' is not supported in AssemblyScript.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      TSNeverKeyword: (node) => {
        context.report({ messageId: "noNever", node: node });
      },
      TSAnyKeyword: (node) => {
        context.report({ messageId: "noAny", node: node });
      },
      TSUndefinedKeyword: (node) => {
        context.report({ messageId: "noUndefined", node: node });
      },
    };
  },
});

export default noUnsupportedKeyword;

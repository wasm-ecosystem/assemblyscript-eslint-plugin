import { ESLintUtils } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";

/**
 * Rule: No Spread
 * Reject usages of ...var on call expressions, as spread syntax is not supported in AssemblyScript.
 */
const noSpread: ESLintUtils.RuleModule<
  "noSpreadMsg",
  [],
  unknown,
  ESLintUtils.RuleListener
> = createRule({
  name: "no-spread",
  meta: {
    type: "problem",
    docs: {
      description: "Spreads are not supported.",
    },
    messages: {
      noSpreadMsg: "Spreads are not supported.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      SpreadElement: (node) => {
        context.report({ messageId: "noSpreadMsg", node: node });
      },
    };
  },
});

export default noSpread;

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { RuleListener, RuleModule } from "@typescript-eslint/utils/ts-eslint";

/**
 * ESlint plugin to enforce people to comply with our code guidelines
 * Reference: https://developer.bmwgroup.net/docs/cdc/cdc-platform-wasm/guidelines/#cdc-specific-rules
 */

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

const dontOmitElse: RuleModule<"omittedElse", [], unknown, RuleListener> =
  createRule({
    name: "dont-omit-else",
    meta: {
      type: "problem",
      docs: {
        description:
          "Enforce else block unless if branch contains control flow",
      },
      messages: {
        omittedElse:
          "Omitted else block is not allowed unless if branch contains control flow.",
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      // Check if the statement is part of an else-if chain
      function isElseIf(node: TSESTree.Node) {
        // Check parent relationship to determine if this is an else-if
        const ancestors = context.sourceCode.getAncestors(node);
        const parent = ancestors[ancestors.length - 1];
        return (
          parent && parent.type === "IfStatement" && parent.alternate === node
        );
      }

      // Helper function to check if a node is a control flow statement
      function isControlFlowStatement(
        node: TSESTree.Node | null | undefined
      ): boolean {
        // Return true if the node is a control flow statement
        return (
          node?.type === "ReturnStatement" ||
          node?.type === "ThrowStatement" ||
          node?.type === "BreakStatement" ||
          node?.type === "ContinueStatement"
        );
      }

      // Check if statement or block contains control flow
      function checkControlFlow(node: TSESTree.Node) {
        // Handle different statement types
        if (node.type === "BlockStatement") {
          // For block statements, check the last statement in the block
          const lastStatement =
            node.body.length > 0 ? node.body[node.body.length - 1] : null;
          return isControlFlowStatement(lastStatement);
        } else {
          // For single statements (no curly braces), check the statement directly
          return isControlFlowStatement(node);
        }
      }

      return {
        IfStatement(node) {
          // Skip if this is already an else-if
          if (isElseIf(node)) {
            return;
          }
          const hasElse = node.alternate !== null;
          const ifBlockEndsWithControlFlow = checkControlFlow(node.consequent);
          // Report error if no else and no control flow
          if (!hasElse && !ifBlockEndsWithControlFlow) {
            context.report({
              node,
              messageId: "omittedElse",
            });
          }
        },
      };
    },
  });

// reject usages of ...var: T on function definition
const noRestParam: ESLintUtils.RuleModule<
  "noRestMsg",
  [],
  unknown,
  ESLintUtils.RuleListener
> = createRule({
  name: "no-rest-params",
  meta: {
    type: "problem",
    docs: {
      description: "Rest params are not supported.",
    },
    messages: {
      noRestMsg: "Don't use rest params, it's not supported in assemblyscript",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      RestElement: (node) => {
        context.report({
          messageId: "noRestMsg",
          node: node,
        });
      },
    };
  },
});

// reject usages of ...var on call expressions
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

export default {
  rules: {
    "dont-omit-else": dontOmitElse,
    "no-rest-params": noRestParam,
    "no-spread": noSpread,
    "no-unsupported-keyword": noUnsupportedKeyword,
  },
};

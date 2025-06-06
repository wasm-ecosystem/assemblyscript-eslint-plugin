import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";

/**
 * Rule: Enforce explicit type annotations for floating point literals and uninitialized variables.
 */

export default createRule({
  name: "specify-type",
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce explicit type annotations for variable declarations",
    },
    messages: {
      missingType:
        "Variable declaration should have an explicit type annotation",
    },
    schema: [], // no options
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        // Skip if there's already a type annotation
        if (node.id.typeAnnotation) {
          return;
        }

        // Always require type annotation when there's no initialization
        if (!node.init) {
          context.report({
            node,
            messageId: "missingType",
          });
          return;
        }

        // For floating point literals, require explicit type annotation
        if (
          node.init.type === AST_NODE_TYPES.Literal &&
          typeof node.init.value === "number" &&
          !Number.isInteger(node.init.value)
        ) {
          context.report({
            node,
            messageId: "missingType",
          });
          return;
        }

        // For array literals containing floating point numbers, require type annotation
        if (
          node.init.type === AST_NODE_TYPES.ArrayExpression &&
          node.init.elements.some(
            (element) =>
              element !== null &&
              element.type === AST_NODE_TYPES.Literal &&
              typeof element.value === "number" &&
              !Number.isInteger(element.value)
          )
        ) {
          context.report({
            node,
            messageId: "missingType",
          });
        }
      },
    };
  },
});

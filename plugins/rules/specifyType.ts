import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";

/**
 * Rule: If a variable is declared and there's no instantiation of the type, we should specify the type.
 * Good:
 * const mileage : f32 = 5.3
 * Bad:
 * const mileage = 5.3  // Missing type annotation
 * let count // No type annotation and no initialization
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

        // For WebAssembly numeric types, we need explicit annotations
        // since JavaScript numbers don't distinguish between i32/f32/f64 etc.
        if (
          node.init.type === AST_NODE_TYPES.Literal &&
          typeof node.init.value === "number"
        ) {
          context.report({
            node,
            messageId: "missingType",
          });
          return;
        }

        // For array literals containing numbers, also require type annotation
        if (
          node.init.type === AST_NODE_TYPES.ArrayExpression &&
          node.init.elements.some(
            (element) =>
              element !== null &&
              element.type === AST_NODE_TYPES.Literal &&
              typeof element.value === "number"
          )
        ) {
          context.report({
            node,
            messageId: "missingType",
          });
          return;
        }

        // For non-const variables, always require type annotations
        // since their values can change
        const variableDeclaration = node.parent;
        if (variableDeclaration.kind !== "const") {
          context.report({
            node,
            messageId: "missingType",
          });
        }
      },
    };
  },
});

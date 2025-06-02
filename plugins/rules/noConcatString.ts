import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";

/**
 * Rule: Don't allow string concatenation in loops as this can incur performance penalties.
 * Bad:
 * for (let i = 0; i < 1000; i++) {
 *   str += "Hello" + i; // String concatenation in loop
 * }
 * Good:
 * for (let i = 0; i < 1000; i++) {
 *   arr.push("Hello" + i);
 * }
 * const str = arr.join("");
 */

// Helper function to determine if a node is likely a string
// this is NOT 100% inclusive
function isStringType(node: TSESTree.Node) {
  // String literals
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return true;
  }

  // Template literals
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return true;
  }

  // String() constructor
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === "String"
  ) {
    return true;
  }

  // String methods that return strings (e.g., str.substring())
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    [
      "charAt",
      "concat",
      "normalize",
      "repeat",
      "replace",
      "replaceAll",
      "slice",
      "substring",
      "toLowerCase",
      "toUpperCase",
      "trim",
      "trimEnd",
      "trimStart",
    ].includes(
      node.callee.property.type === AST_NODE_TYPES.Identifier
        ? node.callee.property.name
        : ""
    )
  ) {
    return true;
  }

  // Binary expression that likely results in a string
  // eslint-disable-next-line sonarjs/prefer-single-boolean-return
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === "+" &&
    (isStringType(node.left) || isStringType(node.right))
  ) {
    return true;
  }

  return false;
}
export default createRule({
  name: "no-concat-string",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow string concatenation in loops",
    },
    messages: {
      noConcatInLoop:
        "String concatenation inside loops can lead to performance issues. Use array.join() or a string builder instead.",
    },
    schema: [], // no options
  },
  defaultOptions: [],
  create(context) {
    // Track the loop nesting level
    let loopDepth = 0;
    // Track string variables
    const stringVariables = new Set();

    return {
      // Track entry and exit for loops
      ForStatement() {
        loopDepth++;
      },
      "ForStatement:exit"() {
        loopDepth--;
      },

      WhileStatement() {
        loopDepth++;
      },
      "WhileStatement:exit"() {
        loopDepth--;
      },

      DoWhileStatement() {
        loopDepth++;
      },
      "DoWhileStatement:exit"() {
        loopDepth--;
      },

      ForInStatement() {
        loopDepth++;
      },
      "ForInStatement:exit"() {
        loopDepth--;
      },

      ForOfStatement() {
        loopDepth++;
      },
      "ForOfStatement:exit"() {
        loopDepth--;
      },

      // Track string variable declarations
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === AST_NODE_TYPES.Literal &&
          typeof node.init.value === "string" &&
          node.id.type === AST_NODE_TYPES.Identifier
        ) {
          stringVariables.add(node.id.name);
        }
      },

      // Check for string concatenation with + operator
      BinaryExpression(node) {
        // Only check inside loops
        if (loopDepth === 0) return;

        if (
          node.operator === "+" &&
          (isStringType(node.left) || isStringType(node.right))
        ) {
          context.report({
            node,
            messageId: "noConcatInLoop",
          });
        }
      },

      // Check for string concatenation with += operator
      AssignmentExpression(node) {
        if (loopDepth === 0) return;

        if (node.operator === "+=") {
          // Check if right side is a string type
          const rightIsString = isStringType(node.right);

          // Check different left side patterns
          let shouldReport = false;

          if (node.left.type === AST_NODE_TYPES.Identifier) {
            // Handle: variable += "string"
            shouldReport = stringVariables.has(node.left.name) || rightIsString;
          } else if (node.left.type === AST_NODE_TYPES.MemberExpression) {
            // Handle: obj.prop += "string" or obj["key"] += "string"
            // For member expressions, we assume if right side is string, it's likely string concatenation
            shouldReport = rightIsString;
          }

          if (shouldReport) {
            context.report({
              node,
              messageId: "noConcatInLoop",
            });
          }
        }
      },
    };
  },
});

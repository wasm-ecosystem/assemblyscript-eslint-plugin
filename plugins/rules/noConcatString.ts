import { ESLintUtils } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";
import ts from "typescript";

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
    // We uses built-in type system to deduce type information
    // https://typescript-eslint.io/developers/custom-rules/#typed-rules
    // https://typescript-eslint.io/getting-started/typed-linting/
    function isStringType(type: ts.Type): boolean {
      // basic string type
      if (type.flags & ts.TypeFlags.String) {
        return true;
      }

      // String literal type (e.g., 'hello')
      if (type.flags & ts.TypeFlags.StringLiteral) {
        return true;
      }

      // Template literal type (e.g., `hello${string}`)
      if (type.flags & ts.TypeFlags.TemplateLiteral) {
        return true;
      }

      // String in union type (e.g., string | number)
      if (type.isUnion()) {
        return type.types.some((t) => isStringType(t));
      }

      // Type alias (e.g., type MyString = string)
      if (type.aliasSymbol) {
        return isStringType(checker.getDeclaredTypeOfSymbol(type.aliasSymbol));
      }

      return false;
    }
    // Track the loop nesting level
    let loopDepth = 0;
    // Grab the parser services for the rule
    const parserServices = ESLintUtils.getParserServices(context);
    // Grab the TypeScript type checker
    const checker = parserServices.program.getTypeChecker();

    return {
      // Track entry and exit for loops
      // Upon entering, loopDepth will increment; upon exiting loopDepth will decrease
      // We use this mechanism to detect wheter we are in a loop or not (when in loop, loopDepth will be a value greater than 0)
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

      // Check for string concatenation with + operator
      BinaryExpression(node) {
        // Only check inside loops
        if (loopDepth === 0) return;

        const leftType: ts.Type = parserServices.getTypeAtLocation(node.left);
        const rightType: ts.Type = parserServices.getTypeAtLocation(node.right);

        if (
          node.operator === "+" &&
          (isStringType(leftType) || isStringType(rightType))
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
          const rightType: ts.Type = parserServices.getTypeAtLocation(
            node.right
          );

          const rightIsString = isStringType(rightType);
          const leftType: ts.Type = parserServices.getTypeAtLocation(node.left);
          const leftIsString = isStringType(leftType);

          // Check different left side patterns
          let shouldReport = false;

          shouldReport = leftIsString || rightIsString;

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

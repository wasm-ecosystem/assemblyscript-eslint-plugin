import { TSESTree } from "@typescript-eslint/utils";
import { RuleListener, RuleModule } from "@typescript-eslint/utils/ts-eslint";
import createRule from "../utils/create-rule.js";

/**
 * Rule: Dont Omit Else
 * Enforce using else block when if branch doesn't contain control flow statement.
 * BAD
 * if (x) { }
 * GOOD
 * if (x) { } else { }
 */
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
        const parent = ancestors.at(-1);
        return (
          parent && parent.type === "IfStatement" && parent.alternate === node
        );
      }

      // Helper function to check if a node will lead to early exit
      function isEarlyExitStatement(node: TSESTree.Node): boolean {
        // Return true if the node will lead to early exit
        return (
          node.type === "ReturnStatement" ||
          node.type === "ThrowStatement" ||
          node.type === "BreakStatement" ||
          node.type === "ContinueStatement"
        );
      }

      // Check if statement or block doesn't contain early exit statement
      function hasTerminatingStatement(node: TSESTree.Node) {
        // Handle different statement types
        if (node.type === "BlockStatement") {
          // For block statements, check the last statement in the block
          const lastStatement = node.body.length > 0 ? node.body.at(-1) : null;
          return lastStatement ? isEarlyExitStatement(lastStatement) : false;
        } else {
          // For single statements (no curly braces), check the statement directly
          return isEarlyExitStatement(node);
        }
      }

      return {
        IfStatement(node) {
          // Skip if this is already an else-if
          if (isElseIf(node)) {
            return;
          }
          const hasElse = node.alternate !== null;
          const ifBlockEndsWithControlFlow = hasTerminatingStatement(
            node.consequent
          );
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

export default dontOmitElse;

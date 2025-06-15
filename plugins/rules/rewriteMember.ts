import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { Scope } from "@typescript-eslint/utils/ts-eslint";
import createRule from "../utils/createRule.js";

const noRepeatedMemberAccess = createRule({
  name: "no-repeated-member-access",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Optimize repeated member access patterns by extracting variables",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          minOccurrences: { type: "number", minimum: 2, default: 3 },
        },
      },
    ],
    messages: {
      repeatedAccess:
        "Member chain '{{ chain }}' accessed {{ count }} times. Extract to variable.",
    },
  },
  defaultOptions: [{ minOccurrences: 3 }],

  create(context, [options]) {
    // consider:
    // 1. a map to store [[scope, memberExpression[]], { count: number, modified: boolean }]
    // 2. process every statement we have
    // if it is a memberExpression, go through all its nodes and increase their count in the map
    // in case of assignment, update the modified flag for all nodes in the chain
    // 3. at the end of the scope, check if any of the chains have count >= minOccurrences
    // if so, report the issue and provide a fix to extract the chain into a variable
    const sourceCode = context.sourceCode;
    const minOccurrences = options.minOccurrences;

    // type scopeKey = [Scope.Scope, TSESTree.MemberExpression[]];
    type scopeValue = { count: number; modified: boolean };
    const scopeMap = new WeakMap<TSESTree.MemberExpression[], scopeValue>();

    function trackModification(node: TSESTree.MemberExpression) {
      scopeMap[node].modified = true;
    }
    function processMemberExpression(node: TSESTree.MemberExpression) {}

    // ======================
    // Rule Listeners
    // ======================
    // These event handlers process different AST node types and track chain usage
    //
    // Examples of what each listener detects:
    // - AssignmentExpression: obj.prop.val = 5
    // - UpdateExpression: obj.prop.val++
    // - CallExpression: obj.prop.method()
    // - MemberExpression: obj.prop.val
    return {
      // Track assignment expression
      // Example: obj.prop.val = 5
      AssignmentExpression: (node) => {
        if (node.left.type === AST_NODE_TYPES.MemberExpression) {
        }
      },

      // Track increment/decrement operations
      // Example: obj.prop.counter++ modifies "obj.prop.counter"
      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
        }
      },

      // Track function calls that might modify their arguments
      // Example: obj.methods.update() might modify the "obj.methods" chain
      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        }
      },

      // Process member expressions to identify repeated patterns
      // Example: Catches obj.prop.val, user.settings.theme, etc.
      MemberExpression: (node) => processMemberExpression(node),
    };
  },
});

export default noRepeatedMemberAccess;

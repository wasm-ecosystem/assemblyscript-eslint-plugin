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
    const sourceCode = context.sourceCode;
    const minOccurrences = options.minOccurrences;

    type modifiedMap = Map<string, boolean>;
    type countMap = Map<string, number>;
    type nodeMap = Map<string, TSESTree.Node>;

    const scopeToModifiedMap = new Map<Scope.Scope, modifiedMap>();
    const scopeToCountMap = new Map<Scope.Scope, countMap>();
    const scopeToNodeMap = new Map<Scope.Scope, nodeMap>();

    function analyzeChain(node: TSESTree.MemberExpression) {
      let currentNode = node;
      let parts = [];
      let valid = true;
      while (currentNode.type === AST_NODE_TYPES.MemberExpression) {
        parts.push

      }
      
    }

    function trackModification(node: TSESTree.MemberExpression) {
      const currentScope = sourceCode.getScope(node);
      if (!scopeToModifiedMap.has(currentScope)) {
        const newModifiedMap = new Map<string, boolean>();
        scopeToModifiedMap.set(currentScope, newModifiedMap);
      }
      const currentModifiedMap = scopeToModifiedMap.get(currentScope)!;
      
      // scopeMap[node].modified = true;
    }

    function processMemberExpression(node: TSESTree.MemberExpression) {}

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

import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils";
import { Scope } from "@typescript-eslint/utils/ts-eslint";
import createRule from "../utils/createRule.js";

/**
 * Rule to optimize repeated member access patterns by extracting variables
 * For more rule details refer to docs/rules/no-repeated-member-access.md
 *
 * The following material is an overview of implementation details
 * It is divided into several phases
 *
 * 1. Analysis Phase:
 *    - Traverse AST to identify member access chains (e.g., obj.prop.val)
 *    - Store chains into hierarchical structures (e.g., ["obj", "obj.prop", "obj.prop.val"])
 *    - Cache analysis results to avoid repeatedly processing
 *
 * 2. Tracking Phase:
 *    - Count usage frequency of each chain within current scope
 *    - Identify modified chains (assignments, increments, function calls, etc.)
 *    - Mark all parts alongside the chain as modified
 *
 * 3. Reporting Phase:
 *    - For chains that meet usage threshold and are not modified, suggest variable extraction
 *    - Report only the longest valid chains
 *
 * Things to note:
 * - Only process chains starting with identifiers or "this" (avoid function call results)
 * - Skip computed property access (e.g., obj[key])
 * - Mark modified chains as un-extractable
 * - Support TypeScript non-null assertion operator (!) (minor bugs might still persist in some cases)
 */
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

    // Track which chains have already been reported to avoid duplicate reports
    const reportedChains = new Set<string>();

    type ScopeData = Map<
      string,
      {
        count: number; // Number of times this chain is accessed
        node: TSESTree.MemberExpression; // AST nodes where this chain appears
        modified: boolean; // Whether this chain is modified (written to)
      }
    >;
    // Stores data for each scope using WeakMap to avoid memory leaks
    const scopeDataMap = new WeakMap<Scope.Scope, ScopeData>();

    function getScopeData(scope: Scope.Scope): ScopeData {
      if (!scopeDataMap.has(scope)) {
        // Create new scope data if not already present
        const newScopeData = new Map<
          string,
          {
            count: number;
            node: TSESTree.MemberExpression;
            modified: boolean;
          }
        >();
        scopeDataMap.set(scope, newScopeData);
      }
      return scopeDataMap.get(scope)!;
    }

    function analyzeChain(node: TSESTree.MemberExpression) {
      const properties: string[] = []; // AST is iterated in reverse order
      let current: TSESTree.Node = node; // Current node in traversal

      // Collect property chain (reverse order)
      // Example: For a.b.c, we'd collect ["c", "b", "a"] initially
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.computed) {
          // skip computed properties like obj["prop"] or arr[0] or obj[getKey()]
          break;
        } else {
          // Handle dot notation like obj.prop
          properties.push(current.property.name);
        }

        current = current.object; // Move to parent object

        // Handle TSNonNullExpression (the ! operator)
        while (current.type === AST_NODE_TYPES.TSNonNullExpression) {
          current = current.expression;
        }
      }

      // Handle base object (the root of the chain)
      // Example: For a.b.c, the base object is "a"
      if (current.type === AST_NODE_TYPES.Identifier) {
        properties.push(current.name); // Add base object name
      } else if (current.type === AST_NODE_TYPES.ThisExpression) {
        properties.push("this");
      } // ignore other patterns

      // Generate hierarchy chain (forward order)
      // Example:
      // Input is "a.b.c"
      // For property ["c", "b", "a"], we reverse it to ["a", "b", "c"]
      properties.reverse();

      // and build chain of object ["a", "a.b", "a.b.c"]
      const result: string[] = [];
      let currentChain = "";
      for (let i = 0; i < properties.length; i++) {
        currentChain =
          i === 0 ? properties[0] : `${currentChain}.${properties[i]}`;
        result.push(currentChain);
      }

      return result;
    }

    function setModifiedFlag(chain: string, node: TSESTree.Node) {
      const scope = sourceCode.getScope(node);
      const scopeData = getScopeData(scope);

      for (const [existingChain, record] of scopeData) {
        // Check if the existing chain starts with the modified chain followed by a dot or bracket
        // This handles cases where modifying "a.b" should invalidate "a.b.c", "a.b.d", etc.
        if (
          existingChain === chain ||
          existingChain.startsWith(chain + ".") ||
          existingChain.startsWith(chain + "[")
        ) {
          record.modified = true;
        }
      }
      if (!scopeData.has(chain)) {
        scopeData.set(chain, {
          count: 0,
          node: node as TSESTree.MemberExpression, // to do: check this conversion!!
          modified: true,
        });
      }
    }

    function processMemberExpression(node: TSESTree.MemberExpression) {
      // Skip nodes that are part of larger member expressions
      // Example: In a.b.c, we process the top-level MemberExpression only,
      // not the sub-expressions a.b or a
      if (node.parent?.type === AST_NODE_TYPES.MemberExpression) return;

      const scope = sourceCode.getScope(node);
      const scopeData = getScopeData(scope);

      const chainInfo = analyzeChain(node);
      if (!chainInfo) return;

      const longestValidChain = chainInfo[-1];
      const record = scopeData.get(longestValidChain)!;
      if (
        record.count >= minOccurrences &&
        !reportedChains.has(longestValidChain)
      ) {
        context.report({
          node: record.node,
          messageId: "repeatedAccess",
          data: { chain: longestValidChain, count: record.count },
        });
        reportedChains.add(longestValidChain);
      }
    }

    return {
      // Track assignments that modify member chains
      // Example: obj.prop.val = 5 modifies the "obj.prop.val" chain
      // This prevents us from extracting chains that are modified
      AssignmentExpression: (node) => {
        if (node.left.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.left);
          if (chainInfo) {
            for (const chain of chainInfo) {
              setModifiedFlag(chain, node);
            }
          }
        }
      },

      // Track increment/decrement operations
      // Example: obj.prop.counter++ modifies "obj.prop.counter"
      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.argument);
          if (chainInfo) {
            for (const chain of chainInfo) {
              setModifiedFlag(chain, node);
            }
          }
        }
      },

      // Track function calls that might modify their arguments
      // Example: obj.methods.update() might modify the "obj.methods" chain
      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.callee);
          if (chainInfo) {
            for (const chain of chainInfo) {
              setModifiedFlag(chain, node);
            }
          }
        }
      },

      // Process member expressions to identify repeated patterns
      // Example: Catches obj.prop.val, user.settings.theme, etc.
      MemberExpression: (node) => processMemberExpression(node),
    };
  },
});

export default noRepeatedMemberAccess;

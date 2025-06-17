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

    // Track which chains have already been reported to avoid duplicate reports
    const reportedChains = new Set<string>();

    // We have got two map types, chainMap and scopeDataMap
    // it works like: scopeDataMap -> chainMap -> chainInfo

    // Stores info to decide if a extraction is necessary
    type ChainMap = Map<
      string,
      {
        count: number; // Number of times this chain is accessed
        modified: boolean; // Whether this chain is modified (written to)
      }
    >;
    // Stores mapping of scope to ChainMap
    const scopeDataMap = new WeakMap<Scope.Scope, ChainMap>();

    function getChainMap(scope: Scope.Scope): ChainMap {
      if (!scopeDataMap.has(scope)) {
        // Create new info map if not already present
        const newChainMap = new Map<
          string,
          {
            count: number;
            modified: boolean;
          }
        >();
        scopeDataMap.set(scope, newChainMap);
      }
      return scopeDataMap.get(scope)!;
    }

    // This function generates ["a", "a.b", "a.b.c"] from a.b.c
    // We will further add [count, modified] info to them in ChainMap, and use them as an indication for extraction
    // eslint-disable-next-line unicorn/consistent-function-scoping
    function analyzeChain(node: TSESTree.MemberExpression): string[] {
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
      const scopeData = getChainMap(scope);

      for (const [existingChain, chainInfo] of scopeData) {
        // Check if the existing chain starts with the modified chain followed by a dot or bracket, and if so, marks them as modified
        if (
          existingChain === chain ||
          existingChain.startsWith(chain + ".") ||
          existingChain.startsWith(chain + "[")
        ) {
          chainInfo.modified = true;
        }
      }
      if (!scopeData.has(chain)) {
        scopeData.set(chain, {
          count: 0,
          modified: true,
        });
      }
    }

    function processMemberExpression(node: TSESTree.MemberExpression) {
      // Skip nodes that are part of larger member expressions
      // Example: In a.b.c, we process the top-level MemberExpression only,
      // not the sub-expressions a.b or a
      if (node.parent?.type === AST_NODE_TYPES.MemberExpression) return;

      const chainInfo = analyzeChain(node);
      if (!chainInfo) return;

      const scope = sourceCode.getScope(node);
      const chainMap = getChainMap(scope);

      // keeps record of the longest valid chain, and only report it instead of shorter ones (to avoid repeated reports)
      let longestValidChain = "";

      // Update chain statistics for each part of the hierarchy
      for (const chain of chainInfo) {
        // Skip single-level chains
        if (!chain.includes(".")) continue;

        const chainInfo = chainMap.get(chain) || {
          count: 0,
          modified: false,
        };
        if (chainInfo.modified) break;

        chainInfo.count++;
        chainMap.set(chain, chainInfo);

        // record longest extractable chain
        if (
          chainInfo.count >= minOccurrences &&
          chain.length > longestValidChain.length
        ) {
          longestValidChain = chain;
        }
      }

      // report the longest chain
      if (longestValidChain && !reportedChains.has(longestValidChain)) {
        const chainInfo = chainMap.get(longestValidChain)!;
        context.report({
          node: node,
          messageId: "repeatedAccess",
          data: { chain: longestValidChain, count: chainInfo.count },
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
          for (const chain of chainInfo) {
            setModifiedFlag(chain, node);
          }
        }
      },

      // Track increment/decrement operations
      // Example: obj.prop.counter++ modifies "obj.prop.counter"
      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.argument);
          for (const chain of chainInfo) {
            setModifiedFlag(chain, node);
          }
        }
      },

      // Track function calls that might modify their arguments
      // Example: obj.methods.update() might modify the "obj.methods" chain
      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.callee);
          for (const chain of chainInfo) {
            setModifiedFlag(chain, node);
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

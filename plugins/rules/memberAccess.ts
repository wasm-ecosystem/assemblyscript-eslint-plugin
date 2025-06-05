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
  defaultOptions: [{ minOccurrences: 2 }],

  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const minOccurrences = options?.minOccurrences ?? 2;

    // Track which chains have already been reported to avoid duplicate reports
    const reportedChains = new Set<string>();

    type ScopeData = {
      chains: Map<
        string,
        {
          count: number; // Number of times this chain is accessed
          nodes: TSESTree.MemberExpression[]; // AST nodes where this chain appears
          modified: boolean; // Whether this chain is modified (written to)
        }
      >;
    };

    // Stores data for each scope using WeakMap to avoid memory leaks
    const scopeDataMap = new WeakMap<Scope.Scope, ScopeData>();

    function getScopeData(scope: Scope.Scope): ScopeData {
      // Creates new scope data if none exists
      // Example: First time seeing the function foo() { obj.prop.val; }
      // we create a new ScopeData for this function
      if (!scopeDataMap.has(scope)) {
        // Create new scope data
        const newScopeData = {
          chains: new Map<
            string,
            {
              count: number;
              nodes: TSESTree.MemberExpression[];
              modified: boolean;
            }
          >(),
        };

        scopeDataMap.set(scope, newScopeData);
      }

      return scopeDataMap.get(scope)!;
    }

    // This part analyzes and extracts member access chains from AST nodes
    //
    // Examples of chains:
    // - a.b.c → hierarchy: ["a", "a.b", "a.b.c"], fullChain: "a.b.c"
    // - foo["bar"].baz → hierarchy: ["foo", "foo[bar]", "foo[bar].baz"], fullChain: "foo[bar].baz"
    // - user.profile.settings.theme → hierarchy: ["user", "user.profile", "user.profile.settings"], fullChain: "user.profile.settings"
    interface ChainInfo {
      hierarchy: string[]; // Chain hierarchy (e.g., ["a", "a.b", "a.b.c"])
      fullChain: string; // Complete path (e.g., "a.b.c")
    }
    // Cache analyzed expressions to improve performance
    const chainCache = new WeakMap<
      TSESTree.MemberExpression,
      ChainInfo | null
    >();

    function analyzeChain(node: TSESTree.MemberExpression): ChainInfo | null {
      // Check cache first for performance
      // Example: If we've already analyzed a.b.c in a previous call,
      // we return the cached result immediately
      if (chainCache.has(node)) return chainCache.get(node)!;

      const parts: string[] = []; // Stores parts of the chain in reverse order
      let current: TSESTree.Node = node; // Current node in traversal
      let isValid = true; // Whether this chain is valid for optimization

      // Collect property chain (reverse order)
      // Example: For a.b.c, we'd collect ["c", "b", "a"] initially
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.computed) {
          // skip computed properties like obj["prop"] or arr[0] or obj[getKey()]
          isValid = false;
          break;
        } else {
          // Handle dot notation like obj.prop
          parts.push(current.property.name);
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
        parts.push(current.name); // Add base object name
      } else if (current.type === AST_NODE_TYPES.ThisExpression) {
        parts.push("this");
      } else {
        // Skip chains with non-identifier base objects
        // Example: (getObject()).prop is not optimized because function call results shouldn't be cached
        isValid = false;
      }

      // Validate chain
      if (!isValid || parts.length < 2) {
        chainCache.set(node, null);
        return null;
      }

      // Generate hierarchy chain (forward order)
      // Example: For parts ["c", "b", "a"], we reverse to ["a", "b", "c"]
      // and build hierarchy ["a", "a.b", "a.b.c"]
      parts.reverse();

      const hierarchy: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        let chain;
        // Create chain for each level
        // eslint-disable-next-line unicorn/prefer-ternary
        if (i === 0) {
          // First element is used directly
          // Example: For a.b.c, first element is "a"
          chain = parts[0];
        } else {
          // Build based on previous element
          // Example: "a" + "." + "b" = "a.b"
          chain = hierarchy[i - 1] + "." + parts[i];
        }
        hierarchy.push(chain);
      }

      const result = {
        hierarchy: hierarchy,
        fullChain: hierarchy.at(-1) ?? "", // Use last element or empty string
      };

      // Cache and return the result
      chainCache.set(node, result);
      return result;
    }

    // Tracks which chains are modified in code to avoid incorrect optimizations
    //
    // Examples of modifications:
    // 1. obj.prop = value;     // Direct assignment
    // 2. obj.prop++;           // Increment/decrement
    // 3. updateValues(obj.prop); // Potential modification through function call

    function trackModification(chain: string, node: TSESTree.Node) {
      const scope = sourceCode.getScope(node);
      const scopeData = getScopeData(scope);

      // Mark the modified chain and all its sub-chains as modified
      // Example: If "a.b" is modified, then "a.b.c", "a.b.c.d" etc. should also be considered invalid
      for (const [existingChain, record] of scopeData.chains) {
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
      // Mark the chain as modified regardless of it has been created or not!! Otherwise properties that get written will be reported in the first time, but they should not be reported.
      // Here is a more concrete example:
      // "this.vehicleSys!" should not be extracted as it is written later
      // this.vehicleSys!.automobile = new TransportCore(new TransportBlueprint()); // THIS line will get reported if we don't mark the chain as modified
      // this.vehicleSys!.automobile!.apple = new ChassisAssembly(new ChassisSchema());
      // this.vehicleSys!.automobile!.apple!.propulsionCover = new EngineEnclosure(new EnclosureSpec());
      if (scopeData.chains.has(chain)) {
        scopeData.chains.get(chain)!.modified = true;
      } else {
        scopeData.chains.set(chain, {
          count: 0,
          nodes: [],
          modified: true,
        });
      }
    }

    // Processing member expressions and identifying optimization opportunities
    // Examples:
    // - obj.prop.val accessed 3+ times → extract to variable
    // - obj.prop.val modified → don't extract
    // - obj.prop.val used in different scopes → extract separately in each scope
    function processMemberExpression(node: TSESTree.MemberExpression) {
      // Skip nodes that are part of larger member expressions
      // Example: In a.b.c, we process the top-level MemberExpression only,
      // not the sub-expressions a.b or a
      if (node.parent?.type === AST_NODE_TYPES.MemberExpression) return;

      const chainInfo = analyzeChain(node);
      if (!chainInfo) return;

      const scope = sourceCode.getScope(node);
      const scopeData = getScopeData(scope);

      // keeps record of the longest valid chain, and only report it instead of shorter ones (to avoid repeated reports)
      let longestValidChain = "";

      // Update chain statistics for each part of the hierarchy
      for (const chain of chainInfo.hierarchy) {
        // Skip single-level chains
        if (!chain.includes(".")) continue;

        // Skip any chain that contains array access
        if (chain.includes("[") && chain.includes("]")) continue;

        const record = scopeData.chains.get(chain) || {
          count: 0,
          nodes: [],
          modified: false,
        };
        if (record.modified) continue;

        record.count++;
        record.nodes.push(node);
        scopeData.chains.set(chain, record);

        // record longest chain
        if (
          record.count >= minOccurrences &&
          chain.length > longestValidChain.length
        ) {
          longestValidChain = chain;
        }
      }

      // report the longest chain
      if (longestValidChain && !reportedChains.has(longestValidChain)) {
        const record = scopeData.chains.get(longestValidChain)!;
        context.report({
          node: record.nodes[0],
          messageId: "repeatedAccess",
          data: { chain: longestValidChain, count: record.count },
        });
        reportedChains.add(longestValidChain);
      }
    }

    // ======================
    // Rule Listeners
    // ======================
    // These event handlers process different AST node types and track chain usage
    //
    // Examples of what each listener detects:
    // - MemberExpression: obj.prop.val
    // - AssignmentExpression: obj.prop.val = 5
    // - UpdateExpression: obj.prop.val++
    // - CallExpression: obj.prop.method()
    return {
      // Track assignments that modify member chains
      // Example: obj.prop.val = 5 modifies the "obj.prop.val" chain
      // This prevents us from extracting chains that are modified
      AssignmentExpression: (node) => {
        if (node.left.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.left);
          if (chainInfo) {
            // Mark all parts of the chain as modified
            // Example: For obj.prop.val = 5, we mark "obj", "obj.prop",
            // and "obj.prop.val" as modified
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
          }
        }
      },

      // Track increment/decrement operations
      // Example: obj.prop.counter++ modifies "obj.prop.counter"
      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.argument);
          if (chainInfo) {
            // Mark all parts of the chain as modified
            // Example: For obj.prop.val++, we mark "obj", "obj.prop",
            // and "obj.prop.val" as modified
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
          }
        }
      },

      // Track function calls that might modify their arguments
      // Example: obj.methods.update() might modify the "obj.methods" chain
      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.callee);
          if (chainInfo) {
            // Mark all parts of the chain as potentially modified
            // Example: For obj.methods.update(), we mark "obj", "obj.methods", and "obj.methods.update" as potentially modified
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
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

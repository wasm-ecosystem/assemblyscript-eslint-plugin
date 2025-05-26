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
          maxChainDepth: { type: "number", minimum: 1, maximum: 5, default: 3 },
        },
      },
    ],
    messages: {
      repeatedAccess:
        "Member chain '{{ chain }}' accessed {{ count }} times. Extract to variable.",
      modifiedChain:
        "Cannot optimize '{{ chain }}' due to potential modification.",
    },
  },
  defaultOptions: [{ minOccurrences: 3, maxChainDepth: 3 }],

  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const minOccurrences = options?.minOccurrences ?? 3;
    const maxChainDepth = options?.maxChainDepth ?? 3;

    // ======================
    // Scope Management System
    // ======================
    type ScopeData = {
      chains: Map<
        string,
        {
          count: number;
          nodes: TSESTree.MemberExpression[];
          modified: boolean;
        }
      >;
      variables: Set<string>;
    };

    const scopeDataMap = new WeakMap<Scope.Scope, ScopeData>();

    function getScopeData(scope: Scope.Scope): ScopeData {
      if (!scopeDataMap.has(scope)) {
        scopeDataMap.set(scope, {
          chains: new Map(),
          variables: new Set(scope.variables.map((v) => v.name)),
        });
      }
      return scopeDataMap.get(scope)!;
    }

    // ======================
    // Path Analysis System
    // ======================
    interface ChainInfo {
      hierarchy: string[]; // Chain hierarchy (e.g., ["a", "a.b", "a.b.c"])
      fullChain: string; // Complete path (e.g., "a.b.c")
    }

    const chainCache = new WeakMap<
      TSESTree.MemberExpression,
      ChainInfo | null
    >();

    function analyzeChain(node: TSESTree.MemberExpression): ChainInfo | null {
      if (chainCache.has(node)) return chainCache.get(node)!;

      const parts: string[] = [];
      let current: TSESTree.Node = node;
      let isValid = true;

      // Collect property chain (reverse order)
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.computed) {
          if (current.property.type === AST_NODE_TYPES.Literal) {
            parts.push(`[${current.property.value}]`);
          } else {
            isValid = false;
            break;
          }
        } else {
          parts.push(current.property.name);
        }

        current = current.object;
      }

      // Handle base object
      if (current.type === AST_NODE_TYPES.Identifier) {
        parts.push(current.name);
      } else {
        isValid = false;
      }

      if (!isValid || parts.length > maxChainDepth + 1) {
        chainCache.set(node, null);
        return null;
      }

      // Generate hierarchy chain (forward order)
      parts.reverse();
      const reversedParts = parts;
      const hierarchy = reversedParts.reduce((acc, part, index) => {
        const chain = index === 0 ? part : `${acc[index - 1]}.${part}`;
        return [...acc, chain];
      }, [] as string[]);

      const result = {
        hierarchy: hierarchy.slice(0, maxChainDepth + 1),
        fullChain: hierarchy.at(-1) ?? "", // Add default empty string
      };

      chainCache.set(node, result);
      return result;
    }

    // ======================
    // Modification Tracking System
    // ======================
    const modificationRegistry = new Map<string, TSESTree.Node[]>();

    function trackModification(chain: string, node: TSESTree.Node) {
      if (!modificationRegistry.has(chain)) {
        modificationRegistry.set(chain, []);
      }
      modificationRegistry.get(chain)!.push(node);
    }

    // ======================
    // Variable Naming System
    // ======================
    function generateVarName(parts: string[], scope: Scope.Scope): string {
      const base = parts
        .map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1)))
        .join("")
        .replace(/[^a-zA-Z0-9]/g, "_");

      let name = base;
      let suffix = 1;
      const scopeData = getScopeData(scope);

      while (scopeData.variables.has(name)) {
        name = `${base}${suffix++}`;
      }

      scopeData.variables.add(name);
      return name;
    }

    // ======================
    // Core Processing Logic (Improved Hierarchy Tracking)
    // ======================
    function processMemberExpression(node: TSESTree.MemberExpression) {
      if (node.parent?.type === AST_NODE_TYPES.MemberExpression) return;

      const chainInfo = analyzeChain(node);
      if (!chainInfo) return;

      const scope = sourceCode.getScope(node);
      const scopeData = getScopeData(scope);

      // Update hierarchy chain statistics
      for (const chain of chainInfo.hierarchy) {
        const record = scopeData.chains.get(chain) || {
          count: 0,
          nodes: [],
          modified: false,
        };
        record.count++;
        record.nodes.push(node);
        scopeData.chains.set(chain, record);
      }

      // Check for optimal chain immediately
      const optimalChain = findOptimalChain(chainInfo.hierarchy, scopeData);
      if (
        optimalChain &&
        scopeData.chains.get(optimalChain)?.count === minOccurrences
      ) {
        reportOptimization(optimalChain, scopeData, scope);
      }
    }

    function findOptimalChain(
      hierarchy: string[],
      scopeData: ScopeData
    ): string | null {
      for (let i = hierarchy.length - 1; i >= 0; i--) {
        const chain = hierarchy[i];
        const record = scopeData.chains.get(chain);
        if (record && record.count >= minOccurrences) {
          return chain;
        }
      }
      return null;
    }

    // ======================
    // Optimization Reporting Logic
    // ======================
    function reportOptimization(
      chain: string,
      scopeData: ScopeData,
      scope: Scope.Scope
    ) {
      const record = scopeData.chains.get(chain)!;
      const modifications = modificationRegistry.get(chain) || [];
      const lastModification = modifications.at(-1);

      context.report({
        node: record.nodes[0],
        messageId: "repeatedAccess",
        data: {
          chain: chain,
          count: record.count,
        },
        *fix(fixer) {
          // Check for subsequent modifications
          if (
            lastModification &&
            lastModification.range[0] < record.nodes[0].range[0]
          ) {
            return;
          }

          // Generate variable name (based on chain hierarchy)
          const parts = chain.split(".");
          const varName = generateVarName(parts, scope);

          // Insert variable declaration
          const insertPosition = findInsertPosition(scope);
          yield fixer.insertTextBefore(
            insertPosition.node,
            `const ${varName} = ${chain};\n`
          );

          // Replace all matching nodes
          for (const memberNode of record.nodes) {
            const fullChain = analyzeChain(memberNode)?.fullChain;
            if (fullChain?.startsWith(chain)) {
              const remaining = fullChain.slice(chain.length + 1);
              yield fixer.replaceText(
                memberNode,
                `${varName}${remaining ? "." + remaining : ""}`
              );
            }
          }

          // Update scope information
          scopeData.variables.add(varName);
        },
      });
    }

    // ======================
    // Helper Functions
    // ======================
    function findInsertPosition(scope: Scope.Scope): {
      node: TSESTree.Node;
      isGlobal: boolean;
    } {
      if (scope.block.type === AST_NODE_TYPES.Program) {
        return { node: scope.block.body[0], isGlobal: true };
      }
      return {
        node: (scope.block as TSESTree.BlockStatement).body[0],
        isGlobal: false,
      };
    }

    // ======================
    // Rule Listeners
    // ======================
    return {
      MemberExpression: (node) => processMemberExpression(node),

      AssignmentExpression: (node) => {
        if (node.left.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.left);
          if (chainInfo) {
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
          }
        }
      },

      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.argument);
          if (chainInfo) {
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
          }
        }
      },

      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const chainInfo = analyzeChain(node.callee);
          if (chainInfo) {
            for (const chain of chainInfo.hierarchy)
              trackModification(chain, node);
          }
        }
      },
    };
  },
});

export default noRepeatedMemberAccess;

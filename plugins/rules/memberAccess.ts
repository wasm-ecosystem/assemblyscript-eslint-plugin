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
    schema: [],
    fixable: "code",
    messages: {
      repeatedAccess:
        "Member chain '{{ chain }}' is accessed multiple times. Extract to variable.",
    },
  },
  defaultOptions: [],

  create(context) {
    const sourceCode = context.sourceCode;

    // Track which chains have already been reported to avoid duplicate reports
    const reportedChains = new Set<string>();

    // Tree-based approach for storing member access chains
    // Each node represents a property in the chain (e.g., a -> b -> c for a.b.c)
    class ChainNode {
      private count: number = 0;
      private modified: boolean = false;
      private parent?: ChainNode;
      private children: Map<string, ChainNode> = new Map();

      constructor(parent?: ChainNode) {
        this.parent = parent;
        this.modified = this.parent?.modified || false;
      }

      get getCount(): number {
        return this.count;
      }

      get isModified(): boolean {
        return this.modified;
      }

      get getChildren(): Map<string, ChainNode> {
        return this.children;
      }

      incrementCount(): void {
        this.count++;
      }

      // Get or create child node
      getOrCreateChild(childName: string): ChainNode {
        if (!this.children.has(childName)) {
          this.children.set(childName, new ChainNode(this));
        }
        return this.children.get(childName)!;
      }

      // Mark this node and all its descendants as modified
      markAsModified(): void {
        this.modified = true;
        for (const child of this.children.values()) {
          child.markAsModified();
        }
      }
    }

    // Root node for the tree (per scope)
    class ChainTree {
      private root: ChainNode = new ChainNode();

      // Visitor function to navigate through property chain
      private visitChainPath(
        properties: string[],
        process: (node: ChainNode) => void
      ): ChainNode {
        let current = this.root;

        // Navigate/process node in the tree
        for (const prop of properties) {
          const child = current.getOrCreateChild(prop);
          current = child;
          process(current);
        }

        return current;
      }

      // Insert a chain path into the tree and increment counts
      insertChain(properties: string[]): void {
        this.visitChainPath(properties, (node) => {
          node.incrementCount();
        });
      }

      // Mark a chain and its descendants as modified
      markChainAsModified(properties: string[]): void {
        const targetNode = this.visitChainPath(properties, () => {});

        // Mark this node and all descendants as modified
        targetNode.markAsModified();
      }

      // Find any valid chain that meets the minimum occurrence threshold
      findValidChains() {
        const validChains: Array<{ chain: string }> = [];

        const dfs = (node: ChainNode, pathArray: string[]) => {
          // Only consider chains with more than one segment (has dots)
          if (pathArray.length > 1 && !node.isModified && node.getCount >= 2) {
            validChains.push({
              chain: pathArray.join("."),
            });
          }

          // Stop traversing if this node is modified
          if (node.isModified) {
            return;
          }

          // Recursively traverse children
          for (const [childName, child] of node.getChildren) {
            pathArray.push(childName);
            dfs(child, pathArray);
            pathArray.pop();
          }
        };

        // Start DFS from root with empty path array
        dfs(this.root, []);
        return validChains;
      }
    }

    // Stores mapping of scope to ChainTree
    const scopeDataMap = new WeakMap<Scope.Scope, ChainTree>();

    function getChainTree(scope: Scope.Scope): ChainTree {
      if (!scopeDataMap.has(scope)) {
        scopeDataMap.set(scope, new ChainTree());
      }
      return scopeDataMap.get(scope)!;
    }

    // This function generates ["a", "b", "c"] from a.b.c (just the property names)
    // The tree structure will handle the hierarchy automatically
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

      // Reverse to get forward order: ["a", "b", "c"]
      properties.reverse();
      return properties;
    }

    function setModifiedFlag(chain: string[], node: TSESTree.Node) {
      const scope = sourceCode.getScope(node);
      const chainTree = getChainTree(scope);
      chainTree.markChainAsModified(chain);
    }

    function processMemberExpression(node: TSESTree.MemberExpression) {
      // Skip nodes that are part of larger member expressions
      // Example: In a.b.c, we process the top-level MemberExpression only,
      // not the sub-expressions a.b or a
      if (node.parent?.type === AST_NODE_TYPES.MemberExpression) {
        return;
      }

      const properties = analyzeChain(node);
      if (!properties || properties.length === 0) {
        return;
      }

      const scope = sourceCode.getScope(node);
      const chainTree = getChainTree(scope);

      // Insert the chain into the tree (this will increment counts automatically)
      chainTree.insertChain(properties);

      // Find all valid chains to report
      const validChains = chainTree.findValidChains();
      for (const result of validChains) {
        if (!reportedChains.has(result.chain)) {
          context.report({
            node: node,
            messageId: "repeatedAccess",
            data: { chain: result.chain },
          });
          reportedChains.add(result.chain);
        }
      }
    }

    return {
      // Track assignments that modify member chains
      // Example: obj.prop.val = 5 modifies the "obj.prop.val" chain
      // This prevents us from extracting chains that are modified
      AssignmentExpression: (node) => {
        if (node.left.type === AST_NODE_TYPES.MemberExpression) {
          const properties = analyzeChain(node.left);
          setModifiedFlag(properties, node);
        }
      },

      // Track increment/decrement operations
      // Example: obj.prop.counter++ modifies "obj.prop.counter"
      UpdateExpression: (node) => {
        if (node.argument.type === AST_NODE_TYPES.MemberExpression) {
          const properties = analyzeChain(node.argument);
          setModifiedFlag(properties, node);
        }
      },

      // Track function calls that might modify their arguments
      // Example: obj.methods.update() might modify the "obj.methods" chain
      CallExpression: (node) => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          const properties = analyzeChain(node.callee);
          setModifiedFlag(properties, node);
        }
      },

      // Process member expressions to identify repeated patterns
      // Example: Catches obj.prop.val, user.settings.theme, etc.
      MemberExpression: (node) => processMemberExpression(node),
    };
  },
});

export default noRepeatedMemberAccess;

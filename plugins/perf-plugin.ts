import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
} from "@typescript-eslint/utils";

/**
 * ESlint plugin to detect possible issues that can have impact on performance
 * Reference: https://atc.bmwgroup.net/confluence/display/CDCDEV/AssemblyScript+Performance+Improvement
 */
const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

/**
 * Rule: Array Initializer
 * Avoid using [] to initialize variables
 * [] will create a temporary object in data section.
 * BAD
 * let v: i32[] = [];
 * GOOD
 * let v: i32[] = new Array();
 */
const arrayInitStyle: ESLintUtils.RuleModule<
  "preferArrayConstructor",
  [],
  unknown,
  ESLintUtils.RuleListener
> = createRule({
  name: "array-init-style",
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "Enforce using Array constructor for empty arrays",
    },
    messages: {
      preferArrayConstructor:
        "Please use new Array<{{ type }}>() to initialize an array",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        const typeAnnotation = node.id.typeAnnotation?.typeAnnotation;
        if (
          typeAnnotation?.type === "TSArrayType" &&
          typeAnnotation.elementType?.type === "TSTypeReference"
        ) {
          if (
            node.init?.type === "ArrayExpression" &&
            node.init.elements.length === 0
          ) {
            // Ensure node.init is not null before passing to fixer
            const initNode = node.init;
            const elementType = context.sourceCode.getText(
              typeAnnotation.elementType.typeName
            );
            context.report({
              node,
              messageId: "preferArrayConstructor",
              data: {
                type: elementType,
              },
              fix(fixer) {
                // initNode is guaranteed non-null here due to the outer check
                return fixer.replaceText(
                  initNode,
                  `new Array<${elementType}>()`
                );
              },
            });
          }
        }
      },
    };
  },
});

/**
 * Rule: Member Variable / Array Element Get
 * Avoid accessing member variables multiple times in the same context.
 * This can significantly increase code size (8% in some proxy-like usecases) and waste CPU!
 *
 * Implementation overview:
 * - For each outermost MemberExpression (e.g. ctx.data.v1), extract the "object chain" part (e.g. ctx.data).
 * - Only static properties and static indices are supported; dynamic properties are ignored.
 * - Use the current scope's range and the object chain as a unique key to count occurrences.
 * - When the same object chain is accessed more than once in the same scope (default threshold: 2), report a warning to suggest refactoring.
 * - This helps avoid repeated property lookups and encourages caching the result in a local variable.
 *
 * Example:
 *   const v1 = ctx.data.v1;
 *   const v2 = ctx.data.v2;
 * The rule will suggest extracting 'ctx.data' into a variable if accessed multiple times.
 */

// Define the type for the rule options
type NoRepeatedMemberAccessOptions = [
  {
    minOccurrences?: number;
  }?
];

const noRepeatedMemberAccess: ESLintUtils.RuleModule<
  "repeatedAccess", // Message ID type
  NoRepeatedMemberAccessOptions, // Options type
  unknown, // This parameter is often unused or unknown
  ESLintUtils.RuleListener // Listener type
> = createRule({
  name: "no-repeated-member-access",
  defaultOptions: [{ minOccurrences: 0 }], // Provide a default object matching the options structure
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid getting member variable multiple-times in the same context",
    },
    fixable: "code",
    messages: {
      repeatedAccess:
        "Try refactor member access to a variable (e.g. 'const temp = {{ path }};') to avoid possible performance loss",
    },
    schema: [
      {
        type: "object",
        properties: {
          minOccurrences: { type: "number", minimum: 2 },
        },
      },
    ],
  },
  create(context) {
    function getObjectChain(node: TSESTree.Node) {
      // node is the outermost MemberExpression, e.g. ctx.data.v1
      let current = node;
      const path: string[] = [];

      // Helper function to skip TSNonNullExpression nodes
      function skipTSNonNullExpression(
        node: TSESTree.Node
      ): TSESTree.Expression {
        if (node.type === "TSNonNullExpression") {
          return skipTSNonNullExpression(node.expression);
        }
        return node as TSESTree.Expression;
      }

      // First check if this is part of a switch-case statement
      let parent = node;
      while (parent && parent.parent) {
        parent = parent.parent;
        if (
          parent.type === AST_NODE_TYPES.SwitchCase &&
          parent.test &&
          (node === parent.test || isDescendant(node, parent.test))
        ) {
          return null; // Skip members used in switch-case statements
        }
      }

      // Helper function to check if a node is a descendant of another node
      function isDescendant(
        node: TSESTree.Node,
        possibleAncestor: TSESTree.Node
      ): boolean {
        let current = node.parent;
        while (current) {
          if (current === possibleAncestor) return true;
          current = current.parent;
        }
        return false;
      }

      // Traverse up to the second last member (object chain)
      while (
        (current && current.type === "MemberExpression") ||
        current.type === "TSNonNullExpression"
      ) {
        // Skip non-null assertions
        if (current.type === "TSNonNullExpression") {
          current = current.expression;
          continue;
        }

        // Only handle static property or static index
        if (current.computed) {
          // true means access with "[]"
          // false means access with "."
          if (current.property.type === "Literal") {
            // e.g. obj[1], obj["name"]
            path.unshift(`[${current.property.value}]`);
          } else {
            // Ignore dynamic property access
            // e.g. obj[var], obj[func()]
            return null;
          }
        } else {
          // e.g. obj.prop
          path.unshift(`.${current.property.name}`);
        }

        // Check if we've reached the base object
        let objExpr = current.object;
        if (objExpr?.type === "TSNonNullExpression") {
          objExpr = skipTSNonNullExpression(objExpr);
        }

        // If object is not MemberExpression, we've reached the base object
        if (!objExpr || objExpr.type !== "MemberExpression") {
          // Handle "this" expressions
          if (objExpr && objExpr.type === "ThisExpression") {
            path.unshift("this");

            // Skip reporting if the chain is just 'this.property'
            if (path.length <= 2) {
              return null;
            }

            path.pop(); // Remove the last property
            return path.join("").replace(/^\./, "");
          }

          // If object is Identifier, add it to the path
          if (objExpr && objExpr.type === "Identifier") {
            const baseName = objExpr.name;

            // Skip if the base looks like an enum/constant (starts with capital letter)
            if (
              baseName.length > 0 &&
              baseName[0] === baseName[0].toUpperCase()
            ) {
              return null; // Likely an enum or static class
            }

            path.unshift(baseName);
            // Remove the last property (keep only the object chain)
            path.pop();
            return path.join("").replace(/^\./, "");
          }
          return null;
        }
        current = objExpr;
      }
      return null;
    }
    const occurrences = new Map();
    const minOccurrences = context.options[0]?.minOccurrences || 2;

    return {
      MemberExpression(node) {
        // Only check the outermost member expression
        if (node.parent && node.parent.type === "MemberExpression") return;

        const objectChain = getObjectChain(node);
        if (!objectChain) return;

        const baseObjectName = objectChain.split(/[.[]/)[0];
        // Use scope range as part of the key
        const scope = context.sourceCode.getScope(node);
        if (!scope || !scope.block || !scope.block.range) return;

        let variable = null;
        let currentScope = scope;

        while (currentScope) {
          variable = currentScope.variables.find(
            (v) => v.name === baseObjectName
          );
          if (variable) break;

          const upperScope = currentScope.upper;
          if (!upperScope) break;
          currentScope = upperScope;
        }

        if (variable) {
          // check for const/enum/import
          const isConst = variable.defs.every(
            (def) => def.node && "kind" in def.node && def.node.kind === "const"
          );
          const isEnum = variable.defs.some(
            (def) =>
              (def.parent as TSESTree.Node)?.type ===
              AST_NODE_TYPES.TSEnumDeclaration
          );
          const isImport = variable.defs.some(
            (def) =>
              def.type === "ImportBinding" ||
              (def.node &&
                "type" in def.node &&
                def.node.type === AST_NODE_TYPES.ImportDeclaration)
          );
          if (isConst || isEnum || isImport) {
            return; // skip these types as extracting them won't be helpful
          }
        }

        const key = `${scope.block.range.join("-")}-${objectChain}`;

        const count = (occurrences.get(key) || 0) + 1;
        occurrences.set(key, count);

        if (count === minOccurrences) {
          context.report({
            node,
            messageId: "repeatedAccess",
            data: {
              path: objectChain,
              count: minOccurrences,
            },
          });
        }
      },
    };
  },
});

export default {
  rules: {
    "array-init-style": arrayInitStyle,
    "no-repeated-member-access": noRepeatedMemberAccess,
  },
};

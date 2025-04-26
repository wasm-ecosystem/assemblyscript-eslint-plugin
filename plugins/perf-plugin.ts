import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
  TSESLint,
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
 * Rule: No Repeated Member Access
 *
 * Description:
 * Detects and warns when member variables or properties are accessed multiple times
 * in the same scope. Repeated property access can significantly increase code size
 * (up to 8% in proxy-like use cases) and waste CPU cycles.
 *
 * Implementation:
 * 1. Identifies outermost MemberExpression nodes (e.g., ctx.data.value)
 * 2. Extracts the "object chain" part (e.g., ctx.data)
 * 3. Counts occurrences of the same chain in each scope
 * 4. Reports when occurrences exceed the threshold (default: 2)
 * 5. Suggests extracting the chain into a local variable
 *
 * Limitations:
 * - Only static properties and indices are supported
 * - Dynamic properties (obj[variable]) are ignored
 * - Constants, enums, and imports are skipped
 *
 * Example:
 *   // Bad - repeated access
 *   const v1 = ctx.data.v1;
 *   const v2 = ctx.data.v2;
 *
 *   // Good - extracted common chain
 *   const ctxData = ctx.data;
 *   const v1 = ctxData.v1;
 *   const v2 = ctxData.v2;
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
    // Store nodes for each object chain in each scope for auto-fixing
    const chainNodesMap = new Map<string, TSESTree.MemberExpression[]>();

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

        // Find variable in scope chain
        const variable = findVariableInScopeChain(scope, baseObjectName);

        // Skip certain variable types that shouldn't be extracted
        if (
          variable &&
          (isConstVariable(variable) ||
            isEnumVariable(variable) ||
            isImportVariable(variable))
        ) {
          return;
        }

        // Helper functions
        function findVariableInScopeChain(scope: TSESLint.Scope.Scope, name: string) {
          let currentScope: TSESLint.Scope.Scope | null = scope;
          while (currentScope) {
            const variable = currentScope.variables.find(
              (v) => v.name === name
            );
            if (variable) return variable;
            currentScope = currentScope.upper;
          }
          return null;
        }

        function isConstVariable(variable: TSESLint.Scope.Variable) {
          return variable.defs.every(
            (def) => def.node && "kind" in def.node && def.node.kind === "const"
          );
        }

        function isEnumVariable(variable: TSESLint.Scope.Variable) {
          return variable.defs.some(
            (def) =>
              (def.parent as TSESTree.Node)?.type ===
              AST_NODE_TYPES.TSEnumDeclaration
          );
        }

        function isImportVariable(variable: TSESLint.Scope.Variable) {
          return variable.defs.some(
            (def) =>
              def.type === "ImportBinding" ||
              (def.node &&
                "type" in def.node &&
                def.node.type === AST_NODE_TYPES.ImportDeclaration)
          );
        }

        const key = `${scope.block.range.join("-")}-${objectChain}`;

        // Store node for auto-fixing
        if (!chainNodesMap.has(key)) {
          chainNodesMap.set(key, []);
        }
        chainNodesMap.get(key)?.push(node as TSESTree.MemberExpression);

        const count = (occurrences.get(key) || 0) + 1;
        occurrences.set(key, count);

        if (count >= minOccurrences) {
          context.report({
            node,
            messageId: "repeatedAccess",
            data: {
              path: objectChain,
              count: count,
            },
            *fix(fixer) {
              const nodes = chainNodesMap.get(key);
              if (!nodes || nodes.length < minOccurrences) return;

              // Create a safe variable name based on the object chain
              const safeVarName = `_${objectChain.replace(
                /[^a-zA-Z0-9_]/g,
                "_"
              )}`;

              // Find the first statement containing the first instance
              let statement: TSESTree.Node = nodes[0];
              while (
                statement.parent &&
                ![
                  "Program",
                  "BlockStatement",
                  "StaticBlock",
                  "SwitchCase",
                ].includes(statement.parent.type)
              ) {
                statement = statement.parent;
              }

              // Check if the variable already exists in this scope
              const scope = context.sourceCode.getScope(nodes[0]);
              const variableExists = scope.variables.some(
                (v) => v.name === safeVarName
              );

              // Only insert declaration if variable doesn't exist
              if (!variableExists) {
                yield fixer.insertTextBefore(
                  statement,
                  `const ${safeVarName} = ${objectChain};\n`
                );
              }

              // Replace ALL occurrences, not just the current node
              for (const memberNode of nodes) {
                const objText = context.sourceCode.getText(memberNode.object);
                if (objText === objectChain) {
                  yield fixer.replaceText(memberNode.object, safeVarName);
                }
              }
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

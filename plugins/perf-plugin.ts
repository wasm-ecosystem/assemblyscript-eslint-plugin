import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

/**
 * ESlint plugin to detect possible issues that can have impact on performance
 * Reference: https://atc.bmwgroup.net/confluence/display/CDCDEV/AssemblyScript+Performance+Improvement
 */
const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

/**
 * Rule: Array Initializer
 * avoid to use [] to init variable
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
 * avoid to get member variable multiple-times in the same context.
 * it can significantly increase code size (8% in some proxy like usecase) and waste CPU!!!
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

      // Traverse up to the second last member (object chain)
      while (current && current.type === "MemberExpression") {
        // Only handle static property or static index
        if (current.computed) {
          if (current.property.type === "Literal") {
            path.unshift(`[${current.property.raw}]`);
          } else {
            // Ignore dynamic property access
            return null;
          }
        } else {
          path.unshift(`.${current.property.name}`);
        }
        // If object is not MemberExpression, we've reached the base object
        if (!current.object || current.object.type !== "MemberExpression") {
          // If object is Identifier, add it to the path
          if (current.object && current.object.type === "Identifier") {
            path.unshift(current.object.name);
            // Remove the last property (keep only the object chain)
            path.pop();
            return path.join("").replace(/^\./, "");
          }
          return null;
        }
        current = current.object;
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

        // Use scope range as part of the key
        const scope = context.sourceCode.getScope(node);
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

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

export default {
  rules: {
    "array-init-style": arrayInitStyle,
  },
};

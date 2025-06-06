import { ESLintUtils, AST_NODE_TYPES } from "@typescript-eslint/utils";
import createRule from "../utils/createRule.js";

/**
 * Rule: Array Initializer
 * Avoid using [] to initialize variables
 * [] will create a temporary object in data section.
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
          typeAnnotation?.type === AST_NODE_TYPES.TSArrayType &&
          typeAnnotation.elementType?.type === AST_NODE_TYPES.TSTypeReference &&
          node.init?.type === AST_NODE_TYPES.ArrayExpression &&
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
              return fixer.replaceText(initNode, `new Array<${elementType}>()`);
            },
          });
        }
      },
    };
  },
});

export default arrayInitStyle;

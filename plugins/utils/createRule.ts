import { ESLintUtils } from "@typescript-eslint/utils";

/**
 * Helper function to create ESLint rules with documentation URLs.
 */
const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/wasm-ecosystem/assemblyscript-eslint-plugin/blob/main/docs/rules/${name}.md`
);

export default createRule;

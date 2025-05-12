/**
 * AssemblyScript ESLint Plugin
 *
 * This plugin provides rules for validating AssemblyScript code.
 * It detects patterns that are either not supported in AssemblyScript
 * or violate best practices specific to the language.
 */
import dontOmitElse from "./rules/dont-omit-else.js";
import noSpread from "./rules/no-spread.js";
import noUnsupportedKeyword from "./rules/no-unsupported-keyword.js";

export default {
  rules: {
    "dont-omit-else": dontOmitElse,
    "no-spread": noSpread,
    "no-unsupported-keyword": noUnsupportedKeyword,
  },
};

/**
 * AssemblyScript ESLint Plugin
 *
 * This plugin provides rules for validating AssemblyScript code.
 * It detects patterns that are either not supported in AssemblyScript
 * or violate best practices specific to the language.
 */
import dontOmitElse from "./rules/dontOmitElse.js";
import noConcatString from "./rules/noConcatString.js";
import noSpread from "./rules/noSpread.js";
import noUnsupportedKeyword from "./rules/noUnsupportedKeyword.js";
import specifyType from "./rules/specifyType.js";

export default {
  rules: {
    "dont-omit-else": dontOmitElse,
    "no-spread": noSpread,
    "no-unsupported-keyword": noUnsupportedKeyword,
    "specify-type": specifyType,
    "no-concat-string": noConcatString,
  },
};

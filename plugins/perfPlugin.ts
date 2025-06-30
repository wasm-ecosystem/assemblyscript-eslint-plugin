/**
 * Performance ESLint Plugin for AssemblyScript
 *
 * This plugin provides rules for detecting and fixing potential performance issues
 * in AssemblyScript code.
 */
import arrayInitStyle from "./rules/arrayInitStyle.js";
import noRepeatedMemberAccess from "./rules/memberAccess.js";

export default {
  rules: {
    "array-init-style": arrayInitStyle,
    "no-repeated-member-access": noRepeatedMemberAccess,
  },
};

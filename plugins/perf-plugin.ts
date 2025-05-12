/**
 * Performance ESLint Plugin for AssemblyScript
 *
 * This plugin provides rules for detecting and fixing potential performance issues
 * in AssemblyScript code.
 */
import arrayInitStyle from "./rules/array-init-style.js";

export default {
  rules: {
    "array-init-style": arrayInitStyle,
  },
};

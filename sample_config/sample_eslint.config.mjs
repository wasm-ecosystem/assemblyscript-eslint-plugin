// Import necessary modules for flat config
import tsParser from "@typescript-eslint/parser";
// Import the local plugin using ES Module syntax
import localPlugin from "../index.js"; // Assumes index.js is the entry point
// npx eslint --config "$CONFIG_FILE" "${TARGET_DIR}/**/*.ts"
const allPluginRules = {};
const pluginName = "assemblyscript"; // Use the plugin name defined in bash

// Access rules from the default export of the plugin module
if (localPlugin && localPlugin.rules) {
  for (const ruleName in localPlugin.rules) {
    // Construct the full rule name: 'plugin-name/rule-name'
    allPluginRules[`${pluginName}/${ruleName}`] = "warn"; // Set default severity
  }
} else {
  console.warn(
    `Plugin '${pluginName}' loaded from ./index.js does not seem to export rules correctly.`
  );
}

// Export the flat config array
export default [
  {
    // Apply to TypeScript files in the target directory
    files: ["sample_cases/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    // Define the plugin using the imported object
    plugins: {
      [pluginName]: localPlugin,
    },
    // Apply the dynamically generated rules
    rules: {
      allPluginRules,
      "no-implicit-globals": ["warn"],
      curly: ["error", "all"], // All statements with a sub-block must use curly braces, in particular one-liner if-statements. Code without braces is error prone, in particular when a second statement needs to be added.
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            String: {
              message: "use 'string' instead",
              fixWith: "string",
            },
            Boolean: {
              message: "use 'bool' instead",
              fixWith: "bool",
            },
            undefined: { message: "not supported." },
            object: { message: "not supported." },
          },
        },
      ],
      "@typescript-eslint/adjacent-overload-signatures": "error", // have the overloads next to each other
    },
  },
];

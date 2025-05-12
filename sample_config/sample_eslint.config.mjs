// Import necessary modules for flat config
import tsParser from '@typescript-eslint/parser';
// Import the local plugin using ES Module syntax
import localPlugin from '../index.js'; // Assumes index.js is the entry point

const allPluginRules = {};
const pluginName = 'assemblyscript'; // Use the plugin name defined in bash

// Access rules from the default export of the plugin module
if (localPlugin && localPlugin.rules) {
  for (const ruleName in localPlugin.rules) {
    // Construct the full rule name: 'plugin-name/rule-name'
    allPluginRules[`${pluginName}/${ruleName}`] = 'warn'; // Set default severity
  }
} else {
   console.warn(`Plugin '${pluginName}' loaded from ./index.js does not seem to export rules correctly.`);
}

// Export the flat config array
export default [
  {
    // Apply to TypeScript files in the target directory
    files: ["sample_cases/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    // Define the plugin using the imported object
    plugins: {
      [pluginName]: localPlugin,
    },
    // Apply the dynamically generated rules
    rules: allPluginRules,
  }
];

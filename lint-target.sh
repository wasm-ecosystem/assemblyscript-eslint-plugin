#!/bin/bash

# Script to lint a target directory using the local assemblyscript-eslint-plugin

set -e # Exit immediately if a command exits with a non-zero status.

TARGET_DIR="$1"
# Use .mjs for ES Module flat config
CONFIG_FILE=".eslintrc.tmp.mjs"
PLUGIN_NAME="assemblyscript" # Plugin name prefix used in rules

# Check if target directory is provided
if [ -z "$TARGET_DIR" ]; then
  echo "Usage: $0 <directory-to-lint>"
  exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Directory '$TARGET_DIR' not found."
  exit 1
fi

# Create a temporary ESLint flat config file (.mjs)
cat > "$CONFIG_FILE" << EOL
// Import necessary modules for flat config
import path from 'path';
import { fileURLToPath } from 'url';
import tsParser from '@typescript-eslint/parser';
// Import the local plugin using ES Module syntax
import localPlugin from './index.js'; // Assumes index.js is the entry point

// Helper to get current directory in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allPluginRules = {};
const pluginName = '${PLUGIN_NAME}'; // Use the plugin name defined in bash

// Access rules from the default export of the plugin module
if (localPlugin && localPlugin.rules) {
  for (const ruleName in localPlugin.rules) {
    // Construct the full rule name: 'plugin-name/rule-name'
    allPluginRules[\`\${pluginName}/\${ruleName}\`] = 'warn'; // Set default severity
  }
} else {
   console.warn(\`Plugin '\${pluginName}' loaded from ./index.js does not seem to export rules correctly.\`);
}

// Export the flat config array
export default [
  {
    // Apply to TypeScript files in the target directory
    files: ["${TARGET_DIR}/**/*.ts"],
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
EOL

echo "Linting directory: $TARGET_DIR with dynamically generated flat config $CONFIG_FILE"

# Run ESLint using npx
# ESLint v9+ should automatically detect eslint.config.js or use --config flag
# Ensure @typescript-eslint/parser is installed as a dev dependency
if npx eslint --config "$CONFIG_FILE" "${TARGET_DIR}/**/*.ts"; then
  echo "Linting completed successfully."
  EXIT_CODE=0
else
  echo "Linting failed."
  EXIT_CODE=1
fi

# Clean up the temporary config file
rm "$CONFIG_FILE"
echo "Removed temporary config file: $CONFIG_FILE"

exit $EXIT_CODE

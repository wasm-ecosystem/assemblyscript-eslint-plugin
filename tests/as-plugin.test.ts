/**
 * Main test file for AssemblyScript ESLint Plugin
 *
 * This file imports and runs individual rule tests from the rules directory.
 */
import { describe } from "mocha";

// Import individual rule tests to run them as part of the test suite
import "./rules/dont-omit-else.test.js";
import "./rules/no-spread.test.js";
import "./rules/no-unsupported-keyword.test.js";

describe("AssemblyScript ESLint Plugin", () => {
  // Test suite is composed of individual rule tests imported above
});

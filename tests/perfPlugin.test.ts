/**
 * Main test file for AssemblyScript Performance ESLint Plugin
 *
 * This file imports and runs individual rule tests from the rules directory.
 */
import { describe } from "mocha";

// Import individual rule tests to run them as part of the test suite
import "./rules/arrayInitStyle.test.js";

describe("AssemblyScript Performance ESLint Plugin", () => {
  // Test suite is composed of individual rule tests imported above
  it("loads all rule tests successfully", () => {});
});

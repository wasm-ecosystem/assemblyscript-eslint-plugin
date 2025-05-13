/**
 * Main test file for AssemblyScript ESLint Plugin
 *
 * This file imports and runs individual rule tests from the rules directory.
 */
import { describe, it } from "mocha";

// Import individual rule tests to run them as part of the test suite
import "./rules/dontOmitElse.test.js";
import "./rules/noSpread.test.js";
import "./rules/noUnsupportedKeyword.test.js";
import "./rules/arrayInitStyle.test.js";

describe("AssemblyScript ESLint Plugin", () => {
  // Test suite is composed of individual rule tests imported above
  it("loads all rule tests successfully", () => {});
});

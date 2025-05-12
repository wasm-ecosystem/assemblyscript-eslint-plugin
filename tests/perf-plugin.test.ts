import { describe, it, after } from "mocha";
import { RuleTester } from "@typescript-eslint/rule-tester";

import perfPlugin from "../plugins/perf-plugin.js";

// Map RuleTester methods to Mocha methods
RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// Create rule tester
const createRuleTester = () => new RuleTester();
RuleTester.afterAll = () => {};


describe("AssemblyScript Performance ESLint Plugin", () => {
  describe("Rule: array-init-style", () => {
    const ruleTester = createRuleTester();

    it("enforces using Array constructor for empty arrays", () => {
      ruleTester.run("array-init-style", perfPlugin.rules["array-init-style"], {
        valid: [
          // Valid case: using Array constructor
          {
            code: `const x: i32[] = new Array<i32>();`,
          },
        ],
        invalid: [
          // Invalid case: using empty array literal
          {
            code: "const a: i32[] = [];",
            output: "const a: i32[] = new Array<i32>();",
            errors: [{ messageId: "preferArrayConstructor" }],
          },
        ],
      });
    });
  });
});
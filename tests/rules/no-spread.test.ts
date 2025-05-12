import { describe, it } from "mocha";
import { createRuleTester } from "../utils/test-utils.js";
import noSpread from "../../plugins/rules/no-spread.js";

describe("Rule: no-spread", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for no-spread rule", () => {
    ruleTester.run("no-spread", noSpread, {
      valid: [
        // Valid case: normal function call
        "foo(bar)",
        // Valid case: function call with multiple arguments
        "foo(1, bar)",
      ],
      invalid: [
        // Invalid case: spread in function call
        {
          code: "foo(...bar)",
          errors: [{ messageId: "noSpreadMsg" }],
        },
        // Invalid case: spread with other arguments
        {
          code: "foo(1, ...bar)",
          errors: [{ messageId: "noSpreadMsg" }],
        },
        // Invalid case: spread in array literal
        {
          code: "let a = [1, ...bar, 3];",
          errors: [{ messageId: "noSpreadMsg" }],
        },
      ],
    });
  });
});

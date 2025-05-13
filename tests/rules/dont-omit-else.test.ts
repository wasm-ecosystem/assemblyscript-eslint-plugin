import { describe, it } from "mocha";
import { createRuleTester } from "../utils/test-utils.js";
import dontOmitElse from "../../plugins/rules/dont-omit-else.js";

describe("Rule: dont-omit-else", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for dont-omit-else rule", () => {
    ruleTester.run("dont-omit-else", dontOmitElse, {
      valid: [
        // Valid case: if with else block
        `
        if (b) {}
        else {}
        `,
        // Valid case: else-if chain - should be skipped by isElseIf check
        `
        if (a) {
          doSomething();
        } else if (b) {
          doSomethingElse(); 
        }
        `,
        // Valid case: else-if-else chain
        `
        if (a) {
          doSomething();
        } else if (b) {
          doSomethingElse();
        } else {
          doDefault();
        }
        `,
        // Valid case: function with early return
        `
        function foo() {
          if (b) {
            return 1;
          }
        }
        `,
        // Valid case: function with throw statement
        `
        function foo() {
          if (b) {
            throw new Error("fail");
          }
        }
        `,
        // Valid case: loop with break statement
        `
        while (true) {
          if (b) {
            break;
          }
        }
        `,
        // Valid case: loop with continue statement
        `
        for (let i = 0; i < 10; i++) {
          if (b) {
            continue;
          }
        }
        `,
        // Valid case: nested if with else blocks
        `
        if (a) {
          if (b) {
            return;
          } else {
            doSomething();
          }
        } else {
          doSomethingElse();
        }
        `,
        // Valid case: single line return statement
        `
        if (b) return 1;
        `,
      ],
      invalid: [
        // Invalid case: if without else
        {
          code: `
          if (b) {
            doSomething();
          }
          `,
          errors: [{ messageId: "omittedElse" }],
        },
        // Invalid case: empty if without else
        {
          code: `
          if (b) {}
          `,
          errors: [{ messageId: "omittedElse" }],
        },
        // Invalid case: single line if without else
        {
          code: `
          if (b) doSomething();
          `,
          errors: [{ messageId: "omittedElse" }],
        },
        // Invalid case: nested if statements without else
        {
          code: `
          if (a) {
            if (b) {
              doSomething();
            } // Inner if missing else
          } // Outer if missing else
          `,
          errors: [
            { messageId: "omittedElse" }, // Error for inner if
            { messageId: "omittedElse" }, // Error for outer if
          ],
        },
      ],
    });
  });
});

import { describe, it } from "mocha";
import { RuleTester } from "@typescript-eslint/rule-tester";

// Import AssemblyScript plugin
import asPlugin from "../plugins/as-plugin.js";

// Create a rule tester instance
const createRuleTester = () => new RuleTester();
RuleTester.afterAll = () => {};

describe("AssemblyScript ESLint Plugin", () => {
  describe("Rule: dont-omit-else", () => {
    const ruleTester = createRuleTester();

    it("validates all test cases for dont-omit-else rule", () => {
      ruleTester.run("dont-omit-else", asPlugin.rules["dont-omit-else"], {
        valid: [
          // Valid case: if with else block
          `
          if (b) {}
          else {}
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

  describe("Rule: no-rest-params", () => {
    const ruleTester = createRuleTester();

    it("validates all test cases for no-rest-params rule", () => {
      ruleTester.run("no-rest-params", asPlugin.rules["no-rest-params"], {
        valid: [
          // Valid case: normal array parameter in function
          "function foo(bar: u16[]): u16 { return 1337; }",
          // Valid case: Array generic parameter in function
          "function foo(bar: Array<u16>): u16 { return 1337;}",
          // Valid case: normal array parameter in arrow function
          "(bar: u16[]): u16 => { return 1337; }",
          // Valid case: Array generic parameter in arrow function
          "(bar: Array<u16>): u16 => { return 1337; }",
        ],
        invalid: [
          // Invalid case: rest parameter in function
          {
            code: "function foo(...bar: u16): u16 { return 1337; }",
            errors: [{ messageId: "noRestMsg" }],
          },
          // Invalid case: rest parameter in arrow function
          {
            code: "(...bar: u16): u16 => { return 1337; }",
            errors: [{ messageId: "noRestMsg" }],
          },
          // Invalid case: rest parameter with other parameters
          {
            code: "(foo: u16, ...bar: u16): u16 => { return 1337; }",
            errors: [{ messageId: "noRestMsg" }],
          },
        ],
      });
    });
  });

  describe("Rule: no-spread", () => {
    const ruleTester = createRuleTester();

    it("validates all test cases for no-spread rule", () => {
      ruleTester.run("no-spread", asPlugin.rules["no-spread"], {
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

  describe("Rule: no-unsupported-keyword", () => {
    const ruleTester = createRuleTester();

    it("validates all test cases for no-unsupported-keyword rule", () => {
      ruleTester.run(
        "no-unsupported-keyword",
        asPlugin.rules["no-unsupported-keyword"],
        {
          valid: [
            // Valid case: supported type annotation
            "let foo: string;",
            // Valid case: function with supported return type
            "function bar(): number { return 1; }",
            // Valid case: null type is supported
            "let baz: null = null;",
          ],
          invalid: [
            // Invalid case: undefined is not supported
            {
              code: "let foo: undefined;",
              errors: [{ messageId: "noUndefined" }],
            },
            // Invalid case: never is not supported
            {
              code: "function foo(): never { throw new Error('never'); }",
              errors: [{ messageId: "noNever" }],
            },
            // Invalid case: any is not supported
            {
              code: "function foo(a: any) {}",
              errors: [{ messageId: "noAny" }],
            },
          ],
        }
      );
    });
  });
});

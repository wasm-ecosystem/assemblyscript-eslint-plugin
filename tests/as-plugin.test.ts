import * as test from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";

// Import without the .js extension
import asPlugin from "../plugins/as-plugin.js";

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;
RuleTester.itOnly = test.it.only;

// Specify parser options if needed, especially if your code uses TS features
const ruleTester = new RuleTester();

ruleTester.run("dont-omit-else", asPlugin.rules["dont-omit-else"], {
  valid: [
    // ... existing valid cases ...
    `
        if (b) {}
        else {}
      `,
    `
        function foo() {
          if (b) {
            return 1;
          }
        }
      `,
    `
        function foo() {
          if (b) {
            throw new Error("fail");
          }
        }
      `,
    `
        while (true) {
          if (b) {
            break;
          }
        }
      `,
    `
        for (let i = 0; i < 10; i++) {
          if (b) {
            continue;
          }
        }
      `,
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
    `
        if (b) return 1;
      `,
  ],
  invalid: [
    {
      code: `
          if (b) {
            doSomething();
          }
        `,
      errors: [
        // Use messageId
        { messageId: "omittedElse" },
      ],
    },
    {
      code: `
          if (b) {}
        `,
      errors: [
        // Use messageId
        { messageId: "omittedElse" },
      ],
    },
    {
      code: `
          if (b) doSomething();
        `,
      errors: [
        // Use messageId
        { messageId: "omittedElse" },
      ],
    },
    {
      code: `
          if (a) {
            if (b) {
              doSomething();
            } // Inner if missing else
          } // Outer if missing else
        `,
      errors: [
        // Use messageId for both errors
        { messageId: "omittedElse" }, // Error for inner if
        { messageId: "omittedElse" }, // Error for outer if
      ],
    },
  ],
});

ruleTester.run("no-rest-params", asPlugin.rules["no-rest-params"], {
  valid: [
    "function foo(bar: u16[]): u16 { return 1337; }",
    "function foo(bar: Array<u16>): u16 { return 1337;}",
    "(bar: u16[]): u16 => { return 1337; }",
    "(bar: Array<u16>): u16 => { return 1337; }",
  ],
  invalid: [
    {
      code: "function foo(...bar: u16): u16 { return 1337; }",
      errors: [
        // Use messageId
        { messageId: "noRestMsg" },
      ],
    },
    {
      code: "(...bar: u16): u16 => { return 1337; }",
      errors: [
        // Use messageId
        { messageId: "noRestMsg" },
      ],
    },
    {
      code: "(foo: u16, ...bar: u16): u16 => { return 1337; }",
      errors: [
        // Use messageId
        { messageId: "noRestMsg" },
      ],
    },
  ],
});

ruleTester.run("no-spread", asPlugin.rules["no-spread"], {
  valid: ["foo(bar)", "foo(1, bar)"],
  invalid: [
    {
      code: "foo(...bar)",
      // Use messageId
      errors: [{ messageId: "noSpreadMsg" }],
    },
    {
      code: "foo(1, ...bar)",
      // Use messageId
      errors: [{ messageId: "noSpreadMsg" }],
    },
    {
      code: "let a = [1, ...bar, 3];",
      // Use messageId
      errors: [{ messageId: "noSpreadMsg" }],
    },
  ],
});

ruleTester.run(
  "no-unsupported-keyword",
  asPlugin.rules["no-unsupported-keyword"],
  {
    // Add valid cases if any, e.g., code that doesn't use the keywords
    valid: [
        "let foo: string;",
        "function bar(): number { return 1; }",
        "let baz: null = null;"
    ],
    invalid: [
      {
        code: "let foo: undefined;",
        // Use messageId
        errors: [{ messageId: "noUndefined" }],
      },
      {
        code: "function foo(): never { throw new Error('never'); }", // Added throw for valid TS
        // Use messageId
        errors: [{ messageId: "noNever" }],
      },
      {
        code: "function foo(a: any) {}",
        // Use messageId
        errors: [{ messageId: "noAny" }],
      },
    ],
  }
);
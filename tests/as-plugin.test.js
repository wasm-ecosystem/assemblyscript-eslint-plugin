import * as test from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";

import asPlugin from "../plugins/as-plugin.js";

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;
RuleTester.itOnly = test.it.only;

const ruleTester = new RuleTester();

ruleTester.run("dont-omit-else", asPlugin.rules["dont-omit-else"], {
  valid: [
    `
        if (b) {}
        else {}
      `,
    // if branch ends with return
    `
        function foo() {
          if (b) {
            return 1;
          }
          // no else needed
        }
      `,
    // if branch ends with throw
    `
        function foo() {
          if (b) {
            throw new Error("fail");
          }
        }
      `,
    // if branch ends with break
    `
        while (true) {
          if (b) {
            break;
          }
        }
      `,
    // if branch ends with continue
    `
        for (let i = 0; i < 10; i++) {
          if (b) {
            continue;
          }
        }
      `,
    // nested if with proper else
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
    // single statement with return
    `
        if (b) return 1;
      `,
  ],
  invalid: [
    // if branch does not end with control flow and no else
    {
      code: `
          if (b) {
            doSomething();
          }
        `,
      errors: [
        {
          message: `Omitted else block is not allowed unless if branch contains control flow.`,
        },
      ],
    },
    // if branch is empty and no else
    {
      code: `
          if (b) {}
        `,
      errors: [
        {
          message: `Omitted else block is not allowed unless if branch contains control flow.`,
        },
      ],
    },
    // single statement, not control flow
    {
      code: `
          if (b) doSomething();
        `,
      errors: [
        {
          message: `Omitted else block is not allowed unless if branch contains control flow.`,
        },
      ],
    },
    // nested if, inner if missing else and not ending with control flow
    {
      code: `
          if (a) {
            if (b) {
              doSomething();
            }
          }
        `,
      errors: [
        {
          message: `Omitted else block is not allowed unless if branch contains control flow.`,
        },
        {
          message: `Omitted else block is not allowed unless if branch contains control flow.`,
        },
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
        {
          message:
            "Don't use rest params, it's not supported in assemblyscript",
        },
      ],
    },
    {
      code: "(...bar: u16): u16 => { return 1337; }",
      errors: [
        {
          message:
            "Don't use rest params, it's not supported in assemblyscript",
        },
      ],
    },
    {
      code: "(foo: u16, ...bar: u16): u16 => { return 1337; }",
      errors: [
        {
          message:
            "Don't use rest params, it's not supported in assemblyscript",
        },
      ],
    },
  ],
});

ruleTester.run("no-spread", asPlugin.rules["no-spread"], {
  valid: ["foo(bar)", "foo(1, bar)"],
  invalid: [
    {
      code: "foo(...bar)",
      errors: [{ message: "Spreads are not supported." }],
    },
    {
      code: "foo(1, ...bar)",
      errors: [{ message: "Spreads are not supported." }],
    },
    {
      code: "let a = [1, ...bar, 3];",
      errors: [{ message: "Spreads are not supported." }],
    },
  ],
});

ruleTester.run(
  "no-unsupported-keyword",
  asPlugin.rules["no-unsupported-keyword"],
  {
    valid: [],
    invalid: [
      {
        code: "let foo: undefined;",
        errors: [{ message: "undefined is not supported." }],
      },
      {
        code: "function foo(): never",
        errors: [{ message: "never is not supported." }],
      },
      {
        code: "function foo(a: any)",
        errors: [{ message: "any is not supported." }],
      },
    ],
  }
);

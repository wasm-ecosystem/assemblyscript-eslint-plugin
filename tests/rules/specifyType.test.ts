import { createRuleTester } from "../utils/testUtils.js";
import { describe, it } from "mocha";
import specifyType from "../../plugins/rules/specifyType.js";

describe("Rule: specifyType", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for specifyType rule", () => {
    ruleTester.run("specify-type", specifyType, {
      valid: [
        // Variables with type annotations are always valid
        "const x: number = 5;",
        "const arr: number[] = [1, 2, 3];",
        "let y: string;",
        "var z: boolean = true;",
        "const mileage: f32 = 5.3;",

        // Constants with non-numeric initializers don't require type annotations
        "const str = 'hello';",
        "const bool = true;",
        "const obj = { a: 1 };",
        "const fn = () => {};",
        "const regex = /test/;",

        // Array without numbers doesn't need type annotation
        "const strArray = ['a', 'b', 'c'];",

        // Type annotations inferred from complex expressions
        "const x = String(123);",
        "const y = Boolean(1);",
        "const arr = Array.from([1, 2, 3]);",
      ],
      invalid: [
        // Missing type annotation with no initialization
        {
          code: "let count;",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "var total;",
          errors: [{ messageId: "missingType" }],
        },

        // Number literals require type annotations
        {
          code: "const age = 30;",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "const price = 19.99;",
          errors: [{ messageId: "missingType" }],
        },

        // Array literals containing numbers require type annotations
        {
          code: "const scores = [75, 82, 90];",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "const mixed = ['a', 1, true];",
          errors: [{ messageId: "missingType" }],
        },

        // Non-const variables always require type annotations
        {
          code: "let name = 'John';",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "var enabled = false;",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "let items = ['apple', 'banana'];",
          errors: [{ messageId: "missingType" }],
        },

        // WebAssembly-specific numeric cases
        {
          code: "const distance = 10.5;",
          errors: [{ messageId: "missingType" }],
        },
        {
          code: "const count = 0;",
          errors: [{ messageId: "missingType" }],
        },
      ],
    });
  });
});

import { describe, it } from "mocha";
import { createRuleTester } from "../utils/test-utils.js";
import arrayInitStyle from "../../plugins/rules/array-init-style.js";

describe("Rule: array-init-style", () => {
  const ruleTester = createRuleTester();

  it("enforces using Array constructor for empty arrays", () => {
    ruleTester.run("array-init-style", arrayInitStyle, {
      valid: [
        // Valid case: using Array constructor
        {
          code: `const x: i32[] = new Array<i32>();`,
        },
        // Valid case: non-empty array initialization
        {
          code: `const x: i32[] = [1, 2, 3];`,
        },
        // Valid case: array without type annotation
        {
          code: `const x = [];`,
        },
      ],
      invalid: [
        // Invalid case: using empty array literal with type annotation
        {
          code: "const a: i32[] = [];",
          output: "const a: i32[] = new Array<i32>();",
          errors: [{ messageId: "preferArrayConstructor" }],
        },
        // Invalid case: using empty array literal with custom type
        {
          code: "const b: MyType[] = [];",
          output: "const b: MyType[] = new Array<MyType>();",
          errors: [{ messageId: "preferArrayConstructor" }],
        },
      ],
    });
  });
});

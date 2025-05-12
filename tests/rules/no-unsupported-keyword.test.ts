import { describe, it } from "mocha";
import { createRuleTester } from "../utils/test-utils.js";
import noUnsupportedKeyword from "../../plugins/rules/no-unsupported-keyword.js";

describe("Rule: no-unsupported-keyword", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for no-unsupported-keyword rule", () => {
    ruleTester.run("no-unsupported-keyword", noUnsupportedKeyword, {
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
    });
  });
});

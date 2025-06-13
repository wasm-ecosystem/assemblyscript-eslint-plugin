import { describe, it } from "mocha";
import { createRuleTester } from "../utils/testUtils.js";
import noRepeatedMemberAccess from "../../plugins/rules/memberAccess.js";

describe("Rule: no-spread", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for no-repeated-member-access rule", () => {
    ruleTester.run("no-repeated-member-access", noRepeatedMemberAccess, {
      valid: [
        `
        const x=a.b.c;
        `,
      ],

      invalid: [],
    });
  });
});

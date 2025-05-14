import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it, after } from "mocha";

// Map RuleTester methods to Mocha methods
RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// Create rule tester
export const createRuleTester = () => new RuleTester();

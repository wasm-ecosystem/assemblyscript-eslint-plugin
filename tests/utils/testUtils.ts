import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it, after } from "mocha";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Map RuleTester methods to Mocha methods
RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create rule tester with TypeScript type information support
export const createRuleTester = () =>
  new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Point to the project root directory
        tsconfigRootDir: resolve(__dirname, "../.."),
        // Use projectService instead of project to handle temporary files
        projectService: {
          allowDefaultProject: ["*.ts", "*.js"],
        },
      },
    },
  });

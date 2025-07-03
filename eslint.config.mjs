import tseslint from "typescript-eslint";
// @ts-expect-error Missing type definitions
import { baseConfig } from "@schleifner/eslint-config-base/config.mjs";

export default tseslint.config(
  {
    ignores: ["dist/**", "**/*.mjs"],
  },
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      curly: ["error", "all"]
    },
  }
);

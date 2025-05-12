import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "dist/**",
      "reference/**",
      "sample_cases/**",
      "sample_config/**",
      "build/**",
      "wasm-toolchain/**",
      "coverage/**",
      ".github/**",
      "**/*.json",
      "**/*.md",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended
);

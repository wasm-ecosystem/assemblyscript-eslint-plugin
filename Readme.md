# ESLint Plugin for AssemblyScript

An ESLint plugin that helps developers write better AssemblyScript code by enforcing language-specific rules and best practices.

## Overview

This plugin provides two sets of rules:

- **Language Standards**: Rules that enforce AssemblyScript language restrictions and prevent errors
- **Performance Optimization**: Rules that help improve code performance in WebAssembly

## Plugins Included

### Standard Rules (`asPlugin.ts`)

Enforces AssemblyScript language compatibility:

- `dont-omit-else`: Requires explicit `else` blocks for conditionals that don't have early return statements
- `no-spread`: Prevents use of spread syntax (`...`) which is not supported in AssemblyScript
- `no-unsupported-keyword`: Disallows TypeScript keywords not supported in AssemblyScript (`any`, `never`, `undefined`)

### Performance Rules (`perfPlugin.ts`)

Optimizes code for better WebAssembly performance:

- `array-init-style`: Recommends using `new Array<T>()` instead of `[]` for initializing empty arrays

## Configuration

See `sample_config/sample_eslint.config.mjs` for a detailed example of how to configure and use this plugin.

## Documentation

For detailed rule documentation, see the [docs/rules](./docs/rules) directory.

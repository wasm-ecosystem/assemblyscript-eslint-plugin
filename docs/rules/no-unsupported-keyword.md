# no-unsupported-keyword

> Disallow TypeScript keywords that are not supported in AssemblyScript

## Rule Details

AssemblyScript is a subset of TypeScript that compiles to WebAssembly, but it doesn't support all TypeScript features. This rule identifies and reports the use of TypeScript keywords that are not supported in AssemblyScript, specifically:

- `never` type
- `any` type
- `undefined` type

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
// Using 'never' type
function alwaysThrows(): never {
  throw new Error("This function never returns");
}

// Using 'any' type
function acceptsAnything(param: any) {
  return param;
}

// Using 'undefined' type
let maybeValue: string | undefined;
```

### Correct

```ts
// Use specific return types instead of 'never'
function alwaysThrows(): void {
  throw new Error("This function never returns");
}

// Use explicit types instead of 'any'
function acceptsString(param: string): string {
  return param;
}

// Use nullable types instead of undefined
let maybeValue: string | null;
```

## When Not To Use

You should not disable this rule in AssemblyScript code, as using these unsupported keywords will cause compilation errors.

## Related Rules

None

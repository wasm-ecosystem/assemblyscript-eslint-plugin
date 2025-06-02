# specify-type

> Enforce explicit type annotations for variable declarations

## Rule Details

In AssemblyScript, explicit type annotations are crucial for WebAssembly compilation and performance optimization. This rule enforces that variables have explicit type annotations, especially for numeric types where JavaScript's dynamic typing doesn't distinguish between different WebAssembly numeric types (i32, f32, f64, etc.).

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
// Missing type annotation for numeric literal
const mileage = 5.3; // not recommended

// No type annotation and no initialization
let count; // not recommended

// Array with numeric literals without type annotation
const numbers = [1, 2, 3]; // not recommended

// Non-const variables without type annotation
let value = "hello"; // not recommended
var index = 0; // not recommended
```

### Correct

```ts
// Explicit type annotation for numeric values
const mileage: f32 = 5.3; // recommended

// Explicit type annotation when no initialization
let count: i32; // recommended

// Array with explicit type annotation
const numbers: i32[] = [1, 2, 3]; // recommended
const numbers: i32[] = new Array<i32>(); // recommended

// Non-const variables with explicit type annotations
let value: string = "hello"; // recommended
var index: i32 = 0; // recommended

// Const variables with non-numeric types (type can be inferred)
const message = "hello"; // allowed for string literals
const isValid = true; // allowed for boolean literals
```

## Rationale

- **WebAssembly Type Safety**: AssemblyScript compiles to WebAssembly, which requires explicit typing
- **Performance**: Explicit types help the compiler generate optimized WebAssembly code
- **Numeric Type Distinction**: JavaScript numbers don't distinguish between i32, f32, f64, etc.
- **Code Clarity**: Explicit types make the intended data types clear to developers

## When Not To Use

This rule is specifically designed for AssemblyScript development. If you're writing regular TypeScript/JavaScript code, you might find this rule too restrictive. However, for AssemblyScript projects, explicit typing is strongly recommended for optimal compilation results.

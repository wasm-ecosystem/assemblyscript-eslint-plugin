# specify-type

> Enforce explicit type annotations for variable declarations

## Rule Details

In AssemblyScript, type annotations can impact WebAssembly compilation and performance optimization. This rule enforces explicit type annotations for:

1. **Floating point literals** - default inferred float type f64 will take more performance penalty, and can be replaced by explicitly specify f32 type.
2. **Uninitialized variables** - to ensure type safety

Integer literals are allowed to use AssemblyScript's default type inference (which infers `i32`), as this is typically the desired behavior and maintains good ergonomics.

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
// Missing type annotation for floating-point literal
const mileage = 5.3; // requires explicit f32 or f64 annotation

// No type annotation and no initialization
let count; // missing type annotation

// Array with floating-point literals without type annotation
const scores = [75.5, 82.3, 90.1]; // requires explicit type annotation
```

### Correct

```ts
// Explicit type annotation for floating-point values
const mileage: f32 = 5.3; // recommended - specifies precision
const pi: f64 = 3.14159; // or f64 for double precision

// Explicit type annotation when no initialization
let count: i32; // recommended

// Array with explicit type annotation
const scores: f32[] = [75.5, 82.3, 90.1]; // recommended
const numbers: i32[] = new Array<i32>(); // recommended

// Integer literals and const variables with non-numeric types (type can be inferred)
const numbers = [1, 2, 3]; // allowed - integers default to i32
const count = 42; // allowed - integer defaults to i32
const message = "hello"; // allowed - string literals
const isValid = true; // allowed - boolean literals
```

## Rationale

- **WebAssembly Type Safety**: AssemblyScript compiles to WebAssembly, which requires explicit typing for floating point values
- **Performance**: Explicit types help the compiler generate optimized WebAssembly code for floating point operations
- **Numeric Type Distinction**: JavaScript numbers don't distinguish between f32 and f64, so explicit typing is crucial for performance
- **Code Clarity**: Explicit types make the intended floating point precision clear to developers

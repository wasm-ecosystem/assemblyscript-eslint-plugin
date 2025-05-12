# no-spread

> Disallow spread syntax which is not supported in AssemblyScript

## Rule Details

AssemblyScript does not support the spread syntax (`...var`) for function calls or array literals. This rule identifies and reports any use of spread syntax in your code.

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
// Using spread in function calls
foo(1, ...bar);

// Using spread in array literals
const newArray = [...oldArray, 1, 2, 3];
```

### Correct

```ts
// Use direct arguments instead
foo(1, bar);

// Use array methods or explicit assignments
const newArray = new Array<i32>(oldArray.length + 3);
for (let i = 0; i < oldArray.length; i++) {
  newArray[i] = oldArray[i];
}
newArray[oldArray.length] = 1;
newArray[oldArray.length + 1] = 2;
newArray[oldArray.length + 2] = 3;
```

## When Not To Use

You should not disable this rule in AssemblyScript code, as using spread syntax will cause compilation errors.

## Related Rules

- [array-init-style](./array-init-style.md)

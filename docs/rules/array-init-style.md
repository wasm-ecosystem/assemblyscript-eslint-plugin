# array-init-style

> Enforce using Array constructor for empty array initialization

## Rule Details

In AssemblyScript, using the literal `[]` to create empty arrays creates a temporary object in the data section, which may lead to performance issues. This rule enforces using the `new Array<T>()` constructor to initialize empty arrays.

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
let arr: i32[] = []; // not recommended
```

### Correct

```ts
let arr: i32[] = new Array<i32>(); // recommended
```

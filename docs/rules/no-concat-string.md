# no-concat-string

> Disallow string concatenation in loops

## Rule Details

String concatenation inside loops can lead to performance issues in AssemblyScript. Each concatenation operation creates a new string object, which can cause memory allocation overhead and garbage collection pressure in tight loops. This rule enforces using alternative approaches like array joining or string builders for better performance.

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
// String concatenation with + operator in loop
for (let i = 0; i < 1000; i++) {
  const message = "Count: " + i; // not recommended
}

// String concatenation with += operator in loop
let result = "";
for (let i = 0; i < 1000; i++) {
  result += "Item " + i; // not recommended
}

// String methods used in concatenation
let formatted = "";
for (let i = 0; i < items.length; i++) {
  formatted += text.toUpperCase() + " "; // not recommended
}

// Object property string concatenation
const obj = { message: "" };
for (let i = 0; i < 10; i++) {
  obj.message += "test"; // not recommended
}
```

### Correct

```ts
// Use array join for better performance
const parts: string[] = [];
for (let i = 0; i < 1000; i++) {
    // add items to parts
    // ...
}
const result = parts.join("");

// String concatenation outside loops is allowed
const greeting = "Hello " + name;

// String operations that don't involve concatenation
for (let i = 0; i < items.length; i++) {
  const formatted = items[i].toString();
  console.log(formatted);
}
```

## When Not To Use

If you're not concerned about performance in specific use cases or working with very small loops where the performance impact is negligible, you might choose to disable this rule. However, it's generally recommended to follow this rule for better performance.

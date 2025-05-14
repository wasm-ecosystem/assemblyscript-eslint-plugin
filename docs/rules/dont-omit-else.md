# dont-omit-else

> Enforce using else block when if branch doesn't contain control flow statement

## Rule Details

In AssemblyScript, it's recommended to explicitly handle all possible execution paths for better code clarity and safety. This rule enforces using an `else` block when the `if` branch doesn't contain a statement that alters the control flow, such as `return`, `throw`, `break`, or `continue`.

## Rule Options

This rule has no configuration options.

## Examples

### Incorrect

```ts
if (condition) {
  doSomething();
} // missing else
```

### Correct

```ts
// With else block
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}

// Or with early exit in if branch
if (condition) {
  doSomething();
  return; // Control flow statement makes else unnecessary
}
// Execution continues here only if condition is false
```

## When Not To Use

You can disable this rule if you prefer a coding style that doesn't require explicit else blocks for all conditional statements.

## Related Rules

None

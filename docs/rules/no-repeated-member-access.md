# no-repeated-member-access

> Optimize repeated member access patterns by extracting variables

## Rule Details

This rule identifies repeated member access patterns in your code and suggests extracting them to variables for better performance and readability. In AssemblyScript, repeated property access can have performance implications (due to when they are compiled to WASM bytecode, they will induce more instructions), especially in loops or frequently called functions.

This rule doesn't extract computed properties/array index. These can change unexpectedly and therefore should be avoid for extraction. Examples include:

```ts
arr[0];
arr[0][1];
arr[0].property;
obj.arr[0].value;
data.items[0].config;
obj["prop"];
obj[getKey()];
```

The rule will also avoid to warn when functions are invoked upon properties, as this could have implications that alter the extracted value.
Examples include:

```ts
x = a.b.c;
a.b.doSomething(); // this line will prevent a.b.c from being warned although it is used multiple times, as doSomething() could potentially change the value of a.b
y = a.b.c;
z = a.b.c;
```

## Rule Options

This rule accepts an options object with the following properties:

```json
{
  "minOccurrences": 3
}
```

- `minOccurrences` (default: 3): Minimum number of times a member chain must be accessed before triggering the rule

## Examples

### Incorrect

```ts
// Repeated access to the same property chain (3+ times)
function processData(obj: MyObject): void {
  if (obj.config.settings.enabled) {
    obj.config.settings.value = 10;
    console.log(obj.config.settings.name);
    obj.config.settings.timestamp = Date.now();
  }
}

// Deep property chains accessed multiple times
function renderUI(app: Application): void {
  app.ui.layout.header.title.text = "New Title";
  app.ui.layout.header.title.fontSize = 16;
  app.ui.layout.header.title.color = "blue";
}
```

### Correct

```ts
// Extract repeated property access to variables
function processData(obj: MyObject): void {
  const settings = obj.config.settings;
  if (settings.enabled) {
    settings.value = 10;
    console.log(settings.name);
    settings.timestamp = Date.now();
  }
}

// Extract deep property chains
function renderUI(app: Application): void {
  const title = app.ui.layout.header.title;
  title.text = "New Title";
  title.fontSize = 16;
  title.color = "blue";
}

// Single or infrequent access is allowed
function singleAccess(obj: MyObject): void {
  console.log(obj.config.settings.enabled); // Only accessed once
}
```

## Benefits

- **Performance**: Reduces redundant property lookups, especially in tight loops
- **Readability**: Makes code more readable by giving meaningful names to complex property chains
- **Maintainability**: Easier to update property references when extracted to variables
- **Memory Efficiency**: Can reduce memory pressure in performance-critical AssemblyScript code

## When Not To Use

- If the property chains are very short (single level) and performance is not critical
- When the object properties are frequently modified, making extraction less beneficial
- In very simple functions where the overhead of variable extraction outweighs the benefits

## Related Rules

- Consider using this rule alongside other performance-focused rules for optimal AssemblyScript code generation

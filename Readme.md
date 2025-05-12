# ESlint plugins for assemblyscript

_Disclaimer: This repo is still work-in-progress and not ready for production usage!!_

### Plugins included:

- plugins/as-plugin.ts —— Forcing user to comply with assemblyscript language standard
- plugins/perf-plugin.ts —— Optional rules that could lead to performance increase

### Example Usage

Refer sample_config/eslint.config.mjs to example usage

### Test

```bash
/bin/bash "/home/meow/assemblyscript-eslint-plugin/sanity-check.sh"
```

Should output all tests passed.

### Known issues:

Auto fixer is still problematic for cases like:

```js
const x = data[0].value;
data[0].count++;
send(data[0].id); // Last line won't get fixed
```

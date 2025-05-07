# ESlint plugins for assemblyscript

*Disclaimer: This repo is still work-in-progress and not ready for production usage!!*

### Plugins included:

* plugins/as-plugin.ts  ——  Addresses assemblyscript language related issues
* plugins/perf-plugin.ts —— Addresses assemblyscript related issues

### Example Usage

Refer eslint.config.mjs to example usage

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

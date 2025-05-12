import perfPlugin from "./dist/plugins/perf-plugin.js";
import asPlugin from "./dist/plugins/as-plugin.js";

export default {
  rules: {
    ...perfPlugin.rules,
    ...asPlugin.rules,
  },
};

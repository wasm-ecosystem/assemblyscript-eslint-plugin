import perfPlugin from "./dist/plugins/perfPlugin.js";
import asPlugin from "./dist/plugins/asPlugin.js";

export default {
  rules: {
    ...perfPlugin.rules,
    ...asPlugin.rules,
  },
};

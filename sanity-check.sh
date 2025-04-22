#!/bin/bash
# This script does some sanity checks before a npm publish makes sense.
set -euo pipefail

npm run build

# Run ESLint plugin unit tests and capture output for as-plugin
as_plugin_test_output=$(node --test ./dist/tests/as-plugin.test.js 2>&1 || true)

# Assert that the plugin test output contains 'fail 0' (all tests passed)
if ! echo "$as_plugin_test_output" | grep -q "fail 0"; then
    echo "Test failed: Plugin test did not pass all cases (fail 0 not found)."
    echo "Output: $as_plugin_test_output"
    exit 1
fi

# Run ESLint plugin unit tests and capture output for perf-plugin
perf_plugin_test_output=$(node --test ./dist/tests/perf-plugin.test.js 2>&1 || true)

# Assert that the perf plugin test output contains 'fail 0' (all tests passed)
if ! echo "$perf_plugin_test_output" | grep -q "fail 0"; then
    echo "Test failed: Perf plugin test did not pass all cases (fail 0 not found)."
    echo "Output: $perf_plugin_test_output"
    exit 1
fi

echo "All tests passed."

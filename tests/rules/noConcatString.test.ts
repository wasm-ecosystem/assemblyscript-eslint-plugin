import { createRuleTester } from "../utils/testUtils.js";
import { describe, it } from "mocha";
import noConcatString from "../../plugins/rules/noConcatString.js";

describe("Rule: noConcatString", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for noConcatString rule", () => {
    ruleTester.run("no-concat-string", noConcatString, {
      valid: [
        // String concatenation outside loops is allowed
        "const greeting = 'Hello ' + name;",
        "let message = 'Welcome ' + 'to our site';",

        // String operations in loops that aren't concatenation
        `
      for (let i = 0; i < items.length; i++) {
        const formatted = items[i].toString();
        console.log(formatted);
      }`,

        // Using template strings in loops but storing in array
        `
      const parts = [];
      for (let i = 0; i < 10; i++) {
        parts.push(\`Part \${i}\`);
      }`,

        // Loops in functions with no string concatenation
        `
      function processItems(items) {
        for (const item of items) {
          processItem(item);
        }
      }`,

        // Variable declarator with non-string initial value
        `
      for (let i = 0; i < 10; i++) {
        const num = 42;
        const obj = {};
        const arr = [];
      }`,

        // Variable declarator with no initial value
        `
      for (let i = 0; i < 10; i++) {
        let uninitializedVar;
      }`,

        // Variable declarator with non-identifier pattern
        `
      for (let i = 0; i < 10; i++) {
        const { prop } = someObject;
        const [first] = someArray;
      }`,

        // Binary expressions with operators other than +
        `
      for (let i = 0; i < 10; i++) {
        const result = 5 - 3;
        const product = 4 * 2;
        const division = 10 / 2;
      }`,

        // Assignment expressions with operators other than +=
        `
      let counter = 0;
      for (let i = 0; i < 10; i++) {
        counter -= 1;
        counter *= 2;
        counter /= 3;
      }`,

        // Call expressions that are not String() constructor or string methods
        `
      for (let i = 0; i < 10; i++) {
        const result = Math.max(1, 2);
        const value = Number(i);
        array.push(i);
      }`,

        // Member expressions that are not string methods
        `
      for (let i = 0; i < 10; i++) {
        const length = array.length;
        const value = obj.property;
        array.indexOf(i);
      }`,

        // Assignment to non-string +=
        `
      let nonStringVar = 0;
      for (let i = 0; i < 10; i++) {
        nonStringVar += 5; // numeric addition, not string concat
      }`,

        // String methods in loops but not used for concatenation
        `
        for (let i = 0; i < items.length; i++) {
          const char = str.charAt(i);
          const upper = str.toUpperCase();
          console.log(char, upper);
        }`,
      ],

      invalid: [
        // Direct string concatenation with + in loop
        {
          code: `
        for (let i = 0; i < 10; i++) {
          const message = "Count: " + i;
        }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // String concatenation with += in loop
        {
          code: `
        let result = "";
        for (let i = 0; i < 10; i++) {
          result += "Item " + i;
        }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation in while loop
        {
          code: `
        let i = 0;
        let str = "";
        while (i < 10) {
          str += "Count: " + i;
          i++;
        }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation in do-while loop
        {
          code: `
        let i = 0;
        let message = "";
        do {
          message = message + "Loop: " + i;
          i++;
        } while (i < 5);`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation in for-of loop
        {
          code: `
        const items = [1, 2, 3];
        let result = "";
        for (const item of items) {
          result += "Item: " + item;
        }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation in for-in loop
        {
          code: `
        const obj = { a: 1, b: 2, c: 3 };
        let description = "";
        for (const key in obj) {
          description += key + ": " + obj[key] + ", ";
        }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation in nested loops
        {
          code: `
        let report = "";
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            report += "Position " + i + "," + j + "\\n";
          }
        }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // String concatenation with String() constructor
        {
          code: `
        let output = "";
        for (let i = 0; i < 10; i++) {
          output += String(i);
        }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // String concatenation with template literals
        {
          code: `
        let text = "";
        for (let i = 0; i < 10; i++) {
          text += \`Item \${i}\`;
        }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // Assignment to object property that contains strings
        {
          code: `
          const obj = { message: "" };
          for (let i = 0; i < 10; i++) {
            obj.message += "test";
          }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // Call expression with non-string return but used in string context
        {
          code: `
          let result = "";
          for (let i = 0; i < 10; i++) {
            result += "prefix" + nonStringMethod();
          }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },

        // Binary expression with mixed types
        {
          code: `
          for (let i = 0; i < 10; i++) {
            const mixed = "string" + 123;
          }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // Template literal in assignment expression
        {
          code: `
          for (let i = 0; i < 10; i++) {
            const result = \`template\` + "string";
          }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },

        // String() constructor in assignment expression
        {
          code: `
          for (let i = 0; i < 10; i++) {
            const result = String(123) + "suffix";
          }`,
          errors: [{ messageId: "noConcatInLoop" }],
        },
        // Object property assignment with string concatenation
        {
          code: `
          const obj = { prop: "" };
          for (let i = 0; i < 10; i++) {
            obj.prop += "test"; 
            obj["key"] += "value";
          }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },
        // loop-in-loop case
        {
          code: `
          let result = "";
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              result += "nested " + i + j;
            }
            result += "outer " + i;
          }`,
          errors: [
            { messageId: "noConcatInLoop" }, // nested
            { messageId: "noConcatInLoop" }, // i
            { messageId: "noConcatInLoop" }, // j
            { messageId: "noConcatInLoop" }, // outer
            { messageId: "noConcatInLoop" }, // i
          ],
        },
        // loop & no-loop case
        {
          code: `
          let result = "";
          for (let i = 0; i < 3; i++) {
            result += "inside " + i;
          }
          const outside = "outside " + "concatenation";`,
          errors: [
            { messageId: "noConcatInLoop" }, // inside
            { messageId: "noConcatInLoop" }, // i
          ],
        },
        // String methods that return strings used in concatenation
        {
          code: `
          let result = "";
          for (let i = 0; i < 10; i++) {
            result += str.charAt(i) + str.toUpperCase();
          }`,
          errors: [
            { messageId: "noConcatInLoop" },
            { messageId: "noConcatInLoop" },
          ],
        },
      ],
    });
  });
});

import * as test from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';

import perfPlugin from "../plugins/perf-plugin.js";

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;
RuleTester.itOnly = test.it.only;

const ruleTester = new RuleTester();

// Throws error if the tests in ruleTester.run() do not pass
ruleTester.run(
  "array-init-style", // rule name
  perfPlugin.rules["array-init-style"], // rule code
  {
    // checks
    // 'valid' checks cases that should pass
    valid: [
      {
        code: `const x: i32[] = new Array<i32>();`,
      },
    ],
    // 'invalid' checks cases that should not pass
    invalid: [
      {
        code: "const a: i32[] = [];",
        // 'output' checks auto-fix result, should match
        output: "const a: i32[] = new Array<i32>();",
        errors: 1,
      },
    ],
  }
); 

ruleTester.run('no-repeated-member-access', perfPlugin.rules["no-repeated-member-access"], {
  valid: [
    // Basic valid case
    `
    const data = ctx.data[0];
    const v1 = data.v1;
    `,
    
    // Different scopes
    `
    function test() {
      const a = obj.foo.bar;
    }
    function test2() {
      const b = obj.foo.bar;
    }
    `,
    
    // Dynamic property access (should be ignored)
    `
    const v1 = ctx[method()].value;
    const v2 = ctx[method()].value;
    `
  ],
  
  invalid: [
    // Basic invalid case
    {
      code: `
        const v1 = ctx.data.v1;
        const v2 = ctx.data.v2;
      `,
      errors: 1,
      // output: `
      //   const temp1 = ctx.data;
      //   const v1 = temp1.v1;
      //   const v2 = temp1.v2;
      // `
    },
    {
      code: `
        class User {
          constructor() {
            this.profile = service.user.profile
            this.log = service.user.logger
          }
        }
      `,
      errors: 1,
      // output: `
      //   class User {
      //     constructor() {
      //       const temp1 = service.user;
      //       this.profile = temp1.profile
      //       this.log = temp1.logger
      //     }
      //   }
      // `
    },
    // Nested scope case
    {
      code: `
        function demo() {
          console.log(obj.a.b.c);
          return obj.a.b.d;
        }
      `,
      errors: 1,
      // output: `
      //   function demo() {
      //     const temp1 = obj.a.b;
      //     console.log(temp1.c);
      //     return temp1.d;
      //   }
      // `
    },

    // Array index case
    {
      code: `
        const x = data[0].value;
        data[0].count++;
        send(data[0].id);
      `,
      errors: 1,
      // output: `
      //   const temp1 = data[0];
      //   const x = temp1.value;
      //   temp1.count++;
      //   send(temp1.id);
      // `
    }
  ]
})
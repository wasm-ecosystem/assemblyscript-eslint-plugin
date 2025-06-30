import { describe, it } from "mocha";
import { createRuleTester } from "../utils/testUtils.js";
import noRepeatedMemberAccess from "../../plugins/rules/memberAccess.js";

describe("Rule: no-spread", () => {
  const ruleTester = createRuleTester();

  it("validates all test cases for no-repeated-member-access rule", () => {
    ruleTester.run("no-repeated-member-access", noRepeatedMemberAccess, {
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
        // ignore array access
        `
              const x = data[0].value;
              data[0].count=data[0].count+1;
              send(data[0].id);
            `,
        // Dynamic property access (should be ignored)
        `
    const v1 = ctx[method()].value;
    const v2 = ctx[method()].value;
    `,
        `
        switch (reason) {
            case Test.x: {
                return "x"
            }
            case Test.y: {
                return "y"
            }
            case Test.z: {
                return "z"
            }
        }
        `,
        `
      import { Juice } from "@applejuice"
      export const apple = Juice.D31
      export const banana = Juice.D32
      export const cat = Juice.D33
      `,
        /**
         * WARN: should NOT extract [] elements as they can get modified easily
         * This is implemented by detecting brackets "[]" in chains
         * Examples include:
         * arr[0];
         * arr[0][1];
         * arr[0].property;
         * obj.arr[0].value;
         * data.items[0].config;
         */
        `
              const x = data[0][1].value;
              data[0][1].count++;
              send(data[0][1].id);
            `,
        `
          const a = dataset[0][1].x + dataset[0][1].y;
          dataset[0][1].update();
          const b = dataset[0][1].z * 2;
          notify(dataset[0][1].timestamp);
        `,
        // WARN: DONT extract when function with possible side effect is called upon
        `
          const a = data.x + data.y;
          data.update();
          const b = data.x * 2;
          notify(data.x);
        `,
        `
          const first = data.items[0].config['security'].rules[2].level;
          data.items[0].config['security'].rules[2].enabled = true;
          validate(data.items[0].config['security'].rules[2].level);
        `,
        `
    const v1 = obj[123].value;
    const v2 = obj[123].value;
    const v3 = obj[123].value;
  `,
        // shouldn't report when modified
        `
        const v1 = a.b.c;
        a.b = {}; 
        const v2 = a.b.c; 
        const v3 = a.b.c; 
        `,
        `
        const v1 = a.b.c;
        a.b = a.b + 1;
        const v2 = a.b.c; 
        const v3 = a.b.c; 
        `,
      ],

      invalid: [
        // Basic invalid case
        {
          code: `
              const v1 = ctx.data.v1;
              const v2 = ctx.data.v2;
              const v3 = ctx.data.v3;
              `,
          errors: [{ messageId: "repeatedAccess" }],
        },
        {
          code: `
              const v1 = a.b.c;
              const v2 = a.b.c;
              const v3 = a.b.c; 
              `,
          errors: [{ messageId: "repeatedAccess" }],
        },
        {
          code: `
        class User {
          constructor() {
            this.profile = service.user.profile
            this.log = service.user.logger
            this.cat = service.user.cat
          }
        }`,
          errors: [{ messageId: "repeatedAccess" }],
        },
        // Nested scope case
        {
          code: `
        function demo() {
          console.log(obj.a.b.c);
          let x = obj.a.b;
          return obj.a.b.d;
        }
      `,
          errors: [{ messageId: "repeatedAccess" }],
        },
        {
          code: `
          const a = data.x + data.y;
          const b = data.x * 2;
          notify(data.x);
        `,
          errors: [{ messageId: "repeatedAccess" }],
        },
      ],
    });
  });
});

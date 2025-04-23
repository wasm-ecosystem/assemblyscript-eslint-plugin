import * as test from "node:test";
import { RuleTester } from "@typescript-eslint/rule-tester";

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
        errors: [{ messageId: "preferArrayConstructor" }],
      },
    ],
  }
);

ruleTester.run(
  "no-repeated-member-access",
  perfPlugin.rules["no-repeated-member-access"],
  {
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
    `,
      `
        switch (reason) {
            case Test.STARTUP: {
                return "STARTUP"
            }
            case Test.DEBOUNCE: {
                return "DEBOUNCE"
            }
            case Test.INSTANT: {
                return "INSTANT"
            }
            case Test.SHUTDOWN: {
                return "SHUTDOWN"
            }
            default: {
                return "UNKNOWN"
            }
        }
        `,
    ],

    invalid: [
      // Basic invalid case
      {
        code: `
              const v1 = ctx.data.v1;
              const v2 = ctx.data.v2;
              `,
        errors: [{ messageId: "repeatedAccess" }],
        output: `
              const _ctx_data = ctx.data;
const v1 = _ctx_data.v1;
              const v2 = _ctx_data.v2;
              `,
      },
      {
        code: `
        class User {
          constructor() {
            this.profile = service.user.profile
            this.log = service.user.logger
          }
        }`,
        errors: [{ messageId: "repeatedAccess" }],
        output:
          "\n" +
          "        class User {\n" +
          "          constructor() {\n" +
          "            const _service_user = service.user;\n" +
          "this.profile = _service_user.profile\n" +
          "            this.log = _service_user.logger\n" +
          "          }\n" +
          "        }",
      },
      // Nested scope case
      {
        code: `
        function demo() {
          console.log(obj.a.b.c);
          return obj.a.b.d;
        }
      `,
        errors: [{ messageId: "repeatedAccess" }],
        output:
          "\n" +
          "        function demo() {\n" +
          "          const _obj_a_b = obj.a.b;\n" +
          "console.log(_obj_a_b.c);\n" +
          "          return _obj_a_b.d;\n" +
          "        }\n" +
          "      ",
      },

      // Array index case
      {
        code: `
        const x = data[0].value;
        data[0].count++;
        send(data[0].id);
      `,
        errors: [
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
        ],
        output:
          "\n" +
          "        const _data_0_ = data[0];\n" +
          "const x = _data_0_.value;\n" +
          "        _data_0_.count++;\n" +
          "        send(_data_0_.id);\n" +
          "      ",
      },
      {
        code: `
            this.vehicleSys!.automobile = new TransportCore(new TransportBlueprint());
            this.vehicleSys!.automobile!.underframe = new ChassisAssembly(new ChassisSchema());
            this.vehicleSys!.automobile!.underframe!.propulsionCover = new EngineEnclosure(new EnclosureSpec());
            this.vehicleSys!.automobile!.underframe!.logisticsBay = new CargoModule(new ModuleTemplate());
            `,
        errors: [
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
          { messageId: "repeatedAccess" },
        ],
        output: [
          "\n" +
            "            const _this_vehicleSys = this.vehicleSys;\n" +
            "this.vehicleSys!.automobile = new TransportCore(new TransportBlueprint());\n" +
            "            const _this_vehicleSys_automobile = this.vehicleSys.automobile;\n" +
            "this.vehicleSys!.automobile!.underframe = new ChassisAssembly(new ChassisSchema());\n" +
            "            const _this_vehicleSys_automobile_underframe = this.vehicleSys.automobile.underframe;\n" +
            "this.vehicleSys!.automobile!.underframe!.propulsionCover = new EngineEnclosure(new EnclosureSpec());\n" +
            "            this.vehicleSys!.automobile!.underframe!.logisticsBay = new CargoModule(new ModuleTemplate());\n" +
            "            ",
          "\n" +
            "            const _this_vehicleSys = this.vehicleSys;\n" +
            "this.vehicleSys!.automobile = new TransportCore(new TransportBlueprint());\n" +
            "            const _this_vehicleSys_automobile = _this_vehicleSys.automobile;\n" +
            "this.vehicleSys!.automobile!.underframe = new ChassisAssembly(new ChassisSchema());\n" +
            "            const _this_vehicleSys_automobile_underframe = _this_vehicleSys_automobile.underframe;\n" +
            "this.vehicleSys!.automobile!.underframe!.propulsionCover = new EngineEnclosure(new EnclosureSpec());\n" +
            "            this.vehicleSys!.automobile!.underframe!.logisticsBay = new CargoModule(new ModuleTemplate());\n" +
            "            ",
        ],
      },
    ],
  }
);

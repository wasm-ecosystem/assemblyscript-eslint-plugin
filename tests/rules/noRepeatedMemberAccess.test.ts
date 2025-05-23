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
        `
      import { Juice } from "@applejuice"
      export const apple = Juice.D31
      export const banana = Juice.D32
      export const cat = Juice.D33
      `,
        `
export namespace Constants {
    export const defaultDebounceTimeRegular_s: u32 = SendTime.NEXT_REGULAR
    export const debounceTimeGnssInnerCity_s = SendTime.S30
    export const debounceTimeGnssMotorway_s = SendTime.S120
}
      `,

        // some more advanced cases
        `
      /**
       * Distance-based emission strategy
       */
      export class DistanceBasedDeliveryStrategy implements EmissionStrategy {
        private checkStateChange(attr: NumericProperty): bool {
          return (
            attr.getCurrent().isUnstable() &&
            attr.getPrevious() != null &&
            attr.getPrevious()!.isStable()
          );
        }
      
        public isEqual(other: GenericValueContainer<i32>): bool {
          return (
            this.isStable() == other.isStable() &&
            this.isActive() == other.isActive() &&
            (!this.isActive() || this.getValue() == other.getValue())
          );
        }
      
        public copy(): GenericValueContainer<i64> {
          const clone = new LongValueWrapper(this.initializer);
          clone.status = this.status;
          clone.error = this.error;
          return clone;
        }
      }`,
        `
      
      let activeConfig: BaseConfiguration;
      const configData = AppContext.loadSettings();
      
      if (configData) {
        activeConfig = configData;
      } else {
        activeConfig = new BaseConfiguration();
        activeConfig.initializationDelay = Constants.DEFAULT_INIT_DELAY;
        activeConfig.fastPollingInterval = Constants.DEFAULT_FAST_INTERVAL;
        activeConfig.normalPollingInterval = Constants.DEFAULT_NORMAL_INTERVAL;
      }
      
      if (runtimeEnv && eventController) {
        SystemHookManager.instance = this;
        this.eventController = eventController;
        runtimeEnv.registerStateChangeListener(SystemHookManager.handleStateChange);
        this.lastKnownState = runtimeEnv.getCurrentEnvironmentState();
      }
      `,
        `
      if (
        currentSession.authType == AuthType.PRIVILEGED &&
        currentSession.status == SessionStatus.ACTIVE &&
        this.runtimeEnv.getCurrentEnvironmentState().isPresent()
      ) {
        const timestamp = getTimestamp();
        serviceInstance.lastSyncTime = timestamp;
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
              const x = data[0][1].value;
              data[0][1].count++;
              send(data[0][1].id);
            `,
          errors: [
            { messageId: "repeatedAccess" },
            { messageId: "repeatedAccess" },
          ],
          output:
            "\n" +
            "        const _data_0__1_ = data[0][1];\n" +
            "const x = _data_0__1_.value;\n" +
            "        _data_0__1_.count++;\n" +
            "        send(_data__0_1_.id);\n" +
            "      ",
        },
        {
          code: `
          const a = dataset[0][1].x + dataset[0][1].y;
          dataset[0][1].update();
          const b = dataset[0][1].z * 2;
          notify(dataset[0][1].timestamp);
        `,
          errors: [
            { messageId: "repeatedAccess" },
            { messageId: "repeatedAccess" },
            { messageId: "repeatedAccess" },
          ],
          output: `
          const _dataset_0_1_ = dataset[0][1];
          const a = _dataset_0_1_.x + _dataset_0_1_.y;
          _dataset_0_1_.update();
          const b = _dataset_0_1_.z * 2;
          notify(_dataset_0_1_.timestamp);
        `,
        },
        {
          code: `
          const first = data.items[0].config['security'].rules[2].level;
          data.items[0].config['security'].rules[2].enabled = true;
          validate(data.items[0].config['security'].rules[2].level);
        `,
          errors: [
            { messageId: "repeatedAccess" },
            { messageId: "repeatedAccess" },
          ],
          output: `
          const _data_items_0_config_security_rules_2_ = data.items[0].config['security'].rules[2];
          const first = _data_items_0_config_security_rules_2_.level;
          _data_items_0_config_security_rules_2_.enabled = true;
          validate(_data_items_0_config_security_rules_2_.level);
        `,
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
    });
  });
});

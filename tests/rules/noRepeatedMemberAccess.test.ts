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
              data[0].count++;
              send(data[0].id);
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
        // some more complex cases
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
        // shouldn't report when modified
        `
        const v1 = a.b.c;
        a.b = {}; 
        const v2 = a.b.c; 
        const v3 = a.b.c; 
        `,
        `
        const v1 = a.b.c;
        a.b++;
        const v2 = a.b.c; 
        const v3 = a.b.c; 
        `,
        `
            this.vehicleSys!.automobile = new TransportCore(new TransportBlueprint());
            this.vehicleSys!.automobile!.underframe = new ChassisAssembly(new ChassisSchema());
            this.vehicleSys!.automobile!.underframe!.propulsionCover = new EngineEnclosure(new EnclosureSpec());
            this.vehicleSys!.automobile!.underframe!.logisticsBay = new CargoModule(new ModuleTemplate());
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
          // data.update();
          const b = data.x * 2;
          notify(data.x);
        `,
          errors: [{ messageId: "repeatedAccess" }],
        },
      ],
    });
  });
});

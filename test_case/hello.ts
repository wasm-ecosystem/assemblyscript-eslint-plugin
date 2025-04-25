import { DelayType } from "@utils/time-utils";

export namespace TimingConfig {
  export const defaultCooldownStandard: u32 = DelayType.STANDARD;
  /**
   * Cooldown duration for urban positioning scenarios
   */
  export const urbanPositioningCooldown = DelayType.SHORT;
  /**
   * Cooldown duration for high-speed positioning scenarios
   */
  export const highSpeedPositioningCooldown = DelayType.LONG;
}

/**
 * Distance-based emission strategy
 */
export class DistanceBasedDeliveryStrategy implements EmissionStrategy {
  private context: SystemContext;
  constructor(context: SystemContext) {
    this.context = context;
  }
  isEmissionConditionMet(emissionGroup: EmissionGroup): boolean {
    void emissionGroup;
    return true;
  }

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
}

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

if (
  currentSession.authType == AuthType.PRIVILEGED &&
  currentSession.status == SessionStatus.ACTIVE &&
  this.runtimeEnv.getCurrentEnvironmentState().isPresent()
) {
  const timestamp = getTimestamp();
  serviceInstance.lastSyncTime = timestamp;
}

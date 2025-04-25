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
  determineCooldown(emissionGroup: EmissionGroup): DelayType {
    void emissionGroup;
    return this.context.getCurrentZone().isPresent() &&
      this.context.getCurrentZone().get() === ZoneType.RESIDENTIAL
      ? DelayType.SHORT
      : DelayType.NEVER;
  }
}

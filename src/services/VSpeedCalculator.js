/**
 * V-Speed Calculator
 * Calculates takeoff and landing speeds based on:
 * - Weight (mass + fuel)
 * - Flap setting
 * - Airport elevation & temperature
 * - Runway condition
 * - Wind
 */

class VSpeedCalculator {
  static clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  static getValidatedWeightRatio(weight, referenceWeight, fallback = 1) {
    const safeWeight = Number(weight);
    const safeReference = Number(referenceWeight);
    if (!Number.isFinite(safeWeight) || !Number.isFinite(safeReference) || safeWeight <= 0 || safeReference <= 0) {
      return fallback;
    }
    return this.clamp(safeWeight / safeReference, 0.55, 1.2);
  }

  /**
   * Calculate takeoff speeds
   * @param {Object} params
   * @param {number} params.weight - Total weight in kg
   * @param {number} params.flaps - Flap setting (0-1, where 0.17=flaps 5, 0.25=flaps 15)
   * @param {number} params.elevation - Airport elevation in ft
   * @param {number} params.temperature - Temperature in °C
   * @param {number} params.headwind - Headwind component in kt (negative for tailwind)
   * @param {string} params.runwayCondition - 'dry', 'wet', 'contaminated'
   * @param {number} params.stallSpeed - Aircraft clean-ish stall speed in kt
   * @param {number} params.referenceWeight - Aircraft takeoff reference weight in kg
   * @returns {Object} { vr, v2, v1 }
   */
  static calculateTakeoff({
    weight,
    flaps = 0.17,
    elevation = 0,
    temperature = 15,
    headwind = 0,
    runwayCondition = 'dry',
    stallSpeed = 118,
    referenceWeight = 70000
  }) {
    const weightRatio = this.getValidatedWeightRatio(weight, referenceWeight);
    const flapLiftBenefit = this.clamp(1 - (flaps * 0.45), 0.84, 1);
    const densityAlt = elevation + (120 * (temperature - 15));
    const altitudeFactor = 1 + this.clamp(densityAlt / 200000, -0.03, 0.12);
    const runwayFactor = runwayCondition === 'wet' ? 1.02 : runwayCondition === 'contaminated' ? 1.05 : 1.0;
    const windAdjustment = this.clamp(headwind * 0.2, -8, 8);

    const baseStall = stallSpeed * Math.sqrt(weightRatio) * flapLiftBenefit;
    const vr = Math.round(this.clamp((baseStall * 1.13 * altitudeFactor * runwayFactor) - windAdjustment, 105, 195));
    const v2 = Math.round(this.clamp(vr + 8 + (runwayCondition === 'contaminated' ? 4 : 0), vr + 5, 205));
    const v1 = Math.round(this.clamp(vr - 5, 100, vr - 1));

    return { vr, v2, v1 };
  }

  /**
   * Calculate landing speed
   * @param {Object} params
   * @param {number} params.weight - Landing weight in kg
   * @param {number} params.flaps - Flap setting (typically 0.5-1.0 for landing)
   * @param {number} params.headwind - Headwind component in kt
   * @param {string} params.runwayCondition - 'dry', 'wet', 'contaminated'
   * @param {number} params.stallSpeed - Aircraft clean-ish stall speed in kt
   * @param {number} params.referenceWeight - Aircraft landing reference weight in kg
   * @returns {Object} { vref, vapp }
   */
  static calculateLanding({ weight, flaps = 1.0, headwind = 0, runwayCondition = 'dry', stallSpeed = 118, referenceWeight = 60000 }) {
    const weightRatio = this.getValidatedWeightRatio(weight, referenceWeight);
    const landingConfigBenefit = this.clamp(1 - (flaps * 0.16), 0.82, 0.96);
    const gustAdditive = this.clamp(headwind * 0.25, 0, 10);
    const runwayBuffer = runwayCondition === 'wet' ? 3 : runwayCondition === 'contaminated' ? 7 : 0;

    const baseStall = stallSpeed * Math.sqrt(weightRatio) * landingConfigBenefit;
    const vref = Math.round(this.clamp(baseStall * 1.23, 105, 180));
    const vapp = Math.round(this.clamp(vref + 5 + gustAdditive + runwayBuffer, vref + 5, 190));

    return { vref, vapp };
  }
}

export default VSpeedCalculator;

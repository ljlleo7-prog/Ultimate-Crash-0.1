// Approach guidance for vectoring aircraft onto ILS localizer
export class ApproachGuidance {
  constructor() {
    this.phase = 'vectors'; // vectors, intercept, established
  }

  computeVectorToFinal(aircraftLat, aircraftLon, aircraftHeading, runwayGeometry) {
    const { thresholdStart, heading: runwayHeading } = runwayGeometry;
    const R = 6371000;
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;

    const latRad = thresholdStart.latitude * toRad;
    const metersPerLat = 111132.92;
    const metersPerLon = 111412.84 * Math.cos(latRad);
    const dx = (aircraftLat - thresholdStart.latitude) * metersPerLat;
    const dy = (aircraftLon - thresholdStart.longitude) * metersPerLon;

    const rH = runwayHeading * toRad;
    const ux = Math.cos(rH);
    const uy = Math.sin(rH);
    const distCross = -dx * uy + dy * ux;
    const distAlong = dx * ux + dy * uy;

    const locDeviationDeg = Math.atan2(distCross, Math.max(Math.abs(distAlong), 500)) * toDeg;
    const headingError = ((runwayHeading - aircraftHeading + 540) % 360) - 180;

    // Phase logic
    if (Math.abs(locDeviationDeg) < 1.0 && Math.abs(headingError) < 5) {
      this.phase = 'established';
    } else if (Math.abs(locDeviationDeg) < 5.0) {
      this.phase = 'intercept';
    } else {
      this.phase = 'vectors';
    }

    // Compute intercept heading
    let targetHeading = runwayHeading;
    if (this.phase === 'vectors') {
      const interceptAngle = Math.min(Math.abs(locDeviationDeg) * 5, 45);
      targetHeading = runwayHeading + (locDeviationDeg > 0 ? interceptAngle : -interceptAngle);
    } else if (this.phase === 'intercept') {
      const interceptAngle = Math.min(Math.abs(locDeviationDeg) * 8, 30);
      targetHeading = runwayHeading + (locDeviationDeg > 0 ? interceptAngle : -interceptAngle);
    }

    return {
      phase: this.phase,
      targetHeading: (targetHeading + 360) % 360,
      locDeviationDeg,
      distCross,
      distAlong,
      shouldDescend: this.phase === 'established'
    };
  }
}

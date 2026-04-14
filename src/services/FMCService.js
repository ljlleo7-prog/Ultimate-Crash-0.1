/**
 * FMC Service - helper calculations for shared FMC views.
 */

class FMCService {
  calculateTOD(currentAlt, targetAlt, groundSpeed) {
    const altDiff = currentAlt - targetAlt;
    if (altDiff <= 0) return null;

    const descentAngle = 3;
    const distanceNm = altDiff / (Math.tan(descentAngle * Math.PI / 180) * 6076.12);

    return {
      distance: distanceNm,
      time: groundSpeed > 0 ? (distanceNm / groundSpeed) * 60 : 0
    };
  }
}

export default FMCService;

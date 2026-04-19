/**
 * FMC Service - helper calculations and FMS compatibility facade.
 */

import { createPlanModel } from './fms/FlightPlanModel.js';
import {
  discardTemporaryPlan,
  executeTemporaryPlan,
  insertDiscontinuity,
  removeLeg,
  toFlightPlanOutput,
  updateLegConstraints
} from './fms/FlightPlanMutations.js';
import { validatePlan } from './fms/FlightPlanValidation.js';

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

  createPlanModel(flightPlan) {
    return createPlanModel(flightPlan);
  }

  getPlanView(flightPlan) {
    const model = createPlanModel(flightPlan);
    return {
      model,
      validation: validatePlan(model)
    };
  }

  updateLegConstraints(flightPlan, index, constraints) {
    return toFlightPlanOutput(updateLegConstraints(createPlanModel(flightPlan), index, constraints));
  }

  removeLeg(flightPlan, index) {
    return toFlightPlanOutput(removeLeg(createPlanModel(flightPlan), index));
  }

  insertDiscontinuity(flightPlan, index) {
    return toFlightPlanOutput(insertDiscontinuity(createPlanModel(flightPlan), index));
  }

  executeTemporaryPlan(flightPlan) {
    return toFlightPlanOutput(executeTemporaryPlan(createPlanModel(flightPlan)));
  }

  discardTemporaryPlan(flightPlan) {
    return toFlightPlanOutput(discardTemporaryPlan(createPlanModel(flightPlan)));
  }
}

export default FMCService;

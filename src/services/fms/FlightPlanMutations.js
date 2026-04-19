import { buildFlightPlanOutput, createDiscontinuityLeg, createPlanModel } from './FlightPlanModel.js';

const cloneLegs = (legs) => legs.map((leg) => ({ ...leg, raw: leg.raw ? JSON.parse(JSON.stringify(leg.raw)) : {} }));

const withTemporaryLegs = (model, mutate) => {
  const nextModel = createPlanModel(model);
  const nextTempLegs = cloneLegs(nextModel.fms.temporaryPlan.legs);
  mutate(nextTempLegs);
  nextModel.fms.temporaryPlan.legs = nextTempLegs;
  nextModel.fms.temporaryPlan.waypoints = nextTempLegs;
  nextModel.fms.execPending = true;
  return nextModel;
};

export const updateLegConstraints = (model, index, constraints) => withTemporaryLegs(model, (legs) => {
  if (!legs[index]) return;
  legs[index] = {
    ...legs[index],
    altConstraint: constraints.altConstraint ?? null,
    spdConstraint: constraints.spdConstraint ?? null
  };
});

export const removeLeg = (model, index) => withTemporaryLegs(model, (legs) => {
  if (index < 0 || index >= legs.length) return;
  legs.splice(index, 1);
});

export const insertDiscontinuity = (model, index) => withTemporaryLegs(model, (legs) => {
  const insertAt = Math.max(0, Math.min(index, legs.length));
  legs.splice(insertAt, 0, createDiscontinuityLeg(insertAt));
});

export const discardTemporaryPlan = (model) => {
  const nextModel = createPlanModel(model);
  nextModel.fms.temporaryPlan.legs = cloneLegs(nextModel.fms.activePlan.legs);
  nextModel.fms.temporaryPlan.waypoints = nextModel.fms.temporaryPlan.legs;
  nextModel.fms.execPending = false;
  return nextModel;
};

export const executeTemporaryPlan = (model) => {
  const nextModel = createPlanModel(model);
  nextModel.fms.activePlan.legs = cloneLegs(nextModel.fms.temporaryPlan.legs);
  nextModel.fms.activePlan.waypoints = nextModel.fms.activePlan.legs;
  nextModel.fms.execPending = false;
  if (nextModel.fms.currentWaypointIndex >= nextModel.fms.activePlan.legs.length) {
    nextModel.fms.currentWaypointIndex = Math.max(0, nextModel.fms.activePlan.legs.length - 1);
  }
  return nextModel;
};

export const toFlightPlanOutput = (model) => buildFlightPlanOutput(model);

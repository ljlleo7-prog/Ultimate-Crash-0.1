import { isDiscontinuityLeg } from './LegTypes.js';

export const summarizePlanDiff = (activeLegs = [], temporaryLegs = []) => {
  const activeIds = activeLegs.map((leg) => `${leg.type}:${leg.ident}`);
  const tempIds = temporaryLegs.map((leg) => `${leg.type}:${leg.ident}`);
  let changes = 0;
  const maxLength = Math.max(activeIds.length, tempIds.length);
  for (let i = 0; i < maxLength; i += 1) {
    if (activeIds[i] !== tempIds[i]) changes += 1;
  }
  return changes;
};

export const validatePlan = (model) => {
  const activeLegs = model?.fms?.activePlan?.legs || [];
  const temporaryLegs = model?.fms?.temporaryPlan?.legs || [];
  const discontinuityCount = temporaryLegs.filter(isDiscontinuityLeg).length;
  return {
    activeLegCount: activeLegs.length,
    temporaryLegCount: temporaryLegs.length,
    discontinuityCount,
    hasDiscontinuity: discontinuityCount > 0,
    execPending: Boolean(model?.fms?.execPending),
    pendingChanges: summarizePlanDiff(activeLegs, temporaryLegs)
  };
};

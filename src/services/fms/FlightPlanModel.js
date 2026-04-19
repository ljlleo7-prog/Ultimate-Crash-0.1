import { LEG_TYPES, isDiscontinuityLeg } from './LegTypes.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeConstraintNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLegacyWaypoint = (waypoint, index) => {
  const type = waypoint?.type || LEG_TYPES.WAYPOINT;
  return {
    id: waypoint?.id || waypoint?.name || waypoint?.label || `LEG${index + 1}`,
    ident: waypoint?.label || waypoint?.name || waypoint?.id || `WPT${index + 1}`,
    type,
    source: waypoint?.source || 'enroute',
    sequencingMode: waypoint?.sequencingMode || 'auto',
    latitude: Number.isFinite(waypoint?.latitude) ? waypoint.latitude : null,
    longitude: Number.isFinite(waypoint?.longitude) ? waypoint.longitude : null,
    altConstraint: normalizeConstraintNumber(waypoint?.altConstraint),
    spdConstraint: normalizeConstraintNumber(waypoint?.spdConstraint),
    isDiscontinuity: isDiscontinuityLeg(waypoint),
    raw: clone(waypoint || {})
  };
};

const denormalizeLeg = (leg) => {
  if (isDiscontinuityLeg(leg)) {
    return {
      id: leg.id,
      label: 'DISCONTINUITY',
      name: 'DISCONTINUITY',
      type: LEG_TYPES.DISCONTINUITY,
      source: leg.source || 'manual',
      sequencingMode: 'manual',
      isDiscontinuity: true,
      altConstraint: null,
      spdConstraint: null,
      latitude: null,
      longitude: null
    };
  }

  return {
    ...(leg.raw || {}),
    id: leg.id,
    label: leg.ident,
    name: leg.ident,
    type: leg.type || LEG_TYPES.WAYPOINT,
    source: leg.source || 'enroute',
    sequencingMode: leg.sequencingMode || 'auto',
    altConstraint: normalizeConstraintNumber(leg.altConstraint),
    spdConstraint: normalizeConstraintNumber(leg.spdConstraint),
    latitude: Number.isFinite(leg.latitude) ? leg.latitude : leg.raw?.latitude,
    longitude: Number.isFinite(leg.longitude) ? leg.longitude : leg.raw?.longitude
  };
};

export const createDiscontinuityLeg = (index = 0) => ({
  id: `DISCO-${Date.now()}-${index}`,
  ident: 'DISCONTINUITY',
  type: LEG_TYPES.DISCONTINUITY,
  source: 'manual',
  sequencingMode: 'manual',
  latitude: null,
  longitude: null,
  altConstraint: null,
  spdConstraint: null,
  isDiscontinuity: true,
  raw: {}
});

export const createPlanModel = (flightPlan) => {
  const planObject = Array.isArray(flightPlan)
    ? { waypoints: flightPlan }
    : (flightPlan || {});

  const activeWaypoints = Array.isArray(planObject.fms?.activePlan?.waypoints)
    ? planObject.fms.activePlan.waypoints
    : Array.isArray(planObject.waypoints)
      ? planObject.waypoints
      : [];

  const tempWaypoints = Array.isArray(planObject.fms?.temporaryPlan?.waypoints)
    ? planObject.fms.temporaryPlan.waypoints
    : activeWaypoints;

  const currentWaypointIndex = Number.isInteger(planObject.fms?.currentWaypointIndex)
    ? planObject.fms.currentWaypointIndex
    : Number.isInteger(planObject.currentWaypointIndex)
      ? planObject.currentWaypointIndex
      : 0;

  const execPending = Boolean(planObject.fms?.execPending);
  const activePlan = {
    ...clone(planObject),
    waypoints: activeWaypoints.map(denormalizeLeg),
    legs: activeWaypoints.map(normalizeLegacyWaypoint)
  };
  const temporaryPlan = {
    ...clone(planObject),
    waypoints: tempWaypoints.map(denormalizeLeg),
    legs: tempWaypoints.map(normalizeLegacyWaypoint)
  };

  return {
    ...clone(planObject),
    fms: {
      activePlan,
      temporaryPlan,
      execPending,
      currentWaypointIndex
    }
  };
};

export const buildFlightPlanOutput = (model) => ({
  ...clone(model),
  waypoints: model.fms.activePlan.legs.map(denormalizeLeg),
  fms: {
    activePlan: {
      ...clone(model.fms.activePlan),
      waypoints: model.fms.activePlan.legs.map(denormalizeLeg)
    },
    temporaryPlan: {
      ...clone(model.fms.temporaryPlan),
      waypoints: model.fms.temporaryPlan.legs.map(denormalizeLeg)
    },
    execPending: Boolean(model.fms.execPending),
    currentWaypointIndex: model.fms.currentWaypointIndex || 0
  }
});

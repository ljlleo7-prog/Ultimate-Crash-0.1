import { airportService } from '../airportService.js';
import { formatDuration, formatMinutes } from './UnitConversion.js';

const getWaypoints = (flightPlan) => Array.isArray(flightPlan)
  ? flightPlan
  : Array.isArray(flightPlan?.fms?.activePlan?.waypoints)
    ? flightPlan.fms.activePlan.waypoints
    : Array.isArray(flightPlan?.waypoints)
      ? flightPlan.waypoints
      : [];

const isValidPosition = (point) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude);

export const calculateRouteProgress = ({ flightPlan, flightState }) => {
  const waypoints = getWaypoints(flightPlan).filter(isValidPosition);
  const currentIdx = Math.max(0, Number.isInteger(flightState?.currentWaypointIndex) ? flightState.currentWaypointIndex : 0);
  const currentPosition = { latitude: flightState?.latitude, longitude: flightState?.longitude };
  const groundSpeed = Number(flightState?.groundSpeed) || 0;
  const activeLeg = waypoints[currentIdx] || null;

  let distanceToNext = null;
  if (activeLeg && isValidPosition(currentPosition)) {
    distanceToNext = airportService.calculateDistance(currentPosition, activeLeg);
  }

  let distanceRemaining = Number.isFinite(distanceToNext) ? distanceToNext : 0;
  for (let i = currentIdx; i < waypoints.length - 1; i += 1) {
    if (isValidPosition(waypoints[i]) && isValidPosition(waypoints[i + 1])) {
      distanceRemaining += airportService.calculateDistance(waypoints[i], waypoints[i + 1]);
    }
  }

  const eteNextHours = Number.isFinite(distanceToNext) && groundSpeed > 10 ? distanceToNext / groundSpeed : null;
  const eteDestinationHours = distanceRemaining > 0 && groundSpeed > 10 ? distanceRemaining / groundSpeed : null;
  const etaDestination = eteDestinationHours !== null ? new Date(Date.now() + eteDestinationHours * 3600000) : null;

  return {
    waypointCount: waypoints.length,
    currentIndex: currentIdx,
    activeLeg,
    activeIdent: activeLeg?.ident || activeLeg?.label || activeLeg?.name || activeLeg?.id || '—',
    distanceToNext,
    distanceRemaining: waypoints.length > 0 ? distanceRemaining : null,
    eteNextHours,
    eteDestinationHours,
    eteNextText: eteNextHours !== null ? formatMinutes(eteNextHours * 60) : '—',
    eteDestinationText: eteDestinationHours !== null ? formatDuration(eteDestinationHours) : '—',
    etaDestinationText: etaDestination ? etaDestination.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    routeCompletePercent: waypoints.length > 0 ? Math.min(100, Math.max(0, (currentIdx / waypoints.length) * 100)) : null,
    dataQuality: {
      hasRoute: waypoints.length > 0,
      hasPosition: isValidPosition(currentPosition),
      hasUsableGroundSpeed: groundSpeed > 10
    }
  };
};

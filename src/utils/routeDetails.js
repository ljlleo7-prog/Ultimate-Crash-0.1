import { generateGate, generateSID, generateSTAR, generateTaxiway, getLastProcedureWaypoint, getRunways, getRunwayHeading } from './routeGenerator.js';

export const DEFAULT_ROUTE_DETAILS = {
  departureGate: '',
  departureTaxiway: '',
  departureRunway: '',
  sid: '',
  waypoints: [],
  star: '',
  landingRunway: '',
  landingTaxiway: '',
  arrivalGate: '',
  alternate: null
};

export const normalizeWaypoint = (waypoint, index = 0) => {
  if (!waypoint) return null;
  if (typeof waypoint === 'string') {
    return {
      name: waypoint,
      label: waypoint,
      latitude: 0,
      longitude: 0
    };
  }

  const name = waypoint.name || waypoint.label || waypoint.id || `WPT${index + 1}`;

  return {
    ...waypoint,
    name,
    label: waypoint.label || name,
    latitude: typeof waypoint.latitude === 'number' ? waypoint.latitude : Number(waypoint.latitude) || 0,
    longitude: typeof waypoint.longitude === 'number' ? waypoint.longitude : Number(waypoint.longitude) || 0
  };
};

export const buildApproachWaypoints = (arrivalAirport, departureAirport, landingRunway) => {
  if (!arrivalAirport || !departureAirport || !landingRunway) return [];

  const isEastward = arrivalAirport.longitude > departureAirport.longitude;
  const runwayHdg = getRunwayHeading(landingRunway, isEastward);
  const approachHdg = (runwayHdg + 180) % 360;
  const distance = 10;
  const lat1 = arrivalAirport.latitude * Math.PI / 180;
  const lon1 = arrivalAirport.longitude * Math.PI / 180;
  const brng = approachHdg * Math.PI / 180;
  const R = 3440.065;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));

  return [
    normalizeWaypoint({
      name: 'FINAL',
      latitude: lat2 * 180 / Math.PI,
      longitude: lon2 * 180 / Math.PI,
      type: 'APPROACH_FIX'
    }),
    normalizeWaypoint({
      name: landingRunway,
      label: landingRunway,
      latitude: arrivalAirport.latitude,
      longitude: arrivalAirport.longitude,
      type: 'RUNWAY_FIX'
    })
  ];
};

const projectPoint = (lat, lon, headingDeg, distanceNm) => {
  const R = 3440.065;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const brng = headingDeg * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceNm / R) + Math.cos(lat1) * Math.sin(distanceNm / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distanceNm / R) * Math.cos(lat1), Math.cos(distanceNm / R) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: lat2 * 180 / Math.PI, longitude: lon2 * 180 / Math.PI };
};

export const buildSyntheticSIDWaypoints = (airport, runwayName, firstWaypoint) => {
  if (!airport || !runwayName || !firstWaypoint) return [];
  const runwayHdg = getRunwayHeading(runwayName, firstWaypoint.longitude > airport.longitude);
  const sidPoint = projectPoint(airport.latitude, airport.longitude, runwayHdg, 8);
  return [normalizeWaypoint({ ...sidPoint, name: 'SID', type: 'SID_FIX' }), normalizeWaypoint(firstWaypoint)];
};

export const buildSyntheticSTARWaypoints = (airport, runwayName, lastWaypoint) => {
  if (!airport || !runwayName || !lastWaypoint) return [];
  const runwayHdg = getRunwayHeading(runwayName, lastWaypoint.longitude > airport.longitude);
  const interceptHdg = (runwayHdg + 180) % 360;
  const interceptPoint = projectPoint(airport.latitude, airport.longitude, interceptHdg, 12);
  return [normalizeWaypoint(lastWaypoint), normalizeWaypoint({ ...interceptPoint, name: 'INTCP', type: 'STAR_FIX' })];
};

export const normalizeRouteDetails = (routeDetails, selectedDeparture, selectedArrival) => {
  const normalized = {
    ...DEFAULT_ROUTE_DETAILS,
    ...(routeDetails || {})
  };

  const baseWaypoints = (normalized.waypoints || []).map(normalizeWaypoint).filter(Boolean);
  const hasPublishedProcedures = Boolean(normalized.procedureSegments?.length || normalized.procedures?.sid || normalized.procedures?.star);
  const sidWaypoints = !hasPublishedProcedures && normalized.departureRunway && baseWaypoints.length
    ? buildSyntheticSIDWaypoints(selectedDeparture, normalized.departureRunway, baseWaypoints[0])
    : [];
  const starWaypoints = !hasPublishedProcedures && normalized.landingRunway && baseWaypoints.length
    ? buildSyntheticSTARWaypoints(selectedArrival, normalized.landingRunway, getLastProcedureWaypoint(baseWaypoints) ? baseWaypoints[baseWaypoints.length - 1] : null)
    : [];
  const enrouteWaypoints = [
    ...sidWaypoints.slice(0, -1),
    ...baseWaypoints,
    ...starWaypoints.slice(1)
  ];
  const hasFinalFix = enrouteWaypoints.some((waypoint) => waypoint.type === 'APPROACH_FIX' || waypoint.name === 'FINAL');
  const hasRunwayFix = enrouteWaypoints.some((waypoint) => waypoint.type === 'RUNWAY_FIX' || waypoint.name === normalized.landingRunway);
  const approachWaypoints = normalized.landingRunway && (!hasFinalFix || !hasRunwayFix)
    ? buildApproachWaypoints(selectedArrival, selectedDeparture, normalized.landingRunway).filter((waypoint) => {
        if (waypoint.type === 'APPROACH_FIX') return !hasFinalFix;
        if (waypoint.type === 'RUNWAY_FIX') return !hasRunwayFix;
        return true;
      })
    : [];
  const finalWaypoints = [...enrouteWaypoints, ...approachWaypoints];
  const baseRouteObject = normalized.routeObject || null;
  const baseLegs = Array.isArray(baseRouteObject?.legs) ? baseRouteObject.legs : [];
  const routeObject = baseRouteObject ? {
    ...baseRouteObject,
    waypoints: finalWaypoints,
    legs: [
      ...baseLegs,
      ...approachWaypoints.map((waypoint, index) => ({
        from: index === 0 ? (enrouteWaypoints[enrouteWaypoints.length - 1]?.name || selectedDeparture?.icao || selectedDeparture?.iata || 'ENROUTE') : approachWaypoints[index - 1]?.name,
        to: waypoint.name,
        type: waypoint.type || 'fix',
        altitude: waypoint.altitude || null,
        speed: waypoint.speed || null,
        source: baseRouteObject.source || normalized.routeSource || 'Built-in',
        provider: baseRouteObject.source || normalized.routeSource || 'Built-in',
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        sequence: baseLegs.length + index + 1
      }))
    ]
  } : null;

  return {
    ...normalized,
    waypoints: finalWaypoints,
    routeObject,
    routeSource: normalized.routeSource || routeObject?.source || '',
    routeFallbackUsed: Boolean(normalized.routeFallbackUsed || routeObject?.fallbackUsed),
    routeDebug: normalized.routeDebug || routeObject?.debug || [],
    routeBilling: normalized.routeBilling || routeObject?.billing || null,
    procedures: normalized.procedures || routeObject?.procedures || null,
    procedureSegments: normalized.procedureSegments || routeObject?.procedureSegments || []
  };
};

export const mergeFlightPlanWithRoute = (flightPlan, routeDetails) => {
  if (!flightPlan) return null;

  const normalizedRoute = routeDetails ? {
    ...routeDetails,
    waypoints: (routeDetails.waypoints || []).map(normalizeWaypoint).filter(Boolean),
    routeObject: routeDetails.routeObject ? {
      ...routeDetails.routeObject,
      waypoints: (routeDetails.routeObject.waypoints || []).map(normalizeWaypoint).filter(Boolean)
    } : null
  } : null;

  return {
    ...flightPlan,
    waypoints: normalizedRoute?.waypoints?.length ? normalizedRoute.waypoints : (flightPlan.waypoints || []).map(normalizeWaypoint).filter(Boolean),
    routeObject: normalizedRoute?.routeObject || null,
    routeSource: normalizedRoute?.routeSource || normalizedRoute?.routeObject?.source || flightPlan.routeSource || '',
    routeFallbackUsed: normalizedRoute ? Boolean(normalizedRoute.routeFallbackUsed || normalizedRoute.routeObject?.fallbackUsed) : Boolean(flightPlan.routeFallbackUsed),
    routeBilling: normalizedRoute?.routeBilling || normalizedRoute?.routeObject?.billing || flightPlan.routeBilling || null,
    procedures: normalizedRoute?.procedures || normalizedRoute?.routeObject?.procedures || flightPlan.procedures || null,
    procedureSegments: normalizedRoute?.procedureSegments || normalizedRoute?.routeObject?.procedureSegments || flightPlan.procedureSegments || [],
    departure: {
      ...flightPlan.departure,
      runways: normalizedRoute?.departureRunway ? [{ name: normalizedRoute.departureRunway }] : flightPlan.departure?.runways
    },
    arrival: {
      ...flightPlan.arrival,
      runways: normalizedRoute?.landingRunway ? [{ name: normalizedRoute.landingRunway }] : flightPlan.arrival?.runways
    }
  };
};

export const buildRouteAuthState = ({ offlineMode = true, activeUser = null } = {}) => {
  if (offlineMode) return 'offline';
  return activeUser ? 'authenticated' : 'guest';
};

export const buildAutoRouteDetails = async ({
  departure,
  arrival,
  previousRouteDetails = DEFAULT_ROUTE_DETAILS,
  routeOptions = {}
} = {}) => {
  if (!departure || !arrival) {
    return normalizeRouteDetails(previousRouteDetails, departure, arrival);
  }

  const departureCode = departure.icao || departure.iata || departure.name;
  const arrivalCode = arrival.icao || arrival.iata || arrival.name;
  if (departureCode && arrivalCode && departureCode === arrivalCode) {
    return normalizeRouteDetails(previousRouteDetails, departure, arrival);
  }

  const { generateSmartRouteDetails } = await import('./routeGenerator.js');
  const routeObject = await generateSmartRouteDetails(departure, arrival, routeOptions);
  const waypoints = (routeObject.waypoints || []).map(normalizeWaypoint).filter(Boolean);
  const firstWaypoint = waypoints[0]?.name || waypoints[0]?.label || '';
  const lastWaypoint = getLastProcedureWaypoint(waypoints);
  const isEastward = arrival.longitude > departure.longitude;
  const departureRunways = getRunways(departure);
  const arrivalRunways = getRunways(arrival);
  const departureRunway = departureRunways[0] || '';
  const landingRunway = arrivalRunways.find((runway) => {
    const heading = getRunwayHeading(runway, isEastward);
    return isEastward ? heading < 180 : heading >= 180;
  }) || arrivalRunways[0] || '';

  return normalizeRouteDetails({
    ...DEFAULT_ROUTE_DETAILS,
    alternate: previousRouteDetails?.alternate || null,
    departureGate: generateGate(),
    departureTaxiway: generateTaxiway(),
    departureRunway,
    sid: firstWaypoint ? generateSID(firstWaypoint) : '',
    waypoints,
    star: lastWaypoint ? generateSTAR(lastWaypoint) : '',
    landingRunway,
    landingTaxiway: generateTaxiway(),
    arrivalGate: generateGate(),
    routeObject,
    routeSource: routeObject.source,
    routeFallbackUsed: routeObject.fallbackUsed,
    routeDebug: routeObject.debug || [],
    routeBilling: routeObject.billing || null,
    procedures: routeObject.procedures || null,
    procedureSegments: routeObject.procedureSegments || []
  }, departure, arrival);
};

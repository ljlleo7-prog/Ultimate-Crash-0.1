export const generateUniqueFrequencyValue = () => {
  const min = 118000;
  const max = 136975;
  const step = 25;
  const totalSteps = Math.floor((max - min) / step);
  const randomStep = Math.floor(Math.random() * (totalSteps + 1));
  return (min + (randomStep * step)) / 1000;
};

export const generateWaypointNames = (count = 3) => {
  const waypoints = [];
  for (let i = 0; i < count; i += 1) {
    const isFiveChar = Math.random() > 0.3;
    const length = isFiveChar ? 5 : 3;
    let waypoint = '';
    for (let j = 0; j < length; j += 1) {
      waypoint += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    waypoints.push(waypoint);
  }
  return waypoints;
};

function calculateIntermediatePoint(lat1, lon1, lat2, lon2, fraction) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const δ = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));

  if (δ === 0) return { latitude: lat1, longitude: lon1 };

  const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
  const b = Math.sin(fraction * δ) / Math.sin(δ);

  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);

  const φ3 = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ3 = Math.atan2(y, x);

  return {
    latitude: toDeg(φ3),
    longitude: toDeg(λ3)
  };
}

export const generateBuiltInRouteWaypoints = (startAirport, endAirport) => {
  if (!startAirport || !endAirport) return [];

  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;

  const dLat = toRad(endAirport.latitude - startAirport.latitude);
  const dLon = toRad(endAirport.longitude - startAirport.longitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(startAirport.latitude)) * Math.cos(toRad(endAirport.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const minSegmentsByDist = Math.ceil(distanceKm / 800);
  const numSegments = Math.max(5, minSegmentsByDist);
  const names = generateWaypointNames(numSegments - 1);

  const waypoints = [];
  for (let i = 1; i < numSegments; i += 1) {
    const fraction = i / numSegments;
    const point = calculateIntermediatePoint(
      startAirport.latitude,
      startAirport.longitude,
      endAirport.latitude,
      endAirport.longitude,
      fraction
    );

    waypoints.push({
      name: names[i - 1] || `WPT${i}`,
      latitude: point.latitude,
      longitude: point.longitude,
      type: 'WAYPOINT',
      frequency: generateUniqueFrequencyValue()
    });
  }

  return waypoints;
};

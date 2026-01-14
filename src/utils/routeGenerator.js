
/**
 * Generates route components including SID, STAR, Waypoints, and Gates.
 */

export const generateWaypoints = (count = 3) => {
  const waypoints = [];
  for (let i = 0; i < count; i++) {
    const isFiveChar = Math.random() > 0.3; // Mostly 5-alphabet
    const length = isFiveChar ? 5 : 3;
    let waypoint = '';
    for (let j = 0; j < length; j++) {
      waypoint += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    waypoints.push(waypoint);
  }
  return waypoints;
};

export const generateSID = (firstWaypoint) => {
  if (!firstWaypoint || firstWaypoint.length < 3) return 'DEF01D';
  const prefix = firstWaypoint.substring(0, 3);
  const number = Math.floor(Math.random() * 10).toString(); // Single digit 0-9? User said 00, maybe 2 digits.
  // User said "XXX00D format (X for alphabet and 0 for number)". 
  // "XXX00D" usually means 3 letters, 2 numbers, 1 letter.
  const numPart = Math.floor(Math.random() * 90 + 10).toString(); // 10-99
  return `${prefix}${numPart}D`;
};

export const generateSTAR = (lastWaypoint) => {
  if (!lastWaypoint || lastWaypoint.length < 3) return 'ARR01A';
  const prefix = lastWaypoint.substring(0, 3);
  const numPart = Math.floor(Math.random() * 90 + 10).toString();
  return `${prefix}${numPart}A`;
};

export const generateGate = () => {
  const terminal = String.fromCharCode(65 + Math.floor(Math.random() * 6)); // A-F
  const gateNum = Math.floor(Math.random() * 50 + 1);
  return `${terminal}${gateNum}`;
};

export const generateTaxiway = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const char1 = chars.charAt(Math.floor(Math.random() * chars.length));
  // Sometimes taxiways have numbers too, but let's stick to single letter or double letter
  return char1; 
};

export const getRunways = (airport) => {
  if (airport && airport.runways && Array.isArray(airport.runways) && airport.runways.length > 0) {
    return airport.runways.map(r => r.name);
  }
  if (airport && airport.runway) {
    return [airport.runway];
  }
  // Fallback generation if no data
  return ['09L', '27R', '18L', '36R'];
};

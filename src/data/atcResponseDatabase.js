
// Simple database for ATC responses based on pilot request types
// This can be expanded with more complex logic later

export const ATC_RESPONSES = {
  // Requests
  'req_alt': (params) => {
    // 80% chance to approve, 20% to standby/deny
    if (Math.random() > 0.2) {
      return `Climb and maintain ${params.altitude}, {callsign}.`;
    } else {
      return `Unable ${params.altitude} at this time due to traffic, maintain present altitude, {callsign}.`;
    }
  },
  'req_direct': (params) => {
    return `Proceed direct ${params.waypoint}, {callsign}.`;
  },
  'req_land': (params, context) => {
    // Random runway assignment logic could go here
    const runways = ['09L', '27R', '18', '36'];
    const runway = runways[Math.floor(Math.random() * runways.length)];
    let windStr = "winds 270 at 10";
    if (context && context.weather) {
        windStr = `winds ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 10)}`;
    }
    return `Cleared to land runway ${runway}, ${windStr}, {callsign}.`;
  },
  'req_startup': () => {
    return `Startup and pushback approved, face East, QNH 1013, {callsign}.`;
  },
  'req_taxi': () => {
    const taxiways = ['Alpha', 'Bravo', 'Charlie'];
    const path = taxiways[Math.floor(Math.random() * taxiways.length)];
    return `Taxi to holding point runway 09L via taxiway ${path}, {callsign}.`;
  },
  'req_takeoff': (params, context) => {
    let windStr = "Wind 270 at 8 knots";
    if (context && context.weather) {
        windStr = `Wind ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 8)} knots`;
    }
    return `${windStr}, runway ${params.runway || '09L'} cleared for takeoff, {callsign}.`;
  },
  'req_atis': (params, context) => {
      if (context && context.weather) {
          const w = context.weather;
          const wind = `${Math.round(w.windDirection || 0)} at ${Math.round(w.windSpeed || 0)} knots`;
          const vis = (w.visibility || 10000) > 9000 ? '10km or more' : `${Math.round(w.visibility)} meters`;
          const temp = Math.round(w.temperature || 15);
          const qnh = Math.round(w.pressure || 1013);
          // Simplified ATIS
          return `Current Weather: Wind ${wind}, Visibility ${vis}, Temperature ${temp}, QNH ${qnh}. {callsign}.`;
      }
      return `Information Kilo. Wind Calm, Visibility 10km, Sky Clear, Temperature 15, QNH 1013. {callsign}.`;
  },

  // Informs
  'inf_checkin': () => {
    return `Radar contact, altimeter 29.92, {callsign}.`;
  },
  'inf_pos': () => {
    return `Radar contact, {callsign}.`;
  },
  'inf_mayday': (params) => {
    return `MAYDAY acknowledged, {callsign}. Squawk 7700. State souls on board and fuel remaining. All runways available for you.`;
  },
  'inf_pan': (params) => {
    return `PAN-PAN acknowledged, {callsign}. Report intentions.`;
  },

  // Readbacks (ATC usually doesn't respond to a readback unless it's wrong, but for game loop we might just stay silent or say "Correct")
  'ack': () => null, // No response
  'wilco': () => null,
  'rb_alt': () => null, // "Readback correct" is implied by silence usually
  'rb_hdg': () => null,
  'rb_freq': () => null,
  
  // Default fallback
  'default': () => `Station calling, say again.`
};

export const getATCResponse = (templateId, params, context) => {
  const generator = ATC_RESPONSES[templateId];
  if (generator) {
    let response = generator(params, context);
    if (!response) return null; // No response needed
    
    // Replace context placeholders
    if (context.callsign) {
      response = response.replace('{callsign}', context.callsign);
    }
    return response;
  }
  return ATC_RESPONSES['default']();
};

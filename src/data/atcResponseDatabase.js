
// Simple database for ATC responses based on pilot request types
// Expanded with phases and difficulty levels

const getDifficulty = (ctx) => ctx && ctx.difficulty ? ctx.difficulty : 'Intermediate';

export const ATC_RESPONSES_EN = {
  // --- DELIVERY ---
  'req_clearance': (params, context) => {
    const dest = params.destination || 'DEST';
    const sid = params.sid || 'SID1';
    const alt = params.altitude || 'FL300';
    const squawk = Math.floor(1000 + Math.random() * 6000);
    
    // Difficulty Scaling
    const diff = getDifficulty(context);
    if (diff === 'Rookie') {
      return `Cleared to ${dest}, via ${sid}, climb ${alt}, squawk ${squawk}. (Hint: Set transponder to ${squawk} and altitude to ${alt})`;
    } else if (diff === 'Devil') {
      // Misinformation or complex route
      return `Cleared to ${dest}, via COMPLEX2A transition, climb via SID except maintain 3000 until 5 DME, squawk ${squawk}.`;
    }

    return `Cleared to ${dest} via ${sid}, climb ${alt}, squawk ${squawk}, {callsign}.`;
  },
  'req_startup': (params, context) => {
    return `Startup and pushback approved, face East, Altimeter 29.92, {callsign}.`;
  },
  'req_pdc': (params, context) => {
    return `PDC is available. Cleared as filed. Squawk 4201, {callsign}.`;
  },
  'req_alt_brief': (params, context) => {
    return `Alternate ${params.alternate} noted, {callsign}.`;
  },
  'req_runway_confirm': (params, context) => {
    const rwy = context.departureRunway || '09L';
    return `Departure runway is ${rwy}, {callsign}.`;
  },
  'ack_clearance': () => null, // Readback correct
  'ack_squawk': () => null,
  'report_unable': (params, context) => {
    return `Roger, state intentions or preferred routing, {callsign}.`;
  },

  // --- GROUND ---
  'req_taxi': (params, context) => {
    const rwy = params.runway || context.departureRunway || '09L';
    const taxiways = ['A', 'B', 'C', 'D'];
    const path = taxiways.slice(0, 3).join('-');
    
    const diff = getDifficulty(context);
    if (diff === 'Rookie') {
      return `Taxi to runway ${rwy} via ${path}, {callsign}. (Use rudder/tiller to steer)`;
    }
    return `Taxi to holding point runway ${rwy} via ${path}, {callsign}.`;
  },
  'req_pushback': (params, context) => {
    return `Pushback approved facing ${params.direction || 'East'}, {callsign}.`;
  },
  'req_deice': () => `De-icing truck dispatched, hold position, {callsign}.`,
  'req_hold_short': () => `Hold short of runway/taxiway intersection, {callsign}.`,
  'req_cross_runway': (params) => `Crossing approved runway ${params.runway}, {callsign}.`,
  'req_return_gate': () => `Roger, taxi back to gate via Alpha, {callsign}.`,
  'report_ground_issue': (params) => `Roger, {callsign}. Do you require assistance?`,

  // --- TOWER ---
  'req_takeoff': (params, context) => {
    const rwy = params.runway || context.departureRunway || '09L';
    let wind = "Wind 270 at 8";
    if (context.weather) {
      wind = `Wind ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 8)}`;
    }
    
    const diff = getDifficulty(context);
    if (diff === 'Devil') {
       if (Math.random() > 0.7) return `Hold position, traffic on runway, {callsign}.`;
    }

    return `${wind}, runway ${rwy} cleared for takeoff, {callsign}.`;
  },
  'req_lineup': (params) => `Runway ${params.runway}, line up and wait, {callsign}.`,
  'req_land': (params, context) => {
    const rwy = params.runway || context.arrivalRunway || '27R';
    let wind = "Wind 270 at 10";
    if (context.weather) {
       wind = `Wind ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 10)}`;
    }
    return `Runway ${rwy} cleared to land, ${wind}, {callsign}.`;
  },
  'req_go_around': () => `Roger, fly runway heading, climb 3000, {callsign}.`,
  'req_missed_approach': () => `Roger missed approach, contact Departure, {callsign}.`,
  'req_short_approach': () => `Short approach approved, make short final, {callsign}.`,
  'abort_takeoff': () => `Roger, exit runway when able, contact Ground, {callsign}.`,
  'report_windshear': () => `Copy wind shear, alerting other aircraft.`,

  // --- APPROACH / DEPARTURE ---
  'inf_checkin': (params, context) => {
    return `Radar contact, altimeter 29.92, {callsign}.`;
  },
  'req_alt_change': (params, context) => {
    if (Math.random() > 0.2) {
      return `Climb and maintain ${params.altitude}, {callsign}.`;
    }
    return `Unable ${params.altitude} due to traffic, {callsign}.`;
  },
  'req_vectors_ils': (params) => `Turn left heading 240, intercept LOC runway ${params.runway}, {callsign}.`,
  'req_visual': (params) => `Cleared visual approach runway ${params.runway}, report field in sight, {callsign}.`,
  'req_holding': (params) => `Hold at ${params.waypoint}, right turns, 1 minute legs, {callsign}.`,
  'req_weather_dev': (params) => `Deviation ${params.direction} approved, report clear of weather, {callsign}.`,

  // --- CENTER ---
  'req_step_climb': (params) => `Climb and maintain ${params.altitude}, {callsign}.`,
  'req_direct': (params) => `Proceed direct ${params.waypoint}, {callsign}.`,
  'req_reroute': () => `Standby for reroute... Cleared to destination via present position direct VOR, {callsign}.`,
  'req_turbulence': () => `Roger, PIREP received. Smooth air reported at FL350.`,

  // --- EMERGENCY ---
  'inf_mayday': (params) => `MAYDAY acknowledged, {callsign}. Squawk 7700. State souls on board and fuel remaining. All runways available for you. Winds calm.`,
  'inf_pan': (params) => `PAN-PAN acknowledged, {callsign}. Report intentions.`,
  'req_priority_landing': (params) => `Priority landing approved runway ${params.runway || 'any'}, wind calm, you are number one, {callsign}.`,
  'req_emergency_descent': (params) => `Emergency descent received, clear of traffic below you, altimeter 29.92, {callsign}.`,
  'report_failure': () => `Roger, advise if assistance required, {callsign}.`,
  'inf_fuel_emergency': () => `Roger fuel emergency, cleared direct to field, runway 09L, priority handling, {callsign}.`,
  'req_crash_crew': () => `Crash crews have been alerted and are standing by, {callsign}.`,

  // --- GENERAL ---
  'req_atis': (params, context) => {
      if (context && context.weather) {
          const w = context.weather;
          const wind = `${Math.round(w.windDirection || 0)} at ${Math.round(w.windSpeed || 0)} knots`;
          const vis = (w.visibility || 10000) > 9000 ? '10km or more' : `${Math.round(w.visibility)} meters`;
          const temp = Math.round(w.temperature || 15);
          const qnh = Math.round(w.pressure || 1013);
          return `Current Weather: Wind ${wind}, Visibility ${vis}, Temperature ${temp}, QNH ${qnh}. {callsign}.`;
      }
      return `Information Kilo. Wind Calm, Visibility 10km, Sky Clear, Temperature 15, QNH 1013. {callsign}.`;
  },
  'req_freq_change': (params, context) => {
      const nextFreq = (118 + Math.random() * 10).toFixed(3);
      return `Frequency change approved. Contact Center on ${nextFreq}. Good day, {callsign}.`;
  },
  'ack': () => null,
  'wilco': () => null,
  'rb_alt': () => null,
  'rb_hdg': () => null,
  'rb_freq': () => null,
  'sys_traffic_alert': (params, context) => {
      const action = params.diff > 0 ? 'descend and maintain' : 'climb and maintain';
      return `${context.callsign || 'Station'}, traffic alert. Check altitude. Immediately ${action} ${params.assignedAltitude}.`;
  },
  'sys_readback_wrong': (params, context) => {
      return `Negative ${context.callsign}, maintain ${params.assignedAltitude}.`;
  },
  'default': () => `Station calling, say again.`
};

export const ATC_RESPONSES_ZH = {
  // Simplified Chinese responses mirroring EN structure where possible
  'req_clearance': (params) => `许可放行至 ${params.destination || '目的地'}, 离场程序 ${params.sid || 'SID'}, 爬升 ${params.altitude || 'FL300'}, 应答机 ${Math.floor(1000 + Math.random() * 6000)}, {callsign}.`,
  'req_startup': () => `同意推出开车, 机头朝东, 修正海压 29.92, {callsign}.`,
  'req_taxi': (params, context) => `沿滑行道 A, B 滑行至跑道 ${params.runway || context.departureRunway || '09L'} 等待, {callsign}.`,
  'req_takeoff': (params, context) => `跑道 ${params.runway || context.departureRunway || '09L'} 允许起飞, {callsign}.`,
  'req_land': (params, context) => `跑道 ${params.runway || context.arrivalRunway || '27R'} 允许着陆, {callsign}.`,
  'inf_checkin': () => `雷达识别, 修正海压 29.92, {callsign}.`,
  'req_alt_change': (params) => `爬升并保持 ${params.altitude}, {callsign}.`,
  'inf_mayday': () => `收到 MAYDAY, {callsign}. 应答机 7700. 报告机上人数和剩余燃油. 所有跑道为您开放.`,
  'inf_pan': () => `收到 PAN-PAN, {callsign}. 请报告意图.`,
  'req_atis': (params, context) => {
      if (context && context.weather) {
          const w = context.weather;
          const wind = `${Math.round(w.windDirection || 0)} 度, ${Math.round(w.windSpeed || 0)} 节`;
          const vis = (w.visibility || 10000) > 9000 ? '10公里或以上' : `${Math.round(w.visibility)} 米`;
          const temp = Math.round(w.temperature || 15);
          const qnh = Math.round(w.pressure || 1013);
          return `通播 Kilo. 风 ${wind}, 能见度 ${vis}, 温度 ${temp}, 修正海压 ${qnh}. {callsign}.`;
      }
      return `通播 Kilo. 风静止, 能见度 10公里, 天空晴, 温度 15, 修正海压 1013. {callsign}.`;
  },
  'req_freq_change': () => `联系区调 120.5. 再见, {callsign}.`,
  'default': () => `呼叫台, 请再说一遍.`
};

export const getATCResponse = (templateId, params, context, language = 'en') => {
  const db = language === 'zh' ? ATC_RESPONSES_ZH : ATC_RESPONSES_EN;
  // Fallback to EN if ZH missing (except default)
  const generator = db[templateId] || (language === 'zh' ? ATC_RESPONSES_EN[templateId] : null) || db['default'] || ATC_RESPONSES_EN['default'];
  
  if (generator) {
    let response = generator(params, context);
    if (!response) return null; // No response needed
    
    // Replace context placeholders
    if (context.callsign) {
      response = response.replace('{callsign}', context.callsign);
    }
    return response;
  }
  return "Station calling, say again.";
};

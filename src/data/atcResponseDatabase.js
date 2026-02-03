
// Simple database for ATC responses based on pilot request types
// This can be expanded with more complex logic later

export const ATC_RESPONSES_EN = {
  // Requests
  'req_alt': (params, context) => {
    // 80% chance to approve, 20% to standby/deny
    if (Math.random() > 0.2) {
      const currentAlt = context && context.altitude ? context.altitude : 0;
      const targetAlt = parseInt(params.altitude, 10);
      const action = targetAlt < currentAlt ? 'Descend' : 'Climb';
      return `${action} and maintain ${params.altitude}, {callsign}.`;
    } else {
      return `Unable ${params.altitude} at this time due to traffic, maintain present altitude, {callsign}.`;
    }
  },
  'req_direct': (params) => {
    return `Proceed direct ${params.waypoint}, {callsign}.`;
  },
  'req_land': (params, context) => {
    // Use assigned landing runway or random fallback
    const runways = ['09L', '27R', '18', '36'];
    const runway = (context && context.arrivalRunway) ? context.arrivalRunway : runways[Math.floor(Math.random() * runways.length)];
    let windStr = "winds 270 at 10";
    if (context && context.weather) {
        windStr = `winds ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 10)}`;
    }
    return `Cleared to land runway ${runway}, ${windStr}, {callsign}.`;
  },
  'req_startup': () => {
    return `Startup and pushback approved, face East, Altimeter 29.92, {callsign}.`;
  },
  'req_taxi': (params, context) => {
    const taxiways = ['Alpha', 'Bravo', 'Charlie'];
    const path = taxiways[Math.floor(Math.random() * taxiways.length)];
    // Use departure runway from context or fallback
    const runway = (context && context.departureRunway) ? context.departureRunway : '09L';
    return `Taxi to holding point runway ${runway} via taxiway ${path}, {callsign}.`;
  },
  'req_takeoff': (params, context) => {
    let windStr = "Wind 270 at 8 knots";
    if (context && context.weather) {
        windStr = `Wind ${Math.round(context.weather.windDirection || 270)} at ${Math.round(context.weather.windSpeed || 8)} knots`;
    }
    const runway = params.runway || (context && context.departureRunway) || '09L';
    return `${windStr}, runway ${runway} cleared for takeoff, {callsign}.`;
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
  'req_freq_change': (params, context) => {
      const nextFreq = (118 + Math.random() * 10).toFixed(3);
      return `Frequency change approved. Contact Center on ${nextFreq}. Good day, {callsign}.`;
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
  
  // System Messages
  'sys_traffic_alert': (params, context) => {
      const action = params.diff > 0 ? 'descend and maintain' : 'climb and maintain';
      return `${context.callsign || 'Station'}, traffic alert. Check altitude. Immediately ${action} ${params.assignedAltitude}.`;
  },
  'sys_readback_wrong': (params, context) => {
      return `Negative ${context.callsign}, maintain ${params.assignedAltitude}.`;
  },

  // Default fallback
  'default': () => `Station calling, say again.`
};

export const ATC_RESPONSES_ZH = {
  // Requests (CAAC Standard Phraseology)
  'req_alt': (params, context) => {
    if (Math.random() > 0.2) {
      const currentAlt = context && context.altitude ? context.altitude : 0;
      const targetAlt = parseInt(params.altitude, 10);
      const action = targetAlt < currentAlt ? '下降' : '爬升';
      return `${action}并保持 ${params.altitude} 英尺, {callsign}.`;
    } else {
      return `无法批准 ${params.altitude}, 保持当前高度, {callsign}.`;
    }
  },
  'req_direct': (params) => {
    return `直飞 ${params.waypoint}, {callsign}.`;
  },
  'req_land': (params, context) => {
    const runways = ['09L', '27R', '18', '36'];
    const runway = (context && context.arrivalRunway) ? context.arrivalRunway : runways[Math.floor(Math.random() * runways.length)];
    let windStr = "风向 270, 风速 10 节";
    if (context && context.weather) {
        windStr = `风向 ${Math.round(context.weather.windDirection || 270)}, 风速 ${Math.round(context.weather.windSpeed || 10)} 节`;
    }
    return `跑道 ${runway} 允许着陆, ${windStr}, {callsign}.`;
  },
  'req_startup': () => {
    return `同意推出开车, 机头朝东, 修正海压 29.92, {callsign}.`;
  },
  'req_taxi': (params, context) => {
    const taxiways = ['A', 'B', 'C'];
    const path = taxiways[Math.floor(Math.random() * taxiways.length)];
    const runway = (context && context.departureRunway) ? context.departureRunway : '09L';
    return `沿滑行道 ${path} 滑行至跑道 ${runway} 等待, {callsign}.`;
  },
  'req_takeoff': (params, context) => {
    let windStr = "风向 270, 8 节";
    if (context && context.weather) {
        windStr = `风向 ${Math.round(context.weather.windDirection || 270)}, ${Math.round(context.weather.windSpeed || 8)} 节`;
    }
    const runway = params.runway || (context && context.departureRunway) || '09L';
    return `${windStr}, 跑道 ${runway} 允许起飞, {callsign}.`;
  },
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
  'req_freq_change': (params, context) => {
      const nextFreq = (118 + Math.random() * 10).toFixed(3);
      return `联系区调 ${nextFreq}. 再见, {callsign}.`;
  },

  // Informs
  'inf_checkin': () => {
    return `雷达识别, 修正海压 29.92, {callsign}.`;
  },
  'inf_pos': () => {
    return `雷达识别, {callsign}.`;
  },
  'inf_mayday': (params) => {
    return `收到 MAYDAY, {callsign}. 应答机 7700. 报告机上人数和剩余燃油. 所有跑道为您开放.`;
  },
  'inf_pan': (params) => {
    return `收到 PAN-PAN, {callsign}. 请报告意图.`;
  },

  'ack': () => null,
  'wilco': () => null,
  'rb_alt': () => null,
  'rb_hdg': () => null,
  'rb_freq': () => null,
  
  // System Messages
  'sys_traffic_alert': (params, context) => {
      const action = params.diff > 0 ? '下降并保持' : '爬升并保持';
      return `${context.callsign || '台站'}, 交通警报. 检查高度. 立即 ${action} ${params.assignedAltitude}.`;
  },
  'sys_readback_wrong': (params, context) => {
      return `否定 ${context.callsign}, 保持 ${params.assignedAltitude}.`;
  },

  'default': () => `呼叫台, 请再说一遍.`
};

export const getATCResponse = (templateId, params, context, language = 'en') => {
  const db = language === 'zh' ? ATC_RESPONSES_ZH : ATC_RESPONSES_EN;
  const generator = db[templateId] || db['default'];
  
  if (generator) {
    let response = generator(params, context);
    if (!response) return null; // No response needed
    
    // Replace context placeholders
    if (context.callsign) {
      response = response.replace('{callsign}', context.callsign);
    }
    return response;
  }
  return db['default']();
};

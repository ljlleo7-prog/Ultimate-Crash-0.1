
// Simple database for ATC responses based on pilot request types
// This can be expanded with more complex logic later

import { supabase } from '../services/skylinetragedy/SupabaseClient.js';

const atcPhraseCacheKey = 'skylinetragedy_atc_phrase_templates_v2';
const atcPhraseCacheTtlMs = 12 * 60 * 60 * 1000;
let atcPhraseTemplates = [];
let atcPhraseTemplatesLoaded = false;
let atcPhraseTemplatesLoading = null;

const loadCachedTemplates = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(atcPhraseCacheKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.templates)) return null;
    if (parsed.cachedAt && Date.now() - new Date(parsed.cachedAt).getTime() > atcPhraseCacheTtlMs) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
};

const saveCachedTemplates = (templates) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(atcPhraseCacheKey, JSON.stringify({
    templates,
    cachedAt: new Date().toISOString()
  }));
};

export const initializeATCPhraseologyTemplates = async () => {
  if (atcPhraseTemplatesLoaded) return;
  if (atcPhraseTemplatesLoading) return atcPhraseTemplatesLoading;

  const cached = loadCachedTemplates();
  if (cached) {
    atcPhraseTemplates = cached.templates;
    atcPhraseTemplatesLoaded = true;
  }

  atcPhraseTemplatesLoading = (async () => {
    try {
      const { data, error } = await supabase
        .from('skylinetragedy_atc_phrase_templates')
        .select('*');
      if (error) throw error;
      if (data && Array.isArray(data)) {
        atcPhraseTemplates = data;
        saveCachedTemplates(data);
      }
    } catch (error) {
      const fallback = loadCachedTemplates();
      if (fallback) {
        atcPhraseTemplates = fallback.templates;
      }
    } finally {
      atcPhraseTemplatesLoaded = true;
      atcPhraseTemplatesLoading = null;
    }
  })();

  return atcPhraseTemplatesLoading;
};

const pickTemplate = ({ intent, phaseOfFlight, speaker, speakerRole, language }) => {
  if (!atcPhraseTemplates || atcPhraseTemplates.length === 0) return null;
  const normalizedIntent = intent ? String(intent).toLowerCase() : null;
  const normalizedPhase = phaseOfFlight ? String(phaseOfFlight).toLowerCase() : null;
  const normalizedSpeaker = speaker ? String(speaker).toLowerCase() : null;
  const normalizedRole = speakerRole ? String(speakerRole).toLowerCase() : null;
  const normalizedLanguage = language ? String(language).toUpperCase() : null;

  const matches = atcPhraseTemplates.filter(template => {
    if (normalizedIntent && String(template.intent || '').toLowerCase() !== normalizedIntent) return false;
    if (normalizedSpeaker && String(template.speaker || '').toLowerCase() !== normalizedSpeaker) return false;
    if (normalizedRole && String(template.speaker_role || '').toLowerCase() !== normalizedRole) return false;
    if (normalizedLanguage && String(template.language || '').toUpperCase() !== normalizedLanguage) return false;
    if (normalizedPhase && template.phase_of_flight) {
      return String(template.phase_of_flight).toLowerCase() === normalizedPhase;
    }
    return true;
  });

  if (matches.length > 0) {
    return matches[Math.floor(Math.random() * matches.length)];
  }

  if (normalizedPhase) {
    return pickTemplate({ intent, phaseOfFlight: null, speaker, speakerRole, language });
  }

  if (normalizedRole) {
    return pickTemplate({ intent, phaseOfFlight, speaker, speakerRole: null, language });
  }

  if (normalizedLanguage) {
    return pickTemplate({ intent, phaseOfFlight, speaker, speakerRole, language: null });
  }

  if (normalizedSpeaker) {
    return pickTemplate({ intent, phaseOfFlight, speaker: null, speakerRole, language });
  }

  return null;
};

const resolveIntent = (templateId, params, context) => {
  if (!templateId) return null;
  switch (templateId) {
    case 'req_alt': {
      const requested = parseInt(params?.altitude, 10);
      const current = Number(context?.altitude || 0);
      if (Number.isFinite(requested) && requested < current - 100) return 'descent';
      return 'climb';
    }
    case 'req_direct':
      return 'vector';
    case 'req_land':
      return 'landing';
    case 'req_startup':
      return 'clearance';
    case 'req_taxi':
      return 'taxi';
    case 'req_takeoff':
      return 'takeoff';
    case 'req_atis':
      return 'information';
    case 'req_freq_change':
      return 'handoff';
    case 'inf_mayday':
    case 'inf_pan':
      return 'emergency';
    case 'inf_checkin':
    case 'inf_pos':
      return 'checkin';
    default:
      return null;
  }
};

const resolvePhaseOfFlight = (context) => {
  const phase = context?.phaseOfFlight || context?.phase;
  if (!phase) return null;
  const normalized = String(phase).toLowerCase();
  const map = {
    boarding: 'preflight',
    departure_clearance: 'preflight',
    pushback: 'taxi',
    taxiing: 'taxi',
    takeoff_prep: 'takeoff',
    takeoff: 'takeoff',
    climb: 'climb',
    cruise: 'cruise',
    descent: 'descent',
    approach: 'approach',
    landing: 'landing'
  };
  return map[normalized] || normalized;
};

const resolveSpeakerRole = (context) => {
  const freq = context?.frequencyType || context?.stationType;
  if (!freq) return null;
  const normalized = String(freq).toLowerCase();
  const map = {
    center: 'center',
    center_control: 'center',
    ground: 'ground',
    clearance: 'delivery',
    delivery: 'delivery',
    tower: 'tower',
    departure: 'departure',
    approach: 'approach',
    atis: 'atis',
    unicom: 'unicom',
    guard: 'emergency',
    emergency: 'emergency'
  };
  return map[normalized] || normalized;
};

const resolveLanguage = (context) => {
  const lang = context?.language || context?.locale;
  if (!lang) return 'EN';
  const normalized = String(lang).toLowerCase();
  if (normalized === 'zh' || normalized === 'zh_cn' || normalized.startsWith('zh')) {
    return 'CN';
  }
  return 'EN';
};

const renderPhraseTemplate = (template, params, context) => {
  const valueMap = {
    CALLSIGN: context?.callsign,
    ALTITUDE: params?.altitude || context?.altitude,
    RUNWAY: params?.runway || context?.runway,
    WAYPOINT: params?.waypoint,
    HEADING: params?.heading || context?.heading,
    SPEED: params?.speed,
    FREQUENCY: params?.frequency,
    STATION: params?.station || context?.station,
    QNH: params?.qnh || context?.qnh,
    WIND: params?.wind,
    DIRECTION: params?.direction,
    AIRCRAFT_TYPE: params?.aircraftType || context?.aircraftType
  };

  return String(template || '')
    .replace(/\{callsign\}/gi, valueMap.CALLSIGN || '{callsign}')
    .replace(/\[([A-Z_]+)\]/g, (match, key) => {
      if (valueMap[key] === undefined || valueMap[key] === null || valueMap[key] === '') {
        return match;
      }
      return String(valueMap[key]);
    });
};

export const ATC_RESPONSES = {
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
    return `Startup and pushback approved, face East, Altimeter 29.92, {callsign}.`;
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
  'inf_altitude_alert': (params, context) => {
    const callsign = context?.callsign || '{callsign}';
    const action = params?.action || 'maintain';
    const altitude = params?.altitude || 'assigned altitude';
    return `${callsign}, traffic alert. Check altitude. Immediately ${action} ${altitude}.`;
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
  if (templateId === 'req_atis' && generator) {
    let response = generator(params, context);
    if (!response) return null;
    if (context?.callsign) {
      response = response.replace('{callsign}', context.callsign);
    }
    return response;
  }

  const intent = resolveIntent(templateId, params, context);
  const phaseOfFlight = resolvePhaseOfFlight(context);
  const speakerRole = resolveSpeakerRole(context);
  const language = resolveLanguage(context);
  const template = pickTemplate({ intent, phaseOfFlight, speaker: 'ATC', speakerRole, language });
  if (template && template.phrase_template) {
    const rendered = renderPhraseTemplate(template.phrase_template, params, context);
    if (rendered) return rendered;
  }

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

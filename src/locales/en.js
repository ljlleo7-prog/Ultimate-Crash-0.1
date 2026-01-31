const en = {
  common: {
    loading: "Loading...",
    error: "Error",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    select: "Select...",
    back: "Back",
    next: "Next",
    random: "Random",
    settings: "Settings",
    language: "Language",
    devMode: "Dev Mode"
  },
  initialization: {
    title: "Flight Initialization",
    subtitle: "Configure your flight parameters",
    sections: {
      difficulty: "01. OPERATIONAL LEVEL & INTEL",
      parameters: "02. FLIGHT PARAMETERS",
      route: "03. ROUTE SELECTION"
    },
    difficulty: {
      rookie: "ROOKIE",
      amateur: "AMATEUR",
      intermediate: "INTERMEDIATE",
      advanced: "ADVANCED",
      pro: "PRO",
      devil: "DEVIL",
      intel_label: "CREW INTELLIGENCE:",
      descriptions: {
        rookie: "Highly supportive. NPCs assist with all checks. Standard procedures strictly followed.",
        amateur: "Experienced crew. Reliable support during significant events. NPC will assist.",
        intermediate: "Standard operations. Crew follows leads and executes commands precisely.",
        advanced: "Competent but prone to hesitation or minor errors under high-stress conditions.",
        pro: "High stress. Crew acts nervously and is prone to significant mistakes during emergencies.",
        devil: "Independent priorities. Active deviation from procedures possible. Do not rely on assistance.",
        waiting: "Awaiting difficulty selection..."
      }
    },
    parameters: {
      airline: "AIRLINE",
      callsign: "CALLSIGN",
      aircraft_type: "AIRCRAFT TYPE",
      crew_count: "CREW COUNT",
      passengers: "PASSENGERS (PAX)",
      payload: "PAYLOAD (KG)",
      cruise_height: "CRUISE HEIGHT (FT)",
      reserve_fuel: "RESERVE FUEL (HOURS)",
      zulu_time: "ZULU TIME",
      season: "SEASON",
      random_checkbox: "RANDOM",
      seasons: {
        spring: "SPRING",
        summer: "SUMMER",
        autumn: "AUTUMN",
        winter: "WINTER"
      },
      placeholders: {
        operator: "OPERATOR NAME",
        flight_number: "FLIGHT NUMBER",
        count_range: "1-10",
        pax_range: "0-1000",
        weight_unit: "KG",
        height_unit: "FT",
        time_format: "HH:MMZ",
        hours: "HRS"
      }
    },
    route: {
      departure: "DEPARTURE AIRPORT",
      arrival: "ARRIVAL AIRPORT",
      search_placeholder: "SEARCH ICAO/IATA..."
    },
    summary: {
      route: "ROUTE:",
      distance: "DISTANCE:",
      est_time: "EST. TIME:",
      fuel_req: "FUEL REQ:",
      trip: "TRIP",
      rsv: "RSV",
      total: "TOTAL"
    },
    buttons: {
      next_params: "NEXT: FLIGHT PARAMETERS →",
      next_route: "NEXT: ROUTE SELECTION →",
      finalize: "FINALIZE DISPATCH & INITIALIZE"
    },
    messages: {
      random_initialized: "Random flight initialized!",
      error_random: "Error initializing random flight. Please try again."
    }
  },
  flight: {
    status: {
      starting: "Starting Flight Simulation...",
      init_physics: "Initializing physics engine...",
      error: "Initialization Error",
      reload: "Reload Page",
      situation: "Situation",
      checklist_incomplete: "Checklist Incomplete",
      active_failures: "Active Failures",
      critical: "CRITICAL",
      awaiting_instructions: "Awaiting flight instructions...",
      prepare_takeoff: "Prepare for takeoff.",
      flight_ended: "Flight Ended",
      return_init: "Return to Initialization"
    },
    sidebar: {
      checklist: "Checklist",
      f_comp: "F-Comp",
      systems: "Systems",
      timer: "Timer",
      save_load: "Save/Load",
      inspect: "Inspect",
      settings: "Settings"
    },
    panels: {
      radio: {
        title: "RADIO",
        transmit: "TRANSMIT",
        freq_busy: "FREQ BUSY",
        placeholder: "Type message...",
        frequency: "FREQUENCY"
      },
      systems: {
        engines: "ENGINES",
        hydraulics: "HYDRAULICS",
        electrics: "ELECTRICS",
        fuel: "FUEL"
      }
    }
  }
};

export default en;

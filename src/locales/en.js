import enNarratives from './narratives/en';

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
    devMode: "Dev Mode",
    you_are: "You are {context}"
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
    startup: {
      checklist: {
        battery_on: "Battery Switch ON",
        adirs_nav: "ADIRS IR 1 & 2 to NAV",
        adirs_aligning: "ADIRS Aligning ({progress}%)",
        apu_bleed_on: "APU Bleed Switch ON",
        apu_gen_on: "APU Generator Switch ON",
        apu_running: "APU Running & Stabilized (>90%)",
        engine_running: "Engine {index} Running (N2 > 50%)",
        gen_on: "Generator {index} ON",
        apu_shutdown: "APU Shutdown & APU Gen OFF",
        adirs_aligned: "ADIRS Alignment Complete"
      },
      error: {
        systems_not_init: "Systems not initialized"
      }
    },
    buttons: {
      next_params: "NEXT: FLIGHT PARAMETERS →",
      next_route: "NEXT: ROUTE SELECTION →",
      finalize: "FINALIZE DISPATCH & INITIALIZE"
    },
    messages: {
      random_initialized: "Random flight initialized!",
      error_random: "Error initializing random flight. Please try again.",
      select_airports: "Please select both departure and arrival airports"
    },
    phases: {
      boarding: "BOARDING",
      departure_clearance: "DEPARTURE CLEARANCE",
      pushback: "PUSHBACK & START",
      taxiing: "TAXI",
      takeoff_prep: "TAKEOFF PREPARATION",
      takeoff: "TAKEOFF ROLL",
      initial_climb: "INITIAL CLIMB",
      main_climb: "MAIN CLIMB",
      climb: "CLIMB",
      cruise: "CRUISE",
      descent: "DESCENT",
      approach: "APPROACH",
      landing: "LANDING",
      after_land_taxiing: "TAXI TO GATE",
      shutoff: "SHUTDOWN",
      emergency: "EMERGENCY",
      post_mortem: "FLIGHT REPORT"
    },
    tooltips: {
      random_difficulty: "Randomize Difficulty",
      random_params: "Randomize Parameters",
      random_route: "Randomize Route"
    }
  },
  flight: {
    status: {
      starting: "Starting Flight Simulation...",
      init_physics: "Initializing physics engine...",
      error: "Initialization Error",
      reload: "Reload Page",
      ready: "Ready",
      paused: "PAUSED",
      crashed: "CRITICAL FAILURE",
      landed: "LANDED SAFELY",
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
        cancel: "CANCEL",
        freq_busy: "FREQ BUSY",
        placeholder: "Type message...",
        frequency: "FREQUENCY"
      },
      systems: {
        engines: "ENGINES",
        hydraulics: "HYDRAULICS",
        electrics: "ELECTRICS",
        fuel: "FUEL",
        engine_label: "ENGINE"
      }
    },
    messages: {
      freq_busy: "[FREQUENCY BUSY]"
    },
    alerts: {
      checklist_incomplete_content: "Cannot proceed. Missing items: {items}"
    },
    immersive: {
      systems_btn: "SYSTEMS [OH PNL]",
      awaiting: "Awaiting instructions...",
      continue: "CONTINUE ►",
      startup_required: "⚠️ STARTUP REQUIRED"
    },
    panel: {
      system: {
        title: "System Status",
        warnings: "Warnings",
        no_warnings: "No active warnings",
        labels: {
          n1: "N1",
          egt: "EGT",
          fuel: "Fuel",
          oil: "Oil",
          hyd: "Hyd",
          elec: "Elec",
          gear: "Gear",
          flaps: "Flaps"
        },
        gear_state: {
          up: "UP",
          down: "DOWN"
        }
      }
    }
  },
  narrative: {
    ...enNarratives,
    labels: {
      designation: "DESIGNATION:",
      background: "BACKGROUND:",
      mission: "MISSION:",
      intelligence: "INTELLIGENCE:",
      accept: "ACCEPT ASSIGNMENT"
    },
    roles: [
      "Captain", 
      "Commander", 
      "Pilot in Command", 
      "Skipper", 
      "Chief Pilot"
    ],
    experience: {
      rookie: [
        "fresh from the flight academy. The ink on your license is barely dry.",
        "on your first week with the airline. Nerves are high, but so is your ambition.",
        "still proving yourself to the chief pilot. Every maneuver counts today.",
        "sitting in the left seat for the first time. Don't forget your training."
      ],
      amateur: [
        "building your flight hours. You know the aircraft, but she still surprises you sometimes.",
        "gaining confidence with every leg. You've handled calm skies, but today might be different.",
        "no longer a cadet, but not yet a veteran. The crew looks to you for steady hands.",
        "starting to feel at home in the cockpit, though the complex systems still demand full attention."
      ],
      intermediate: [
        "a seasoned First Officer ready for upgrade. You know the procedures by heart.",
        "an experienced pilot with thousands of hours. Standard operations are second nature.",
        "reliable and steady. The airline trusts you with their most valuable routes.",
        "competent and focused. You've seen your share of rough weather and technical glitches."
      ],
      advanced: [
        "a senior Captain. Your name is whispered with respect in the crew lounge.",
        "a veteran of the skies. You've flown through hurricanes and landed with engines out.",
        "an instructor examiner. You wrote the manual that others are struggling to learn.",
        "the master of this fleet. The aircraft feels like an extension of your own body."
      ],
      pro: [
        "a legendary aviator. They say you can land on a postage stamp in a crosswind.",
        "an ace pilot. Systems failures are just an opportunity to show off your skills.",
        "the best of the best. When others panic, you just check your watch.",
        "an elite commander. Nothing surprises you anymore, not even total hydraulic loss."
      ],
      devil: [
        "a test pilot pushing the envelope. Safety margins are just suggestions.",
        "flying a cursed aircraft. The mechanics crossed themselves when you walked out to the tarmac.",
        "facing the impossible. The odds are stacked against you, just the way you like it.",
        "about to experience a simulation designed to break you. Good luck."
      ]
    },
    flight_plan: [
      (dep, arr, pax) => `Today's manifest lists ${pax} souls on board for the leg from ${dep} to ${arr}.`,
      (dep, arr, pax) => `You are cleared for the route from ${dep} to ${arr}, carrying ${pax} passengers depending on you.`,
      (dep, arr, pax) => `The flight plan is filed: ${dep} departure, destination ${arr}. ${pax} passengers are settling into their seats.`,
      (dep, arr, pax) => `From the gate at ${dep} to the tarmac at ${arr}, you are responsible for ${pax} lives today.`
    ],
    difficulty_desc: {
      rookie: [
        "System reports are normal. Focus on your decision-making and standard procedures.",
        "Expect a routine flight with minor procedural tasks. Your crew is fully supportive.",
        "A straightforward mission ahead. Minor issues may arise, but nothing you can't handle with basic logic."
      ],
      amateur: [
        "A single, significant operational challenge is anticipated. Keep it simple and follow the checklist.",
        "You might encounter an impactful situation today, but your crew is ready to assist with the workload.",
        "Stay alert for one major event. Direct control requirements remain low, letting you focus on management."
      ],
      intermediate: [
        "Prepare for dynamic conditions and potential interference. This leg requires hands-on flying.",
        "Standard flight protocols apply, but be ready for shifting priorities and active control needs.",
        "Your crew will follow your commands precisely, but the environment is becoming increasingly unpredictable."
      ],
      advanced: [
        "Multiple critical issues may develop simultaneously. Sharp maneuvers and quick decisions are vital.",
        "Expect deadly scenarios where hands-on control is non-negotiable. Watch your crew—they may falter under pressure.",
        "The simulation will test your reflexes today. Dynamic failures require constant attention and manual intervention."
      ],
      pro: [
        "Systematic failures are imminent. Automation is unreliable; you are the primary control loop.",
        "Complex CRM and skilled maneuvering are required. Your crew is stressed and prone to significant errors.",
        "Deadly, interconnected issues will challenge every skill you have. Expect a high workload and nervous support."
      ],
      devil: [
        "Total chaos is the forecast. No autopilot, no safety nets, and no reliable assistance.",
        "The aircraft is pushed beyond its limits. Your crew might actively complicate the situation.",
        "Forget your training—this is about survival. Every system is a potential threat, and your \"help\" has their own agenda."
      ]
    }
  },
  cinematic: {
    review: {
      title: "FLIGHT MANIFEST",
      subtitle: "OFFICIAL DISPATCH DOCUMENT",
      date: "DATE",
      time: "TIME",
      page: "PAGE",
      sections: {
      flight_data: "01. FLIGHT DATA",
      route_logistics: "02. ROUTE LOGISTICS",
      metar_env: "03. METAR & ENV",
      risk: "04. OPERATIONAL RISK"
    },
    labels: {
      operator: "OPERATOR",
      aircraft: "AIRCRAFT",
      origin: "ORIGIN",
      destination: "DESTINATION",
      pax_crew: "PAX/CREW",
      payload: "PAYLOAD",
      dep_gate: "DEPARTURE GATE",
      arr_gate: "ARRIVAL GATE",
      taxi_out: "TAXIWAY OUT",
      taxi_in: "TAXIWAY IN",
      dep_rwy: "DEPARTURE RWY",
      landing_rwy: "LANDING RWY",
      sid: "SID",
      star: "STAR",
      waypoints: "WAYPOINTS",
      wind: "WIND",
      visibility: "VISIBILITY",
      turbulence: "TURBULENCE",
      cloud_cover: "CLOUD COVER",
      difficulty: "DIFFICULTY",
      failure_mode: "FAILURE MODE"
    },
    confidential: "CONFIDENTIAL",
    button: "ACKNOWLEDGE DISPATCH"
    }
  },
  route_selection: {
    title: "Detailed Route Selection",
    mode: "{difficulty} MODE",
    departure: "Departure ({airport})",
    arrival: "Arrival ({airport})",
    gate_ramp: "Gate/Ramp",
    taxiway: "Taxiway",
    runway: "Runway",
    select_runway: "Select Runway",
    sid: "SID",
    star: "STAR",
    enroute: "Enroute",
    waypoints: "Waypoints",
    generate: "Generate",
    confirm: "Confirm Route",
    skip: "Skip / Auto",
    cancel: "Cancel",
    approach: "Approach",
    final: "Final",
    placeholder_gate: "e.g. A12",
    placeholder_taxi: "e.g. A",
    placeholder_sid: "e.g. OMA12D"
  },
  search: {
    clear: "Clear selection",
    results_found: "{count} airport(s) found",
    placeholder_dep: "Search Departure (e.g. LHR, Heathrow)",
    placeholder_arr: "Search Arrival (e.g. JFK, New York)"
  }
};

export default en;

const enNarratives = {
  phases: {
    boarding: {
      default: {
        0: { title: "Boarding Started", content: "Passengers are boarding {callsign} at {departure}." },
        1: { title: "Final Call", content: "Final boarding call for {callsign}. Doors closing soon." },
        2: { title: "Cabin Prep", content: "Cabin crew preparing for departure. Passengers seated." }
      },
      sunny: {
        0: { title: "Beautiful Day", content: "Sunlight streams through the windows as passengers board {callsign}." }
      },
      rainy: {
        0: { title: "Rainy Departure", content: "Passengers shake off umbrellas as they board {callsign} in the rain." }
      },
      shakespearean: {
        0: { title: "The Boarding Begins", content: "Friends, Romans, countrymen, lend me your ears; our metal chariot awaits at {departure}." }
      }
    },
    departure_clearance: {
      default: {
        0: { title: "Requesting Clearance", content: "{callsign} requesting IFR clearance to {arrival}." },
        1: { title: "Flight Plan Filed", content: "Flight plan received. Cleared to {arrival} via flight plan route." },
        2: { title: "Readback Correct", content: "Readback correct. Contact ground for pushback." }
      },
      shakespearean: {
        0: { title: "The Permission", content: "We seek the blessing of the tower to embark upon our journey to {arrival}." }
      }
    },
    pushback: {
      default: {
        0: { title: "Pushback Approved", content: "Ground control approves pushback. Engines clear." },
        1: { title: "Tug Connected", content: "Tow bar connected. Brakes released. Pushing back." },
        2: { title: "Engine Start", content: "Starting engines. N2 rising. Oil pressure normal." }
      },
      rainy: {
        0: { title: "Wet Pushback", content: "The tug struggles for grip as we push back into the rain." }
      },
      shakespearean: {
        0: { title: "The Backward Dance", content: "We retreat from the gate, as a knight withdrawing from the court." }
      }
    },
    taxiing: {
      default: {
        0: { title: "Taxi to Runway", content: "Taxiing to active runway. Flight controls check." },
        1: { title: "Holding Short", content: "Holding short of runway. Traffic on final." },
        2: { title: "Line Up", content: "Cleared to line up and wait." }
      },
      sunny: {
        0: { title: "Taxi in Sunlight", content: "Glinting in the sun, {callsign} taxis to the runway." }
      },
      rainy: {
        0: { title: "Taxi in Rain", content: "Wipers active. {callsign} carefully taxis on the wet tarmac." }
      },
      shakespearean: {
        0: { title: "The Rolling Approach", content: "On wheels we glide towards our destiny, the runway calls." }
      }
    },
    takeoff_prep: {
      default: {
        0: { title: "Ready for Takeoff", content: "Checklist complete. Cabin secure." },
        1: { title: "Takeoff Briefing", content: "V1, Rotate, V2. In case of emergency, we return." },
        2: { title: "Tower Contact", content: "Tower, {callsign} ready for departure." }
      },
      rookie: {
        title: "Nervous Prep", content: "Checking everything twice. Hands are sweaty."
      },
      shakespearean: {
        0: { title: "The Leap of Faith", content: "Once more unto the breach, dear friends, once more!" }
      }
    },
    takeoff: {
      default: {
        0: { title: "Takeoff Roll", content: "Thrust set. Airspeed alive." },
        1: { title: "V1 Rotate", content: "V1... Rotate. Positive rate." },
        2: { title: "Gear Up", content: "Gear up. Flaps up. Contact departure." }
      },
      rookie: {
        title: "Unsteady Takeoff", content: "A bit of a wobble, but we are airborne."
      },
      rainy: {
        0: { title: "Rainy Takeoff", content: "Spraying water, we lift off into the grey clouds." }
      },
      shakespearean: {
        0: { title: "The Ascension", content: "We slip the surly bonds of Earth and touch the face of God." }
      }
    },
    initial_climb: {
      default: {
        0: { title: "Climbing Out", content: "Climbing to assigned altitude." },
        1: { title: "Departure Control", content: "Radar contact. Turn heading 090." },
        2: { title: "Through Clouds", content: "Punching through the cloud layer." }
      },
      rookie: {
        title: "Stabilizing", content: "Trying to keep the nose on the horizon."
      },
      sunny: {
        0: { title: "Climbing into Blue", content: "Breaking through the haze into clear blue skies." }
      },
      rainy: {
        0: { title: "Climbing in Cloud", content: "Entering the soup. Visibility zero." }
      },
      shakespearean: {
        0: { title: "The Upward Path", content: "Higher still and higher, from the earth thou springest." }
      }
    },
    main_climb: {
      default: {
        0: { title: "Climb to Cruise", content: "Passing 10,000ft. Lights off." },
        1: { title: "Smooth Air", content: "Climb performance normal." },
        2: { title: "Transition Altitude", content: "Altimeter standard. 18,000ft." }
      },
      shakespearean: {
        0: { title: "The Soaring", content: "We climb the mountain of air, towards the peak of our journey." }
      }
    },
    cruise: {
      default: {
        0: { title: "Cruise Level", content: "Reached cruise altitude. Autopilot engaged." },
        1: { title: "Passenger Service", content: "Seatbelt sign off. Meal service started." },
        2: { title: "Navigation Check", content: "Waypoints checking out. Fuel flow normal." }
      },
      sunny: {
        0: { title: "Smooth Cruise", content: "Not a cloud in sight. The world below is a map." }
      },
      shakespearean: {
        0: { title: "The High Road", content: "Between the firmament and the ground, we hold our course." }
      }
    },
    descent: {
      default: {
        0: { title: "Descent Started", content: "Top of descent. Power idle." },
        1: { title: "Crossing Altitude", content: "Crossing 10,000ft. Lights on." },
        2: { title: "Approach Briefing", content: "Briefing confirmed. Landing data set." }
      },
      rainy: {
        0: { title: "Descent into Gloom", content: "Descending into the storm front." }
      },
      shakespearean: {
        0: { title: "The Return", content: "What goes up must come down. We begin our return to earth." }
      }
    },
    approach: {
      default: {
        0: { title: "On Approach", content: "Vectoring for final approach." },
        1: { title: "Localizer Captured", content: "Localizer captured. Glideslope alive." },
        2: { title: "Cleared to Land", content: "Gear down. Three green. Cleared to land." }
      },
      rainy: {
        0: { title: "Instrument Approach", content: "Relying on instruments. Runway in sight... soon." }
      },
      shakespearean: {
        0: { title: "The Final Mile", content: "The ground rises to meet us, like an old friend." }
      }
    },
    landing: {
      default: {
        0: { title: "Final Approach", content: "500... 100... 50..." },
        1: { title: "Touchdown", content: "Touchdown. Spoilers deployed. Reverse thrust." },
        2: { title: "Rollout", content: "60 knots. Manual braking. Vacating runway." }
      },
      rainy: {
        0: { title: "Wet Landing", content: "Hydroplaning risk. Firm touchdown." }
      },
      shakespearean: {
        0: { title: "The Arrival", content: "We have kissed the ground once more." }
      }
    },
    after_land_taxiing: {
      default: {
        0: { title: "Taxi to Gate", content: "Welcome to {arrival}. Please remain seated." },
        1: { title: "Ground Control", content: "Contact ground. Taxi to gate via Alpha." },
        2: { title: "Parking", content: "Approaching gate. Marshaller in sight." }
      },
      shakespearean: {
        0: { title: "The Final Roll", content: "Our journey ends, the gate awaits." }
      }
    },
    shutoff: {
      default: {
        0: { title: "Shutdown", content: "Parking brake set. Engines cut." },
        1: { title: "Deboard", content: "Seatbelt sign off. Doors disarmed." },
        2: { title: "Flight Complete", content: "Welcome to the destination. Flight complete." }
      },
      shakespearean: {
        0: { title: "The Silence", content: "The beast sleeps. Our work is done." }
      }
    }
  },
  failures: {
    engine: {
      minor: "Engine {engineIndex} EGT rising rapidly. Vibration detected.",
      critical: "Engine {engineIndex} FIRE! Shutting down engine immediately.",
      resolved: "Engine {engineIndex} restored to normal operation."
    },
    hydraulic: {
      minor: "Primary hydraulic pressure dropping. Check systems.",
      critical: "Primary hydraulic system FAILURE! Manual reversion required!",
      resolved: "Hydraulic pressure stabilized. System restored."
    },
    electrical: {
      minor: "Electrical bus {bus} experiencing intermittent power loss.",
      critical: "Main electrical bus FAILURE! Emergency power engaged!",
      resolved: "Electrical bus power restored to normal levels."
    },
    fuel: {
      minor: "Fuel imbalance detected. Crossfeed engaged automatically.",
      critical: "Fuel leak detected! Rapid fuel loss occurring!",
      resolved: "Fuel imbalance resolved."
    },
    title: {
      alert: "System Alert",
      critical: "Critical Failure Alert",
      restored: "System Restored"
    }
  },
  defaults: {
    failure: {
      minor: "System {type} failure detected.",
      critical: "System {type} CRITICAL FAILURE!",
      resolved: "System {type} restored."
    }
  }
};

export default enNarratives;

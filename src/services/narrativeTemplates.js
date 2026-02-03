export const NarrativeTemplates = {
  boarding: [
    {
      title: 'narrative.phases.boarding.default.0.title',
      content: 'narrative.phases.boarding.default.0.content'
    },
    {
      title: 'narrative.phases.boarding.default.1.title',
      content: 'narrative.phases.boarding.default.1.content'
    },
    {
      title: 'narrative.phases.boarding.default.2.title',
      content: 'narrative.phases.boarding.default.2.content'
    }
  ],
  departure_clearance: [
    {
      title: 'narrative.phases.departure_clearance.default.0.title',
      content: 'narrative.phases.departure_clearance.default.0.content'
    },
    {
      title: 'narrative.phases.departure_clearance.default.1.title',
      content: 'narrative.phases.departure_clearance.default.1.content'
    },
    {
      title: 'narrative.phases.departure_clearance.default.2.title',
      content: 'narrative.phases.departure_clearance.default.2.content'
    }
  ],
  pushback: [
    {
      title: 'narrative.phases.pushback.default.0.title',
      content: 'narrative.phases.pushback.default.0.content'
    },
    {
      title: 'narrative.phases.pushback.default.1.title',
      content: 'narrative.phases.pushback.default.1.content'
    },
    {
      title: 'narrative.phases.pushback.default.2.title',
      content: 'narrative.phases.pushback.default.2.content'
    }
  ],
  taxiing: [
    {
      title: 'narrative.phases.taxiing.default.0.title',
      content: 'narrative.phases.taxiing.default.0.content'
    },
    {
      title: 'narrative.phases.taxiing.default.1.title',
      content: 'narrative.phases.taxiing.default.1.content'
    },
    {
      title: 'narrative.phases.taxiing.default.2.title',
      content: 'narrative.phases.taxiing.default.2.content'
    }
  ],
  takeoff_prep: [
    {
      title: 'narrative.phases.takeoff_prep.default.0.title',
      content: 'narrative.phases.takeoff_prep.default.0.content'
    },
    {
      title: 'narrative.phases.takeoff_prep.default.1.title',
      content: 'narrative.phases.takeoff_prep.default.1.content'
    },
    {
      title: 'narrative.phases.takeoff_prep.default.2.title',
      content: 'narrative.phases.takeoff_prep.default.2.content'
    }
  ],
  takeoff: [
    {
      title: 'narrative.phases.takeoff.default.0.title',
      content: 'narrative.phases.takeoff.default.0.content'
    },
    {
      title: 'narrative.phases.takeoff.default.1.title',
      content: 'narrative.phases.takeoff.default.1.content'
    },
    {
      title: 'narrative.phases.takeoff.default.2.title',
      content: 'narrative.phases.takeoff.default.2.content'
    }
  ],
  initial_climb: [
    {
      title: 'narrative.phases.initial_climb.default.0.title',
      content: 'narrative.phases.initial_climb.default.0.content'
    },
    {
      title: 'narrative.phases.initial_climb.default.1.title',
      content: 'narrative.phases.initial_climb.default.1.content'
    },
    {
      title: 'narrative.phases.initial_climb.default.2.title',
      content: 'narrative.phases.initial_climb.default.2.content'
    }
  ],
  main_climb: [
    {
      title: 'narrative.phases.main_climb.default.0.title',
      content: 'narrative.phases.main_climb.default.0.content'
    },
    {
      title: 'narrative.phases.main_climb.default.1.title',
      content: 'narrative.phases.main_climb.default.1.content'
    },
    {
      title: 'narrative.phases.main_climb.default.2.title',
      content: 'narrative.phases.main_climb.default.2.content'
    }
  ],
  cruise: [
    {
      title: 'Cruising at FL350',
      content: 'Level at 35,000 feet. The horizon is a curved line of haze. "Maintain Mach 0.78." The engines hum with a steady, reassuring rhythm. Passengers are settling in for the flight to ${arrival}.'
    },
    {
      title: 'The Long Haul',
      content: 'The sun moves slowly across the cockpit. Waypoints tick by on the navigation display. Fuel flow is nominal. The world below is a patchwork of clouds and terrain. A peaceful moment at 450 knots true airspeed.'
    },
    {
      title: 'Cruise Phase',
      content: 'Coffee is served in the cockpit. You monitor the systems - all green. Outside, the temperature is -54°C. The ${aircraft} cuts through the thin air effortlessly. Estimated time to destination: 2 hours.'
    }
  ],
  descent: [
    {
      title: 'Top of Descent',
      content: 'Throttles back. The pitch drops slightly as we begin our descent. "Descend and maintain 10,000 feet." The destination ${arrival} lies ahead.'
    },
    {
      title: 'Descent Initiation',
      content: 'The engines spool down to idle. The wind noise increases slightly as the speedbrakes extend to manage speed. "${callsign}, cross WPT at FL240." Descending through the flight levels.'
    },
    {
      title: 'Descending',
      content: 'The clouds below are getting closer. Seatbelt sign back on. "Cabin crew, prepare for landing." We are beginning our arrival into the ${arrival} area. Altimeters reset to local pressure.'
    }
  ],
  approach: [
    {
      title: 'Approach to ${arrival}',
      content: 'Lined up for runway ${landingRunway}. "Gear down, flaps 30." The runway threshold looms ahead through the haze. Speed checked, localizer captured.'
    },
    {
      title: 'Final Approach',
      content: 'Turning base to final. The runway lights pierce the gloom. "Three green, flaps full." Speed is Vref + 5. The PAPI lights show two white, two red. Perfect profile.'
    },
    {
      title: 'On Final',
      content: '"${callsign}, cleared to land runway ${landingRunway}." Disengaging autopilot. The controls feel heavy and responsive. Crosswind correction applied. The runway numbers expand in the windscreen.'
    }
  ],
  landing: [
    {
      title: 'Touchdown',
      content: 'Flare... Touchdown. Spoilers deployed. Reverse thrust roaring. "${callsign}, welcome to ${arrival}." Braking to taxi speed.'
    },
    {
      title: 'Landing Roll',
      content: 'The wheels kiss the pavement. A firm landing. Nose gear down. "Decel." Manual braking. You turn off the high-speed exit. "Contact Ground on 121.9."'
    },
    {
      title: 'Arrival',
      content: 'Main gear down... smoke from the tires. Reversers green. 80 knots. 60 knots. We have arrived at ${arrival}. The cabin erupts in the usual shuffling sounds of arrival.'
    }
  ],
  after_land_taxiing: [
    {
      title: 'Taxi to Gate',
      content: '"Turn left next taxiway, contact Ground." The flight is over. Taxing past other aircraft to our assigned gate.'
    },
    {
      title: 'Taxiing In',
      content: 'Flaps retracting. APU starting up. We navigate the busy apron of ${arrival}. "Hold short of gate B4, waiting for aircraft pushback." Almost there.'
    },
    {
      title: 'Arrival Taxi',
      content: 'The gate guidance system lights up. "Left... left... stop." Parking brake set. Engines spooling down. The jetway starts to move toward the door.'
    }
  ],
  shutoff: [
    {
      title: 'Engine Shutdown',
      content: 'Parking brake set. Fuel cutoff. The engines spin down into silence. APU off. "Thank you for flying with us." Flight complete.'
    },
    {
      title: 'Shutdown Checklist',
      content: 'Seatbelt sign off. Hydraulics off. The aircraft goes dark as we switch to ground power. The last passengers are deplaning. Another successful flight in the logbook.'
    },
    {
      title: 'Post-Flight',
      content: 'The cockpit becomes quiet. completing the shutdown checklist. Outside, the baggage handlers are already unloading. Time to head to the hotel.'
    }
  ]
};

export const getRandomTemplate = (phaseType) => {
  const templates = NarrativeTemplates[phaseType];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
};

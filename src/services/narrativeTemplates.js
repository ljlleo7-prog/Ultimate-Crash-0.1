export const NarrativeTemplates = {
  boarding: [
    {
      title: 'Boarding at ${departure}',
      content: 'The smell of jet fuel and coffee fills the cabin. Passengers shuffle down the aisle, stowing bags overhead. Outside, the ramp crew is loading the final containers. "Welcome aboard ${callsign}," the flight attendant announces. The ${aircraft} is ready for the journey to ${arrival}.'
    },
    {
      title: 'Boarding in Progress',
      content: 'Rain streaks the windows at ${departure} as passengers settle in. The soft chime of the cabin overheads closing punctuates the low hum of the APU. "Boarding is complete," the gate agent confirms. We are preparing for our flight to ${arrival}.'
    },
    {
      title: 'Welcome Aboard',
      content: 'Sunlight streams through the windows of the ${aircraft}. The cabin crew is conducting final safety checks. "Ladies and gentlemen, welcome to flight ${callsign} service to ${arrival}." The air is cool and crisp from the AC vents.'
    }
  ],
  departure_clearance: [
    {
      title: 'IFR Clearance',
      content: 'The radio crackles to life. "${callsign}, cleared to ${arrival} via flight plan route. Climb and maintain FL350. Departure frequency 124.7. Squawk 4211." You read back the clearance as the navigation displays align.'
    },
    {
      title: 'Receiving Clearance',
      content: '"${callsign}, advise when ready to copy." You grab your pen. "Cleared to ${arrival}, maintain flight level 350, expect higher 10 minutes after departure." The flight computer is programmed and verified.'
    },
    {
      title: 'Pre-Departure Check',
      content: 'Cockpit preparation complete. Altimeters set. "${callsign}, clearance valid. Contact ground on 121.9 for push." The frequencies are tuned. The crew is ready.'
    }
  ],
  pushback: [
    {
      title: 'Pushback Approved',
      content: 'A gentle jolt as the tug connects. "Ground to Cockpit, brakes released." The terminal building slowly drifts away. The hum of the APU is replaced by the rising whine of the main turbines starting up.'
    },
    {
      title: 'Push and Start',
      content: '"Commencing pushback, engines clear." The tug groans as it pushes the heavy ${aircraft} back. Engine 2 N1 rising... fuel flow normal. Engine 1 N1 rising. Good start on both.'
    },
    {
      title: 'Leaving the Gate',
      content: 'The marshaller waves his wands. "Brakes released, pushback commencing." You watch the wingwalkers guide the tips. The engines roar to life with a deep vibration felt through the floor.'
    }
  ],
  taxiing: [
    {
      title: 'Taxi to Runway ${departureRunway}',
      content: '"${callsign}, taxi to runway ${departureRunway} via Alpha, Bravo." You release the parking brake. The tires thump rhythmically over the concrete joints. Sunlight glints off the tarmac as you weave through the taxiways.'
    },
    {
      title: 'Taxiing',
      content: 'The aircraft sways gently as you navigate the taxiways. "${callsign}, give way to the 737 on your right." You hold short, watching the other traffic pass. "Continue to holding point runway ${departureRunway}."'
    },
    {
      title: 'Head to Runway',
      content: 'Taxi lights on. The long line of blue lights guides you toward runway ${departureRunway}. The cabin crew performs the safety demonstration. "Cabin ready for departure," the interphone chimes.'
    }
  ],
  takeoff: [
    {
      title: 'Takeoff Clearance',
      content: 'Lined up on runway ${departureRunway}. "Wind 130 at 8, runway ${departureRunway} cleared for takeoff." Throttles forward. The engines roar to life, pressing you back into the seat. Rotate at Vr.'
    },
    {
      title: 'Rolling',
      content: '"${callsign}, cleared for takeoff." You advance the thrust levers. TOGA set. The centerline lights blur into a stream of white. Airspeed alive. 80 knots... V1... Rotate. The ground drops away.'
    },
    {
      title: 'Departure',
      content: 'Full power. The engine vibration turns into a smooth hum as speed builds. The runway rushing beneath. Pulling back on the yoke, the nose lifts, and the main wheels leave the ground. Positive rate.'
    }
  ],
  initial_climb: [
    {
      title: 'Positive Rate',
      content: 'The ground falls away. "Gear up." Punching through the lower cloud layer into the sunlight. The city of ${departure} shrinks into a miniature grid below. Speed increasing to 250 knots.'
    },
    {
      title: 'Climbing Out',
      content: 'Banking left to intercept the departure radial. Flaps retracting. The air is turbulent near the cloud tops. "Contact Departure on 124.7." You switch frequencies. "${callsign} with you passing 3,000 for 5,000."'
    },
    {
      title: 'Departure Phase',
      content: 'The altimeter winds up rapidly. The view outside clears as you break through the haze layer. The engines settle into a climb thrust. "Resume navigation," ATC directs. Direct to the first waypoint.'
    }
  ],
  main_climb: [
    {
      title: 'Climb to Cruise',
      content: 'Passing 10,000 feet. "Accelerate to cruise speed." The sky darkens to a deeper blue as we ascend. The air is smooth. Climbing steadily to Flight Level 350.'
    },
    {
      title: 'Ascending',
      content: 'The seatbelt sign dings off. Passengers begin to move about. Outside, the horizon stretches endlessly. We are crossing the transition altitude, setting standard pressure 29.92.'
    },
    {
      title: 'Enroute Climb',
      content: 'Climbing through FL240. The engines are efficient at this altitude. "Traffic 2 o\'clock, 10 miles, 1,000 feet above." You spot the contrail of another liner crossing high above.'
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

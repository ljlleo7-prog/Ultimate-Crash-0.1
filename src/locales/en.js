const en = {
  narrative: {
    awaiting: 'Awaiting instructions...',
    phases: {
      boarding: {
        default: {
          0: {
            title: 'Boarding at ${departure}',
            content: 'The smell of jet fuel and coffee fills the cabin as passengers stow their luggage. Outside, the ground crew is prepping for our departure. "Welcome aboard ${callsign}," the flight attendant announces over the PA. The ${aircraft} is ready for the journey to ${arrival}.'
          },
          1: {
            title: 'Final Boarding Call',
            content: 'Passengers are taking their seats. The cabin crew is performing final checks. The captain welcomes everyone aboard. "We have a smooth flight ahead to ${arrival}." The doors will be closing shortly.'
          },
          2: {
            title: 'Pre-flight Checks',
            content: 'Cockpit preparation is underway. Checking fuel, route, and systems. "Boarding complete," the gate agent confirms. The jetway retracts. We are ready to go.'
          }
        },
        sunny: {
            0: {
                title: 'Sunny Departure',
                content: 'Sunlight streams through the windows as passengers board. It\'s a beautiful day for flying. "Welcome to ${callsign}," the crew greets everyone warmly.'
            }
        },
        rainy: {
            0: {
                title: 'Rainy Boarding',
                content: 'Rain drums against the fuselage as passengers hurry on board. "Watch your step," the crew advises. A gray day for a flight to ${arrival}.'
            }
        },
        shakespearean: {
            0: {
                title: 'The Stage is Set',
                content: 'Friends, Romans, countrymen, lend me your ears! We embark upon a journey to ${arrival}. The iron bird awaits its masters.'
            }
        }
      },
      departure_clearance: {
        default: {
          0: {
            title: 'IFR Clearance',
            content: 'The radio crackles. "${callsign}, cleared to ${arrival} via flight plan route. Climb and maintain FL350. Departure frequency 124.7. Squawk 4211." You read back the clearance as the systems come online.'
          },
          1: {
            title: 'Clearance Delivery',
            content: '"${callsign}, ready to copy clearance." "Cleared to ${arrival}, maintain 5000, expect FL350 ten minutes after departure." The pen scratches on the pad. "Readback correct."'
          },
          2: {
            title: 'Route Confirmation',
            content: 'Verifying the route to ${arrival}. "Clearance received," the First Officer nods. Setting up the FMS and checking the squawk code. Ready for pushback.'
          }
        },
        shakespearean: {
            0: {
                title: 'Permission Granted',
                content: 'The gods of the ether have spoken! We are granted passage to the lands of ${arrival}. Let us ascend!'
            }
        }
      },
      pushback: {
        default: {
          0: {
            title: 'Pushback Approved',
            content: 'A gentle jolt as the tug connects. "Ground to Cockpit, brakes released." The terminal building slowly drifts away as you start the engines. The hum of the APU is replaced by the roar of the main turbines.'
          },
          1: {
            title: 'Starting Engines',
            content: '"Pushback complete, set parking brake." "Starting engine 2." The N2 rises, followed by fuel flow and light off. A good start. "Starting engine 1."'
          },
          2: {
            title: 'Better Pushback',
            content: 'The tug pushes us back onto the taxiway. "Clear to start." The engines whine to life. "Tow bar disconnected, hand signals on the left." We are under our own power.'
          }
        },
        rainy: {
            0: {
                title: 'Wet Pushback',
                content: 'Rain streaks the windshield as we push back. The tarmac glistens under the lights. "Engine start approved." The spray kicks up behind us.'
            }
        },
        shakespearean: {
            0: {
                title: 'Backward We Go',
                content: 'We retreat to advance! The beast awakens, breathing fire and smoke. Release us from our tether!'
            }
        }
      },
      taxiing: {
        default: {
          0: {
            title: 'Taxi to Runway ${departureRunway}',
            content: '"${callsign}, taxi to runway ${departureRunway} via Alpha, Bravo." You release the parking brake. The tires thump rhythmically over the concrete joints as you weave through the maze of taxiways. Sunlight glints off the tarmac.'
          },
          1: {
            title: 'Taxi Instructions',
            content: '"Hold short of runway 27L." We taxi past heavy jets. "Give way to the 747 on your right." Proceeding to the holding point. Flaps set for takeoff.'
          },
          2: {
            title: 'On the Move',
            content: 'Rolling out to the active runway. Performing flight control checks. "Cabin crew, prepare for takeoff." The long line of planes awaits departure.'
          }
        },
        sunny: {
            0: {
                title: 'Bright Taxi',
                content: 'The sun is blinding as we taxi. Heat haze shimmers over the runway. "Taxi to holding point." Ready to fly.'
            }
        },
        rainy: {
            0: {
                title: 'Slippery Taxi',
                content: 'Wipers on. The taxiway lights reflect in the puddles. "Caution, braking action reported medium." We taxi carefully to the runway.'
            }
        },
        shakespearean: {
            0: {
                title: 'The March Begins',
                content: 'We march towards destiny! The path is winding, but the destination is clear. To the runway!'
            }
        }
      },
      takeoff_prep: {
        default: {
          0: {
            title: 'Lined Up and Waiting',
            content: 'Lined up on runway ${departureRunway}. Brakes set. Engines at idle. "Tower, ${callsign} holding in position ${departureRunway}, ready for takeoff." Check flaps, trim, and verify takeoff data.'
          },
          1: {
            title: 'Holding Position',
            content: 'Waiting for traffic to clear. "Line up and wait, runway ${departureRunway}." We position on the centerline. The runway stretches out before us.'
          },
          2: {
            title: 'Final Checks',
            content: 'Before takeoff checklist complete. "Approaching departure." Engines stable. "Ready to go?" The captain asks. "Ready," you reply.'
          }
        },
        rookie: {
            title: 'Ready for Takeoff',
            content: 'You are on the runway. Push the throttle forward to take off! Pull back on the stick when you reach speed.'
        },
        shakespearean: {
            0: {
                title: 'The Precipice',
                content: 'We stand upon the edge of the world! The sky beckons. Shall we fly, or shall we fall?'
            }
        }
      },
      takeoff: {
        default: {
          0: {
            title: 'Takeoff Clearance',
            content: 'Lined up on runway ${departureRunway}. "Wind 130 at 8, runway ${departureRunway} cleared for takeoff." Throttles forward. The engines roar to life, pressing you back into the seat. Rotate at Vr.'
          },
          1: {
            title: 'Rolling',
            content: '"Takeoff thrust set." 80 knots. "V1, Rotate." The nose lifts off the ground. We leave the earth behind.'
          },
          2: {
            title: 'Airborne',
            content: 'Full power. The runway blurs. Pulling back. The wheels leave the tarmac. "Positive rate, gear up." We are flying.'
          }
        },
        rookie: {
            title: 'Takeoff!',
            content: 'Full power! Pull up! You are flying!'
        },
        rainy: {
            0: {
                title: 'Wet Takeoff',
                content: 'Spray kicks up from the wheels. Throttles forward. We pierce through the rain and into the clouds.'
            }
        },
        shakespearean: {
            0: {
                title: 'Ascension',
                content: 'We defy gravity! The earth cannot hold us. Up, up, into the heavens!'
            }
        }
      },
      initial_climb: {
        default: {
          0: {
            title: 'Positive Rate',
            content: 'The ground falls away beneath you. "Gear up." Punching through the lower cloud layer into the sunlight. The city of ${departure} shrinks into a miniature grid below. Speed increasing to 250 knots.'
          },
          1: {
            title: 'Climbing Out',
            content: '"Contact Departure." "Climbing to 5000." Flaps up. The view is spectacular. Proceeding on course.'
          },
          2: {
            title: 'Departure',
            content: 'Turning to intercept the radial. "Maintain 250 knots." The airport is far behind us now. Climbing steadily.'
          }
        },
        rookie: {
            title: 'Climbing',
            content: 'Keep climbing! Don\'t go too fast or too slow.'
        },
        sunny: {
            0: {
                title: 'Sunny Climb',
                content: 'Breaking through the haze into brilliant sunshine. The world below is a map. Climbing to cruise.'
            }
        },
        rainy: {
            0: {
                title: 'Cloudy Climb',
                content: 'Entering the clouds. Visibility drops. Flying by instruments. Turbulence shakes the wings.'
            }
        },
        shakespearean: {
            0: {
                title: 'Higher Still',
                content: 'We soar on wings of steel! The clouds are our domain. Higher, ever higher!'
            }
        }
      },
      main_climb: {
        default: {
          0: {
            title: 'Climb to Cruise',
            content: 'Passing 10,000 feet. "Accelerate to cruise speed." The sky darkens to a deeper blue as we ascend. The air is smooth. Climbing steadily to Flight Level 350.'
          },
          1: {
            title: 'Passing FL180',
            content: '"Altimeters standard." The air is thin and cold. The engines are efficient here. Settling in for the long haul.'
          },
          2: {
            title: 'High Altitude',
            content: 'Approaching top of climb. The curve of the earth is visible. "Traffic at 2 o\'clock." We are in the high airways.'
          }
        },
        shakespearean: {
            0: {
                title: 'The Summit',
                content: 'We reach for the stars! The air is thin, but our spirits are high. Onward to the destination!'
            }
        }
      },
      cruise: {
        default: {
          0: {
            title: 'Cruising at FL350',
            content: 'Level at 35,000 feet. The horizon is a curved line of haze. "Maintain Mach 0.78." The engines hum with a steady, reassuring rhythm. Passengers are settling in for the flight to ${arrival}.'
          },
          1: {
            title: 'Smooth Flight',
            content: 'Autopilot is engaged. Monitoring systems. Fuel flow is nominal. "Coffee?" the flight attendant asks. A peaceful journey.'
          },
          2: {
            title: 'Mid-flight',
            content: 'Halfway there. Checking navigation. Waypoints pass by. The sun sets on the horizon, painting the sky in orange and purple.'
          }
        },
        sunny: {
            0: {
                title: 'Clear Skies',
                content: 'Not a cloud in sight. The ground is visible miles below. Perfect flying weather.'
            }
        },
        shakespearean: {
            0: {
                title: 'The Voyage',
                content: 'We sail the ocean of the sky. The wind is our friend. Peace reigns in the heavens.'
            }
        }
      },
      descent: {
        default: {
          0: {
            title: 'Top of Descent',
            content: 'Throttles back. The pitch drops slightly as we begin our descent. "Descend and maintain 10,000 feet." The destination ${arrival} lies ahead.'
          },
          1: {
            title: 'Descending',
            content: '"Cross constraint at 12,000." Spoilers out to slow down. The city lights of ${arrival} appear in the distance. Preparing for arrival.'
          },
          2: {
            title: 'Arrival Prep',
            content: 'Checking arrival ATIS. "Altimeters set." Cabin crew prepare for landing. Descending through the clouds.'
          }
        },
        rainy: {
            0: {
                title: 'Descent into Rain',
                content: 'Descending into the gloom. Rain lashes the windows again. "Expect ILS approach." Radar shows storms ahead.'
            }
        },
        shakespearean: {
            0: {
                title: 'The Return',
                content: 'We descend from our throne! The earth reclaims us. Prepare for the return to the mortal coil.'
            }
        }
      },
      approach: {
        default: {
          0: {
            title: 'Approach to ${arrival}',
            content: 'Lined up for runway ${landingRunway}. "Gear down, flaps 30." The runway threshold looms ahead through the haze. Speed checked, localized captured.'
          },
          1: {
            title: 'Final Approach',
            content: '"Cleared to land." Three greens. Checklist complete. Focusing on the touchdown zone. 1000 feet.'
          },
          2: {
            title: 'Short Final',
            content: '500 feet. Stable approach. "Land check." The runway lights are bright. Almost there.'
          }
        },
        rainy: {
            0: {
                title: 'Stormy Approach',
                content: 'Fighting the crosswind. Wipers on high. The runway appears out of the mist. "Minimums." Continuing.'
            }
        },
        shakespearean: {
            0: {
                title: 'The Landing',
                content: 'The ground rushes to meet us! Steady now, steady. We shall kiss the earth!'
            }
        }
      },
      landing: {
        default: {
          0: {
            title: 'Touchdown',
            content: 'Flare... Touchdown. Spoilers deployed. Reverse thrust roaring. "${callsign}, welcome to ${arrival}." Braking to taxi speed.'
          },
          1: {
            title: 'Landed',
            content: 'Firm touchdown. "Speedbrakes up, reversers normal." Slowing down. "Turn off next taxiway." We made it.'
          },
          2: {
            title: 'Arrival',
            content: 'Greased it. Smooth rollout. "Welcome to ${arrival}." Passengers applaud. Exiting the runway.'
          }
        },
        rainy: {
            0: {
                title: 'Wet Landing',
                content: 'Hydroplaning risk. Firm landing to break the water tension. Spray everywhere. Slowing safely.'
            }
        },
        shakespearean: {
            0: {
                title: 'Safe Return',
                content: 'We have returned! The journey ends. Glory to the pilots!'
            }
        }
      },
      after_land_taxiing: {
        default: {
          0: {
            title: 'Taxi to Gate',
            content: '"Turn left next taxiway, contact Ground." The flight is over. Taxing past other aircraft to our assigned gate.'
          },
          1: {
            title: 'Parking',
            content: 'Cleaning up the aircraft. Flaps up, lights off. Approaching the terminal. The marshaller waves us in.'
          },
          2: {
            title: 'Gate Arrival',
            content: 'Turning into the gate. "Stop." Parking brake set. Engines cooling down. Welcome home.'
          }
        },
        shakespearean: {
            0: {
                title: 'The End',
                content: 'The chariot stops. The journey is done. Rest now, weary travelers.'
            }
        }
      },
      shutoff: {
        default: {
          0: {
            title: 'Engine Shutdown',
            content: 'Parking brake set. Fuel cutoff. The engines spin down into silence. APU off. "Thank you for flying with us." Flight complete.'
          },
          1: {
            title: 'Debrief',
            content: 'Completing the logbook. Passengers disembarking. The aircraft is quiet. Job well done.'
          },
          2: {
            title: 'Shutdown',
            content: 'All systems off. The cockpit goes dark. One last look at the plane. Until next time.'
          }
        },
        shakespearean: {
            0: {
                title: 'Silence',
                content: 'Silence falls. The beast sleeps. Exeunt all.'
            }
        }
      }
    }
  },
  failures: {
    engine: {
      minor: 'Engine ${engineIndex + 1} showing abnormal vibrations. Monitor closely.',
      critical: 'Engine ${engineIndex + 1} FAILED! Immediate action required!',
      resolved: 'Engine ${engineIndex + 1} restored to normal operation.'
    },
    hydraulic: {
      minor: 'Primary hydraulic pressure dropping. Check systems.',
      critical: 'Primary hydraulic system FAILURE! Manual reversion required!',
      resolved: 'Hydraulic pressure stabilized. System restored.'
    },
    electrical: {
      minor: 'Electrical bus ${bus} experiencing intermittent power loss.',
      critical: 'Main electrical bus FAILURE! Emergency power engaged!',
      resolved: 'Electrical bus power restored to normal levels.'
    },
    fuel: {
      minor: 'Fuel imbalance detected. Crossfeed engaged automatically.',
      critical: 'Fuel leak detected! Rapid fuel loss occurring!',
      resolved: 'Fuel imbalance resolved.'
    },
    default: {
      minor: 'System ${type} failure detected.',
      critical: 'System ${type} CRITICAL FAILURE!',
      resolved: 'System ${type} restored.'
    }
  },
  ui: {
    debug: {
        title: 'FLIGHT DATA & LNAV',
        lat: 'Lat:',
        lon: 'Lon:',
        alt: 'Alt:',
        ias: 'IAS:',
        gs: 'GS:',
        mode: 'Mode:',
        engaged: 'ACTIVE',
        off: 'OFF',
        tgt_hdg: 'Target Hdg:',
        hdg_err: 'Hdg Error:',
        tgt_roll: 'Tgt Roll:',
        act_roll: 'Act Roll:',
        ils_status: 'ILS STATUS',
        dist: 'Dist:',
        loc_err: 'LOC Err:',
        gs_err: 'G/S Err:',
        tgt_alt: 'Tgt Alt:',
        next_wp: 'Next WP:',
        wp_index: 'WP Index:'
    },
    flight: {
        time_zulu: 'Time (Zulu)',
        fuel: 'Fuel',
        oil: 'Oil',
        pax: 'PAX',
        distance: 'Dist',
        altitude: 'Alt',
        speed: 'Spd',
        heading: 'Hdg',
        vertical_speed: 'V/S',
        throttle: 'THR',
        flaps: 'Flaps',
        gear: 'Gear',
        brakes: 'Brakes',
        parking_brake: 'Park Brk',
        spoilers: 'Spoilers',
        messages: {
            freq_busy: 'Frequency is busy. Please wait.'
        }
    },
    panels: {
        overhead_button: 'SYSTEMS [OH PNL]',
        pfd: 'PRIMARY FLIGHT DISPLAY',
        nd: 'NAVIGATION DISPLAY',
        engine_systems: 'ENGINE & SYSTEMS',
        fuel: 'FUEL',
        system_status: 'SYSTEM STATUS / ALERTS',
        controls: 'FLIGHT CONTROLS',
        flaps: 'FLAPS',
        gear: 'GEAR',
        brakes: 'BRAKES',
        trim: 'TRIM',
        systems: {
        status: 'SYSTEM STATUS',
        hydraulics: 'HYDRAULICS',
        hydraulics_abbrev: 'HYD',
        electrics: 'ELECTRICS',
        electrics_abbrev: 'ELEC',
        warnings: 'WARNINGS',
        no_warnings: 'NO ACTIVE WARNINGS',
        on: 'ON',
        off: 'OFF'
    },
    active_failures: 'ACTIVE FAILURES',
        no_active_alerts: 'NO ACTIVE ALERTS',
        next_wp: 'Next WP',
        wp_index: 'WP Index',
        tgt_alt: 'Tgt Alt'
    },
    flight_computer: {
        title: 'Flight Computer',
        tabs: {
            plan: 'Plan',
            add: 'Add',
            nearest: 'Nearest',
            radio: 'Radio',
            utils: 'Utils',
            perf: 'Perf'
        },
        plan: {
            empty: 'No waypoints in flight plan.',
            end_of_plan: 'End of Flight Plan',
            hold: 'HOLD',
            holding: 'HOLDING',
            active: '(ACTIVE)'
        },
        add: {
            manual_entry: 'Manual Entry',
            lat_placeholder: 'Lat (e.g. 37.61)',
            lon_placeholder: 'Lon (e.g. -122.37)',
            label_placeholder: 'Label (Optional)',
            add_coordinates: 'Add Coordinates',
            or: 'OR',
            airport_search: 'Airport Search',
            search_placeholder: 'Search ICAO/IATA/Name...',
            search_types: {
                all: 'All',
                normal: 'Normal',
                emergency: 'Emergency'
            },
            search_btn: 'Search',
            add_to_plan: '+ Add to Plan',
            no_results: 'No airports found.',
            alerts: {
                invalid_coords: 'Please enter valid coordinates',
                invalid_freq: 'Invalid Frequency. Must be between 108.00 and 117.95 MHz'
            },
            searching: 'Searching...'
        },
        nearest: {
            title: 'Nearest Airports (Top 20)',
            loading: 'Finding nearest airports...',
            finding: 'Finding airports...',
            empty: 'No airports found nearby.',
            no_results: 'No airports found.',
            add_btn: '+ Add',
            refresh: 'Refresh',
            emergency_tag: 'EMERGENCY'
        },
        radio: {
            title: 'Navigation Radio',
            current_freq: 'Current NAV1 Frequency',
            set_freq: 'Set Frequency (MHz)',
            tune: 'TUNE',
            common_freqs: 'Common ILS Frequencies: 108.10, 108.15, ..., 111.95'
        },
        utils: {
            title: 'Predictions',
            next_wp: 'Next Waypoint:',
            distance: 'Distance:',
            ete: 'ETE to WPT:',
            fuel_flow: 'Fuel Flow:',
            time_empty: 'Time to Empty:',
            target_alt: 'Target Alt (ft):',
            time_alt: 'Time to Alt:',
            wrong_vs: 'Wrong VS Direction',
            stable: 'Stable'
        },
        converter: {
            title: 'Unit Converter',
            value_placeholder: 'Value',
            result: 'Result:',
            units: {
                ft: 'Feet (ft)',
                m: 'Meters (m)',
                kts: 'Knots (kts)',
                kmh: 'Km/h',
                inHg: 'inHg',
                hPa: 'hPa',
                nm: 'Naut. Miles',
                km: 'Kilometers'
            }
        }
    },
    menu: {
        quit: 'Return to Initialization'
    },
    header: {
        awaiting: 'Awaiting flight instructions...',
        prepare: 'Prepare for takeoff.',
        checklist_incomplete: '⚠️ Checklist Incomplete',
        situation: 'SITUATION'
    },
    loading: {
        starting_simulation: 'Starting Flight Simulation...',
        initializing_physics: 'Initializing physics engine...'
    },
    error: {
        initialization_error: 'Initialization Error',
        reload_page: 'Reload Page'
    },
    common: {
        critical: 'CRITICAL'
    },
    messages: {
        cannot_proceed_missing_items: 'Cannot proceed. Missing items: ${items}'
    },
    narrative: {
      phases: {
        boarding: {
          0: {
            title: 'Boarding at ${departure}',
            content: 'The smell of jet fuel and coffee fills the cabin. Passengers shuffle down the aisle, stowing bags overhead. Outside, the ramp crew is loading the final containers. "Welcome aboard ${callsign}," the flight attendant announces. The ${aircraft} is ready for the journey to ${arrival}.'
          },
          1: {
            title: 'Boarding in Progress',
            content: 'Rain streaks the windows at ${departure} as passengers settle in. The soft chime of the cabin overheads closing punctuates the low hum of the APU. "Boarding is complete," the gate agent confirms. We are preparing for our flight to ${arrival}.'
          },
          2: {
            title: 'Welcome Aboard',
            content: 'Sunlight streams through the windows of the ${aircraft}. The cabin crew is conducting final safety checks. "Ladies and gentlemen, welcome to flight ${callsign} service to ${arrival}." The air is cool and crisp from the AC vents.'
          }
        },
        departure_clearance: {
          0: {
            title: 'IFR Clearance',
            content: 'The radio crackles to life. "${callsign}, cleared to ${arrival} via flight plan route. Climb and maintain FL350. Departure frequency 124.7. Squawk 4211." You read back the clearance as the navigation displays align.'
          },
          1: {
            title: 'Receiving Clearance',
            content: '"${callsign}, advise when ready to copy." You grab your pen. "Cleared to ${arrival}, maintain flight level 350, expect higher 10 minutes after departure." The flight computer is programmed and verified.'
          },
          2: {
            title: 'Pre-Departure Check',
            content: 'Cockpit preparation complete. Altimeters set. "${callsign}, clearance valid. Contact ground on 121.9 for push." The frequencies are tuned. The crew is ready.'
          }
        },
        pushback: {
          0: {
            title: 'Pushback Approved',
            content: 'A gentle jolt as the tug connects. "Ground to Cockpit, brakes released." The terminal building slowly drifts away. The hum of the APU is replaced by the rising whine of the main turbines starting up.'
          },
          1: {
            title: 'Push and Start',
            content: '"Commencing pushback, engines clear." The tug groans as it pushes the heavy ${aircraft} back. Engine 2 N1 rising... fuel flow normal. Engine 1 N1 rising. Good start on both.'
          },
          2: {
            title: 'Leaving the Gate',
            content: 'The marshaller waves his wands. "Brakes released, pushback commencing." You watch the wingwalkers guide the tips. The engines roar to life with a deep vibration felt through the floor.'
          }
        },
        taxiing: {
          0: {
            title: 'Taxi to Runway ${departureRunway}',
            content: '"${callsign}, taxi to runway ${departureRunway} via Alpha, Bravo." You release the parking brake. The tires thump rhythmically over the concrete joints. Sunlight glints off the tarmac as you weave through the taxiways.'
          },
          1: {
            title: 'Taxiing',
            content: 'The aircraft sways gently as you navigate the taxiways. "${callsign}, give way to the 737 on your right." You hold short, watching the other traffic pass. "Continue to holding point runway ${departureRunway}."'
          },
          2: {
            title: 'Head to Runway',
            content: 'Taxi lights on. The long line of blue lights guides you toward runway ${departureRunway}. The cabin crew performs the safety demonstration. "Cabin ready for departure," the interphone chimes.'
          }
        },
        takeoff: {
          0: {
            title: 'Takeoff Clearance',
            content: 'Lined up on runway ${departureRunway}. "Wind 130 at 8, runway ${departureRunway} cleared for takeoff." Throttles forward. The engines roar to life, pressing you back into the seat. Rotate at Vr.'
          },
          1: {
            title: 'Rolling',
            content: '"${callsign}, cleared for takeoff." You advance the thrust levers. TOGA set. The centerline lights blur into a stream of white. Airspeed alive. 80 knots... V1... Rotate. The ground drops away.'
          },
          2: {
            title: 'Departure',
            content: 'Full power. The engine vibration turns into a smooth hum as speed builds. The runway rushing beneath. Pulling back on the yoke, the nose lifts, and the main wheels leave the ground. Positive rate.'
          }
        },
        initial_climb: {
          0: {
            title: 'Positive Rate',
            content: 'The ground falls away. "Gear up." Punching through the lower cloud layer into the sunlight. The city of ${departure} shrinks into a miniature grid below. Speed increasing to 250 knots.'
          },
          1: {
            title: 'Climbing Out',
            content: 'Banking left to intercept the departure radial. Flaps retracting. The air is turbulent near the cloud tops. "Contact Departure on 124.7." You switch frequencies. "${callsign} with you passing 3,000 for 5,000."'
          },
          2: {
            title: 'Departure Phase',
            content: 'The altimeter winds up rapidly. The view outside clears as you break through the haze layer. The engines settle into a climb thrust. "Resume navigation," ATC directs. Direct to the first waypoint.'
          }
        },
        main_climb: {
          0: {
            title: 'Climb to Cruise',
            content: 'Passing 10,000 feet. "Accelerate to cruise speed." The sky darkens to a deeper blue as we ascend. The air is smooth. Climbing steadily to Flight Level 350.'
          },
          1: {
            title: 'Ascending',
            content: 'The seatbelt sign dings off. Passengers begin to move about. Outside, the horizon stretches endlessly. We are crossing the transition altitude, setting standard pressure 29.92.'
          },
          2: {
            title: 'Enroute Climb',
            content: 'Climbing through FL240. The engines are efficient at this altitude. "Traffic 2 o\'clock, 10 miles, 1,000 feet above." You spot the contrail of another liner crossing high above.'
          }
        },
        cruise: {
          0: {
            title: 'Cruising at FL350',
            content: 'Level at 35,000 feet. The horizon is a curved line of haze. "Maintain Mach 0.78." The engines hum with a steady, reassuring rhythm. Passengers are settling in for the flight to ${arrival}.'
          },
          1: {
            title: 'Enroute',
            content: 'Navigation is green. "Systems normal." The autopilot tracks the route precisely. Outside, the clouds form a white blanket far below. "Cabin service has commenced."'
          },
          2: {
            title: 'Steady Course',
            content: 'The flight computer shows we are on schedule. Fuel burn is within limits. "Contact Center on 132.5." Switching frequencies. The radio chatter is sparse at this altitude.'
          }
        },
        shutoff: {
          default: {
            0: {
              title: 'Flight Terminated',
              content: 'The aircraft has come to a stop. Systems are shutting down. Thank you for flying.'
            },
            1: {
              title: 'Mission Ended',
              content: 'You have reached the end of the simulation. Please review your flight performance.'
            },
            2: {
              title: 'Simulation Complete',
              content: 'Flight concluded. Passengers are disembarking. Ground power connected.'
            }
          },
          crash: {
            0: {
              title: 'Critical Failure',
              content: 'The aircraft has sustained catastrophic damage. Rescue teams are en route.'
            },
            1: {
              title: 'Impact',
              content: 'Ground contact was outside safety limits. Simulation terminated due to excessive G-force or structural failure.'
            }
          }
        },
        descent: {
          0: {
            title: 'Top of Descent',
            content: 'Throttles back. The pitch drops slightly as we begin our descent. "Descend and maintain 10,000 feet." The destination ${arrival} lies ahead.'
          },
          1: {
            title: 'Descent Initiation',
            content: 'The engines spool down to idle. The wind noise increases slightly as the speedbrakes extend to manage speed. "${callsign}, cross WPT at FL240." Descending through the flight levels.'
          },
          2: {
            title: 'Descending',
            content: 'The clouds below are getting closer. Seatbelt sign back on. "Cabin crew, prepare for landing." We are beginning our arrival into the ${arrival} area. Altimeters reset to local pressure.'
          }
        },
        approach: {
          0: {
            title: 'Approach to ${arrival}',
            content: 'Lined up for runway ${landingRunway}. "Gear down, flaps 30." The runway threshold looms ahead through the haze. Speed checked, localizer captured.'
          },
          1: {
            title: 'Final Approach',
            content: 'Turning base to final. The runway lights pierce the gloom. "Three green, flaps full." Speed is Vref + 5. The PAPI lights show two white, two red. Perfect profile.'
          },
          2: {
            title: 'On Final',
            content: '"${callsign}, cleared to land runway ${landingRunway}." Disengaging autopilot. The controls feel heavy and responsive. Crosswind correction applied. The runway numbers expand in the windscreen.'
          }
        },
        landing: {
          0: {
            title: 'Touchdown',
            content: 'Flare... Touchdown. Spoilers deployed. Reverse thrust roaring. "${callsign}, welcome to ${arrival}." Braking to taxi speed.'
          },
          1: {
            title: 'Landing Roll',
            content: 'The wheels kiss the pavement. A firm landing. Nose gear down. "Decel." Manual braking. You turn off the high-speed exit. "Contact Ground on 121.9."'
          },
          2: {
            title: 'Arrival',
            content: 'Main gear down... smoke from the tires. Reversers green. 80 knots. 60 knots. We have arrived at ${arrival}. The cabin erupts in the usual shuffling sounds of arrival.'
          }
        },
        after_land_taxiing: {
          0: {
            title: 'Taxi to Gate',
            content: '"Turn left next taxiway, contact Ground." The flight is over. Taxing past other aircraft to our assigned gate.'
          },
          1: {
            title: 'Taxiing In',
            content: 'Flaps retracting. APU starting up. We navigate the busy apron of ${arrival}. "Hold short of gate B4, waiting for aircraft pushback." Almost there.'
          },
          2: {
            title: 'Arrival Taxi',
            content: 'The gate guidance system lights up. "Left... left... stop." Parking brake set. Engines spooling down. The jetway starts to move toward the door.'
          }
        },
        shutoff: {
          0: {
            title: 'Engine Shutdown',
            content: 'Parking brake set. Fuel cutoff. The engines spin down into silence. APU off. "Thank you for flying with us." Flight complete.'
          },
          1: {
            title: 'Shutdown Checklist',
            content: 'Seatbelt sign off. Hydraulics off. The aircraft goes dark as we switch to ground power. The last passengers are deplaning. Another successful flight in the logbook.'
          },
          2: {
            title: 'Post-Flight',
            content: 'The cockpit becomes quiet. completing the shutdown checklist. Outside, the baggage handlers are already unloading. Time to head to the hotel.'
          }
        }
      }
    },
    menu: {
        resume: 'Resume Flight',
        restart: 'Restart Scenario',
        settings: 'Settings',
        quit: 'Quit to Main Menu',
        language: 'Language / 语言'
    },
    systems: {
        engines: 'Engines',
        engine: 'Engine',
        electrics: 'Electrics',
        hydraulics: 'Hydraulics',
        fuel: 'Fuel',
        apu: 'APU',
        pumps: 'Pumps',
        generators: 'Generators',
        batteries: 'Batteries',
        on: 'ON',
        off: 'OFF',
        auto: 'AUTO',
        avail: 'AVAIL',
        fault: 'FAULT',
        low_press: 'LOW PRESS',
        status: 'System Status',
        warnings: 'Warnings',
    no_warnings: 'No active warnings'
  },
  warnings: {
    gpws: {
      pull_up: 'PULL UP',
      terrain: 'TERRAIN',
      too_low_gear: 'TOO LOW GEAR',
      too_low_flaps: 'TOO LOW FLAPS'
    },
    stall: 'STALL',
    overspeed: 'OVERSPEED',
    bank_angle: 'BANK ANGLE',
    fire: {
      eng1: 'ENGINE 1 FIRE',
      eng2: 'ENGINE 2 FIRE',
      apu: 'APU FIRE'
    },
    hydraulics: {
      a_low: 'HYD A PRESS LOW',
      b_low: 'HYD B PRESS LOW'
    },
    elec: {
      emer_config: 'ELEC EMER CONFIG'
    },
    cabin_alt: 'CABIN ALTITUDE',
    fuel_low: 'LOW FUEL',
    engine_fail: 'ENGINE ${index} FAIL',
    config: {
      flaps: 'CONFIG FLAPS',
      spoilers: 'CONFIG SPOILERS',
      brakes: 'CONFIG BRAKES'
    },
    tail_strike: 'TAIL STRIKE RISK'
  },
  startup: {
        checklist_incomplete: 'Startup Checklist Incomplete',
        missing_items: 'Missing Items: ${items}',
        sys_init: 'Systems Initialization',
        checklist: {
            systems_not_init: 'Systems not initialized',
            battery_on: 'Battery must be ON',
            adirs_nav: 'ADIRS IR switches must be in NAV',
            adirs_aligning: 'ADIRS aligning (${progress}%)',
            apu_bleed_on: 'APU Bleed must be ON',
            apu_gen_on: 'APU Generator must be ON',
            apu_running: 'APU must be running and stabilized',
            engine_running: 'Engine ${index} must be running',
            gen_on: 'Generator ${index} must be ON',
            apu_shutdown: 'APU must be shutdown after engine start',
            adirs_complete: 'ADIRS alignment must be complete'
        }
    },
    radio: {
        cancel: 'Cancel',
        transmit: 'TRANSMIT',
        preview: 'PREVIEW',
        select: 'Select...',
        enter: 'Enter ${param}...',
        frequency_type: 'Frequency Type',
        busy: 'FREQ BUSY',
        tabs: {
            READBACK: 'READBACK',
            REQUEST: 'REQUEST',
            INFORM: 'INFORM'
        },
        template: {
            ack: { label: 'Acknowledge', text: 'Copy that, ${callsign}.' },
            wilco: { label: 'Wilco', text: 'Wilco, ${callsign}.' },
            rb_alt: { label: 'Readback Altitude', text: 'Climb and maintain ${altitude}, ${callsign}.' },
            rb_hdg: { label: 'Readback Heading', text: 'Turn ${direction} heading ${heading}, ${callsign}.' },
            rb_freq: { label: 'Readback Frequency', text: 'Contact ${station} on ${frequency}, ${callsign}.' },
            rb_taxi: { label: 'Readback Taxi', text: 'Taxi via ${route} and hold short of RW ${runway}, ${callsign}.' },
            req_alt: { label: 'Request Altitude', text: '${station}, ${callsign} requesting climb/descent to ${altitude}.' },
            req_direct: { label: 'Request Direct', text: '${station}, ${callsign} requesting direct to ${waypoint}.' },
            req_land: { label: 'Request Landing', text: '${station}, ${callsign} inbound for landing.' },
            req_startup: { label: 'Request Startup', text: '${station}, ${callsign} ready for startup and pushback.' },
            req_taxi: { label: 'Request Taxi', text: '${station}, ${callsign} ready for taxi.' },
            req_takeoff: { label: 'Request Takeoff', text: '${station}, ${callsign} ready for takeoff, runway ${runway}.' },
            req_atis: { label: 'Request ATIS', text: '${station}, ${callsign} requesting current weather / ATIS.' },
            req_freq_change: { label: 'Request Freq Change', text: '${station}, ${callsign} requesting frequency change.' },
            inf_checkin: { label: 'Check In', text: '${station}, ${callsign} with you at ${altitude}.' },
            inf_pos: { label: 'Position Report', text: '${station}, ${callsign} passing ${waypoint} at ${altitude}.' },
            inf_mayday: { label: 'Declare Emergency', text: 'MAYDAY MAYDAY MAYDAY, ${station}, ${callsign} declaring emergency due to ${failure}. Requesting immediate return/diversion.' },
            inf_pan: { label: 'Declare Pan-Pan', text: 'PAN-PAN PAN-PAN PAN-PAN, ${station}, ${callsign} has ${issue}. Requesting priority handling.' }
        }
    }
  },
  initialization: {
    title: 'Skyline Tragedy - Flight Initialization',
    subtitle: 'Configure your flight parameters and select difficulty level',
    steps: {
      1: '01. OPERATIONAL LEVEL & INTEL',
      2: '02. FLIGHT PARAMETERS',
      3: '03. ROUTE SELECTION'
    },
    difficulty: {
      rookie: 'ROOKIE',
      amateur: 'AMATEUR',
      intermediate: 'INTERMEDIATE',
      advanced: 'ADVANCED',
      pro: 'PRO',
      devil: 'DEVIL'
    },
    intel: {
      label: 'CREW INTELLIGENCE:',
      descriptions: {
        rookie: 'Highly supportive. NPCs assist with all checks. Standard procedures strictly followed.',
        amateur: 'Experienced crew. Reliable support during significant events. NPC will assist.',
        intermediate: 'Standard operations. Crew follows leads and executes commands precisely.',
        advanced: 'Competent but prone to hesitation or minor errors under high-stress conditions.',
        pro: 'High stress. Crew acts nervously and is prone to significant mistakes during emergencies.',
        devil: 'Independent priorities. Active deviation from procedures possible. Do not rely on assistance.'
      }
    },
    params: {
      airline: 'AIRLINE',
      callsign: 'CALLSIGN',
      aircraft_type: 'AIRCRAFT TYPE',
      crew_count: 'CREW COUNT',
      passengers: 'PASSENGERS (PAX)',
      payload: 'PAYLOAD (KG)',
      cruise_height: 'CRUISE HEIGHT (FT)',
      reserve_fuel: 'RESERVE FUEL (HOURS)',
      zulu_time: 'ZULU TIME',
      season: 'SEASON',
      seasons: {
        Spring: 'SPRING',
        Summer: 'SUMMER',
        Autumn: 'AUTUMN',
        Winter: 'WINTER'
      },
      random: 'RANDOM'
    },
    route: {
      departure: 'DEPARTURE AIRPORT',
      arrival: 'ARRIVAL AIRPORT',
      summary: {
        route: 'ROUTE:',
        distance: 'DISTANCE:',
        est_time: 'EST. TIME:',
        fuel_req: 'FUEL REQ:',
        trip: 'TRIP',
        rsv: 'RSV',
        total: 'TOTAL'
      }
    },
    buttons: {
      next_params: 'NEXT: FLIGHT PARAMETERS →',
      next_route: 'NEXT: ROUTE SELECTION →',
      finalize: 'FINALIZE DISPATCH & INITIALIZE'
    },
    random: {
      success: 'Random flight initialized!\nRoute: ${departure} → ${arrival}\nAircraft: ${aircraft}\nDifficulty: ${difficulty}\nFailure: ${failure}\nWeather: ${weather}',
      error: 'Error initializing random flight. Please try again.'
    },
    narrative_generator: {
      roles: [
        'Captain', 
        'Commander', 
        'Pilot in Command', 
        'Skipper', 
        'Chief Pilot'
      ],
      experience: {
        rookie: [
          'fresh from the flight academy. The ink on your license is barely dry.',
          'on your first week with the airline. Nerves are high, but so is your ambition.',
          'still proving yourself to the chief pilot. Every maneuver counts today.',
          'sitting in the left seat for the first time. Don\'t forget your training.'
        ],
        amateur: [
          'building your flight hours. You know the aircraft, but she still surprises you sometimes.',
          'gaining confidence with every leg. You\'ve handled calm skies, but today might be different.',
          'no longer a cadet, but not yet a veteran. The crew looks to you for steady hands.',
          'starting to feel at home in the cockpit, though the complex systems still demand full attention.'
        ],
        intermediate: [
          'a seasoned First Officer ready for upgrade. You know the procedures by heart.',
          'an experienced pilot with thousands of hours. Standard operations are second nature.',
          'reliable and steady. The airline trusts you with their most valuable routes.',
          'competent and focused. You\'ve seen your share of rough weather and technical glitches.'
        ],
        advanced: [
          'a senior Captain. Your name is whispered with respect in the crew lounge.',
          'a veteran of the skies. You\'ve flown through hurricanes and landed with engines out.',
          'an instructor examiner. You wrote the manual that others are struggling to learn.',
          'the master of this fleet. The aircraft feels like an extension of your own body.'
        ],
        pro: [
          'a legendary aviator. They say you can land on a postage stamp in a crosswind.',
          'an ace pilot. Systems failures are just an opportunity to show off your skills.',
          'the best of the best. When others panic, you just check your watch.',
          'an elite commander. Nothing surprises you anymore, not even total hydraulic loss.'
        ],
        devil: [
          'a test pilot pushing the envelope. Safety margins are just suggestions.',
          'flying a cursed aircraft. The mechanics crossed themselves when you walked out to the tarmac.',
          'facing the impossible. The odds are stacked against you, just the way you like it.',
          'about to experience a simulation designed to break you. Good luck.'
        ]
      },
      flight_plan: [
        'Today\'s manifest lists ${pax} souls on board for the leg from ${departure} to ${arrival}.',
        'You are cleared for the route from ${departure} to ${arrival}, carrying ${pax} passengers depending on you.',
        'The flight plan is filed: ${departure} departure, destination ${arrival}. ${pax} passengers are settling into their seats.',
        'From the gate at ${departure} to the tarmac at ${arrival}, you are responsible for ${pax} lives today.'
      ],
      difficulty: {
        rookie: [
          'System reports are normal. Focus on your decision-making and standard procedures.',
          'Expect a routine flight with minor procedural tasks. Your crew is fully supportive.',
          'A straightforward mission ahead. Minor issues may arise, but nothing you can\'t handle with basic logic.'
        ],
        amateur: [
          'A single, significant operational challenge is anticipated. Keep it simple and follow the checklist.',
          'You might encounter an impactful situation today, but your crew is ready to assist with the workload.',
          'Stay alert for one major event. Direct control requirements remain low, letting you focus on management.'
        ],
        intermediate: [
          'Prepare for dynamic conditions and potential interference. This leg requires hands-on flying.',
          'Standard flight protocols apply, but be ready for shifting priorities and active control needs.',
          'Your crew will follow your commands precisely, but the environment is becoming increasingly unpredictable.'
        ],
        advanced: [
          'Multiple critical issues may develop simultaneously. Sharp maneuvers and quick decisions are vital.',
          'Expect deadly scenarios where hands-on control is non-negotiable. Watch your crew—they may falter under pressure.',
          'The simulation will test your reflexes today. Dynamic failures require constant attention and manual intervention.'
        ],
        pro: [
          'Systematic failures are imminent. Automation is unreliable; you are the primary control loop.',
          'Complex CRM and skilled maneuvering are required. Your crew is stressed and prone to significant errors.',
          'Deadly, interconnected issues will challenge every skill you have. Expect a high workload and nervous support.'
        ],
        devil: [
          'Total chaos is the forecast. No autopilot, no safety nets, and no reliable assistance.',
          'The aircraft is pushed beyond its limits. Your crew might actively complicate the situation.',
          'Forget your training—this is about survival. Every system is a potential threat, and your "help" has their own agenda.'
        ]
      }
    }
  },
  weather: {
    clear: 'Clear',
    cloudy: 'Cloudy',
    rain: 'Rain',
    storm: 'Storm',
    fog: 'Fog',
    snow: 'Snow'
  },
  failures: {
    engine_failure: 'Engine Failure',
    hydraulic_failure: 'Hydraulic Failure',
    electrical_failure: 'Electrical Failure',
    instrument_failure: 'Instrument Failure',
    fuel_leak: 'Fuel Leak',
    structural_damage: 'Structural Damage'
  }
};

export default en;

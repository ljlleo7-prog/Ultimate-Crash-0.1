
export const RADIO_TEMPLATES = {
  DELIVERY: [
    { 
      id: 'req_clearance', 
      label: 'Request IFR Clearance', 
      template: '{station}, {callsign} requesting IFR clearance to {destination} via {sid}, {altitude}, {route}.', 
      params: ['destination', 'sid', 'altitude', 'route'],
      type: 'request',
      allowedTypes: ['Delivery', 'Ground'] 
    },
    { 
      id: 'req_startup', 
      label: 'Request Startup', 
      template: '{station}, {callsign} requesting startup and pushback.', 
      type: 'request',
      allowedTypes: ['Delivery', 'Ground'] 
    },
    { 
      id: 'req_pdc', 
      label: 'Request PDC', 
      template: '{station}, {callsign} requesting Pre-Departure Clearance.', 
      type: 'request',
      allowedTypes: ['Delivery'] 
    },
    { 
      id: 'req_alt_brief', 
      label: 'Alternate Airport Brief', 
      template: '{station}, {callsign} confirming alternate airport {alternate}.', 
      params: ['alternate'],
      type: 'inform',
      allowedTypes: ['Delivery'] 
    },
    { 
      id: 'req_runway_confirm', 
      label: 'Confirm Departure Runway', 
      template: '{station}, {callsign} requesting confirmation of departure runway.', 
      type: 'request',
      allowedTypes: ['Delivery', 'Ground'] 
    },
    { 
      id: 'ack_clearance', 
      label: 'Acknowledge Clearance', 
      template: 'Cleared to {destination} via {sid}, climb {altitude}, squawk {squawk}, {callsign}.', 
      params: ['destination', 'sid', 'altitude', 'squawk'],
      type: 'readback',
      allowedTypes: ['Delivery', 'Ground'] 
    },
    { 
      id: 'ack_squawk', 
      label: 'Readback Squawk', 
      template: 'Squawk {code}, {callsign}.', 
      params: ['code'],
      type: 'readback',
      allowedTypes: ['Delivery', 'Ground'] 
    },
    { 
      id: 'report_unable', 
      label: 'Report Unable', 
      template: 'Unable {instruction}, request alternative, {callsign}.', 
      params: ['instruction'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    }
  ],
  GROUND: [
    { 
      id: 'req_taxi', 
      label: 'Request Taxi', 
      template: '{station}, {callsign} ready for taxi to runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Ground'] 
    },
    { 
      id: 'req_pushback', 
      label: 'Request Pushback', 
      template: '{station}, {callsign} requesting pushback facing {direction}.', 
      params: ['direction'],
      type: 'request',
      allowedTypes: ['Ground'] 
    },
    { 
      id: 'req_deice', 
      label: 'Request De-icing', 
      template: '{station}, {callsign} requesting de-icing at current position.', 
      type: 'request',
      allowedTypes: ['Ground'] 
    },
    { 
      id: 'req_hold_short', 
      label: 'Hold Short Instructions', 
      template: '{station}, {callsign} requesting hold short instructions.', 
      type: 'request',
      allowedTypes: ['Ground', 'Tower'] 
    },
    { 
      id: 'req_cross_runway', 
      label: 'Request Runway Crossing', 
      template: '{station}, {callsign} requesting to cross runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Ground', 'Tower'] 
    },
    { 
      id: 'req_return_gate', 
      label: 'Return to Gate', 
      template: '{station}, {callsign} requesting return to gate due to {reason}.', 
      params: ['reason'],
      type: 'request',
      allowedTypes: ['Ground'] 
    },
    { 
      id: 'report_ground_issue', 
      label: 'Report Ground Issue', 
      template: '{station}, {callsign} reporting {issue}.', 
      params: ['issue'],
      type: 'inform',
      allowedTypes: ['Ground', 'Tower'] 
    }
  ],
  TOWER: [
    { 
      id: 'req_takeoff', 
      label: 'Ready for Departure', 
      template: '{station}, {callsign} ready for departure runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'req_lineup', 
      label: 'Line Up and Wait', 
      template: '{station}, {callsign} ready to line up and wait runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'req_land', 
      label: 'Request Landing', 
      template: '{station}, {callsign} inbound for landing runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'req_go_around', 
      label: 'Going Around', 
      template: 'Going around, {callsign}.', 
      type: 'inform',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'req_missed_approach', 
      label: 'Missed Approach', 
      template: 'Missed approach, {callsign}.', 
      type: 'inform',
      allowedTypes: ['Tower', 'Approach'] 
    },
    { 
      id: 'req_short_approach', 
      label: 'Request Short Approach', 
      template: '{station}, {callsign} requesting short approach.', 
      type: 'request',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'abort_takeoff', 
      label: 'Abort Takeoff', 
      template: 'Stopping, {callsign}. Rejecting takeoff due to {reason}.', 
      params: ['reason'],
      type: 'inform',
      allowedTypes: ['Tower'] 
    },
    { 
      id: 'report_windshear', 
      label: 'Report Wind Shear', 
      template: 'Wind shear reported on {location}, {callsign}.', 
      params: ['location'],
      type: 'inform',
      allowedTypes: ['Tower', 'Approach'] 
    }
  ],
  APPROACH: [
    { 
      id: 'inf_checkin', 
      label: 'Check In', 
      template: '{station}, {callsign} passing {altitude} for {target_alt}.', 
      params: ['altitude', 'target_alt'],
      type: 'inform',
      allowedTypes: ['Approach', 'Departure', 'Center'] 
    },
    { 
      id: 'req_alt_change', 
      label: 'Request Altitude Change', 
      template: '{station}, {callsign} requesting {altitude}.', 
      params: ['altitude'],
      type: 'request',
      allowedTypes: ['Approach', 'Departure', 'Center'] 
    },
    { 
      id: 'req_vectors_ils', 
      label: 'Request Vectors ILS', 
      template: '{station}, {callsign} requesting vectors for ILS approach runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Approach'] 
    },
    { 
      id: 'req_visual', 
      label: 'Request Visual Approach', 
      template: '{station}, {callsign} requesting visual approach runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['Approach', 'Tower'] 
    },
    { 
      id: 'req_holding', 
      label: 'Request Holding', 
      template: '{station}, {callsign} requesting holding at {waypoint}.', 
      params: ['waypoint'],
      type: 'request',
      allowedTypes: ['Approach', 'Center'] 
    },
    { 
      id: 'req_weather_dev', 
      label: 'Weather Deviation', 
      template: '{station}, {callsign} requesting deviation {direction} due to weather.', 
      params: ['direction'],
      type: 'request',
      allowedTypes: ['Approach', 'Departure', 'Center'] 
    }
  ],
  CENTER: [
    { 
      id: 'req_step_climb', 
      label: 'Request Step Climb', 
      template: '{station}, {callsign} requesting step climb to {altitude}.', 
      params: ['altitude'],
      type: 'request',
      allowedTypes: ['Center'] 
    },
    { 
      id: 'req_direct', 
      label: 'Request Direct', 
      template: '{station}, {callsign} requesting direct {waypoint}.', 
      params: ['waypoint'],
      type: 'request',
      allowedTypes: ['Center', 'Approach'] 
    },
    { 
      id: 'req_reroute', 
      label: 'Request Reroute', 
      template: '{station}, {callsign} requesting reroute due to {reason}.', 
      params: ['reason'],
      type: 'request',
      allowedTypes: ['Center'] 
    },
    { 
      id: 'req_turbulence', 
      label: 'Report Turbulence', 
      template: '{station}, {callsign} reporting {severity} turbulence.', 
      params: ['severity'],
      type: 'inform',
      allowedTypes: ['Center'] 
    }
  ],
  EMERGENCY: [
    { 
      id: 'inf_mayday', 
      label: 'MAYDAY', 
      template: 'MAYDAY MAYDAY MAYDAY, {station}, {callsign} declaring emergency. {nature}. Requesting immediate priority.', 
      params: ['nature'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'inf_pan', 
      label: 'PAN-PAN', 
      template: 'PAN-PAN PAN-PAN PAN-PAN, {station}, {callsign}. {nature}.', 
      params: ['nature'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'req_priority_landing', 
      label: 'Request Priority Landing', 
      template: '{station}, {callsign} requesting priority landing runway {runway}.', 
      params: ['runway'],
      type: 'request',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'req_emergency_descent', 
      label: 'Emergency Descent', 
      template: 'Emergency descent, {callsign}. Descending to {altitude}.', 
      params: ['altitude'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'report_failure', 
      label: 'Report Failure', 
      template: '{station}, {callsign} reporting {failure} failure.', 
      params: ['failure'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'inf_fuel_emergency', 
      label: 'Fuel Emergency', 
      template: 'MAYDAY, {callsign}, fuel emergency. Remaining endurance {minutes} minutes.', 
      params: ['minutes'],
      type: 'inform',
      allowedTypes: ['ALL'] 
    },
    { 
      id: 'req_crash_crew', 
      label: 'Request Crash Crew', 
      template: '{station}, {callsign} requesting crash crews on standby.', 
      type: 'request',
      allowedTypes: ['Tower', 'Approach', 'Ground'] 
    }
  ]
};

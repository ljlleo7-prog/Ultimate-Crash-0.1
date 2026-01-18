
export const RADIO_TEMPLATES = {
  READBACK: [
    { 
      id: 'ack', 
      label: 'Acknowledge', 
      template: 'Copy that, {callsign}.',
      type: 'readback'
    },
    { 
      id: 'wilco', 
      label: 'Wilco', 
      template: 'Wilco, {callsign}.',
      type: 'readback'
    },
    {
      id: 'rb_alt',
      label: 'Readback Altitude',
      template: 'Climb and maintain {altitude}, {callsign}.',
      params: ['altitude'],
      type: 'readback'
    },
    {
      id: 'rb_hdg',
      label: 'Readback Heading',
      template: 'Turn {direction} heading {heading}, {callsign}.',
      params: ['direction', 'heading'],
      type: 'readback'
    },
    {
      id: 'rb_freq',
      label: 'Readback Frequency',
      template: 'Contact {station} on {frequency}, {callsign}.',
      params: ['station', 'frequency'],
      type: 'readback'
    },
    {
      id: 'rb_taxi',
      label: 'Readback Taxi',
      template: 'Taxi via {route} and hold short of RW {runway}, {callsign}.',
      params: ['route', 'runway'],
      type: 'readback'
    }
  ],
  REQUEST: [
    { 
      id: 'req_alt', 
      label: 'Request Altitude', 
      template: '{station}, {callsign} requesting climb/descent to {altitude}.', 
      params: ['altitude'],
      type: 'request'
    },
    { 
      id: 'req_direct', 
      label: 'Request Direct', 
      template: '{station}, {callsign} requesting direct to {waypoint}.', 
      params: ['waypoint'],
      type: 'request'
    },
    { 
      id: 'req_land', 
      label: 'Request Landing', 
      template: '{station}, {callsign} inbound for landing.',
      type: 'request'
    },
    {
      id: 'req_startup',
      label: 'Request Startup',
      template: '{station}, {callsign} ready for startup and pushback.',
      type: 'request'
    },
    {
      id: 'req_taxi',
      label: 'Request Taxi',
      template: '{station}, {callsign} ready for taxi.',
      type: 'request'
    },
    {
      id: 'req_takeoff',
      label: 'Request Takeoff',
      template: '{station}, {callsign} ready for takeoff, runway {runway}.',
      params: ['runway'],
      type: 'request'
    },
    {
      id: 'req_atis',
      label: 'Request ATIS',
      template: '{station}, {callsign} requesting current weather / ATIS.',
      type: 'request'
    }
  ],
  INFORM: [
    { 
      id: 'inf_checkin', 
      label: 'Check In', 
      template: '{station}, {callsign} with you at {altitude}.',
      params: ['altitude'],
      type: 'inform'
    },
    { 
      id: 'inf_pos', 
      label: 'Position Report', 
      template: '{station}, {callsign} passing {waypoint} at {altitude}.',
      params: ['waypoint', 'altitude'],
      type: 'inform'
    },
    { 
      id: 'inf_mayday', 
      label: 'Declare Emergency', 
      template: 'MAYDAY MAYDAY MAYDAY, {station}, {callsign} declaring emergency due to {failure}. Requesting immediate return/diversion.',
      params: ['failure'],
      type: 'inform'
    },
    {
      id: 'inf_pan',
      label: 'Declare Pan-Pan',
      template: 'PAN-PAN PAN-PAN PAN-PAN, {station}, {callsign} has {issue}. Requesting priority handling.',
      params: ['issue'],
      type: 'inform'
    }
  ]
};

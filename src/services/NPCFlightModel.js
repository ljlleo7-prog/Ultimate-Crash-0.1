
import { airportService } from './airportService';

// Flight Stages
export const NPC_STAGE = {
  CRUISE: 'CRUISE',
  DESCENT: 'DESCENT',
  APPROACH: 'APPROACH',
  CLIMB: 'CLIMB',
  VECTOR: 'VECTOR'
};

export class NPCFlightModel {
  constructor(id, callsign, initialPos, targetAirport) {
    this.id = id;
    this.callsign = callsign;
    
    // Position
    this.latitude = initialPos.latitude;
    this.longitude = initialPos.longitude;
    this.altitude = initialPos.altitude || 30000; // ft
    this.heading = initialPos.heading || 0; // degrees
    
    // Physics State
    this.speed = initialPos.speed || 450; // TAS knots
    this.verticalSpeed = 0; // fpm
    this.targetAltitude = this.altitude;
    this.targetHeading = this.heading;
    this.targetSpeed = this.speed;
    
    // Navigation
    this.destination = targetAirport; // Code or object
    this.stage = NPC_STAGE.CRUISE;
    
    // Communication
    this.lastCommTime = Date.now();
    this.nextCommDelay = 10000 + Math.random() * 60000; // Random delay for next msg
    this.pendingMessage = null;
    
    // Initialize simple logic
    this.decideNextAction();
  }

  decideNextAction() {
    // Simple state machine
    if (Math.random() > 0.5) {
        this.targetHeading = (this.heading + (Math.random() * 60 - 30)) % 360;
        if (this.targetHeading < 0) this.targetHeading += 360;
    }
    
    // Random altitude change if in cruise
    if (this.stage === NPC_STAGE.CRUISE && Math.random() < 0.3) {
        const flightLevels = [30000, 32000, 34000, 36000, 38000];
        this.targetAltitude = flightLevels[Math.floor(Math.random() * flightLevels.length)];
    }
  }

  update(dt) {
    // dt in seconds
    
    // 1. Update Physics
    // Heading Interp (Simple turn rate 3 deg/sec)
    let diff = this.targetHeading - this.heading;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    
    const turnRate = 3 * dt;
    if (Math.abs(diff) < turnRate) {
        this.heading = this.targetHeading;
    } else {
        this.heading += Math.sign(diff) * turnRate;
    }
    this.heading = (this.heading + 360) % 360;

    // Altitude Interp (VS logic)
    const altDiff = this.targetAltitude - this.altitude;
    const climbRate = 2000; // fpm
    const descentRate = 1500; // fpm
    
    if (Math.abs(altDiff) > 50) {
        if (altDiff > 0) {
            this.verticalSpeed = climbRate;
            this.altitude += (this.verticalSpeed / 60) * dt;
        } else {
            this.verticalSpeed = -descentRate;
            this.altitude += (this.verticalSpeed / 60) * dt;
        }
    } else {
        this.verticalSpeed = 0;
        this.altitude = this.targetAltitude;
    }

    // Position Update (Great Circle simplified for short distances)
    // 1 degree lat = 60nm. 1 knot = 1 nm/h.
    // distance = speed * (dt/3600)
    const distNm = this.speed * (dt / 3600);
    const distDeg = distNm / 60;
    
    const radHeading = this.heading * Math.PI / 180;
    
    this.latitude += distDeg * Math.cos(radHeading);
    this.longitude += distDeg * Math.sin(radHeading) / Math.cos(this.latitude * Math.PI / 180);
    
    // 2. Logic Update
    this.updateLogic(dt);
  }

  updateLogic(dt) {
    // Randomly trigger comms or state changes
    if (Date.now() - this.lastCommTime > this.nextCommDelay) {
        this.generateRadioMessage();
        this.lastCommTime = Date.now();
        this.nextCommDelay = 30000 + Math.random() * 120000; // 30s - 2min
    }
  }

  generateRadioMessage() {
    // Determine message based on state
    let msg = '';
    let station = 'Center';
    let frequency = 'CENTER'; // Default frequency context
    
    // Determine Frequency Context
    if (this.altitude < 50) {
        station = 'Ground';
        frequency = 'GROUND';
    } else if (this.altitude < 3000) {
        station = 'Tower';
        frequency = 'TOWER';
    }

    if (Math.abs(this.verticalSpeed) > 100) {
        // Climbing/Descending
        const action = this.verticalSpeed > 0 ? 'climbing to' : 'descending to';
        msg = `${station}, ${this.callsign} ${action} FL${Math.round(this.targetAltitude/100)}.`;
    } else {
        // Turning or check-in
        if (Math.random() > 0.5) {
             msg = `${station}, ${this.callsign} with you at FL${Math.round(this.altitude/100)}.`;
        } else {
             msg = `${station}, ${this.callsign} turning heading ${Math.round(this.heading)}.`;
        }
    }

    this.pendingMessage = {
        sender: this.callsign,
        text: msg,
        timestamp: Date.now(),
        type: 'traffic',
        frequency: frequency
    };
  }
  
  popMessage() {
    const msg = this.pendingMessage;
    this.pendingMessage = null;
    return msg;
  }
}


import { airportService } from './airportService.js';
import { regionControlService } from './RegionControlService.js';

// Flight Stages
export const NPC_STAGE = {
  CRUISE: 'CRUISE',
  DESCENT: 'DESCENT',
  APPROACH: 'APPROACH',
  CLIMB: 'CLIMB',
  VECTOR: 'VECTOR',
  LANDED: 'LANDED'
};

export class NPCFlightModel {
  constructor(id, callsign, initialPos, targetAirport, route = null) {
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
    this.stage = initialPos.stage || NPC_STAGE.CRUISE;
    this.waypoints = route?.waypoints || [];
    this.currentWaypointIndex = 0;
    this.waypointReachedThresholdNm = 3;

    // Communication
    this.lastCommTime = Date.now();
    this.nextCommDelay = 10000 + Math.random() * 60000; // Random delay for next msg
    this.pendingMessage = null;

    // Conversation State
    this.conversationQueue = [];
    this.conversationState = 'IDLE'; // IDLE, QUEUED, WAITING
    this.conversationTimer = 0;

    // Initialize logic
    this.decideNextAction();
  }

  calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return Number.POSITIVE_INFINITY;
    const radiusNm = 3440.065;
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return radiusNm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  calculateBearing(from, to) {
    const fromLat = from.latitude * Math.PI / 180;
    const toLat = to.latitude * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  getCurrentWaypoint() {
    return this.waypoints[this.currentWaypointIndex] || null;
  }

  updateRouteGuidance() {
    const waypoint = this.getCurrentWaypoint();
    if (!waypoint) return false;

    const position = { latitude: this.latitude, longitude: this.longitude };
    const distanceNm = this.calculateDistance(position, waypoint);
    if (distanceNm <= this.waypointReachedThresholdNm && this.currentWaypointIndex < this.waypoints.length - 1) {
      this.currentWaypointIndex += 1;
      return this.updateRouteGuidance();
    }

    this.targetHeading = this.calculateBearing(position, waypoint);
    if (this.stage === NPC_STAGE.CRUISE) {
      const destinationDistanceNm = this.destination ? this.calculateDistance(position, this.waypoints.at(-1)) : Number.POSITIVE_INFINITY;
      if (destinationDistanceNm < 80) {
        this.stage = NPC_STAGE.DESCENT;
        this.targetAltitude = Math.max(8000, Math.min(this.altitude, 18000));
        this.targetSpeed = 300;
      } else {
        this.targetSpeed = 430;
      }
    } else if (this.stage === NPC_STAGE.DESCENT) {
      const destinationDistanceNm = this.calculateDistance(position, this.waypoints.at(-1));
      this.targetAltitude = destinationDistanceNm < 35 ? 5000 : 12000;
      this.targetSpeed = destinationDistanceNm < 35 ? 240 : 300;
      if (destinationDistanceNm < 20) this.stage = NPC_STAGE.APPROACH;
    }
    return true;
  }

  decideNextAction() {
    if (this.updateRouteGuidance()) return;

    // Logic dependent on stage
    if (this.stage === NPC_STAGE.CRUISE) {
        if (Math.random() > 0.5) {
            this.targetHeading = (this.heading + (Math.random() * 60 - 30)) % 360;
            if (this.targetHeading < 0) this.targetHeading += 360;
        }
        if (Math.random() < 0.3) {
            const flightLevels = [30000, 32000, 34000, 36000, 38000];
            this.targetAltitude = flightLevels[Math.floor(Math.random() * flightLevels.length)];
        }
    } else if (this.stage === NPC_STAGE.CLIMB) {
        this.targetAltitude = 30000;
        this.targetSpeed = 450;
    } else if (this.stage === NPC_STAGE.APPROACH) {
        this.targetAltitude = 0;
        this.targetSpeed = 140;
    }
  }

  update(dt, atcManager) {
    // 1. Update Physics
    // Heading Interp (Turn rate 3 deg/sec)
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

    // Altitude Interp
    const altDiff = this.targetAltitude - this.altitude;
    let climbRate = 2000; 
    let descentRate = 1500;
    
    // Stage Specifics
    if (this.stage === NPC_STAGE.CLIMB) {
        climbRate = 3000;
        // Transition to Cruise
        if (this.altitude > 28000) this.stage = NPC_STAGE.CRUISE;
    }
    if (this.stage === NPC_STAGE.APPROACH) {
        descentRate = 1000;
        // Check for "Landing" (despawn handled by service)
        if (this.altitude < 100) this.stage = NPC_STAGE.LANDED;
    }

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

    // Speed Interp
    const speedDiff = this.targetSpeed - this.speed;
    this.speed += Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), 5 * dt); // 5 kts/sec accel

    // Position Update
    const distNm = this.speed * (dt / 3600);
    const distDeg = distNm / 60;
    const radHeading = this.heading * Math.PI / 180;
    
    this.latitude += distDeg * Math.cos(radHeading);
    this.longitude += distDeg * Math.sin(radHeading) / Math.cos(this.latitude * Math.PI / 180);
    
    // 2. Logic Update
    this.updateRouteGuidance();
    this.updateLogic(dt, atcManager);
  }

  updateLogic(dt, atcManager) {
    // Conversation State Machine
    if (this.conversationState === 'IDLE') {
        if (Date.now() - this.lastCommTime > this.nextCommDelay) {
            this.generateConversation();
        }
    } else if (this.conversationState === 'QUEUED') {
        // Try to start conversation
        if (this.conversationQueue.length > 0) {
            const nextMsg = this.conversationQueue[0];
            // Check lock
            const isBusy = atcManager ? atcManager.isBusy(nextMsg.frequency) : false;
            
            if (!isBusy) {
                this.popAndSend(atcManager);
            } else {
                // Wait... maybe backoff?
                // For now just wait until free
            }
        }
    } else if (this.conversationState === 'WAITING') {
        this.conversationTimer -= dt;
        if (this.conversationTimer <= 0) {
            this.popAndSend(atcManager);
        }
    }
  }

  getCurrentWaypointName() {
    const waypoint = this.getCurrentWaypoint();
    return waypoint?.label || waypoint?.name || 'present position';
  }

  getDestinationName() {
    if (typeof this.destination === 'string' && this.destination) return this.destination;
    return this.waypoints.at(-1)?.label || this.waypoints.at(-1)?.name || 'destination';
  }

  determineFreqInfo() {
      if (this.altitude >= 5000) {
          const region = regionControlService.getRegionInfo(this.latitude, this.longitude);
          return { station: region.name, freq: parseFloat(region.frequency) };
      } else if (this.altitude < 50) {
          return { station: 'Ground', freq: 'GROUND' }; // Simplified
      } else if (this.altitude < 3000) {
          return { station: 'Tower', freq: 'TOWER' }; // Simplified
      }
      return { station: 'Center', freq: 'CENTER' };
  }

  generateConversation() {
    const { station, freq } = this.determineFreqInfo();

    let reqText = '';
    let replyText = '';
    let readbackText = '';
    let hasReply = true;
    const flightLevel = Math.round(this.altitude / 100);
    const targetFlightLevel = Math.round(this.targetAltitude / 100);
    const nextFix = this.getCurrentWaypointName();
    const destination = this.getDestinationName();

    if (this.stage === NPC_STAGE.CLIMB) {
      reqText = `${station}, ${this.callsign} leaving ${Math.max(1, Math.round(this.altitude / 100))} for FL${targetFlightLevel}, direct ${nextFix}.`;
      replyText = `${this.callsign}, radar contact, climb and maintain FL${targetFlightLevel}, proceed direct ${nextFix}.`;
      readbackText = `Climb maintain FL${targetFlightLevel}, direct ${nextFix}, ${this.callsign}.`;
    } else if (this.stage === NPC_STAGE.DESCENT) {
      reqText = `${station}, ${this.callsign} descending via route, next ${nextFix}, information current for ${destination}.`;
      replyText = `${this.callsign}, descend and maintain ${Math.round(this.targetAltitude / 100) * 100}, expect further clearance approaching ${nextFix}.`;
      readbackText = `Descend maintain ${Math.round(this.targetAltitude / 100) * 100}, expect further clearance ${nextFix}, ${this.callsign}.`;
    } else if (this.stage === NPC_STAGE.APPROACH) {
      reqText = `${station}, ${this.callsign} ${Math.round(this.calculateDistance({ latitude: this.latitude, longitude: this.longitude }, this.waypoints.at(-1) || { latitude: this.latitude, longitude: this.longitude }))} miles from ${destination}, request approach.`;
      replyText = `${this.callsign}, cleared visual approach ${destination}, maintain ${Math.round(this.targetSpeed)} knots until five miles.`;
      readbackText = `Cleared visual approach ${destination}, ${this.callsign}.`;
    } else if (Math.abs(this.verticalSpeed) > 100) {
      const action = this.verticalSpeed > 0 ? 'climbing' : 'descending';
      reqText = `${station}, ${this.callsign} ${action} FL${targetFlightLevel}, direct ${nextFix}.`;
      replyText = `${this.callsign}, roger, report crossing ${nextFix}.`;
      readbackText = `Wilco, ${this.callsign}.`;
    } else if (this.waypoints.length > 0) {
      const handoff = Math.random() < 0.25;
      if (handoff) {
        reqText = `${station}, ${this.callsign} level FL${flightLevel}, direct ${nextFix}.`;
        replyText = `${this.callsign}, contact next sector on ${this.altitude >= 18000 ? '132.85' : '124.70'}, good day.`;
        readbackText = `Over to ${this.altitude >= 18000 ? '132.85' : '124.70'}, ${this.callsign}.`;
      } else {
        reqText = `${station}, ${this.callsign} FL${flightLevel}, estimating ${nextFix}.`;
        replyText = `${this.callsign}, roger, maintain FL${flightLevel}, traffic advisory available on request.`;
        readbackText = `Maintain FL${flightLevel}, ${this.callsign}.`;
      }
    } else {
      reqText = `${station}, ${this.callsign} FL${flightLevel}.`;
      replyText = `${this.callsign}, roger.`;
      hasReply = false;
    }

    this.conversationQueue = [];
    this.conversationQueue.push({
        sender: this.callsign,
        text: reqText,
        frequency: freq,
        duration: 3000
    });

    if (hasReply) {
        this.conversationQueue.push({
            sender: 'ATC',
            text: replyText,
            frequency: freq,
            duration: 3000,
            delay: 2000 // Wait 2s before ATC replies
        });
        if (readbackText) {
            this.conversationQueue.push({
                sender: this.callsign,
                text: readbackText,
                frequency: freq,
                duration: 2000,
                delay: 1000 // Wait 1s before readback
            });
        }
    }

    this.conversationState = 'QUEUED';
  }

  popAndSend(atcManager) {
      const item = this.conversationQueue.shift();
      if (!item) {
          this.finishConversation();
          return;
      }

      // Publish Message
      this.pendingMessage = {
          sender: item.sender,
          text: item.text,
          timestamp: Date.now(),
          type: 'traffic',
          frequency: item.frequency
      };

      // Block Channel
      if (atcManager) {
          // Block for duration + gap to next message to prevent interruptions
          const nextDelay = this.conversationQueue.length > 0 ? (this.conversationQueue[0].delay || 0) : 0;
          atcManager.blockChannel(item.frequency, item.duration + nextDelay);
      }

      // Setup Next
      if (this.conversationQueue.length > 0) {
          const nextDelay = this.conversationQueue[0].delay || 1000;
          this.conversationTimer = (item.duration + nextDelay) / 1000; // seconds
          this.conversationState = 'WAITING';
      } else {
          this.finishConversation();
      }
  }

  finishConversation() {
      this.conversationState = 'IDLE';
      this.lastCommTime = Date.now();
      this.nextCommDelay = 30000 + Math.random() * 60000;
  }
  
  popMessage() {
    const msg = this.pendingMessage;
    this.pendingMessage = null;
    return msg;
  }
}

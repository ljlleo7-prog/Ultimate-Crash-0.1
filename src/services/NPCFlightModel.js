
import { airportService } from './airportService';
import { regionControlService } from './RegionControlService';

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
    this.stage = initialPos.stage || NPC_STAGE.CRUISE;
    
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

  decideNextAction() {
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

    // Generate Contextual Messages
    if (this.stage === NPC_STAGE.CLIMB) {
        const fl = Math.round(this.targetAltitude / 100);
        reqText = `${station}, ${this.callsign} climbing FL${fl}.`;
        replyText = `${this.callsign}, radar contact, climb and maintain FL${fl}.`;
        readbackText = `Climb maintain FL${fl}, ${this.callsign}.`;
    } else if (this.stage === NPC_STAGE.APPROACH) {
        reqText = `${station}, ${this.callsign} with you, request approach.`;
        replyText = `${this.callsign}, expect vectors for visual approach.`;
        readbackText = `Expect vectors, ${this.callsign}.`;
    } else if (Math.abs(this.verticalSpeed) > 100) {
        const action = this.verticalSpeed > 0 ? 'climbing' : 'descending';
        const fl = Math.round(this.targetAltitude / 100);
        reqText = `${station}, ${this.callsign} ${action} FL${fl}.`;
        replyText = `${this.callsign}, roger.`;
        readbackText = ''; // No readback needed for simple report
        hasReply = false; // Just one message
    } else {
        // Routine check-in or turn
        reqText = `${station}, ${this.callsign} FL${Math.round(this.altitude/100)}.`;
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

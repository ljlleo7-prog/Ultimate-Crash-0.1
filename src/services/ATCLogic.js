
import { getATCResponse } from '../data/atcResponseDatabase';

export class ATCLogic {
  constructor() {
    this.pendingResponse = null;
    this.responseTimeout = null;
    this.frequencyLocks = new Map(); // frequency -> busyUntil timestamp
    
    // State Tracking
    this.assignedAltitude = null;
    this.lastAssignmentTime = 0;
    this.atisTimer = 0;
    this.lastComplianceCheck = 0;
    this.lastReadbackError = 0;
  }

  isBusy(frequency) {
    if (!frequency) return false;
    const busyUntil = this.frequencyLocks.get(frequency) || 0;
    return Date.now() < busyUntil;
  }

  blockChannel(frequency, durationMs) {
    if (!frequency) return;
    const currentLock = this.frequencyLocks.get(frequency) || 0;
    this.frequencyLocks.set(frequency, Math.max(currentLock, Date.now() + durationMs));
  }

  /**
   * Main update loop for ATC logic
   * @param {number} dt - Time delta in seconds
   * @param {Object} flightState - Current aircraft state
   * @param {Object} freqInfo - Current frequency info { frequency, type, station }
   * @param {Function} onMessage - Callback to send a message from ATC
   * @param {string} language - Current language code ('en' or 'zh')
   */
  update(dt, flightState, freqInfo, onMessage, language) {
    if (!flightState || !freqInfo) return;

    // 1. ATIS Service
    if (freqInfo.type === 'ATIS' || (freqInfo.station && freqInfo.station.includes('ATIS'))) {
      this.atisTimer -= dt;
      if (this.atisTimer <= 0) {
        this.atisTimer = 60; // Reset to 60s
        const msg = getATCResponse('req_atis', {}, { weather: flightState.weather, callsign: 'ALL STATIONS' }, language);
        onMessage({
          sender: 'ATIS',
          text: msg,
          timestamp: Date.now(),
          frequency: freqInfo.frequency
        });
      }
    } else {
      this.atisTimer = 0; // Reset if not tuned
    }

    // 2. Compliance Monitoring (Every 5s)
    if (this.assignedAltitude && Date.now() - this.lastComplianceCheck > 5000) {
      this.lastComplianceCheck = Date.now();
      
      // Give 60s grace period after assignment
      if (Date.now() - this.lastAssignmentTime > 60000) {
        const diff = flightState.altitude - this.assignedAltitude;
        if (Math.abs(diff) > 500) {
          // Check vertical speed (are they correcting?)
          const vs = flightState.verticalSpeed || 0;
          const isCorrecting = (diff > 0 && vs < -500) || (diff < 0 && vs > 500);
          
          if (!isCorrecting) {
            const msg = getATCResponse('sys_traffic_alert', { 
                diff, 
                assignedAltitude: this.assignedAltitude 
            }, { callsign: flightState.callsign }, language);

            onMessage({
              sender: 'ATC',
              text: msg,
              timestamp: Date.now(),
              frequency: freqInfo.frequency
            });
            // Reset timer to avoid spam
            this.lastAssignmentTime = Date.now(); 
          }
        }
      }
    }
  }

  /**
   * Process a pilot message and generate an ATC response
   * @param {Object} message - The pilot's message object { type, templateId, params, text }
   * @param {Object} context - Context data { callsign, altitude, etc. }
   * @param {Function} onResponse - Callback when ATC responds (text) => void
   */
  processMessage(message, context, onResponse) {
    // Filter out frequencies where ATC doesn't respond (e.g. UNICOM or disabled frequencies)
    if (context && context.frequencyType === 'UNICOM') {
        return;
    }

    // Handle Readbacks
    if (message.templateId === 'rb_alt') {
      const readbackAlt = parseInt(message.params.altitude, 10);
      if (this.assignedAltitude && Math.abs(readbackAlt - this.assignedAltitude) > 100) {
        // Wrong readback
        setTimeout(() => {
          const msg = getATCResponse('sys_readback_wrong', { 
              assignedAltitude: this.assignedAltitude 
          }, { callsign: context.callsign }, context.language);
          
          onResponse({
            sender: 'ATC',
            text: msg,
            timestamp: Date.now()
          });
        }, 1500);
        return;
      }
    }

    // Cancel any existing pending response
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    const responseText = getATCResponse(message.templateId, message.params || {}, context, context.language || 'en');

    // Track Assignments
    if (message.templateId === 'req_alt' && responseText.includes('Unable') === false) {
      // Assuming approval
      this.assignedAltitude = parseInt(message.params.altitude, 10);
      this.lastAssignmentTime = Date.now();
    }

    if (responseText) {
      // Simulate delay (1-3 seconds)
      const delay = 1000 + Math.random() * 2000;
      
      this.responseTimeout = setTimeout(() => {
        onResponse({
          sender: 'ATC',
          text: responseText,
          timestamp: Date.now()
        });
        this.responseTimeout = null;
      }, delay);
    }
  }

  cancel() {
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }
  }
}

export const atcManager = new ATCLogic();

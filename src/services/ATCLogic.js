
import { getATCResponse } from '../data/atcResponseDatabase';

export class ATCLogic {
  constructor() {
    this.pendingResponse = null;
    this.responseTimeout = null;
    this.busyUntil = 0;
  }

  isBusy() {
    return Date.now() < this.busyUntil;
  }

  blockChannel(durationMs) {
    this.busyUntil = Math.max(this.busyUntil, Date.now() + durationMs);
  }

  /**
   * Process a pilot message and generate an ATC response
   * @param {Object} message - The pilot's message object { type, templateId, params, text }
   * @param {Object} context - Context data { callsign, altitude, etc. }
   * @param {Function} onResponse - Callback when ATC responds (text) => void
   */
  processMessage(message, context, onResponse) {
    // Cancel any existing pending response
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    const responseText = getATCResponse(message.templateId, message.params || {}, context);

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


/**
 * Realistic Autopilot Service
 * 
 * A separated autopilot system for the RealisticFlightPhysicsService.
 * Controls: Control Surfaces (Elevator, Aileron, Rudder, Trim) and Throttle.
 * Focus: Smooth Speed and Vertical Speed (VS) control.
 */

import { PIDController } from '../utils/physics/MathUtils.js';

class RealisticAutopilotService {
    constructor() {
        // --- PID Configurations ---
        
        // Auto-Throttle (Speed -> Throttle)
        this.speedPID = new PIDController(0.02, 0.005, 0.01, 0.0, 1.0);

        // Vertical Speed (VS -> Pitch)
        this.vsPID = new PIDController(0.00005, 0.00001, 0.00001, -20 * Math.PI/180, 20 * Math.PI/180);

        // Pitch Attitude (Target Pitch -> Elevator)
        this.pitchPID = new PIDController(-5.0, -0.5, -0.2, -1.0, 1.0);

        // Roll Hold (Roll -> Aileron)
        this.rollPID = new PIDController(3.0, 0.1, 0.1, -1.0, 1.0);

        // Heading Hold (Heading -> Roll)
        this.headingPID = new PIDController(0.026, 0.005, 0.01, -30 * Math.PI / 180, 30 * Math.PI / 180);

        // --- ILS PID Configurations ---
        
        // Glideslope (Altitude Error -> Target VS)
        this.glideslopePID = new PIDController(5.0, 0.5, 0.1, -1500, 1000); 

        // Localizer (Cross Track Error -> Target Heading Adjustment)
        this.localizerPID = new PIDController(0.3, 0.02, 0.2, -40, 40);

        this.engaged = false;
        this.mode = 'HDG'; // Default mode

        this.targets = {
            speed: 0, // Knots
            vs: 0,    // ft/min
            altitude: 0, // ft (Optional)
            heading: 0 // degrees
        };
        
        this.debugState = {
            headingError: 0,
            targetRoll: 0,
            pitchError: 0,
            targetPitch: 0,
            speedError: 0,
            throttleCmd: 0,
            vsError: 0
        };
    }

    setTargets(targets) {
        if (targets.mode) {
            this.mode = targets.mode;
        }
        this.targets = { ...this.targets, ...targets };
    }

    setEngaged(engaged, currentState = null) {
        if (engaged && !this.engaged) {
            // Reset PIDs on engagement to avoid jumps
            this.speedPID.reset();
            this.vsPID.reset();
            this.pitchPID.reset();
            this.rollPID.reset();
            this.headingPID.reset();
            this.glideslopePID.reset();
            this.localizerPID.reset();

            // If we have current state, capture targets if they are currently 0
            if (currentState) {
                if (this.targets.speed === 0) this.targets.speed = Math.round(currentState.airspeed);
                if (this.targets.vs === 0) this.targets.vs = Math.round(currentState.verticalSpeed / 100) * 100;
                if (this.targets.altitude === 0) this.targets.altitude = Math.round(currentState.altitude / 100) * 100;
                if (this.targets.heading === 0) {
                    const heading = (currentState.heading !== undefined) ? currentState.heading : 0;
                    this.targets.heading = heading === 0 ? 360 : heading;
                }
            }
        }
        this.engaged = engaged;
    }

    /**
     * Calculate Control Outputs
     * @param {Object} state - Current aircraft state
     * @param {Object} currentControls - Current control inputs
     * @param {number} dt - Time step
     * @param {Object} navData - Navigation data (ILS deviation, target heading)
     * @returns {Object} New control inputs
     */
    update(state, currentControls, dt, navData = {}) {
        if (!this.engaged) return null;

        const { airspeed, verticalSpeed, pitch, roll, heading } = state;
        
        // Ensure targets are initialized
        if (this.targets.speed === 0) this.targets.speed = Math.round(airspeed);
        if (this.targets.vs === 0 && Math.abs(verticalSpeed) > 100) {
             this.targets.vs = Math.round(verticalSpeed / 100) * 100;
        }
        if (this.targets.heading === 0) {
            this.targets.heading = heading === 0 ? 360 : heading;
        }

        // --- ILS / LNAV Logic ---
        const ilsDebug = navData.ilsDebug || { active: false };

        if (this.mode === 'ILS' && ilsDebug.active) {
             const { altError, distCross, distAlong, runwayHeading } = ilsDebug;
             
             // 1. Glideslope (VNAV)
             // Error > 0 (Too Low) -> Positive VS (Climb)
             let vsCorrection = this.glideslopePID.update(altError, 0, dt);
             
             // Feed Forward: Base Descent Rate
             const groundSpeedKts = airspeed; 
             let baseDescentRate = -groundSpeedKts * 5.2; 
             
             // If not in active approach zone (too far or passed threshold)
             const distToThresholdFt = -distAlong; // distAlong is positive past threshold
             if (distToThresholdFt <= 0 || distToThresholdFt > 120000) {
                 baseDescentRate = 0;
                 vsCorrection = vsCorrection * 0.1;
             }

             this.targets.vs = baseDescentRate + vsCorrection;
             
             // Clamp VS for safety
             if (this.targets.vs < -1500) this.targets.vs = -1500;
             if (this.targets.vs > 1500) this.targets.vs = 1500;

             // 2. Localizer (LNAV)
             const headingCorrection = this.localizerPID.update(0, distCross, dt);
             let targetH = runwayHeading + headingCorrection;
             this.targets.heading = (targetH + 360) % 360;
        }

        // --- PID Control Loops ---

        const { speed: targetSpeed, vs: targetVS, heading: targetHeading } = this.targets;

        // 1. Auto-Throttle (Speed Control)
        const throttleCmd = this.speedPID.update(targetSpeed, airspeed, dt);

        // 2. Vertical Speed Control (VS -> Pitch -> Trim)
        const targetPitch = this.vsPID.update(targetVS, verticalSpeed, dt);
        const pitchCmd = this.pitchPID.update(targetPitch, pitch, dt);
        
        const trimRate = 0.1;
        let newTrim = currentControls.trim + (pitchCmd * trimRate * dt);
        const maxTrim = 0.2;
        if (newTrim > maxTrim) newTrim = maxTrim;
        if (newTrim < -maxTrim) newTrim = -maxTrim;
        
        const elevatorCmd = pitchCmd * 0.1;

        // 3. Directional Control (Heading/LNAV/ILS -> Roll -> Aileron)
        let targetRoll = 0;
        let headingError = 0;
        if (this.mode === 'HDG' || this.mode === 'LNAV' || this.mode === 'ILS') {
            // Calculate heading error with wrap-around
            headingError = targetHeading - heading;
            if (headingError > 180) headingError -= 360;
            if (headingError < -180) headingError += 360;
            
            targetRoll = this.headingPID.update(headingError, 0, dt);
        }

        const aileronCmd = this.rollPID.update(targetRoll, roll, dt);

        // Update Debug State
        this.debugState = {
            headingError,
            targetRoll: targetRoll * 180 / Math.PI,
            pitchError: (targetPitch - pitch) * 180 / Math.PI,
            targetPitch: targetPitch * 180 / Math.PI,
            speedError: targetSpeed - airspeed,
            throttleCmd,
            vsError: targetVS - verticalSpeed,
            aileronCmd,
            elevatorCmd,
            mode: this.mode,
            engaged: this.engaged,
            ils: ilsDebug
        };

        return {
            throttle: throttleCmd,
            elevator: elevatorCmd,
            trim: newTrim,
            aileron: aileronCmd,
            rudder: 0
        };
    }
}

export default RealisticAutopilotService;

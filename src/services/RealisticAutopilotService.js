/**
 * Realistic Autopilot Service
 * 
 * A separated autopilot system for the RealisticFlightPhysicsService.
 * Controls: Control Surfaces (Elevator, Aileron, Rudder, Trim) and Throttle.
 * Focus: Smooth Speed and Vertical Speed (VS) control.
 */

class PIDController {
    constructor(kp, ki, kd, min, max) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.min = min;
        this.max = max;
        
        this.integral = 0;
        this.prevError = 0;
    }

    reset() {
        this.integral = 0;
        this.prevError = 0;
    }

    update(setpoint, measured, dt) {
        if (dt <= 0) return 0;

        const error = setpoint - measured;
        
        // Integral with anti-windup
        this.integral += error * dt;
        // Simple anti-windup: clamp integral contribution or integral itself
        // Let's clamp the integral term contribution to the output limits approximately
        const integralTerm = this.ki * this.integral;
        if (integralTerm > this.max) this.integral = this.max / this.ki;
        else if (integralTerm < this.min) this.integral = this.min / this.ki;

        const derivative = (error - this.prevError) / dt;
        this.prevError = error;

        let output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
        
        // Clamp output
        if (output > this.max) output = this.max;
        if (output < this.min) output = this.min;

        return output;
    }
}

class RealisticAutopilotService {
    constructor() {
        // --- PID Configurations ---
        
        // Auto-Throttle (Speed -> Throttle)
        // Speed in Knots. Throttle 0-1.
        // Needs to be gentle.
        this.speedPID = new PIDController(0.02, 0.005, 0.01, 0.0, 1.0);

        // Vertical Speed (VS -> Pitch)
        // VS in ft/min. Output: Target Pitch (radians).
        // 1000 ft/min error -> maybe 2-3 degrees pitch change? (0.05 rad)
        // Kp ~ 0.05 / 1000 = 0.00005
        this.vsPID = new PIDController(0.00005, 0.00001, 0.00001, -20 * Math.PI/180, 20 * Math.PI/180);

        // Pitch Attitude (Target Pitch -> Elevator)
        // Error in radians. Output: Elevator Deflection (-1 to 1, representing -25 to +25 deg).
        // Positive Error (Target > Current) -> Need Pitch Up -> Need Negative Elevator.
        // So gains must be negative.
        this.pitchPID = new PIDController(-5.0, -0.5, -0.2, -1.0, 1.0);

        // Roll Hold (Roll -> Aileron)
        this.rollPID = new PIDController(3.0, 0.1, 0.1, -1.0, 1.0);

        // Heading Hold (Heading -> Roll)
        // Error in degrees. Output: Target Roll (radians).
        // 10 deg error -> 15 deg roll? 0.26 rad.
        // Kp ~ 0.26 / 10 = 0.026
        this.headingPID = new PIDController(0.026, 0.005, 0.01, -30 * Math.PI / 180, 30 * Math.PI / 180);

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
     * @param {Object} state - Current aircraft state { airspeed (kts), verticalSpeed (ft/min), pitch (rad), roll (rad), altitude (ft), heading (deg) }
     * @param {Object} currentControls - Current control inputs { throttle, elevator, trim, aileron } (for trim offloading)
     * @param {number} dt - Time step
     * @returns {Object} New control inputs { throttle, elevator, trim, aileron } or null if not engaged
     */
    update(state, currentControls, dt) {
        if (!this.engaged) return null;

        const { airspeed, verticalSpeed, pitch, roll, heading } = state;
        
        // Ensure targets are initialized if they were somehow left at 0
        if (this.targets.speed === 0) this.targets.speed = Math.round(airspeed);
        if (this.targets.vs === 0 && Math.abs(verticalSpeed) > 100) {
             this.targets.vs = Math.round(verticalSpeed / 100) * 100;
        }
        if (this.targets.heading === 0) {
            this.targets.heading = heading === 0 ? 360 : heading;
        }

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

        // 3. Directional Control (Heading/LNAV -> Roll -> Aileron)
        let targetRoll = 0;
        let headingError = 0;
        if (this.mode === 'HDG' || this.mode === 'LNAV') {
            // Calculate heading error with wrap-around
            headingError = targetHeading - heading;
            if (headingError > 180) headingError -= 360;
            if (headingError < -180) headingError += 360;
            
            targetRoll = this.headingPID.update(headingError, 0, dt); // Target heading vs current heading
        }

        const aileronCmd = this.rollPID.update(targetRoll, roll, dt);

        // Update Debug State
        this.debugState = {
            headingError,
            targetRoll: targetRoll * 180 / Math.PI, // Convert to deg for display
            pitchError: (targetPitch - pitch) * 180 / Math.PI,
            targetPitch: targetPitch * 180 / Math.PI,
            speedError: targetSpeed - airspeed,
            throttleCmd,
            vsError: targetVS - verticalSpeed,
            aileronCmd,
            elevatorCmd,
            mode: this.mode,
            engaged: this.engaged
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

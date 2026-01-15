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
        // Positive Roll -> Need Left Roll (Negative Aileron?) -> Check Cda
        // Cda = 0.15. Cl = ... + Cda * aileron.
        // Positive Aileron -> Positive Cl (Right Roll).
        // Error = Target(0) - Current(Positive). Error is Negative.
        // We need Negative Aileron (Left Roll).
        // Negative Error * Kp = Negative Output.
        // So Kp should be positive.
        this.rollPID = new PIDController(3.0, 0.1, 0.1, -1.0, 1.0);

        this.engaged = false;
        this.targets = {
            speed: 0, // Knots
            vs: 0,    // ft/min
            altitude: 0, // ft (Optional, if we implement Alt Hold later)
            heading: 0 // degrees
        };
    }

    setTargets(targets) {
        this.targets = { ...this.targets, ...targets };
    }

    setEngaged(engaged, currentState = null) {
        if (engaged && !this.engaged) {
            // Reset PIDs on engagement to avoid jumps
            this.speedPID.reset();
            this.vsPID.reset();
            this.pitchPID.reset();
            this.rollPID.reset();

            // If we have current state, capture targets if they are currently 0
            // This provides a smooth takeover if the user hasn't set targets yet.
            if (currentState) {
                if (this.targets.speed === 0) this.targets.speed = Math.round(currentState.airspeed);
                if (this.targets.vs === 0) this.targets.vs = Math.round(currentState.verticalSpeed / 100) * 100;
                if (this.targets.altitude === 0) this.targets.altitude = Math.round(currentState.altitude / 100) * 100;
            }
        }
        this.engaged = engaged;
    }

    /**
     * Calculate Control Outputs
     * @param {Object} state - Current aircraft state { airspeed (kts), verticalSpeed (ft/min), pitch (rad), roll (rad), altitude (ft) }
     * @param {Object} currentControls - Current control inputs { throttle, elevator, trim, aileron } (for trim offloading)
     * @param {number} dt - Time step
     * @returns {Object} New control inputs { throttle, elevator, trim, aileron } or null if not engaged
     */
    update(state, currentControls, dt) {
        if (!this.engaged) return null;

        const { airspeed, verticalSpeed, pitch, roll } = state;
        
        // Ensure targets are initialized if they were somehow left at 0
        if (this.targets.speed === 0) this.targets.speed = Math.round(airspeed);
        if (this.targets.vs === 0 && Math.abs(verticalSpeed) > 100) {
             // Only capture VS if it's significant, otherwise keep 0 (level flight)
             this.targets.vs = Math.round(verticalSpeed / 100) * 100;
        }

        const { speed: targetSpeed, vs: targetVS } = this.targets;

        // 1. Auto-Throttle (Speed Control)
        // Output is absolute throttle position
        // We initialize the PID integrator with the current throttle to ensure smooth takeover?
        // Or just let it run. Let's rely on the PID.
        // If we want smooth takeover, we can pre-seed the integrator.
        // But for now, standard PID.
        const throttleCmd = this.speedPID.update(targetSpeed, airspeed, dt);

        // 2. Vertical Speed Control (VS -> Pitch -> Trim)
        const targetPitch = this.vsPID.update(targetVS, verticalSpeed, dt);
        const pitchCmd = this.pitchPID.update(targetPitch, pitch, dt);
        
        // Trim rate in radians per second. 0.1 rad/s = 10 units/s.
        const trimRate = 0.1;
        let newTrim = currentControls.trim + (pitchCmd * trimRate * dt);
        const maxTrim = 0.2;
        if (newTrim > maxTrim) newTrim = maxTrim;
        if (newTrim < -maxTrim) newTrim = -maxTrim;
        
        // Fine elevator assist to handle transients smoothly
        // Elevator helps quickly while trim catches up
        const elevatorCmd = pitchCmd * 0.1;

        // 4. Roll Hold (Level Wings)
        const aileronCmd = this.rollPID.update(0, roll, dt);

        return {
            throttle: throttleCmd,
            elevator: elevatorCmd,
            trim: newTrim,
            aileron: aileronCmd,
            rudder: 0 // Coordinate turns later
        };
    }
}

export default RealisticAutopilotService;

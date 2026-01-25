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

        // --- ILS PID Configurations ---
        
        // Glideslope (Altitude Error -> Target VS)
        // Input: Altitude Error (ft) (Target - Current)
        // Output: Target VS (ft/min)
        // 100ft low -> Need +500 ft/min? Kp = 5.
        this.glideslopePID = new PIDController(5.0, 0.5, 0.1, -1500, 1000); 

        // Localizer (Cross Track Error -> Target Heading Adjustment)
        // Input: Cross Track Error (meters) (Positive = Right of centerline)
        // Output: Heading Correction (degrees)
        // Increased gains for tighter tracking and stability
        // Kp: 0.15 -> 0.3 (Stronger correction)
        // Ki: 0.005 -> 0.02 (Better steady state handling)
        // Kd: 0.05 -> 0.2 (Damping for the stronger Kp)
        this.localizerPID = new PIDController(0.3, 0.02, 0.2, -40, 40);

        this.engaged = false;
        this.mode = 'HDG'; // Default mode
        this.runwayGeometry = null;

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

    setRunwayGeometry(geometry) {
        this.runwayGeometry = geometry;
    }

    setTargets(targets) {
        if (targets.mode) {
            this.mode = targets.mode;
        }
        
        // Handle alias: ias -> speed (UI uses ias, Logic uses speed)
        if (targets.ias !== undefined) {
            targets.speed = targets.ias;
        }
        // Handle alias: speed -> ias (Ensure UI gets the updated value)
        if (targets.speed !== undefined) {
            targets.ias = targets.speed;
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
                if (this.targets.speed === 0) {
                    this.targets.speed = Math.round(currentState.airspeed);
                    this.targets.ias = this.targets.speed;
                }
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
     * @param {Object} state - Current aircraft state { airspeed (kts), verticalSpeed (ft/min), pitch (rad), roll (rad), altitude (ft), heading (deg), latitude, longitude }
     * @param {Object} currentControls - Current control inputs { throttle, elevator, trim, aileron } (for trim offloading)
     * @param {number} dt - Time step
     * @returns {Object} New control inputs { throttle, elevator, trim, aileron } or null if not engaged
     */
    update(state, currentControls, dt) {
        if (!this.engaged) return null;

        const { airspeed, verticalSpeed, pitch, roll, heading, latitude, longitude, altitude } = state;
        
        // Ensure targets are initialized if they were somehow left at 0
        if (this.targets.speed === 0) {
            this.targets.speed = Math.round(airspeed);
            this.targets.ias = this.targets.speed;
        } else if (this.targets.ias === undefined) {
             this.targets.ias = this.targets.speed;
        }
        if (this.targets.vs === 0 && Math.abs(verticalSpeed) > 100) {
             this.targets.vs = Math.round(verticalSpeed / 100) * 100;
        }
        if (this.targets.heading === 0) {
            this.targets.heading = heading === 0 ? 360 : heading;
        }

        // --- ILS Logic ---
        let ilsDebug = {
            active: false,
            distAlong: 0,
            distCross: 0,
            altError: 0,
            targetAltitude: 0
        };

        if (this.mode === 'ILS' && this.runwayGeometry && typeof latitude === 'number' && typeof longitude === 'number') {
             const { thresholdStart, heading: runwayHeading } = this.runwayGeometry;
             
             // Convert Geo to Meters relative to Threshold
             const latRad = thresholdStart.latitude * Math.PI / 180;
             const metersPerLat = 111132.92;
             const metersPerLon = 111412.84 * Math.cos(latRad);
             
             const dx = (latitude - thresholdStart.latitude) * metersPerLat;
             const dy = (longitude - thresholdStart.longitude) * metersPerLon;
             
             const rH = runwayHeading * Math.PI / 180;
             const ux = Math.cos(rH);
             const uy = Math.sin(rH);
             
             // Distance ALONG the runway (positive = past threshold, negative = approaching)
             const distAlong = dx * ux + dy * uy;
             
             // Cross Track Error (positive = right of centerline)
             const distCross = -dx * uy + dy * ux;
             
             // 1. Glideslope (VNAV)
             // Target Altitude Calculation: 3 degree slope aiming at 50ft above threshold
             // Alt = 50 + distance * tan(3deg). Distance is -distAlong (positive distance to go)
             const distToThresholdFt = -distAlong * 3.28084;
             
             // Safety: If we are passed the threshold (distToThresholdFt < 0) or too far behind (> 20nm),
             // Do not engage Glideslope dive. Maintain current altitude or safe minimum.
             let targetAltitude = altitude; // Default to hold current
             
             // Active Zone: Approaching (dist > 0) and within reasonable range (< 20nm)
             // and not "behind" the runway (distAlong < 0)
             if (distToThresholdFt > 0 && distToThresholdFt < 120000) {
                targetAltitude = 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
             } else if (distToThresholdFt <= 0 && distToThresholdFt > -10000) {
                 // Over runway: Flare / Hold 50ft
                 targetAltitude = 50;
             }
             
             const altError = targetAltitude - altitude;
             
             // Update VS Target via Glideslope PID
             // Error > 0 (Too Low) -> Positive VS (Climb)
             // If we are passed threshold and high, don't dive aggressively
             let vsCorrection = this.glideslopePID.update(altError, 0, dt);
             
             // Feed Forward: Base Descent Rate for 3 degree slope
             // VS = -GroundSpeed(kts) * 5 (approx rule of thumb)
             // Precise: GS * 1.6878 * tan(3) * 60
             const groundSpeedKts = airspeed; // Using IAS as proxy for GS
             let baseDescentRate = -groundSpeedKts * 5.2; 
             
             // If not in active approach zone, disable base descent
             if (distToThresholdFt <= 0 || distToThresholdFt > 120000) {
                 baseDescentRate = 0;
                 // Dampen correction to avoid jumps
                 vsCorrection = vsCorrection * 0.1;
             }

             this.targets.vs = baseDescentRate + vsCorrection;
             
             // Clamp VS for safety
             if (this.targets.vs < -1500) this.targets.vs = -1500; // Cap descent at 1500 fpm
             if (this.targets.vs > 1500) this.targets.vs = 1500;

             // 2. Localizer (LNAV)
             // Target: distCross = 0.
             const headingCorrection = this.localizerPID.update(0, distCross, dt);
             
             // Target Heading = Runway Heading + Correction
             let targetH = runwayHeading + headingCorrection;
             
             // Normalize
             this.targets.heading = (targetH + 360) % 360;

             ilsDebug = {
                 active: true,
                 runway: this.runwayGeometry.runwayName,
                 distAlong: distAlong * 3.28084, // ft
                 distCross: distCross * 3.28084, // ft
                 altError: altError,
                 targetAltitude
             };
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

        // 3. Directional Control (Heading/LNAV/ILS -> Roll -> Aileron)
        let targetRoll = 0;
        let headingError = 0;
        if (this.mode === 'HDG' || this.mode === 'LNAV' || this.mode === 'ILS') {
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

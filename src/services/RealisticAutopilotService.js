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
        // Needs to be gentle but responsive to prevent stalls during climb.
        // Adjusted to intermediate values to balance responsiveness and stability.
        this.speedPID = new PIDController(0.05, 0.01, 0.03, 0.0, 1.0);

        // Vertical Speed (VS -> Pitch)
        // VS in ft/min. Output: Target Pitch (radians).
        // 1000 ft/min error -> maybe 2-3 degrees pitch change? (0.05 rad)
        // Kp ~ 0.05 / 1000 = 0.00005 -> INCREASED to 0.00015 for faster response
        this.vsPID = new PIDController(0.00015, 0.00005, 0.00005, -20 * Math.PI/180, 20 * Math.PI/180);

        // Pitch Attitude (Target Pitch -> Elevator)
        // Error in radians. Output: Elevator Deflection (-1 to 1, representing -25 to +25 deg).
        // Positive Error (Target > Current) -> Need Pitch Up -> Need Negative Elevator.
        // So gains must be negative.
        // INCREASED gains for snappier response
        this.pitchPID = new PIDController(-8.0, -2.0, -0.5, -1.0, 1.0);

        // Roll Hold (Roll -> Aileron)
        // INCREASED gains
        this.rollPID = new PIDController(5.0, 0.5, 0.3, -1.0, 1.0);

        // Heading Hold (Heading -> Roll)
        // Error in degrees. Output: Target Roll (radians).
        // 10 deg error -> 20 deg roll (0.35 rad).
        // Kp ~ 0.35 / 10 = 0.035 -> INCREASED to 0.15 for maximum holding
        // Kd: Damping for yaw rate. 3 deg/sec -> 5 deg roll opposition (0.08 rad).
        // Kd ~ 0.08 / 3 = 0.026 -> INCREASED to 0.15 to dampen oscillations
        // Ki adjusted to 0.03 to reduce steady-state error without overshoot
        this.headingPID = new PIDController(0.15, 0.03, 0.15, -35 * Math.PI / 180, 35 * Math.PI / 180);

        // Turn Coordination (Beta -> Rudder)
        // Minimize Sideslip (Beta). Input in radians. Output Rudder -1 to 1.
        // Increased Kd to dampen yaw oscillations
        this.rudderPID = new PIDController(2.0, 0.1, 1.0, -1.0, 1.0);

        // --- ILS PID Configurations ---
        
        // Glideslope (Altitude Error -> Target VS)
        this.glideslopePID = new PIDController(8.0, 0.1, 4.0, -2000, 2000); 

        // Localizer (Cross Track Error -> Target Heading Adjustment)
        // Input: Cross Track Error (meters) (Positive = Right of centerline)
        // Output: Heading Correction (degrees)
        // Kp = 0.40 (Reduced from 0.60 to prevent overshoot)
        // Ki = 0.03 
        // Kd = 2.5 (Increased from 1.5 to add damping)
        this.localizerPID = new PIDController(0.40, 0.03, 2.5, -30, 30);

        this.engaged = false;
        this.mode = 'HDG'; // Default mode
        this.runwayGeometry = null;
        this.nav1Frequency = 0; // Currently tuned NAV1 Frequency

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
            vsError: 0,
            ilsMessage: ''
        };
    }

    setRunwayGeometry(geometry) {
        this.runwayGeometry = geometry;
    }

    setNavFrequency(freq) {
        this.nav1Frequency = freq;
        this.debugState.nav1Frequency = freq;
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
            this.finalApproachDrift = null;

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

        const { airspeed, verticalSpeed, pitch, roll, heading, track, latitude, longitude, altitude } = state;
        const beta = state.beta || 0;
        
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
            targetAltitude: 0,
            message: ''
        };

        let isShortFinal = false;

        if (this.mode === 'ILS' && this.runwayGeometry && typeof latitude === 'number' && typeof longitude === 'number') {
             // Frequency Check
             const requiredFreq = this.runwayGeometry.ilsFrequency;
             // Allow slight tolerance for float comparison, though exact match usually fine for entered numbers
             // If requiredFreq is missing (older data), assume always valid or fail? 
             // Logic: If ILS freq is defined, we MUST match it.
             let freqMatch = true;
             if (requiredFreq) {
                 if (Math.abs(this.nav1Frequency - requiredFreq) > 0.05) {
                     freqMatch = false;
                 }
             }

             if (!freqMatch) {
                 ilsDebug.message = `Wrong Freq: ${this.nav1Frequency} vs ${requiredFreq}`;
                 // Fallback to maintain current heading/altitude or do nothing (let other PIDs handle last targets)
                 // If we return here, we need to make sure we don't zero out throttle etc.
                 // Ideally, we should just not run the ILS path calculations and let the "HDG/ALT" hold logic take over 
                 // BUT current logic applies PIDs at the end. 
                 // If mode is ILS but freq is wrong, we should probably act like "HDG" mode using current heading target.
             } else {
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
                 } else {
                     // FIX: If we are significantly below glideslope (altError > 50), 
                     // reduce base descent rate to allow for easier capture/climb.
                     if (altError > 50) {
                         // Linearly reduce base descent as error increases from 50ft to 250ft
                         // At 250ft error, base descent is 0.
                         const reduction = Math.min(1, (altError - 50) / 200);
                         baseDescentRate = baseDescentRate * (1 - reduction);
                     }
                 }

                 this.targets.vs = baseDescentRate + vsCorrection;
                
                // Clamp VS for safety
                if (this.targets.vs < -2000) this.targets.vs = -2000; // Cap descent at 2000 fpm to prevent overspeed
                if (this.targets.vs > 2000) this.targets.vs = 2000;

                // 2. Localizer (LNAV)
                 // Target: distCross = 0.
                 
                 // Environmental Factors: Calculate Drift Angle (Track - Heading)
                 // If track is available, use it. Else assume 0 drift.
                 let driftAngle = 0;
                 if (typeof track === 'number') {
                     let rawDrift = track - heading;
                     // Normalize -180 to 180
                     if (rawDrift > 180) rawDrift -= 360;
                     if (rawDrift < -180) rawDrift += 360;
                     
                     // Subtract Beta (sideslip) to get pure Wind Drift
                     // Beta is in Radians.
                     driftAngle = rawDrift - (beta * 180 / Math.PI);
                 }

                 // Deadband / Alignment Logic on Short Final
                   const distNM = distToThresholdFt / 6076.12;
                   let localizerInput = distCross;
                   
                   if (distNM < 1.0) {
                       isShortFinal = true;
                   }
                   
                   let headingCorrection = this.localizerPID.update(0, localizerInput, dt);

                   // "Alignment Mode" - Final Phase (< 0.4nm)
                   // Stop chasing lateral error. Align Ground Track with Runway.
                   // This satisfies "maintain direction" and handles environmental factors (Wind).
                   if (distNM < 0.4 && distNM > -0.1) {
                       // Calculate Drift Angle
                       let drift = 0;
                       if (typeof track === 'number') {
                           drift = track - heading;
                           if (drift > 180) drift -= 360;
                           if (drift < -180) drift += 360;
                       }
                       
                       // Set Correction to negate drift (Align Track to Runway)
                       // Target Heading = Runway - Drift
                       // So Heading Correction = -Drift
                       headingCorrection = -drift;
                   }
 
                   // Bank Limit Logic on Short Final (Limit Heading Correction target)
                  if (isShortFinal) {
                     const limit = 10.0;
                     if (headingCorrection > limit) headingCorrection = limit;
                     if (headingCorrection < -limit) headingCorrection = -limit;
                 }

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
                     targetAltitude: targetAltitude,
                     driftAngle: driftAngle,
                     message: 'Tracking'
                 };
             }
        }
        
        // Expose debug info
        this.debugState.ils = ilsDebug;
        if (ilsDebug.message) this.debugState.ilsMessage = ilsDebug.message;

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
        
        // Increased elevator authority from 0.1 to 1.0 to allow effective pitch control
        const elevatorCmd = pitchCmd;

        // 3. Directional Control (Heading/LNAV/ILS -> Roll -> Aileron)
        let targetRoll = 0;
        let headingError = 0;
        if (this.mode === 'HDG' || this.mode === 'LNAV' || this.mode === 'ILS') {
            // Calculate heading error with wrap-around
            headingError = targetHeading - heading;
            if (headingError > 180) headingError -= 360;
            if (headingError < -180) headingError += 360;
            
            targetRoll = this.headingPID.update(headingError, 0, dt); // Target heading vs current heading
            
            // Clamp Target Roll on Short Final to prevent violent maneuvers
            if (isShortFinal) {
                // Limit to 8 degrees bank (approx 0.14 rad)
                const rollLimit = 8.0 * Math.PI / 180;
                if (targetRoll > rollLimit) targetRoll = rollLimit;
                if (targetRoll < -rollLimit) targetRoll = -rollLimit;
            }
        }

        const aileronCmd = this.rollPID.update(targetRoll, roll, dt);

        // 5. Beta -> Rudder (Turn Coordination)
        // We want Beta to be 0.
        // If Beta > 0 (Wind from right/Nose left of velocity), we need Right Rudder (+).
        // So Setpoint = 0, Measured = Beta. Error = 0 - Beta = -Beta.
        // Output should be positive when Beta is positive?
        // Wait, if Beta is positive, we want Rudder to be positive.
        // PID logic: output = Kp * error.
        // If error = -Beta, then output is negative.
        // So we should feed (Beta, 0) -> Error = Beta - 0 = Beta.
        // Then Output = Kp * Beta. Positive Beta -> Positive Rudder.
        const rudderCmd = this.rudderPID.update(beta, 0, dt);

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
            rudderCmd,
            beta,
            mode: this.mode,
            engaged: this.engaged,
            ils: ilsDebug
        };

        return {
            throttle: throttleCmd,
            elevator: elevatorCmd,
            trim: newTrim,
            aileron: aileronCmd,
            rudder: rudderCmd
        };
    }
}

export default RealisticAutopilotService;

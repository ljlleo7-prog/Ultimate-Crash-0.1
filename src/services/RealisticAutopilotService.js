/**
 * Realistic Autopilot Service
 * 
 * A separated autopilot system for the RealisticFlightPhysicsService.
 * Controls: Control Surfaces (Elevator, Aileron, Rudder, Trim) and Throttle.
 * Focus: Smooth Speed and Vertical Speed (VS) control.
 */

class PIDController {
    constructor(kp, ki, kd, min, max, smoothing = 1.0) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.min = min;
        this.max = max;
        this.smoothing = smoothing; // 1.0 = No smoothing, 0.1 = Heavy smoothing
        
        this.integral = 0;
        this.prevError = 0;
        this.prevDerivative = 0;
    }

    reset() {
        this.integral = 0;
        this.prevError = 0;
        this.prevDerivative = 0;
    }

    update(setpoint, measured, dt) {
        if (dt <= 0) return 0;

        const error = setpoint - measured;
        
        // Integral with anti-windup
        this.integral += error * dt;
        const integralTerm = this.ki * this.integral;
        // Clamp integral term to output limits to prevent windup
        if (integralTerm > this.max) this.integral = this.max / this.ki;
        else if (integralTerm < this.min) this.integral = this.min / this.ki;

        // Derivative with Low Pass Filter (Smoothing)
        const rawDerivative = (error - this.prevError) / dt;
        const derivative = this.smoothing * rawDerivative + (1 - this.smoothing) * this.prevDerivative;
        
        this.prevError = error;
        this.prevDerivative = derivative;

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
        
        // Auto-Throttle
        this.speedPID = new PIDController(0.08, 0.02, 0.05, 0.0, 1.0, 0.8); // More assertive speed hold

        // Vertical Speed (VS -> Pitch)
        // CRITICAL: No smoothing to prevent overspeed crashes
        // Increased Max Pitch Down to -15 deg to allow steeper descents if needed
        // Reduced Kp (0.00015 -> 0.00010) to improve stability and prevent diverging oscillations
        this.vsPID = new PIDController(0.00010, 0.00005, 0.00005, -15 * Math.PI/180, 20 * Math.PI/180, 1.0);

        // Altitude Hold (Altitude -> Target VS)
        // Used when not in ILS GS mode but Altitude Target is set.
        // Kp = 1.5 (1000ft error -> 1500fpm).
        this.altitudePID = new PIDController(1.5, 0.01, 0.0, -3000, 3000, 1.0);

        // Pitch Attitude (Target Pitch -> Elevator)
        // Inner Loop: MUST be fast. No smoothing (1.0).
        // Reduced Kp (-4.0 -> -2.5) to prevent over-reaction
        // Increased Kd (-0.2 -> -0.8) for better damping
        this.pitchPID = new PIDController(-2.5, -1.0, -0.8, -1.0, 1.0, 1.0);

        // Roll Hold (Roll -> Aileron)
        // Inner Loop: MUST be fast. No smoothing (1.0).
        // Reduced Kp (3.0 -> 2.0) to prevent physics instability
        this.rollPID = new PIDController(1.8, 0.3, 0.25, -1.0, 1.0, 0.9);

        // Heading Hold (Heading -> Roll)
        // Outer Loop: Smooths the roll commands.
        this.headingPID = new PIDController(1.0, 0.02, 0.3, -30 * Math.PI / 180, 30 * Math.PI / 180, 0.8);

        // Turn Coordination
        // Inner Loop: Fast.
        // Reduced Kp (2.0 -> 0.5) to prevent fighting the turn
        this.rudderPID = new PIDController(0.5, 0.1, 0.5, -1.0, 1.0, 1.0);

        // --- ILS PID Configurations ---
        
        // Glideslope (Altitude Error -> Target VS)
        // CRITICAL: No smoothing to ensure fast descent arrest
        // Reduced Kp to 6.0 and Max Descent to -2000 for stability
        this.glideslopePID = new PIDController(6.0, 0.1, 2.0, -2000, 1500, 1.0); 

        // Localizer (Angular Deviation -> Target Heading Adjustment)
        // Increased Kp to 12.0 for better capture at distance.
        // Angular deviation is small far out, so we need high gain.
        // Close in, deviation grows, so high gain might oscillate.
        // But max output is limited to 45 deg.
        // Increased Kd to 15.0 to dampen oscillations
        // Ki 0.5 for stronger steady-state correction (Target < 20ft error)
        this.localizerPID = new PIDController(12.0, 0.5, 15.0, -60, 60, 1.0); // Output limited to +/- 60 deg correction

        this.engaged = false;
        this.mode = 'HDG'; // Default mode
        this.runwayGeometry = null;
        this.nav1Frequency = 0; // Currently tuned NAV1 Frequency
        this.prevTargetRoll = 0;
        this.maxRollRate = 20.0 * Math.PI / 180;

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
        
        this.navPlan = null;
        this.navState = { preTurnEngaged: false };
    }

    /**
     * Get serializable state for save system
     */
    getState() {
        return {
            enabled: this.engaged,
            mode: this.mode,
            targets: { ...this.targets },
            runwayGeometry: this.runwayGeometry,
            navPlan: this.navPlan,
            navState: this.navState,
            nav1Frequency: this.nav1Frequency
        };
    }

    /**
     * Restore state from save file
     */
    loadState(data) {
        if (!data) return;
        
        if (data.enabled !== undefined) this.engaged = data.enabled;
        if (data.mode) this.mode = data.mode;
        if (data.targets) this.targets = { ...this.targets, ...data.targets };
        if (data.runwayGeometry) this.runwayGeometry = data.runwayGeometry;
        if (data.navPlan) this.navPlan = data.navPlan;
        if (data.navState) this.navState = data.navState;
        if (data.nav1Frequency) {
            this.nav1Frequency = data.nav1Frequency;
            this.debugState.nav1Frequency = data.nav1Frequency;
        }
        
        // Reset PIDs to avoid huge kicks from accumulated errors or derivatives
        this.speedPID.reset();
        this.vsPID.reset();
        this.altitudePID.reset();
        this.pitchPID.reset();
        this.rollPID.reset();
        this.headingPID.reset();
        this.rudderPID.reset();
        this.glideslopePID.reset();
        this.localizerPID.reset();
        
        console.log('🤖 Autopilot Service: State Loaded', {
            mode: this.mode,
            engaged: this.engaged,
            targets: this.targets
        });
    }

    setRunwayGeometry(geometry) {
        this.runwayGeometry = geometry;
    }

    setNavFrequency(freq) {
        this.nav1Frequency = freq;
        this.debugState.nav1Frequency = freq;
    }
    
    setNavigationPlan(plan) {
        // plan: { fix: { latitude, longitude }, inboundCourseDeg: number, leadBankDeg?: number }
        this.navPlan = {
            fix: plan.fix,
            inboundCourseDeg: plan.inboundCourseDeg,
            leadBankDeg: plan.leadBankDeg || 25
        };
        this.navState = { preTurnEngaged: false };
    }

    setTargets(targets) {
        if (targets.mode) {
            // Auto-tune Logic: If ILS mode is requested and we have a runway geometry, tune the frequency
            if (targets.mode === 'ILS' && this.runwayGeometry && this.runwayGeometry.ilsFrequency) {
                // Only auto-tune if we aren't already tuned (or force it? Force is safer for user experience)
                if (this.nav1Frequency !== this.runwayGeometry.ilsFrequency) {
                    this.setNavFrequency(this.runwayGeometry.ilsFrequency);
                    // Update debug message to inform user
                    this.debugState.ilsMessage = `Auto-tuned ILS ${this.runwayGeometry.ilsFrequency.toFixed(2)}`;
                }
            }

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

        if (targets.heading !== undefined) {
            targets.heading = (targets.heading % 360 + 360) % 360;
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
            this.prevTargetRoll = 0; // Reset rate limiter state

            // If we have current state, capture targets if they are currently 0
            if (currentState) {
                if (this.targets.speed === 0) {
                    this.targets.speed = Math.round(currentState.airspeed);
                    this.targets.ias = this.targets.speed;
                }
                if (this.targets.vs === 0) this.targets.vs = Math.round(currentState.verticalSpeed / 100) * 100;
                if (this.targets.altitude === 0) this.targets.altitude = Math.round(currentState.altitude / 100) * 100;
                if (this.targets.heading === 0) {
                    let heading = (currentState.heading !== undefined) ? currentState.heading : 0;
                    // Ensure heading is normalized to 0-360
                    heading = heading % 360;
                    if (heading < 0) heading += 360;
                    
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
            let h = heading === 0 ? 360 : heading;
            h = h % 360;
            if (h < 0) h += 360;
            this.targets.heading = h;
        }

        // --- LNAV with Pre-Turn Logic ---
        if (this.mode === 'LNAV' && this.navPlan && typeof latitude === 'number' && typeof longitude === 'number') {
            const { fix, inboundCourseDeg, leadBankDeg } = this.navPlan;
            const hasRunway = this.runwayGeometry && this.runwayGeometry.thresholdStart;
            const refLat = hasRunway ? this.runwayGeometry.thresholdStart.latitude : fix.latitude;
            const refLon = hasRunway ? this.runwayGeometry.thresholdStart.longitude : fix.longitude;
            const latRad = refLat * Math.PI / 180;
            const metersPerLat = 111132.92;
            const metersPerLon = 111412.84 * Math.cos(latRad);
            const dx = (latitude - refLat) * metersPerLat;
            const dy = (longitude - refLon) * metersPerLon;
            const rH = inboundCourseDeg * Math.PI / 180;
            const ux = Math.cos(rH);
            const uy = Math.sin(rH);
            const distAlong = dx * ux + dy * uy;
            const distCross = -dx * uy + dy * ux;
            const effectiveDist = Math.max(Math.abs(distAlong), 500);
            const deviationDeg = Math.atan2(distCross, effectiveDist) * 180 / Math.PI;
            let deltaTrack = inboundCourseDeg - (typeof track === 'number' ? track : heading);
            if (deltaTrack > 180) deltaTrack -= 360;
            if (deltaTrack < -180) deltaTrack += 360;
            const g = 9.80665;
            const bankRad = (leadBankDeg || 25) * Math.PI / 180;
            const v_ms = airspeed * 0.514444;
            const turnRadius = (v_ms * v_ms) / (g * Math.tan(bankRad));
            const crossLead = Math.max(300, Math.min(4000, turnRadius));
            const fixLatRad = fix.latitude * Math.PI / 180;
            const mPerLonFix = 111412.84 * Math.cos(fixLatRad);
            const dxF = (latitude - fix.latitude) * metersPerLat;
            const dyF = (longitude - fix.longitude) * mPerLonFix;
            const distFix = Math.sqrt(dxF*dxF + dyF*dyF);
            const bearingFixRad = Math.atan2(dyF, dxF);
            let bearingFixDeg = (bearingFixRad * 180 / Math.PI + 360) % 360;
            let deltaFix = inboundCourseDeg - bearingFixDeg;
            if (deltaFix > 180) deltaFix -= 360;
            if (deltaFix < -180) deltaFix += 360;

            // Calculate turn execution duration for dynamic buffer
            // turnRate (rad/s) = (g * tan(bank)) / v
            const turnRate = (g * Math.tan(bankRad)) / Math.max(v_ms, 1.0);
            const turnDuration = (Math.abs(deltaFix) * Math.PI / 180) / turnRate;
            // Dynamic buffer: 25% of turn duration (e.g. 5s for 20s turn), min 3.0s
            const latencyBuffer = Math.max(3.0, turnDuration * 0.25);

            const leadDistance = Math.max(300, Math.min(4000, turnRadius * Math.tan(Math.abs(deltaFix) * Math.PI / 180 / 2))) + (v_ms * latencyBuffer);
            let headingCorrection = 0;
            let preTurn = false;
            const interceptLimit = 45;
            let targetHdg = inboundCourseDeg;
            if (distFix <= leadDistance && Math.abs(deltaFix) > 1.0) {
                preTurn = true;
                this.navState.preTurnEngaged = true;
                headingCorrection = 0;
                targetHdg = inboundCourseDeg;
            } else {
                // Smooth LNAV Intercept Logic
                // Use proportional control for intercept angle based on deviation
                // Clamp to interceptLimit (45 deg)
                // Gain 8.0: 5 deg error -> 40 deg correction.
                
                let correction = -deviationDeg * 8.0;
                
                // Cross-track error compensation (optional, but helps for parallel offsets)
                // If distCross is large, add bias? No, deviationDeg covers it.
                
                if (correction > interceptLimit) correction = interceptLimit;
                if (correction < -interceptLimit) correction = -interceptLimit;
                
                // If we are very close to course (< 0.5 deg), blend to bearingFixDeg?
                // Actually, just adding correction to inboundCourseDeg is "Homing to Course"
                // "Direct-to Fix" (bearingFixDeg) is "Homing to Fix".
                // We want "Homing to Course" (Intercept) until we are close, then "Homing to Fix" is fine if we are on track.
                // But usually LNAV follows the path, not just the fix.
                // So "Course + Correction" is the correct logic for Path Following.
                
                headingCorrection = correction;
                targetHdg = inboundCourseDeg + headingCorrection;
            }
            if (typeof track === 'number' && typeof heading === 'number') {
                let drift = track - heading;
                if (drift > 180) drift -= 360;
                if (drift < -180) drift += 360;
                targetHdg = targetHdg + drift;
            }
            this.targets.heading = (targetHdg + 360) % 360;
            this.debugState.lnavMessage = preTurn ? `Pre-turn align ${Math.round(inboundCourseDeg)}°` : (targetHdg === inboundCourseDeg + headingCorrection ? `Intercept ${Math.round(inboundCourseDeg)}° (dev ${deviationDeg.toFixed(1)}°)` : `Direct-to fix (brg ${Math.round(bearingFixDeg)}°)`);
            this.debugState.lnav = {
                dist_m: distFix,
                inbound: inboundCourseDeg,
                delta: deltaTrack,
                distAlong_m: distAlong,
                distCross_m: distCross,
                dev_deg: deviationDeg,
                lead_m: leadDistance,
                preTurn: preTurn,
                turnDur_s: turnDuration ? turnDuration.toFixed(1) : '0.0'
            };

            // Set Altitude Target from Fix if available
            if (fix.altitude && typeof fix.altitude === 'number') {
                this.targets.altitude = fix.altitude;
                
                // Active VNAV for LNAV fixes: Drive VS to target automatically
                // This ensures the plane climbs/descends to the pre-turn altitude
                let pidVS = this.altitudePID.update(fix.altitude, altitude, dt);
                this.targets.vs = pidVS;
            }
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
                 
                 const runwayElev = thresholdStart.elevation || 0;
                 
                 // Active Zone: Approaching (dist > 0) and within reasonable range (< 50nm)
                 // and not "behind" the runway (distAlong < 0)
                 if (distToThresholdFt > 0 && distToThresholdFt < 300000) {
                    targetAltitude = runwayElev + 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
                 } else if (distToThresholdFt <= 0 && distToThresholdFt > -10000) {
                     // Over runway: Flare / Hold 50ft
                     targetAltitude = runwayElev + 50;
                 }
                 
                 const altError = targetAltitude - altitude;
                 
                 // Glideslope Capture Logic (Capture from Below)
                 // If we are significantly below the glidepath (altError > 50ft), 
                 // we should MAINTAIN ALTITUDE (VS=0) until we intercept.
                 // We should NOT climb to the glideslope.
                 
                 let vsCorrection = 0;
                 let baseDescentRate = 0;
                 
                 if (altError > 50) {
                     // Below Glidepath: Fly Level
                     vsCorrection = 0;
                     baseDescentRate = 0;
                     this.glideslopePID.reset(); // Prevent integral windup while waiting
                 } else {
                     // On or Above Glidepath: Track it
                     
                     // Update VS Target via Glideslope PID
                     // Error < 0 (Too High) -> Negative VS (Descent)
                     vsCorrection = this.glideslopePID.update(altError, 0, dt);
                     
                     // Feed Forward: Base Descent Rate for 3 degree slope
                     const groundSpeedKts = airspeed; // Using IAS as proxy for GS
                     baseDescentRate = -groundSpeedKts * 5.2; 
                     
                     // If not in active approach zone, disable base descent
                     if (distToThresholdFt <= 0 || distToThresholdFt > 120000) {
                         baseDescentRate = 0;
                         vsCorrection = vsCorrection * 0.1;
                     }
                 }
                 
                 this.targets.vs = baseDescentRate + vsCorrection;
                
                // Clamp VS for safety
                // Increased max descent to 4500 fpm to allow capture from high altitude
                if (this.targets.vs < -4500) this.targets.vs = -4500; 
                if (this.targets.vs > 1000) this.targets.vs = 1000; // Reduced max climb in GS mode

                // 2. Localizer (LNAV)
                 // REDESIGNED: Use Angular Deviation (Degrees) instead of Linear Distance.
                 // This mimics real ILS receiver behavior (sensitivity increases as you get closer)
                 // and provides smoother intercepts from far out.
                 
                 // Calculate Angular Deviation (Localizer Error in Degrees)
                 // distAlong is negative on approach. We want positive distance to threshold.
                 const distToThresholdMeters = -distAlong; 
                 
                 // Avoid division by zero or singular behavior near threshold
                 // Effective distance minimum 500m to cap sensitivity on short final
                 const effectiveDist = Math.max(distToThresholdMeters, 500);
                 
                 // Dynamic Gain Scheduling
                 // Far out (15nm): High Gain to capture.
                 // Close in (2nm): Lower Gain to prevent oscillation.
                 // Kp = 6.0 + (distNm * 1.5)
                 // Increased base to 6.0 and scaling to 1.5 for stronger response
                 const distNm = effectiveDist / 1852;
                 const dynamicKp = 6.0 + (distNm * 1.5);
                 this.localizerPID.kp = Math.min(dynamicKp, 30.0); // Clamp to max 30.0 for far intercepts

                 const deviationRad = Math.atan2(distCross, effectiveDist);
                 const deviationDeg = deviationRad * 180 / Math.PI;
                 
                 // Calculate Drift Angle (Track - Heading)
                 let driftAngle = 0;
                 if (typeof track === 'number') {
                     let rawDrift = track - heading;
                     if (rawDrift > 180) rawDrift -= 360;
                     if (rawDrift < -180) rawDrift += 360;
                     driftAngle = rawDrift - (beta * 180 / Math.PI);
                 }

                 const distNM = distToThresholdFt / 6076.12;
                 let headingCorrection = 0;
                 
                 // Determine Intercept vs Track Mode
                 // Standard ILS Capture: 
                 // If deviation is large, use Proportional control capped at 60 degrees.
                 
                 // PID Controller for Localizer (Angular)
                  // Input: Deviation (deg). Output: Heading Correction (deg).
                  // Limit to +/- 60 deg (Aggressive Intercept)
                  
                  const maxIntercept = 60;
                  let desiredInterceptAngle = 0;
                  
                  // Smooth transition: Use PID update but clamp output
                  
                  if (Math.abs(deviationDeg) > 1.5) {
                      // Pure Proportional for intercept (Simple and Stable)
                      // Gain 10.0: 3 deg error -> 30 deg correction.
                      // Clamp at 60.
                      let correction = -deviationDeg * 10.0;
                      if (correction > maxIntercept) correction = maxIntercept;
                      if (correction < -maxIntercept) correction = -maxIntercept;
                      desiredInterceptAngle = correction;
                      
                      // Reset PID integral to prevent windup during intercept
                      this.localizerPID.reset();
                  } else {
                     // Fine tracking with PID
                     let correction = this.localizerPID.update(0, deviationDeg, dt);
                     // Clamp PID output
                     if (correction > maxIntercept) correction = maxIntercept;
                     if (correction < -maxIntercept) correction = -maxIntercept;
                     desiredInterceptAngle = correction;
                 }

                 // Feed-Forward Drift Compensation
                 // If we have a drift angle (wind), we need to offset our heading to maintain the desired track.
                 // PID calculates desired correction relative to the line.
                 // To make the Track follow that correction, we must subtract drift from Heading.
                 headingCorrection = desiredInterceptAngle - driftAngle;

                 // Final Clamp for Safety (allow up to 60 deg for strong crosswind intercept)
                 if (headingCorrection > 60) headingCorrection = 60;
                 if (headingCorrection < -60) headingCorrection = -60;

                 // Glideslope Gating: Only descend when reasonably aligned and within capture range
                // Extended capture range to 50nm to handle far intercepts
                // Relaxed lateral deviation check to 70 deg to allow GS capture during aggressive intercepts
                const glideActive = (distNM <= 50.0) && (Math.abs(deviationDeg) < 70.0);
                if (!glideActive) {
                    this.targets.vs = 0;
                     this.glideslopePID.reset(); // Reset if not active
                 }
                 
                 // Bank Limit Logic on Short Final
                 if (distNM < 1.0) {
                     isShortFinal = true;
                     const limit = 5.0; // Stricter limit close in
                     if (headingCorrection > limit) headingCorrection = limit;
                     if (headingCorrection < -limit) headingCorrection = -limit;
                 }

                 ilsDebug.message = `ILS Tracking (Dev: ${deviationDeg.toFixed(2)}°)`;
                 
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
                     message: ilsDebug.message,
                     locCaptured: Math.abs(deviationDeg) <= 2.0,
                     gsCaptured: glideActive,
                     locDeviationDeg: deviationDeg, // Export for PFD
                     gsDeviationDeg: glideActive ? 0 : (altError / (distToThresholdFt || 1)) * 57.29 // Approx angle deg if needed, or just use altError
                 };

                 // Refined GS Deviation (Angular) for PFD
                 // Standard GS is 3 degrees. 
                 // Angle = atan(Alt / Dist)
                 // Deviation = Angle - 3.0
                 if (distToThresholdMeters > 0) {
                     const currentAngleRad = Math.atan2(altitude - this.runwayGeometry.thresholdStart.elevation, distToThresholdMeters);
                     const currentAngleDeg = currentAngleRad * 180 / Math.PI;
                     ilsDebug.gsDeviationDeg = currentAngleDeg - 3.0;
                 } else {
                     ilsDebug.gsDeviationDeg = 0;
                 }
             }
        }
        
        // Expose debug info
        this.debugState.ils = ilsDebug;
        if (ilsDebug.message) this.debugState.ilsMessage = ilsDebug.message;

        // Altitude Hold Logic (When not on Glideslope AND not in LNAV VNAV)
        // Only override VS if we are actively HOLDING altitude (close to target)
        // or if the user is not actively managing VS (hard to detect, so we default to user authority outside hold band).
        
        // Check if LNAV is handling VS (implied by previous block modification)
        const lnavHandlingVS = (this.mode === 'LNAV' && this.navPlan && this.navPlan.fix && typeof this.navPlan.fix.altitude === 'number');

        if (!ilsDebug.gsCaptured && !lnavHandlingVS && this.targets.altitude > 0) {
             const altError = this.targets.altitude - altitude;
             
             // Capture/Hold Band: 50ft
             // If we are within 50ft, we force altitude hold (VS=0 or PID)
             // UNLESS the user has explicitly requested a significant Vertical Speed (> 200 fpm)
             if (Math.abs(altError) < 50 && Math.abs(this.targets.vs) < 200) {
                 // Hold Altitude
                 // Use PID to maintain exact altitude (VS small corrections)
                 let pidVS = this.altitudePID.update(this.targets.altitude, altitude, dt);
                 this.targets.vs = pidVS;
             } else {
                 // Outside Capture Band: Respect User VS
                 // Reset PID so it's ready for capture
                 this.altitudePID.reset();
             }
        }

        const { speed: targetSpeed, vs: targetVS, heading: targetHeading } = this.targets;

        // 1. Auto-Throttle (Speed Control)
        const throttleCmd = this.speedPID.update(targetSpeed, airspeed, dt);

        // 2. Vertical Speed Control (VS -> Pitch -> Trim)
        const targetPitch = this.vsPID.update(targetVS, verticalSpeed, dt);
        const pitchCmd = this.pitchPID.update(targetPitch, pitch, dt);
        
        // Trim Logic:
        // "Make the trim wheel rotate faster" - User Request
        // Increased trim rate from 0.1 to 0.5 to offload elevator faster.
        const trimRate = 0.5;
        // Robustness: Handle undefined currentControls.trim
        const currentTrim = typeof currentControls.trim === 'number' ? currentControls.trim : 0;
        let newTrim = currentTrim + (pitchCmd * trimRate * dt);
        
        // Clamp Trim
        const maxTrim = 0.8; // Reduced from 1.0 for safety (Original 0.2)
        if (newTrim > maxTrim) newTrim = maxTrim;
        if (newTrim < -maxTrim) newTrim = -maxTrim;
        
        // Elevator Logic:
        // Elevator provides immediate authority (Transient), Trim provides steady state.
        // As trim increases, pitchCmd (PID output) will naturally decrease as error reduces.
        const elevatorCmd = pitchCmd;

        // 3. Directional Control (Heading/LNAV/ILS -> Roll -> Aileron)
        let targetRoll = 0;
        let headingError = 0;
        if (this.mode === 'HDG' || this.mode === 'LNAV' || this.mode === 'ILS') {
            // Calculate heading error with wrap-around
            headingError = targetHeading - heading;
            if (headingError > 180) headingError -= 360;
            if (headingError < -180) headingError += 360;
            
            // Convert to Radians for PID (Output is Target Roll in Radians)
            // Kp=1.0 implies 1 Rad error -> 1 Rad bank.
            const headingErrorRad = headingError * Math.PI / 180;
            
            // Safety: Ensure headingErrorRad is finite
            const safeErrorRad = isFinite(headingErrorRad) ? headingErrorRad : 0;

            targetRoll = this.headingPID.update(safeErrorRad, 0, dt); // Target heading vs current heading
            
            // Safety check for NaN/Inf
            if (!isFinite(targetRoll)) targetRoll = 0;

            const maxDelta = this.maxRollRate * dt;
            const delta = targetRoll - this.prevTargetRoll;
            if (delta > maxDelta) targetRoll = this.prevTargetRoll + maxDelta;
            if (delta < -maxDelta) targetRoll = this.prevTargetRoll - maxDelta;
            this.prevTargetRoll = targetRoll;
            
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
            ils: ilsDebug,
            lnav: this.debugState.lnav,
            lnavMessage: this.debugState.lnavMessage || ''
        };

        return {
            throttle: isFinite(throttleCmd) ? throttleCmd : 0,
            elevator: isFinite(elevatorCmd) ? elevatorCmd : 0,
            trim: isFinite(newTrim) ? newTrim : 0,
            aileron: isFinite(aileronCmd) ? aileronCmd : 0,
            rudder: isFinite(rudderCmd) ? rudderCmd : 0
        };
    }
}

export default RealisticAutopilotService;

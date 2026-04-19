/**
 * Realistic Autopilot Service
 * 
 * A separated autopilot system for the RealisticFlightPhysicsService.
 * Controls: Control Surfaces (Elevator, Aileron, Rudder, Trim) and Throttle.
 * Focus: Smooth Speed and Vertical Speed (VS) control.
 */

import FMAService from './autoflight/FMAService.js';

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

    initialize(output, setpoint = 0, measured = setpoint) {
        const safeOutput = Number.isFinite(output) ? output : 0;
        const safeSetpoint = Number.isFinite(setpoint) ? setpoint : 0;
        const safeMeasured = Number.isFinite(measured) ? measured : safeSetpoint;
        const error = safeSetpoint - safeMeasured;
        const proportional = this.kp * error;
        const derivative = 0;
        const remaining = safeOutput - proportional - (this.kd * derivative);

        if (this.ki !== 0) {
            this.integral = remaining / this.ki;
        } else {
            this.integral = 0;
        }

        const maxIntegral = this.ki !== 0 ? Math.max(this.min / this.ki, this.max / this.ki) : 0;
        const minIntegral = this.ki !== 0 ? Math.min(this.min / this.ki, this.max / this.ki) : 0;
        if (this.ki !== 0) {
            if (this.integral > maxIntegral) this.integral = maxIntegral;
            if (this.integral < minIntegral) this.integral = minIntegral;
        }

        this.prevError = error;
        this.prevDerivative = derivative;
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
        this.speedPID = new PIDController(0.06, 0.012, 0.025, 0.0, 1.0, 0.45); // Smooth but authoritative speed hold

        // Vertical Speed (VS -> Pitch)
        // Softer outer-loop pitch target prevents step changes from becoming elevator snaps.
        this.vsPID = new PIDController(0.000075, 0.000025, 0.000025, -14 * Math.PI/180, 18 * Math.PI/180, 0.45);

        // Altitude Hold (Altitude -> Target VS)
        // Used when not in ILS GS mode but Altitude Target is set.
        this.altitudePID = new PIDController(1.0, 0.004, 0.0, -2200, 2200, 0.5);

        // Pitch Attitude (Target Pitch -> Elevator)
        // Inner loop remains responsive, but derivative smoothing and lower gains avoid jerky reversals.
        this.pitchPID = new PIDController(-1.55, -0.35, -0.45, -0.85, 0.85, 0.35);

        // Roll Hold (Roll -> Aileron)
        this.rollPID = new PIDController(0.88, 0.07, 0.12, -0.68, 0.68, 0.24);

        // Heading Hold (Heading -> Roll)
        // Outer loop permits a larger steady bank target while keeping soft buildup via roll-rate limiting.
        this.headingPID = new PIDController(0.58, 0.005, 0.08, -24 * Math.PI / 180, 24 * Math.PI / 180, 0.24);

        // Turn Coordination
        this.rudderPID = new PIDController(0.28, 0.035, 0.16, -0.65, 0.65, 0.3);

        // --- ILS PID Configurations ---

        // Glideslope (Altitude Error -> Target VS)
        this.glideslopePID = new PIDController(4.0, 0.04, 0.9, -1500, 1100, 0.35);

        // Localizer (Angular Deviation -> Target Heading Adjustment)
        this.localizerPID = new PIDController(8.0, 0.18, 6.0, -35, 35, 0.3); // Output limited to +/- 35 deg correction

        this.engaged = false;
        this.mode = 'HDG'; // Default mode
        this.runwayGeometry = null;
        this.nav1Frequency = 0; // Currently tuned NAV1 Frequency
        this.prevTargetRoll = 0;
        this.maxRollRate = 12.0 * Math.PI / 180;

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
        this.filteredState = null;
        this.outputState = null;
        this.targetSteps = {
            speed: 5,
            vs: 100,
            altitude: 100
        };
        this.altitudeMode = 'idle';
        this.lastAltitudeError = null;
        this.speedControlState = {
            shapedTarget: null,
            prevAirspeed: null,
            prevThrottle: null
        };
        this.inputFilterTau = 0.8;
        this.outputRateLimits = {
            throttle: 0.35,
            elevator: 0.55,
            aileron: 0.42,
            rudder: 0.55
        };
        this.engagementBlendDuration = 0.6;
        this.engagementBlendRemaining = 0;
        this.fmaService = new FMAService();
        this.fmaStatus = this.fmaService.buildStatus({
            engaged: this.engaged,
            autopilotMode: this.mode,
            autopilotDebug: this.debugState,
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

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    snapValue(value, step) {
        if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
        return Math.round(value / step) * step;
    }

    normalizeHeading(value, fallback = 0) {
        if (!Number.isFinite(value)) return fallback;
        const normalized = ((value % 360) + 360) % 360;
        return normalized === 0 ? 360 : normalized;
    }

    normalizeSpeedTarget(value, fallback = 0) {
        if (!Number.isFinite(value)) return fallback;
        return this.clamp(this.snapValue(value, this.targetSteps.speed), 120, 350);
    }

    normalizeVerticalSpeedTarget(value, fallback = 0) {
        if (!Number.isFinite(value)) return fallback;
        return this.clamp(this.snapValue(value, this.targetSteps.vs), -4000, 4000);
    }

    normalizeAltitudeTarget(value, fallback = 0) {
        if (!Number.isFinite(value)) return fallback;
        return this.clamp(this.snapValue(value, this.targetSteps.altitude), 0, 45000);
    }

    normalizeTargets(rawTargets = {}) {
        const normalized = { ...rawTargets };

        if (rawTargets.ias !== undefined || rawTargets.speed !== undefined) {
            const speedValue = rawTargets.ias !== undefined ? rawTargets.ias : rawTargets.speed;
            normalized.speed = this.normalizeSpeedTarget(speedValue, this.targets.speed || 0);
            normalized.ias = normalized.speed;
        }

        if (rawTargets.vs !== undefined) {
            normalized.vs = this.normalizeVerticalSpeedTarget(rawTargets.vs, this.targets.vs || 0);
        }

        if (rawTargets.altitude !== undefined) {
            normalized.altitude = this.normalizeAltitudeTarget(rawTargets.altitude, this.targets.altitude || 0);
        }

        if (rawTargets.heading !== undefined) {
            normalized.heading = this.normalizeHeading(rawTargets.heading, this.targets.heading || 360);
        }

        return normalized;
    }

    resetAltitudeCapture() {
        this.altitudeMode = 'idle';
        this.lastAltitudeError = null;
    }

    armAltitudeCapture() {
        this.altitudeMode = 'armed';
        this.lastAltitudeError = null;
    }

    setTargets(targets, options = {}) {
        const prevTargets = { ...this.targets };
        const normalizedTargets = this.normalizeTargets(targets);
        const preserveExisting = options.preserveExisting === true;

        if (normalizedTargets.mode) {
            // Auto-tune Logic: If ILS mode is requested and we have a runway geometry, tune the frequency
            if (normalizedTargets.mode === 'ILS' && this.runwayGeometry && this.runwayGeometry.ilsFrequency) {
                // Only auto-tune if we aren't already tuned (or force it? Force is safer for user experience)
                if (this.nav1Frequency !== this.runwayGeometry.ilsFrequency) {
                    this.setNavFrequency(this.runwayGeometry.ilsFrequency);
                    // Update debug message to inform user
                    this.debugState.ilsMessage = `Auto-tuned ILS ${this.runwayGeometry.ilsFrequency.toFixed(2)}`;
                }
            }

            this.mode = normalizedTargets.mode;
        }

        this.targets = preserveExisting
            ? { ...normalizedTargets, ...this.targets }
            : { ...this.targets, ...normalizedTargets };

        if (normalizedTargets.speed !== undefined && normalizedTargets.ias === undefined) {
            this.targets.ias = normalizedTargets.speed;
        }
        if (normalizedTargets.ias !== undefined && normalizedTargets.speed === undefined) {
            this.targets.speed = normalizedTargets.ias;
        }

        const altitudeProvided = Object.prototype.hasOwnProperty.call(normalizedTargets, 'altitude');
        const vsProvided = Object.prototype.hasOwnProperty.call(normalizedTargets, 'vs');
        const nextAltitude = altitudeProvided ? normalizedTargets.altitude : this.targets.altitude;
        const altitudeChanged = altitudeProvided && nextAltitude !== prevTargets.altitude;

        if (altitudeProvided && nextAltitude <= 0) {
            this.resetAltitudeCapture();
        } else if (nextAltitude > 0 && (altitudeChanged || (vsProvided && normalizedTargets.vs !== 0))) {
            this.armAltitudeCapture();
        }
    }

    setEngaged(engaged, currentState = null, options = {}) {
        if (engaged && !this.engaged) {
            this.speedPID.reset();
            this.vsPID.reset();
            this.pitchPID.reset();
            this.rollPID.reset();
            this.headingPID.reset();
            this.glideslopePID.reset();
            this.localizerPID.reset();
            this.altitudePID.reset();
            this.rudderPID.reset();
            this.finalApproachDrift = null;
            this.filteredState = null;
            this.outputState = null;
            this.speedControlState = {
                shapedTarget: null,
                prevAirspeed: null,
                prevThrottle: null
            };
            this.resetAltitudeCapture();

            const explicitTargets = options.explicitTargets || {};
            const captureTargets = {};
            if (currentState) {
                if (explicitTargets.speed === undefined && explicitTargets.ias === undefined) {
                    captureTargets.speed = this.normalizeSpeedTarget(currentState.airspeed, this.targets.speed || 150);
                    captureTargets.ias = captureTargets.speed;
                }
                if (explicitTargets.vs === undefined) {
                    captureTargets.vs = this.normalizeVerticalSpeedTarget(currentState.verticalSpeed, 0);
                }
                if (explicitTargets.altitude === undefined) {
                    captureTargets.altitude = this.normalizeAltitudeTarget(currentState.altitude, 0);
                }
                if (explicitTargets.heading === undefined) {
                    captureTargets.heading = this.normalizeHeading(currentState.heading, 360);
                }
                this.setTargets(captureTargets, { preserveExisting: true });

                const targetSpeed = Number.isFinite(this.targets.speed) ? this.targets.speed : captureTargets.speed ?? 150;
                const targetVS = Number.isFinite(this.targets.vs) ? this.targets.vs : captureTargets.vs ?? 0;
                const targetHeading = Number.isFinite(this.targets.heading) ? this.targets.heading : captureTargets.heading ?? 360;

                this.speedPID.initialize(currentState.throttle, targetSpeed, currentState.airspeed);
                this.vsPID.initialize(currentState.pitch, targetVS, currentState.verticalSpeed);
                this.pitchPID.initialize(currentState.elevator, currentState.pitch, currentState.pitch);

                const headingError = ((targetHeading - currentState.heading + 540) % 360) - 180;
                this.headingPID.initialize(currentState.roll, headingError * Math.PI / 180, 0);
                this.rollPID.initialize(currentState.aileron, currentState.roll, currentState.roll);
                this.rudderPID.initialize(currentState.rudder ?? 0, currentState.beta || 0, 0);

                this.prevTargetRoll = Number.isFinite(currentState.roll) ? currentState.roll : 0;
                this.outputState = {
                    throttle: Number.isFinite(currentState.throttle) ? currentState.throttle : 0,
                    elevator: Number.isFinite(currentState.elevator) ? currentState.elevator : 0,
                    aileron: Number.isFinite(currentState.aileron) ? currentState.aileron : 0,
                    rudder: Number.isFinite(currentState.rudder) ? currentState.rudder : 0
                };
                this.speedControlState.prevThrottle = this.outputState.throttle;
            } else {
                this.prevTargetRoll = 0;
            }

            this.engagementBlendRemaining = this.engagementBlendDuration;
            if (this.targets.altitude > 0) {
                this.armAltitudeCapture();
            }
        } else if (!engaged) {
            this.engagementBlendRemaining = 0;
        }
        this.engaged = engaged;
    }

    smoothValue(prev, next, dt, tau) {
        if (!isFinite(next)) return prev ?? 0;
        if (prev === null || prev === undefined) return next;
        const alpha = dt / (tau + dt);
        return prev + (next - prev) * alpha;
    }

    smoothAngle(prev, next, dt, tau) {
        if (!isFinite(next)) return prev ?? 0;
        if (prev === null || prev === undefined) return (next + 360) % 360;
        const alpha = dt / (tau + dt);
        let delta = ((next - prev + 540) % 360) - 180;
        return (prev + delta * alpha + 360) % 360;
    }

    rateLimit(prev, next, rate, dt) {
        if (prev === null || prev === undefined) return next;
        const maxDelta = rate * dt;
        let delta = next - prev;
        if (delta > maxDelta) delta = maxDelta;
        if (delta < -maxDelta) delta = -maxDelta;
        return prev + delta;
    }

    computePredictiveThrottle(targetSpeed, currentSpeed, targetVS, dt) {
        const prevState = this.speedControlState;
        const speedTrend = Number.isFinite(prevState.prevAirspeed) && dt > 0
            ? (currentSpeed - prevState.prevAirspeed) / dt
            : 0;
        const targetDeltaLimit = 6 * dt;
        const shapedTarget = prevState.shapedTarget === null
            ? targetSpeed
            : this.rateLimit(prevState.shapedTarget, targetSpeed, targetDeltaLimit, dt);
        const speedError = shapedTarget - currentSpeed;
        const verticalDemand = Number.isFinite(targetVS) ? targetVS : 0;
        const baseThrottle = this.clamp(
            0.5
            + ((shapedTarget - 220) * 0.0035)
            + (this.clamp(verticalDemand, -2000, 2500) / 12000),
            0.18,
            0.9
        );
        const correction = this.speedPID.update(shapedTarget, currentSpeed, dt);
        const predictiveDamping = this.clamp(speedTrend * 0.04, -0.18, 0.18);
        const throttleCmd = this.clamp(baseThrottle + (correction * 0.55) - predictiveDamping, 0.0, 1.0);

        this.speedControlState = {
            shapedTarget,
            prevAirspeed: currentSpeed,
            prevThrottle: throttleCmd
        };

        return {
            throttleCmd,
            shapedTarget,
            speedTrend,
            baseThrottle,
            correction,
            predictiveDamping
        };
    }

    applyThrottleEnvelope(rawThrottle, targetSpeed, currentSpeed, targetVS) {
        const speedError = targetSpeed - currentSpeed;
        const climbBias = this.clamp((Number.isFinite(targetVS) ? targetVS : 0) / 6000, 0, 0.12);
        let minThrottle = 0.5;
        let maxThrottle = 0.8 + climbBias;

        if (speedError < -10) {
            const overspeedFactor = this.clamp((-speedError - 10) / 60, 0, 1);
            minThrottle = this.clamp(0.5 - overspeedFactor * 0.45, 0.05, 0.5);
            maxThrottle = this.clamp(0.8 - overspeedFactor * 0.72, 0.08, 0.8);
        } else if (speedError > 25) {
            const lowEnergyFactor = this.clamp((speedError - 25) / 55, 0, 1);
            maxThrottle = this.clamp(maxThrottle + lowEnergyFactor * 0.2, 0.8, 1.0);
        }

        return {
            throttleCmd: this.clamp(rawThrottle, minThrottle, maxThrottle),
            minThrottle,
            maxThrottle,
            speedError
        };
    }

    filterState(state, dt) {
        if (!this.filteredState) {
            this.filteredState = {
                airspeed: state.airspeed,
                verticalSpeed: state.verticalSpeed,
                pitch: state.pitch,
                roll: state.roll,
                heading: state.heading,
                track: state.track,
                beta: state.beta || 0
            };
            return this.filteredState;
        }
        const prev = this.filteredState;
        const next = {
            airspeed: this.smoothValue(prev.airspeed, state.airspeed, dt, this.inputFilterTau),
            verticalSpeed: this.smoothValue(prev.verticalSpeed, state.verticalSpeed, dt, this.inputFilterTau),
            pitch: this.smoothValue(prev.pitch, state.pitch, dt, this.inputFilterTau),
            roll: this.smoothValue(prev.roll, state.roll, dt, this.inputFilterTau),
            heading: this.smoothAngle(prev.heading, state.heading, dt, this.inputFilterTau),
            track: this.smoothAngle(prev.track, state.track, dt, this.inputFilterTau),
            beta: this.smoothValue(prev.beta, state.beta || 0, dt, this.inputFilterTau)
        };
        this.filteredState = next;
        return next;
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
        const altitudeAGL = state.altitudeAGL;
        const onGround = state.onGround === true;
        const beta = state.beta || 0;
        const filtered = this.filterState({ airspeed, verticalSpeed, pitch, roll, heading, track, beta }, dt);
        const fAirspeed = filtered.airspeed;
        const fVerticalSpeed = filtered.verticalSpeed;
        const fPitch = filtered.pitch;
        const fRoll = filtered.roll;
        const fHeading = filtered.heading;
        const fTrack = filtered.track;
        const fBeta = filtered.beta;
        
        // Ensure targets are initialized if they were somehow left at 0
        if (this.targets.speed === 0) {
            this.targets.speed = this.normalizeSpeedTarget(fAirspeed, 150);
            this.targets.ias = this.targets.speed;
        } else if (this.targets.ias === undefined) {
             this.targets.ias = this.targets.speed;
        }
        if (this.targets.vs === 0 && Math.abs(fVerticalSpeed) > 100 && this.altitudeMode !== 'hold') {
             this.targets.vs = this.normalizeVerticalSpeedTarget(fVerticalSpeed, 0);
        }
        if (this.targets.heading === 0) {
            this.targets.heading = this.normalizeHeading(fHeading, 360);
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
            let deltaTrack = inboundCourseDeg - (typeof fTrack === 'number' ? fTrack : fHeading);
            if (deltaTrack > 180) deltaTrack -= 360;
            if (deltaTrack < -180) deltaTrack += 360;
            const g = 9.80665;
            const bankRad = (leadBankDeg || 25) * Math.PI / 180;
            const v_ms = fAirspeed * 0.514444;
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
            if (typeof fTrack === 'number' && typeof fHeading === 'number') {
                let drift = fTrack - fHeading;
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
                const heightAglFt = Number.isFinite(altitudeAGL) ? altitudeAGL : Math.max(0, altitude - runwayElev);
                const sinkRateFpm = Number.isFinite(verticalSpeed) ? verticalSpeed : 0;
                const inFlareWindow = distToThresholdFt <= 1200 && distToThresholdFt > -1500;
                const inRollout = onGround || (distToThresholdFt <= -150 && heightAglFt <= 5);
                let ilsPhase = 'approach';
                if (inRollout) ilsPhase = 'rollout';
                else if (inFlareWindow || heightAglFt <= 80) ilsPhase = 'flare';
                 
                 // Active Zone: Approaching (dist > 0) and within reasonable range (< 50nm)
                 // and not "behind" the runway (distAlong < 0)
                 if (distToThresholdFt > 1200 && distToThresholdFt < 300000) {
                    targetAltitude = runwayElev + 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
                 } else if (distToThresholdFt > -1500) {
                     const flareBlend = Math.min(1, Math.max(0, (1200 - distToThresholdFt) / 2700));
                     const flareReferenceAltitude = runwayElev + Math.max(5, 50 * (1 - flareBlend));
                    targetAltitude = flareReferenceAltitude;
                 }
                 
                 if (distToThresholdFt <= -1500) {
                    targetAltitude = runwayElev;
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
                     const groundSpeedKts = fAirspeed; // Using IAS as proxy for GS
                     baseDescentRate = -groundSpeedKts * 5.2; 
                     
                     // If not in active approach zone, disable base descent
                     if (distToThresholdFt <= -1500 || distToThresholdFt > 120000) {
                         baseDescentRate = 0;
                         vsCorrection = vsCorrection * 0.1;
                     }
                 }
                 
                 this.targets.vs = baseDescentRate + vsCorrection;

                if (ilsPhase === 'flare') {
                    this.targets.vs = Math.max(-900, Math.min(-150, this.targets.vs * 0.45));
                }
                if (ilsPhase === 'rollout') {
                    this.targets.vs = 0;
                    this.glideslopePID.reset();
                }
                
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
                if (typeof fTrack === 'number') {
                    let rawDrift = fTrack - fHeading;
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
                  // Limit to +/- 28 deg to avoid snap-roll style intercepts

                  const maxIntercept = 28;
                  let desiredInterceptAngle = 0;

                  // Smooth transition: Use PID update but clamp output

                  if (Math.abs(deviationDeg) > 1.5) {
                      // Pure proportional intercept, but intentionally gentle.
                      let correction = -deviationDeg * 4.5;
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
                     const limit = ilsPhase === 'flare' ? 3.0 : 5.0;
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

                 ilsDebug.phase = ilsPhase;
                 ilsDebug.runwayEntryHeightFt = Math.abs(distToThresholdFt) <= 600 ? heightAglFt : null;
                 ilsDebug.sinkRateFpm = sinkRateFpm;
             }
        }
        
        // Expose debug info
        this.debugState.ils = ilsDebug;
        if (ilsDebug.message) this.debugState.ilsMessage = ilsDebug.message;

        // Altitude Hold Logic (When not on Glideslope AND not in LNAV VNAV)
        const lnavHandlingVS = (this.mode === 'LNAV' && this.navPlan && this.navPlan.fix && typeof this.navPlan.fix.altitude === 'number');
        const altitudeControlActive = !ilsDebug.gsCaptured && !lnavHandlingVS && this.targets.altitude > 0;

        if (!altitudeControlActive) {
            this.resetAltitudeCapture();
            this.altitudePID.reset();
        } else {
            const altError = this.targets.altitude - altitude;
            const previousAltError = this.lastAltitudeError;
            const captureBand = 80;
            const holdBand = 40;
            const verticalTrend = Number.isFinite(fVerticalSpeed) ? fVerticalSpeed : 0;
            const movingTowardTarget = Math.abs(verticalTrend) > 100 && Math.sign(verticalTrend) === Math.sign(altError);
            const passedTarget = previousAltError !== null && Math.sign(previousAltError) !== Math.sign(altError) && Math.abs(previousAltError) > holdBand;
            const nearTarget = Math.abs(altError) <= captureBand;

            if (this.altitudeMode === 'idle') {
                this.armAltitudeCapture();
            }

            if (this.altitudeMode !== 'hold' && (passedTarget || nearTarget || (Math.abs(altError) <= 200 && movingTowardTarget))) {
                this.altitudeMode = nearTarget ? 'capture' : 'hold';
            }

            if (this.altitudeMode === 'capture' || this.altitudeMode === 'hold') {
                const pidVS = this.altitudePID.update(this.targets.altitude, altitude, dt);
                const leveledVS = this.clamp(pidVS, -800, 800);
                this.targets.vs = Math.abs(altError) <= holdBand ? 0 : leveledVS;
                if (Math.abs(altError) <= holdBand || passedTarget) {
                    this.altitudeMode = 'hold';
                    this.targets.vs = 0;
                }
            } else {
                this.altitudePID.reset();
            }

            this.lastAltitudeError = altError;
        }

        const { speed: targetSpeed, vs: targetVS, heading: targetHeading } = this.targets;

        // 1. Auto-Throttle (Predictive Speed Control)
        const speedControl = this.computePredictiveThrottle(targetSpeed, fAirspeed, targetVS, dt);
        const rawThrottleCmd = speedControl.throttleCmd;
        const throttleEnvelope = this.applyThrottleEnvelope(rawThrottleCmd, targetSpeed, fAirspeed, targetVS);
        const throttleCmd = throttleEnvelope.throttleCmd;

        // 2. Vertical Speed Control (VS -> Pitch -> Trim)
        const targetPitch = this.vsPID.update(targetVS, fVerticalSpeed, dt);
        const pitchCmd = this.pitchPID.update(targetPitch, fPitch, dt);
        
        // Trim Logic:
        // "Make the trim wheel rotate faster" - User Request
        // Increased trim rate from 0.1 to 0.5 to offload elevator faster.
        const trimRate = 0.25;
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
            headingError = targetHeading - fHeading;
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

        const aileronCmd = this.rollPID.update(targetRoll, fRoll, dt);

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
        const rudderCmd = this.rudderPID.update(fBeta, 0, dt);

        const limitedThrottle = this.rateLimit(this.outputState?.throttle, throttleCmd, this.outputRateLimits.throttle, dt);
        const limitedElevator = this.rateLimit(this.outputState?.elevator, elevatorCmd, this.outputRateLimits.elevator, dt);
        const limitedAileron = this.rateLimit(this.outputState?.aileron, aileronCmd, this.outputRateLimits.aileron, dt);
        const limitedRudder = this.rateLimit(this.outputState?.rudder, rudderCmd, this.outputRateLimits.rudder, dt);

        this.outputState = {
            throttle: limitedThrottle,
            elevator: limitedElevator,
            aileron: limitedAileron,
            rudder: limitedRudder
        };

        const blendAlpha = this.engagementBlendRemaining > 0
            ? this.clamp(1 - (this.engagementBlendRemaining / this.engagementBlendDuration), 0, 1)
            : 1;
        this.engagementBlendRemaining = Math.max(0, this.engagementBlendRemaining - dt);

        const currentTrimCommand = Number.isFinite(currentControls.trim) ? currentControls.trim : 0;
        const blendedThrottle = currentControls.throttle + ((limitedThrottle - currentControls.throttle) * blendAlpha);
        const blendedElevator = currentControls.elevator + ((limitedElevator - currentControls.elevator) * blendAlpha);
        const blendedAileron = currentControls.aileron + ((limitedAileron - currentControls.aileron) * blendAlpha);
        const blendedRudder = currentControls.rudder + ((limitedRudder - currentControls.rudder) * blendAlpha);
        const blendedTrim = currentTrimCommand + ((newTrim - currentTrimCommand) * blendAlpha);

        // Update Debug State
        this.debugState = {
            headingError,
            targetRoll: targetRoll * 180 / Math.PI, // Convert to deg for display
            pitchError: (targetPitch - fPitch) * 180 / Math.PI,
            targetPitch: targetPitch * 180 / Math.PI,
            speedError: targetSpeed - fAirspeed,
            throttleCmd: blendedThrottle,
            throttleRawCommand: throttleCmd,
            throttleEnvelopeMin: throttleEnvelope.minThrottle,
            throttleEnvelopeMax: throttleEnvelope.maxThrottle,
            shapedSpeedTarget: speedControl.shapedTarget,
            speedTrend: speedControl.speedTrend,
            throttleFeedForward: speedControl.baseThrottle,
            throttleCorrection: speedControl.correction,
            throttlePredictiveDamping: speedControl.predictiveDamping,
            vsError: targetVS - fVerticalSpeed,
            aileronCmd: blendedAileron,
            elevatorCmd: blendedElevator,
            rudderCmd: blendedRudder,
            beta: fBeta,
            mode: this.mode,
            engaged: this.engaged,
            altitudeMode: this.altitudeMode,
            normalizedTargets: { ...this.targets },
            ils: ilsDebug,
            lnav: this.debugState.lnav,
            lnavMessage: this.debugState.lnavMessage || ''
        };
        this.fmaStatus = this.fmaService.buildStatus({
            engaged: this.engaged,
            autopilotMode: this.mode,
            autopilotDebug: this.debugState,
            targets: this.targets
        });

        return {
            throttle: isFinite(blendedThrottle) ? blendedThrottle : 0,
            elevator: isFinite(blendedElevator) ? blendedElevator : 0,
            trim: isFinite(blendedTrim) ? blendedTrim : 0,
            aileron: isFinite(blendedAileron) ? blendedAileron : 0,
            rudder: isFinite(blendedRudder) ? blendedRudder : 0
        };
    }
}

export default RealisticAutopilotService;

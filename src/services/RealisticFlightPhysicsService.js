
/**
 * Realistic Flight Physics Service (6-DOF Rigid Body Dynamics)
 * 
 * A high-fidelity physics model based on standard equations of motion for a rigid body.
 * Uses Quaternion for attitude tracking to avoid gimbal lock.
 * Implements standard ISA atmosphere, aerodynamic coefficients, and landing gear dynamics.
 * 
 * Coordinate Systems:
 * - Internal Physics: NED (North-East-Down) for Earth, FRD (Forward-Right-Down) for Body.
 * - External Interface: ENU (East-North-Up) or project specific (Z-Up) converted at boundaries.
 */

import EnginePhysicsService from './EnginePhysicsService.js';
import RealisticAutopilotService from './RealisticAutopilotService.js';
import FailureHandler from './failures/FailureHandler.js';
import WarningSystem from './WarningSystem.js';
import OverheadLogic from './OverheadLogic.js';
import { airportService } from './airportService.js';

// ==========================================
// Math Utilities
// ==========================================

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }

    add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
    scale(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() {
        const m = this.magnitude();
        return m > 0 ? this.scale(1 / m) : new Vector3();
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
}

class Quaternion {
    constructor(w = 1, x = 0, y = 0, z = 0) {
        this.w = w; this.x = x; this.y = y; this.z = z;
    }

    normalize() {
        const m = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
        if (m > 0) {
            this.w /= m; this.x /= m; this.y /= m; this.z /= m;
        }
        return this;
    }

    // Rotate vector v by this quaternion
    rotate(v) {
        // v' = q * v * q_conjugate
        const qvec = new Vector3(this.x, this.y, this.z);
        const uv = qvec.cross(v);
        const uuv = qvec.cross(uv);
        
        return v.add(uv.scale(2 * this.w)).add(uuv.scale(2));
    }

    // Get Euler Angles (Roll, Pitch, Yaw) in Radians from Quaternion
    // Assumes standard aerospace sequence (Yaw -> Pitch -> Roll)
    toEuler() {
        // Roll (phi)
        const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
        const phi = Math.atan2(sinr_cosp, cosr_cosp);

        // Pitch (theta)
        const sinp = 2 * (this.w * this.y - this.z * this.x);
        let theta;
        if (Math.abs(sinp) >= 1)
            theta = Math.sign(sinp) * Math.PI / 2; // use 90 degrees if out of range
        else
            theta = Math.asin(sinp);

        // Yaw (psi)
        const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
        const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
        const psi = Math.atan2(siny_cosp, cosy_cosp);

        return { phi, theta, psi };
    }

    static fromEuler(phi, theta, psi) {
        const cy = Math.cos(psi * 0.5);
        const sy = Math.sin(psi * 0.5);
        const cp = Math.cos(theta * 0.5);
        const sp = Math.sin(theta * 0.5);
        const cr = Math.cos(phi * 0.5);
        const sr = Math.sin(phi * 0.5);

        return new Quaternion(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy
        );
    }
}

// ==========================================
// Main Service
// ==========================================

class RealisticFlightPhysicsService {
    constructor(aircraftData, initialLat = 0, initialLon = 0, difficulty = 'rookie') {
        this.aircraft = this.validateAndParseAircraft(aircraftData);
        
        // Physical Constants
        this.CONSTANTS = {
            G: 9.80665,
            R_GAS: 287.05,
            GAMMA: 1.4,
            SEA_LEVEL_PRESSURE: 101325,
            SEA_LEVEL_DENSITY: 1.225,
            SEA_LEVEL_TEMP: 288.15,
            TEMP_LAPSE_RATE: -0.0065
        };

        // Initial State (Internal Physics uses NED: North, East, Down)
        this.state = {
            // Position (Earth Fixed NED)
            pos: new Vector3(0, 0, -this.aircraft.gearHeight), // Start ON THE GROUND
            geo: { lat: initialLat, lon: initialLon },
            
            // Velocity (Body Frame FRD: Forward, Right, Down) - u, v, w
            vel: new Vector3(0, 0, 0),
            
            // Attitude (Quaternion) - Body to Earth
            quat: new Quaternion(),
            
            // Angular Velocity (Body Frame) - p, q, r
            rates: new Vector3(0, 0, 0),
            
            // Mass Properties
            mass: this.aircraft.mass,
            fuel: (typeof aircraftData.fuelWeight === 'number' ? aircraftData.fuelWeight : (this.aircraft.maxFuelCapacity ?? 10000))
        };
        
        // Payload Mass (Pax + Cargo)
        this.payloadMass = typeof aircraftData.payloadWeight === 'number' ? aircraftData.payloadWeight : ((this.aircraft.maxPayload || 15000) * 0.7);

        // Control State
        this.controls = {
            throttle: 0,
            engineThrottles: Array(this.aircraft.engineCount).fill(0), // Individual throttles
            aileron: 0, // -1 to 1 (Roll)
            elevator: 0, // -1 to 1 (Pitch)
            rudder: 0,   // -1 to 1 (Yaw)
            flaps: 0,    // 0 to 1
            gear: 1,     // 0 (up) to 1 (down)
            brakes: 0,
            trim: 0      // Pitch trim
        };

        // Failure Simulation State
        this.controlLag = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 }; // 1.0 = normal, >1.0 = slower
        this.controlEffectiveness = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 }; // 0.0 to 1.0
        this.vibrationLevel = 0; // Global vibration level

        // Engine State
        this.engines = Array(this.aircraft.engineCount).fill(0).map(() => {
            // Introduce ~5% uncertainty in engine responsiveness
            // Range: 0.95 to 1.05
            const uncertainty = 0.95 + Math.random() * 0.10;
            
            return new EnginePhysicsService({
                maxThrust: this.aircraft.maxThrust,
                specificFuelConsumption: this.aircraft.specificFuelConsumption,
                responsiveness: uncertainty
            });
        });

        // Simulation Metadata
        this.crashed = false;
        this.onGround = true;
        this.crashReason = "";
        this.time = 0;
        this.runwayGeometry = null;
        this.groundStatus = { status: 'UNKNOWN', remainingLength: 0 };
        this.difficulty = difficulty; // Set from constructor
        // Initialize airport elevation from config (converted from feet to meters if provided)
        this.airportElevation = (aircraftData.airportElevation || 0) * 0.3048; 
        this.terrainElevation = null; // AMSL in meters
        this.currentGroundZ = 0; // NED Z coordinate of ground (usually negative or zero)

        // If starting on ground, set initial Z based on airport elevation
        if (this.onGround) {
             // We want AMSL = airportElevation + gearHeight (approx)
             // NED Frame: Z is Down. Altitude is -Z.
             // So -Z = airportElevation + gearHeight
             // Z = -(airportElevation + gearHeight)
             const gearHeight = this.aircraft.gearHeight || 2;
             this.state.pos.z = -(this.airportElevation + gearHeight);
             
             // Also update currentGroundZ so we don't think we are underground relative to terrain
             // If terrain is flat at airport elevation:
             this.currentGroundZ = -this.airportElevation;
        }

        // Autopilot
        this.autopilot = new RealisticAutopilotService();
        
        // Failure System
        this.failureSystem = new FailureHandler({ difficulty: this.difficulty });
        this.warningSystem = new WarningSystem();
        this.sensors = { pitotBlocked: false };

        // Aircraft Systems State
        this.initializeSystems(this.difficulty);
    }

    initializeSystems(difficulty) {
        // Cold & Dark for Pro/Devil
        const isColdDark = difficulty === 'pro' || difficulty === 'devil';
        const engineCount = this.aircraft.engineCount || 2;
        
        // Generate Engine States dynamically
        const enginesState = {};
        for (let i = 1; i <= engineCount; i++) {
            enginesState[`eng${i}`] = { 
                startSwitch: 'OFF', 
                fuelControl: !isColdDark, 
                n2: isColdDark ? 0 : 60, 
                egt: isColdDark ? 20 : 400 
            };
        }

        // Generate Electrical Generator States
        const elecState = {
            battery: !isColdDark,
            batteryCharge: 100, // %
            stbyPower: !isColdDark,
            apuGen: false,
            busTie: true, // Auto
            dcVolts: isColdDark ? 0 : 28.0,
            acVolts: isColdDark ? 0 : 115,
            acFreq: isColdDark ? 0 : 400,
            acAmps: isColdDark ? 0 : 50,
            apuGenOff: true
        };
        
        // Add generators for each engine
        for (let i = 1; i <= engineCount; i++) {
            elecState[`gen${i}`] = !isColdDark;
            elecState[`sourceOff${i}`] = isColdDark;
        }

        // Generate Pneumatic Bleed States
        const pneuState = {
            packL: !isColdDark,
            packR: !isColdDark,
            isolationValve: true, // Auto/Open
            cabinAlt: 0,
            diffPressure: 0,
            targetAlt: 35000,
            ductPressL: isColdDark ? 0 : 30,
            ductPressR: isColdDark ? 0 : 30,
            mode: 'AUTO'
        };
        
        // Add bleeds for each engine
        for (let i = 1; i <= engineCount; i++) {
            pneuState[`bleed${i}`] = !isColdDark;
        }

        // Fire Detection/Protection
        const fireState = {
            apu: false,
            cargo: false,
            apuHandle: false,
            bottle1: 100,
            bottle2: 100
        };
        
        for (let i = 1; i <= engineCount; i++) {
            fireState[`eng${i}`] = false;       // Detection
            fireState[`eng${i}Handle`] = false; // Handle
        }

        this.systems = {
            electrical: elecState,
            fuel: {
                leftPumps: !isColdDark,
                rightPumps: !isColdDark,
                centerPumps: false,
                crossfeed: false,
                tanks: {
                    left: 5000,
                    right: 5000,
                    center: 2000
                },
                pressL: isColdDark ? 0 : 35,
                pressR: isColdDark ? 0 : 35,
                pressC: 0
            },
            apu: {
                master: false,
                start: false,
                running: false,
                starting: false,
                bleed: false,
                egt: 0,
                n2: 0,
                state: 'OFF'
            },
            hydraulics: {
                sysA: { pressure: isColdDark ? 0 : 3000, engPump: !isColdDark, elecPump: !isColdDark, qty: 100 },
                sysB: { pressure: isColdDark ? 0 : 3000, engPump: !isColdDark, elecPump: !isColdDark, qty: 100 }
            },
            transponder: {
                code: 2000,
                mode: 'STBY', // STBY, ALT, TA/RA
                ident: false
            },
            pressurization: pneuState,
            oxygen: {
                masks: false,
                crewPressure: 1800,
                paxPressure: 1500
            },
            lighting: {
                landing: false,
                taxi: false,
                nav: !isColdDark,
                beacon: !isColdDark,
                strobe: !isColdDark,
                logo: false,
                wing: false,
                powered: !isColdDark
            },
            nav: {
                irsL: !isColdDark,
                irsR: !isColdDark
            },
            engines: enginesState,
            fire: fireState,
            // starters removed in favor of engines
            signs: {
                seatBelts: !isColdDark,
                noSmoking: !isColdDark
            },
            wipers: {
                left: false,
                right: false
            },
            brakes: {
                parkingBrake: isColdDark, // On if cold & dark
                autobrake: 'OFF', // RTO, OFF, 1, 2, 3, MAX
                temp: [20, 20, 20, 20] // Brake temps
            }
        };

        // If cold & dark, ensure engines are off too
        if (isColdDark) {
            this.engines.forEach(eng => {
                eng.running = false;
                eng.state.n1 = 0;
                eng.state.n2 = 0;
                eng.state.egt = 15; // Ambient
                eng.state.ff = 0;
            });
        }
    }


    validateAndParseAircraft(data) {
        const wingArea = data.wingArea || 125;
        const wingSpan = data.wingSpan || 35;
        const chord = wingArea / wingSpan;
        const cgPos = typeof data.centerOfGravityPosition === 'number' ? data.centerOfGravityPosition : 0.15;
        const acPos = typeof data.aerodynamicCenterPosition === 'number' ? data.aerodynamicCenterPosition : 0.25;
        const groundGravityArm = typeof data.groundGravityArm === 'number' ? data.groundGravityArm : chord * cgPos;
        const defaultLiftArmFrac = acPos - cgPos;
        const groundLiftArm = typeof data.groundLiftArm === 'number'
            ? data.groundLiftArm
            : chord * (defaultLiftArmFrac !== 0 ? defaultLiftArmFrac : 0.1);
        return {
            ...data,
            specificFuelConsumption: (function() {
                if (typeof data.specificFuelConsumption === 'number') return data.specificFuelConsumption;
                const burnPerNm = data.typicalFuelBurn || 2.5; // kg per nautical mile
                const cruiseKts = data.cruiseSpeed || 450; // knots
                const engines = data.engineCount || 2;
                const perEngineThrust = data.maxThrustPerEngine || 120000; // N
                const totalThrust = engines * perEngineThrust;
                const kgPerSec = (burnPerNm * cruiseKts) / 3600;
                const sfc = totalThrust > 0 ? kgPerSec / totalThrust : 0.000015;
                return sfc;
            })(),
            mass: (data.emptyWeight || 40000) + (data.fuelWeight || 10000) + (data.payloadWeight || 0),
            wingArea,
            wingSpan,
            chord,
            groundGravityArm,
            groundLiftArm,
            maxThrust: data.maxThrustPerEngine || 120000,
            engineCount: data.engineCount || 2,
            enginePositions: data.enginePositions || (function() {
                const count = data.engineCount || 2;
                const span = data.wingSpan || 35;
                const positions = [];
                
                // Defaults based on engine count
                // Body Frame: X (Forward), Y (Right), Z (Down)
                // CG is at 0,0,0
                
                if (count === 1) {
                    positions.push(new Vector3(2.0, 0, 0)); // Nose/Center
                } else if (count === 2) {
                    // Under-wing engines (approx 25% span)
                    // Z = 1.0 (Underslung)
                    positions.push(new Vector3(0, -span * 0.25, 1.0)); // Left
                    positions.push(new Vector3(0, span * 0.25, 1.0));  // Right
                } else if (count === 3) {
                     // MD-11/DC-10 style
                     positions.push(new Vector3(0, -span * 0.25, 1.0)); // Left
                     positions.push(new Vector3(0, span * 0.25, 1.0));  // Right
                     positions.push(new Vector3(-15, 0, -3.0)); // Tail (High, Aft)
                } else if (count === 4) {
                     // 747/A380 style
                     positions.push(new Vector3(2.0, -span * 0.35, 1.0)); // Out L
                     positions.push(new Vector3(4.0, -span * 0.18, 1.5)); // In L
                     positions.push(new Vector3(4.0, span * 0.18, 1.5));  // In R
                     positions.push(new Vector3(2.0, span * 0.35, 1.0)); // Out R
                } else {
                    // Fallback for others (distribute along span)
                    for (let i=0; i<count; i++) {
                        const y = (i - (count-1)/2) * (span * 0.5 / count);
                        positions.push(new Vector3(0, y, 1.0));
                    }
                }
                return positions;
            })(),
            
            // Inertia Tensor Approximation (if not provided)
            // Ixx, Iyy, Izz
            Ix: data.momentOfInertiaRoll || 1000000,
            Iy: data.momentOfInertiaPitch || 2000000,
            Iz: data.momentOfInertiaYaw || 3000000,
            
            // Aerodynamic Centers relative to CG (Positive X is Aft in many conventions, but we stick to FRD)
            // CG is at 0,0,0 body frame for simplicity of equations, we apply moments based on arms
            
            // Coefficients (Linearized)
            CL0: data.basicLiftCoefficient || 0.2,
            CLa: data.liftCurveSlope || 5.5, // per radian
            CD0: data.zeroLiftDragCoefficient || 0.02,
            K: data.inducedDragFactor || 0.025, // Reduced from 0.04 to 0.025 to lower induced drag
            
            // Stability Derivatives (Approximated if missing)
            Cm0: 0.0, // Pitching moment at zero AoA
            Cma: -1.2, // Pitch stability (Increased from -0.5 to -1.2 for better stability)
            Cmq: -15.0, // Pitch damping
            Cde: -0.8, // Elevator effectiveness (Increased from -0.4 to -0.8 for better rotation authority)
            
            // Lateral/Directional
            Clb: -0.1, // Dihedral effect (Roll due to sideslip)
            Clp: -0.4, // Roll damping
            Cda: 0.15, // Aileron effectiveness
            
            Cnb: 0.1, // Weathercock stability (Yaw stability)
            Cnr: -0.2, // Yaw damping
            Cdr: 0.1, // Rudder effectiveness
            
            // Ground Handling
            gearHeight: 3.0, // Distance from CG to ground when gear is down
            gearStiffness: 3000000, // Increased to support ~80 tons (Weight ~800kN). Compression ~0.3m
            gearDamping: 300000, // Increased for stability
            frictionCoeff: 0.02,
            brakingFriction: 0.8,
            
            // Flap Profile Fallback
            flapProfile: data.flapProfile || {
                positions: [
                    { angle: 0, clIncrement: 0, cdIncrement: 0 },
                    { angle: 35, clIncrement: 0.3, cdIncrement: 0.01 }
                ]
            }
        };
    }

    /**
     * Main Physics Loop
     * @param {Object} input - Control inputs
     * @param {number} dt - Time step (seconds)
     */
    // --- Helper Methods ---
    _calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    _calculateBearing(lat1, lon1, lat2, lon2) {
        const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
        const brng = Math.atan2(y, x) * 180 / Math.PI;
        return (brng + 360) % 360;
    }

    update(input, dt) {
        if (this.crashed) return this.getOutputState();

        // Update ground status based on current position
        this.updateGroundStatus();

        // Sub-stepping for stability (High stiffness springs need small dt)
        const subSteps = 5;
        const subDt = dt / subSteps;

        // --- Autopilot Update ---
        // Compute essential derived values for AP
        const v_earth = this.state.quat.rotate(this.state.vel);
        const airspeedsForAP = this.calculateAirspeeds();
        const currentAirspeed = airspeedsForAP.indicatedAirspeed; // IAS in knots
        const currentVS = -v_earth.z * 196.85; // m/s -> ft/min (z is down, so -z is up)
        const euler = this.state.quat.toEuler();
        const currentHeading = (euler.psi * 180 / Math.PI + 360) % 360;
        
        const apState = {
            airspeed: currentAirspeed,
            verticalSpeed: currentVS,
            pitch: euler.theta,
            roll: euler.phi,
            altitude: -this.state.pos.z * 3.28084,
            heading: currentHeading,
            latitude: this.state.geo.lat,
            longitude: this.state.geo.lon
        };

        // --- Waypoint Sequencing & LNAV ---
        if (this.flightPlan && this.flightPlan.length > 0) {
            // Ensure index is valid. If flight plan has multiple points (e.g. Origin -> WP1), start at 1 to avoid targeting origin.
            if (this.currentWaypointIndex === undefined) {
                this.currentWaypointIndex = (this.flightPlan.length > 1) ? 1 : 0;
            }
            
            if (this.currentWaypointIndex < this.flightPlan.length) {
                const nextWaypoint = this.flightPlan[this.currentWaypointIndex];
                const dist = this._calculateDistance(this.state.geo.lat, this.state.geo.lon, nextWaypoint.latitude, nextWaypoint.longitude);
                
                // Track distance history for "moving away" detection
                if (this._lastWaypointIndex !== this.currentWaypointIndex) {
                    this._prevDistToWaypoint = dist;
                    this._lastWaypointIndex = this.currentWaypointIndex;
                }
                
                const isMovingAway = (dist > (this._prevDistToWaypoint || dist) + 50); // 50m buffer
                const wasClose = dist < 4000; // 4km proximity
                
                this._prevDistToWaypoint = dist;

                // Switch to next waypoint if:
                // 1. Within 2km (Fly-over)
                // 2. Moving away and was close (Fly-by / Passed)
                // 3. User requested "Auto-delete" -> We simulate this by advancing index and never looking back
                if ((dist < 2000 || (isMovingAway && wasClose)) && !nextWaypoint.isHold) {
                    this.currentWaypointIndex++;
                    this._prevDistToWaypoint = Infinity; 
                    console.log(`📍 Reached/Passed waypoint ${nextWaypoint.label || this.currentWaypointIndex - 1}. Sequencing to index ${this.currentWaypointIndex}`);
                }

                // If LNAV is engaged, update target heading to waypoint bearing
                if (this.autopilot.mode === 'LNAV' && this.currentWaypointIndex < this.flightPlan.length) {
                    const targetWP = this.flightPlan[this.currentWaypointIndex];
                    const bearing = this._calculateBearing(this.state.geo.lat, this.state.geo.lon, targetWP.latitude, targetWP.longitude);
                    
                    if (targetWP.isHold) {
                        // --- HOLD PATTERN LOGIC (Right Turn Orbit) ---
                        // Target a circular orbit around the waypoint
                        const HOLD_RADIUS = 3000; // 3km radius (~1.6nm)
                        const CONVERGENCE_GAIN = 0.001; // Sensitivity of convergence
                        
                        // Calculate heading relative to bearing
                        // If on radius: Bearing + 90
                        // If outside: Turn In (Bearing + 90 - correction)
                        // If inside: Turn Out (Bearing + 90 + correction) (Wait, inside means we are closer, we want to widen turn?)
                        // Let's visualize: Center North. Tangent East. 
                        // If we are South (Bearing 0), we fly East (90).
                        // If we are South but Far (Outside), we want to fly North-East (45). (90 - 45).
                        // If we are South but Close (Inside), we want to fly South-East (135). (90 + 45).
                        
                        // Correction should be positive if Inside (Dist < Radius) -> 90 + pos
                        // Correction should be negative if Outside (Dist > Radius) -> 90 - pos
                        
                        // dist - radius > 0 (Outside). We want negative correction.
                        // So: -1 * (dist - radius) * gain
                        
                        const distError = dist - HOLD_RADIUS;
                        const correction = Math.atan(distError * CONVERGENCE_GAIN); // radians, range -PI/2 to PI/2
                        
                        // Target Heading = Bearing + 90 - Correction
                        // But wait, if we are outside (dist > radius), distError > 0. Correction > 0.
                        // We want Bearing + 90 - Correction.
                        // Example: Outside. Bearing 0. Target 90 - 45 = 45. Correct.
                        // Example: Inside. Bearing 0. DistError < 0. Correction < 0.
                        // Target 90 - (-45) = 135. Correct.
                        
                        let targetHeading = bearing + 90 - (correction * 180 / Math.PI);
                        
                        // Normalize to 0-360
                        targetHeading = (targetHeading + 360) % 360;
                        
                        this.autopilot.setTargets({ heading: targetHeading });
                        // console.log(`🔄 Holding at ${targetWP.label}: Dist ${Math.round(dist)}m, Hdg ${Math.round(targetHeading)}`);
                    } else {
                        // Standard Direct-To
                        this.autopilot.setTargets({ heading: bearing });
                    }
                }

                // Update Runway Geometry if target is an airport with a selected runway
                if (this.currentWaypointIndex < this.flightPlan.length) {
                    const targetWP = this.flightPlan[this.currentWaypointIndex];
                    if ((targetWP.type === 'airport' || targetWP.type === 'runway') && targetWP.selectedRunway && targetWP.details) {
                        const airportCode = targetWP.details.iata || targetWP.details.icao || targetWP.label;
                        // Check if we need to update (simple check to avoid spamming)
                        if (!this.runwayGeometry || (this.runwayGeometry.runwayName !== targetWP.selectedRunway && this.runwayGeometry.airportCode !== airportCode)) {
                             const geom = airportService.getRunwayGeometry(airportCode, targetWP.selectedRunway);
                             if (geom) {
                                 this.setRunwayGeometry(geom);
                                 console.log(`📍 Physics: Auto-selected runway ${targetWP.selectedRunway} at ${airportCode}`);
                             }
                        }
                    }
                }
            }
        }

        const apOutputs = this.autopilot.update(apState, this.controls, dt);

        let finalInput = input;
        if (apOutputs) {
            // Override user inputs with AP outputs
            finalInput = {
                ...input,
                throttle: apOutputs.throttle,
                pitch: apOutputs.elevator, // Map Elevator Command to Pitch Input
                roll: apOutputs.aileron,   // Map Aileron Command to Roll Input
                trim: apOutputs.trim,
                yaw: apOutputs.rudder
            };
        }

        this.processInputs(finalInput, dt); // Process inputs once per frame
        this.updateSystems(dt); // Update overhead systems logic

        for (let i = 0; i < subSteps; i++) {
            this.time += subDt;

            // 1. Position Update (Geo)
            // NED to Geo approximation
            const v_ned = this.state.quat.rotate(this.state.vel);
            const latRad = this.state.geo.lat * Math.PI / 180;
            const metersPerLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
            const metersPerLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);
            
            this.state.geo.lat += (v_ned.x * subDt) / metersPerLat;
            this.state.geo.lon += (v_ned.y * subDt) / metersPerLon;

            // 2. Environment
            const env = this.calculateEnvironment(this.state.pos.z);

            // 3. Engine Dynamics
            this.updateEngines(env, subDt);

            // 3.1 Fuel Consumption & Dynamic Mass
            const totalFuelFlow = this.engines.reduce((sum, e) => sum + (e.state.fuelFlow || 0), 0); // kg/s
            const fuelBurned = totalFuelFlow * subDt;
            this.state.fuel = Math.max(0, this.state.fuel - fuelBurned);
            
            // Recalculate Total Mass: Empty + Fuel + Payload
            const emptyWeight = this.aircraft.emptyWeight || 40000;
            this.state.mass = emptyWeight + this.state.fuel + this.payloadMass;

            // 4. Calculate Forces and Moments
            const { forces, moments, aeroForces, thrustForces, gravityForces, groundForces, debug } = this.calculateAerodynamicsAndGround(env);
            
            // Store last for UI
            if (i === subSteps - 1) {
                this.aeroForces = aeroForces;
                this.thrustForces = thrustForces;
                this.gravityForces = gravityForces;
                this.groundForces = groundForces;
                this.debugData = debug;
            }

            // 5. Integrate
            this.integrate(forces, moments, subDt);

            // 6. Constraints
            this.checkConstraints();
            if (this.crashed) break;
        }

        return this.getOutputState();
    }

    processInputs(input, dt) {
        // Smooth inputs to simulate actuator dynamics
        const rate = 5.0 * dt;
        
        // Throttle (Master)
        this.controls.throttle += (input.throttle - this.controls.throttle) * rate;
        
        // Individual Throttles
        if (input.throttles && Array.isArray(input.throttles)) {
            // If individual inputs provided, smooth them independently
            for (let i = 0; i < this.controls.engineThrottles.length; i++) {
                const target = input.throttles[i] !== undefined ? input.throttles[i] : input.throttle;
                this.controls.engineThrottles[i] += (target - this.controls.engineThrottles[i]) * rate;
            }
        } else {
            // Sync to master if no individual inputs
            for (let i = 0; i < this.controls.engineThrottles.length; i++) {
                this.controls.engineThrottles[i] += (input.throttle - this.controls.engineThrottles[i]) * rate;
            }
        }
        
        // Flight Controls (Pitch, Roll, Yaw)
        this.controls.elevator += (input.pitch - this.controls.elevator) * rate * 2; // Faster response
        this.controls.aileron += (input.roll - this.controls.aileron) * rate * 3;
        this.controls.rudder += (input.yaw - this.controls.rudder) * rate * 2;
        
        // Systems
        if (input.flaps !== undefined) this.controls.flaps = input.flaps;
        if (input.gear !== undefined) this.controls.gear = input.gear ? 1 : 0;
        
        // Trim smoothing
        const targetTrim = input.trim !== undefined ? input.trim : this.controls.trim;
        this.controls.trim += (targetTrim - this.controls.trim) * rate;
        
        // Brakes (simple logic: low throttle + on ground)
        if (this.onGround && this.controls.throttle < 0.1) {
            // this.controls.brakes = 1.0; // Auto brakes for now? No, let's assume user wants to roll unless stopped
             // Actually, let's map brakes to a key or just drag. For now, implicit drag.
        }
    }

    updateSystems(dt) {
        // Construct context for OverheadLogic
        const context = {
            engineN2: this.engines.map(e => e.state.n2 || 0),
            altitude: -this.state.pos.z * 3.28084, // ft
            onGround: this.onGround,
            airspeed: this.state.vel.magnitude() * 1.94384, // kts
            difficulty: this.difficulty // Pass difficulty to logic
        };

        // Delegate logic to OverheadLogic service
        OverheadLogic.update(this.systems, context, dt);
    }

    calculateEnvironment(z_down) {
        // Altitude = -z_down
        const h = -z_down; 
        
        // Simple ISA model
        let temp = this.CONSTANTS.SEA_LEVEL_TEMP + (this.CONSTANTS.TEMP_LAPSE_RATE * h);
        if (temp < 216.65) temp = 216.65; // Tropopause floor

        const pressure = this.CONSTANTS.SEA_LEVEL_PRESSURE * Math.pow(temp / this.CONSTANTS.SEA_LEVEL_TEMP, -this.CONSTANTS.G / (this.CONSTANTS.TEMP_LAPSE_RATE * this.CONSTANTS.R_GAS));
        const density = pressure / (this.CONSTANTS.R_GAS * temp);
        const speedOfSound = Math.sqrt(this.CONSTANTS.GAMMA * this.CONSTANTS.R_GAS * temp);

        // Wind & Turbulence (injected via update or stored state)
        // Default to zero if not set
        const wind = this.environment?.wind || new Vector3(0, 0, 0);
        const turbulence = this.environment?.turbulence || 0;

        return { density, pressure, temp, speedOfSound, wind, turbulence };
    }

    /**
     * Set environmental conditions (called from external service)
     * @param {Object} envData { windSpeed, windDirection, turbulence, precipitation }
     */
    setEnvironment(envData) {
        if (!envData) return;
        
        // Convert Wind (Speed in Knots, Direction in Degrees From) to Earth Velocity Vector (m/s)
        // Direction is "From", so vector is opposite.
        // 0 deg = From North (Moving South). Vector X = -Speed.
        // 90 deg = From East (Moving West). Vector Y = -Speed.
        // Wind Vector (Earth NED):
        // X (North) = -Speed * cos(dir)
        // Y (East) = -Speed * sin(dir)
        // Z (Down) = 0 (usually)
        
        const speedMs = (envData.windSpeed || 0) * 0.514444; // knots -> m/s
        const dirRad = (envData.windDirection || 0) * Math.PI / 180;
        
        // North is X, East is Y.
        // Wind 360 (From North) -> Flowing South -> -X
        // Wind 090 (From East) -> Flowing West -> -Y
        const windX = -speedMs * Math.cos(dirRad);
        const windY = -speedMs * Math.sin(dirRad);
        
        this.environment = {
            wind: new Vector3(windX, windY, 0),
            turbulence: envData.turbulence || 0,
            precipitation: envData.precipitation || 0
        };
    }

    updateEngines(env, dt) {
        // Mach number approx
        const speedOfSound = env.speedOfSound || 340;
        
        // Transform Wind to Body Frame for Airspeed Calculation
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(env.wind || new Vector3(0,0,0));
        const V_air_body = this.state.vel.sub(V_wind_body);
        const V_airspeed = V_air_body.magnitude();

        const mach = V_airspeed / speedOfSound;
        const airDensityRatio = env.density / this.CONSTANTS.SEA_LEVEL_DENSITY;

        this.engines.forEach((engine, index) => {
             // 1. Get Control Inputs
             const engineThrottle = this.controls.engineThrottles[index];
             
             // 2. Check for Starter Drive (from OverheadLogic)
             // OverheadLogic simulates the starter motor and initial lightoff.
             // It updates this.systems.engines[id].n2.
             // If the system N2 is higher than our physics N2 (and < 55%), we assume the starter is driving the engine.
             const sysEng = this.systems.engines[`eng${index + 1}`];
             const isBeingStarted = sysEng && (sysEng.startSwitch === 'GRD' || (sysEng.n2 > engine.state.n2 && sysEng.n2 < 55));
             
             if (isBeingStarted) {
                 // Force physics engine to match starter state if starter is faster
                 if (sysEng.n2 > engine.state.n2) {
                     engine.state.n2 = sysEng.n2;
                     engine.state.n1 = engine.state.n2 * 0.9; // Approximate N1 from N2 during start
                     
                     // If OverheadLogic says we have lightoff (EGT rising), sync EGT too
                     if (sysEng.egt > engine.state.egt) {
                         engine.state.egt = sysEng.egt;
                     }
                     
                     // If fuel introduced, tell physics engine it's running
                     if (sysEng.fuelControl && sysEng.n2 > 20) {
                         engine.state.running = true;
                     }
                 }
             }

             // 3. Update Physics
             engine.update(dt, engineThrottle, mach, -this.state.pos.z, airDensityRatio, env.temp);
             
             // 4. Sync Back to Systems (for UI and Logic)
             // We are the source of truth for running engines
             sysEng.n1 = engine.state.n1;
             sysEng.n2 = engine.state.n2;
             sysEng.egt = engine.state.egt;
             sysEng.ff = engine.state.fuelFlow;
             
             // 5. Detect Engine Stall/Failure conditions?
             // (Already handled in engine.update mostly)
        });
        
        if (this.state.fuel < 0) {
            this.state.fuel = 0;
            this.engines.forEach(e => e.setFailed(true));
        }
    }

    calculateAerodynamicCoefficients(V_airspeed, alpha, beta, rates, q) {
        // Flap Increments from Profile
        const flapIncrements = this.getFlapIncrements();
        const CL_flaps = flapIncrements.cl;
        const CD_flaps_base = flapIncrements.cd;

        // Apply Control Effectiveness (Failures)
        const effAileron = this.controls.aileron * (this.controlEffectiveness.aileron !== undefined ? this.controlEffectiveness.aileron : 1.0);
        const effElevator = this.controls.elevator * (this.controlEffectiveness.elevator !== undefined ? this.controlEffectiveness.elevator : 1.0);
        const effRudder = this.controls.rudder * (this.controlEffectiveness.rudder !== undefined ? this.controlEffectiveness.rudder : 1.0);

        // Airbrake Increments
        const airbrakeIncrements = this.getAirbrakeIncrements();
        const CL_brakes = airbrakeIncrements.cl;
        const CD_brakes = airbrakeIncrements.cd;

        // Lift (CL)
        // CL = CL0 + CLa * alpha + CL_flaps + CL_elevator + CL_brakes
        const CL_stall_drop = Math.abs(alpha) > 0.3 ? -0.5 * Math.sin((Math.abs(alpha) - 0.3) * 5) : 0; // Simple stall drop
        let CL = this.aircraft.CL0 + this.aircraft.CLa * alpha + CL_flaps + CL_brakes + (effElevator * 0.3) + CL_stall_drop;

        // Drag (CD)
        // CD = CD0 + K * CL^2 + CD_flaps + CD_gear + CD_brakes
        
        // Ground Effect on Induced Drag
        const h = -this.state.pos.z; // Altitude (CG)
        const wingSpan = this.aircraft.wingSpan;
        let groundEffectFactor = 1.0;
        
        if (h < wingSpan) {
            const r = h / wingSpan;
            // Torenbeek's approximation for induced drag reduction
            groundEffectFactor = (16 * r * r) / (1 + 16 * r * r);
            // Clamp to avoid unrealistic zero drag (min 10% of induced drag)
            if (groundEffectFactor < 0.1) groundEffectFactor = 0.1; 
        }

        const CD_flaps = CD_flaps_base; 
        const CD_gear = this.controls.gear * 0.015; 
        const CD_elevator = Math.abs(effElevator) * 0.02; // Parasitic drag from elevator deflection
        
        // Clamp CL for induced drag to prevent runaway drag at high angles (stall region)
        const CL_induced_calc = Math.min(Math.abs(CL), 1.35); // Cap effective CL for induced drag
        const CD_induced = this.aircraft.K * CL_induced_calc * CL_induced_calc * groundEffectFactor;
        
        const CD = this.aircraft.CD0 + CD_induced + CD_flaps + CD_gear + CD_brakes + CD_elevator;

        // Side Force (CY)
        // CY = CYb * beta + CYdr * rudder
        const CY = -0.5 * beta + (effRudder * 0.2);

        // Moments
        // Pitch (Cm)
        // Cm = Cm0 + Cma * alpha + Cmq * (q * c / 2V) + Cde * elevator
        const c = this.aircraft.chord;
        const b = this.aircraft.wingSpan;
        const pitch_damping = this.aircraft.Cmq * (rates.y * c) / (2 * (V_airspeed + 0.1));
        
        // Flaps Pitch Moment (Cm_flaps)
        // Flaps typically cause a nose-down moment (negative Cm) due to aft shift of CP,
        // though downwash on tail can counteract. User requested "slight downward pitch torque".
        const Cm_flaps = this.controls.flaps * -0.01;
        
        const Cm = this.aircraft.Cm0 + (this.aircraft.Cma * alpha) + pitch_damping + (this.aircraft.Cde * (effElevator + this.controls.trim)) + Cm_flaps;

        // Roll (Cl)
        // Cl = Clb * beta + Clp * (p * b / 2V) + Cda * aileron
        const roll_damping = this.aircraft.Clp * (rates.x * b) / (2 * (V_airspeed + 0.1));
        let Cl = (this.aircraft.Clb * beta) + roll_damping + (this.aircraft.Cda * effAileron);

        // Yaw (Cn)
        // Cn = Cnb * beta + Cnr * (r * b / 2V) + Cdr * rudder
        const yaw_damping = this.aircraft.Cnr * (rates.z * b) / (2 * (V_airspeed + 0.1));
        const Cn = (this.aircraft.Cnb * beta) + yaw_damping + (this.aircraft.Cdr * effRudder);

        // --- PHYSICAL YAW-ROLL COUPLING (Differential Lift) ---
        // Calculate velocity difference due to yaw rate
        if (V_airspeed > 5 && Math.abs(rates.z) > 0.001) {
            const y_arm = b / 4; // Mid-point of semi-span
            const r = rates.z; // Yaw rate
            
            // Tangential velocity difference
            // Left Wing (Positive Roll Side): V_left = V + r * y_arm
            // Right Wing (Negative Roll Side): V_right = V - r * y_arm
            // We approximate the Lift difference based on V squared
            
            // Delta V ratio = (r * y_arm) / V
            const dV_ratio = (r * y_arm) / V_airspeed;
            
            // Lift is proportional to V^2
            // L_left ~ (1 + dV_ratio)^2 ~ 1 + 2*dV_ratio
            // L_right ~ (1 - dV_ratio)^2 ~ 1 - 2*dV_ratio
            // Delta L ~ 4 * dV_ratio * BaseLift
            
            // Roll Moment = Delta L * y_arm
            // But we are working in Coefficients.
            // Delta Cl = Delta Moment / (q * S * b)
            // Delta Moment = (L_left - L_right) * y_arm
            // L_base = q * (S/2) * CL (per wing)
            // L_left = L_base * (1 + 2*dV_ratio)
            // L_right = L_base * (1 - 2*dV_ratio)
            // L_left - L_right = L_base * 4 * dV_ratio
            // Delta Moment = (q * S/2 * CL * 4 * dV_ratio) * y_arm
            //              = 2 * q * S * CL * dV_ratio * y_arm
            // Delta Cl = (2 * q * S * CL * dV_ratio * y_arm) / (q * S * b)
            //          = (2 * CL * dV_ratio * y_arm) / b
            //          = (2 * CL * (r * y_arm / V) * y_arm) / b
            // Substitute y_arm = b/4
            //          = (2 * CL * (r * b/4 / V) * b/4) / b
            //          = (2 * CL * r * b * b / 16 / V) / b
            //          = (CL * r * b / 8 / V)
            
            // Let's check units and sign.
            // Positive r (Nose Right) -> Left Wing Faster -> More Lift -> Right Roll (Positive Cl).
            // So sign is +CL.
            
            const dCl_yaw = (CL * r * b) / (8 * V_airspeed);
            
            Cl += dCl_yaw;
        }

        return { CL, CD, CY, Cm, Cl, Cn };
    }

    calculateAerodynamicsAndGround(env) {
        // --- Velocity (Airspeed vs Ground Speed) ---
        // this.state.vel is V_ground_body (Ground Velocity in Body Frame)
        
        // Wind (Earth) -> Wind (Body)
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(env.wind || new Vector3(0,0,0));
        
        // Turbulence: Add random noise to wind body vector
        if (env.turbulence > 0) {
            const turbScale = env.turbulence * 5.0; // up to 5 m/s variation
            V_wind_body.x += (Math.random() - 0.5) * turbScale;
            V_wind_body.y += (Math.random() - 0.5) * turbScale;
            V_wind_body.z += (Math.random() - 0.5) * turbScale;
        }

        const V_air_body = this.state.vel.sub(V_wind_body); // V_air = V_ground - V_wind
        const V_airspeed = V_air_body.magnitude();
        
        // Dynamic Pressure (q)
        const q = 0.5 * env.density * V_airspeed * V_airspeed;

        // Angle of Attack (Alpha) & Sideslip (Beta)
        // alpha = atan2(w, u)
        // beta = asin(v / V)
        let alpha = 0;
        let beta = 0;
        // Fix for low speed instability: only calculate alpha/beta if airspeed > 3 knots (~1.5 m/s)
        // Below this speed, alpha/beta are undefined/unstable due to noise.
        if (V_airspeed > 1.5) {
            alpha = Math.atan2(V_air_body.z, V_air_body.x);
            beta = Math.asin(Math.max(-1, Math.min(1, V_air_body.y / V_airspeed)));
        }

        // --- Aerodynamic Coefficients ---
        const { CL, CD, CY, Cm, Cl, Cn } = this.calculateAerodynamicCoefficients(V_airspeed, alpha, beta, this.state.rates, q);

        // Dimensional Forces (Wind Axes -> Body Axes)
        // Lift acts perpendicular to relative wind, Drag parallel.
        // We approximate transformation for small beta:
        // F_lift = q * S * CL
        // F_drag = q * S * CD
        // F_side = q * S * CY
        
        const S = this.aircraft.wingArea;
        const b = this.aircraft.wingSpan;
        const c = this.aircraft.chord;

        const F_lift = q * S * CL;
        const F_drag = q * S * CD;
        const F_side = q * S * CY;

        // Transform Wind to Body (Rotation by -alpha around Y)
        // Fx = -Drag * cos(a) + Lift * sin(a)
        // Fz = -Drag * sin(a) - Lift * cos(a)
        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);
        
        const Fx_aero = -F_drag * cosA + F_lift * sinA;
        let Fy_aero = F_side;
        const Fz_aero = -F_drag * sinA - F_lift * cosA;

        // Dimensional Moments
        let Mx_aero = q * S * b * Cl;
        let My_aero = q * S * c * Cm;
        let Mz_aero = q * S * b * Cn;

        // --- Runway Stabilizer (User Request) ---
        // Rookie: Rail mode (Applied inside method via state override).
        // Others: Gentle pull forces.
        const stabilizer = this.applyRunwayStabilizer();
        if (stabilizer) {
            Fy_aero += stabilizer.Fy;
            Mz_aero += stabilizer.Mz;
        }
        
        // --- Ground Steering (Nose Wheel) ---
        // User Request: "control the plane's yaw output on the ground (its effect will diminish as soon as I am 10ft+)"
        // Modified: Use onGround flag instead of CG altitude to prevent premature fade-out on large aircraft.
        
        let Mz_steering = 0;
        let Fy_steering = 0;
        
        if (this.onGround) { 
             // Fade factor: Based on weight on wheels or just 1.0 if on ground.
             // User wants fade out as they lift off. onGround handles the binary state.
             // We can add a transition if needed, but onGround is robust.
             let steerFactor = 1.0;
             
             // Grass Damping
             let damping = 1.0;
             if (this.groundStatus && this.groundStatus.status === 'GRASS') {
                 damping = 0.3; // User requested "damped on grass"
             }
             
             // Steering Force Calculation
             // Apply mass-based torque for consistent handling across aircraft types
             // INCREASED: Stronger nose wheel authority (Torque 30->80, Side 15->40)
             const steeringTorque = this.state.mass * 80 * this.controls.rudder * steerFactor * damping;
             Mz_steering = steeringTorque;
             
             // Side force to initiate turn
             const steeringSideForce = this.state.mass * 40 * this.controls.rudder * steerFactor * damping;
             Fy_steering = steeringSideForce;
             
             // Debug log occasionally
             if (Math.random() < 0.001) {
                 console.log(`Physics: Ground Steering Active. Torque: ${steeringTorque.toFixed(0)}`);
             }
        }

        // Add Steering to Aero Forces/Moments
        Mz_aero += Mz_steering;
        // Fy_aero is already defined as const, need to change it or add to it
        // Fy_aero was: const Fy_aero = F_side;
        // We can't reassign const. I need to modify the previous code or add it to force summation.
        // Let's verify where Fy_aero is defined.
        
        // --- Thrust ---
        let F_thrust_body = new Vector3(0, 0, 0);
        let M_thrust_body = new Vector3(0, 0, 0);

        this.engines.forEach((engine, index) => {
            const thrustMag = engine.state.thrust;
            // Assume thrust vector is along X axis (Forward)
            // Ideally, we could have a thrust vector direction per engine, but X is standard.
            const F_eng = new Vector3(thrustMag, 0, 0);
            
            // Position
            const pos = this.aircraft.enginePositions[index] || new Vector3(0, 0, 0);
            
            // Moment = r x F (Position x Force)
            const M_eng = pos.cross(F_eng);
            
            F_thrust_body = F_thrust_body.add(F_eng);
            M_thrust_body = M_thrust_body.add(M_eng);
        });

        const Fx_thrust = F_thrust_body.x;
        // Fy and Fz from thrust are usually negligible unless vectoring or significant tilt, 
        // but we can include them if we want to be precise (here they are 0)
        
        // --- Gravity ---
        // Gravity in Earth Frame is (0, 0, mg)
        // Rotate to Body Frame: Fg_body = Q_inv * Fg_earth
        // Or using rotation matrix derived from Quaternion/Euler.
        // Using quaternion rotate: Conjugate of q rotates Earth->Body
        const gravityEarth = new Vector3(0, 0, this.state.mass * this.CONSTANTS.G);
        // Inverse rotation (Earth to Body)
        // To rotate frame A to B, we use q_AB. To rotate vector in A to B, we use q_AB*.
        // this.state.quat represents Body -> Earth rotation.
        // So we need inverse to take Gravity (Earth) -> Body.
        // q_inv is already calculated above
        const gravityBody = q_inv.rotate(gravityEarth);

        // --- Ground Interaction (Multi-Point Gear) ---
        // Simulating 3-point landing gear for realistic ground handling and rotation
        let F_ground = new Vector3(0, 0, 0);
        let M_ground = new Vector3(0, 0, 0);
        
        // Gear Definitions (Position relative to CG in Body Frame)
        // x: Forward, y: Right, z: Down (CG at 0,0,0)
        // Tuned for stability: Softer springs, higher damping
        const gears = [
            { name: 'nose', pos: new Vector3(14.0, 0, 3.0), k: 80000, c: 35000 },  // Softer nose
            { name: 'mainL', pos: new Vector3(-2.0, -3.5, 3.0), k: 150000, c: 150000 }, // Softer main, critical damping
            { name: 'mainR', pos: new Vector3(-2.0, 3.5, 3.0), k: 150000, c: 150000 }
        ];
        
        let onGroundAny = false;

        gears.forEach(gear => {
            // 1. Calculate Gear Position in Earth Frame (Z-Down)
            const P_body = gear.pos;
            const P_offset_earth = this.state.quat.rotate(P_body);
            const P_world_z = this.state.pos.z + P_offset_earth.z;
            
            // Check against current ground height (NED Z)
            if (P_world_z > this.currentGroundZ) {
                onGroundAny = true;
                const depth = P_world_z - this.currentGroundZ;
                
                // 2. Velocity at Contact Point (Body Frame -> Earth Frame Z)
                const V_point_body = this.state.vel.add(this.state.rates.cross(P_body));
                const V_point_earth = this.state.quat.rotate(V_point_body);
                const v_vertical = V_point_earth.z; // Positive = Moving Down
                
                // 3. Normal Force (Spring + Damper)
                let F_n = -(gear.k * depth + gear.c * v_vertical);
                if (F_n > 0) F_n = 0; // Don't pull ground
                
                // Clamp Normal Force to prevent explosion (max 4G per gear approx)
                const maxForce = this.state.mass * 9.81 * 4;
                if (Math.abs(F_n) > maxForce) F_n = -maxForce;

                // 4. Friction (Anisotropic: Rolling vs Lateral)
                // Calculate in Body Frame for correct orientation relative to wheels
                
                // Steering Angle (Nose Gear only)
                let steeringAngle = 0;
                if (gear.name === 'nose') {
                    // Map rudder to steering (-1 to 1 -> -70 to 70 degrees)
                    // Fade out steering at speed to prevent twitchiness? 
                    // Or trust user input. Real planes reduce nose wheel authority at speed.
                    steeringAngle = this.controls.rudder * 70 * Math.PI / 180;
                }

                // Velocity at wheel in Body Frame
                // V_point_body includes aircraft vel + rotation effect
                // We assume ground is flat, so we care about X and Y in body frame (approx)
                // For exactness on sloped ground, we should project V_point_earth onto surface tangent,
                // but Body XY is close enough for flat runway.
                
                // Rotate velocity into Wheel Frame (if steered)
                const cosS = Math.cos(steeringAngle);
                const sinS = Math.sin(steeringAngle);
                
                const vx_wheel = V_point_body.x * cosS + V_point_body.y * sinS;
                const vy_wheel = -V_point_body.x * sinS + V_point_body.y * cosS;
                
                // Friction Coefficients
                const isBraking = this.controls.brakes > 0.1 && gear.name.includes('main');
                let mu_roll = isBraking ? this.aircraft.brakingFriction : this.aircraft.frictionCoeff; // 0.8 or 0.02
                let mu_slide = 0.9; // High lateral friction (0.9 for dry tarmac)
                
                // Rain reduction
                if (this.environment && this.environment.precipitation > 0) {
                    const rainFactor = Math.min(this.environment.precipitation, 10) / 10;
                    mu_roll *= (1 - 0.4 * rainFactor);
                    mu_slide *= (1 - 0.4 * rainFactor);
                }

                if (this.groundStatus && this.groundStatus.status === 'GRASS') {
                    mu_roll = 0.08;
                    mu_slide = 0.5;
                    if (this.state.vel.magnitude() > 1) {
                        const noise = (Math.random() - 0.5) * 0.2;
                        F_n *= (1 + noise);
                    }
                }
                
                // Friction Forces (Wheel Frame)
                // Use a "stiction" zone for low speeds to prevent oscillation
                const v_threshold = 0.1;
                
                let Fx_wheel = 0;
                let Fy_wheel = 0;
                
                const F_normal_mag = Math.abs(F_n);
                
                // Longitudinal (Rolling)
                if (Math.abs(vx_wheel) < v_threshold) {
                     Fx_wheel = -vx_wheel * F_normal_mag * 50; // Linear damping at stop
                } else {
                     Fx_wheel = -Math.sign(vx_wheel) * F_normal_mag * mu_roll;
                }
                
                // Lateral (Sliding) - Critical for wind resistance
                // High stiffness for cornering
                if (Math.abs(vy_wheel) < v_threshold) {
                     // Reduced from 200 to 30 to prevent ejection, clamped to slide limit
                     let stiffForce = -vy_wheel * F_normal_mag * 30;
                     const maxStiff = F_normal_mag * mu_slide;
                     if (Math.abs(stiffForce) > maxStiff) stiffForce = Math.sign(stiffForce) * maxStiff;
                     Fy_wheel = stiffForce;
                } else {
                     Fy_wheel = -Math.sign(vy_wheel) * F_normal_mag * mu_slide;
                }
                
                // Rotate Forces back to Body Frame
                const Fx_body_fric = Fx_wheel * cosS - Fy_wheel * sinS;
                const Fy_body_fric = Fx_wheel * sinS + Fy_wheel * cosS;
                
                // Total Gear Force in Body Frame
                // Z component is Normal Force (Approximate, assuming Body Z is roughly Earth Z)
                // To be precise: F_n is Earth Z. We need to rotate (0,0,F_n) from Earth to Body.
                // q_inv.rotate(0,0,F_n)
                const F_normal_body = q_inv.rotate(new Vector3(0, 0, F_n));
                
                const F_gear_body = new Vector3(
                    Fx_body_fric + F_normal_body.x,
                    Fy_body_fric + F_normal_body.y,
                    F_normal_body.z
                );
                
                // Store force magnitude for pivot logic
                gear.forceMag = F_n; // F_n is negative (upward force on plane), so magnitude is abs(F_n)
                if (F_n < 0) gear.forceMag = Math.abs(F_n);
                else gear.forceMag = 0;

                // 6. Accumulate
                F_ground = F_ground.add(F_gear_body);
                M_ground = M_ground.add(P_body.cross(F_gear_body));
            } else {
                gear.forceMag = 0;
            }
        });

        this.onGround = onGroundAny;

        if (this.onGround) {
            const weightGround = this.state.mass * this.CONSTANTS.G;
            const gravityArm = this.aircraft.groundGravityArm || (this.aircraft.chord || 5) * 0.15;
            const liftArm = this.aircraft.groundLiftArm || (this.aircraft.chord || 5) * 0.2;
            const My_gravity = -weightGround * gravityArm;
            const My_lift_ground = F_lift * liftArm;
            My_aero += My_gravity + My_lift_ground;
        }

        // --- Main-Gear Pivot Logic (User Request) ---
        // Ensure rotation happens around main wheels, not CG.
        // Rotation Phase: Nose is light/off (Force ~ 0), Mains are heavy
        const noseGear = gears[0]; 
        const mainGears = [gears[1], gears[2]];
        
        // Threshold: Nose < 10% of weight, Mains > 50% of weight
        // Mass * 9.81 = Weight. 
        const weight = this.state.mass * 9.81;
        
        if (this.onGround && noseGear.forceMag < weight * 0.1 && (mainGears[0].forceMag + mainGears[1].forceMag) > weight * 0.5) {
             // We are rotating!
             // Calculate pivot point (midpoint of main wheels in Body Frame)
             const pivotPos = mainGears[0].pos.add(mainGears[1].pos).scale(0.5);
             
             // Calculate Vertical Velocity at Pivot Point (Body Frame Z)
             // V_pivot_z = V_cg_z + (q * pivot_x) - (p * pivot_y is 0)
             // Positive Z is down.
             // w x r = (0, q, 0) x (x, 0, 0) = (0, 0, -qx)
             // So v_z component from rotation is -q*x
             const v_pivot_z = this.state.vel.z - (this.state.rates.y * pivotPos.x);
             
             // Apply constraint force to keep pivot attached to ground (V_z ~ 0)
             // High damping gain to kill vertical velocity at pivot
             const pivotDamping = 100000; // N/(m/s)
             const F_constraint_z = -v_pivot_z * pivotDamping;
             
             // Apply this force at the Pivot Point
             // Force vector (Body Frame): (0, 0, F_constraint_z)
             // Moment = r x F = (pivot_x, pivot_y, pivot_z) x (0, 0, F)
             // My = pivot_x * 0 - 0 * F = 0 ??? No.
             // Cross Product:
             // x: y*Fz - z*Fy
             // y: z*Fx - x*Fz  <-- Pitch Moment
             // z: x*Fy - y*Fx
             
             // My_constraint = -pivotPos.x * F_constraint_z
             const My_constraint = -pivotPos.x * F_constraint_z;
             
             // Add to totals
             F_ground.z += F_constraint_z;
             M_ground.y += My_constraint;
             
             // Debug
             // if (Math.random() < 0.01) console.log(`Pivot Active: V_p=${v_pivot_z.toFixed(3)}, F=${F_constraint_z.toFixed(0)}, M=${My_constraint.toFixed(0)}`);
        }

        // --- Low Altitude Stability Assistant (User Request) ---
        // Rigidly suppress roll/yaw aero forces near ground to prevent wind drift/flipping
        const heightAGL = this.currentGroundZ - this.state.pos.z;
        const cutoffHeight = 6.1; // 20 ft
        
        if (heightAGL < cutoffHeight || this.onGround) {
            // Linear fade: 0.0 on ground -> 1.0 at 20ft
            let stabilityFactor = Math.max(0, Math.min(1, heightAGL / cutoffHeight));
            
            // If firmly on ground, allow 20% authority for crosswind correction
            if (this.onGround) stabilityFactor = 0.2;
            
            // Apply suppression to Aerodynamic Moments (Wind + Control Surfaces)
            // We keep Pitch (My) active for rotation/flare
            Mx_aero *= stabilityFactor; 
            Mz_aero *= stabilityFactor;
        }

        // --- Ground Stabilizer (Inertia-Based Damping) ---
        // Uses Inertia Tensor to provide consistent damping regardless of aircraft mass
        if (this.onGround) {
             const Ix = this.aircraft.Ix || 1000000;
             const Iy = this.aircraft.Iy || 2000000;
             const Iz = this.aircraft.Iz || 3000000;
             
             // Damping Factor (1/s) - Controls how fast rotation decays
             // INCREASED: 1.0 -> 5.0 for solid ground feel, prevents twitchiness at low speed
             const dampingFactor = 5.0; 

             M_ground.x -= this.state.rates.x * (Ix * dampingFactor);
             M_ground.y -= this.state.rates.y * (Iy * dampingFactor);
             M_ground.z -= this.state.rates.z * (Iz * dampingFactor);
             
             // Vertical Damping (Mass-based)
             // Global damper to stop bouncing/jitter at low speeds
             // INCREASED: 5.0 -> 10.0
             if (Math.abs(this.state.vel.z) < 1.0) {
                  F_ground.z -= this.state.vel.z * (this.state.mass * 10.0); 
             }
        }

        // --- Totals ---
        const totalForces = new Vector3(
            Fx_aero + Fx_thrust + gravityBody.x + F_ground.x,
            Fy_aero + gravityBody.y + F_ground.y + Fy_steering,
            Fz_aero + gravityBody.z + F_ground.z
        );

        const totalMoments = new Vector3(
            Mx_aero + M_ground.x + M_thrust_body.x,
            My_aero + M_ground.y + M_thrust_body.y,
            Mz_aero + M_ground.z + M_thrust_body.z
        );

        return { 
            forces: totalForces, 
            moments: totalMoments,
            aeroForces: new Vector3(Fx_aero, Fy_aero, Fz_aero),
            thrustForces: new Vector3(Fx_thrust, 0, 0),
            gravityForces: gravityBody,
            groundForces: F_ground,
            debug: {
                alpha, beta, q, 
                CL, CD, Cm, Cl, Cn,
                lift: F_lift, drag: F_drag, side: F_side,
                pitchMoment: My_aero,
                groundMomentY: M_ground.y,
                yawMoment: Mz_aero,
                steeringMoment: Mz_steering,
                thrustMomentYaw: M_thrust_body.z,
                thrustMomentPitch: M_thrust_body.y
            }
        };
    }

    integrate(forces, moments, dt) {
        // Linear Acceleration (Body Frame)
        // F = m * (dv/dt + w x v)
        // dv/dt = F/m - w x v
        const accel = forces.scale(1 / this.state.mass).sub(this.state.rates.cross(this.state.vel));
        
        this.state.vel = this.state.vel.add(accel.scale(dt));

        // Angular Acceleration (Body Frame)
        // M = I * dw/dt + w x (I * w)
        // dw/dt = I_inv * (M - w x (I * w))
        // Assuming diagonal Inertia Tensor for simplicity
        const Ix = this.aircraft.Ix;
        const Iy = this.aircraft.Iy;
        const Iz = this.aircraft.Iz;
        
        const p = this.state.rates.x;
        const q = this.state.rates.y;
        const r = this.state.rates.z;

        const p_dot = (moments.x - (Iz - Iy) * q * r) / Ix;
        const q_dot = (moments.y - (Ix - Iz) * p * r) / Iy;
        const r_dot = (moments.z - (Iy - Ix) * p * q) / Iz;

        this.state.rates = this.state.rates.add(new Vector3(p_dot, q_dot, r_dot).scale(dt));

        // Kinematics (Position & Orientation)
        // Position dot (Earth) = R_body_to_earth * V_body
        const v_earth = this.state.quat.rotate(this.state.vel);
        this.state.pos = this.state.pos.add(v_earth.scale(dt));
        
        // Quaternion dot = 0.5 * q * w (quaternion multiplication)
        // q_dot = 0.5 * q * qw
        
        const currentQ = this.state.quat;
        const q_deriv = new Quaternion(
            0.5 * (-currentQ.x*p - currentQ.y*q - currentQ.z*r),
            0.5 * (currentQ.w*p + currentQ.y*r - currentQ.z*q),
            0.5 * (currentQ.w*q - currentQ.x*r + currentQ.z*p),
            0.5 * (currentQ.w*r + currentQ.x*q - currentQ.y*p)
        );

        this.state.quat.w += q_deriv.w * dt;
        this.state.quat.x += q_deriv.x * dt;
        this.state.quat.y += q_deriv.y * dt;
        this.state.quat.z += q_deriv.z * dt;
        this.state.quat.normalize();

        // Hard Stop for Low Speed Ground Stability
        if (this.onGround && this.state.vel.magnitude() < 0.5 && this.controls.throttle < 0.1) {
            this.state.vel = new Vector3(0, 0, 0);
            this.state.rates = new Vector3(0, 0, 0);
        }
    }

    checkConstraints() {
        // Crash Detection
        // Altitude AGL (Above Ground Level)
        const altitude = this.currentGroundZ - this.state.pos.z; 
        
        // 1. Underground Check (Standard)
        if (this.state.pos.z > this.currentGroundZ && !this.onGround) {
            // Underground?
            // If we hit ground hard
            if (this.state.vel.z > 10) { // > 10 m/s sink rate
                 this.crashed = true;
                 this.crashReason = "Hard Landing / Crash";
            } else {
                // Reset to surface if just minor penetration (handled by ground spring mostly)
                // DISABLED HARD RESET to prevent energy injection/jitter
                // Instead, rely on the spring forces we calculated in calculateForces
                // Only clamp if deep underground to prevent falling through world
                if (this.state.pos.z > this.currentGroundZ + 2.0) {
                     this.state.pos.z = this.currentGroundZ;
                     this.state.vel.z = 0; // Stop downward momentum if hard reset
                }
            }
        }

        // 2. Obstacle Collision Check (New Safety Rules)
        // Rule: Safe at 0ft only on RUNWAY or GRASS. Unsafe (< 10ft) elsewhere.
        if (!this.crashed && altitude < 3.05) { // < 10 ft
            if (this.groundStatus.status === 'OBJECTS') {
                this.crashed = true;
                this.crashReason = "Collision with Ground Objects";
                console.log("CRASH: Collision with objects at altitude " + altitude.toFixed(2) + "m");
            }
        }
    }

    getOutputState() {
        // Convert internal physics state to the App's expected format
        const euler = this.state.quat.toEuler(); // Rads
        const altitude = -this.state.pos.z; // Altitude relative to Origin (usually Runway)
        const altitudeAMSL = altitude + (this.airportElevation || 0);
        const altitudeAGL = this.currentGroundZ - this.state.pos.z;
        
        // Vertical Speed (Earth Z dot, inverted)
        // v_earth = q * v_body * q_inv
        const v_earth = this.state.quat.rotate(this.state.vel);
        const vs = -v_earth.z;

        const airspeeds = this.calculateAirspeeds();

        const autopilotStatus = this.getAutopilotStatus ? this.getAutopilotStatus() : { engaged: false, targets: {} };
        
        const outputState = {
            position: {
                x: this.state.pos.x, // North
                y: this.state.pos.y, // East
                z: altitude,         // Altitude (Relative Up)
                latitude: this.state.geo.lat,
                longitude: this.state.geo.lon
            },
            velocity: {
                u: this.state.vel.x,
                v: this.state.vel.y,
                w: this.state.vel.z
            },
            orientation: {
                phi: euler.phi,
                theta: euler.theta,
                psi: euler.psi
            },
            angularRates: {
                p: this.state.rates.x,
                q: this.state.rates.y,
                r: this.state.rates.z
            },
            controls: {
                throttle: this.controls.throttle,
                pitch: this.controls.elevator,
                roll: this.controls.aileron,
                yaw: this.controls.rudder,
                trim: this.controls.trim
            },
            flaps: this.controls.flaps,
            gear: this.controls.gear > 0.5,
            airBrakes: this.controls.brakes, // Mapping brakes to airbrakes for now
            verticalSpeed: vs * 196.85, // m/s -> ft/min
            hasCrashed: this.crashed,
            crashWarning: this.crashReason,
            autopilot: autopilotStatus,
            autopilotTargets: autopilotStatus.targets,
            autopilotDebug: this.autopilot.debugState,
            engineParams: {
                n1: this.engines.map(e => e.state.n1),
                n2: this.engines.map(e => e.state.n2), 
                egt: this.engines.map(e => e.state.egt),
                fuelFlow: this.engines.map(e => e.state.fuelFlow)
            },
            systems: this.systems,
            fuel: this.state.fuel,
            currentWaypointIndex: this.currentWaypointIndex || 0,
            
            // Debug / Derived
            derived: {
                altitude_ft: altitudeAMSL * 3.28084, // Display AMSL
                altitude_agl_ft: altitudeAGL * 3.28084,
                terrain_elevation_ft: (this.terrainElevation || 0) * 3.28084,
                airport_elevation_ft: (this.airportElevation || 0) * 3.28084,
                airspeed: airspeeds.trueAirspeed,
                groundSpeed: airspeeds.groundSpeed,
                heading: (euler.psi * 180 / Math.PI + 360) % 360
            },
            
            debugPhysics: {
                theta: euler.theta,
                phi: euler.phi,
                psi: euler.psi,
                dynamicPressure_q: this.debugData?.q || 0,
                pitchMoment_y: this.debugData?.pitchMoment || 0,
                pitchRate_q: this.state.rates.y,
                altitude_z: altitude,
                altitude_amsl: altitudeAMSL,
                altitude_agl: altitudeAGL,
                ground_z_ned: this.currentGroundZ,
                isOnGround: this.onGround,
                lift: this.debugData?.lift || 0,
                pitchTorque: this.debugData?.pitchMoment || 0,
                yawMoment_n: this.debugData?.yawMoment || 0,
                steeringMoment_n: this.debugData?.steeringMoment || 0,
                
                // Extended Debugging
                alpha: this.debugData?.alpha || 0,
                beta: this.debugData?.beta || 0,
                Cm: this.debugData?.Cm || 0,
                CL: this.debugData?.CL || 0,
                elevator: this.controls.elevator,
                trim: this.controls.trim
            },
            runwayGeometry: this.runwayGeometry,
            groundStatus: this.groundStatus
        };

        if (this.warningSystem) {
             outputState.activeWarnings = this.warningSystem.update(outputState, 0.016);
        }

        return outputState;
    }
    
    // Interface methods required by the hook
    setFlaps(val) { this.controls.flaps = val; }
    setGear(val) { this.controls.gear = val ? 1 : 0; }
    setAirBrakes(val) { this.controls.brakes = val; }
    setTrim(val) { this.controls.trim = val; }
    setAutopilot(engaged, targets) {
        // If targets provided, set them
        if (targets) {
            this.autopilot.setTargets(targets);
        }
        // Set engagement
        if (typeof engaged === 'boolean') {
            const v_earth = this.state.quat.rotate(this.state.vel);
            const airspeeds = this.calculateAirspeeds();
            const euler = this.state.quat.toEuler();
            
            const currentState = {
                airspeed: airspeeds.indicatedAirspeed,
                verticalSpeed: -v_earth.z * 196.85,
                pitch: euler.theta,
                roll: euler.phi,
                altitude: -this.state.pos.z * 3.28084
            };
            
            this.autopilot.setEngaged(engaged, currentState);
        }
    }

    performSystemAction(system, action, value) {
        if (!this.systems[system]) {
            console.warn(`System ${system} not found`);
            return;
        }

        // Handle Toggle Logic (if value is undefined)
        const toggle = (current) => {
            if (value !== undefined) return value;
            if (typeof current === 'boolean') return !current;
            return current; // No change if not boolean and no value
        };

        // Special System Handling
        if (system === 'hydraulics') {
            if (action === 'eng1Pump') this.systems.hydraulics.sysA.engPump = toggle(this.systems.hydraulics.sysA.engPump);
            else if (action === 'elec1Pump') this.systems.hydraulics.sysA.elecPump = toggle(this.systems.hydraulics.sysA.elecPump);
            else if (action === 'eng2Pump') this.systems.hydraulics.sysB.engPump = toggle(this.systems.hydraulics.sysB.engPump);
            else if (action === 'elec2Pump') this.systems.hydraulics.sysB.elecPump = toggle(this.systems.hydraulics.sysB.elecPump);
            else console.warn(`Hydraulics action ${action} not found`);
        } 
        else if (system === 'engines') {
             // Engine Start Switches (Multi-state: OFF -> GRD -> CONT -> FLT -> OFF)
             const cycleStartSwitch = (current) => {
                 const states = ['OFF', 'GRD', 'CONT', 'FLT'];
                 const idx = states.indexOf(current);
                 return states[(idx + 1) % states.length];
             };

             if (action === 'eng1_start_toggle') this.systems.engines.eng1.startSwitch = cycleStartSwitch(this.systems.engines.eng1.startSwitch);
             else if (action === 'eng2_start_toggle') this.systems.engines.eng2.startSwitch = cycleStartSwitch(this.systems.engines.eng2.startSwitch);
             
             // Fuel Control
             else if (action === 'eng1_fuel') this.systems.engines.eng1.fuelControl = toggle(this.systems.engines.eng1.fuelControl);
             else if (action === 'eng2_fuel') this.systems.engines.eng2.fuelControl = toggle(this.systems.engines.eng2.fuelControl);
        }
        else if (system === 'fire') {
            // Fire Handles
            if (action === 'eng1_handle') this.systems.fire.eng1Handle = toggle(this.systems.fire.eng1Handle);
            else if (action === 'eng2_handle') this.systems.fire.eng2Handle = toggle(this.systems.fire.eng2Handle);
            else if (action === 'apu_handle') this.systems.fire.apuHandle = toggle(this.systems.fire.apuHandle);
            
            // Bottle Discharge (Requires handle pulled usually, but we check in logic)
            else if (action === 'eng1_bottle1') this.systems.fire.bottle1_discharge = true; // Momentary
            else if (action === 'eng1_bottle2') this.systems.fire.bottle2_discharge = true;
            // ... add more if needed
        }
        else if (system === 'transponder') {
            // Transponder has specific fields
            if (action === 'code') this.systems.transponder.code = value;
            else if (action === 'mode') this.systems.transponder.mode = value;
            else if (action === 'ident') this.systems.transponder.ident = value;
        }
        else {
            // Generic Handling
            if (this.systems[system][action] !== undefined) {
                this.systems[system][action] = toggle(this.systems[system][action]);
            } else {
                console.warn(`Action ${action} not found on system ${system}`);
            }
        }

        console.log(`Physics Service: System Action ${system}.${action} -> ${value === undefined ? 'TOGGLE' : value}`);

        // Side effects
        // const newValue = this.systems[system][action]; 
        // this.updateSystemLogic(system, action, newValue);
    }

    updateSystemLogic(system, action, value) {
        // Legacy logic removed. 
        // All system logic is now handled by OverheadLogic.js in the update loop.
    }

    /**
     * Handle Radio Tuning Event
     * Automatically sets ILS/Runway Geometry if a tower/approach frequency is tuned.
     * @param {number} frequency - Tuned frequency in MHz
     * @param {Object} flightPlan - Current flight plan object
     */
    handleRadioTuning(frequency, flightPlan) {
        if (!frequency) return;
        
        // console.log(`Physics: Radio tuned to ${frequency.toFixed(3)} MHz`);
        
        const airport = airportService.getAirportByFrequency(frequency);
        
        if (airport) {
            const airportCode = airport.iata || airport.icao;
            // console.log(`Physics: Identified airport ${airportCode} for frequency ${frequency}`);
            
            // Determine which runway to use
            let runwayName = null;
            
            // 1. Check Flight Plan (Arrival)
            if (flightPlan && flightPlan.arrival && (flightPlan.arrival.iata === airportCode || flightPlan.arrival.icao === airportCode)) {
                // If this is the arrival airport, check for selected runway
                // Note: flightPlan.arrival.runways is usually an array of available runways, not necessarily the selected one.
                // However, in this sim, usually the first one is picked or we need to check routeDetails.
                // But let's look at waypoints first as they are more editable.
            }
            
            // 2. Check Flight Plan Waypoints (Specific Waypoint Selection)
            // This is the most reliable source for user selection in F-Comp
            if (flightPlan && flightPlan.waypoints) {
                 const wp = flightPlan.waypoints.find(w => w.type === 'airport' && (w.label === airport.iata || w.label === airport.icao));
                 if (wp && wp.selectedRunway) {
                     runwayName = wp.selectedRunway;
                 }
            }
            
            // 3. Fallback to Arrival default if listed
            if (!runwayName && flightPlan && flightPlan.arrival && (flightPlan.arrival.iata === airportCode || flightPlan.arrival.icao === airportCode)) {
                 if (flightPlan.arrival.runways && flightPlan.arrival.runways.length > 0) {
                     runwayName = flightPlan.arrival.runways[0].name;
                 }
            }

            // 4. Fallback to first runway if no specific selection
            if (!runwayName) {
                if (airport.runways && airport.runways.length > 0) {
                    runwayName = airport.runways[0].name.split('/')[0].trim();
                } else if (airport.runway) {
                    runwayName = airport.runway.split('/')[0].trim();
                } else {
                    runwayName = "09"; 
                }
                console.log(`Physics: No specific runway selected for ${airportCode}, defaulting to ${runwayName}`);
            }
            
            // 5. Smart Runway Selection (Auto-Align)
            // If the selected/default runway is "behind" us (Reciprocal), swap to the other end.
            if (runwayName) {
                // Collect all available runway ends
                let options = [];
                if (airport.runways) {
                    options = airport.runways.flatMap(r => r.name.split('/').map(p => p.trim()));
                } else if (airport.runway) {
                    options = airport.runway.split('/').map(p => p.trim());
                } else {
                    options = ["09", "27"];
                }

                const aircraftHeading = this.state.heading || 0;
                
                // Parse current selection heading
                // Handle "09L" -> 09 -> 90
                const getHeading = (name) => {
                    const match = name.match(/^(\d{2})/);
                    return match ? parseInt(match[1]) * 10 : 0;
                };

                const currentRunwayH = getHeading(runwayName);
                
                // Calculate alignment
                let diff = Math.abs(aircraftHeading - currentRunwayH);
                if (diff > 180) diff = 360 - diff;
                
                // If misalignment is > 90 degrees (Reciprocal Approach), try to find a better end
                if (diff > 90) {
                    const betterOption = options.find(opt => {
                        const optH = getHeading(opt);
                        let d = Math.abs(aircraftHeading - optH);
                        if (d > 180) d = 360 - d;
                        return d <= 90; // Found one facing us
                    });
                    
                    if (betterOption) {
                        console.log(`Physics: Auto-switching runway from ${runwayName} to ${betterOption} based on approach heading (Hdg: ${aircraftHeading.toFixed(0)} vs Rwy: ${currentRunwayH})`);
                        runwayName = betterOption;
                    }
                }
            }
            
            if (runwayName) {
                const geom = airportService.getRunwayGeometry(airportCode, runwayName);
                if (geom) {
                    this.setRunwayGeometry(geom);
                    console.log(`Physics: ILS tuned to ${airportCode} RWY ${runwayName}`);
                    
                    // Optional: Engage ILS mode if close enough? No, let pilot do that.
                    // But we ensure the geometry is ready.
                }
            }
        }
    }

    setRunwayGeometry(geometry) {
        this.runwayGeometry = geometry;
        if (this.autopilot && typeof this.autopilot.setRunwayGeometry === 'function') {
            this.autopilot.setRunwayGeometry(geometry);
        }
        console.log("Physics Service: Runway Geometry Set", geometry);
    }

    updateGroundStatus() {
        if (!this.runwayGeometry) {
            this.groundStatus = { status: 'UNKNOWN', remainingLength: 0 };
            this.currentGroundZ = 0;
            return;
        }

        const { thresholdStart, heading, length, width } = this.runwayGeometry;
        const currentLat = this.state.geo.lat;
        const currentLon = this.state.geo.lon;

        // Convert Geo difference to Meters (NED approx)
        const latRad = currentLat * Math.PI / 180;
        const metersPerLat = 111132.92; // Approx
        const metersPerLon = 111412.84 * Math.cos(latRad);

        const dLat = currentLat - thresholdStart.latitude;
        const dLon = currentLon - thresholdStart.longitude;

        const x_north = dLat * metersPerLat;
        const y_east = dLon * metersPerLon;

        // Rotate into Runway Frame
        // Heading is degrees CW from North
        // We want X_runway along the runway heading
        const hRad = heading * Math.PI / 180;
        const cosH = Math.cos(hRad);
        const sinH = Math.sin(hRad);

        // Dot product with Runway Vector (cosH, sinH)
        const distAlong = x_north * cosH + y_east * sinH;
        
        // Cross product (distance from centerline)
        // Vector R = (cosH, sinH). Vector P = (x, y).
        // Cross = x*sinH - y*cosH (This gives distance to the right? or left?)
        // Let's take abs value for width check
        const distCross = Math.abs(x_north * sinH - y_east * cosH);

        // Check Zones
        let status = 'OBJECTS';
        
        // Runway Zone
        // Buffer of 0m? User said "0ft is safe for runway/grass".
        if (distAlong >= 0 && distAlong <= length && distCross <= width / 2) {
            status = 'RUNWAY';
        }
        // Grass Zone (Safe Area)
        // Arbitrary: -500m to Length+500m, Width * 4
        else if (distAlong >= -500 && distAlong <= length + 500 && distCross <= width * 2) {
            status = 'GRASS';
        }

        // Remaining Length
        // If before start, full length. If past end, 0.
        let remaining = 0;
        if (distAlong < 0) remaining = length;
        else if (distAlong > length) remaining = 0;
        else remaining = length - distAlong;

        this.groundStatus = {
            status: status,
            remainingLength: remaining
        };

        // Update Ground Height (NED Z)
        // If on Runway, assume Airport Level (0 relative Z)
        // If Off Runway, use Terrain Elevation
        let groundHeightAMSL = this.airportElevation;
        // User request: "for runway and airport-grass, lets first use the same height with the airport."
        if (status !== 'RUNWAY' && status !== 'GRASS') {
             // Use terrain if available (non-null), otherwise stick to airport elevation (safety fallback)
             if (this.terrainElevation !== null) {
                 groundHeightAMSL = this.terrainElevation;
             }
        }
        
        // Calculate Relative Ground Z (NED)
        // Z is Down. Positive Height = Negative Z.
        // Origin is at Airport Elevation.
        // Ground Z = -(GroundAMSL - AirportAMSL)
        this.currentGroundZ = -(groundHeightAMSL - this.airportElevation);
    }

    applyRunwayStabilizer() {
        if (this.difficulty === 'devil') return null;
        if (!this.onGround || this.groundStatus.status !== 'RUNWAY') return null;
        if (!this.runwayGeometry || !this.runwayGeometry.thresholdStart) return null;

        const geom = this.runwayGeometry;
        const lat = this.state.geo.lat;
        const lon = this.state.geo.lon;
        const lat0 = geom.thresholdStart.latitude;
        const lon0 = geom.thresholdStart.longitude;
        
        const latRad = lat0 * Math.PI / 180;
        const metersPerLat = 111132.92; 
        const metersPerLon = 111412.84 * Math.cos(latRad);
        
        const dx = (lat - lat0) * metersPerLat; 
        const dy = (lon - lon0) * metersPerLon; 
        
        const headingRad = geom.heading * Math.PI / 180;
        const ux = Math.cos(headingRad);
        const uy = Math.sin(headingRad);
        
        const distAlong = dx * ux + dy * uy;
        
        // XTE: Positive = Right of track
        const XTE = dy * ux - dx * uy;

        const euler = this.state.quat.toEuler();
        const currentPsi = euler.psi; 
        let headingDiff = currentPsi - headingRad;
        while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
        while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
        
        if (this.difficulty === 'rookie') {
            // ROOKIE: Rail Mode - Force Centerline & Heading
            const newDx = distAlong * ux;
            const newDy = distAlong * uy;
            
            const newLat = lat0 + newDx / metersPerLat;
            const newLon = lon0 + newDy / metersPerLon;
            
            this.state.geo.lat = newLat;
            this.state.geo.lon = newLon;
            
            // Force Heading
            this.state.quat = Quaternion.fromEuler(euler.phi, euler.theta, headingRad);
            
            // Kill lateral velocity & yaw rate
            this.state.vel.y = 0; 
            this.state.rates.z = 0;
            
            return null;
        } else {
            // OTHER: Gentle Pull
            const sideVel = this.state.vel.y; 
            const k_lat = 5000; 
            const c_lat = 10000; 
            
            // Force in Body Y (Left if XTE > 0)
            let F_y = -XTE * k_lat - sideVel * c_lat;
            
            const maxF = this.state.mass * 2.0; 
            if (F_y > maxF) F_y = maxF;
            if (F_y < -maxF) F_y = -maxF;
            
            const k_yaw = 500000; 
            const c_yaw = 500000;
            
            let M_z = -headingDiff * k_yaw - this.state.rates.z * c_yaw;
            
            const maxM = 5000000;
            if (M_z > maxM) M_z = maxM;
            if (M_z < -maxM) M_z = -maxM;
            
            return { Fy: F_y, Mz: M_z };
        }
    }

    /**
     * Set systems to Cold & Dark state
     */
    setColdStart() {
        console.log("❄️ Physics Service: Applying Cold & Dark Configuration");
        
        // Electrical
        this.systems.electrical = {
            ...this.systems.electrical,
            battery: false,
            stbyPower: false,
            gen1: false,
            gen2: false,
            apuGen: false,
            busTie: true,
            dcVolts: 0,
            acVolts: 0,
            acFreq: 0,
            acAmps: 0,
            sourceOff1: true,
            sourceOff2: true,
            apuGenOff: true
        };

        // Fuel (Pumps Off)
        this.systems.fuel = {
            ...this.systems.fuel,
            leftPumps: false,
            rightPumps: false,
            centerPumps: false,
            crossfeed: false,
            pressL: 0,
            pressR: 0,
            pressC: 0
        };

        // APU Off
        this.systems.apu = {
            ...this.systems.apu,
            master: false,
            start: false,
            running: false,
            starting: false,
            bleed: false,
            egt: 0,
            n2: 0,
            state: 'OFF'
        };

        // Hydraulics Off
        this.systems.hydraulics.sysA.engPump = false; 
        this.systems.hydraulics.sysA.elecPump = false;
        this.systems.hydraulics.sysB.engPump = false;
        this.systems.hydraulics.sysB.elecPump = false;
        this.systems.hydraulics.sysA.pressure = 0;
        this.systems.hydraulics.sysB.pressure = 0;

        // Pressurization / Packs Off
        this.systems.pressurization = {
            ...this.systems.pressurization,
            packL: false,
            packR: false,
            bleed1: false,
            bleed2: false,
            isolationValve: true,
            ductPressL: 0,
            ductPressR: 0
        };

        // Lighting Off
        this.systems.lighting = {
            landing: false,
            taxi: false,
            nav: false,
            beacon: false,
            strobe: false,
            logo: false,
            wing: false,
            powered: false
        };
        
        // Reset Engines (Systems & Physics)
        if (this.systems.engines) {
            this.systems.engines.eng1.startSwitch = 'OFF';
            this.systems.engines.eng1.fuelControl = false;
            this.systems.engines.eng1.n2 = 0;
            this.systems.engines.eng1.egt = 20;
            
            this.systems.engines.eng2.startSwitch = 'OFF';
            this.systems.engines.eng2.fuelControl = false;
            this.systems.engines.eng2.n2 = 0;
            this.systems.engines.eng2.egt = 20;
        }

        // Reset Engines (Physics Models)
        this.engines.forEach(e => {
            e.state.n1 = 0;
            e.state.n2 = 0;
            e.state.egt = 20; // Cold EGT
            e.state.fuelFlow = 0;
            e.state.oilPressure = 0;
            e.state.running = false;
        });
    }

    /**
     * Set initial flight conditions
     */
    setInitialConditions(conditions) {
        if (!conditions) return;

        // Position
        if (conditions.latitude !== undefined) this.state.geo.lat = conditions.latitude;
        if (conditions.longitude !== undefined) this.state.geo.lon = conditions.longitude;
        
        // Orientation (psi = yaw in radians)
        if (conditions.orientation && conditions.orientation.psi !== undefined) {
            this.state.quat = Quaternion.fromEuler(0, 0, conditions.orientation.psi);
        }

        // Difficulty
        if (conditions.difficulty) {
            this.difficulty = conditions.difficulty;
        } else {
            this.difficulty = 'rookie'; // Default
        }

        // Apply Cold Start if Professional or higher
        if (['pro', 'professional', 'survival', 'devil'].includes(this.difficulty)) {
            this.setColdStart();
        } else if (conditions.coldStart) {
            // Explicit override
            this.setColdStart();
        }

        // Flight Plan
        if (conditions.flightPlan) {
            this.flightPlan = conditions.flightPlan;
            this.currentWaypointIndex = 0;
        }

        // Altitude
        if (conditions.position && conditions.position.z !== undefined) {
            this.state.pos.z = -conditions.position.z; // NED uses Z-down
        }

        // Controls
        if (conditions.throttle !== undefined) {
            this.controls.throttle = conditions.throttle;
            // Apply to engines as well
            if (this.controls.engineThrottles) {
                this.controls.engineThrottles.fill(conditions.throttle);
            }
            this.engines.forEach(e => e.setThrottle(conditions.throttle));
        }
        if (conditions.brakes !== undefined) {
            this.controls.brakes = conditions.brakes;
        }
        if (conditions.gear !== undefined) {
            this.controls.gear = conditions.gear ? 1 : 0;
        }

        // Reset velocities and rates for initial state
        this.state.vel = new Vector3(0, 0, 0);
        this.state.rates = new Vector3(0, 0, 0);
        
        // Update autopilot targets if available
        if (conditions.orientation && conditions.orientation.psi !== undefined) {
            const headingDeg = (conditions.orientation.psi * 180 / Math.PI + 360) % 360;
            this.autopilot.setTargets({ heading: headingDeg === 0 ? 360 : headingDeg });
        }
        
        // Failure System Config
        if (this.failureSystem) {
            // Re-initialize failure system with new config if provided
            const failureConfig = {};
            if (conditions.difficulty) failureConfig.difficulty = conditions.difficulty;
            
            // Only re-create if we have new config, otherwise just reset
            if (conditions.difficulty) {
                this.failureSystem = new FailureHandler(failureConfig);
            } else {
                this.failureSystem.reset();
            }
        }
    }
    
    updateAutopilotTargets(targets) {
        this.autopilot.setTargets(targets);
    }
    
    updateFlightPlan(newFlightPlan) {
        console.log('🔄 Updating Flight Plan:', newFlightPlan);
        
        let newWaypoints = [];
        // Extract waypoints array to ensure consistency
        if (Array.isArray(newFlightPlan)) {
            newWaypoints = newFlightPlan;
        } else if (newFlightPlan && Array.isArray(newFlightPlan.waypoints)) {
            newWaypoints = newFlightPlan.waypoints;
        } else {
            console.warn('⚠️ Invalid flight plan format provided to physics service');
            this.flightPlan = [];
            return;
        }
        
        // Smart Index Preservation: If length matches, keep index. 
        // This allows property updates (like 'isHold') without resetting progress.
        const preserveIndex = (this.flightPlan && this.flightPlan.length === newWaypoints.length);
        const oldIndex = this.currentWaypointIndex;

        this.flightPlan = newWaypoints;
        
        if (preserveIndex) {
            this.currentWaypointIndex = oldIndex;
        } else {
            // Reset index to start from the beginning of the new plan
            this.currentWaypointIndex = 0;
        }
        
        // Optionally reset index if it was invalid, or keep it if within bounds
        if (this.currentWaypointIndex >= this.flightPlan.length) {
            this.currentWaypointIndex = Math.max(0, this.flightPlan.length - 1);
        }
        
        // If we want to "Direct To", the UI should have already set the waypoints list appropriately.
        // If the new plan has waypoints, ensure we are targeting something valid.
    }

    loadFlightState(data) {
        if (!data) return;
        
        // console.log('🔄 Loading flight state...', data);

        // 1. Restore Physics State
        if (data.physicsState) {
            const ps = data.physicsState;
            
            // Position
            if (ps.position) {
                // Restore Geo Position
                if (ps.position.latitude !== undefined) this.state.geo.lat = ps.position.latitude;
                if (ps.position.longitude !== undefined) this.state.geo.lon = ps.position.longitude;
                
                // Restore Local Position (NED)
                // Note: ps.position.z is Altitude (Positive Up), but state.pos.z is NED (Positive Down)
                // If saved z was altitude, we negate it.
                // We check if z seems to be altitude (>0 usually)
                this.state.pos = new Vector3(
                    ps.position.x, 
                    ps.position.y, 
                    -Math.abs(ps.position.z) // Ensure Z is negative (Up in NED)
                );
            }
            
            // Velocity
            if (ps.velocity) {
                // Check if saved as u,v,w (OutputState format) or x,y,z (Direct serialization)
                if (ps.velocity.u !== undefined) {
                    this.state.vel = new Vector3(ps.velocity.u, ps.velocity.v, ps.velocity.w);
                } else {
                    this.state.vel = new Vector3(ps.velocity.x, ps.velocity.y, ps.velocity.z);
                }
            }
            
            // Orientation (Quaternion)
            if (ps.orientation) {
                // Check if we have quaternion components directly
                if (ps.orientation.w !== undefined) {
                    this.state.quat = new Quaternion(ps.orientation.w, ps.orientation.x, ps.orientation.y, ps.orientation.z);
                } 
                // Fallback to Euler if only theta/phi/psi available (from view model)
                else if (ps.orientation.theta !== undefined) {
                     this.state.quat = Quaternion.fromEuler(ps.orientation.phi, ps.orientation.theta, ps.orientation.psi);
                }
            }
            
            // Angular Rates
            if (ps.angularRates) {
                this.state.rates = new Vector3(ps.angularRates.p, ps.angularRates.q, ps.angularRates.r);
            } else if (ps.rates) {
                this.state.rates = new Vector3(ps.rates.x, ps.rates.y, ps.rates.z);
            } else {
                this.state.rates = new Vector3(0, 0, 0);
            }

            // Controls
            if (ps.controls) {
                this.controls = { ...this.controls, ...ps.controls };
                
                // Ensure engineThrottles array exists and is populated
                if (!this.controls.engineThrottles || this.controls.engineThrottles.length !== this.aircraft.engineCount) {
                     this.controls.engineThrottles = Array(this.aircraft.engineCount).fill(this.controls.throttle);
                     // If we have legacy throttles in ps.controls, try to recover
                     if (ps.controls.throttles && Array.isArray(ps.controls.throttles)) {
                         ps.controls.throttles.forEach((val, i) => {
                             if (i < this.controls.engineThrottles.length) this.controls.engineThrottles[i] = val;
                         });
                     }
                }
            }

            // Engines (Restore Internal State)
            if (ps.engineParams) {
                this.engines.forEach((e, i) => {
                    if (ps.engineParams.n1 && ps.engineParams.n1[i] !== undefined) e.state.n1 = ps.engineParams.n1[i];
                    if (ps.engineParams.n2 && ps.engineParams.n2[i] !== undefined) e.state.n2 = ps.engineParams.n2[i];
                    if (ps.engineParams.egt && ps.engineParams.egt[i] !== undefined) e.state.egt = ps.engineParams.egt[i];
                    if (ps.engineParams.fuelFlow && ps.engineParams.fuelFlow[i] !== undefined) e.state.fuelFlow = ps.engineParams.fuelFlow[i];
                    
                    // Ensure engine running state matches N2
                    e.running = e.state.n2 > 20;
                    
                    // Restore internal throttle command if available, otherwise sync from controls
                    if (this.controls.engineThrottles[i] !== undefined) {
                        e.setThrottle(this.controls.engineThrottles[i]);
                    }
                });
                
                // Set commanded throttle (Legacy Global Fallback removed, relying on loop above)
            }
            
            // Autopilot
            if (ps.autopilot) {
                this.autopilot.setEngaged(ps.autopilot.engaged);
                if (ps.autopilot.mode) this.autopilot.setTargets({ mode: ps.autopilot.mode });
                // If targets are nested in ps.autopilot.targets or directly in ps.autopilotTargets
                const targets = ps.autopilot.targets || data.physicsState.autopilotTargets;
                if (targets) this.autopilot.setTargets(targets);
                
                // Restore PID states if available (ps.autopilotDebug might contain them?)
                // For now, resetting is safer than restoring partial state
                // this.autopilot.reset(); // Maybe too aggressive?
            }
            
            // Systems
            if (ps.systems) {
                this.systems = { ...this.systems, ...ps.systems };
            }
            
            // Fuel
            if (data.flightData && data.flightData.fuel !== undefined) {
                this.state.fuel = data.flightData.fuel;
            }
        }
        // Fallback: Restore from Flight Data (View Model)
        else if (data.flightData) {
            const fd = data.flightData;
            
            if (fd.position) {
                this.state.pos = new Vector3(fd.position.x, fd.position.y, fd.position.z);
            }
            
            // Estimate orientation from Euler
            const pitch = (fd.pitch || 0) * Math.PI / 180;
            const roll = (fd.roll || 0) * Math.PI / 180;
            const heading = (fd.heading || 0) * Math.PI / 180;
            this.state.quat = Quaternion.fromEuler(roll, pitch, heading);
            
            // Estimate velocity from airspeed/heading
            // This is lossy but better than nothing
            const tasMs = (fd.airspeed || 0) * 0.514444;
            // Assuming level flight aligned with heading
            const vx = tasMs * Math.cos(pitch) * Math.cos(heading);
            const vy = tasMs * Math.cos(pitch) * Math.sin(heading);
            const vz = -tasMs * Math.sin(pitch); // Approximate
            // We need velocity in Body frame or NED? 
            // state.vel is Body Frame (FRD).
            // V_body = [TAS, 0, 0] approx if no slip/AoA
            this.state.vel = new Vector3(tasMs, 0, 0);
            
            this.state.rates = new Vector3(0, 0, 0);
        }

        // 2. Restore Flight Plan
        if (data.flightPlan) {
            this.flightPlan = data.flightPlan;
            // Try to find nearest waypoint index?
            // For now reset to 0 or use saved index if available
            this.currentWaypointIndex = data.flightData?.currentWaypointIndex || 0;
        }

        // 3. Reset Crash State & Re-validate Ground Status
        this.crashed = false;
        this.crashReason = "";
        this.time = data.flightData?.frame ? (data.flightData.frame * 0.016) : 0; // Approximate time
        
        // Ensure altitude is safe if we just loaded
        // If we are "on ground", ensure we aren't underground
        // groundStatus logic will run next frame, but we need to prevent immediate crash
        
        // Recalculate derived state to ensure consistency
        if (this.state.pos.z > 0) {
            // NED z is positive down. So positive Z means underground (if ground is 0).
            // But we treat ground as negative usually? 
            // Wait, standard NED: Z is Down. Altitude is -Z.
            // If Altitude is positive, Z is negative.
            // If Z is positive, we are below sea level (or whatever 0 reference is).
            // Ground Z is stored in currentGroundZ (NED).
            // If Z > currentGroundZ, we are underground.
        }

        // Force ground status update if we have runway geometry
        // Note: We might be restoring to a point where we don't have the geometry loaded yet?
        // Ideally we should save runwayGeometry too.
        if (data.runwayGeometry) {
            this.runwayGeometry = data.runwayGeometry;
        }
        
        // Reset ground status to avoid immediate "unsafe altitude" trigger
        // We'll let the next update loop figure out the real status
        // But if we are low, we must ensure we don't crash instantly.
        const altitude = -this.state.pos.z;
        if (altitude < 100) { // If low altitude
             // Check if we assume on ground?
             // If velocity is low, assume on ground
             if (this.state.vel.magnitude() < 40) {
                 this.onGround = true;
             } else {
                 this.onGround = false;
             }
        } else {
            this.onGround = false;
        }
        
        // Explicitly clear ground status to force re-evaluation without carrying over 'unsafe' state
        this.groundStatus = { status: 'UNKNOWN', remainingLength: 0 };
        
        console.log('✅ Flight state loaded. Crash state reset.');
    }

    getFlapIncrements() {
        const profile = this.aircraft.flapProfile;
        if (!profile || !profile.positions || profile.positions.length === 0) {
            return { cl: 0, cd: 0 };
        }

        let flapInput = this.controls.flaps; // Interpreted as Index (0 to MaxIndex)
        const positions = profile.positions;
        const numPositions = positions.length;
        const maxIndex = numPositions - 1;

        // Clamp input to valid range
        if (flapInput < 0) flapInput = 0;
        if (flapInput > maxIndex) flapInput = maxIndex;

        // Linear interpolation between profile positions
        const idx1 = Math.floor(flapInput);
        const idx2 = Math.min(idx1 + 1, maxIndex);
        const frac = flapInput - idx1;

        const pos1 = positions[idx1];
        const pos2 = positions[idx2];

        // Safely access increments
        const cl1 = pos1.clIncrement || 0;
        const cd1 = pos1.cdIncrement || 0;
        const cl2 = pos2.clIncrement || 0;
        const cd2 = pos2.cdIncrement || 0;

        const cl = cl1 + (cl2 - cl1) * frac;
        const cd = cd1 + (cd2 - cd1) * frac;

        return { cl, cd };
    }

    getAirbrakeIncrements() {
        const profile = this.aircraft.airbrakeProfile;
        
        // Handle legacy profile structure (fallback)
        if (profile && profile.airPosition && !profile.positions) {
            const brakeInput = this.controls.brakes;
            
            if (profile.hasTwoTier) {
                // Map indices to legacy behavior roughly
                // 0=RET, 1=ARM(0%), 2=FLT(Air), 3=GND(Ground)
                if (brakeInput <= 1) return { cl: 0, cd: 0 };
                if (brakeInput === 2) {
                     return { 
                        cl: (profile.airPosition.liftDecrement || 0), 
                        cd: (profile.airPosition.dragIncrement || 0) 
                    };
                }
                if (brakeInput >= 3) {
                     return { 
                        cl: (profile.groundPosition.liftDecrement || 0), 
                        cd: (profile.groundPosition.dragIncrement || 0) 
                    };
                }
                return { cl: 0, cd: 0 };
            } else {
                 // Simple 0-1 extension
                 if (this.onGround) {
                    return { 
                        cl: (profile.groundPosition.liftDecrement || 0) * brakeInput, 
                        cd: (profile.groundPosition.dragIncrement || 0) * brakeInput 
                    };
                } else {
                    return { 
                        cl: (profile.airPosition.liftDecrement || 0) * brakeInput, 
                        cd: (profile.airPosition.dragIncrement || 0) * brakeInput 
                    };
                }
            }
        }

        if (!profile || !profile.positions || profile.positions.length === 0) {
            return { cl: 0, cd: 0 };
        }

        let brakeInput = this.controls.brakes; // Interpreted as Index (0 to MaxIndex)
        const positions = profile.positions;
        const numPositions = positions.length;
        const maxIndex = numPositions - 1;

        // Clamp input
        if (brakeInput < 0) brakeInput = 0;
        if (brakeInput > maxIndex) brakeInput = maxIndex;

        // Linear interpolation
        const idx1 = Math.floor(brakeInput);
        const idx2 = Math.min(idx1 + 1, maxIndex);
        const frac = brakeInput - idx1;
        
        const pos1 = positions[idx1];
        const pos2 = positions[idx2];

        const cl1 = pos1.liftDecrement || 0;
        const cd1 = pos1.dragIncrement || 0;
        const cl2 = pos2.liftDecrement || 0;
        const cd2 = pos2.dragIncrement || 0;

        const cl = cl1 + (cl2 - cl1) * frac;
        const cd = cd1 + (cd2 - cd1) * frac;

        return { cl, cd };
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        if (this.failureSystem) {
            this.failureSystem.difficulty = difficulty;
            this.failureSystem.settings = this.failureSystem.getDifficultySettings(difficulty);
        }
    }

    setAutopilotMode(mode) {
        this.autopilot.setTargets({ mode: mode });
    }

    getAutopilotStatus() {
        return {
            engaged: this.autopilot.engaged,
            mode: this.autopilot.mode,
            targets: this.autopilot.targets
        };
    }

    setEngineThrottle(index, value) {
        if (this.controls.engineThrottles && index >= 0 && index < this.controls.engineThrottles.length) {
            this.controls.engineThrottles[index] = value;
            // Also update the engine directly if needed, but updateEngines loop handles it
            if (this.engines[index]) {
                this.engines[index].setThrottle(value);
            }
        }
    }
    reset() {
        const gearHeight = this.aircraft.gearHeight || 2;
        const initialZ = -(this.airportElevation + gearHeight);
        this.state.pos = new Vector3(0, 0, initialZ);
        this.currentGroundZ = -this.airportElevation; // Reset ground level to airport level
        
        this.state.vel = new Vector3(0, 0, 0);
        this.state.rates = new Vector3(0, 0, 0);
        this.state.quat = new Quaternion();
        this.crashed = false;
        this.currentWaypointIndex = 0;
        
        // Reset Controls
        this.controls.throttle = 0;
        this.controls.engineThrottles.fill(0);
        this.controls.aileron = 0;
        this.controls.elevator = 0;
        this.controls.rudder = 0;
        this.controls.brakes = 0;

        // Reset Engines
        this.engines.forEach(e => { 
            e.state.n1 = 0; 
            e.state.n2 = 0;
            e.state.thrust = 0; 
            e.setThrottle(0);
            e.setFailed(false); // Reset failure state
        });

        // Reset Sensors
        this.sensors = { pitotBlocked: false };

        // Reset Critical System States (Flags that might be stuck)
        if (this.systems) {
            this.initializeSystems(this.difficulty);
        }

        // Reset Failure System
        if (this.failureSystem) {
            this.failureSystem.reset();
        }
    }
    resetFailureState() {
        this.controlLag = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 };
        this.controlEffectiveness = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 };
        this.vibrationLevel = 0;
        // Note: We do NOT reset engine failure flags or system states (pressure, generators) here.
        // Those are persistent state changes managed by the failure instances or system logic.
        // We only reset the *modifiers* that are re-applied every frame by active failures.
    }

    calculateAirspeeds() {
        const wind = this.environment?.wind || new Vector3(0, 0, 0);
        
        // Transform Wind to Body Frame
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(wind);
        
        // V_air = V_ground - V_wind
        const V_air_body = this.state.vel.sub(V_wind_body);
        
        const tas = V_air_body.magnitude() * 1.94384; // knots
        
        // Simple IAS approx
        const rho = this.calculateEnvironment(this.state.pos.z).density;
        const ias = tas * Math.sqrt(rho / 1.225);
        
        const gs = this.state.vel.magnitude() * 1.94384; // Ground Speed in knots

        return { trueAirspeed: tas, indicatedAirspeed: ias, groundSpeed: gs };
    }
}

export default RealisticFlightPhysicsService;

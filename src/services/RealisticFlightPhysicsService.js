
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
    constructor(aircraftData, initialLat = 0, initialLon = 0) {
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
            fuel: (this.aircraft.fuelWeight ?? this.aircraft.maxFuelCapacity ?? 10000)
        };

        // Control State
        this.controls = {
            throttle: 0,
            aileron: 0, // -1 to 1 (Roll)
            elevator: 0, // -1 to 1 (Pitch)
            rudder: 0,   // -1 to 1 (Yaw)
            flaps: 0,    // 0 to 1
            gear: 1,     // 0 (up) to 1 (down)
            brakes: 0,
            trim: 0      // Pitch trim
        };

        // Engine State
        this.engines = Array(this.aircraft.engineCount).fill(0).map(() => new EnginePhysicsService({
            maxThrust: this.aircraft.maxThrust,
            specificFuelConsumption: this.aircraft.specificFuelConsumption
        }));

        // Simulation Metadata
        this.crashed = false;
        this.onGround = true;
        this.crashReason = "";
        this.time = 0;

        // Autopilot
        this.autopilot = new RealisticAutopilotService();
    }

    validateAndParseAircraft(data) {
        // Ensure defaults for critical physics parameters
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
            wingArea: data.wingArea || 125,
            wingSpan: data.wingSpan || 35,
            chord: (data.wingArea || 125) / (data.wingSpan || 35),
            maxThrust: data.maxThrustPerEngine || 120000,
            
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
            heading: currentHeading
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
                
                // Switch to next waypoint if within 2km
                if (dist < 2000) {
                    this.currentWaypointIndex++;
                    console.log(`📍 Reached waypoint ${nextWaypoint.label || this.currentWaypointIndex - 1}. Sequencing to index ${this.currentWaypointIndex}`);
                }

                // If LNAV is engaged, update target heading to waypoint bearing
                if (this.autopilot.mode === 'LNAV' && this.currentWaypointIndex < this.flightPlan.length) {
                    const targetWP = this.flightPlan[this.currentWaypointIndex];
                    const bearing = this._calculateBearing(this.state.geo.lat, this.state.geo.lon, targetWP.latitude, targetWP.longitude);
                    this.autopilot.setTargets({ heading: bearing });
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
        
        // Throttle
        this.controls.throttle += (input.throttle - this.controls.throttle) * rate;
        
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

    calculateEnvironment(z_down) {
        // Altitude = -z_down
        const h = -z_down; 
        
        // Simple ISA model
        let temp = this.CONSTANTS.SEA_LEVEL_TEMP + (this.CONSTANTS.TEMP_LAPSE_RATE * h);
        if (temp < 216.65) temp = 216.65; // Tropopause floor

        const pressure = this.CONSTANTS.SEA_LEVEL_PRESSURE * Math.pow(temp / this.CONSTANTS.SEA_LEVEL_TEMP, -this.CONSTANTS.G / (this.CONSTANTS.TEMP_LAPSE_RATE * this.CONSTANTS.R_GAS));
        const density = pressure / (this.CONSTANTS.R_GAS * temp);
        const speedOfSound = Math.sqrt(this.CONSTANTS.GAMMA * this.CONSTANTS.R_GAS * temp);

        return { density, pressure, temp, speedOfSound };
    }

    updateEngines(env, dt) {
        // Mach number approx
        const speedOfSound = env.speedOfSound || 340;
        const mach = this.state.vel.magnitude() / speedOfSound;
        const airDensityRatio = env.density / this.CONSTANTS.SEA_LEVEL_DENSITY;

        this.engines.forEach((engine) => {
             // We can allow differential throttle if input structure supports it, 
             // for now use global throttle for all
             engine.update(dt, this.controls.throttle, mach, -this.state.pos.z, airDensityRatio, env.temp);
             
             // Consume Fuel
             // fuelFlow is kg/s
             const fuelBurned = engine.state.fuelFlow * dt;
             this.state.fuel -= fuelBurned;
        });
        
        if (this.state.fuel < 0) {
            this.state.fuel = 0;
            this.engines.forEach(e => e.setFailed(true));
        }
    }

    calculateAerodynamicsAndGround(env) {
        // --- Velocity ---
        const V_body = this.state.vel; // u, v, w
        const V_airspeed = V_body.magnitude();
        
        // Dynamic Pressure (q)
        const q = 0.5 * env.density * V_airspeed * V_airspeed;

        // Angle of Attack (Alpha) & Sideslip (Beta)
        // alpha = atan2(w, u)
        // beta = asin(v / V)
        let alpha = 0;
        let beta = 0;
        if (V_airspeed > 0.1) {
            alpha = Math.atan2(V_body.z, V_body.x);
            beta = Math.asin(Math.max(-1, Math.min(1, V_body.y / V_airspeed)));
        }

        // --- Aerodynamic Coefficients ---
        
        // Flap Increments from Profile
        const flapIncrements = this.getFlapIncrements();
        const CL_flaps = flapIncrements.cl;
        const CD_flaps_base = flapIncrements.cd;

        // Airbrake Increments
        const airbrakeIncrements = this.getAirbrakeIncrements();
        const CL_brakes = airbrakeIncrements.cl;
        const CD_brakes = airbrakeIncrements.cd;

        // Lift (CL)
        // CL = CL0 + CLa * alpha + CL_flaps + CL_elevator + CL_brakes
        const CL_stall_drop = Math.abs(alpha) > 0.3 ? -0.5 * Math.sin((Math.abs(alpha) - 0.3) * 5) : 0; // Simple stall drop
        let CL = this.aircraft.CL0 + this.aircraft.CLa * alpha + CL_flaps + CL_brakes + (this.controls.elevator * 0.3) + CL_stall_drop;

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
        
        // Clamp CL for induced drag to prevent runaway drag at high angles (stall region)
        const CL_induced_calc = Math.min(Math.abs(CL), 1.35); // Cap effective CL for induced drag
        const CD_induced = this.aircraft.K * CL_induced_calc * CL_induced_calc * groundEffectFactor;
        
        const CD = this.aircraft.CD0 + CD_induced + CD_flaps + CD_gear + CD_brakes;

        // Side Force (CY)
        // CY = CYb * beta + CYdr * rudder
        const CY = -0.5 * beta + (this.controls.rudder * 0.2);

        // Moments
        // Pitch (Cm)
        // Cm = Cm0 + Cma * alpha + Cmq * (q * c / 2V) + Cde * elevator
        const c = this.aircraft.chord;
        const b = this.aircraft.wingSpan;
        const pitch_damping = this.aircraft.Cmq * (this.state.rates.y * c) / (2 * (V_airspeed + 0.1));
        
        // Flaps Pitch Moment (Cm_flaps)
        // Flaps typically cause a nose-down moment (negative Cm) due to aft shift of CP,
        // though downwash on tail can counteract. User requested "slight downward pitch torque".
        const Cm_flaps = this.controls.flaps * -0.01;
        
        const Cm = this.aircraft.Cm0 + (this.aircraft.Cma * alpha) + pitch_damping + (this.aircraft.Cde * (this.controls.elevator + this.controls.trim)) + Cm_flaps;

        // Roll (Cl)
        // Cl = Clb * beta + Clp * (p * b / 2V) + Cda * aileron
        const roll_damping = this.aircraft.Clp * (this.state.rates.x * b) / (2 * (V_airspeed + 0.1));
        const Cl = (this.aircraft.Clb * beta) + roll_damping + (this.aircraft.Cda * this.controls.aileron);

        // Yaw (Cn)
        // Cn = Cnb * beta + Cnr * (r * b / 2V) + Cdr * rudder
        const yaw_damping = this.aircraft.Cnr * (this.state.rates.z * b) / (2 * (V_airspeed + 0.1));
        const Cn = (this.aircraft.Cnb * beta) + yaw_damping + (this.aircraft.Cdr * this.controls.rudder);

        // Dimensional Forces (Wind Axes -> Body Axes)
        // Lift acts perpendicular to relative wind, Drag parallel.
        // We approximate transformation for small beta:
        // F_lift = q * S * CL
        // F_drag = q * S * CD
        // F_side = q * S * CY
        
        const S = this.aircraft.wingArea;
        const F_lift = q * S * CL;
        const F_drag = q * S * CD;
        const F_side = q * S * CY;

        // Transform Wind to Body (Rotation by -alpha around Y)
        // Fx = -Drag * cos(a) + Lift * sin(a)
        // Fz = -Drag * sin(a) - Lift * cos(a)
        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);
        
        const Fx_aero = -F_drag * cosA + F_lift * sinA;
        const Fy_aero = F_side;
        const Fz_aero = -F_drag * sinA - F_lift * cosA;

        // Dimensional Moments
        const Mx_aero = q * S * b * Cl;
        const My_aero = q * S * c * Cm;
        const Mz_aero = q * S * b * Cn;

        // --- Thrust ---
        const totalThrust = this.engines.reduce((acc, e) => acc + e.state.thrust, 0);
        const Fx_thrust = totalThrust; // Assumes thrust aligns with body X
        
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
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const gravityBody = q_inv.rotate(gravityEarth);

        // --- Ground Interaction (Multi-Point Gear) ---
        // Simulating 3-point landing gear for realistic ground handling and rotation
        let F_ground = new Vector3(0, 0, 0);
        let M_ground = new Vector3(0, 0, 0);
        
        // Gear Definitions (Position relative to CG in Body Frame)
        // x: Forward, y: Right, z: Down (CG at 0,0,0)
        const gears = [
            { name: 'nose', pos: new Vector3(14.0, 0, 3.0), k: 180000, c: 20000 },  // Nose Gear
            { name: 'mainL', pos: new Vector3(-2.0, -3.5, 3.0), k: 500000, c: 50000 }, // Main Left
            { name: 'mainR', pos: new Vector3(-2.0, 3.5, 3.0), k: 500000, c: 50000 }  // Main Right
        ];
        
        let onGroundAny = false;

        gears.forEach(gear => {
            // 1. Calculate Gear Position in Earth Frame (Z-Down)
            const P_body = gear.pos;
            const P_offset_earth = this.state.quat.rotate(P_body);
            const P_world_z = this.state.pos.z + P_offset_earth.z;
            
            if (P_world_z > 0) {
                onGroundAny = true;
                const depth = P_world_z;
                
                // 2. Velocity at Contact Point (Body Frame -> Earth Frame Z)
                const V_point_body = this.state.vel.add(this.state.rates.cross(P_body));
                const V_point_earth = this.state.quat.rotate(V_point_body);
                const v_vertical = V_point_earth.z; // Positive = Moving Down
                
                // 3. Normal Force (Spring + Damper)
                let F_n = -(gear.k * depth + gear.c * v_vertical);
                if (F_n > 0) F_n = 0;
                
                // 4. Friction (Horizontal Plane)
                const vel_h = new Vector3(V_point_earth.x, V_point_earth.y, 0);
                const speed_h = vel_h.magnitude();
                let F_f_earth = new Vector3(0, 0, 0);
                
                if (speed_h > 0.01) {
                    const isBraking = this.controls.brakes > 0.1 && gear.name.includes('main');
                    const mu = isBraking ? 0.8 : 0.02;
                    const frictionMag = Math.abs(F_n) * mu;
                    F_f_earth = vel_h.normalize().scale(-frictionMag);
                    
                    if (speed_h < 0.2 && this.controls.throttle < 0.1) {
                         F_f_earth = vel_h.scale(-1000 * Math.abs(F_n));
                    }
                }
                
                // 5. Transform Forces to Body Frame
                const F_gear_earth = new Vector3(F_f_earth.x, F_f_earth.y, F_n);
                const F_gear_body = q_inv.rotate(F_gear_earth);
                
                // 6. Accumulate
                F_ground = F_ground.add(F_gear_body);
                M_ground = M_ground.add(P_body.cross(F_gear_body));
            }
        });

        this.onGround = onGroundAny;

        // --- Totals ---
        const totalForces = new Vector3(
            Fx_aero + Fx_thrust + gravityBody.x + F_ground.x,
            Fy_aero + gravityBody.y + F_ground.y,
            Fz_aero + gravityBody.z + F_ground.z
        );

        const totalMoments = new Vector3(
            Mx_aero + M_ground.x,
            My_aero + M_ground.y,
            Mz_aero + M_ground.z
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
                groundMomentY: M_ground.y
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
        if (this.state.pos.z > 0 && !this.onGround) {
            // Underground?
            // If we hit ground hard
            if (this.state.vel.z > 10) { // > 10 m/s sink rate
                 this.crashed = true;
                 this.crashReason = "Hard Landing / Crash";
            } else {
                // Reset to surface if just minor penetration (handled by ground spring mostly)
                if (this.state.pos.z > 0) this.state.pos.z = 0;
            }
        }
    }

    getOutputState() {
        // Convert internal physics state to the App's expected format
        const euler = this.state.quat.toEuler(); // Rads
        const altitude = -this.state.pos.z; // Altitude is -z
        
        // Vertical Speed (Earth Z dot, inverted)
        // v_earth = q * v_body * q_inv
        const v_earth = this.state.quat.rotate(this.state.vel);
        const vs = -v_earth.z;

        const autopilotStatus = this.getAutopilotStatus ? this.getAutopilotStatus() : { engaged: false, targets: {} };
        return {
            position: {
                x: this.state.pos.x, // North
                y: this.state.pos.y, // East
                z: altitude,         // Altitude (Up)
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
            fuel: this.state.fuel,
            currentWaypointIndex: this.currentWaypointIndex || 0,
            
            // Debug / Derived
            derived: {
                altitude_ft: altitude * 3.28084,
                airspeed: this.state.vel.magnitude() * 1.94384,
                heading: (euler.psi * 180 / Math.PI + 360) % 360
            },
            
            debugPhysics: {
                theta: euler.theta,
                dynamicPressure_q: this.debugData?.q || 0,
                pitchMoment_y: this.debugData?.pitchMoment || 0,
                pitchRate_q: this.state.rates.y,
                altitude_z: altitude,
                isOnGround: this.onGround,
                lift: this.debugData?.lift || 0,
                pitchTorque: this.debugData?.pitchMoment || 0,
                
                // Extended Debugging
                alpha: this.debugData?.alpha || 0,
                beta: this.debugData?.beta || 0,
                Cm: this.debugData?.Cm || 0,
                CL: this.debugData?.CL || 0,
                elevator: this.controls.elevator,
                trim: this.controls.trim
            }
        };
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

        // Flight Plan
        if (conditions.flightPlan) {
            this.flightPlan = conditions.flightPlan;
            this.currentWaypointIndex = 0;
        }

        // Altitude
        if (conditions.position && conditions.position.z !== undefined) {
            this.state.pos.z = -conditions.position.z; // NED uses Z-down
        }

        // Reset velocities and rates for initial state
        this.state.vel = new Vector3(0, 0, 0);
        this.state.rates = new Vector3(0, 0, 0);
        
        // Update autopilot targets if available
        if (conditions.orientation && conditions.orientation.psi !== undefined) {
            const headingDeg = (conditions.orientation.psi * 180 / Math.PI + 360) % 360;
            this.autopilot.setTargets({ heading: headingDeg === 0 ? 360 : headingDeg });
        }
    }
    
    updateAutopilotTargets(targets) {
        this.autopilot.setTargets(targets);
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

    setEngineThrottle() {  
        // We simulate global throttle mostly, but can handle array if needed
        // For now, update global target which updateEngines uses
        // But if individual control is needed, updateEngines needs modification.
        // Let's stick to global throttle for physics update inputs, but we can store it.
    }
    reset() {
        this.state.pos = new Vector3(0, 0, -this.aircraft.gearHeight);
        this.state.vel = new Vector3(0, 0, 0);
        this.state.rates = new Vector3(0, 0, 0);
        this.state.quat = new Quaternion();
        this.crashed = false;
        this.currentWaypointIndex = 0;
        this.engines.forEach(e => { e.n1 = 0; e.thrust = 0; });
    }
    calculateAirspeeds() {
        const tas = this.state.vel.magnitude() * 1.94384; // knots
        // Simple IAS approx
        const rho = this.calculateEnvironment(this.state.pos.z).density;
        const ias = tas * Math.sqrt(rho / 1.225);
        return { trueAirspeed: tas, indicatedAirspeed: ias };
    }
}

export default RealisticFlightPhysicsService;

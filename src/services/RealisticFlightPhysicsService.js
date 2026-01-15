
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
            fuel: this.aircraft.fuelWeight
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
    }

    validateAndParseAircraft(data) {
        // Ensure defaults for critical physics parameters
        return {
            ...data,
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
            K: data.inducedDragFactor || 0.04, // Induced drag factor (CD = CD0 + K * CL^2)
            
            // Stability Derivatives (Approximated if missing)
            Cm0: 0.0, // Pitching moment at zero AoA
            Cma: -1.2, // Pitch stability (Increased from -0.5 to -1.2 for better stability)
            Cmq: -15.0, // Pitch damping
            Cde: -0.4, // Elevator effectiveness (Reduced from -1.0 to -0.4 to prevent backflips)
            
            Clb: -0.1, // Dihedral effect (Roll stability)
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
            brakingFriction: 0.8
        };
    }

    /**
     * Main Physics Loop
     * @param {Object} input - Control inputs
     * @param {number} dt - Time step (seconds)
     */
    update(input, dt) {
        if (this.crashed) return this.getOutputState();

        // Sub-stepping for stability (High stiffness springs need small dt)
        const subSteps = 5;
        const subDt = dt / subSteps;

        this.processInputs(input, dt); // Process inputs once per frame

        for (let i = 0; i < subSteps; i++) {
            this.time += subDt;

            // 2. Environment
            const env = this.calculateEnvironment(this.state.pos.z);

            // 3. Engine Dynamics
            this.updateEngines(env, subDt);

            // 4. Calculate Forces and Moments
            const { forces, moments, aeroForces, thrustForces, gravityForces, groundForces } = this.calculateAerodynamicsAndGround(env);
            
            // Store last for UI
            if (i === subSteps - 1) {
                this.aeroForces = aeroForces;
                this.thrustForces = thrustForces;
                this.gravityForces = gravityForces;
                this.groundForces = groundForces;
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
        this.controls.trim = input.trim || 0;
        
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

        this.engines.forEach((engine, i) => {
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
        
        // Lift (CL)
        // CL = CL0 + CLa * alpha + CL_flaps + CL_elevator
        const CL_flaps = this.controls.flaps * 0.5; // Approx flap lift
        const CL_stall_drop = Math.abs(alpha) > 0.3 ? -0.5 * Math.sin((Math.abs(alpha) - 0.3) * 5) : 0; // Simple stall drop
        let CL = this.aircraft.CL0 + this.aircraft.CLa * alpha + CL_flaps + (this.controls.elevator * 0.3) + CL_stall_drop;

        // Drag (CD)
        // CD = CD0 + K * CL^2 + CD_flaps + CD_gear
        const CD_flaps = this.controls.flaps * 0.05;
        const CD_gear = this.controls.gear * 0.02;
        const CD = this.aircraft.CD0 + this.aircraft.K * CL * CL + CD_flaps + CD_gear;

        // Side Force (CY)
        // CY = CYb * beta + CYdr * rudder
        const CY = -0.5 * beta + (this.controls.rudder * 0.2);

        // Moments
        // Pitch (Cm)
        // Cm = Cm0 + Cma * alpha + Cmq * (q * c / 2V) + Cde * elevator
        const c = this.aircraft.chord;
        const b = this.aircraft.wingSpan;
        const pitch_damping = this.aircraft.Cmq * (this.state.rates.y * c) / (2 * (V_airspeed + 0.1));
        const Cm = this.aircraft.Cm0 + (this.aircraft.Cma * alpha) + pitch_damping + (this.aircraft.Cde * (this.controls.elevator + this.controls.trim));

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

        // --- Ground Reaction ---
        let F_ground = new Vector3(0,0,0);
        let M_ground = new Vector3(0,0,0);

        // Detect ground contact
        // Altitude = -state.pos.z.
        // If z > -gearHeight, we are touching ground (since z is down)
        // Let's say z=0 is ground level (runway). 
        // If pos.z >= -this.aircraft.gearHeight (approx), wheel touches.
        
        // Simplify: Check Height Above Ground
        const height = -this.state.pos.z; // Altitude
        const gearExt = this.controls.gear * this.aircraft.gearHeight; // Extended length
        
        this.onGround = false;
        
        if (height < gearExt) {
            this.onGround = true;
            const compression = gearExt - height;
            
            // Spring Force (Upward in Earth Frame, needs rotation to Body)
            // F = k * x - c * v_vertical
            // We need vertical velocity in Earth frame
            const velEarth = this.state.quat.rotate(this.state.vel);
            const v_vertical = velEarth.z; // Positive is Down
            
            // Spring acts Up (-z earth)
            const springForce = this.aircraft.gearStiffness * compression;
            const dampingForce = -this.aircraft.gearDamping * v_vertical;
            let F_z_earth_ground = -(springForce + dampingForce);
            
            if (F_z_earth_ground > 0) F_z_earth_ground = 0; // Ground pulls? No. Only pushes.
            
            // Apply to body
            // We treat this as a force at the CG for simplicity (for heave)
            // But for pitch/roll moments, we need contact points.
            // Simplified: 
            // 1. Normal Force to stop falling.
            // 2. Friction Force to stop sliding.
            
            // Transform normal force to body
            const F_normal_earth = new Vector3(0, 0, F_z_earth_ground);
            const F_normal_body = q_inv.rotate(F_normal_earth);
            
            F_ground = F_ground.add(F_normal_body);
            
            // Friction (Opposing horizontal velocity)
            const friction = this.aircraft.frictionCoeff + (this.controls.brakes ? this.aircraft.brakingFriction : 0);
            // We use body velocity x/y as approx for ground slide relative to wheels
            const horizVel = new Vector3(this.state.vel.x, this.state.vel.y, 0); 
            const groundSpeed = horizVel.magnitude();
            
            let frictionForce = new Vector3();
            
            // Static friction / Stop condition logic
            if (groundSpeed < 0.5 && this.controls.throttle < 0.1) {
                 // High damping to stop completely (simulate static friction/brakes holding)
                 frictionForce = horizVel.scale(-5.0 * this.state.mass); 
            } else {
                 // Kinetic friction
                 // F_f = -mu * N * v_hat
                 if (groundSpeed > 0) {
                    const dir = horizVel.normalize();
                    const normalMag = Math.abs(F_normal_body.z); // Approx normal force component
                    const frictionMag = friction * normalMag;
                    frictionForce = dir.scale(-frictionMag);
                 }
            }
            F_ground = F_ground.add(frictionForce);
            
            // Moments from Gear
            // Restore Pitch/Roll to 0 if on ground (Self-leveling gear spring logic)
            // This is a "hack" to simulate 3-point gear restoring moments
            const euler = this.state.quat.toEuler();
            const kp_ground = 100000;
            const kd_ground = 100000;
            
            M_ground.x = -kp_ground * euler.phi - kd_ground * this.state.rates.x;
            M_ground.y = -kp_ground * euler.theta - kd_ground * this.state.rates.y;
            
            // Nose wheel steering
            // M_ground.z += this.controls.rudder * 50000; 
        }

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
            groundForces: F_ground
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
        // w as pure quaternion (0, p, q, r)
        const qw = new Quaternion(0, this.state.rates.x, this.state.rates.y, this.state.rates.z);
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

        // Update Geo position (Approximate)
        // 1 degree lat ~ 111111 meters
        const dLat = v_earth.x * dt / 111111;
        const dLon = v_earth.y * dt / (111111 * Math.cos(this.state.geo.lat * Math.PI / 180));
        this.state.geo.lat += dLat;
        this.state.geo.lon += dLon;
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
            engineParams: {
                n1: this.engines.map(e => e.n1),
                n2: this.engines.map(e => e.n1), // Mock
                egt: this.engines.map(e => 400 + e.n1 * 4),
                fuelFlow: this.engines.map(e => e.n1 * 0.5)
            },
            fuel: this.state.fuel,
            
            // Debug / Derived
            derived: {
                altitude_ft: altitude * 3.28084,
                airspeed: this.state.vel.magnitude() * 1.94384,
                heading: (euler.psi * 180 / Math.PI + 360) % 360
            }
        };
    }
    
    // Interface methods required by the hook
    setFlaps(val) { this.controls.flaps = val; }
    setGear(val) { this.controls.gear = val ? 1 : 0; }
    setAirBrakes(val) { this.controls.brakes = val; }
    setTrim(val) { this.controls.trim = val; }
    setEngineThrottle(idx, val) { 
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

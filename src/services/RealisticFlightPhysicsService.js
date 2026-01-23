
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

// Sub-modules
import AircraftSystemsManager from './systems/AircraftSystemsManager.js';
import { NavigationSystem } from './systems/NavigationSystem.js';
import aerodynamicsEngine from './physics/AerodynamicsEngine.js';
import groundPhysicsEngine from './physics/GroundPhysicsEngine.js';
import environmentService from './physics/EnvironmentService.js';
import { Vector3, Quaternion } from '../utils/physics/MathUtils.js';

class RealisticFlightPhysicsService {
    constructor(aircraftData, initialLat = 0, initialLon = 0) {
        this.aircraft = this.validateAndParseAircraft(aircraftData);
        
        this.CONSTANTS = {
            G: 9.80665
        };

        // Initial State (Internal Physics uses NED: North, East, Down)
        this.state = {
            pos: new Vector3(0, 0, -this.aircraft.gearHeight), // Start ON THE GROUND
            geo: { lat: initialLat, lon: initialLon },
            vel: new Vector3(0, 0, 0),
            quat: new Quaternion(),
            rates: new Vector3(0, 0, 0),
            mass: this.aircraft.mass,
            fuel: (typeof aircraftData.fuelWeight === 'number' ? aircraftData.fuelWeight : (this.aircraft.maxFuelCapacity ?? 10000))
        };
        
        this.payloadMass = typeof aircraftData.payloadWeight === 'number' ? aircraftData.payloadWeight : ((this.aircraft.maxPayload || 15000) * 0.7);

        // Control State
        this.controls = {
            throttle: 0,
            engineThrottles: Array(this.aircraft.engineCount).fill(0),
            aileron: 0, 
            elevator: 0,
            rudder: 0,
            flaps: 0,
            gear: 1,
            brakes: 0,
            trim: 0
        };

        // Failure Simulation State
        this.controlLag = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 };
        this.controlEffectiveness = { aileron: 1.0, elevator: 1.0, rudder: 1.0, gear: 1.0 };
        this.vibrationLevel = 0;

        // Engine State
        this.engines = Array(this.aircraft.engineCount).fill(0).map(() => {
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
        this.groundStatus = { status: 'UNKNOWN', remainingLength: 0 };
        this.difficulty = 'rookie'; 
        this.airportElevation = (aircraftData.airportElevation || 0) * 0.3048; 
        this.terrainElevation = null; 
        this.currentGroundZ = 0; 

        if (this.onGround) {
             const gearHeight = this.aircraft.gearHeight || 2;
             this.state.pos.z = -(this.airportElevation + gearHeight);
             this.currentGroundZ = -this.airportElevation;
        }

        // Sub-systems
        this.autopilot = new RealisticAutopilotService();
        this.navigationSystem = new NavigationSystem();
        this.failureSystem = new FailureHandler({ difficulty: this.difficulty });
        this.warningSystem = new WarningSystem();
        this.systemsManager = new AircraftSystemsManager();
        
        this.sensors = { pitotBlocked: false };
    }

    // Expose systems for UI
    get systems() { return this.systemsManager.systems; }
    get flightPlan() { return this.navigationSystem.flightPlan; }
    get currentWaypointIndex() { return this.navigationSystem.currentWaypointIndex; }
    get runwayGeometry() { return this.navigationSystem.runwayGeometry; }

    updateFlightPlan(fp) {
        this.navigationSystem.setFlightPlan(fp);
    }

    setRunwayGeometry(geom) {
        this.navigationSystem.setRunwayGeometry(geom);
    }

    setInitialConditions(conditions) {
        if (conditions.latitude !== undefined) this.state.geo.lat = conditions.latitude;
        if (conditions.longitude !== undefined) this.state.geo.lon = conditions.longitude;
        
        if (conditions.orientation) {
            const { psi, theta, phi } = conditions.orientation;
            this.state.quat = Quaternion.fromEuler(phi || 0, theta || 0, psi || 0);
        }
        
        if (conditions.flightPlan) {
            this.updateFlightPlan(conditions.flightPlan);
        }
        
        if (conditions.difficulty) this.difficulty = conditions.difficulty;
        
        if (conditions.failureType && this.failureSystem) {
            this.failureSystem.triggerFailure(conditions.failureType);
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
                const burnPerNm = data.typicalFuelBurn || 2.5; 
                const cruiseKts = data.cruiseSpeed || 450; 
                const engines = data.engineCount || 2;
                const perEngineThrust = data.maxThrustPerEngine || 120000; 
                const totalThrust = engines * perEngineThrust;
                const kgPerSec = (burnPerNm * cruiseKts) / 3600;
                const sfc = totalThrust > 0 ? kgPerSec / totalThrust : 0.000015;
                return sfc;
            })(),
            mass: (data.emptyWeight || 40000) + (data.fuelWeight || 10000) + (data.payloadWeight || 0),
            wingArea, wingSpan, chord,
            groundGravityArm, groundLiftArm,
            maxThrust: data.maxThrustPerEngine || 120000,
            engineCount: data.engineCount || 2,
            enginePositions: data.enginePositions || (function() {
                const count = data.engineCount || 2;
                const span = data.wingSpan || 35;
                const positions = [];
                if (count === 1) { positions.push(new Vector3(2.0, 0, 0)); }
                else if (count === 2) {
                    positions.push(new Vector3(0, -span * 0.25, 1.0));
                    positions.push(new Vector3(0, span * 0.25, 1.0));
                } else if (count === 3) {
                     positions.push(new Vector3(0, -span * 0.25, 1.0));
                     positions.push(new Vector3(0, span * 0.25, 1.0));
                     positions.push(new Vector3(-15, 0, -3.0));
                } else if (count === 4) {
                     positions.push(new Vector3(2.0, -span * 0.35, 1.0));
                     positions.push(new Vector3(4.0, -span * 0.18, 1.5));
                     positions.push(new Vector3(4.0, span * 0.18, 1.5));
                     positions.push(new Vector3(2.0, span * 0.35, 1.0));
                } else {
                    for (let i=0; i<count; i++) {
                        const y = (i - (count-1)/2) * (span * 0.5 / count);
                        positions.push(new Vector3(0, y, 1.0));
                    }
                }
                return positions;
            })(),
            Ix: data.momentOfInertiaRoll || 1000000,
            Iy: data.momentOfInertiaPitch || 2000000,
            Iz: data.momentOfInertiaYaw || 3000000,
            CL0: data.basicLiftCoefficient || 0.2,
            CLa: data.liftCurveSlope || 5.5,
            CD0: data.zeroLiftDragCoefficient || 0.02,
            K: data.inducedDragFactor || 0.025,
            gearHeight: 3.0,
            gearStiffness: 3000000,
            gearDamping: 300000,
            frictionCoeff: 0.02,
            brakingFriction: 0.8,
            flapProfile: data.flapProfile || {
                positions: [
                    { angle: 0, clIncrement: 0, cdIncrement: 0 },
                    { angle: 35, clIncrement: 0.3, cdIncrement: 0.01 }
                ]
            }
        };
    }

    update(input, dt) {
        if (this.crashed) return this.getOutputState();

        // 1. Update Ground Status (Using geometry from Nav system via facade property? 
        // No, groundPhysicsEngine handles the math, but we need to update `this.groundStatus` 
        // based on the runway geometry which is now in NavSystem.
        // `groundPhysicsEngine` doesn't know about NavSystem.
        // We pass `this.runwayGeometry` to ground engine in `calculateForces`.
        
        // However, `updateGroundStatus` method was used to update `this.groundStatus` before.
        // Let's bring it back or delegate it.
        // Actually, in the previous monolithic code, `updateGroundStatus` was internal.
        // Now, `groundPhysicsEngine` calculates forces but doesn't persist status?
        // Wait, `groundPhysicsEngine.calculateForces` RETURNS `groundStatus`!
        // So we update it there.
        
        const subSteps = 5;
        const subDt = dt / subSteps;

        // --- Navigation Update ---
        const navOutput = this.navigationSystem.update({
            lat: this.state.geo.lat,
            lon: this.state.geo.lon,
            altitude: -this.state.pos.z * 3.28084
        }, dt);

        if (navOutput.targetHeading !== null && this.autopilot.mode === 'LNAV') {
             this.autopilot.setTargets({ heading: navOutput.targetHeading });
        }

        // --- Autopilot Update ---
        const v_earth = this.state.quat.rotate(this.state.vel);
        const airspeedsForAP = this.calculateAirspeeds();
        const currentAirspeed = airspeedsForAP.indicatedAirspeed;
        const currentVS = -v_earth.z * 196.85;
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

        const apOutputs = this.autopilot.update(apState, this.controls, dt, navOutput);

        let finalInput = input;
        if (apOutputs) {
            finalInput = {
                ...input,
                throttle: apOutputs.throttle,
                pitch: apOutputs.elevator,
                roll: apOutputs.aileron,
                trim: apOutputs.trim,
                yaw: apOutputs.rudder
            };
        }

        this.processInputs(finalInput, dt);
        
        // --- Failure System Update ---
        // Create a lightweight state for failure logic
        const failureState = {
            altitude: -this.state.pos.z * 3.28084,
            airspeed: this.state.vel.magnitude() * 1.94384,
            onGround: this.onGround,
            controls: this.controls,
            systems: this.systems,
            env: environmentService.calculateEnvironment(this.state.pos.z)
        };
        
        if (this.failureSystem) {
            this.failureSystem.update(dt, failureState);
            this.failureSystem.applyImpact(this);
        }

        this.systemsManager.update(dt, {
            engineN2: this.engines.map(e => e.state.n2 || 0),
            altitude: -this.state.pos.z * 3.28084,
            onGround: this.onGround,
            airspeed: this.state.vel.magnitude() * 1.94384
        });

        for (let i = 0; i < subSteps; i++) {
            this.time += subDt;

            // 1. Position Update (Geo)
            const v_ned = this.state.quat.rotate(this.state.vel);
            const latRad = this.state.geo.lat * Math.PI / 180;
            const metersPerLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
            const metersPerLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);
            
            this.state.geo.lat += (v_ned.x * subDt) / metersPerLat;
            this.state.geo.lon += (v_ned.y * subDt) / metersPerLon;

            // 2. Environment
            const env = environmentService.calculateEnvironment(this.state.pos.z);

            // 3. Engine Dynamics
            this.updateEngines(env, subDt);

            const totalFuelFlow = this.engines.reduce((sum, e) => sum + (e.state.fuelFlow || 0), 0);
            const fuelBurned = totalFuelFlow * subDt;
            this.state.fuel = Math.max(0, this.state.fuel - fuelBurned);
            
            const emptyWeight = this.aircraft.emptyWeight || 40000;
            this.state.mass = emptyWeight + this.state.fuel + this.payloadMass;

            // 4. Calculate Forces
            const physicsOutput = this.calculatePhysics(env);
            
            const { forces, moments } = physicsOutput;

            if (i === subSteps - 1) {
                this.aeroForces = physicsOutput.aeroForces;
                this.thrustForces = physicsOutput.thrustForces;
                this.gravityForces = physicsOutput.gravityForces;
                this.groundForces = physicsOutput.groundForces;
                this.debugData = physicsOutput.debug;
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
        const rate = 5.0 * dt;
        this.controls.throttle += (input.throttle - this.controls.throttle) * rate;
        
        if (input.throttles && Array.isArray(input.throttles)) {
            for (let i = 0; i < this.controls.engineThrottles.length; i++) {
                const target = input.throttles[i] !== undefined ? input.throttles[i] : input.throttle;
                this.controls.engineThrottles[i] += (target - this.controls.engineThrottles[i]) * rate;
            }
        } else {
            for (let i = 0; i < this.controls.engineThrottles.length; i++) {
                this.controls.engineThrottles[i] += (input.throttle - this.controls.engineThrottles[i]) * rate;
            }
        }
        
        this.controls.elevator += (input.pitch - this.controls.elevator) * rate * 2;
        this.controls.aileron += (input.roll - this.controls.aileron) * rate * 3;
        this.controls.rudder += (input.yaw - this.controls.rudder) * rate * 2;
        
        if (input.flaps !== undefined) this.controls.flaps = input.flaps;
        if (input.gear !== undefined) this.controls.gear = input.gear ? 1 : 0;
        
        const targetTrim = input.trim !== undefined ? input.trim : this.controls.trim;
        this.controls.trim += (targetTrim - this.controls.trim) * rate;
    }

    setEnvironment(envData) {
        environmentService.setEnvironment(envData);
    }

    updateEngines(env, dt) {
        const speedOfSound = env.speedOfSound || 340;
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(env.wind || new Vector3(0,0,0));
        const V_air_body = this.state.vel.sub(V_wind_body);
        const V_airspeed = V_air_body.magnitude();
        const mach = V_airspeed / speedOfSound;
        const airDensityRatio = env.density / this.CONSTANTS.SEA_LEVEL_DENSITY;

        this.engines.forEach((engine, index) => {
             const engineThrottle = this.controls.engineThrottles[index];
             engine.update(dt, engineThrottle, mach, -this.state.pos.z, airDensityRatio, env.temp);
        });
        
        if (this.state.fuel < 0) {
            this.state.fuel = 0;
            this.engines.forEach(e => e.setFailed(true));
        }
    }

    calculatePhysics(env) {
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(env.wind || new Vector3(0,0,0));
        
        if (env.turbulence > 0) {
            const turbScale = env.turbulence * 5.0;
            V_wind_body.x += (Math.random() - 0.5) * turbScale;
            V_wind_body.y += (Math.random() - 0.5) * turbScale;
            V_wind_body.z += (Math.random() - 0.5) * turbScale;
        }

        const V_air_body = this.state.vel.sub(V_wind_body);
        const V_airspeed = V_air_body.magnitude();
        const q = 0.5 * env.density * V_airspeed * V_airspeed;

        let alpha = 0;
        let beta = 0;
        if (V_airspeed > 1.5) {
            alpha = Math.atan2(V_air_body.z, V_air_body.x);
            beta = Math.asin(Math.max(-1, Math.min(1, V_air_body.y / V_airspeed)));
        }

        const heightAGL = this.currentGroundZ - this.state.pos.z;
        const aeroCoeffs = aerodynamicsEngine.calculateCoefficients({
            aircraft: this.aircraft,
            controls: this.controls,
            controlEffectiveness: this.controlEffectiveness,
            alpha, beta,
            rates: this.state.rates,
            airspeed: V_airspeed,
            onGround: this.onGround,
            q, heightAGL
        });

        const aeroForcesAndMoments = aerodynamicsEngine.calculateForcesAndMoments({
            aircraft: this.aircraft, q, alpha
        }, aeroCoeffs);

        let F_aero = aeroForcesAndMoments.forces;
        let M_aero = aeroForcesAndMoments.moments;

        const groundPhysics = groundPhysicsEngine.calculateForces({
            aircraft: this.aircraft,
            state: this.state,
            controls: this.controls,
            groundStatus: this.groundStatus, // Current status, will be updated
            runwayGeometry: this.runwayGeometry, // PASS GEOMETRY HERE
            currentGroundZ: this.currentGroundZ,
            environment: env
        });

        const F_ground = groundPhysics.forces;
        const M_ground = groundPhysics.moments;
        this.onGround = groundPhysics.onGround;
        
        // Update Ground Status from Engine
        if (groundPhysics.groundStatus) {
            this.groundStatus = groundPhysics.groundStatus;
        }

        if (this.onGround) {
            const F_lift = aeroForcesAndMoments.debug.lift;
            const weightGround = this.state.mass * this.CONSTANTS.G;
            const gravityArm = this.aircraft.groundGravityArm || (this.aircraft.chord || 5) * 0.15;
            const liftArm = this.aircraft.groundLiftArm || (this.aircraft.chord || 5) * 0.2;
            const My_gravity = -weightGround * gravityArm;
            const My_lift_ground = F_lift * liftArm;
            M_aero.y += My_gravity + My_lift_ground;
        }

        const cutoffHeight = 6.1;
        if (heightAGL < cutoffHeight || this.onGround) {
            let stabilityFactor = Math.max(0, Math.min(1, heightAGL / cutoffHeight));
            if (this.onGround) stabilityFactor = 0.2;
            M_aero.x *= stabilityFactor; 
            M_aero.z *= stabilityFactor;
        }

        let F_thrust_body = new Vector3(0, 0, 0);
        let M_thrust_body = new Vector3(0, 0, 0);

        this.engines.forEach((engine, index) => {
            const thrustMag = engine.state.thrust;
            const F_eng = new Vector3(thrustMag, 0, 0);
            const pos = this.aircraft.enginePositions[index] || new Vector3(0, 0, 0);
            const M_eng = pos.cross(F_eng);
            F_thrust_body = F_thrust_body.add(F_eng);
            M_thrust_body = M_thrust_body.add(M_eng);
        });

        const gravityEarth = new Vector3(0, 0, this.state.mass * this.CONSTANTS.G);
        const gravityBody = q_inv.rotate(gravityEarth);

        const totalForces = new Vector3(
            F_aero.x + F_thrust_body.x + gravityBody.x + F_ground.x,
            F_aero.y + F_thrust_body.y + gravityBody.y + F_ground.y,
            F_aero.z + F_thrust_body.z + gravityBody.z + F_ground.z
        );

        const totalMoments = new Vector3(
            M_aero.x + M_ground.x + M_thrust_body.x,
            M_aero.y + M_ground.y + M_thrust_body.y,
            M_aero.z + M_ground.z + M_thrust_body.z
        );

        return {
            forces: totalForces,
            moments: totalMoments,
            aeroForces: F_aero,
            thrustForces: F_thrust_body,
            gravityForces: gravityBody,
            groundForces: F_ground,
            debug: {
                alpha, beta, q, 
                ...aeroCoeffs,
                ...aeroForcesAndMoments.debug,
                pitchMoment: M_aero.y,
                groundMomentY: M_ground.y,
                yawMoment: M_aero.z,
                steeringMoment: groundPhysics.steeringMoment,
                thrustMomentYaw: M_thrust_body.z,
                thrustMomentPitch: M_thrust_body.y
            }
        };
    }

    integrate(forces, moments, dt) {
        const accel = forces.scale(1 / this.state.mass).sub(this.state.rates.cross(this.state.vel));
        this.state.vel = this.state.vel.add(accel.scale(dt));

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

        const v_earth = this.state.quat.rotate(this.state.vel);
        this.state.pos = this.state.pos.add(v_earth.scale(dt));
        
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

        if (this.onGround && this.state.vel.magnitude() < 0.5 && this.controls.throttle < 0.1) {
            this.state.vel = new Vector3(0, 0, 0);
            this.state.rates = new Vector3(0, 0, 0);
        }
    }

    checkConstraints() {
        const altitude = this.currentGroundZ - this.state.pos.z; 
        
        if (this.state.pos.z > this.currentGroundZ && !this.onGround) {
            if (this.state.vel.z > 10) { 
                 this.crashed = true;
                 this.crashReason = "Hard Landing / Crash";
            } else {
                if (this.state.pos.z > this.currentGroundZ + 2.0) {
                     this.state.pos.z = this.currentGroundZ;
                     this.state.vel.z = 0; 
                }
            }
        }

        if (!this.crashed && altitude < 3.05) { 
            if (this.groundStatus.status === 'OBJECTS') {
                this.crashed = true;
                this.crashReason = "Collision with Ground Objects";
                console.log("CRASH: Collision with objects at altitude " + altitude.toFixed(2) + "m");
            }
        }
    }

    getOutputState() {
        const euler = this.state.quat.toEuler(); 
        const altitude = -this.state.pos.z; 
        const altitudeAMSL = altitude + (this.airportElevation || 0);
        const altitudeAGL = this.currentGroundZ - this.state.pos.z;
        
        const v_earth = this.state.quat.rotate(this.state.vel);
        const vs = -v_earth.z;

        const airspeeds = this.calculateAirspeeds();
        const currentEnv = environmentService.calculateEnvironment(this.state.pos.z);
        
        const outputState = {
            environment: {
                temperature: currentEnv.temp - 273.15, // Celsius
                pressure: currentEnv.pressure,
                density: currentEnv.density,
                wind: currentEnv.wind
            },
            position: {
                x: this.state.pos.x, 
                y: this.state.pos.y, 
                z: altitude,         
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
            airBrakes: this.controls.brakes,
            verticalSpeed: vs * 196.85, 
            hasCrashed: this.crashed,
            crashWarning: this.crashReason,
            autopilot: {
                engaged: this.autopilot.engaged,
                mode: this.autopilot.mode,
                targets: this.autopilot.targets
            },
            autopilotTargets: this.autopilot.targets,
            autopilotDebug: this.autopilot.debugState,
            engineParams: {
                n1: this.engines.map(e => e.state.n1),
                n2: this.engines.map(e => e.state.n2), 
                egt: this.engines.map(e => e.state.egt),
                fuelFlow: this.engines.map(e => e.state.fuelFlow)
            },
            systems: this.systems,
            fuel: this.state.fuel,
            currentWaypointIndex: this.navigationSystem.currentWaypointIndex,
            
            derived: {
                altitude_ft: altitudeAMSL * 3.28084, 
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
                
                alpha: this.debugData?.alpha || 0,
                beta: this.debugData?.beta || 0,
                Cm: this.debugData?.Cm || 0,
                CL: this.debugData?.CL || 0,
                elevator: this.controls.elevator,
                trim: this.controls.trim
            },
            runwayGeometry: this.navigationSystem.runwayGeometry,
            groundStatus: this.groundStatus
        };

        if (this.warningSystem) {
             outputState.activeWarnings = this.warningSystem.update(outputState, 0.016);
        }

        return outputState;
    }
    
    performSystemAction(system, action, value) {
        this.systemsManager.performAction(system, action, value);
    }

    setColdStart() {
        this.systemsManager.setColdStart(this.engines);
    }

    calculateAirspeeds() {
        const wind = environmentService.calculateEnvironment(this.state.pos.z).wind || new Vector3(0, 0, 0);
        const q_inv = new Quaternion(this.state.quat.w, -this.state.quat.x, -this.state.quat.y, -this.state.quat.z);
        const V_wind_body = q_inv.rotate(wind);
        const V_air_body = this.state.vel.sub(V_wind_body);
        
        const tas = V_air_body.magnitude() * 1.94384; 
        const rho = environmentService.calculateEnvironment(this.state.pos.z).density;
        const ias = tas * Math.sqrt(rho / 1.225);
        const gs = this.state.vel.magnitude() * 1.94384; 

        return { trueAirspeed: tas, indicatedAirspeed: ias, groundSpeed: gs };
    }
}

export default RealisticFlightPhysicsService;

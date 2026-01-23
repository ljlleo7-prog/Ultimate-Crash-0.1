import { Vector3, Quaternion } from '../../utils/physics/MathUtils.js';

class GroundPhysicsEngine {
    constructor() {
        // Gear Configuration (Standard Tricycle)
        // Ideally this comes from aircraft config, but defaulting here as per original code
        this.defaultGears = [
            { name: 'nose', pos: new Vector3(14.0, 0, 3.0), k: 80000, c: 35000 },
            { name: 'mainL', pos: new Vector3(-2.0, -3.5, 3.0), k: 150000, c: 150000 },
            { name: 'mainR', pos: new Vector3(-2.0, 3.5, 3.0), k: 150000, c: 150000 }
        ];
    }

    calculateForces(params) {
        const {
            aircraft,
            state, // { pos, vel, rates, quat, mass }
            controls,
            groundStatus, // { status, remainingLength }
            currentGroundZ,
            environment
        } = params;

        const gears = this.defaultGears; // Use aircraft specific if available in future
        const q_inv = new Quaternion(state.quat.w, -state.quat.x, -state.quat.y, -state.quat.z);

        let F_ground = new Vector3(0, 0, 0);
        let M_ground = new Vector3(0, 0, 0);
        let onGroundAny = false;
        let gearForces = []; // To track per-gear force for pivot logic

        gears.forEach(gear => {
            // 1. Position
            const P_body = gear.pos;
            const P_offset_earth = state.quat.rotate(P_body);
            const P_world_z = state.pos.z + P_offset_earth.z;

            // Check contact
            if (P_world_z > currentGroundZ) {
                onGroundAny = true;
                const depth = P_world_z - currentGroundZ;

                // 2. Velocity
                const V_point_body = state.vel.add(state.rates.cross(P_body));
                const V_point_earth = state.quat.rotate(V_point_body);
                const v_vertical = V_point_earth.z;

                // 3. Normal Force
                let F_n = -(gear.k * depth + gear.c * v_vertical);
                if (F_n > 0) F_n = 0;
                
                const maxForce = state.mass * 9.81 * 4;
                if (Math.abs(F_n) > maxForce) F_n = -maxForce;

                // 4. Friction
                let steeringAngle = 0;
                if (gear.name === 'nose') {
                    steeringAngle = controls.rudder * 70 * Math.PI / 180;
                }

                const cosS = Math.cos(steeringAngle);
                const sinS = Math.sin(steeringAngle);

                const vx_wheel = V_point_body.x * cosS + V_point_body.y * sinS;
                const vy_wheel = -V_point_body.x * sinS + V_point_body.y * cosS;

                const isBraking = controls.brakes > 0.1 && gear.name.includes('main');
                let mu_roll = isBraking ? (aircraft.brakingFriction || 0.8) : (aircraft.frictionCoeff || 0.02);
                let mu_slide = 0.9;

                if (environment && environment.precipitation > 0) {
                    const rainFactor = Math.min(environment.precipitation, 10) / 10;
                    mu_roll *= (1 - 0.4 * rainFactor);
                    mu_slide *= (1 - 0.4 * rainFactor);
                }

                if (groundStatus && groundStatus.status === 'GRASS') {
                    mu_roll = 0.08;
                    mu_slide = 0.5;
                    if (state.vel.magnitude() > 1) {
                         const noise = (Math.random() - 0.5) * 0.2;
                         F_n *= (1 + noise);
                    }
                }

                const v_threshold = 0.1;
                let Fx_wheel = 0;
                let Fy_wheel = 0;
                const F_normal_mag = Math.abs(F_n);

                if (Math.abs(vx_wheel) < v_threshold) {
                    Fx_wheel = -vx_wheel * F_normal_mag * 50;
                } else {
                    Fx_wheel = -Math.sign(vx_wheel) * F_normal_mag * mu_roll;
                }

                if (Math.abs(vy_wheel) < v_threshold) {
                    let stiffForce = -vy_wheel * F_normal_mag * 30;
                    const maxStiff = F_normal_mag * mu_slide;
                    if (Math.abs(stiffForce) > maxStiff) stiffForce = Math.sign(stiffForce) * maxStiff;
                    Fy_wheel = stiffForce;
                } else {
                    Fy_wheel = -Math.sign(vy_wheel) * F_normal_mag * mu_slide;
                }

                const Fx_body_fric = Fx_wheel * cosS - Fy_wheel * sinS;
                const Fy_body_fric = Fx_wheel * sinS + Fy_wheel * cosS;

                const F_normal_body = q_inv.rotate(new Vector3(0, 0, F_n));

                const F_gear_body = new Vector3(
                    Fx_body_fric + F_normal_body.x,
                    Fy_body_fric + F_normal_body.y,
                    F_normal_body.z
                );

                gearForces.push({ gear, forceMag: F_normal_mag });

                F_ground = F_ground.add(F_gear_body);
                M_ground = M_ground.add(P_body.cross(F_gear_body));
            } else {
                gearForces.push({ gear, forceMag: 0 });
            }
        });

        // Steering Moment (Low Speed Authority)
        let Mz_steering = 0;
        let Fy_steering = 0;
        if (onGroundAny) {
             let damping = 1.0;
             if (groundStatus && groundStatus.status === 'GRASS') damping = 0.3;
             
             const steeringTorque = state.mass * 80 * controls.rudder * damping;
             Mz_steering = steeringTorque;
             
             const steeringSideForce = state.mass * 40 * controls.rudder * damping;
             Fy_steering = steeringSideForce;
        }

        // Add Steering to Ground Moments/Forces (Note: Original added to Aero, but logical here)
        M_ground.z += Mz_steering;
        F_ground.y += Fy_steering;

        // Pivot Logic
        if (onGroundAny) {
            const nose = gearForces[0];
            const mains = [gearForces[1], gearForces[2]];
            const weight = state.mass * 9.81;

            if (nose.forceMag < weight * 0.1 && (mains[0].forceMag + mains[1].forceMag) > weight * 0.5) {
                const pivotPos = mains[0].gear.pos.add(mains[1].gear.pos).scale(0.5);
                const v_pivot_z = state.vel.z - (state.rates.y * pivotPos.x);
                const pivotDamping = 100000;
                const F_constraint_z = -v_pivot_z * pivotDamping;
                const My_constraint = -pivotPos.x * F_constraint_z;
                
                F_ground.z += F_constraint_z;
                M_ground.y += My_constraint;
            }
        }

        // Ground Stabilizer (Damping)
        if (onGroundAny) {
             const Ix = aircraft.Ix || 1000000;
             const Iy = aircraft.Iy || 2000000;
             const Iz = aircraft.Iz || 3000000;
             const dampingFactor = 5.0; 

             M_ground.x -= state.rates.x * (Ix * dampingFactor);
             M_ground.y -= state.rates.y * (Iy * dampingFactor);
             M_ground.z -= state.rates.z * (Iz * dampingFactor);
             
             if (Math.abs(state.vel.z) < 1.0) {
                  F_ground.z -= state.vel.z * (state.mass * 10.0); 
             }
        }

        return {
            forces: F_ground,
            moments: M_ground,
            onGround: onGroundAny,
            steeringMoment: Mz_steering
        };
    }
}

export default new GroundPhysicsEngine();

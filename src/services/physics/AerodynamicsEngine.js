import { Vector3, Quaternion } from '../../utils/physics/MathUtils.js';

class AerodynamicsEngine {
    constructor() {
    }

    getFlapIncrements(aircraft, flapInput) {
        const profile = aircraft.flapProfile;
        if (!profile || !profile.positions || profile.positions.length === 0) {
            return { cl: 0, cd: 0 };
        }

        const positions = profile.positions;
        const maxIndex = positions.length - 1;

        // Clamp input
        if (flapInput < 0) flapInput = 0;
        if (flapInput > maxIndex) flapInput = maxIndex;

        // Linear interpolation
        const idx1 = Math.floor(flapInput);
        const idx2 = Math.min(idx1 + 1, maxIndex);
        const frac = flapInput - idx1;

        const pos1 = positions[idx1];
        const pos2 = positions[idx2];

        const cl = (pos1.clIncrement || 0) + ((pos2.clIncrement || 0) - (pos1.clIncrement || 0)) * frac;
        const cd = (pos1.cdIncrement || 0) + ((pos2.cdIncrement || 0) - (pos1.cdIncrement || 0)) * frac;

        return { cl, cd };
    }

    getAirbrakeIncrements(aircraft, brakeInput, onGround) {
        const profile = aircraft.airbrakeProfile;
        
        // Handle legacy profile structure
        if (profile && profile.airPosition && !profile.positions) {
            if (profile.hasTwoTier) {
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
                 if (onGround) {
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

        const positions = profile.positions;
        const maxIndex = positions.length - 1;

        if (brakeInput < 0) brakeInput = 0;
        if (brakeInput > maxIndex) brakeInput = maxIndex;

        const idx1 = Math.floor(brakeInput);
        const idx2 = Math.min(idx1 + 1, maxIndex);
        const frac = brakeInput - idx1;
        
        const pos1 = positions[idx1];
        const pos2 = positions[idx2];

        const cl = (pos1.liftDecrement || 0) + ((pos2.liftDecrement || 0) - (pos1.liftDecrement || 0)) * frac;
        const cd = (pos1.dragIncrement || 0) + ((pos2.dragIncrement || 0) - (pos1.dragIncrement || 0)) * frac;

        return { cl, cd };
    }

    calculateCoefficients(params) {
        const { 
            aircraft, 
            controls, 
            controlEffectiveness, 
            alpha, 
            beta, 
            rates, 
            airspeed, 
            onGround,
            q 
        } = params;

        // Flaps
        const flapIncrements = this.getFlapIncrements(aircraft, controls.flaps);
        const CL_flaps = flapIncrements.cl;
        const CD_flaps_base = flapIncrements.cd;

        // Airbrakes
        const airbrakeIncrements = this.getAirbrakeIncrements(aircraft, controls.brakes, onGround);
        const CL_brakes = airbrakeIncrements.cl;
        const CD_brakes = airbrakeIncrements.cd;

        // Effectivness
        const effAileron = controls.aileron * (controlEffectiveness.aileron ?? 1.0);
        const effElevator = controls.elevator * (controlEffectiveness.elevator ?? 1.0);
        const effRudder = controls.rudder * (controlEffectiveness.rudder ?? 1.0);

        // Lift (CL)
        const CL_stall_drop = Math.abs(alpha) > 0.3 ? -0.5 * Math.sin((Math.abs(alpha) - 0.3) * 5) : 0;
        let CL = aircraft.CL0 + aircraft.CLa * alpha + CL_flaps + CL_brakes + (effElevator * 0.3) + CL_stall_drop;

        // Drag (CD)
        // Ground Effect
        // Need height... passed in params? 
        // Let's assume ground effect factor is calculated outside or passed in.
        // For now, let's calculate it if height is provided, otherwise 1.0
        let groundEffectFactor = 1.0;
        if (params.heightAGL !== undefined) {
            const h = params.heightAGL;
            const b = aircraft.wingSpan;
            if (h < b) {
                const r = h / b;
                groundEffectFactor = (16 * r * r) / (1 + 16 * r * r);
                if (groundEffectFactor < 0.1) groundEffectFactor = 0.1;
            }
        }

        const CD_flaps = CD_flaps_base;
        const CD_gear = (controls.gear ? 1 : 0) * 0.015;
        const CD_elevator = Math.abs(effElevator) * 0.02;
        
        const CL_induced_calc = Math.min(Math.abs(CL), 1.35);
        const CD_induced = aircraft.K * CL_induced_calc * CL_induced_calc * groundEffectFactor;
        
        const CD = aircraft.CD0 + CD_induced + CD_flaps + CD_gear + CD_brakes + CD_elevator;

        // Side Force (CY)
        const CY = -0.5 * beta + (effRudder * 0.2);

        // Pitch Moment (Cm)
        const c = aircraft.chord;
        const b = aircraft.wingSpan;
        const pitch_damping = aircraft.Cmq * (rates.y * c) / (2 * (airspeed + 0.1));
        const Cm_flaps = controls.flaps * -0.01;
        
        const Cm = aircraft.Cm0 + (aircraft.Cma * alpha) + pitch_damping + (aircraft.Cde * (effElevator + controls.trim)) + Cm_flaps;

        // Roll Moment (Cl)
        const roll_damping = aircraft.Clp * (rates.x * b) / (2 * (airspeed + 0.1));
        let Cl = (aircraft.Clb * beta) + roll_damping + (aircraft.Cda * effAileron);

        // Yaw Moment (Cn)
        const yaw_damping = aircraft.Cnr * (rates.z * b) / (2 * (airspeed + 0.1));
        const Cn = (aircraft.Cnb * beta) + yaw_damping + (aircraft.Cdr * effRudder);

        // Yaw-Roll Coupling (Differential Lift)
        if (airspeed > 5 && Math.abs(rates.z) > 0.001) {
             const dCl_yaw = (CL * rates.z * b) / (8 * airspeed);
             Cl += dCl_yaw;
        }

        return { CL, CD, CY, Cm, Cl, Cn, F_lift: 0, F_drag: 0 }; // Forces calc next
    }

    calculateForcesAndMoments(params, coefficients) {
        const { aircraft, q, alpha } = params;
        const { CL, CD, CY, Cm, Cl, Cn } = coefficients;

        const S = aircraft.wingArea;
        const b = aircraft.wingSpan;
        const c = aircraft.chord;

        const F_lift = q * S * CL;
        const F_drag = q * S * CD;
        const F_side = q * S * CY;

        // Body Frame Forces
        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);
        
        const Fx = -F_drag * cosA + F_lift * sinA;
        const Fy = F_side;
        const Fz = -F_drag * sinA - F_lift * cosA;

        // Body Frame Moments
        const Mx = q * S * b * Cl;
        const My = q * S * c * Cm;
        const Mz = q * S * b * Cn;

        return {
            forces: new Vector3(Fx, Fy, Fz),
            moments: new Vector3(Mx, My, Mz),
            debug: { lift: F_lift, drag: F_drag, side: F_side }
        };
    }
}

export default new AerodynamicsEngine();

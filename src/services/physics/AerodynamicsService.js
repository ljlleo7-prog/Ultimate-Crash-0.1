import { Vector3, Quaternion } from '../../utils/flightMath.js';

export default class AerodynamicsService {
    getFlapIncrements(aircraft, controls) {
        const profile = aircraft.flapProfile;
        if (!profile?.positions?.length) return { cl: 0, cd: 0 };

        let flapInput = Math.max(0, Math.min(controls.flaps, profile.positions.length - 1));
        const idx1 = Math.floor(flapInput);
        const idx2 = Math.min(idx1 + 1, profile.positions.length - 1);
        const frac = flapInput - idx1;

        const pos1 = profile.positions[idx1];
        const pos2 = profile.positions[idx2];
        const cl = (pos1.clIncrement || 0) + ((pos2.clIncrement || 0) - (pos1.clIncrement || 0)) * frac;
        const cd = (pos1.cdIncrement || 0) + ((pos2.cdIncrement || 0) - (pos1.cdIncrement || 0)) * frac;

        return { cl, cd };
    }

    getAirbrakeIncrements(aircraft, controls, controlEffectiveness, onGround) {
        const profile = aircraft.airbrakeProfile;
        const effectiveness = controlEffectiveness.spoilers ?? 1.0;

        if (profile?.airPosition && !profile.positions) {
            const brakeInput = controls.brakes;
            if (brakeInput <= 1) return { cl: 0, cd: 0 };
            if (brakeInput === 2) {
                return { cl: profile.airPosition.clIncrement * effectiveness, cd: profile.airPosition.cdIncrement * effectiveness };
            }
            if (brakeInput === 3 && profile.groundPosition) {
                return { cl: profile.groundPosition.clIncrement * effectiveness, cd: profile.groundPosition.cdIncrement * effectiveness };
            }
            return { cl: 0, cd: 0 };
        }

        if (!profile?.positions?.length) return { cl: 0, cd: 0 };

        let brakeInput = Math.max(0, Math.min(controls.brakes, profile.positions.length - 1));
        const idx1 = Math.floor(brakeInput);
        const idx2 = Math.min(idx1 + 1, profile.positions.length - 1);
        const frac = brakeInput - idx1;

        const pos1 = profile.positions[idx1];
        const pos2 = profile.positions[idx2];
        const cl = ((pos1.clIncrement || 0) + ((pos2.clIncrement || 0) - (pos1.clIncrement || 0)) * frac) * effectiveness;
        const cd = ((pos1.cdIncrement || 0) + ((pos2.cdIncrement || 0) - (pos1.cdIncrement || 0)) * frac) * effectiveness;

        return { cl, cd };
    }

    calculateAerodynamicCoefficients(aircraft, controls, controlEffectiveness, failureParams, icingState, state, V_airspeed, alpha, beta, rates, q) {
        const flapIncrements = this.getFlapIncrements(aircraft, controls);
        const airbrakeIncrements = this.getAirbrakeIncrements(aircraft, controls, controlEffectiveness, state.onGround);

        const effAileron = controls.aileron * (controlEffectiveness.aileron ?? 1.0);
        const effElevator = controls.elevator * (controlEffectiveness.elevator ?? 1.0);
        const effRudder = controls.rudder * (controlEffectiveness.rudder ?? 1.0);

        const CL_stall_drop = Math.abs(alpha) > 0.3 ? -0.5 * Math.sin((Math.abs(alpha) - 0.3) * 5) : 0;
        let CL = aircraft.CL0 + aircraft.CLa * alpha + flapIncrements.cl + airbrakeIncrements.cl + (effElevator * 0.3) + CL_stall_drop;

        if (failureParams.aerodynamic_efficiency !== 1.0) CL *= failureParams.aerodynamic_efficiency;
        const icingLevel = icingState?.level || 0;
        if (icingLevel > 0) CL *= 1 - (0.3 * icingLevel);

        const h = -state.pos.z;
        const wingSpan = aircraft.wingSpan;
        let groundEffectFactor = 1.0;
        if (h < wingSpan) {
            const r = h / wingSpan;
            groundEffectFactor = Math.max(0.1, (16 * r * r) / (1 + 16 * r * r));
        }

        const CD_gear = controls.gear * 0.015;
        const CD_elevator = Math.abs(effElevator) * 0.02;
        const CL_induced_calc = Math.min(Math.abs(CL), 1.35);
        const CD_induced = aircraft.K * CL_induced_calc * CL_induced_calc * groundEffectFactor;

        let CD = aircraft.CD0 + CD_induced + flapIncrements.cd + CD_gear + airbrakeIncrements.cd + CD_elevator;
        if (icingLevel > 0) CD += 0.1 * icingLevel;

        const CY = -0.5 * beta + (effRudder * 0.2);

        const c = aircraft.chord;
        const b = aircraft.wingSpan;
        const pitch_damping = aircraft.Cmq * (rates.y * c) / (2 * (V_airspeed + 0.1));
        const Cm_flaps = controls.flaps * -0.01;
        const Cm = aircraft.Cm0 + (aircraft.Cma * alpha) + pitch_damping + (aircraft.Cde * (effElevator + controls.trim)) + Cm_flaps;

        const roll_damping = aircraft.Clp * (rates.x * b) / (2 * (V_airspeed + 0.1));
        let Cl = (aircraft.Clb * beta) + roll_damping + (aircraft.Cda * effAileron);

        const yaw_damping = aircraft.Cnr * (rates.z * b) / (2 * (V_airspeed + 0.1));
        const Cn = (aircraft.Cnb * beta) + yaw_damping + (aircraft.Cdr * effRudder);

        if (V_airspeed > 5 && Math.abs(rates.z) > 0.001) {
            const y_arm = b / 4;
            const r = rates.z;
            const dV_ratio = (r * y_arm) / V_airspeed;
            const dCl_yaw = (CL * r * b) / (8 * V_airspeed);
            Cl += dCl_yaw;
        }

        return { CL, CD, CY, Cm, Cl, Cn };
    }

    calculateAerodynamicsAndGround(state, env, aircraft, controls, controlEffectiveness, failureParams, icingState, engines) {
        const q_inv = new Quaternion(state.quat.w, -state.quat.x, -state.quat.y, -state.quat.z);
        const V_wind_body = q_inv.rotate(env.wind || new Vector3(0, 0, 0));

        let turbulence_body = new Vector3(0, 0, 0);
        if (env.turbulence > 0) {
            const turbScale = env.turbulence * 5.0;
            turbulence_body = new Vector3(
                (Math.random() * 2 - 1) * turbScale,
                (Math.random() * 2 - 1) * turbScale,
                (Math.random() * 2 - 1) * turbScale * 0.5
            );
        }

        const V_air_body = state.vel.sub(V_wind_body).sub(turbulence_body);
        const V_airspeed = V_air_body.magnitude();

        let alpha = 0, beta = 0;
        if (V_airspeed > 0.1) {
            alpha = Math.atan2(V_air_body.z, V_air_body.x);
            beta = Math.asin(Math.max(-1, Math.min(1, V_air_body.y / V_airspeed)));
        }

        const q = 0.5 * env.density * V_airspeed * V_airspeed;
        const coeffs = this.calculateAerodynamicCoefficients(aircraft, controls, controlEffectiveness, failureParams, icingState, state, V_airspeed, alpha, beta, state.rates, q);

        const S = aircraft.wingArea;
        const L = coeffs.CL * q * S;
        const D = coeffs.CD * q * S;
        const Y = coeffs.CY * q * S;

        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);
        const F_aero_body = new Vector3(-D * cosA + L * sinA, Y, -D * sinA - L * cosA);

        const b = aircraft.wingSpan;
        const c = aircraft.chord;
        const M_aero_body = new Vector3(coeffs.Cl * q * S * b, coeffs.Cm * q * S * c, coeffs.Cn * q * S * b);

        return { F_aero_body, M_aero_body, V_airspeed, alpha, beta, q, env };
    }
}

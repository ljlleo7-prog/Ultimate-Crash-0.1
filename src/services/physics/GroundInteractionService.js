import { Quaternion } from '../../utils/flightMath.js';

export default class GroundInteractionService {
    updateGroundStatus(state, runwayGeometry, terrainElevation, airportElevation) {
        if (!runwayGeometry) {
            const groundHeightAMSL = terrainElevation ?? airportElevation;
            return {
                groundStatus: { status: 'UNKNOWN', remainingLength: 0 },
                currentGroundZ: -(groundHeightAMSL - airportElevation)
            };
        }

        const { thresholdStart, heading, length, width } = runwayGeometry;
        const latRad = state.geo.lat * Math.PI / 180;
        const metersPerLat = 111132.92;
        const metersPerLon = 111412.84 * Math.cos(latRad);

        const dLat = state.geo.lat - thresholdStart.latitude;
        const dLon = state.geo.lon - thresholdStart.longitude;
        const x_north = dLat * metersPerLat;
        const y_east = dLon * metersPerLon;

        const hRad = heading * Math.PI / 180;
        const cosH = Math.cos(hRad);
        const sinH = Math.sin(hRad);
        const distAlong = x_north * cosH + y_east * sinH;
        const distCross = Math.abs(x_north * sinH - y_east * cosH);
        const speed = typeof state.vel?.magnitude === 'function' ? state.vel.magnitude() : 0;
        const nearGround = Math.abs(state.pos?.z ?? 0) <= 6;
        const lowSpeed = speed <= 35;
        const runwayWidthTolerance = nearGround && lowSpeed ? width : width / 2;
        const grassWidthTolerance = nearGround && lowSpeed ? width * 3 : width * 2;
        const alongBuffer = nearGround && lowSpeed ? 800 : 500;

        let status = 'OBJECTS';
        if (distAlong >= -50 && distAlong <= length + 50 && distCross <= runwayWidthTolerance) {
            status = 'RUNWAY';
        } else if (distAlong >= -alongBuffer && distAlong <= length + alongBuffer && distCross <= grassWidthTolerance) {
            status = 'GRASS';
        }

        let remaining = 0;
        if (distAlong < 0) remaining = length;
        else if (distAlong > length) remaining = 0;
        else remaining = length - distAlong;

        let groundHeightAMSL = airportElevation;
        if (status !== 'RUNWAY' && status !== 'GRASS' && terrainElevation !== null) {
            groundHeightAMSL = terrainElevation;
        }

        return {
            groundStatus: { status, remainingLength: remaining },
            currentGroundZ: -(groundHeightAMSL - airportElevation)
        };
    }

    applyRunwayStabilizer(state, runwayGeometry, onGround, groundStatus, difficulty) {
        if (difficulty === 'devil') return null;
        if (!onGround || groundStatus.status !== 'RUNWAY') return null;
        if (!runwayGeometry?.thresholdStart) return null;

        const geom = runwayGeometry;
        const lat0 = geom.thresholdStart.latitude;
        const lon0 = geom.thresholdStart.longitude;
        const latRad = lat0 * Math.PI / 180;
        const metersPerLat = 111132.92;
        const metersPerLon = 111412.84 * Math.cos(latRad);

        const dx = (state.geo.lat - lat0) * metersPerLat;
        const dy = (state.geo.lon - lon0) * metersPerLon;

        const headingRad = geom.heading * Math.PI / 180;
        const ux = Math.cos(headingRad);
        const uy = Math.sin(headingRad);
        const distAlong = dx * ux + dy * uy;
        const XTE = dy * ux - dx * uy;

        const euler = state.quat.toEuler();
        let headingDiff = euler.psi - headingRad;
        while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
        while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;

        if (difficulty === 'rookie') {
            const newDx = distAlong * ux;
            const newDy = distAlong * uy;
            state.geo.lat = lat0 + newDx / metersPerLat;
            state.geo.lon = lon0 + newDy / metersPerLon;
            state.quat = Quaternion.fromEuler(euler.phi, euler.theta, headingRad);
            state.vel.y = 0;
            state.rates.z = 0;
            return null;
        } else {
            const sideVel = state.vel.y;
            const k_lat = 5000;
            const c_lat = 10000;
            let F_y = -XTE * k_lat - sideVel * c_lat;
            const maxF = state.mass * 2.0;
            F_y = Math.max(-maxF, Math.min(maxF, F_y));

            const k_yaw = 500000;
            const c_yaw = 500000;
            let M_z = -headingDiff * k_yaw - state.rates.z * c_yaw;
            const maxM = 5000000;
            M_z = Math.max(-maxM, Math.min(maxM, M_z));

            return { Fy: F_y, Mz: M_z };
        }
    }

    getRunwayBrakingData(runwayGeometry = {}, environment = {}) {
        const stages = [
            { index: 1, label: 'NIL', brakeScale: 0.2, gripScale: 0.2 },
            { index: 2, label: 'POOR', brakeScale: 0.35, gripScale: 0.35 },
            { index: 3, label: 'MEDIUM/POOR', brakeScale: 0.5, gripScale: 0.5 },
            { index: 4, label: 'MEDIUM', brakeScale: 0.65, gripScale: 0.65 },
            { index: 5, label: 'GOOD/MEDIUM', brakeScale: 0.85, gripScale: 0.8 },
            { index: 6, label: 'GOOD', brakeScale: 1.0, gripScale: 1.0 }
        ];

        let stageIndex = 6;
        const runway = runwayGeometry || {};
        const env = environment || {};
        const tempC = Number.isFinite(env.temperature) ? env.temperature : null;
        const precip = env.precipitation || 0;
        const code = env.weatherCode || 0;
        const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
        const isFreezing = (code >= 56 && code <= 57) || (code >= 66 && code <= 67);

        if (typeof runway.brakingAction === 'string') {
            const value = runway.brakingAction.toLowerCase();
            if (value.includes('nil')) stageIndex = 1;
            else if (value.includes('poor')) stageIndex = value.includes('medium') ? 3 : 2;
            else if (value.includes('medium')) stageIndex = value.includes('good') ? 5 : 4;
            else if (value.includes('good')) stageIndex = 6;
        } else if (typeof runway.frictionCoefficient === 'number') {
            const mu = runway.frictionCoefficient;
            if (mu < 0.15) stageIndex = 1;
            else if (mu < 0.25) stageIndex = 2;
            else if (mu < 0.35) stageIndex = 3;
            else if (mu < 0.45) stageIndex = 4;
            else if (mu < 0.55) stageIndex = 5;
            else stageIndex = 6;
        } else {
            if (tempC !== null && tempC <= 0) {
                if (precip > 4 || isFreezing) stageIndex = 1;
                else if (precip > 1 || isSnow) stageIndex = 2;
                else if (precip > 0.2) stageIndex = 3;
                else stageIndex = 4;
            } else {
                if (precip > 6) stageIndex = 3;
                else if (precip > 2) stageIndex = 4;
                else if (precip > 0.2) stageIndex = 5;
                else stageIndex = 6;
            }
        }

        return stages[Math.max(0, Math.min(stages.length - 1, stageIndex - 1))];
    }
}

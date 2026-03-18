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

        let status = 'OBJECTS';
        if (distAlong >= 0 && distAlong <= length && distCross <= width / 2) {
            status = 'RUNWAY';
        } else if (distAlong >= -500 && distAlong <= length + 500 && distCross <= width * 2) {
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

    getRunwayBrakingData() {
        return [
            { index: 1, label: 'NIL', brakeScale: 0.2, gripScale: 0.2 },
            { index: 2, label: 'POOR', brakeScale: 0.35, gripScale: 0.35 },
            { index: 3, label: 'MEDIUM/POOR', brakeScale: 0.5, gripScale: 0.5 },
            { index: 4, label: 'MEDIUM', brakeScale: 0.65, gripScale: 0.65 },
            { index: 5, label: 'GOOD/MEDIUM', brakeScale: 0.85, gripScale: 0.8 },
            { index: 6, label: 'GOOD', brakeScale: 1.0, gripScale: 1.0 }
        ];
    }
}

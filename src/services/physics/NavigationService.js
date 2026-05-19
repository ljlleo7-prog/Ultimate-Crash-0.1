import {
    calculateBearing,
    calculateDistanceMeters,
    buildFlyByTurn,
    sampleFlyByRoute,
    projectToLocalMeters,
    normalizeHeadingDegrees,
    normalizeSignedHeadingDelta,
    clamp
} from '../../utils/flightMath.js';

export default class NavigationService {
    constructor() {
        this.flightPlan = [];
        this.currentWaypointIndex = 0;
        this.lastPath = [];
        this.lastGuidance = null;
    }

    updateFlightPlan(flightPlan, currentWaypointIndex) {
        let newWaypoints = [];
        if (Array.isArray(flightPlan)) {
            newWaypoints = flightPlan;
        } else if (flightPlan?.waypoints) {
            newWaypoints = flightPlan.waypoints;
        }

        const preserveIndex = Array.isArray(this.flightPlan) && this.flightPlan.length === newWaypoints.length;
        const fallbackIndex = Number.isInteger(currentWaypointIndex) ? currentWaypointIndex : this.currentWaypointIndex;
        const newIndex = preserveIndex ? fallbackIndex : 0;

        this.flightPlan = newWaypoints;
        this.currentWaypointIndex = Math.min(newIndex, Math.max(0, newWaypoints.length - 1));
        this.lastPath = sampleFlyByRoute(this.flightPlan);

        return {
            flightPlan: this.flightPlan,
            currentWaypointIndex: this.currentWaypointIndex,
            navigationPath: this.lastPath
        };
    }

    update(state = {}, options = {}) {
        const waypoints = Array.isArray(options.flightPlan) ? options.flightPlan : this.flightPlan;
        const hasPosition = Number.isFinite(state.latitude) && Number.isFinite(state.longitude);
        if (!hasPosition || waypoints.length === 0) {
            this.lastGuidance = {
                currentWaypointIndex: 0,
                targetHeading: null,
                activeWaypoint: null,
                navigationPath: sampleFlyByRoute(waypoints),
                activeTurn: null
            };
            return this.lastGuidance;
        }

        this.flightPlan = waypoints;
        if (!Number.isInteger(this.currentWaypointIndex)) {
            this.currentWaypointIndex = waypoints.length > 1 ? 1 : 0;
        }
        this.currentWaypointIndex = clamp(this.currentWaypointIndex, 0, Math.max(0, waypoints.length - 1));

        if (waypoints.length > 1 && this.currentWaypointIndex === 0) {
            this.currentWaypointIndex = 1;
        }

        const guidance = this.computeGuidance(state, options);
        this.currentWaypointIndex = guidance.currentWaypointIndex;
        this.lastPath = guidance.navigationPath;
        this.lastGuidance = guidance;
        return guidance;
    }

    computeGuidance(state, options) {
        const waypoints = this.flightPlan;
        let activeIndex = clamp(this.currentWaypointIndex, 0, Math.max(0, waypoints.length - 1));
        let activeWaypoint = waypoints[activeIndex] || null;

        if (!activeWaypoint) {
            return {
                currentWaypointIndex: 0,
                targetHeading: null,
                activeWaypoint: null,
                navigationPath: sampleFlyByRoute(waypoints),
                activeTurn: null
            };
        }

        const navigationPath = sampleFlyByRoute(waypoints, options);
        const currentPosition = { latitude: state.latitude, longitude: state.longitude };
        let distToWaypoint = calculateDistanceMeters(state.latitude, state.longitude, activeWaypoint.latitude, activeWaypoint.longitude);
        let previousWaypoint = activeIndex > 0 ? waypoints[activeIndex - 1] : null;
        let nextWaypoint = activeIndex < waypoints.length - 1 ? waypoints[activeIndex + 1] : null;
        let activeTurn = (!activeWaypoint?.isHold && previousWaypoint && nextWaypoint)
            ? buildFlyByTurn(previousWaypoint, activeWaypoint, nextWaypoint, options)
            : null;

        if (!activeWaypoint?.isHold && activeTurn) {
            const afterTurn = this.isPastTurnExit(currentPosition, activeTurn, nextWaypoint);
            if (afterTurn && activeIndex < waypoints.length - 1) {
                activeIndex += 1;
                activeWaypoint = waypoints[activeIndex] || activeWaypoint;
                previousWaypoint = activeIndex > 0 ? waypoints[activeIndex - 1] : null;
                nextWaypoint = activeIndex < waypoints.length - 1 ? waypoints[activeIndex + 1] : null;
                distToWaypoint = calculateDistanceMeters(state.latitude, state.longitude, activeWaypoint.latitude, activeWaypoint.longitude);
                activeTurn = (!activeWaypoint?.isHold && previousWaypoint && nextWaypoint)
                    ? buildFlyByTurn(previousWaypoint, activeWaypoint, nextWaypoint, options)
                    : null;
            }
        }

        if (!activeWaypoint?.isHold && !activeTurn) {
            const movingAway = Number.isFinite(options.previousDistanceToWaypoint)
                ? distToWaypoint > options.previousDistanceToWaypoint + 50
                : false;
            const wasClose = distToWaypoint < 4000;
            if ((distToWaypoint < 2000 || (movingAway && wasClose)) && activeIndex < waypoints.length - 1) {
                activeIndex += 1;
                activeWaypoint = waypoints[activeIndex] || activeWaypoint;
                previousWaypoint = activeIndex > 0 ? waypoints[activeIndex - 1] : null;
                nextWaypoint = activeIndex < waypoints.length - 1 ? waypoints[activeIndex + 1] : null;
                distToWaypoint = calculateDistanceMeters(state.latitude, state.longitude, activeWaypoint.latitude, activeWaypoint.longitude);
                activeTurn = (!activeWaypoint?.isHold && previousWaypoint && nextWaypoint)
                    ? buildFlyByTurn(previousWaypoint, activeWaypoint, nextWaypoint, options)
                    : null;
            }
        }

        const targetHeading = activeWaypoint?.isHold
            ? this.computeHoldHeading(currentPosition, activeWaypoint)
            : this.computeTargetHeading(currentPosition, previousWaypoint, activeWaypoint, nextWaypoint, activeTurn);

        return {
            currentWaypointIndex: activeIndex,
            targetHeading,
            activeWaypoint,
            distanceToWaypoint: distToWaypoint,
            navigationPath,
            activeTurn
        };
    }

    computeHoldHeading(currentPosition, waypoint) {
        const bearing = calculateBearing(currentPosition.latitude, currentPosition.longitude, waypoint.latitude, waypoint.longitude);
        const distance = calculateDistanceMeters(currentPosition.latitude, currentPosition.longitude, waypoint.latitude, waypoint.longitude);
        const holdRadius = 3000;
        const convergenceGain = 0.001;
        const distError = distance - holdRadius;
        const correction = Math.atan(distError * convergenceGain);
        return normalizeHeadingDegrees(bearing + 90 - (correction * 180 / Math.PI));
    }

    computeTargetHeading(currentPosition, previousWaypoint, activeWaypoint, nextWaypoint, activeTurn) {
        if (!activeWaypoint) return null;
        if (!activeTurn || !previousWaypoint || !nextWaypoint) {
            return calculateBearing(currentPosition.latitude, currentPosition.longitude, activeWaypoint.latitude, activeWaypoint.longitude);
        }

        const entryDistance = calculateDistanceMeters(
            currentPosition.latitude,
            currentPosition.longitude,
            activeTurn.entry.latitude,
            activeTurn.entry.longitude
        );
        if (entryDistance > 250) {
            return calculateBearing(currentPosition.latitude, currentPosition.longitude, activeTurn.entry.latitude, activeTurn.entry.longitude);
        }

        const progress = this.getTurnProgress(currentPosition, activeTurn);
        const tangentHeading = activeTurn.inboundCourseDeg + progress * normalizeSignedHeadingDelta(activeTurn.outboundCourseDeg - activeTurn.inboundCourseDeg);
        const exitDistance = calculateDistanceMeters(
            currentPosition.latitude,
            currentPosition.longitude,
            activeTurn.exit.latitude,
            activeTurn.exit.longitude
        );
        if (exitDistance < 250) {
            return activeTurn.outboundCourseDeg;
        }

        return normalizeHeadingDegrees(tangentHeading);
    }

    getTurnProgress(currentPosition, turn) {
        const local = projectToLocalMeters(turn.referenceLat, turn.referenceLon, currentPosition.latitude, currentPosition.longitude);
        const angle = Math.atan2(local.y - turn.center.y, local.x - turn.center.x);
        if (turn.turnDirection === 'left') {
            const total = turn.endAngle - turn.startAngle;
            const travelled = clamp(angle >= turn.startAngle ? angle - turn.startAngle : angle + Math.PI * 2 - turn.startAngle, 0, total);
            return total > 1e-6 ? travelled / total : 0;
        }
        const total = turn.startAngle - turn.endAngle;
        const travelled = clamp(angle <= turn.startAngle ? turn.startAngle - angle : turn.startAngle + Math.PI * 2 - angle, 0, total);
        return total > 1e-6 ? travelled / total : 0;
    }

    isPastTurnExit(currentPosition, turn, nextWaypoint) {
        if (!turn || !nextWaypoint) return false;
        const referenceLat = turn.exit.latitude;
        const referenceLon = turn.exit.longitude;
        const nextLocal = projectToLocalMeters(referenceLat, referenceLon, nextWaypoint.latitude, nextWaypoint.longitude);
        const currentLocal = projectToLocalMeters(referenceLat, referenceLon, currentPosition.latitude, currentPosition.longitude);
        const direction = Math.hypot(nextLocal.x, nextLocal.y);
        if (direction < 1e-6) return false;
        const unitX = nextLocal.x / direction;
        const unitY = nextLocal.y / direction;
        const alongTrack = currentLocal.x * unitX + currentLocal.y * unitY;
        return alongTrack > 50;
    }
}

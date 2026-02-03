import { calculateDistanceMeters, calculateBearing } from '../utils/flightMath.js';

class NavigationService {
    constructor() {
        this.flightPlan = [];
        this.currentWaypointIndex = 0;
        this._prevDistToWaypoint = Infinity;
    }

    updateFlightPlan(newFlightPlan) {
        console.log('🔄 Navigation Service: Updating Flight Plan', newFlightPlan);
        
        let newWaypoints = [];
        if (Array.isArray(newFlightPlan)) {
            newWaypoints = newFlightPlan;
        } else if (newFlightPlan && Array.isArray(newFlightPlan.waypoints)) {
            newWaypoints = newFlightPlan.waypoints;
        } else {
            console.warn('⚠️ Navigation Service: Invalid flight plan format');
            this.flightPlan = [];
            return;
        }
        
        // Smart Index Preservation
        const preserveIndex = (this.flightPlan && this.flightPlan.length === newWaypoints.length);
        const oldIndex = this.currentWaypointIndex;

        this.flightPlan = newWaypoints;
        
        if (preserveIndex) {
            this.currentWaypointIndex = oldIndex;
        } else {
            this.currentWaypointIndex = 0;
            this._prevDistToWaypoint = Infinity;
        }
        
        if (this.currentWaypointIndex >= this.flightPlan.length) {
            this.currentWaypointIndex = Math.max(0, this.flightPlan.length - 1);
        }
    }

    getCurrentWaypoint() {
        if (!this.flightPlan || this.currentWaypointIndex >= this.flightPlan.length) return null;
        return this.flightPlan[this.currentWaypointIndex];
    }

    /**
     * Updates navigation state (waypoint sequencing, LNAV calculations)
     * @param {Object} currentGeo - { lat, lon }
     * @param {Object} autopilot - Reference to autopilot service to set targets
     * @returns {Object|null} - Returns desired heading if LNAV is active, or null
     */
    update(currentGeo, autopilot) {
        if (!this.flightPlan || this.flightPlan.length === 0) return null;
        if (this.currentWaypointIndex >= this.flightPlan.length) return null;

        const nextWaypoint = this.flightPlan[this.currentWaypointIndex];
        const dist = calculateDistanceMeters(currentGeo.lat, currentGeo.lon, nextWaypoint.latitude, nextWaypoint.longitude);
        const bearingDeg = calculateBearing(currentGeo.lat, currentGeo.lon, nextWaypoint.latitude, nextWaypoint.longitude);
        const bearingRad = bearingDeg * Math.PI / 180;

        // Waypoint Sequencing Logic
        const isMovingAway = dist > this._prevDistToWaypoint;
        this._prevDistToWaypoint = dist;
        
        const wasClose = dist < 5000; // 5km threshold for "was close" logic

        // Sequence if:
        // 1. Within 2km (Fly-over)
        // 2. Moving away and was close (Fly-by / Passed)
        // 3. Not a HOLD waypoint
        if ((dist < 2000 || (isMovingAway && wasClose)) && !nextWaypoint.isHold) {
            this.currentWaypointIndex++;
            this._prevDistToWaypoint = Infinity;
            console.log(`📍 Navigation Service: Reached/Passed waypoint ${nextWaypoint.label || this.currentWaypointIndex - 1}. Sequencing to index ${this.currentWaypointIndex}`);
            
            // Recursive call to handle next waypoint immediately if valid
            if (this.currentWaypointIndex < this.flightPlan.length) {
                return this.update(currentGeo, autopilot);
            }
            return null;
        }

        // LNAV Logic
        if (autopilot && autopilot.mode === 'LNAV') {
            if (nextWaypoint.isHold) {
                // HOLD PATTERN LOGIC (Right Turn Orbit)
                const HOLD_RADIUS = 3000; // 3km radius
                const CONVERGENCE_GAIN = 0.001;
                
                // Calculate relative bearing
                // If we want to orbit at radius R:
                // Error = Dist - R
                // Correction = Error * Gain (Max 90 deg)
                const distError = dist - HOLD_RADIUS;
                let correction = distError * CONVERGENCE_GAIN;
                if (correction > Math.PI / 2) correction = Math.PI / 2;
                if (correction < -Math.PI / 2) correction = -Math.PI / 2;
                
                // Tangent Heading logic:
                // Bearing + 90 (Right Turn) - Correction
                const tangentHeadingRad = bearingRad + (Math.PI / 2) - correction;
                const tangentHeadingDeg = tangentHeadingRad * 180 / Math.PI;
                
                autopilot.setTargets({ heading: tangentHeadingDeg });
                return tangentHeadingDeg;
            } else {
                // NORMAL LNAV
                // Simple bearing to waypoint
                autopilot.setTargets({ heading: bearingDeg });
                return bearingDeg;
            }
        }
        
        return null;
    }

    /**
     * Get serializable state for save system
     */
    getState() {
        return {
            flightPlan: this.flightPlan,
            currentWaypointIndex: this.currentWaypointIndex,
            prevDistToWaypoint: this._prevDistToWaypoint
        };
    }

    /**
     * Restore state from save file
     */
    loadState(data) {
        if (!data) return;
        
        if (data.flightPlan) this.flightPlan = data.flightPlan;
        if (typeof data.currentWaypointIndex === 'number') this.currentWaypointIndex = data.currentWaypointIndex;
        if (typeof data.prevDistToWaypoint === 'number') this._prevDistToWaypoint = data.prevDistToWaypoint;
        
        console.log('📍 Navigation Service: State Loaded', {
            waypoints: this.flightPlan.length,
            currentIndex: this.currentWaypointIndex
        });
    }
}

export default NavigationService;

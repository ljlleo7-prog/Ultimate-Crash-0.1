
import { airportService } from '../airportService';
import { GeoUtils } from '../../utils/physics/GeoUtils';

export class NavigationSystem {
    constructor() {
        this.flightPlan = [];
        this.currentWaypointIndex = 0;
        this.runwayGeometry = null;
        
        // Internal state for sequencing
        this._lastWaypointIndex = -1;
        this._prevDistToWaypoint = Infinity;
        
        this.ilsDebug = {
            active: false,
            distAlong: 0,
            distCross: 0,
            altError: 0,
            targetAltitude: 0
        };
    }

    setFlightPlan(plan) {
        this.flightPlan = plan || [];
        this.currentWaypointIndex = (this.flightPlan.length > 1) ? 1 : 0;
        this._prevDistToWaypoint = Infinity;
    }

    setRunwayGeometry(geometry) {
        this.runwayGeometry = geometry;
    }

    update(state, dt) {
        const { lat, lon, altitude } = state;
        
        // 1. Waypoint Sequencing
        this._handleWaypointSequencing(lat, lon);
        
        // 2. ILS / Approach Calculations
        this._calculateILS(lat, lon, altitude);
        
        return {
            currentWaypointIndex: this.currentWaypointIndex,
            ilsDebug: this.ilsDebug,
            targetHeading: this._calculateTargetHeading(lat, lon)
        };
    }

    _handleWaypointSequencing(lat, lon) {
        if (!this.flightPlan || this.flightPlan.length === 0) return;
        
        if (this.currentWaypointIndex < this.flightPlan.length) {
            const nextWaypoint = this.flightPlan[this.currentWaypointIndex];
            const dist = GeoUtils.calculateDistance(lat, lon, nextWaypoint.latitude, nextWaypoint.longitude);
            
            if (this._lastWaypointIndex !== this.currentWaypointIndex) {
                this._prevDistToWaypoint = dist;
                this._lastWaypointIndex = this.currentWaypointIndex;
            }
            
            const isMovingAway = (dist > (this._prevDistToWaypoint || dist) + 50);
            const wasClose = dist < 4000;
            
            this._prevDistToWaypoint = dist;

            if ((dist < 2000 || (isMovingAway && wasClose)) && !nextWaypoint.isHold) {
                this.currentWaypointIndex++;
                this._prevDistToWaypoint = Infinity; 
                console.log(`📍 Navigation: Reached/Passed waypoint ${nextWaypoint.label || this.currentWaypointIndex - 1}. Sequencing to index ${this.currentWaypointIndex}`);
            }

            // Auto-select runway logic
            if (this.currentWaypointIndex < this.flightPlan.length) {
                const targetWP = this.flightPlan[this.currentWaypointIndex];
                if ((targetWP.type === 'airport' || targetWP.type === 'runway') && targetWP.selectedRunway && targetWP.details) {
                    const airportCode = targetWP.details.iata || targetWP.details.icao || targetWP.label;
                    if (!this.runwayGeometry || (this.runwayGeometry.runwayName !== targetWP.selectedRunway && this.runwayGeometry.airportCode !== airportCode)) {
                         const geom = airportService.getRunwayGeometry(airportCode, targetWP.selectedRunway);
                         if (geom) {
                             this.setRunwayGeometry(geom);
                             console.log(`📍 Navigation: Auto-selected runway ${targetWP.selectedRunway} at ${airportCode}`);
                         }
                    }
                }
            }
        }
    }

    _calculateTargetHeading(lat, lon) {
        if (!this.flightPlan || this.currentWaypointIndex >= this.flightPlan.length) return null;

        const targetWP = this.flightPlan[this.currentWaypointIndex];
        const bearing = GeoUtils.calculateBearing(lat, lon, targetWP.latitude, targetWP.longitude);
        
        if (targetWP.isHold) {
            const dist = GeoUtils.calculateDistance(lat, lon, targetWP.latitude, targetWP.longitude);
            const HOLD_RADIUS = 3000;
            const CONVERGENCE_GAIN = 0.001;
            const distError = dist - HOLD_RADIUS;
            const correction = Math.atan(distError * CONVERGENCE_GAIN);
            let targetHeading = bearing + 90 - (correction * 180 / Math.PI);
            return (targetHeading + 360) % 360;
        } else {
            return bearing;
        }
    }

    _calculateILS(lat, lon, altitude) {
        if (!this.runwayGeometry) {
            this.ilsDebug.active = false;
            return;
        }

        const { thresholdStart, heading: runwayHeading } = this.runwayGeometry;
             
        // Convert Geo to Meters relative to Threshold
        const latRad = thresholdStart.latitude * Math.PI / 180;
        const metersPerLat = 111132.92;
        const metersPerLon = 111412.84 * Math.cos(latRad);
        
        const dx = (lat - thresholdStart.latitude) * metersPerLat;
        const dy = (lon - thresholdStart.longitude) * metersPerLon;
        
        const rH = runwayHeading * Math.PI / 180;
        const ux = Math.cos(rH);
        const uy = Math.sin(rH);
        
        // Distance ALONG the runway (positive = past threshold, negative = approaching)
        const distAlong = dx * ux + dy * uy;
        
        // Cross Track Error (positive = right of centerline)
        const distCross = -dx * uy + dy * ux;
        
        // Glideslope (VNAV)
        const distToThresholdFt = -distAlong * 3.28084;
        
        let targetAltitude = altitude; 
        
        // Active Zone: Approaching (dist > 0) and within reasonable range (< 20nm)
        if (distToThresholdFt > 0 && distToThresholdFt < 120000) {
           targetAltitude = 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
        } else if (distToThresholdFt <= 0 && distToThresholdFt > -10000) {
            // Over runway: Flare / Hold 50ft
            targetAltitude = 50;
        }
        
        const altError = targetAltitude - altitude;
        
        this.ilsDebug = {
            active: true,
            runway: this.runwayGeometry.runwayName,
            distAlong: distAlong * 3.28084, // ft
            distCross: distCross * 3.28084, // ft
            altError: altError,
            targetAltitude,
            runwayHeading // Exported for Autopilot use
        };
    }
}

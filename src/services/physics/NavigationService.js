export default class NavigationService {
    updateFlightPlan(flightPlan, currentWaypointIndex) {
        let newWaypoints = [];
        if (Array.isArray(flightPlan)) {
            newWaypoints = flightPlan;
        } else if (flightPlan?.waypoints) {
            newWaypoints = flightPlan.waypoints;
        }

        const preserveIndex = flightPlan && flightPlan.length === newWaypoints.length;
        const newIndex = preserveIndex ? currentWaypointIndex : 0;

        return {
            flightPlan: newWaypoints,
            currentWaypointIndex: Math.min(newIndex, Math.max(0, newWaypoints.length - 1))
        };
    }
}

I will implement the spherical navigation and waypoint system as requested.

### 1. Route Generation (Spherical & Waypoints)
I will enhance `src/utils/routeGenerator.js` and `src/utils/distanceCalculator.js` to:
*   Implement **Great Circle Path** calculation to interpolate points between airports.
*   Create a `generateRouteWaypoints(start, end)` function that:
    *   Ensures at least **4 intermediate waypoints**.
    *   Ensures additional waypoints are added so no segment exceeds **800km**.
    *   Calculates accurate **Latitude/Longitude** for each waypoint.
*   Update `calculateFlightPlan` to include this list of generated waypoints.

### 2. Flight Physics & Navigation (LNAV)
I will modify `src/services/newFlightPhysicsService.js` to:
*   **State**: Add `latitude`, `longitude`, and `flightPlan` (waypoint list) to the aircraft state.
*   **Initialization**: Update `setInitialConditions` to accept the airport's coordinate as the starting position and align the initial heading with the runway.
*   **Position Update**: Verify `_convertMetersToLatLon` correctly updates the spherical position based on speed and heading.
*   **Autopilot Logic**:
    *   Implement **Lateral Navigation (LNAV)** in `calculateAutopilotControls`.
    *   Calculate the **Bearing** to the next waypoint.
    *   Feed the bearing error into the **Heading PID Controller**.
    *   Implement the missing Heading-to-Roll control logic.
    *   **Bank Angle Limit**: Clamp the autopilot's output roll to **±15 degrees** (approx 0.26 radians) as requested.
    *   Add logic to automatically switch to the next waypoint when the aircraft is within a certain radius (e.g., 2km).

### 3. Runway Alignment
*   I will add a helper to parse the runway heading from its name (e.g., "09L" -> 90°) to ensure the plane lines up correctly at initialization.

### File Changes
*   `src/utils/routeGenerator.js`: Add waypoint generation logic.
*   `src/utils/distanceCalculator.js`: Integrate waypoint generation into the flight plan.
*   `src/services/newFlightPhysicsService.js`: Implement LNAV, Heading PID, and spherical position tracking.

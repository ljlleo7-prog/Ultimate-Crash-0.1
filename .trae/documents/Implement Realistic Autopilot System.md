# Create Realistic Autopilot Service

I will create a new, separated autopilot system specifically for the `RealisticFlightPhysicsService` that uses control surfaces (Elevator, Trim) and Throttle to achieve smooth Speed and Vertical Speed (VS) control.

## 1. Create `RealisticAutopilotService.js`

Create a new service file `src/services/RealisticAutopilotService.js` containing:

* **PIDController Class**: A robust PID implementation with anti-windup and output clamping.

* **RealisticAutopilotService Class**:

  * **State**: Maintains its own internal state (integrators, last errors).

  * **Inputs**: Current physics state (Speed, VS, Pitch, Roll, Altitude) and Targets.

  * **Logic**:

    * **Auto-Throttle**: PID controlling Throttle based on Airspeed error.

    * **VS Mode**: Cascaded PID controller:

      * *Outer Loop*: Target VS (limited to -2000ft/s\~3000ft/s) → Target Pitch Attitude.

      * *Inner Loop*: Target Pitch → Elevator Command.

    * **Auto-Trim**: Logic to slowly move the Trim Wheel to offload the Elevator (if Elevator > threshold, move Trim and center Elevator).

  * **Outputs**: `throttle`, `elevator`, `trim`, `aileron` (for bank hold/leveling).

## 2. Integrate into `RealisticFlightPhysicsService.js`

Modify `src/services/RealisticFlightPhysicsService.js` to:

* Import and instantiate `RealisticAutopilotService`.

* Add methods to engage/disengage and set targets.

* In the `update()` loop (specifically `processInputs` or before integration), check if AP is engaged.

* If engaged, calculate AP control outputs and **override** the manual user inputs for the relevant channels (Pitch/Trim/Throttle).

* Ensure the Trim Wheel changes are reflected in the `this.controls.trim` state so the user sees the wheel moving (if UI connected).

## 3. Update `useAircraftPhysics.js`

* Ensure the hook properly passes the autopilot engagement state and targets to the `RealisticFlightPhysicsService`.

* Currently, the hook handles some AP logic; we will delegate the *calculation* entirely to the new service, but the hook will still manage the high-level "On/Off" toggle.

## 4. Verification

* Create a test script (or use `test_physics.js`) to verify:

  * Engaging AP at a specific Speed/VS.

  * Observing Throttle moving to maintain speed.

  * Observing Elevator/Trim moving to maintain VS.

  * Ensuring smooth transitions (no jumps).

## Key Features

* **Smoothness**: Using `dt` correctly in PIDs and rate-limiting outputs.

* **Trim Interaction**: The AP will actively drive the trim state, effectively "using the trim wheel" to fly the plane.

* **Separation**: Logic resides in its own class, keeping the physics engine clean.


I will refactor the engine management system to ensure complete independence of engine states and accurate torque calculations.

### 1. Refactor `RealisticFlightPhysicsService.js`

* **State Initialization**: Initialize `this.controls.engineThrottles` as an array matching `engineCount` in the constructor.

* **Input Processing (`processInputs`)**:

  * Update logic to handle `input.throttles` (array) explicitly.

  * Implement independent smoothing for each engine throttle.

  * Logic: If individual `throttles` are provided, use them. If only master `throttle` is provided, sync all engines to master.

* **Engine Update Loop (`updateEngines`)**:

  * Remove legacy fallback checks (e.g., `throttle1`, `throttle2`).

  * Pass the explicit `this.controls.engineThrottles[i]` to each engine instance.

* **Physics Calculation**:

  * Confirm and preserve the existing `pos.cross(thrustVector)` logic for torque generation, ensuring it uses the now-independent thrust values.

  * Remove any hard-coded defaults that might interfere with differential thrust.

### 2. Refactor `EnginePhysicsService.js`

* **Encapsulation**: Add explicit methods for setting throttle commands to improve state isolation.

* **Reverse Logic**: handle reverse on/off individually on engines, while preserving the legacy mappings of throttle-reverse -> +-thrust

* **N1/N2 Independence**: Ensure N1 and N2 dynamics are calculated strictly per-instance without any shared static variables or "synced" shortcuts.

### 3. Verification

* Verify that `thrustMomentYaw` (yaw torque) correctly reflects differential thrust (e.g., left engine high, right engine low).

* Verify that engine states (N1, EGT) can diverge based on individual inputs.


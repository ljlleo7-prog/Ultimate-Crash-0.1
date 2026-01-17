I will implement a comprehensive failure simulation system that introduces 5 typical aircraft failures with difficulty-based triggers and realistic impacts.

### 1. New Failure System Service

Create `src/services/FailureSystem.js` to manage failure states and logic:

* **Failure Types**:

  1. **Engine Failure**: Complete loss of thrust in one or both engines.

     1. For Rookie, this will not happen.
     2. For Amateur, a single engine complete failure will be triggered when altitude > 3000ft, but frequent restart will work.
     3. For Intermediate, a single or dual engine failure might be triggered when altitude>1000ft, and frequent restart might or might not work.
     4. For Advanced and above, a single or dual engine failure might happen at any time.
  2. **Hydraulic Failure**: Loss of control surface effectiveness, stuck flaps/gear.

     1. Easy: single loss of control or single hydraulic power low
     2. Hard: complete hydraulic failure (control inoperative, gear lagging)
  3. **Pitot-Static Blockage**: Erroneous or frozen airspeed readings (icing).
  4. **Fuel Leak**: Rapid fuel depletion leading to engine starvation.
  5. **Control Surface Jam**: Elevator or aileron stuck at current position.

     1. Only for professional+, this can be triggered at any phase; others this will be triggered during cruize or approach. Rookie will not encounter this.

* **Logic**:

  * `update(dt, flightState)`: Evaluates probabilistic triggers based on difficulty, aircraft status (e.g., high throttle, icing conditions), and random chance.

  * `applyImpact(physicsService)`: Modifies the physics service state directly (e.g., shutting down engines, clamping control inputs, draining fuel).

We also want this to link to the scene. manager for narrative management.

### 2. Integrate with Physics Engine

Modify `src/services/RealisticFlightPhysicsService.js`:

* Initialize `FailureSystem` in the constructor.

* In the main `update()` loop, call `failureSystem.update()` to check for new failures.

* Call `failureSystem.applyImpact(this)` to enforce failure effects on aerodynamics, engines, and controls before physics integration.

* Update `calculateAirspeeds` to account for Pitot-Static failures.

### 3. Connect UI and Configuration

* **Modify** **`src/components/FlightInProgress.jsx`**: Pass `difficulty` and `failureType` props into the `aircraftConfig` object sent to the physics hook.

* **Modify** **`src/hooks/useAircraftPhysics.js`**: Extract these configuration parameters and pass them to `RealisticFlightPhysicsService.setInitialConditions`.

### 4. Implementation Details

* **Trigger Logic**:

  * *Rookie*: Failures occur but rather subtle.

  * *Pro/Devil*: multiple simultaneous failures possible.

  * *Contextual*: Pitot blockage triggers in "icing" conditions (simulated by low temp); Engine failure chance increases at max throttle/high EGT.

* **Impact Logic**:

  * *Hydraulics*: Reduces control surface deflection rates and coefficients in `calculateAerodynamicsAndGround`.

  * *Fuel Leak*: Multiplies fuel flow in `updateEngines`.

This approach ensures failures are physically simulated rather than just scripted events, affecting the flight model realistically.

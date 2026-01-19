I will re-implement the narrative flow and flight stages to create a cinematic tragedy experience.

### 1. Flight Stages & Narrative Structure

I will update `src/services/sceneManager.js` to define the following sequential phases. Each phase will have specific physics rules (active/inactive) and narrative templates.

Quick note: as difficulty/professionality grows, the required actions (start up, checklist, etc.) will be increasing.

Quick note: incident might not have to occur during cruize, during TO, CLB, DES, APP, and LDG they can happen as well. Rookie failures often occur during cruize, during the most stable stage.

| Phase              | Physics | Narrative Focus                                  | Transition Logic                       |
| ------------------ | ------- | ------------------------------------------------ | -------------------------------------- |
| **GATE**           | **OFF** | Boarding, Pilot checks, "Something feels off..." | Timer (10s)                            |
| **PUSHBACK**       | **OFF** | Ground crew comms, Engine start prep             | Timer (15s)                            |
| **TAXI\_OUT**      | **OFF** | Taxiing to runway (Cinematic/Skipped)            | Timer (10s)                            |
| **TAKEOFF\_PREP**  | **ON**  | "Hold short", Engine run-up, Spooky premonition  | User Input / Timer                     |
| **TAKEOFF**        | **ON**  | "Rotate", "Positive Rate"                        | Alt > 1000ft                           |
| **LOW\_CLIMB**     | **ON**  | Manual control, passing 3000ft                   | Alt > 5000ft                           |
| **HIGH\_CLIMB**    | **ON**  | **Fast-Forward Event**: "Climbing to cruise..."  | **Teleport** to FL200 and Timer 15-20s |
| **CRUISE**         | **ON**  | Smooth flight... then **INCIDENT**               | Timer + Incident Trigger               |
| **HIGH\_DESCENT**  | **ON**  | **Fast-Forward Event**: "Descending..."          | **Teleport** to 10000ft                |
| **FINAL\_DESCENT** | **ON**  | Approach checklist, worsening conditions         | Alt < 3000ft                           |
| **APPROACH**       | **ON**  | ILS capture, tension peaks                       | Alt < 500ft                            |
| **LANDING**        | **ON**  | Touchdown, reverse thrust                        | Speed < 30kts                          |
| **TAXI\_IN**       | **OFF** | Taxi to gate (Cinematic)                         | Timer (10s)                            |
| **SHUTDOWN**       | **OFF** | Engines off, debrief                             | End                                    |

### 2. Cinematic "Fast-Forward" Logic

I will implement a **State Fast Simulation System** in `SceneManager` to handle "skipping" boring parts while maintaining immersion.

* **Mechanism**: If the plane is in dynamic (climb, descend), it will fast simulate physics async using 20x dt, and if the plane is stationary (cruizing), just teleport it based off the time lapse and flight path.

* **Visuals**: Trigger a `FadeOverlay` (fade to black) with a time-lapse sound effect or narrative text like *"20 minutes later..."* during the skip.

### 3. Spooky Narrative & Incident System

I will enhance `SceneManager` to support **Pre-Incident Narratives**.

* **Look-ahead**: The system will peek at upcoming failures in the current phase.

* **Foreshadowing**: 10-30 seconds *before* a failure triggers, a spooky narrative will play (e.g., *"Did you hear that vibration?", "The instruments are flickering..."*).

* **Implementation**: Modify `checkFailureTriggers` to publish these warning narratives based on a new `preWarnTime` parameter.

### 4. UI Enhancements

I will modify `src/components/FlightInProgress.jsx`:

* **Cinematic Overlay**: Use `FadeOverlay` for phase transitions (especially Fast-Forward moments).

* **Physics Toggle**: Strictly enforce `physicsActive` state. When **OFF**, the plane controls will be locked, and the view might switch to a fixed cinematic camera (if available) or just lock the cockpit view.

### 5. File Modifications

* **`src/services/sceneManager.js`**: Define new `FlightPhases`, update `defaultScenario`, implement `fastForward` logic.

* **`src/services/RealisticFlightPhysicsService.js`**: Ensure `setInitialConditions` supports mid-flight state injection (teleportation).

* **`src/components/FlightInProgress.jsx`**: Handle "Physics OFF" state and render transition overlays.


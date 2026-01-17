I will modify `RealisticFlightPhysicsService.js` to fix the bouncing and ejection issues by tuning the ground physics and damping parameters.

### 1. Fix Lateral Instability ("Ejection")
- **Problem:** The lateral friction multiplier at low speeds is set to **200**, creating an extremely stiff "side spring" that violently ejects the aircraft if it slides even slightly.
- **Fix:** Reduce the multiplier to **30** and clamp the maximum force to the physical sliding friction limit (`mu_slide * NormalForce`).

### 2. Fix Vertical Bouncing
- **Problem:** The landing gear spring constant (`k: 350,000`) is too stiff, and the damping (`c: 80,000`) is insufficient for the aircraft mass, leading to underdamped oscillation (bouncing).
- **Fix:** 
    - Reduce Main Gear stiffness (`k`) to **150,000**.
    - Increase Main Gear damping (`c`) to **150,000** to approach critical damping and absorb impact.

### 3. Tame Ground Stabilizer & Steering
- **Problem:** The newly added damping (`factor 5.0`) applies massive torque corrections that magnify noise/vibrations. Steering torque is also aggressive.
- **Fix:**
    - Reduce Ground Damping Factor from **5.0** to **1.0** to provide stability without stiffness.
    - Reduce Steering Torque Factor from **60** to **30** for smoother yaw control.

### 4. Improve Takeoff Handling
- **Problem:** The "Low Altitude Stability Assistant" completely cuts off aerodynamic roll/yaw moments on the ground (`stabilityFactor = 0.0`), preventing pilots from using ailerons to correct for crosswinds during takeoff.
- **Fix:** Allow **20%** (`0.2`) of aerodynamic authority on the ground so control surfaces remain effective for stability.

### 5. Verify
- I will verify the changes by checking the code logic and ensuring the parameters are within physically reasonable ranges for a stable simulation. (Since I cannot run the 3D simulation, I rely on physics principles).

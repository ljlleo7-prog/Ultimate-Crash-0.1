# Ultimate Crash Simulator

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)

**Ultimate Crash** is a high-fidelity, web-based aviation disaster simulator. Unlike standard flight simulators that focus on routine operations, Ultimate Crash places you in the cockpit during critical system failures, challenging your decision-making skills under pressure.

---

## 🚀 Key Features

*   **Realistic Physics Engine**: Custom 6-DOF rigid body dynamics (using quaternions) for authentic aircraft behavior.
*   **Dynamic Failure System**: Procedurally generated emergencies ranging from engine fires to hydraulic leaks.
*   **Immersive Cockpit**: Fully interactive glass cockpit with PFD, EICAS, and overhead panels.
*   **Global Navigation**: Database of worldwide airports with realistic route planning.
*   **Cinematic Narrative**: Story-driven scenarios that set the stage for your flight.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v16 or higher recommended)
*   npm

### Quick Start

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-repo/Ultimate-Crash-0.1.git
    cd Ultimate-Crash-0.1
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```
    The application will launch at `http://localhost:3000`.

---

## 🎮 How to Play

### 1. Flight Initialization
*   **Route**: Search and select your **Departure** and **Arrival** airports.
*   **Aircraft**: Choose your plane (e.g., B737-800) and livery.
*   **Loadsheet**: Adjust passenger count, cargo payload, and fuel reserves.
*   **Conditions**: Set the weather (Clear, Stormy, Fog) and Time of Day.

### 2. Difficulty Settings
*   **Rookie**: No failures, simplified physics.
*   **Captain**: Occasional minor faults.
*   **Test Pilot**: Frequent, complex system failures.
*   **Devil Mode**: Catastrophic structural and engine failures are guaranteed.

### 3. In-Flight Controls
*   **Pitch/Roll**: On-screen joystick or keyboard arrows.
*   **Thrust**: Throttle quadrant slider.
*   **Systems**: Manage electrical, hydraulic, and fuel systems via the Overhead Panel.
*   **Emergency**: Respond to warnings on the EICAS display.

> **Pro Tip**: Press `Ctrl+Shift+D` on the main screen to enter **Dev Mode**, instantly launching a test flight from KSFO to KLAX.

---

## 📂 Project Structure

For a detailed technical deep-dive, please refer to:
*   [**PROJECT_OVERVIEW.md**](./PROJECT_OVERVIEW.md): High-level architecture and design philosophy.
*   [**CODE_REFERENCE.md**](./CODE_REFERENCE.md): Detailed API documentation for classes and services.

```
src/
├── components/          # UI: Cockpit panels, HUDs, Initialization screens
├── config/             # JSON: Weather presets, Difficulty settings
├── data/               # DB: Airports, Aircraft specs, Failure scenarios
├── hooks/              # Logic: Main game loop (useAircraftPhysics)
├── services/           # Core Engines:
│   ├── failures/       # Failure state machine & definitions
│   ├── RealisticFlightPhysicsService.js  # 6-DOF Physics
│   └── ...             # Weather, ATC, Airport services
├── utils/              # Helpers: Math, Navigation, Formatters
└── App.jsx             # Entry point & Global State
```

## 🧪 Development

### Available Scripts
*   `npm run dev`: Start local dev server.
*   `npm run build`: Production build.
*   `npm run lint`: Run ESLint.

### Adding New Aircraft
1.  Add performance data to `src/data/aircraftDatabase.json`.
2.  Ensure `maxThrust` and `wingArea` are accurate for the physics engine.

### Creating Failures
1.  Define the failure in `src/services/failures/types/`.
2.  Register it in `FailureHandler.js`.
3.  Implement the physics impact in `BaseFailure.js`.

---

## 📄 License

This project is licensed under the MIT License.

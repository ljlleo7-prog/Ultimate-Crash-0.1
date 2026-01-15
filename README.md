# Ultimate-Crash-0.1

An advanced air disaster simulator that challenges players to navigate through critical flight scenarios and avoid catastrophic failures.

## Overview

Ultimate Crash is a realistic flight simulation application designed to test your piloting skills under challenging conditions. Experience the thrill and pressure of managing emergency situations while flying commercial aircraft across various routes.

## Features

- **Airport Selection System**: Choose from a comprehensive database of airports worldwide
- **Aircraft Models**: Select from multiple commercial aircraft models including B737-800
- **Weather System**: Dynamic weather conditions that affect flight performance
- **Flight Planning**: Calculate realistic flight plans with fuel consumption and flight time estimates
- **Cinematic Experience**: Immersive narrative scenes and cinematic reviews before flight execution
- **Emergency Scenarios**: Face random or selected failure types during flight
- **Difficulty Levels**: Adjust the challenge level to match your experience
- **Real-time Physics**: Advanced flight physics simulation for realistic aircraft behavior
- **Multiple Views**: Comprehensive flight panels including control surfaces, navigation, and system status

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Navigate to the project directory: `cd Ultimate-Crash-0.1`
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Open your browser and navigate to the provided localhost URL

## Usage

1. **Flight Initialization**:
   - Select departure and arrival airports using the search functionality
   - Choose your aircraft model and airline
   - Set flight parameters including passenger count, payload, and fuel reserve
   - Select difficulty level and failure scenario preferences

2. **Flight Planning**:
   - Review the generated flight plan
   - Confirm or skip the detailed route selection
   - Experience the cinematic pre-flight sequence

3. **In-Flight Operations**:
   - Monitor aircraft systems and control surfaces
   - Respond to emergency situations
   - Navigate through challenging weather conditions
   - Make critical decisions to avoid crashes

## Project Structure

```
Ultimate-Crash-0.1/
├── src/
│   ├── components/          # React components
│   ├── config/             # Configuration files
│   ├── data/               # Database files (airports, aircraft, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main application component
│   ├── App.css             # Global styles
│   └── main.js             # Application entry point
├── scripts/                # Test and utility scripts
├── index.html              # HTML template
├── package.json            # Project dependencies
└── README.md               # This file
```

## Key Components

- **FlightInitialization**: Aircraft and flight parameter selection interface
- **FlightInProgress**: Main flight simulation interface with all control panels
- **RouteSelectionFrame**: Detailed route planning component
- **NarrativeScene**: Cinematic story scenes for enhanced immersion
- **ControlSurfacePanel**: Aircraft control surfaces monitoring and adjustment
- **NavigationPanel**: Flight navigation and route information
- **SystemStatusPanel**: Aircraft systems health monitoring

## Technologies Used

- React.js
- JavaScript
- CSS
- Vite (build tool)
- Various aircraft and flight physics algorithms

## Development

### Development Mode

The application includes a development mode that allows direct flight simulation bypassing the initialization steps. Press Ctrl+Shift+D to enable development mode.

### Testing

Run the test suite using:
```
npm run test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - (c)2026, GeeksProductionStudio. All Rights Reserved.

## Credits

Developed by GeeksProductionStudio

## Disclaimer

This is a simulation game for entertainment purposes only. It does not replace real flight training or procedures.

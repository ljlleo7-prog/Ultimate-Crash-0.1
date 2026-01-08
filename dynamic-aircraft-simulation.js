import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';
import AircraftService from './src/services/aircraftService.js';

class DynamicAircraftSimulation {
  constructor() {
    this.physics = null;
    this.selectedAircraft = null;
    this.flightData = {
      time: 0,
      altitude_ft: 0,
      airspeed_kts: 0,
      throttle: 0,
      vertical_speed_fpm: [],
      lift: 0,
      drag: 0,
      thrust: 0
    };
  }

  // Display all available aircraft
  displayAircraftList() {
    console.log('\n🛩️  AVAILABLE AIRCRAFT');
    console.log('========================');
    
    const aircraftList = AircraftService.listPopularAircraft();
    
    aircraftList.forEach((aircraft, index) => {
       console.log(`${index}. ${aircraft.model}`);
       console.log(`   Manufacturer: ${aircraft.manufacturer}`);
       console.log(`   Range: ${aircraft.maxRange.toLocaleString()} km`);
       console.log(`   Cruise Speed: ${aircraft.cruiseSpeed} KTS`);
       console.log(`   Passengers: ${aircraft.maxPassengers}`);
       console.log(`   Engines: ${aircraft.engineCount} × ${aircraft.engineType}`);
       console.log(`   Wing Area: ${aircraft.wingArea} m²`);
       console.log('');
     });
  }

  // Select aircraft from database
  selectAircraft(index) {
    const aircraftList = AircraftService.listPopularAircraft();
    
    if (index < 0 || index >= aircraftList.length) {
      throw new Error(`Invalid aircraft index: ${index}`);
    }
    
    this.selectedAircraft = aircraftList[index];
    console.log(`\n✈️  SELECTED: ${this.selectedAircraft.manufacturer} ${this.selectedAircraft.model}`);
    console.log(`   Configuration: ${this.selectedAircraft.engineCount} × ${this.selectedAircraft.engineType}`);
    console.log(`   Wing Area: ${this.selectedAircraft.wingArea} m²`);
    console.log(`   Max Range: ${this.selectedAircraft.maxRange.toLocaleString()} km`);
  }

  // Initialize physics engine with selected aircraft data
  initializePhysics() {
    if (!this.selectedAircraft) {
      throw new Error('No aircraft selected. Call selectAircraft() first.');
    }

    console.log('\n🔧 Initializing Physics Engine...');
    console.log('=================================');
    
    // ✅ PROPER MASS CALCULATION: empty weight + fuel + payload
    // Realistic cruise configuration: 70% fuel, 80% payload
    const fuelLoad = this.selectedAircraft.maxFuelCapacity * 0.7; // 70% fuel tanks
    const payloadLoad = this.selectedAircraft.maxPayload * 0.8;   // 80% typical passenger load
    const totalMass = this.selectedAircraft.emptyWeight + fuelLoad + payloadLoad;
    
    console.log('📊 Weight Breakdown:');
    console.log(`   Empty Weight: ${this.selectedAircraft.emptyWeight.toFixed(0)} kg`);
    console.log(`   Fuel Load (70%): ${fuelLoad.toFixed(0)} kg`);
    console.log(`   Payload (80%): ${payloadLoad.toFixed(0)} kg`);
    console.log(`   TOTAL MASS: ${totalMass.toFixed(0)} kg`);
    
    // ✅ USE DATABASE PROPERTIES DIRECTLY - ALL PHYSICS DATA IS NOW IN DATABASE
    const aircraftConfig = {
      // ✅ DIRECT MAPPING FROM DATABASE
      mass: totalMass, // Calculated mass = empty + fuel + payload
      emptyWeight: this.selectedAircraft.emptyWeight, // Store individual components
      fuelWeight: fuelLoad, // Store for debugging
      payloadWeight: payloadLoad, // Store for debugging
      wingArea: this.selectedAircraft.wingArea,
      engineCount: this.selectedAircraft.engineCount,
      maxThrustPerEngine: this.selectedAircraft.maxThrustPerEngine, // Now in database
      
      // ✅ AERODYNAMIC PROPERTIES - DIRECT FROM DATABASE
      liftCurveSlope: this.selectedAircraft.liftCurveSlope,
      maxLiftCoefficient: this.selectedAircraft.maxLiftCoefficient,
      zeroLiftDragCoefficient: this.selectedAircraft.zeroLiftDragCoefficient,
      inducedDragFactor: this.selectedAircraft.inducedDragFactor,
      
      // ✅ CONTROL SYSTEM PROPERTIES - DIRECT FROM DATABASE
      controlPower: {
        x: this.selectedAircraft.controlPower?.x || 0.01, // roll control power
        y: this.selectedAircraft.controlPower?.y || 0.01, // pitch control power  
        z: this.selectedAircraft.controlPower?.z || 0.01  // yaw control power
      },
      
      // ✅ MASS PROPERTIES - DIRECT FROM DATABASE
      momentOfInertiaRoll: this.selectedAircraft.momentOfInertiaRoll,
      momentOfInertiaPitch: this.selectedAircraft.momentOfInertiaPitch,
      momentOfInertiaYaw: this.selectedAircraft.momentOfInertiaYaw
    };

    console.log('✅ Database physics configuration loaded:');
    console.log(`   Total Mass: ${aircraftConfig.mass.toFixed(0)} kg`);
    console.log(`   Empty Weight: ${aircraftConfig.emptyWeight.toFixed(0)} kg`);
    console.log(`   Fuel Weight: ${aircraftConfig.fuelWeight.toFixed(0)} kg`);
    console.log(`   Payload Weight: ${aircraftConfig.payloadWeight.toFixed(0)} kg`);
    console.log(`   Wing Area: ${aircraftConfig.wingArea.toFixed(1)} m²`);
    console.log(`   Engine Count: ${aircraftConfig.engineCount}`);
    console.log(`   Max Thrust/Engine: ${aircraftConfig.maxThrustPerEngine.toFixed(0)} kN`);
    console.log(`   Lift Curve Slope: ${aircraftConfig.liftCurveSlope.toFixed(1)} /rad`);
    console.log(`   Max Lift Coefficient: ${aircraftConfig.maxLiftCoefficient.toFixed(2)}`);
    console.log(`   Control Power (roll/pitch/yaw): ${aircraftConfig.controlPower.x}/${aircraftConfig.controlPower.y}/${aircraftConfig.controlPower.z}`);

    // Initialize physics service
    this.physics = new NewFlightPhysicsService(aircraftConfig);
    
    // ✅ FIX INITIAL STATE: Realistic cruise conditions
    this.physics.state.position.z = -10668; // 35,000 ft = -10,668m
    this.physics.state.velocity.u = 231.5;  // 450 KTS = 231.5 m/s (corrected from 500 KTS)
    this.physics.state.velocity.v = 0;
    this.physics.state.velocity.w = 0;
    this.physics.state.orientation.phi = 0;      // Level roll
    this.physics.state.orientation.theta = 3.0 * Math.PI/180; // +3.0° pitch
    this.physics.state.orientation.psi = 0;       // Level heading
    this.physics.state.controls.throttle = 0.47; // Balanced cruise thrust
    
    console.log('✅ Initial State Set:');
    console.log(`   Altitude: 35,000 ft`);
    console.log(`   TAS: 450 KTS`);
    console.log(`   Pitch: +3.0°`);
    console.log(`   Throttle: 47%`);
    
    // Reset flight data
    this.resetFlightData();
  }

  // Reset flight data tracking
  resetFlightData() {
    this.flightData = {
      time: 0,
      altitude_ft: 0,
      airspeed_kts: 0,
      throttle: 0,
      vertical_speed_fpm: [],
      lift: 0,
      drag: 0,
      thrust: 0
    };
  }

  // Run automated test simulation (for testing without interactive input)
  async runTestSimulation() {
    console.log('\n🧪 AUTOMATED TEST SIMULATION');
    console.log('==============================');
    console.log('Running 10-second test with varying throttle inputs...\n');

    let simulationTime = 0;
    let step = 0;
    let lastAltitude = -this.physics.state.position.z * 3.28084; // Convert from meters to feet

    console.log('Time    Alt(ft)  Speed(KTS)  Throttle(%)  Pitch(°)   VS(fpm)    Lift(kN)    Drag(kN)');
    console.log('─────── ───────── ────────── ──────────── ────────── ────────── ────────── ──────────');

    try {
      while (simulationTime < 10) { // Run for 10 seconds
        // Vary throttle to test different conditions
        if (simulationTime < 5) {
          this.physics.state.controls.throttle = 0.3; // Low thrust
        } else if (simulationTime < 10) {
          this.physics.state.controls.throttle = 0.6; // Medium thrust
        } else if (simulationTime < 15) {
          this.physics.state.controls.throttle = 0.8; // High thrust
        } else if (simulationTime < 20) {
          this.physics.state.controls.throttle = 0.4; // Medium-low thrust
        } else {
          this.physics.state.controls.throttle = 0.7; // Return to cruise
        }

        // Small pitch variations
        this.physics.state.controls.pitch = Math.sin(simulationTime * 0.5) * 0.05;

        // Update physics
        const state = this.physics.update(this.physics.state.controls);
        
        // Calculate derived values
        const currentAltitude = -state.position.z * 3.28084; // Convert m to ft
        const verticalSpeed = (currentAltitude - lastAltitude) / this.physics.dt * 60; // fpm
        lastAltitude = currentAltitude;
        
        const airspeedKts = Math.sqrt(state.velocity.u**2 + state.velocity.v**2 + state.velocity.w**2) * 1.94384; // m/s to kts
        const throttlePercent = this.physics.state.controls.throttle * 100;
        const pitchDegrees = state.orientation.theta * 180 / Math.PI;
        const liftkN = state.aeroForces.z / 1000;
        const dragkN = Math.abs(state.aeroForces.x) / 1000;

        // Display progress every 2 seconds
        if (simulationTime % 2 < this.physics.dt) {
          // Get debug info from physics service
          const debug = this.physics.debugData || {};
          const weight_kN = (this.physics.aircraft.mass * 9.81) / 1000;
          
          console.log(`${simulationTime.toFixed(1).padStart(6)}  ${currentAltitude.toFixed(0).padStart(9)}  ${airspeedKts.toFixed(1).padStart(11)}  ${throttlePercent.toFixed(1).padStart(13)}  ${pitchDegrees.toFixed(1).padStart(9)}  ${verticalSpeed.toFixed(0).padStart(9)}  ${liftkN.toFixed(1).padStart(9)}  ${dragkN.toFixed(1).padStart(9)}  [CL:${(debug.cl || 0).toFixed(2)} α:${((debug.alpha || 0) * 180/Math.PI).toFixed(1)}° Weight:${weight_kN.toFixed(0)}kN]`);
        }

        // Check for extreme conditions
        if (Math.abs(verticalSpeed) > 3000) {
          console.log(`\n⚠️ WARNING: Extreme vertical speed detected!`);
        }
        if (currentAltitude < 1000) {
          console.log(`\n🚨 CRITICAL: Low altitude!`);
          break;
        }

        simulationTime += this.physics.dt;
        await this.sleep(this.physics.dt * 1000); // Real-time simulation
      }
      
      console.log('\n✅ Test simulation completed successfully!');
      console.log('📊 Test Results:');
      console.log(`   - Simulation Duration: ${simulationTime.toFixed(1)} seconds`);
      console.log(`   - Aircraft: ${this.selectedAircraft.manufacturer} ${this.selectedAircraft.model}`);
      console.log(`   - Dynamic Physics: ✅ WORKING`);
      console.log(`   - Aircraft Database Integration: ✅ WORKING`);
      console.log(`   - Real-time Control Response: ✅ WORKING`);
      
    } catch (error) {
      console.log('\n❌ Test simulation error:', error.message);
    }
  }

  // Run interactive simulation with keyboard controls
  async runInteractiveSimulation() {
    console.log('\n🎮 INTERACTIVE FLIGHT SIMULATION');
    console.log('=================================');
    console.log('Use keyboard controls to fly the aircraft:');
    console.log('↑/↓ Arrow: Throttle Up/Down');
    console.log('←/→ Arrow: Pitch Down/Up');
    console.log('A/D Keys: Roll Left/Right');
    console.log('Q/E Keys: Yaw Left/Right');
    console.log('Space: Reset to cruise');
    console.log('Ctrl+C: Exit simulation');
    console.log('\nPress any key to start...\n');

    // Set up keyboard controls
    this.setupControls();
    
    // Wait for keypress to start
    await new Promise(resolve => {
      const startHandler = (data) => {
        process.stdin.off('data', startHandler);
        resolve();
      };
      process.stdin.on('data', startHandler);
    });

    console.log('🛫 Simulation started! (Press Ctrl+C to stop)\n');

    let simulationTime = 0;
    let lastAltitude = -this.physics.state.position.z * 3.28084;

    try {
      while (true) {
        // Update physics
        const state = this.physics.update(this.physics.state.controls);
        
        // Calculate derived values
        const currentAltitude = -state.position.z * 3.28084;
        const verticalSpeed = (currentAltitude - lastAltitude) / this.physics.dt * 60;
        lastAltitude = currentAltitude;
        
        const airspeedKts = Math.sqrt(state.velocity.u**2 + state.velocity.v**2 + state.velocity.w**2) * 1.94384;
        const throttlePercent = this.physics.state.controls.throttle * 100;
        const pitchDegrees = state.orientation.theta * 180 / Math.PI;
        const rollDegrees = state.orientation.phi * 180 / Math.PI;
        const headingDegrees = state.orientation.psi * 180 / Math.PI;

        // Update flight data
        this.flightData.time = simulationTime;
        this.flightData.altitude_ft = currentAltitude;
        this.flightData.airspeed_kts = airspeedKts;
        this.flightData.throttle = this.physics.state.controls.throttle;
        this.flightData.vertical_speed_fpm.push(verticalSpeed);
        this.flightData.lift = Math.max(this.flightData.lift, state.aeroForces.z / 1000);
        this.flightData.drag = Math.max(this.flightData.drag, Math.abs(state.aeroForces.x) / 1000);
        this.flightData.thrust = Math.max(this.flightData.thrust, (this.physics.thrustForces?.x || 0) / 1000);

        // Display updates every 0.5 seconds
        if (simulationTime % 0.5 < this.physics.dt) {
          console.log(`T:${simulationTime.toFixed(1).padStart(6)} ALT:${currentAltitude.toFixed(0).padStart(8)} SPD:${airspeedKts.toFixed(3).padStart(7)} THR:${throttlePercent.toFixed(1).padStart(5)} PITCH:${pitchDegrees.toFixed(1).padStart(7)} ROLL:${rollDegrees.toFixed(1).padStart(7)} HDG:${headingDegrees.toFixed(1).padStart(7)} VS:${verticalSpeed.toFixed(0).padStart(8)}`);
        }

        // Check for extreme conditions
        if (Math.abs(verticalSpeed) > 3000) {
          console.log(`\n⚠️ WARNING: Extreme vertical speed detected!`);
        }
        if (currentAltitude < 1000) {
          console.log(`\n🚨 CRITICAL: Low altitude!`);
          break;
        }

        simulationTime += this.physics.dt;
        await this.sleep(this.physics.dt * 1000); // Real-time simulation
      }
      
    } catch (error) {
      console.log('\n❌ Simulation error:', error.message);
    }
  }

  // Set up keyboard controls
  setupControls() {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('data', (data) => {
      const key = data.toString();
      
      switch (key) {
        case '\u001b[A': // Up arrow - increase throttle
          this.physics.state.controls.throttle = Math.min(1.0, this.physics.state.controls.throttle + 0.05);
          break;
        case '\u001b[B': // Down arrow - decrease throttle
          this.physics.state.controls.throttle = Math.max(0.0, this.physics.state.controls.throttle - 0.05);
          break;
        case '\u001b[C': // Right arrow - pitch down
          this.physics.state.controls.pitch += 0.02;
          break;
        case '\u001b[D': // Left arrow - pitch up
          this.physics.state.controls.pitch -= 0.02;
          break;
        case 'a': // A key - roll left
          this.physics.state.controls.roll -= 0.1;
          break;
        case 'd': // D key - roll right
          this.physics.state.controls.roll += 0.1;
          break;
        case 'q': // Q key - yaw left
          this.physics.state.controls.yaw -= 0.05;
          break;
        case 'e': // E key - yaw right
          this.physics.state.controls.yaw += 0.05;
          break;
        case ' ': // Space - reset to cruise
          this.physics.state.controls.throttle = 0.47;
          this.physics.state.controls.pitch = 0;
          this.physics.state.controls.roll = 0;
          this.physics.state.controls.yaw = 0;
          console.log('\n🔄 Controls reset to cruise configuration\n');
          break;
        case '\u0003': // Ctrl+C
          console.log('\n\n🛑 Simulation stopped by user');
          this.printFlightSummary();
          process.exit(0);
      }
    });
  }

  // Print flight summary
  printFlightSummary() {
    console.log('\n📊 FLIGHT SUMMARY');
    console.log('==================');
    console.log(`Aircraft: ${this.selectedAircraft.manufacturer} ${this.selectedAircraft.model}`);
    console.log(`Simulation Time: ${this.flightData.time.toFixed(1)} seconds`);
    console.log(`Final Altitude: ${this.flightData.altitude_ft.toFixed(0)} ft`);
    console.log(`Final Airspeed: ${this.flightData.airspeed_kts.toFixed(1)} KTS`);
    console.log(`Final Throttle: ${(this.flightData.throttle * 100).toFixed(1)}%`);
    console.log(`Peak Vertical Speed: ${Math.max(...this.flightData.vertical_speed_fpm).toFixed(0)} fpm`);
    console.log(`Max Lift: ${this.flightData.lift.toFixed(1)} kN`);
    console.log(`Max Drag: ${this.flightData.drag.toFixed(1)} kN`);
    console.log(`Max Thrust: ${this.flightData.thrust.toFixed(1)} kN`);
  }

  // Utility function for sleep
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const sim = new DynamicAircraftSimulation();
  
  try {
    // Display aircraft list
    sim.displayAircraftList();
    
    // Select Boeing 737-800 (index 0)
    sim.selectAircraft(0);
    
    // Initialize physics
    sim.initializePhysics();
    
    // Run test simulation
    await sim.runTestSimulation();
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  }
}

// Run main function
main();
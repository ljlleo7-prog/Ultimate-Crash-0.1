import { readFile } from 'fs/promises';

// First check the aircraft database directly
readFile('./src/data/aircraftDatabase.json', 'utf8')
  .then(data => {
    const aircraftDatabase = JSON.parse(data);
    const boeing747 = aircraftDatabase.aircraft.find(a => a.model === 'Boeing 747-400');
    console.log('Boeing 747-400 database entry:', boeing747);
    
    // Check multiple aircraft
    const boeing737 = aircraftDatabase.aircraft.find(a => a.model === 'Boeing 737-800');
    console.log('\nBoeing 737-800 database entry:', {
      model: boeing737.model,
      engineCount: boeing737.engineCount,
      maxThrustPerEngine: boeing737.maxThrustPerEngine
    });
    
    const airbusA380 = aircraftDatabase.aircraft.find(a => a.model === 'Airbus A380-800');
    console.log('\nAirbus A380-800 database entry:', {
      model: airbusA380.model,
      engineCount: airbusA380.engineCount,
      maxThrustPerEngine: airbusA380.maxThrustPerEngine
    });
    
    // Test positioning logic
    const positionsFor4Engines = [
      { x: -10, y: 0, z: 0 },  // Left outer
      { x: -3, y: 0, z: 0 },   // Left inner
      { x: 3, y: 0, z: 0 },    // Right inner
      { x: 10, y: 0, z: 0 }    // Right outer
    ];
    console.log('\nSimulated engine positions for 4 engines:', positionsFor4Engines);
    
    // Calculate expected thrust values
    console.log('\nExpected thrust values:');
    console.log('Boeing 747-400 (4 engines):', boeing747.maxThrustPerEngine * boeing747.engineCount / 1000, 'kN');
    console.log('Boeing 737-800 (2 engines):', boeing737.maxThrustPerEngine * boeing737.engineCount / 1000, 'kN');
    console.log('Airbus A380-800 (4 engines):', airbusA380.maxThrustPerEngine * airbusA380.engineCount / 1000, 'kN');
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
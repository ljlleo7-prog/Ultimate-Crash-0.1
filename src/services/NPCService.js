
import { NPCFlightModel, NPC_STAGE } from './NPCFlightModel';
import airlineData from '../data/airlinesDatabase.json';
import { airportService } from './airportService';

class NPCManagerService {
  constructor() {
    this.npcs = [];
    this.airlines = airlineData.airlines || [];
    this.nextId = 1;
    this.spawnRadius = 80; // nm
    this.despawnRadius = 320; // nm
    this.maxNPCs = 5; // Reduced from 15 to prevent ATC spam
    this.minNPCs = 1;
  }

  // Calculate distance in NM
  calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return 9999;
    const R = 3440.065; // Earth radius in NM
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  generateRandomPos(centerPos, radiusNm) {
    // Random bearing and distance
    const dist = Math.random() * radiusNm;
    const bearing = Math.random() * 2 * Math.PI;
    
    // Simple flat earth approx for short distances (valid enough for 80nm)
    // 1 nm = 1/60 degree roughly
    const dDeg = dist / 60;
    
    return {
      latitude: centerPos.latitude + dDeg * Math.cos(bearing),
      longitude: centerPos.longitude + dDeg * Math.sin(bearing),
      altitude: 20000 + Math.random() * 20000, // 20k - 40k ft
      heading: Math.random() * 360,
      speed: 350 + Math.random() * 150 // 350-500 kts
    };
  }

  generateCallsign() {
    if (this.airlines.length === 0) return `N${Math.floor(Math.random()*900)+100}GA`;
    
    const airline = this.airlines[Math.floor(Math.random() * this.airlines.length)];
    const number = Math.floor(Math.random() * 9000) + 100;
    return `${airline.callsign} ${number}`;
  }

  update(dt, playerPos) {
    if (!playerPos || !playerPos.latitude) return [];

    const messages = [];

    // 1. Update existing NPCs
    this.npcs.forEach(npc => {
      npc.update(dt);
      
      // Check for messages
      const msg = npc.popMessage();
      if (msg) messages.push(msg);
    });

    // 2. Despawn logic
    this.npcs = this.npcs.filter(npc => {
      const dist = this.calculateDistance(
        { latitude: npc.latitude, longitude: npc.longitude },
        playerPos
      );
      return dist <= this.despawnRadius;
    });

    // 3. Spawn logic
    const nearbyCount = this.npcs.filter(npc => {
      const dist = this.calculateDistance(
        { latitude: npc.latitude, longitude: npc.longitude },
        playerPos
      );
      return dist <= this.spawnRadius;
    }).length;

    // Must have at least minNPCs
    if (nearbyCount < this.minNPCs) {
      this.spawnNPC(playerPos);
    } 
    // Chance to spawn more up to max
    else if (nearbyCount < this.maxNPCs && Math.random() < 0.002) { // Reduced from 0.01 to 0.002 (0.2% per update)
      this.spawnNPC(playerPos);
    }

    return messages;
  }

  spawnNPC(centerPos) {
    const roll = Math.random();
    let pos = null;
    let targetAirport = null;
    const callsign = this.generateCallsign();

    // 40% Cruise, 30% Climb (Takeoff), 30% Approach
    if (roll < 0.4) {
      // Cruise
      pos = this.generateRandomPos(centerPos, this.spawnRadius);
      pos.stage = NPC_STAGE.CRUISE;
    } else {
      // Try to find airport for Takeoff/Landing
      // Search slightly larger radius to find suitable airports
      const airports = airportService.getAirportsWithinRadius(centerPos.latitude, centerPos.longitude, this.spawnRadius);
      
      // Filter out airports too close to player (likely user's current airport)
      // Assume user is on runway if < 3nm
      const validAirports = airports.filter(ap => {
        const dist = this.calculateDistance(centerPos, {latitude: ap.latitude, longitude: ap.longitude});
        return dist > 5; // Keep airports > 5nm away to avoid user's runway
      });

      if (validAirports.length === 0) {
        // Fallback to Cruise if no other airports nearby
        pos = this.generateRandomPos(centerPos, this.spawnRadius);
        pos.stage = NPC_STAGE.CRUISE;
      } else {
        // Pick random airport
        const airport = validAirports[Math.floor(Math.random() * validAirports.length)];
        targetAirport = airport.iata;

        if (roll < 0.7) {
          // CLIMB (Takeoff)
          // Spawn just after takeoff, climbing out
          const heading = Math.random() * 360; // Random heading (simulating random runway)
          // 1-2nm out
          const distOut = 1 + Math.random(); 
          const dDeg = distOut / 60;

          pos = {
            latitude: airport.latitude + dDeg * Math.cos(heading * Math.PI / 180),
            longitude: airport.longitude + dDeg * Math.sin(heading * Math.PI / 180),
            altitude: 500 + Math.random() * 1000, // 500-1500ft AGL
            heading: heading,
            speed: 160 + Math.random() * 40,
            stage: NPC_STAGE.CLIMB
          };

        } else {
          // APPROACH
          // Spawn on approach vector
          const distOut = 10 + Math.random() * 10; // 10-20nm out
          const approachAngle = Math.random() * 2 * Math.PI;
          const dDeg = distOut / 60;
          
          // Position relative to airport
          const lat = airport.latitude + dDeg * Math.cos(approachAngle);
          const lon = airport.longitude + dDeg * Math.sin(approachAngle);
          
          // Heading pointing towards airport
          // atan2(dy, dx) gives angle from pos to airport
          const dy = airport.latitude - lat;
          const dx = (airport.longitude - lon) * Math.cos(lat * Math.PI / 180); // Adjust for longitude
          const bearing = Math.atan2(dx, dy) * 180 / Math.PI; // Simple bearing calculation
          
          pos = {
            latitude: lat,
            longitude: lon,
            altitude: 3000 + Math.random() * 2000, // 3000-5000ft
            heading: (bearing + 360) % 360,
            speed: 200 + Math.random() * 30,
            stage: NPC_STAGE.APPROACH
          };
        }
      }
    }

    const npc = new NPCFlightModel(this.nextId++, callsign, pos, targetAirport);
    this.npcs.push(npc);
    // console.log(`Spawned NPC ${callsign} (${pos.stage}) at ${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`);
  }

  getNPCs() {
    return this.npcs;
  }
}

export const npcService = new NPCManagerService();

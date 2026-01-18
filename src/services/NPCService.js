
import { NPCFlightModel } from './NPCFlightModel';
import airlineData from '../data/airlinesDatabase.json';

class NPCManagerService {
  constructor() {
    this.npcs = [];
    this.airlines = airlineData.airlines || [];
    this.nextId = 1;
    this.spawnRadius = 80; // nm
    this.despawnRadius = 320; // nm
    this.maxNPCs = 20;
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
    else if (nearbyCount < this.maxNPCs && Math.random() < 0.01) { // Low probability per frame/update
      this.spawnNPC(playerPos);
    }

    return messages;
  }

  spawnNPC(centerPos) {
    const pos = this.generateRandomPos(centerPos, this.spawnRadius);
    const callsign = this.generateCallsign();
    const npc = new NPCFlightModel(this.nextId++, callsign, pos, null);
    this.npcs.push(npc);
    // console.log(`Spawned NPC ${callsign} at ${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`);
  }

  getNPCs() {
    return this.npcs;
  }
}

export const npcService = new NPCManagerService();

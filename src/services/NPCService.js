
import { NPCFlightModel, NPC_STAGE } from './NPCFlightModel.js';
import airlineData from '../data/airlinesDatabase.json';
import { airportService } from './airportService.js';
import { searchLocalAipRoute } from './routes/aipRouteSearch.js';

class NPCManagerService {
  constructor() {
    this.npcs = [];
    this.airlines = airlineData.airlines || [];
    this.nextId = 1;
    this.spawnRadius = 80; // nm
    this.despawnRadius = 320; // nm
    this.maxNPCs = 15;
    this.minNPCs = 1;
    this.pendingSpawns = 0;
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

  calculateBearing(from, to) {
    const fromLat = from.latitude * Math.PI / 180;
    const toLat = to.latitude * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  offsetPosition(centerPos, distanceNm, bearingDeg) {
    const dDeg = distanceNm / 60;
    const bearing = bearingDeg * Math.PI / 180;
    return {
      latitude: centerPos.latitude + dDeg * Math.cos(bearing),
      longitude: centerPos.longitude + dDeg * Math.sin(bearing) / Math.cos(centerPos.latitude * Math.PI / 180)
    };
  }

  getAirportCode(airport) {
    return String(airport?.icao || airport?.iata || '').toUpperCase();
  }

  buildDirectRoute(from, to) {
    if (!from || !to) return null;
    const midpoint = {
      name: 'DCT',
      label: 'DCT',
      latitude: (from.latitude + to.latitude) / 2,
      longitude: (from.longitude + to.longitude) / 2,
      type: 'WAYPOINT',
      airway: 'DCT'
    };
    return {
      waypoints: [
        { name: this.getAirportCode(from) || 'FROM', label: this.getAirportCode(from) || 'FROM', latitude: from.latitude, longitude: from.longitude, type: 'AIRPORT' },
        midpoint,
        { name: this.getAirportCode(to) || 'TO', label: this.getAirportCode(to) || 'TO', latitude: to.latitude, longitude: to.longitude, type: 'AIRPORT' }
      ],
      source: 'Direct'
    };
  }

  async buildNpcRoute(departure, arrival) {
    const fallback = this.buildDirectRoute(departure, arrival);
    if (!departure || !arrival || this.getAirportCode(departure) === this.getAirportCode(arrival)) return fallback;

    try {
      const response = await searchLocalAipRoute({
        departure,
        arrival,
        options: {
          maxElapsedMs: 120,
          maxExpandedNodes: 600,
          maxEdgeRelaxations: 2500,
          useGraphFallback: true,
          useBruteForceFallback: true,
          relaxAirwayLimitations: true
        }
      });
      if (response?.status === 'ok' && response.route?.waypoints?.length >= 2) return response.route;
    } catch {
      return fallback;
    }

    return fallback;
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

  update(dt, playerPos, context = {}) {
    if (!playerPos || !playerPos.latitude) return [];

    const { atcManager = null } = context || {};
    const messages = [];

    // 1. Update existing NPCs
    this.npcs.forEach(npc => {
      npc.update(dt, atcManager);

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
    }).length + this.pendingSpawns;

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

  async spawnNPC(centerPos) {
    this.pendingSpawns += 1;
    try {
      const roll = Math.random();
      let pos = null;
      let targetAirport = null;
      let route = null;
      const callsign = this.generateCallsign();
      const airports = airportService.getAirportsWithinRadius(centerPos.latitude, centerPos.longitude, this.spawnRadius, { type: 'normal' });
      const validAirports = airports.filter(ap => {
        const dist = this.calculateDistance(centerPos, { latitude: ap.latitude, longitude: ap.longitude });
        return dist > 5;
      });

      if (validAirports.length >= 2) {
        const departure = validAirports[Math.floor(Math.random() * validAirports.length)];
        const destinationCandidates = validAirports.filter((airport) => this.getAirportCode(airport) !== this.getAirportCode(departure));
        const arrival = destinationCandidates[Math.floor(Math.random() * destinationCandidates.length)] || validAirports[0];
        targetAirport = arrival.iata || arrival.icao;
        route = await this.buildNpcRoute(departure, arrival);
        const routeWaypoints = route?.waypoints || [];

        if (roll < 0.35 && routeWaypoints.length >= 2) {
          const startIndex = routeWaypoints.length > 2 ? 1 + Math.floor(Math.random() * (routeWaypoints.length - 2)) : 0;
          const startWaypoint = routeWaypoints[startIndex];
          const nextWaypoint = routeWaypoints[startIndex + 1] || arrival;
          pos = {
            latitude: startWaypoint.latitude,
            longitude: startWaypoint.longitude,
            altitude: 28000 + Math.random() * 10000,
            heading: this.calculateBearing(startWaypoint, nextWaypoint),
            speed: 400 + Math.random() * 60,
            stage: NPC_STAGE.CRUISE
          };
          route = { ...route, waypoints: routeWaypoints.slice(startIndex + 1) };
        } else if (roll < 0.7) {
          const runwayHeading = airportService.getRunwayGeometry(this.getAirportCode(departure))?.heading ?? Math.random() * 360;
          const climbout = this.offsetPosition(departure, 2 + Math.random() * 2, runwayHeading);
          pos = {
            ...climbout,
            altitude: 500 + Math.random() * 1200,
            heading: runwayHeading,
            speed: 165 + Math.random() * 35,
            stage: NPC_STAGE.CLIMB
          };
          route = { ...route, waypoints: routeWaypoints.slice(1) };
        } else {
          const bearingToAirport = Math.random() * 360;
          const approachStart = this.offsetPosition(arrival, 12 + Math.random() * 10, (bearingToAirport + 180) % 360);
          pos = {
            ...approachStart,
            altitude: 3000 + Math.random() * 2500,
            heading: this.calculateBearing(approachStart, arrival),
            speed: 200 + Math.random() * 30,
            stage: NPC_STAGE.APPROACH
          };
          route = { ...route, waypoints: [{ name: targetAirport, label: targetAirport, latitude: arrival.latitude, longitude: arrival.longitude, type: 'AIRPORT' }] };
        }
      }

      if (!pos) {
        pos = this.generateRandomPos(centerPos, this.spawnRadius);
        pos.stage = NPC_STAGE.CRUISE;
        const destination = this.offsetPosition(pos, 180, pos.heading);
        route = { waypoints: [{ name: 'DCT', label: 'DCT', latitude: destination.latitude, longitude: destination.longitude, type: 'WAYPOINT', airway: 'DCT' }], source: 'Direct' };
      }

      const npc = new NPCFlightModel(this.nextId++, callsign, pos, targetAirport, route);
      this.npcs.push(npc);
    } finally {
      this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
    }
  }

  getNPCs() {
    return this.npcs;
  }
}

export const npcService = new NPCManagerService();

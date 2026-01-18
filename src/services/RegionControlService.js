
import americanAirports from '../data/americanAirports.json';
import asianAirports from '../data/asianAirports.json';
import europeanAirports from '../data/europeanAirports.json';
import americanEmergency from '../data/americanEmergencyAirports.json';
import otherEmergency from '../data/otherEmergencyAirports.json';

class RegionControlService {
    constructor() {
        this.airports = [];
        this.gridSize = 2.0; // 2 degrees grid
        this.init();
    }

    init() {
        // Consolidate all airports
        const process = (list, source) => {
            if (!list) return;
            if (Array.isArray(list)) {
                list.forEach(a => this.addAirport(a));
            } else if (list.airports) {
                list.airports.forEach(a => this.addAirport(a));
            }
        };

        process(americanAirports, 'american');
        process(asianAirports, 'asian');
        process(europeanAirports, 'european');
        process(americanEmergency, 'amer_emerg');
        process(otherEmergency, 'other_emerg');
        
        console.log(`RegionControlService: Loaded ${this.airports.length} airports.`);
    }

    addAirport(airport) {
        if (!airport.latitude || !airport.longitude) return;
        
        // Try to determine city name
        let name = airport.city;
        if (!name) {
            // Fallback: try to extract from airport name
            // e.g. "Lehigh Valley International Airport" -> "Lehigh Valley"
            name = airport.name.replace(/International Airport|Airport|Regional|Field/gi, '').trim();
        }
        
        this.airports.push({
            lat: airport.latitude,
            lon: airport.longitude,
            name: name || 'Unknown',
            icao: airport.icao
        });
    }

    // Get the region center for a given position
    getGridCenter(lat, lon) {
        const centerLat = Math.floor(lat / this.gridSize) * this.gridSize + this.gridSize / 2;
        const centerLon = Math.floor(lon / this.gridSize) * this.gridSize + this.gridSize / 2;
        return { lat: centerLat, lon: centerLon };
    }

    // Get the region info (name and frequency)
    getRegionInfo(lat, lon) {
        const center = this.getGridCenter(lat, lon);
        const regionKey = `${center.lat.toFixed(1)},${center.lon.toFixed(1)}`;
        
        // Find nearest airport to the center of the region
        let nearest = null;
        let minDist = Infinity;

        // Optimization: We could spatially index, but for ~3000 airports linear scan is probably fine for now
        // or filter by rough lat/lon first
        for (const airport of this.airports) {
            // Rough bounding box check first
            if (Math.abs(airport.lat - center.lat) > 5 || Math.abs(airport.lon - center.lon) > 5) continue;

            const d = (airport.lat - center.lat) ** 2 + (airport.lon - center.lon) ** 2;
            if (d < minDist) {
                minDist = d;
                nearest = airport;
            }
        }

        const name = nearest ? nearest.name : `Sector ${regionKey}`;
        
        // Deterministic frequency generation based on region center
        // Range 123.00 to 135.95, step 0.05
        // Hash the key
        let hash = 0;
        for (let i = 0; i < regionKey.length; i++) {
            hash = ((hash << 5) - hash) + regionKey.charCodeAt(i);
            hash |= 0;
        }
        
        const freqIndex = Math.abs(hash) % 260; // (136-123)*20 = 260 steps
        const freq = 123.0 + (freqIndex * 0.05);

        return {
            name: `${name} Center`,
            frequency: freq.toFixed(3).slice(0, 7), // "123.450"
            displayFreq: freq.toFixed(2)
        };
    }
}

export const regionControlService = new RegionControlService();

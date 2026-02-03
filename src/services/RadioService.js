import { airportService } from './airportService.js';

class RadioService {
    /**
     * Handle Radio Tuning Event and return Runway Geometry if found
     * @param {number} frequency - Tuned frequency in MHz
     * @param {Object} flightPlan - Current flight plan object
     * @param {number} aircraftHeading - Current aircraft heading in degrees
     * @returns {Object|null} - Returns runway geometry if found, null otherwise
     */
    handleTuning(frequency, flightPlan, aircraftHeading) {
        if (!frequency) return null;
        
        // console.log(`📻 Radio Service: Tuned to ${frequency.toFixed(3)} MHz`);
        
        const airport = airportService.getAirportByFrequency(frequency);
        
        if (airport) {
            const airportCode = airport.iata || airport.icao;
            let runwayName = null;
            
            // 1. Check Flight Plan (Arrival)
            if (flightPlan && flightPlan.arrival && (flightPlan.arrival.iata === airportCode || flightPlan.arrival.icao === airportCode)) {
                // If specific runway selected in arrival (rare in this data structure but possible)
            }
            
            // 2. Check Waypoints
            if (flightPlan && flightPlan.waypoints) {
                 const wp = flightPlan.waypoints.find(w => w.type === 'airport' && (w.label === airport.iata || w.label === airport.icao));
                 if (wp && wp.selectedRunway) {
                     runwayName = wp.selectedRunway;
                 }
            }
            
            // 3. Fallback Arrival
            if (!runwayName && flightPlan && flightPlan.arrival && (flightPlan.arrival.iata === airportCode || flightPlan.arrival.icao === airportCode)) {
                 if (flightPlan.arrival.runways && flightPlan.arrival.runways.length > 0) {
                     runwayName = flightPlan.arrival.runways[0].name;
                 }
            }

            // 4. Fallback Default
            if (!runwayName) {
                if (airport.runways && airport.runways.length > 0) {
                    runwayName = airport.runways[0].name.split('/')[0].trim();
                } else if (airport.runway) {
                    runwayName = airport.runway.split('/')[0].trim();
                } else {
                    runwayName = "09"; 
                }
                console.log(`📻 Radio Service: No specific runway selected for ${airportCode}, defaulting to ${runwayName}`);
            }
            
            // 5. Smart Runway Selection (Auto-Align)
            if (runwayName) {
                let options = [];
                if (airport.runways) {
                    options = airport.runways.flatMap(r => r.name.split('/').map(p => p.trim()));
                } else if (airport.runway) {
                    options = airport.runway.split('/').map(p => p.trim());
                } else {
                    options = ["09", "27"];
                }

                const getHeading = (name) => {
                    const match = name.match(/^(\d{2})/);
                    return match ? parseInt(match[1]) * 10 : 0;
                };

                const currentRunwayH = getHeading(runwayName);
                
                let diff = Math.abs(aircraftHeading - currentRunwayH);
                if (diff > 180) diff = 360 - diff;
                
                if (diff > 90) {
                    const betterOption = options.find(opt => {
                        const optH = getHeading(opt);
                        let d = Math.abs(aircraftHeading - optH);
                        if (d > 180) d = 360 - d;
                        return d <= 90;
                    });
                    
                    if (betterOption) {
                        console.log(`📻 Radio Service: Auto-switching runway from ${runwayName} to ${betterOption}`);
                        runwayName = betterOption;
                    }
                }
            }
            
            if (runwayName) {
                const geom = airportService.getRunwayGeometry(airportCode, runwayName);
                if (geom) {
                    console.log(`📻 Radio Service: ILS geometry resolved for ${airportCode} RWY ${runwayName}`);
                    return geom;
                }
            }
        }
        return null;
    }
}

export default RadioService;

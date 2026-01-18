import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../src/data/airportDatabase.json');

async function updateElevations() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const airports = db.airports;
    
    console.log(`Processing ${airports.length} airports...`);
    
    // Batch in chunks of 50
    const CHUNK_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < airports.length; i += CHUNK_SIZE) {
      const chunk = airports.slice(i, i + CHUNK_SIZE);
      const locations = chunk.map(a => ({ latitude: a.latitude, longitude: a.longitude }));
      
      console.log(`Fetching batch ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(airports.length/CHUNK_SIZE)}...`);
      
      try {
        const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update elevations
        result.results.forEach((res, idx) => {
            const airport = chunk[idx];
            // Convert meters to feet: 1 m = 3.28084 ft
            const elevationFt = Math.round(res.elevation * 3.28084);
            
            // Only update if difference is > 10ft (to avoid minor noise)
            if (Math.abs(airport.elevation - elevationFt) > 10) {
                console.log(`Updated ${airport.iata || airport.name}: ${airport.elevation} -> ${elevationFt} ft`);
                airport.elevation = elevationFt;
                updatedCount++;
            }
        });
        
        // Be nice to the API
        await new Promise(r => setTimeout(r, 500));
        
      } catch (err) {
        console.error(`Failed batch ${Math.floor(i/CHUNK_SIZE) + 1}:`, err);
      }
    }
    
    // Update metadata
    if (db.metadata) {
        db.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    }
    
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`Database updated successfully! ${updatedCount} airports updated.`);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

updateElevations();

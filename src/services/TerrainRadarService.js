import { calculateDistance } from '../utils/distanceCalculator';

class TerrainRadarService {
    constructor() {
        this.GRID_SIZE = 0.01; // 0.01 degrees resolution (approx 1.1km or 0.6nm)
        this.cache = new Map(); // Key: "latIdx_lonIdx", Value: height (ft)
        this.fetchQueue = []; // Array of { key, latIdx, lonIdx, lat, lon, distSq }
        this.isFetching = false;
        this.lastPlayerPos = { lat: 0, lon: 0 };
        this.maxCacheSize = 5000; // Limit cache size
        
        // Open-Elevation API endpoint
        // Using a public free instance. In production, use your own instance or a paid plan.
        this.API_ENDPOINT = 'https://api.open-elevation.com/api/v1/lookup';
        
        // Start the fetch loop
        this.startFetcher();
    }

    // Convert lat/lon to grid indices
    getGridIndices(lat, lon) {
        return {
            latIdx: Math.floor(lat / this.GRID_SIZE),
            lonIdx: Math.floor(lon / this.GRID_SIZE)
        };
    }

    // Get unique key for grid tile
    getKey(latIdx, lonIdx) {
        return `${latIdx}_${lonIdx}`;
    }

    // Public method to get terrain height
    // Returns height in feet if available, or null if pending
    getTerrainHeight(lat, lon) {
        const { latIdx, lonIdx } = this.getGridIndices(lat, lon);
        const key = this.getKey(latIdx, lonIdx);
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        // If not in cache, it will be picked up by the update loop
        return null;
    }

    // Main update loop called by the component
    // Populates the queue based on current position and range
    update(lat, lon, rangeNm) {
        this.lastPlayerPos = { lat, lon };

        // 1. Calculate visible grid bounds
        // 1 degree approx 60nm. 
        const rangeDeg = rangeNm / 60;
        const startLat = lat - rangeDeg;
        const endLat = lat + rangeDeg;
        const startLon = lon - rangeDeg; 
        const endLon = lon + rangeDeg;

        const startIdx = this.getGridIndices(startLat, startLon);
        const endIdx = this.getGridIndices(endLat, endLon);

        const newQueue = [];
        const seenKeys = new Set();

        // 2. Identify needed tiles
        for (let i = startIdx.latIdx; i <= endIdx.latIdx; i++) {
            for (let j = startIdx.lonIdx; j <= endIdx.lonIdx; j++) {
                const key = this.getKey(i, j);
                if (!this.cache.has(key)) {
                    // Calculate center of tile
                    const tileLat = (i + 0.5) * this.GRID_SIZE;
                    const tileLon = (j + 0.5) * this.GRID_SIZE;
                    
                    // Approximate distance check
                    const distSq = (tileLat - lat) ** 2 + (tileLon - lon) ** 2; // Squared deg distance
                    
                    newQueue.push({
                        key,
                        latIdx: i,
                        lonIdx: j,
                        lat: tileLat,
                        lon: tileLon,
                        distSq
                    });
                }
                seenKeys.add(key);
            }
        }

        // 3. Update Queue: Sort by distance (closest first)
        // We only replace the queue if we have new targets, merging with existing priority
        // For simplicity, we just use the new queue but might lose in-progress stuff if not careful.
        // Better: Filter out what is already in cache (done above) and replace queue.
        newQueue.sort((a, b) => a.distSq - b.distSq);
        this.fetchQueue = newQueue;

        // 4. Cleanup old cache
        this.cleanup(seenKeys);
    }

    cleanup(activeKeys) {
        // Remove keys that are too far (not in the current active set)
        // To prevent thrashing, we only remove if cache is too big
        if (this.cache.size > this.maxCacheSize) {
            for (const key of this.cache.keys()) {
                if (!activeKeys.has(key)) {
                    this.cache.delete(key);
                    if (this.cache.size <= this.maxCacheSize) break;
                }
            }
        }
    }

    // Async Fetcher Loop
    async startFetcher() {
        const processBatch = async () => {
            if (this.fetchQueue.length > 0 && !this.isFetching) {
                this.isFetching = true;
                
                // Process a batch of tiles
                // Open-Elevation accepts multiple locations in one request
                // Let's take up to 20 closest points
                const batchSize = 20;
                const batch = this.fetchQueue.splice(0, batchSize);

                if (batch.length > 0) {
                    try {
                        await this.fetchElevationData(batch);
                    } catch (error) {
                        console.warn("Terrain fetch failed:", error);
                        // Re-queue items at the back or discard? 
                        // For now, discard to prevent loops, they will be re-added by update() if still relevant
                    }
                }
                
                this.isFetching = false;
            }
            
            // Schedule next check
            setTimeout(processBatch, 200); // 5 requests per second max (polite rate limit)
        };

        processBatch();
    }

    // Call Open-Elevation API
    async fetchElevationData(batch) {
        // Format: locations=lat,lon|lat,lon...
        const locationsParam = batch.map(item => `${item.lat.toFixed(5)},${item.lon.toFixed(5)}`).join('|');
        const url = `${this.API_ENDPOINT}?locations=${locationsParam}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.results) {
                data.results.forEach((result, index) => {
                    // Match result back to batch item (assuming order is preserved as per API docs)
                    // Or match by coordinates if unsure, but API docs say order preserved.
                    if (index < batch.length) {
                        const item = batch[index];
                        const elevationMeters = result.elevation;
                        const elevationFeet = elevationMeters * 3.28084;
                        this.cache.set(item.key, elevationFeet);
                    }
                });
            }
        } catch (error) {
            // Fallback to 0 if API fails, or dont set cache so it retries
            // console.error(error);
            throw error;
        }
    }
}

export const terrainRadarService = new TerrainRadarService();

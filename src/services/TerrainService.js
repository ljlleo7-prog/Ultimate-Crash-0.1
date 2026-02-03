
const BASE_URL = 'https://api.open-elevation.com/api/v1/lookup';

class TerrainService {
  constructor() {
    this.cache = new Map(); // Key: "lat,lon" (rounded), Value: elevation
    this.lastCallTime = 0;
    this.pendingRequest = null;
    this.MIN_INTERVAL = 1000; // 1 second
    this.failureCount = 0;
    this.nextRetryTime = 0;
    this.RETRY_DELAY = 60000; // 1 minute backoff after failures
    this.MAX_FAILURES = 5;
  }

  /**
   * Get terrain elevation for a specific location.
   * Uses Open-Elevation API with throttling and caching.
   * @param {number} lat 
   * @param {number} lon 
   * @returns {Promise<number>} Elevation in meters
   */
  async getElevation(lat, lon) {
    // Round to 3 decimal places (~100m precision) for caching
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const now = Date.now();

    // Circuit breaker check
    if (now < this.nextRetryTime) {
      return 0; // Return sea level (safe fallback) while blocked
    }

    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.MIN_INTERVAL) {
      // Return cached value if available, or wait? 
      // For smooth gameplay, returning previous nearest or waiting is better.
      // But we can't block. Let's return a promise that resolves later?
      // Or just return null/undefined and handle it? 
      // Let's return the last known good value if throttled.
      return null; 
    }

    this.lastCallTime = now;

    try {
      const response = await fetch(`${BASE_URL}?locations=${lat},${lon}`);
      if (!response.ok) throw new Error('Terrain API failed');
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const elevation = data.results[0].elevation;
        this.cache.set(key, elevation);
        
        // Prune cache if too big
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        // Reset failure counters on success
        this.failureCount = 0;
        this.nextRetryTime = 0;
        
        return elevation;
      }
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.MAX_FAILURES) {
          console.warn(`Terrain API failed ${this.failureCount} times. Backing off for ${this.RETRY_DELAY/1000}s.`);
          this.nextRetryTime = now + this.RETRY_DELAY;
          this.failureCount = 0; // Reset count so we try again fresh after delay
      } else {
          console.warn('Terrain fetch failed:', error);
      }
    }
    
    return 0; // Fallback to sea level
  }
}

export const terrainService = new TerrainService();

// WeatherRadarService.js
// Mirrors TerrainRadarService pattern: cached grid, limited storage, async fetch.
// Uses Open-Meteo (free, no API key) for cloud cover + precipitation (proxy for turbulence).

class WeatherRadarService {
    constructor() {
        this.GRID_SIZE = 0.25; // 0.25 deg resolution (~15nm) — coarser than terrain, matches Open-Meteo grid
        this.cache = new Map(); // key: "latIdx_lonIdx" -> { cloud: 0-100, precip: mm/h, updated: timestamp }
        this.fetchQueue = [];
        this.isFetching = false;
        this.maxCacheSize = 500;
        this.cacheTTL = 5 * 60 * 1000; // 5 min — weather changes slowly

        if (typeof window !== 'undefined') {
            this._startFetcher();
        }
    }

    getGridIndices(lat, lon) {
        return {
            latIdx: Math.floor(lat / this.GRID_SIZE),
            lonIdx: Math.floor(lon / this.GRID_SIZE)
        };
    }

    getKey(latIdx, lonIdx) {
        return `${latIdx}_${lonIdx}`;
    }

    // Returns { cloud: 0-100, precip: mm/h } or null if not yet fetched
    getWeather(lat, lon) {
        const { latIdx, lonIdx } = this.getGridIndices(lat, lon);
        const entry = this.cache.get(this.getKey(latIdx, lonIdx));
        if (!entry) return null;
        // Expire stale entries
        if (Date.now() - entry.updated > this.cacheTTL) {
            this.cache.delete(this.getKey(latIdx, lonIdx));
            return null;
        }
        return entry;
    }

    update(lat, lon, rangeNm) {
        const rangeDeg = rangeNm / 60;
        const startIdx = this.getGridIndices(lat - rangeDeg, lon - rangeDeg);
        const endIdx   = this.getGridIndices(lat + rangeDeg, lon + rangeDeg);

        const newQueue = [];
        const seenKeys = new Set();

        for (let i = startIdx.latIdx; i <= endIdx.latIdx; i++) {
            for (let j = startIdx.lonIdx; j <= endIdx.lonIdx; j++) {
                const key = this.getKey(i, j);
                seenKeys.add(key);
                const entry = this.cache.get(key);
                const stale = !entry || (Date.now() - entry.updated > this.cacheTTL);
                if (stale) {
                    const tileLat = (i + 0.5) * this.GRID_SIZE;
                    const tileLon = (j + 0.5) * this.GRID_SIZE;
                    const distSq = (tileLat - lat) ** 2 + (tileLon - lon) ** 2;
                    newQueue.push({ key, latIdx: i, lonIdx: j, lat: tileLat, lon: tileLon, distSq });
                }
            }
        }

        newQueue.sort((a, b) => a.distSq - b.distSq);
        this.fetchQueue = newQueue;
        this._cleanup(seenKeys);
    }

    _cleanup(activeKeys) {
        if (this.cache.size > this.maxCacheSize) {
            for (const key of this.cache.keys()) {
                if (!activeKeys.has(key)) {
                    this.cache.delete(key);
                    if (this.cache.size <= this.maxCacheSize) break;
                }
            }
        }
    }

    async _startFetcher() {
        const loop = async () => {
            if (this.fetchQueue.length > 0 && !this.isFetching) {
                this.isFetching = true;
                // Fetch one tile at a time — Open-Meteo is per-point
                const item = this.fetchQueue.shift();
                try {
                    await this._fetchTile(item);
                } catch (e) {
                    // discard on failure, will retry on next update()
                }
                this.isFetching = false;
            }
            setTimeout(loop, 300); // ~3 req/s — polite rate limit
        };
        loop();
    }

    async _fetchTile(item) {
        // Open-Meteo: free, no key, CORS-friendly
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${item.lat.toFixed(2)}&longitude=${item.lon.toFixed(2)}&current=cloud_cover,precipitation&wind_speed_unit=kn&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather fetch ${res.status}`);
        const data = await res.json();
        const cloud = data?.current?.cloud_cover ?? 0;   // 0-100 %
        const precip = data?.current?.precipitation ?? 0; // mm/h
        this.cache.set(item.key, { cloud, precip, updated: Date.now() });
    }
}

export const weatherRadarService = new WeatherRadarService();

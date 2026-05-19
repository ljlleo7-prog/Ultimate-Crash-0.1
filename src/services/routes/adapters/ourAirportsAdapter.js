import { getCachedRoute, setCachedRoute, buildRouteCacheKey } from '../routeCacheService.js';
import { PROVIDER_STATUS, REFERENCE_DATA_TTL_MS, ROUTE_SOURCES } from '../routeTypes.js';

const csvUrl = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

export const fetchOurAirportsCsv = async ({ fetchImpl = fetch } = {}) => {
  const cacheKey = buildRouteCacheKey({ provider: ROUTE_SOURCES.OUR_AIRPORTS, authState: 'public' });
  const cached = getCachedRoute(cacheKey, REFERENCE_DATA_TTL_MS);
  if (cached) {
    return { status: PROVIDER_STATUS.OK, records: cached, cached: true, billing: { chargedTokens: 0 } };
  }

  try {
    const response = await fetchImpl(csvUrl);
    if (!response.ok) {
      return { status: PROVIDER_STATUS.PROVIDER_FAILED, message: `OurAirports status ${response.status}` };
    }
    const text = await response.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(headerLine);
    const records = lines.map((line) => {
      const values = parseCsvLine(line);
      return headers.reduce((record, header, index) => ({ ...record, [header]: values[index] || '' }), {});
    });
    setCachedRoute(cacheKey, records);
    return { status: PROVIDER_STATUS.OK, records, cached: false, billing: { chargedTokens: 0 } };
  } catch (error) {
    return { status: PROVIDER_STATUS.PROVIDER_FAILED, message: error.message || 'OurAirports fetch failed' };
  }
};

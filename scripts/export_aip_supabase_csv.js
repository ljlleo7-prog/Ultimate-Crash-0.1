import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultInputDir = path.join(rootDir, 'AIP_DATA');
const defaultOutputDir = path.join(rootDir, 'AIP_DATA', 'supabase_csv');
const now = new Date().toISOString();

const REGION_CONFIGS = {
  CN: {
    regionName: 'China',
    aipCycle: '2605',
    regionAipNumber: 'Nr2605',
    validFrom: '2026-05-13T16:00:00Z',
    sourceSystem: 'China AIP CSV',
    sourceDir: 'CHINA_AIP'
  },
  US: {
    regionName: 'United States',
    aipCycle: '2605',
    regionAipNumber: 'FAA CIFP 2605',
    validFrom: '2026-05-14T00:00:00Z',
    sourceSystem: 'FAA CIFP / OurAirports',
    sourceDir: 'US_FAA_CIFP'
  }
};

const OUTPUTS = {
  regions: 'aip_regions.csv',
  rawSources: 'aip_raw_sources.csv',
  routeCatalog: 'aip_route_catalog.csv',
  routeAirportIndex: 'aip_route_airport_index.csv',
  routeLookupIndex: 'aip_route_lookup_index.csv',
  routeTokens: 'aip_route_tokens.csv',
  routeLegs: 'aip_route_legs.csv',
  routeEdgeIndex: 'aip_route_edge_index.csv',
  referencePoints: 'aip_reference_points.csv'
};

const TABLE_COLUMNS = {
  regions: [
    'region_code',
    'region_name',
    'implemented',
    'aip_cycle',
    'region_aip_number',
    'source_system',
    'source_files',
    'route_count',
    'reference_point_count',
    'valid_from',
    'valid_until',
    'last_updated_at',
    'notes'
  ],
  rawSources: [
    'source_id',
    'region_code',
    'aip_cycle',
    'source_file',
    'source_kind',
    'parsed',
    'row_count',
    'imported_at'
  ],
  routeCatalog: [
    'route_id',
    'region_code',
    'aip_cycle',
    'route_code',
    'route_family',
    'direction',
    'origin_key',
    'destination_key',
    'route_text',
    'source_file',
    'source_row',
    'status',
    'created_at'
  ],
  routeAirportIndex: [
    'region_code',
    'aip_cycle',
    'airport_code',
    'airport_role',
    'route_id',
    'route_code',
    'direction',
    'opposite_key'
  ],
  routeLookupIndex: [
    'region_code',
    'aip_cycle',
    'departure_code',
    'arrival_code',
    'route_id',
    'route_code',
    'lookup_rank'
  ],
  routeTokens: [
    'route_id',
    'sequence_number',
    'token',
    'token_type',
    'airway',
    'region_code',
    'aip_cycle'
  ],
  routeLegs: [
    'route_id',
    'leg_sequence',
    'from_fix',
    'airway',
    'to_fix',
    'region_code',
    'aip_cycle'
  ],
  routeEdgeIndex: [
    'region_code',
    'aip_cycle',
    'from_fix',
    'to_fix',
    'airway',
    'route_id',
    'route_code',
    'leg_sequence'
  ],
  referencePoints: [
    'point_id',
    'region_code',
    'aip_cycle',
    'ident',
    'point_type',
    'name',
    'latitude_deg',
    'longitude_deg',
    'elevation_ft',
    'iso_country',
    'associated_airport',
    'frequency_khz',
    'dme_frequency_khz',
    'dme_channel',
    'usage_type',
    'power',
    'source_system',
    'source_file'
  ]
};

const parseArgs = (args) => {
  const options = {
    inputDir: defaultInputDir,
    outputDir: defaultOutputDir,
    regions: ['CN', 'US']
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--input') options.inputDir = path.resolve(args[++index]);
    else if (arg.startsWith('--input=')) options.inputDir = path.resolve(arg.slice('--input='.length));
    else if (arg === '--out') options.outputDir = path.resolve(args[++index]);
    else if (arg.startsWith('--out=')) options.outputDir = path.resolve(arg.slice('--out='.length));
    else if (arg === '--region') options.regions = args[++index].split(',').map((value) => value.trim().toUpperCase());
    else if (arg.startsWith('--region=')) options.regions = arg.slice('--region='.length).split(',').map((value) => value.trim().toUpperCase());
  }

  return options;
};

const readText = async (filePath) => fs.readFile(filePath, 'utf8');

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
};

const parseCsvRows = (text) => text
  .replace(/^﻿/, '')
  .split(/\r?\n/)
  .filter((line) => line.trim().length)
  .map(parseCsvLine);

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (outputDir, key, rows) => {
  const columns = TABLE_COLUMNS[key];
  const content = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
  ].join('\n');

  await fs.writeFile(path.join(outputDir, OUTPUTS[key]), `${content}\n`, 'utf8');
};

const listFiles = async (dirPath) => {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
};

const normalizeToken = (token) => token.trim().toUpperCase();

const isAirwayToken = (token) => /^[A-Z]{1,3}\d{1,4}[A-Z]?$/.test(token);

const tokenizeRoute = (routeText) => routeText
  .split(/[\s/]+/)
  .map(normalizeToken)
  .filter(Boolean)
  .filter((token) => !['DCT', 'DIRECT'].includes(token));

const buildRouteParts = (tokens) => {
  const tokenRows = tokens.map((token, index) => ({
    sequence_number: index + 1,
    token,
    token_type: isAirwayToken(token) ? 'airway' : 'fix',
    airway: isAirwayToken(token) ? token : ''
  }));
  const legs = [];
  let fromFix = null;
  let airway = 'DCT';

  for (const token of tokens) {
    if (isAirwayToken(token)) {
      airway = token;
      continue;
    }

    if (fromFix) {
      legs.push({
        leg_sequence: legs.length + 1,
        from_fix: fromFix,
        airway,
        to_fix: token
      });
    }

    fromFix = token;
    airway = 'DCT';
  }

  return { tokenRows, legs };
};

const routeFamilyFromFile = (fileName) => {
  const lower = fileName.toLowerCase();
  if (lower.includes('regional')) return 'regional';
  if (lower.includes('overflying')) return 'overflight';
  if (lower.includes('from mainland')) return 'international_from_cn';
  if (lower.includes('to mainland')) return 'international_to_cn';
  return 'unknown';
};

const splitRouteCode = (routeCode) => {
  const parts = routeCode.split('-').filter(Boolean);
  const suffixIsVariant = parts.length > 2 && /^\d+[A-Z]?$/.test(parts.at(-1));
  return {
    origin: parts[0] || '',
    destination: suffixIsVariant ? parts.at(-2) : parts.at(-1) || '',
    variant: suffixIsVariant ? parts.at(-1) : ''
  };
};

const routeDirection = (routeFamily) => {
  if (routeFamily === 'international_from_cn') return 'departure';
  if (routeFamily === 'international_to_cn') return 'arrival';
  if (routeFamily === 'overflight') return 'overflight';
  return 'domestic';
};

const airportCodesFromValue = (value) => String(value || '')
  .split(/\s+/)
  .map(normalizeToken)
  .filter((token) => /^[A-Z0-9]{4}$/.test(token));

const addRouteIndexes = ({
  route,
  routeFamily,
  extraAirportCodes,
  airportIndex,
  lookupIndex,
  lookupRank
}) => {
  const airportRows = [];
  const lookupRows = [];
  const extraCodes = [...new Set(extraAirportCodes)];

  const addAirport = (airportCode, airportRole, oppositeKey) => {
    airportRows.push({
      region_code: route.region_code,
      aip_cycle: route.aip_cycle,
      airport_code: airportCode,
      airport_role: airportRole,
      route_id: route.route_id,
      route_code: route.route_code,
      direction: route.direction,
      opposite_key: oppositeKey
    });
  };

  if (routeFamily === 'international_to_cn') {
    for (const airportCode of extraCodes) {
      addAirport(airportCode, 'departure', route.destination_key);
      lookupRows.push({
        region_code: route.region_code,
        aip_cycle: route.aip_cycle,
        departure_code: airportCode,
        arrival_code: route.destination_key,
        route_id: route.route_id,
        route_code: route.route_code,
        lookup_rank: lookupRank
      });
    }
    addAirport(route.destination_key, 'arrival', extraCodes.join(' '));
  } else if (routeFamily === 'international_from_cn') {
    addAirport(route.origin_key, 'departure', extraCodes.join(' '));
    for (const airportCode of extraCodes) {
      addAirport(airportCode, 'arrival', route.origin_key);
      lookupRows.push({
        region_code: route.region_code,
        aip_cycle: route.aip_cycle,
        departure_code: route.origin_key,
        arrival_code: airportCode,
        route_id: route.route_id,
        route_code: route.route_code,
        lookup_rank: lookupRank
      });
    }
  } else if (routeFamily === 'regional') {
    addAirport(route.origin_key, 'departure', route.destination_key);
    addAirport(route.destination_key, 'arrival', route.origin_key);
    lookupRows.push({
      region_code: route.region_code,
      aip_cycle: route.aip_cycle,
      departure_code: route.origin_key,
      arrival_code: route.destination_key,
      route_id: route.route_id,
      route_code: route.route_code,
      lookup_rank: lookupRank
    });
  }

  airportIndex.push(...airportRows.filter((row) => row.airport_code));
  lookupIndex.push(...lookupRows.filter((row) => row.departure_code && row.arrival_code));
};

const parseChinaRoutes = async (inputDir, tables) => {
  const config = REGION_CONFIGS.CN;
  const chinaDir = path.join(inputDir, config.sourceDir);
  const files = (await listFiles(chinaDir)).filter((file) => file.endsWith('.csv')).sort();
  let routeCount = 0;

  for (const fileName of files) {
    const filePath = path.join(chinaDir, fileName);
    const rows = parseCsvRows(await readText(filePath));
    const headerIndex = rows.findIndex((row) => row.includes('Route Code'));
    const headers = rows[headerIndex] || [];
    const routeCodeIndex = headers.indexOf('Route Code');
    const flyAlongIndex = headers.indexOf('Fly along');
    const departureIndex = headers.indexOf('Departure AD');
    const destinationIndex = headers.indexOf('Destination AD');
    const statusIndex = headers.indexOf('Status');
    const routeFamily = routeFamilyFromFile(fileName);

    let parsedRows = 0;
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const routeCode = normalizeToken(row[routeCodeIndex] || '');
      const routeText = String(row[flyAlongIndex] || '').trim();
      if (!routeCode || !routeText) continue;

      const { origin, destination } = splitRouteCode(routeCode);
      const routeId = `CN-2605-${routeCode}`;
      const route = {
        route_id: routeId,
        region_code: 'CN',
        aip_cycle: config.aipCycle,
        route_code: routeCode,
        route_family: routeFamily,
        direction: routeDirection(routeFamily),
        origin_key: origin,
        destination_key: destination,
        route_text: routeText,
        source_file: fileName,
        source_row: rowIndex + 1,
        status: row[statusIndex] || '',
        created_at: now
      };

      const tokens = tokenizeRoute(routeText);
      const { tokenRows, legs } = buildRouteParts(tokens);
      tables.routeCatalog.push(route);
      tables.routeTokens.push(...tokenRows.map((tokenRow) => ({ ...tokenRow, route_id: routeId, region_code: 'CN', aip_cycle: config.aipCycle })));
      tables.routeLegs.push(...legs.map((leg) => ({ ...leg, route_id: routeId, region_code: 'CN', aip_cycle: config.aipCycle })));
      tables.routeEdgeIndex.push(...legs.map((leg) => ({
        region_code: 'CN',
        aip_cycle: config.aipCycle,
        from_fix: leg.from_fix,
        to_fix: leg.to_fix,
        airway: leg.airway,
        route_id: routeId,
        route_code: routeCode,
        leg_sequence: leg.leg_sequence
      })));

      const extraAirportCodes = airportCodesFromValue(row[departureIndex] || row[destinationIndex]);
      addRouteIndexes({
        route,
        routeFamily,
        extraAirportCodes,
        airportIndex: tables.routeAirportIndex,
        lookupIndex: tables.routeLookupIndex,
        lookupRank: parsedRows + 1
      });

      routeCount += 1;
      parsedRows += 1;
    }

    tables.rawSources.push({
      source_id: `CN-2605-${fileName}`,
      region_code: 'CN',
      aip_cycle: config.aipCycle,
      source_file: path.join(config.sourceDir, fileName),
      source_kind: 'route_csv',
      parsed: true,
      row_count: parsedRows,
      imported_at: now
    });
  }

  return { files, routeCount };
};

const coordinateToDecimal = (coord) => {
  const match = /^([NS])(\d{2})(\d{2})(\d{2})(\d{2})([EW])(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(coord);
  if (!match) return null;
  const lat = Number(match[2]) + Number(match[3]) / 60 + Number(`${match[4]}.${match[5]}`) / 3600;
  const lon = Number(match[7]) + Number(match[8]) / 60 + Number(`${match[9]}.${match[10]}`) / 3600;
  return {
    latitude_deg: match[1] === 'S' ? -lat : lat,
    longitude_deg: match[6] === 'W' ? -lon : lon
  };
};

const parseAirportReferencePoints = async (inputDir, tables) => {
  const fileName = 'airports.csv';
  const rows = parseCsvRows(await readText(path.join(inputDir, fileName)));
  const headers = rows[0];
  const index = Object.fromEntries(headers.map((header, columnIndex) => [header, columnIndex]));
  let count = 0;

  for (const row of rows.slice(1)) {
    const isoCountry = row[index.iso_country];
    if (!['CN', 'US'].includes(isoCountry)) continue;
    const ident = row[index.icao_code] || row[index.gps_code] || row[index.ident];
    if (!ident) continue;

    tables.referencePoints.push({
      point_id: `${isoCountry}-2605-airport-${ident}`,
      region_code: isoCountry,
      aip_cycle: '2605',
      ident,
      point_type: 'airport',
      name: row[index.name],
      latitude_deg: row[index.latitude_deg],
      longitude_deg: row[index.longitude_deg],
      elevation_ft: row[index.elevation_ft],
      iso_country: isoCountry,
      associated_airport: ident,
      frequency_khz: '',
      dme_frequency_khz: '',
      dme_channel: '',
      usage_type: '',
      power: '',
      source_system: 'OurAirports',
      source_file: fileName
    });
    count += 1;
  }

  tables.rawSources.push({
    source_id: 'GLOBAL-2605-airports.csv',
    region_code: 'GLOBAL',
    aip_cycle: '2605',
    source_file: fileName,
    source_kind: 'airport_reference_csv',
    parsed: true,
    row_count: count,
    imported_at: now
  });
};

const parseNavaidReferencePoints = async (inputDir, tables) => {
  const fileName = 'navaids.csv';
  const rows = parseCsvRows(await readText(path.join(inputDir, fileName)));
  const headers = rows[0];
  const index = Object.fromEntries(headers.map((header, columnIndex) => [header, columnIndex]));
  let count = 0;

  for (const row of rows.slice(1)) {
    const isoCountry = row[index.iso_country];
    if (!['CN', 'US'].includes(isoCountry)) continue;
    const ident = row[index.ident];
    if (!ident) continue;

    tables.referencePoints.push({
      point_id: `${isoCountry}-2605-navaid-${ident}-${count + 1}`,
      region_code: isoCountry,
      aip_cycle: '2605',
      ident,
      point_type: String(row[index.type] || 'navaid').toLowerCase(),
      name: row[index.name],
      latitude_deg: row[index.latitude_deg],
      longitude_deg: row[index.longitude_deg],
      elevation_ft: row[index.elevation_ft],
      iso_country: isoCountry,
      associated_airport: row[index.associated_airport],
      frequency_khz: row[index.frequency_khz],
      dme_frequency_khz: row[index.dme_frequency_khz],
      dme_channel: row[index.dme_channel],
      usage_type: row[index.usageType],
      power: row[index.power],
      source_system: 'OurAirports',
      source_file: fileName
    });
    count += 1;
  }

  tables.rawSources.push({
    source_id: 'GLOBAL-2605-navaids.csv',
    region_code: 'GLOBAL',
    aip_cycle: '2605',
    source_file: fileName,
    source_kind: 'navaid_reference_csv',
    parsed: true,
    row_count: count,
    imported_at: now
  });
};

const parseFaaCifpReferencePoints = async (inputDir, tables) => {
  const config = REGION_CONFIGS.US;
  const fileName = 'FAACIFP18.txt';
  const filePath = path.join(inputDir, config.sourceDir, fileName);
  const lines = (await readText(filePath)).split(/\r?\n/);
  let count = 0;

  for (const line of lines) {
    if (!line.startsWith('SUSAD')) continue;
    const ident = line.slice(13, 18).trim();
    const coordMatch = line.match(/N\d{8}W\d{9}|N\d{8}E\d{9}|S\d{8}W\d{9}|S\d{8}E\d{9}/);
    const coords = coordMatch ? coordinateToDecimal(coordMatch[0]) : null;
    if (!ident || !coords) continue;

    tables.referencePoints.push({
      point_id: `US-2605-faa-cifp-navaid-${ident}-${count + 1}`,
      region_code: 'US',
      aip_cycle: config.aipCycle,
      ident,
      point_type: 'navaid',
      name: line.slice(93, 123).trim(),
      latitude_deg: coords.latitude_deg.toFixed(8),
      longitude_deg: coords.longitude_deg.toFixed(8),
      elevation_ft: '',
      iso_country: 'US',
      associated_airport: '',
      frequency_khz: '',
      dme_frequency_khz: '',
      dme_channel: '',
      usage_type: '',
      power: '',
      source_system: 'FAA CIFP',
      source_file: path.join(config.sourceDir, fileName)
    });
    count += 1;
  }

  tables.rawSources.push({
    source_id: 'US-2605-FAACIFP18.txt',
    region_code: 'US',
    aip_cycle: config.aipCycle,
    source_file: path.join(config.sourceDir, fileName),
    source_kind: 'faa_cifp_fixed_width',
    parsed: count > 0,
    row_count: count,
    imported_at: now
  });

  return count;
};

const addRegionRows = (tables, regionSummaries) => {
  for (const regionCode of ['CN', 'US']) {
    const config = REGION_CONFIGS[regionCode];
    const summary = regionSummaries[regionCode] || { files: [], routeCount: 0 };
    const referencePointCount = tables.referencePoints.filter((row) => row.region_code === regionCode).length;

    tables.regions.push({
      region_code: regionCode,
      region_name: config.regionName,
      implemented: true,
      aip_cycle: config.aipCycle,
      region_aip_number: config.regionAipNumber,
      source_system: config.sourceSystem,
      source_files: summary.files.join(';'),
      route_count: summary.routeCount,
      reference_point_count: referencePointCount,
      valid_from: config.validFrom,
      valid_until: '',
      last_updated_at: now,
      notes: regionCode === 'US'
        ? 'First export includes airport/navaid reference data; detailed FAA procedure route extraction should be added after ARINC record mapping is finalized.'
        : 'First export includes published China route catalogs expanded into route lookup and leg indexes.'
    });
  }
};

const sortTables = (tables) => {
  tables.routeCatalog.sort((a, b) => a.route_id.localeCompare(b.route_id));
  tables.routeAirportIndex.sort((a, b) => `${a.airport_code}-${a.route_id}`.localeCompare(`${b.airport_code}-${b.route_id}`));
  tables.routeLookupIndex.sort((a, b) => `${a.departure_code}-${a.arrival_code}-${a.lookup_rank}`.localeCompare(`${b.departure_code}-${b.arrival_code}-${b.lookup_rank}`));
  tables.routeTokens.sort((a, b) => a.route_id.localeCompare(b.route_id) || a.sequence_number - b.sequence_number);
  tables.routeLegs.sort((a, b) => a.route_id.localeCompare(b.route_id) || a.leg_sequence - b.leg_sequence);
  tables.routeEdgeIndex.sort((a, b) => `${a.from_fix}-${a.to_fix}-${a.airway}-${a.route_id}`.localeCompare(`${b.from_fix}-${b.to_fix}-${b.airway}-${b.route_id}`));
  tables.referencePoints.sort((a, b) => `${a.region_code}-${a.ident}-${a.point_id}`.localeCompare(`${b.region_code}-${b.ident}-${b.point_id}`));
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const tables = Object.fromEntries(Object.keys(OUTPUTS).map((key) => [key, []]));
  const regionSummaries = {};

  await fs.mkdir(options.outputDir, { recursive: true });

  if (options.regions.includes('CN')) {
    regionSummaries.CN = await parseChinaRoutes(options.inputDir, tables);
  }

  await parseAirportReferencePoints(options.inputDir, tables);
  await parseNavaidReferencePoints(options.inputDir, tables);

  if (options.regions.includes('US')) {
    const count = await parseFaaCifpReferencePoints(options.inputDir, tables);
    regionSummaries.US = { files: ['US_FAA_CIFP/FAACIFP18.txt', 'airports.csv', 'navaids.csv'], routeCount: 0, referencePointCount: count };
  }

  addRegionRows(tables, regionSummaries);
  sortTables(tables);

  for (const key of Object.keys(OUTPUTS)) {
    await writeCsv(options.outputDir, key, tables[key]);
  }

  console.log(`Exported Supabase-shaped AIP CSV tables to ${options.outputDir}`);
  for (const key of Object.keys(OUTPUTS)) {
    console.log(`${OUTPUTS[key]}: ${tables[key].length} rows`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

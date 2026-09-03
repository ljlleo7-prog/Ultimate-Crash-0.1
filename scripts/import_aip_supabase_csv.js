import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const csvDir = path.join(rootDir, 'AIP_DATA', 'supabase_csv');

const timeout = setTimeout(() => {
  console.error('AIP Supabase CSV import timed out after 10 minutes');
  process.exit(1);
}, 600_000);
timeout.unref?.();

dotenv.config({ path: path.join(rootDir, '.env') });

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};

const dryRun = hasFlag('--dry-run');
const truncate = hasFlag('--truncate');
const selectedTable = getArgValue('--table');
const batchSize = Number(getArgValue('--batch-size') || 1000);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const TABLES = [
  ['aip_regions.csv', 'skylinetragedy_aip_regions'],
  ['aip_raw_sources.csv', 'skylinetragedy_aip_raw_sources'],
  ['aip_route_catalog.csv', 'skylinetragedy_aip_route_catalog'],
  ['aip_route_airport_index.csv', 'skylinetragedy_aip_route_airport_index'],
  ['aip_route_lookup_index.csv', 'skylinetragedy_aip_route_lookup_index'],
  ['aip_route_tokens.csv', 'skylinetragedy_aip_route_tokens'],
  ['aip_route_legs.csv', 'skylinetragedy_aip_route_legs'],
  ['aip_route_edge_index.csv', 'skylinetragedy_aip_route_edge_index'],
  ['aip_reference_points.csv', 'skylinetragedy_aip_reference_points'],
  ['aip_airports.csv', 'skylinetragedy_aip_airports'],
  ['aip_runways.csv', 'skylinetragedy_aip_runways'],
  ['aip_frequencies.csv', 'skylinetragedy_aip_frequencies'],
  ['aip_navaids.csv', 'skylinetragedy_aip_navaids']
];

const TABLE_KEYS = {
  skylinetragedy_aip_regions: ['region_code', 'aip_cycle'],
  skylinetragedy_aip_raw_sources: ['source_id'],
  skylinetragedy_aip_route_catalog: ['route_id'],
  skylinetragedy_aip_route_airport_index: ['region_code', 'aip_cycle', 'airport_code', 'airport_role', 'route_id'],
  skylinetragedy_aip_route_lookup_index: ['region_code', 'aip_cycle', 'departure_code', 'arrival_code', 'route_id'],
  skylinetragedy_aip_route_tokens: ['route_id', 'sequence_number'],
  skylinetragedy_aip_route_legs: ['route_id', 'leg_sequence'],
  skylinetragedy_aip_route_edge_index: ['region_code', 'aip_cycle', 'from_fix', 'to_fix', 'route_id', 'leg_sequence'],
  skylinetragedy_aip_reference_points: ['point_id'],
  skylinetragedy_aip_airports: ['airport_id'],
  skylinetragedy_aip_runways: ['runway_id'],
  skylinetragedy_aip_frequencies: ['frequency_id'],
  skylinetragedy_aip_navaids: ['navaid_id']
};

const tableTransforms = {
  skylinetragedy_aip_airports: (row) => ({
    airport_id: row.airport_id || row.id || row.ident,
    icao: row.icao || row.icao_code || row.gps_code || '',
    iata: row.iata || row.iata_code || '',
    ident: row.ident || row.gps_code || row.local_code || '',
    name: row.name,
    city: row.city || row.municipality || '',
    country: row.country || row.iso_country || '',
    iso_country: row.iso_country || '',
    region_code: row.region_code || row.iso_country || '',
    latitude_deg: row.latitude_deg,
    longitude_deg: row.longitude_deg,
    elevation_ft: row.elevation_ft,
    airport_type: row.airport_type || row.type || 'normal',
    category: row.category || row.type || '',
    source_system: row.source_system || 'OurAirports',
    source_file: row.source_file || 'aip_airports.csv'
  }),
  skylinetragedy_aip_runways: (row) => ({
    runway_id: row.runway_id || row.id,
    airport_id: row.airport_id || row.airport_ref,
    airport_code: row.airport_code || row.airport_ident || '',
    name: row.name || [row.le_ident, row.he_ident].filter(Boolean).join('/') || row.ident || '',
    length_ft: row.length_ft,
    width_ft: row.width_ft,
    surface: row.surface,
    category: row.category || '',
    bearing_deg: row.bearing_deg || row.le_heading_degT || row.he_heading_degT || null,
    start_latitude_deg: row.start_latitude_deg || row.le_latitude_deg || null,
    start_longitude_deg: row.start_longitude_deg || row.le_longitude_deg || null,
    end_latitude_deg: row.end_latitude_deg || row.he_latitude_deg || null,
    end_longitude_deg: row.end_longitude_deg || row.he_longitude_deg || null,
    source_system: row.source_system || 'OurAirports',
    source_file: row.source_file || 'aip_runways.csv'
  }),
  skylinetragedy_aip_frequencies: (row) => ({
    frequency_id: row.frequency_id || row.id,
    airport_id: row.airport_id || row.airport_ref || null,
    airport_code: row.airport_code || row.airport_ident || '',
    type: row.type || 'UNKNOWN',
    frequency_mhz: row.frequency_mhz,
    description: row.description || '',
    source_system: row.source_system || 'OurAirports',
    source_file: row.source_file || 'aip_frequencies.csv'
  }),
  skylinetragedy_aip_navaids: (row) => ({
    navaid_id: row.navaid_id || row.id || `${row.ident}-${row.latitude_deg}-${row.longitude_deg}`,
    ident: row.ident,
    name: row.name,
    navaid_type: row.navaid_type || row.type || 'navaid',
    latitude_deg: row.latitude_deg,
    longitude_deg: row.longitude_deg,
    elevation_ft: row.elevation_ft,
    frequency_khz: row.frequency_khz,
    dme_frequency_khz: row.dme_frequency_khz,
    dme_channel: row.dme_channel,
    associated_airport: row.associated_airport || '',
    iso_country: row.iso_country || '',
    region_code: row.region_code || row.iso_country || '',
    usage_type: row.usage_type || row.usageType || '',
    power: row.power || '',
    source_system: row.source_system || 'OurAirports',
    source_file: row.source_file || 'aip_navaids.csv'
  })
};

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
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
};

const coerceValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const parseCsv = (text) => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] || '');

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, coerceValue(values[index])]));
  });
};

const readRows = async (fileName) => {
  const filePath = path.join(csvDir, fileName);
  const text = await fs.readFile(filePath, 'utf8');
  return parseCsv(text);
};

const tableExists = async (fileName) => {
  try {
    await fs.access(path.join(csvDir, fileName));
    return true;
  } catch (_error) {
    return false;
  }
};

const chunk = (rows, size) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const stableRowSignature = (row) => JSON.stringify(
  Object.keys(row)
    .sort()
    .map((key) => [key, row[key] ?? null])
);

const rowKey = (row, keyColumns) => keyColumns.map((column) => String(row[column] ?? '')).join('|');

const validateAndDedupeRows = (rows, tableName) => {
  const transform = tableTransforms[tableName] || ((row) => row);
  const normalizedRows = rows.map(transform);
  const keyColumns = TABLE_KEYS[tableName];
  if (!keyColumns) return normalizedRows;

  const seen = new Map();
  const deduped = [];
  let identicalDuplicates = 0;

  normalizedRows.forEach((row, index) => {
    const key = rowKey(row, keyColumns);
    const signature = stableRowSignature(row);
    const previous = seen.get(key);

    if (!previous) {
      seen.set(key, { signature, row, line: index + 2 });
      deduped.push(row);
      return;
    }

    if (previous.signature === signature) {
      identicalDuplicates += 1;
      return;
    }

    throw new Error([
      `Conflicting duplicate key in ${tableName}: ${key}`,
      `First CSV line: ${previous.line}`,
      `Second CSV line: ${index + 2}`,
      `First row: ${JSON.stringify(previous.row)}`,
      `Second row: ${JSON.stringify(row)}`
    ].join('\n'));
  });

  if (identicalDuplicates > 0) {
    console.log(`  ${tableName}: collapsed ${identicalDuplicates} identical duplicate rows`);
  }

  return deduped;
};

const importTable = async (supabase, fileName, tableName) => {
  if (selectedTable && selectedTable !== tableName && selectedTable !== fileName) return;
  if (!(await tableExists(fileName))) {
    console.log(`skip ${tableName}: ${fileName} not found`);
    return;
  }

  const rows = validateAndDedupeRows(await readRows(fileName), tableName);
  console.log(`${dryRun ? 'dry-run' : 'import'} ${tableName}: ${rows.length} rows from ${fileName}`);

  if (dryRun || rows.length === 0) return;

  if (truncate) {
    const { error } = await supabase.from(tableName).delete().neq('__never_matches__', '__never_matches__');
    if (error) throw new Error(`Failed to truncate ${tableName}: ${error.message}`);
  }

  const batches = chunk(rows, batchSize);
  for (let index = 0; index < batches.length; index += 1) {
    const { error } = await supabase.from(tableName).upsert(batches[index]);
    if (error) throw new Error(`Failed importing ${tableName} batch ${index + 1}/${batches.length}: ${error.message}`);
    console.log(`  ${tableName}: batch ${index + 1}/${batches.length}`);
  }
};

const main = async () => {
  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run is used.');
  }

  const supabase = dryRun ? null : createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  for (const [fileName, tableName] of TABLES) {
    await importTable(supabase, fileName, tableName);
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

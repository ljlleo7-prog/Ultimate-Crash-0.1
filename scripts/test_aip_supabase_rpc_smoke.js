import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const timeout = setTimeout(() => {
  console.error('AIP Supabase RPC smoke test timed out after 30s');
  process.exit(1);
}, 30_000);
timeout.unref?.();

dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Skipping AIP Supabase RPC smoke test: Supabase env vars are not configured.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const callRpc = async (name, params) => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  console.log(`${name}: status=${data?.status || 'unknown'}`);
  return data;
};

await callRpc('skylinetragedy_search_aip_route', {
  p_departure_code: 'KJFK',
  p_arrival_code: 'KLAX',
  p_region_code: '*',
  p_aip_cycle: '2605',
  p_limit: 1
});

await callRpc('skylinetragedy_search_airports', {
  p_query: 'JFK',
  p_limit: 5,
  p_include_emergency: true
});

await callRpc('skylinetragedy_airports_within_radius', {
  p_latitude: 40.6413,
  p_longitude: -73.7781,
  p_radius_nm: 100,
  p_limit: 5
});

await callRpc('skylinetragedy_nearest_suitable_airports', {
  p_latitude: 40.6413,
  p_longitude: -73.7781,
  p_aircraft_category: 'Medium',
  p_min_runway_length_ft: 5000,
  p_radius_nm: 150,
  p_limit: 5
});

console.log('AIP Supabase RPC smoke test completed.');

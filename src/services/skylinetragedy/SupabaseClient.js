import { createClient } from '@supabase/supabase-js';

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const testCreateClient = globalThis.__mockCreateClient;
const isSupabaseConfigured = Boolean((supabaseUrl && supabaseAnonKey) || testCreateClient);

export const supabase = isSupabaseConfigured
  ? (testCreateClient
      ? testCreateClient(supabaseUrl, supabaseAnonKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }))
  : null;

export async function getSupabaseUser() {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('Supabase auth getUser failed.', error);
      return null;
    }
    return data?.user ?? null;
  } catch (error) {
    console.warn('Supabase auth unavailable.', error);
    return null;
  }
}

export function buildRealtimeChannelName(namespaceKey, sessionId, kind) {
  if (!namespaceKey || !sessionId || !kind) {
    return null;
  }
  return `mp:${namespaceKey}:${sessionId}:${kind}`;
}

export function createRealtimeChannel(namespaceKey, sessionId, kind, options = {}) {
  if (!supabase) {
    return null;
  }

  const channelName = buildRealtimeChannelName(namespaceKey, sessionId, kind);
  if (!channelName) {
    return null;
  }

  return supabase.channel(channelName, options);
}

export function isSupabaseReady() {
  return Boolean(supabase);
}

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const RATE_LIMIT_PER_MINUTE = Number(Deno.env.get('ROUTE_API_RATE_LIMIT_PER_MINUTE') || '10');
const ROUTE_TOKEN_COST = 1;

type GatewayPayload = Record<string, unknown>;

type ProviderResult = {
  status: string;
  message?: string;
  data?: unknown;
  route?: unknown;
  metadata?: Record<string, unknown>;
};

type FlightPlanDbPlan = Record<string, unknown> & { id?: number | string };

type FlightPlanDbNode = Record<string, unknown> & {
  ident?: string;
  name?: string;
  code?: string;
  lat?: number | string;
  latitude?: number | string;
  lon?: number | string;
  longitude?: number | string;
  alt?: number | string;
  altitude?: number | string;
  via?: string;
  type?: string;
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

const getProviderKey = (provider: string) => {
  switch (provider) {
    case 'SimBrief':
      return Deno.env.get('SIMBRIEF_API_KEY') || Deno.env.get('VITE_SIMBRIEF_API_KEY') || '';
    case 'FlightPlanDB':
      return Deno.env.get('FLIGHTPLANDATABASE_API_KEY') || Deno.env.get('VITE_FLIGHTPLANDATABASE_API_KEY') || '';
    case 'OpenAIP':
      return Deno.env.get('OPENAIP_CLIENT_KEY') || Deno.env.get('VITE_OPENAIP_CLIENT_KEY') || '';
    default:
      return '';
  }
};

const toText = (value: unknown) => String(value || '').trim();
const toUpper = (value: unknown) => toText(value).toUpperCase();

const buildFlightPlanDbAuthHeader = (key: string) => `Basic ${btoa(`${key}:`)}`;

const safeJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
};

async function enforceRateLimit(supabase: ReturnType<typeof createClient>, userId: string) {
  const now = new Date();
  now.setSeconds(0, 0);
  const windowStart = now.toISOString();

  const { data } = await supabase
    .from('route_api_call_limits')
    .select('call_count')
    .eq('user_id', userId)
    .eq('window_start', windowStart)
    .maybeSingle();

  const callCount = Number(data?.call_count || 0);
  if (callCount >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  await supabase
    .from('route_api_call_limits')
    .upsert({ user_id: userId, window_start: windowStart, call_count: callCount + 1 }, { onConflict: 'user_id,window_start' });

  return true;
}

async function chargeToken(supabase: ReturnType<typeof createClient>, userId: string, provider: string, payload: GatewayPayload) {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('id, token_balance')
    .eq('user_id', userId)
    .single();

  if (error || Number(wallet?.token_balance || 0) < ROUTE_TOKEN_COST) {
    return false;
  }

  const nextBalance = Number(wallet.token_balance) - ROUTE_TOKEN_COST;
  const { data: updatedWallet, error: updateError } = await supabase
    .from('wallets')
    .update({ token_balance: nextBalance })
    .eq('id', wallet.id)
    .eq('token_balance', wallet.token_balance)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedWallet) {
    return false;
  }

  const { error: ledgerError } = await supabase
    .from('ledger_entries')
    .insert({
      user_id: userId,
      amount: -ROUTE_TOKEN_COST,
      currency: 'TOKEN',
      operation_type: 'ROUTE_API_CALL',
      description: `${provider} route lookup ${payload.origin || payload.query || ''}-${payload.destination || ''}`
    });

  if (ledgerError) {
    await supabase
      .from('wallets')
      .update({ token_balance: wallet.token_balance })
      .eq('id', wallet.id);
    return false;
  }

  return true;
}

const normalizeFlightPlanDbNode = (node: Record<string, unknown>) => ({
  name: toUpper(node.ident || node.name || node.code || 'WPT'),
  latitude: Number(node.lat ?? node.latitude),
  longitude: Number(node.lon ?? node.longitude),
  altitude: typeof node.alt === 'number' ? node.alt : Number(node.alt || node.altitude) || null,
  airway: toText(node.via),
  type: toText(node.type || 'WAYPOINT').toUpperCase()
});

async function fetchFlightPlanDbRoute(payload: GatewayPayload, key: string): Promise<ProviderResult> {
  const origin = toUpper(payload.origin);
  const destination = toUpper(payload.destination);
  if (!origin || !destination) {
    return { status: 'provider_failed', message: 'Flight Plan Database requires origin and destination.' };
  }

  const authHeader = buildFlightPlanDbAuthHeader(key);
  const searchUrl = new URL('https://api.flightplandatabase.com/search/plans');
  searchUrl.searchParams.set('fromICAO', origin);
  searchUrl.searchParams.set('toICAO', destination);
  searchUrl.searchParams.set('limit', '1');

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: authHeader, Accept: 'application/json' }
  });
  const searchBody = await safeJson(searchResponse);

  if (!searchResponse.ok) {
    return { status: 'provider_failed', message: `Flight Plan Database search failed (${searchResponse.status}).`, data: searchBody };
  }

  const plan = Array.isArray(searchBody)
    ? searchBody[0] as FlightPlanDbPlan | undefined
    : Array.isArray((searchBody as Record<string, unknown>)?.data)
      ? ((searchBody as Record<string, unknown>).data as FlightPlanDbPlan[])[0]
      : null;
  const planId = plan?.id;
  if (!planId) {
    return { status: 'provider_failed', message: 'Flight Plan Database returned no matching route.' };
  }

  const planResponse = await fetch(`https://api.flightplandatabase.com/plan/${planId}`, {
    headers: { Authorization: authHeader, Accept: 'application/json' }
  });
  const planBody = await safeJson(planResponse) as Record<string, unknown> | null;
  const routeSection = planBody && typeof planBody.route === 'object' && planBody.route !== null
    ? planBody.route as Record<string, unknown>
    : null;

  if (!planResponse.ok || !planBody) {
    return { status: 'provider_failed', message: `Flight Plan Database plan lookup failed (${planResponse.status}).`, data: planBody };
  }

  const routeNodes = Array.isArray(routeSection?.nodes)
    ? routeSection.nodes
    : Array.isArray(planBody.nodes)
      ? planBody.nodes
      : [];

  const normalizedNodes = routeNodes
    .map((node) => normalizeFlightPlanDbNode(node as FlightPlanDbNode))
    .filter((node) => Number.isFinite(node.latitude) && Number.isFinite(node.longitude));

  if (!normalizedNodes.length) {
    return {
      status: 'provider_failed',
      message: 'Flight Plan Database route did not include usable waypoint coordinates.',
      data: planBody
    };
  }

  return {
    status: 'ok',
    route: {
      source: 'FlightPlanDB',
      routeString: Array.isArray(routeSection?.nodes)
        ? toText(routeSection.nodes.map((node) => {
            const typedNode = node as FlightPlanDbNode;
            return typedNode.ident || typedNode.name || typedNode.code || '';
          }).filter(Boolean).join(' '))
        : toText(routeSection || planBody.notes),
      waypoints: normalizedNodes,
      metadata: {
        planId,
        distance: planBody.distance || plan?.distance || null,
        maxAltitude: planBody.maxAltitude || plan?.maxAltitude || null
      }
    }
  };
}

const normalizeOpenAipReference = (item: Record<string, unknown>, type: string) => {
  const geometry = item.geometry as Record<string, unknown> | undefined;
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry?.coordinates as number[] : [];
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  return {
    id: item._id || item.id || null,
    type: toText(item.type || type).toUpperCase(),
    name: toText(item.name || item.identifier || item.icaoCode || item.iataCode || 'REF'),
    identifier: toText(item.identifier || item.icaoCode || item.iataCode || item.altIdentifier || ''),
    icaoCode: toText(item.icaoCode || ''),
    iataCode: toText(item.iataCode || ''),
    country: item.country || null,
    latitude: Number.isFinite(latitude) ? latitude : Number(item.latitude ?? item.lat),
    longitude: Number.isFinite(longitude) ? longitude : Number(item.longitude ?? item.lon)
  };
};

async function fetchOpenAipReferences(payload: GatewayPayload, key: string): Promise<ProviderResult> {
  const type = toText(payload.type || 'navaid').toLowerCase();
  const query = toText(payload.query);
  const endpoint = type === 'airport' ? 'airports' : 'navaids';
  const url = new URL(`https://api.core.openaip.net/${endpoint}`);
  url.searchParams.set('limit', '10');
  if (query) url.searchParams.set('search', query);

  const response = await fetch(url, {
    headers: {
      'x-openaip-api-key': key,
      Accept: 'application/json'
    }
  });
  const body = await safeJson(response) as Record<string, unknown> | null;

  if (!response.ok || !body) {
    return { status: 'provider_failed', message: `OpenAIP lookup failed (${response.status}).`, data: body };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  return {
    status: 'ok',
    data: items.map((item) => normalizeOpenAipReference(item as Record<string, unknown>, type))
  };
}

async function fetchProvider(provider: string, payload: GatewayPayload, key: string): Promise<ProviderResult> {
  if (!key) {
    return { status: 'provider_failed', message: `${provider} API key is not configured.` };
  }

  if (provider === 'SimBrief') {
    return {
      status: 'provider_failed',
      message: 'SimBrief route proxy endpoint must be configured for this deployment.'
    };
  }

  if (provider === 'FlightPlanDB') {
    return fetchFlightPlanDbRoute(payload, key);
  }

  if (provider === 'OpenAIP') {
    return fetchOpenAipReferences(payload, key);
  }

  return { status: 'provider_failed', message: `Unknown route provider: ${provider}` };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ status: 'provider_failed', message: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ status: 'provider_failed', message: 'Supabase service configuration is missing.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: authHeader } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData } = await userClient.auth.getUser();
  const user = authData?.user;
  if (!user) {
    return json({ status: 'unauthenticated', message: 'Login required for key-guarded aviation API calls.' });
  }

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || '');
  const payload = body.payload || {};

  const withinLimit = await enforceRateLimit(adminClient, user.id);
  if (!withinLimit) {
    await adminClient.from('route_api_call_logs').insert({ user_id: user.id, provider, origin: payload.origin, destination: payload.destination, status: 'rate_limited' });
    return json({ status: 'rate_limited', message: 'Route API rate limit exceeded. Falling back to local routing.' });
  }

  const providerResult = await fetchProvider(provider, payload, getProviderKey(provider));
  if (providerResult.status !== 'ok') {
    await adminClient.from('route_api_call_logs').insert({ user_id: user.id, provider, origin: payload.origin, destination: payload.destination, status: providerResult.status });
    return json(providerResult);
  }

  const charged = await chargeToken(adminClient, user.id, provider, payload);
  if (!charged) {
    await adminClient.from('route_api_call_logs').insert({ user_id: user.id, provider, origin: payload.origin, destination: payload.destination, status: 'insufficient_tokens' });
    return json({ status: 'insufficient_tokens', message: 'Not enough tokens for external route API call.' });
  }

  await adminClient.from('route_api_call_logs').insert({ user_id: user.id, provider, origin: payload.origin, destination: payload.destination, status: 'ok', charged_tokens: ROUTE_TOKEN_COST });
  return json({ ...providerResult, billing: { chargedTokens: ROUTE_TOKEN_COST } });
});

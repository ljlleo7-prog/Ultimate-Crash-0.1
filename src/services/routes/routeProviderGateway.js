import { PROVIDER_STATUS } from './routeTypes.js';

const getSupabaseClient = async () => {
  try {
    const module = await import('../skylinetragedy/SupabaseClient.js');
    return module?.supabase || module?.default || null;
  } catch (_error) {
    return null;
  }
};

export const callGuardedRouteProvider = async ({ provider, payload = {}, mockResponse = null } = {}) => {
  if (mockResponse) return mockResponse;

  const supabase = await getSupabaseClient();
  if (!supabase?.auth || !supabase?.functions) {
    return {
      status: PROVIDER_STATUS.UNAUTHENTICATED,
      message: 'Supabase auth or functions are not configured for guarded route providers.'
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    return {
      status: PROVIDER_STATUS.UNAUTHENTICATED,
      message: 'Login required for key-guarded aviation API calls.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('route-provider-gateway', {
      body: {
        provider,
        payload
      }
    });

    if (error) {
      return {
        status: PROVIDER_STATUS.PROVIDER_FAILED,
        message: error.message || 'Route provider gateway failed.'
      };
    }

    return data || {
      status: PROVIDER_STATUS.PROVIDER_FAILED,
      message: 'Route provider gateway returned an empty response.'
    };
  } catch (error) {
    return {
      status: PROVIDER_STATUS.PROVIDER_FAILED,
      message: error.message || 'Route provider gateway request failed.'
    };
  }
};

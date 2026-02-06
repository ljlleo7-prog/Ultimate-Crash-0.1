
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage adapter to share session via cookies across subdomains
const cookieStorage = {
  getItem: (key) => {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },
  setItem: (key, value) => {
    // Set cookie for the main domain to allow sharing
    // Attributes: domain=.geeksproductionstudio.com, path=/, SameSite=Lax, Secure
    // We also set a long expiration to persist the session
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000)); // 1 year
    const expires = "expires="+ d.toUTCString();
    
    // Determine domain dynamically to support localhost and production
    const isProd = window.location.hostname.includes('geeksproductionstudio.com');
    const domainAttr = isProd ? "domain=.geeksproductionstudio.com;" : "";

    document.cookie = `${key}=${value};${expires};${domainAttr}path=/;SameSite=Lax;Secure`;
  },
  removeItem: (key) => {
    const isProd = window.location.hostname.includes('geeksproductionstudio.com');
    const domainAttr = isProd ? "domain=.geeksproductionstudio.com;" : "";
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;${domainAttr}path=/;SameSite=Lax;Secure`;
  }
};

// Only create the client if the environment variables are available
// This prevents the app from crashing if they are missing, but features will be disabled
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Use default storage key (sb-<project-ref>-auth-token) for better compatibility
        // Enable cross-subdomain session sharing via custom cookie storage
        storage: cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }) 
  : null;

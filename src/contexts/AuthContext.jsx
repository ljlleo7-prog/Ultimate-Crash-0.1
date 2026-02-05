
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithSSO = async () => {
    if (!supabase) {
      alert("Supabase is not configured.");
      return;
    }
    
    // Try to sign in with SSO for the domain
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: 'geeksproductionstudio.com',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error('SSO Error:', error);
      alert('SSO Login failed: ' + error.message);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
        // Fallback or if domain not found, maybe try standard OAuth or show message
        alert("SSO configuration for geeksproductionstudio.com not found. Please check Supabase settings.");
    }
  };
  
  // Generic login for testing or alternative
  const signInWithEmail = async (email) => {
     if (!supabase) return;
     const { error } = await supabase.auth.signInWithOtp({ email });
     if (error) alert(error.message);
     else alert("Check your email for the login link!");
  }

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithSSO, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

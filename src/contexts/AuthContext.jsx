
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
    if (!supabase) return;
    
    // Use Google OAuth directly for seamless SSO
    // This allows the user to sign in using their existing Google session
    // and sets the shared cookie for cross-subdomain persistence
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // Add any specific Google OAuth params if needed
          // prompt: 'select_account' // Uncomment to force account selection
        }
      }
    });

    if (error) {
      console.error("SSO Login Error:", error);
      alert("SSO Login failed: " + error.message);
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

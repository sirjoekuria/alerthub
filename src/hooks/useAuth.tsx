import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  saveCredentialsToNative, 
  clearNativeCredentials,
  isBackgroundServiceAvailable 
} from '@/utils/backgroundService';

// Get Supabase config for native service
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Save credentials to native background service when session changes
  const syncCredentialsToNative = (session: Session | null) => {
    if (session && session.user) {
      saveCredentialsToNative(
        SUPABASE_URL,
        SUPABASE_KEY,
        session.user.id,
        session.access_token
      );
    } else {
      clearNativeCredentials();
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Sync credentials to native on auth state change
        syncCredentialsToNative(session);
        
        if (event === 'SIGNED_OUT') {
          clearNativeCredentials();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Sync credentials to native on initial load
      syncCredentialsToNative(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearNativeCredentials();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return {
    user,
    session,
    loading,
    signOut,
    isBackgroundServiceAvailable: isBackgroundServiceAvailable(),
  };
};
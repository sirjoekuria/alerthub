import { useState, useEffect, useRef } from 'react';
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
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save credentials to native background service when session changes
  const syncCredentialsToNative = (session: Session | null) => {
    if (session && session.user) {
      console.log('Syncing credentials to native service...');
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

  // Periodically refresh session and sync to native to prevent token expiration
  const startTokenRefresh = () => {
    // Clear any existing interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Refresh every 30 minutes (tokens typically expire in 1 hour)
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        if (refreshedSession && !error) {
          console.log('Token refreshed, syncing to native...');
          syncCredentialsToNative(refreshedSession);
        } else if (error) {
          console.error('Token refresh error:', error.message);
        }
      } catch (err) {
        console.error('Failed to refresh token:', err);
      }
    }, 30 * 60 * 1000); // 30 minutes
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
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Start token refresh interval when user signs in
          startTokenRefresh();
        }
        
        if (event === 'SIGNED_OUT') {
          clearNativeCredentials();
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current);
          }
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
      
      // Start token refresh if session exists
      if (session) {
        startTokenRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, []);

  const signOut = async () => {
    clearNativeCredentials();
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
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
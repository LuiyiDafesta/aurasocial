import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as apiSignOut } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const initialSession = await getSession();
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await apiSignOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      throw err;
    }
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };
}

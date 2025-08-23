'use client';

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import type { User } from '@/lib/db/schema';

export type AppSessionState = {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => void;
};

const defaultState: AppSessionState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  refreshSession: () => {},
};

const SessionContext = createContext<AppSessionState>(defaultState);

// Custom hook to fetch session from server
function useServerSession() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshSession = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        console.log('🔍 SessionContext - Fetching session...');
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        console.log('🔍 SessionContext - Response status:', response.status);
        
        if (response.ok) {
          const sessionData = await response.json();
          console.log('🔍 SessionContext - Session data:', sessionData);
          setSession(sessionData);
        } else {
          console.log('🔍 SessionContext - Response not ok');
          setSession(null);
        }
      } catch (error) {
        console.error('🔍 SessionContext - Error fetching session:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to prevent too many requests
    const timeoutId = setTimeout(fetchSession, 100);
    return () => clearTimeout(timeoutId);
  }, [refreshTrigger]);

  return { data: session, isPending: isLoading, refreshSession };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refreshSession } = useServerSession();

  const value = useMemo<AppSessionState>(() => {
    const user = (session?.user as User) ?? null;
    const state = {
      user,
      session: session ?? null,
      isAuthenticated: Boolean(user?.id),
      isLoading: Boolean(isPending),
      refreshSession,
    };
    
    // Debug session context
    console.log('🔍 SessionContext state:', state);
    console.log('🔍 SessionContext user:', user);
    console.log('🔍 SessionContext isAuthenticated:', state.isAuthenticated);
    console.log('🔍 SessionContext session:', session);
    console.log('🔍 SessionContext isPending:', isPending);
    
    return state;
  }, [session, isPending, refreshSession]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAppSession() {
  return useContext(SessionContext);
} 
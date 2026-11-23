'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AccountMode = 'user' | 'creator';

interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  isLoggedIn: boolean;
}

interface AccountContextType {
  mode: AccountMode;
  setMode: (mode: AccountMode) => void;
  toggleMode: () => void;
  user: UserProfile;
  logout: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AccountMode>('user');
  const [user, setUser] = useState<UserProfile>({
    name: 'VeraLM User',
    email: 'user@veralm.com',
    isLoggedIn: false,
  });

  useEffect(() => {
    // Load persisted mode, default to 'user'
    const stored = localStorage.getItem('veralm_account_mode');
    if (stored === 'creator' || stored === 'user') {
      setModeState(stored);
    } else {
      setModeState('user');
    }

    // Check supabase auth state
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'user@veralm.com',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'VeraLM User',
          isLoggedIn: true,
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'user@veralm.com',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'VeraLM User',
          isLoggedIn: true,
        });
      } else {
        setUser({
          name: 'VeraLM User',
          email: 'user@veralm.com',
          isLoggedIn: false,
        });
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const setMode = (newMode: AccountMode) => {
    setModeState(newMode);
    localStorage.setItem('veralm_account_mode', newMode);
  };

  const toggleMode = () => {
    const nextMode = mode === 'user' ? 'creator' : 'user';
    setMode(nextMode);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser({
      name: 'VeraLM User',
      email: 'user@veralm.com',
      isLoggedIn: false,
    });
    setMode('user');
  };

  return (
    <AccountContext.Provider value={{ mode, setMode, toggleMode, user, logout }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { useNavigate } from 'react-router-dom';
import { backOff } from 'exponential-backoff';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, referralCode?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        // Check for various session-related errors
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        
        if (
          errorMessage.includes('refresh token not found') || 
          errorMessage.includes('refresh_token_not_found') ||
          errorMessage.includes('session_not_found') ||
          errorMessage.includes('jwt expired') ||
          errorMessage.includes('authentication') ||
          errorCode.includes('session_not_found') ||
          errorCode.includes('jwt_expired') ||
          errorCode.includes('authentication_failed')
        ) {
          console.warn('Session expired or invalid. Signing out.');
        } else {
          console.error('Error refreshing session:', error);
        }
        await signOut();
        return;
      }
      
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      } else {
        console.warn('No session returned from refresh. Signing out.');
        await signOut();
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      await signOut();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle session errors during initialization
          const errorMessage = error.message?.toLowerCase() || '';
          const errorCode = error.code?.toLowerCase() || '';
          
          if (
            errorMessage.includes('session_not_found') ||
            errorMessage.includes('jwt expired') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('refresh token not found') ||
            errorMessage.includes('refresh_token_not_found') ||
            errorCode.includes('session_not_found') ||
            errorCode.includes('jwt_expired') ||
            errorCode.includes('authentication_failed') ||
            errorCode.includes('refresh_token_not_found')
          ) {
            console.warn('Invalid session during initialization. Signing out.');
            await signOut();
          } else {
            console.error('Error getting initial session:', error);
            setSession(null);
            setUser(null);
          }
        } else if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        } else if (event === 'SIGNED_IN') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
        setIsLoading(false);
      }
    );

    const sessionCheckInterval = setInterval(async () => {
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const tenMinutes = 10 * 60 * 1000;

        if (timeUntilExpiry <= tenMinutes) {
          await refreshSession();
        }
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, [supabase.auth, session?.expires_at]);

  const signUp = async (email: string, password: string, name: string, referralCode?: string) => {
    try {
      console.log('Starting signup process...', { email, name, referralCode });

      const signUpWithBackoff = async () => {
        console.log('Attempting signup with backoff...');

        // Decode referral code if present
        let referrerId = null;
        if (referralCode) {
          try {
            referrerId = atob(referralCode);
          } catch (e) {
            console.error('Invalid referral code:', e);
          }
        }

        return supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: name,
              referrer_id: referrerId
            },
            emailRedirectTo: `${window.location.origin}/login`
          },
        });
      };

      const { data, error: signUpError } = await backOff(signUpWithBackoff, {
        numOfAttempts: 3,
        startingDelay: 1000,
        timeMultiple: 2,
        retry: (e: any) => {
          console.log('Signup attempt failed:', e.message);
          return e.error?.message === 'email rate limit exceeded';
        },
        beforeRetry: (e: any) => {
          console.log('Retrying signup after error:', e.message);
        }
      });

      if (signUpError) {
        console.error('Error during signup:', signUpError);
        if (signUpError.message === 'User already registered') {
          return { error: 'Este email já está cadastrado' };
        }
        if (signUpError.message === 'email rate limit exceeded') {
          return { error: 'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.' };
        }
        return { error: 'Erro ao criar conta. Tente novamente.' };
      }

      // Create profile entry after successful signup
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              nome: name,
              email: email,
              created_at: new Date().toISOString()
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't return error here as the user was created successfully
            // The profile creation will be handled by database triggers if this fails
          }
        } catch (profileCreationError) {
          console.error('Unexpected error creating profile:', profileCreationError);
          // Don't return error here as the user was created successfully
        }
      }

      console.log('Signup successful');
      return { error: null };
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      return { error: 'Erro inesperado ao criar conta' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error during signin:', error);
        if (error.message === 'Invalid login credentials') {
          return { error: 'Email ou senha incorretos' };
        }
        if (error.message.includes('Database error')) {
          return { error: 'Erro no servidor. Tente novamente em alguns minutos.' };
        }
        return { error: 'Erro ao fazer login. Tente novamente.' };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error during signin:', error);
      return { error: 'Erro inesperado ao fazer login' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error during signout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
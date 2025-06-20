import { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { backOff } from 'exponential-backoff';

interface Group {
  id: string;
  nome: string;
}

export const useActiveGroup = () => {
  const { supabase } = useSupabase();
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveGroup = async (retryCount = 0) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const fetchWithBackoff = () => {
          return supabase
            .from('profiles')
            .select('grupo_ativo')
            .eq('id', user.id)
            .maybeSingle();
        };

        let profileResult;
        try {
          profileResult = await backOff(fetchWithBackoff, {
            numOfAttempts: 3,
            startingDelay: 1000,
            timeMultiple: 2,
            retry: (e) => {
              // Handle JWT and permission errors
              if (e.message?.includes('permission denied') || e.message?.includes('JWT expired')) {
                return true;
              }
              // Handle network-related errors
              if (e.message?.includes('Failed to fetch') || 
                  e.message?.includes('NetworkError') || 
                  e.name === 'TypeError' ||
                  e.message?.includes('fetch')) {
                return true;
              }
              return false;
            }
          });
        } catch (error: any) {
          throw error;
        }

        const { data: profile, error: profileError } = profileResult;

        if (profileError) {
          if (profileError.message === 'JWT expired' && retryCount < 3) {
            await refreshSession();
            return fetchActiveGroup(retryCount + 1);
          }
          throw profileError;
        }

        // If profile doesn't exist, create it
        if (!profile) {
          console.log('Profile not found, creating new profile for user:', user.id);
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              nome: user.email?.split('@')[0] || 'Usuário',
              email: user.email,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }

          // Profile was just created with no active group
          setActiveGroup(null);
        } else if (profile?.grupo_ativo) {
          // Profile exists and has an active group, fetch the group details
          const { data: group, error: groupError } = await supabase
            .from('grupos')
            .select('id, nome')
            .eq('id', profile.grupo_ativo)
            .maybeSingle();

          if (groupError) throw groupError;
          setActiveGroup(group);
        } else {
          // Profile exists but has no active group
          setActiveGroup(null);
        }
      } catch (error: any) {
        console.error('Error fetching active group:', error);
        if (error.message?.includes('JWT') || error.message?.includes('authentication')) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActiveGroup();
  }, [user, supabase, refreshSession, navigate]);

  return { activeGroup, loading };
};
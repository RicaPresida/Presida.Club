import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Subscription {
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useSubscription = () => {
  const { supabase } = useSupabase();
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async (retryCount = 0) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('stripe_subscriptions')
          .select(`
            subscription_id,
            price_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            payment_method_brand,
            payment_method_last4,
            status,
            stripe_customers!inner(user_id)
          `)
          .eq('stripe_customers.user_id', user.id)
          .maybeSingle();

        if (supabaseError) {
          // If JWT expired and we haven't retried too many times
          if (supabaseError.message === 'JWT expired' && retryCount < MAX_RETRIES) {
            await refreshSession();
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            // Retry after refreshing session
            return fetchSubscription(retryCount + 1);
          }
          
          throw supabaseError;
        }

        // Transform the data to match the expected interface
        if (data) {
          setSubscription({
            subscription_id: data.subscription_id,
            subscription_status: data.status,
            price_id: data.price_id,
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
            cancel_at_period_end: data.cancel_at_period_end,
            payment_method_brand: data.payment_method_brand,
            payment_method_last4: data.payment_method_last4,
          });
        } else {
          setSubscription(null);
        }
        
        setError(null); // Clear any previous errors
      } catch (err: any) {
        console.error('Error fetching subscription:', err);
        
        // Handle network errors differently from auth errors
        if (err.message === 'Failed to fetch' || err.code === 'NETWORK_ERROR') {
          if (retryCount < MAX_RETRIES) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            // Retry the request
            return fetchSubscription(retryCount + 1);
          }
          setError('Network error: Unable to connect to the server. Please check your internet connection.');
          return; // Don't redirect on network errors
        }

        // Handle authentication errors
        if (err.message === 'JWT expired' || err.message?.includes('auth')) {
          setError('Authentication error. Please log in again.');
          navigate('/login');
          return;
        }

        // Handle other errors
        setError(err.message || 'An error occurred while fetching subscription data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('stripe_subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stripe_subscriptions'
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshSession, navigate]);

  return { subscription, loading, error };
};
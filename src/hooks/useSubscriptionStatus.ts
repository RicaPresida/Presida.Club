import { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from './useAuth';

export interface SubscriptionStatus {
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  isSubscribed: boolean;
  daysLeftInTrial: number | null;
  subscription: {
    id: string | null;
    price_id: string | null;
    product_id: string | null;
    subscription_status: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    duration_months: number; // Duration in months based on plan
  } | null;
  loading: boolean;
  error: string | null;
}

const useSubscriptionStatus = (): SubscriptionStatus => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isTrialActive: false,
    trialEndsAt: null,
    isSubscribed: false,
    daysLeftInTrial: null,
    subscription: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Buscar perfil do usuário para verificar trial e lifetime status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('trial_ends_at, lifetime, role, email')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Verificar se o usuário tem acesso lifetime
        const isLifetime = profileData?.lifetime === true || profileData?.role === 'admin' || profileData?.email === 'rica@agsupernova.com';

        // Verificar se o trial está ativo
        let isTrialActive = false;
        let daysLeftInTrial = null;
        let trialEndsAt = null;

        if (profileData?.trial_ends_at && !isLifetime) {
          trialEndsAt = new Date(profileData.trial_ends_at);
          const now = new Date();
          
          if (trialEndsAt > now) {
            isTrialActive = true;
            // Calcular dias restantes com precisão
            daysLeftInTrial = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        // Verificar assinatura ativa
        let subscriptionData = null;
        let subscriptionError = null;

        try {
          // Primeiro tenta usar a função RPC
          const rpcResult = await supabase.rpc('get_user_subscription_status');
          if (rpcResult.error) {
            throw rpcResult.error;
          }
          subscriptionData = rpcResult.data?.[0];
        } catch (rpcError) {
          console.warn('RPC error, falling back to direct query:', rpcError);
          
          // Fallback para consulta direta
          const { data, error } = await supabase
            .from('stripe_user_subscriptions')
            .select('*')
            .maybeSingle();
            
          subscriptionData = data;
          subscriptionError = error;
        }

        if (subscriptionError) {
          console.warn('Error fetching subscription:', subscriptionError);
        }

        // Determinar se o usuário está inscrito
        const isSubscribed = 
          isLifetime || 
          subscriptionData?.subscription_status === 'active' || 
          subscriptionData?.subscription_status === 'trialing';

        // Determinar a duração da assinatura com base no price_id
        let durationMonths = 1; // Padrão: 1 mês (Básico)
        
        if (subscriptionData?.price_id) {
          if (subscriptionData.price_id.includes('professional')) {
            durationMonths = 12; // Profissional: 1 ano
          } else if (subscriptionData.price_id.includes('premium')) {
            durationMonths = 36; // Premium: 3 anos
          }
        }

        setStatus({
          isTrialActive,
          trialEndsAt,
          isSubscribed: isSubscribed || isLifetime,
          daysLeftInTrial,
          subscription: isSubscribed && subscriptionData ? {
            id: subscriptionData.subscription_id,
            price_id: subscriptionData.price_id,
            product_id: null, // Não temos essa informação diretamente
            subscription_status: subscriptionData.subscription_status,
            current_period_end: subscriptionData.current_period_end,
            cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
            duration_months: durationMonths
          } : null,
          loading: false,
          error: null
        });
      } catch (error: any) {
        console.error('Error checking subscription status:', error);
        
        // Fallback para permitir que o app funcione mesmo com erro
        setStatus({
          isTrialActive: false,
          trialEndsAt: null,
          isSubscribed: false,
          daysLeftInTrial: null,
          subscription: null,
          loading: false,
          error: error.message || 'Erro ao verificar status da assinatura'
        });
      }
    };

    checkStatus();
  }, [user, supabase]);

  return status;
};

export default useSubscriptionStatus;
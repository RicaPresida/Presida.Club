import useSubscriptionStatus from './useSubscriptionStatus';

interface PlanLimits {
  maxGroups: number;
  maxPlayersPerGroup: number;
  hasResenha: boolean;
  hasPrioritySupport: boolean;
  supportPhone: string;
  durationMonths: number;
  planName: string;
}

export const usePlanFeatures = () => {
  const { isTrialActive, isSubscribed, subscription } = useSubscriptionStatus();

  const getPlanLimits = (): PlanLimits => {
    // Se o usuário tem uma assinatura ativa
    if (isSubscribed && subscription?.price_id) {
      // Plano Premium (36 meses)
      if (subscription.price_id.includes('premium')) {
        return {
          maxGroups: 2,
          maxPlayersPerGroup: 100,
          hasResenha: true,
          hasPrioritySupport: true,
          supportPhone: '5511916158282',
          durationMonths: 36,
          planName: 'Premium'
        };
      }
      
      // Plano Profissional (12 meses)
      if (subscription.price_id.includes('professional')) {
        return {
          maxGroups: 1,
          maxPlayersPerGroup: 50,
          hasResenha: true,
          hasPrioritySupport: false,
          supportPhone: '',
          durationMonths: 12,
          planName: 'Profissional'
        };
      }
      
      // Plano Básico (1 mês)
      if (subscription.price_id.includes('basic')) {
        return {
          maxGroups: 1,
          maxPlayersPerGroup: 30,
          hasResenha: false,
          hasPrioritySupport: false,
          supportPhone: '',
          durationMonths: 1,
          planName: 'Básico'
        };
      }
    }
    
    // Período de trial (21 dias)
    if (isTrialActive) {
      return {
        maxGroups: 1,
        maxPlayersPerGroup: 30,
        hasResenha: true,
        hasPrioritySupport: false,
        supportPhone: '',
        durationMonths: 0, // 0 indica período de trial
        planName: 'Trial'
      };
    }

    // Plano gratuito (após trial expirado)
    return {
      maxGroups: 1,
      maxPlayersPerGroup: 10,
      hasResenha: false,
      hasPrioritySupport: false,
      supportPhone: '',
      durationMonths: 0,
      planName: 'Gratuito'
    };
  };

  const limits = getPlanLimits();

  // Function to validate group creation, with message
  const canCreateGroup = async (
    currentGroupCount: number
  ): Promise<{ allowed: boolean; message?: string }> => {
    if (currentGroupCount >= limits.maxGroups) {
      return {
        allowed: false,
        message: `Seu plano ${limits.planName} permite até ${limits.maxGroups} ${limits.maxGroups === 1 ? 'grupo' : 'grupos'}. Faça upgrade para criar mais grupos.`
      };
    }
    return { allowed: true };
  };

  // Function to validate adding players to group
  const canAddPlayer = async (
    currentPlayerCount: number
  ): Promise<{ allowed: boolean; message?: string }> => {
    if (currentPlayerCount >= limits.maxPlayersPerGroup) {
      if (limits.hasPrioritySupport && limits.supportPhone) {
        return {
          allowed: false,
          message: `Você atingiu o limite de ${limits.maxPlayersPerGroup} jogadores do plano ${limits.planName}. Entre em contato com o suporte: +${limits.supportPhone}`
        };
      }
      return {
        allowed: false,
        message: `Seu plano ${limits.planName} permite até ${limits.maxPlayersPerGroup} jogadores. Faça upgrade para adicionar mais jogadores.`
      };
    }
    return { allowed: true };
  };

  return {
    limits,
    canCreateGroup,
    canAddPlayer,
    isTrialActive,
    isSubscribed
  };
};
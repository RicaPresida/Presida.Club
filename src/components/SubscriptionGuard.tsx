import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  requireSubscription = false 
}) => {
  const { 
    isTrialActive, 
    isSubscribed, 
    daysLeftInTrial, 
    loading, 
    error 
  } = useSubscriptionStatus();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.warn('Subscription check error:', error);
    // Em caso de erro, permitimos o acesso para não bloquear o usuário
    return <>{children}</>;
  }

  // Se o recurso requer assinatura e o usuário não está assinado nem em trial
  if (requireSubscription && !isSubscribed && !isTrialActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">Assinatura necessária</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Este recurso está disponível apenas para assinantes. Assine um plano para continuar.
          </p>
          <Link to="/pricing" className="btn-primary">
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  // Se o usuário não está assinado e o trial expirou, bloquear acesso
  if (!isSubscribed && !isTrialActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">Período de avaliação expirado</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Seu período de avaliação gratuita expirou. Assine um plano para continuar utilizando o Presida.Club.
          </p>
          <Link to="/pricing" className="btn-primary">
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  // Caso contrário, renderizar normalmente
  return <>{children}</>;
};

export default SubscriptionGuard;
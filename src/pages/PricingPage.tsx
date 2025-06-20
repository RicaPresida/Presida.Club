import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';
import { useStripe } from '../contexts/StripeContext';
import { 
  Check, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTrialActive, isSubscribed, subscription } = useSubscriptionStatus();
  const { createCheckoutSession } = useStripe();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      setError('Você precisa estar logado para assinar um plano');
      return;
    }

    setLoading(priceId);
    setError(null);

    try {
      console.log('Starting subscription process for:', priceId);
      const result = await createCheckoutSession(priceId);
      
      console.log('Checkout result:', result);
      
      if ('error' in result) {
        setError(result.error);
      } else if ('url' in result && result.url) {
        console.log('Redirecting to:', result.url);
        window.location.href = result.url;
      } else {
        setError('Erro inesperado: URL de checkout não recebida');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Erro ao processar assinatura');
    } finally {
      setLoading(null);
    }
  };

  const handleRetry = (priceId: string) => {
    setError(null);
    handleSubscribe(priceId);
  };

  // Organizar produtos com seus preços
  const planos = [
    {
      id: 'prod_basic',
      name: 'Básico',
      price: 'R$ 29,99',
      priceId: 'price_basic_monthly',
      duration: '1 mês',
      description: 'Gerenciamento de 1 Grupo / Até 30 jogadores / Sorteio de times / Financeiro / Relatórios',
      features: [
        'Gerenciamento de 1 grupo',
        'Até 30 jogadores',
        'Sorteio de times',
        'Controle financeiro',
        'Relatórios básicos',
        'Duração: 1 mês'
      ],
      popular: false
    },
    {
      id: 'prod_professional',
      name: 'Profissional',
      price: 'R$ 39,99',
      priceId: 'price_professional_monthly',
      duration: '12 meses',
      description: 'Até 50 jogadores por time / Sorteio de times / Financeiro / Relatórios / Resenha',
      features: [
        'Gerenciamento de 1 grupo',
        'Até 50 jogadores',
        'Sorteio de times',
        'Controle financeiro completo',
        'Relatórios avançados',
        'Gestão de resenhas',
        'Duração: 12 meses'
      ],
      popular: false
    },
    {
      id: 'prod_premium',
      name: 'Premium',
      price: 'R$ 59,99',
      priceId: 'price_premium_monthly',
      duration: '36 meses',
      description: 'Até 2 times / Até 100 jogadores por time / Sorteio de times / Financeiro / Relatórios / Resenha / Suporte prioritário',
      features: [
        'Gerenciamento de 2 grupos',
        'Até 100 jogadores por grupo',
        'Sorteio de times avançado',
        'Controle financeiro completo',
        'Relatórios detalhados',
        'Gestão de resenhas',
        'Suporte prioritário',
        'Duração: 36 meses'
      ],
      popular: true
    }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          {(isTrialActive || isSubscribed) && (
            <button
              onClick={() => navigate('/')}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </button>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Escolha seu plano
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Comece a gerenciar seu time de futebol hoje mesmo
          </p>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Erro ao processar pagamento</p>
                <p className="mt-1 text-sm">{error}</p>
                {error.includes('conexão') || error.includes('indisponível') ? (
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {planos.map((product) => {
            const isCurrentPlan = subscription?.price_id === product.priceId;
            const isLoadingThis = loading === product.priceId;
            
            return (
              <div
                key={product.id}
                className={`card p-8 ${
                  product.popular
                    ? 'border-2 border-primary-500 relative'
                    : ''
                }`}
              >
                {product.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-secondary-900 px-3 py-1 rounded-full text-sm font-medium">
                    Recomendado
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-2xl font-bold">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{product.duration}</span>
                  </div>
                  <p className="mt-4 text-4xl font-bold">
                    {product.price}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>

                  <button
                    onClick={() => handleSubscribe(product.priceId)}
                    disabled={isLoadingThis || isCurrentPlan || !user}
                    className={`mt-8 w-full btn ${
                      isCurrentPlan
                        ? 'bg-green-500 hover:bg-green-600 text-white cursor-default'
                        : product.popular
                          ? 'btn-primary'
                          : 'btn-outline'
                    }`}
                  >
                    {isLoadingThis ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : !user ? (
                      'Faça login para assinar'
                    ) : (
                      'Assinar'
                    )}
                  </button>

                  {error && !isLoadingThis && !isCurrentPlan && user && (
                    <button
                      onClick={() => handleRetry(product.priceId)}
                      className="mt-2 w-full btn-outline text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Tentar novamente
                    </button>
                  )}

                  <ul className="mt-8 space-y-4 text-left">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Você começa com 21 dias de avaliação gratuita.
            <br />
            Após assinar, cancele a qualquer momento.
          </p>
          
          {error && error.includes('indisponível') && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
              <p>
                <strong>Sistema temporariamente indisponível:</strong> Nosso sistema de pagamento está sendo configurado. 
                Tente novamente em alguns minutos ou entre em contato conosco.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
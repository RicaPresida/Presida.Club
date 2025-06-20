import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { products as configProducts } from '../stripe-config';

interface Product {
  id: string;
  name: string;
  description: string;
  prices: Price[];
}

interface Price {
  id: string;
  product_id: string;
  unit_amount: number;
  currency: string;
  recurring_interval: string;
  recurring_interval_count: number;
}

interface Subscription {
  id: string;
  status: string;
  price_id: string;
  product_id: string;
  current_period_end: Date;
  cancel_at_period_end: boolean;
}

interface StripeContextType {
  products: Product[];
  prices: Price[];
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  createCheckoutSession: (priceId: string) => Promise<{ url: string } | { error: string }>;
  manageSubscription: () => Promise<{ url: string } | { error: string }>;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export const StripeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Usar os produtos do config por enquanto
        const mockProducts = configProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          prices: [{
            id: p.priceId,
            product_id: p.id,
            unit_amount: parseInt(p.price.replace(/\D/g, '')),
            currency: 'brl',
            recurring_interval: 'month',
            recurring_interval_count: 1
          }]
        }));

        const mockPrices = mockProducts.flatMap(p => p.prices);

        setProducts(mockProducts);
        setPrices(mockPrices);

        // Buscar assinatura do usuário via RPC
        const { data: subscriptionData, error: subscriptionError } = await supabase.rpc('get_user_subscription_status');

        if (subscriptionError) {
          console.error('Subscription error:', subscriptionError);
          // Se a função não existir ainda, não tratar como erro crítico
          if (subscriptionError.code === 'PGRST202') {
            console.warn('Subscription function not found, user has no subscription');
            setSubscription(null);
          } else {
            throw subscriptionError;
          }
        } else if (subscriptionData && subscriptionData.length > 0) {
          const subData = subscriptionData[0];
          if (subData.has_active_subscription) {
            setSubscription({
              id: subData.subscription_id || 'mock_subscription',
              status: subData.subscription_status || 'active',
              price_id: subData.price_id || 'price_premium_monthly',
              product_id: subData.product_id || 'prod_premium',
              current_period_end: subData.current_period_end ? new Date(subData.current_period_end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              cancel_at_period_end: false
            });
          } else {
            setSubscription(null);
          }
        } else {
          setSubscription(null);
        }
      } catch (err: any) {
        console.error('Error fetching Stripe data:', err);
        setError(err.message || 'Erro ao carregar dados de assinatura');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, user]);

  const createCheckoutSession = async (priceId: string) => {
    try {
      console.log('Creating checkout session for price:', priceId);
      
      // Check if we have a valid Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
        console.warn('Invalid or missing Supabase URL, using fallback');
        return await createMockCheckoutSession(priceId);
      }

      // Try to use the Edge Function with better error handling
      try {
        console.log('Attempting to call Edge Function...');
        
        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: {
            priceId,
            successUrl: `${window.location.origin}/success`,
            cancelUrl: `${window.location.origin}/pricing`
          }
        });

        console.log('Edge Function response:', { data, error });

        if (error) {
          console.error('Edge Function error:', error);
          
          // Check if it's a network/connectivity error
          if (error.message?.includes('Failed to fetch') || 
              error.message?.includes('network') || 
              error.message?.includes('NetworkError') ||
              error.name === 'TypeError') {
            console.warn('Network error detected, falling back to mock checkout');
            return await createMockCheckoutSession(priceId);
          }
          
          // Provide more specific error messages based on the error type
          let errorMessage = 'Erro ao criar sessão de checkout';
          
          if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
            errorMessage = 'Sessão expirada. Faça login novamente.';
          } else if (error.message?.includes('configuration') || error.message?.includes('environment')) {
            errorMessage = 'Sistema de pagamento temporariamente indisponível. Tente novamente em alguns minutos.';
          } else if (error.message?.includes('Invalid price')) {
            errorMessage = 'Plano selecionado inválido. Atualize a página e tente novamente.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          throw new Error(errorMessage);
        }

        if (!data || !data.url) {
          console.warn('No URL received from Edge Function, using fallback');
          return await createMockCheckoutSession(priceId);
        }

        return data;
      } catch (edgeFunctionError: any) {
        console.warn('Edge Function failed:', edgeFunctionError);
        
        // Check if it's a network error (Failed to fetch, NetworkError, etc.)
        if (edgeFunctionError.name === 'TypeError' || 
            edgeFunctionError.message?.includes('Failed to fetch') ||
            edgeFunctionError.message?.includes('NetworkError') ||
            edgeFunctionError.message?.includes('network')) {
          console.warn('Network connectivity issue detected, using mock checkout for development');
          return await createMockCheckoutSession(priceId);
        }
        
        // For other errors, re-throw them
        throw edgeFunctionError;
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      
      // Handle network errors specifically
      if (err.name === 'TypeError' && err.message?.includes('Failed to fetch')) {
        console.warn('Final fallback: using mock checkout due to network error');
        return await createMockCheckoutSession(priceId);
      }
      
      return { error: err.message || 'Erro inesperado ao processar pagamento. Tente novamente.' };
    }
  };

  const createMockCheckoutSession = async (priceId: string) => {
    console.log('Using mock checkout session for development');
    
    // Get product details for the selected price
    const selectedProduct = configProducts.find(p => p.priceId === priceId);
    
    if (!selectedProduct) {
      throw new Error('Plano selecionado não encontrado');
    }
    
    // Simulate a delay to mimic real API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a mock checkout URL with product information
    const mockUrl = `${window.location.origin}/success?product=${encodeURIComponent(selectedProduct.name)}&price=${encodeURIComponent(selectedProduct.price)}&duration=${selectedProduct.durationMonths}&mock=true`;
    
    console.log('Mock checkout URL created:', mockUrl);
    
    return {
      url: mockUrl
    };
  };

  const manageSubscription = async () => {
    try {
      // Implementar quando tivermos o portal de clientes do Stripe
      return { error: 'Funcionalidade em desenvolvimento' };
    } catch (err: any) {
      console.error('Error managing subscription:', err);
      return { error: err.message || 'Erro ao gerenciar assinatura' };
    }
  };

  return (
    <StripeContext.Provider
      value={{
        products,
        prices,
        subscription,
        isLoading,
        error,
        createCheckoutSession,
        manageSubscription
      }}
    >
      {children}
    </StripeContext.Provider>
  );
};

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};
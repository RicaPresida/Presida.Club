import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { Stripe } from 'npm:stripe@13.11.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Verificar se as variáveis de ambiente estão disponíveis
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      stripeKeyLength: stripeSecretKey?.length || 0,
      supabaseUrlLength: supabaseUrl?.length || 0
    });

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ 
          error: 'Sistema de pagamento não configurado. Entre em contato com o suporte.',
          code: 'STRIPE_CONFIG_MISSING'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables are not set');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do banco de dados não encontrada. Entre em contato com o suporte.',
          code: 'DATABASE_CONFIG_MISSING'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticação não fornecido',
          code: 'AUTH_HEADER_MISSING'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Inicializar Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Sessão expirada. Faça login novamente.',
          code: 'AUTH_INVALID'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Obter dados do corpo da requisição
    const requestBody = await req.json();
    const { priceId, successUrl, cancelUrl } = requestBody;

    console.log('Request data:', { priceId, successUrl, cancelUrl, userId: user.id });

    if (!priceId) {
      return new Response(
        JSON.stringify({ 
          error: 'ID do preço é obrigatório',
          code: 'PRICE_ID_MISSING'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Determinar a duração da assinatura com base no priceId
    let durationMonths = 1; // Padrão: 1 mês (Básico)
    let productName = "Básico";
    
    if (priceId.includes('professional')) {
      durationMonths = 12; // Profissional: 1 ano
      productName = "Profissional";
    } else if (priceId.includes('premium')) {
      durationMonths = 36; // Premium: 3 anos
      productName = "Premium";
    }

    // Inicializar Stripe
    console.log('Initializing Stripe...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Verificar se o cliente já existe no Stripe
    let { data: customerData } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let stripeCustomerId;

    if (customerData?.customer_id) {
      stripeCustomerId = customerData.customer_id;
      console.log('Using existing customer:', stripeCustomerId);
    } else {
      console.log('Creating new customer for user:', user.id);
      
      // Buscar dados do perfil do usuário
      const { data: userData } = await supabase
        .from('profiles')
        .select('nome, nome_completo, email')
        .eq('id', user.id)
        .single();

      // Criar cliente no Stripe
      const customer = await stripe.customers.create({
        email: user.email || userData?.email,
        name: userData?.nome_completo || userData?.nome || user.email,
        metadata: {
          user_id: user.id,
          duration_months: durationMonths.toString()
        },
      });

      stripeCustomerId = customer.id;
      console.log('Created new customer:', stripeCustomerId);

      // Salvar cliente no Supabase
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: customer.id,
          email: user.email || userData?.email,
        });
    }

    // Criar sessão de checkout
    console.log('Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/success?product=${encodeURIComponent(productName)}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          duration_months: durationMonths.toString(),
          product_name: productName
        },
      },
      allow_promotion_codes: true,
    });

    console.log('Checkout session created successfully:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Erro interno do servidor';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.message?.includes('No such price')) {
      errorMessage = 'Plano selecionado não encontrado. Atualize a página e tente novamente.';
      errorCode = 'INVALID_PRICE_ID';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Configuração do sistema de pagamento inválida. Entre em contato com o suporte.';
      errorCode = 'STRIPE_API_KEY_INVALID';
    } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError') {
      errorMessage = 'Erro de conexão com o sistema de pagamento. Tente novamente em alguns minutos.';
      errorCode = 'NETWORK_ERROR';
    } else if (error.message?.includes('customer')) {
      errorMessage = 'Erro ao processar dados do cliente. Tente novamente.';
      errorCode = 'CUSTOMER_ERROR';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2';

// Cabeçalhos CORS para permitir chamadas da sua aplicação
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Responder requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Obter token do header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // Tentar interpretar corpo JSON da requisição
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      throw new Error('Invalid request body');
    }
    
    // Extrair dados esperados da requisição
    const { price_id, success_url, cancel_url } = requestBody;

    if (!price_id) {
      throw new Error('price_id is required');
    }

    // Aqui deveria ter integração real com Stripe para criar sessão de checkout
    // Por enquanto, retorna um mock simulando sucesso
    return new Response(
      JSON.stringify({ 
        url: success_url || 'http://localhost:5173/success',
        customer_id: 'mock_customer_id',
        product_name: 'Premium'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);

    // Retorna erro 400 com mensagem para o cliente
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

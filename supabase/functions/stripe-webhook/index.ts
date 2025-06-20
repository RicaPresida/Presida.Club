import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { Stripe } from 'npm:stripe@13.11.0';

// Inicializar Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Inicializar Stripe
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.text();
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { 
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Received event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Obter dados do cliente
        const customer = await stripe.customers.retrieve(session.customer);
        const userId = customer.metadata.user_id || session.metadata?.user_id;
        const durationMonths = parseInt(customer.metadata.duration_months || session.metadata?.duration_months || '1', 10);
        
        if (!userId) {
          throw new Error('User ID not found in metadata');
        }

        // Obter cliente do Supabase
        const { data: customerData } = await supabase
          .from('stripe_customers')
          .select('id')
          .eq('user_id', userId)
          .eq('customer_id', customer.id)
          .maybeSingle();

        let customerId;
        
        if (customerData?.id) {
          customerId = customerData.id;
        } else {
          // Inserir cliente no Supabase
          const { data: newCustomer } = await supabase
            .from('stripe_customers')
            .insert({
              user_id: userId,
              customer_id: customer.id,
              email: customer.email,
            })
            .select('id')
            .single();
            
          customerId = newCustomer.id;
        }

        // Se for uma assinatura, processar
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const priceId = subscription.items.data[0].price.id;
          
          // Calcular data de término com base na duração do plano
          const currentPeriodStart = subscription.current_period_start;
          const currentPeriodEnd = subscription.current_period_end;
          
          // Inserir assinatura no Supabase
          await supabase
            .from('stripe_subscriptions')
            .insert({
              subscription_id: subscription.id,
              customer_id: customer.id,
              price_id: priceId,
              status: subscription.status,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_start: subscription.trial_start,
              trial_end: subscription.trial_end,
            });
            
          // Atualizar perfil do usuário
          await supabase
            .from('profiles')
            .update({
              trial_ends_at: null, // Desativar trial quando assinatura ativa
            })
            .eq('id', userId);
            
          // Criar notificação para o usuário
          await supabase
            .from('notificacoes')
            .insert({
              usuario_id: userId,
              titulo: 'Assinatura Ativada!',
              mensagem: `Sua assinatura do plano ${subscription.metadata.product_name || 'Premium'} foi ativada com sucesso. Duração: ${durationMonths} ${durationMonths === 1 ? 'mês' : 'meses'}.`,
            });
        }
        
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata.user_id || subscription.metadata?.user_id;
        const durationMonths = parseInt(customer.metadata.duration_months || subscription.metadata?.duration_months || '1', 10);
        
        if (!userId) {
          throw new Error('User ID not found in metadata');
        }

        // Obter cliente do Supabase
        const { data: customerData } = await supabase
          .from('stripe_customers')
          .select('id')
          .eq('user_id', userId)
          .eq('customer_id', subscription.customer)
          .maybeSingle();

        if (!customerData?.id) {
          throw new Error('Customer not found in database');
        }

        // Atualizar assinatura no Supabase
        await supabase
          .from('stripe_subscriptions')
          .upsert({
            subscription_id: subscription.id,
            customer_id: subscription.customer,
            price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at,
            trial_start: subscription.trial_start,
            trial_end: subscription.trial_end,
          });
          
        // Se a assinatura estiver ativa, atualizar perfil do usuário
        if (subscription.status === 'active') {
          await supabase
            .from('profiles')
            .update({
              trial_ends_at: null, // Desativar trial quando assinatura ativa
            })
            .eq('id', userId);
            
          // Notificar usuário sobre mudança de status
          if (event.type === 'customer.subscription.updated') {
            await supabase
              .from('notificacoes')
              .insert({
                usuario_id: userId,
                titulo: 'Assinatura Atualizada',
                mensagem: `Sua assinatura foi atualizada. Status atual: ${subscription.status === 'active' ? 'Ativa' : subscription.status}.`,
              });
          }
        }
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata.user_id || subscription.metadata?.user_id;
        
        if (!userId) {
          throw new Error('User ID not found in metadata');
        }
        
        // Marcar assinatura como cancelada no Supabase
        await supabase
          .from('stripe_subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: subscription.canceled_at,
            updated_at: new Date()
          })
          .eq('subscription_id', subscription.id);
          
        // Notificar usuário
        await supabase
          .from('notificacoes')
          .insert({
            usuario_id: userId,
            titulo: 'Assinatura Cancelada',
            mensagem: 'Sua assinatura foi cancelada. Você perderá acesso aos recursos premium quando o período atual terminar.',
          });
          
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }), 
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Receiving checkout request');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid request body');
    }
    
    const { priceId, successUrl, cancelUrl } = requestBody;

    if (!priceId) {
      throw new Error('Price ID is required');
    }

    // Get user info from Authorization header
    let userId = null;
    let userEmail = null;
    
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        // Decode JWT to get basic user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        userEmail = payload.email;
      }
    } catch (authError) {
      console.warn('Could not extract user information:', authError);
    }

    // Determine product name and duration based on priceId
    let productName = "Básico";
    let durationMonths = 1;
    
    if (priceId.includes('professional')) {
      productName = "Profissional";
      durationMonths = 12;
    } else if (priceId.includes('premium')) {
      productName = "Premium";
      durationMonths = 36;
    }

    // Construct checkout URL with parameters
    const baseUrl = successUrl ? new URL(successUrl).origin : 'https://app.presida.club';
    const successUrlFinal = `${baseUrl}/success?product=${encodeURIComponent(productName)}&duration=${durationMonths}&mock=true`;
    const cancelUrlFinal = cancelUrl || `${baseUrl}/pricing`;
    
    console.log('Redirecting to mock checkout:', successUrlFinal);
    
    return new Response(
      JSON.stringify({ url: successUrlFinal }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in stripe-checkout function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred'
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 400,
      }
    );
  }
});
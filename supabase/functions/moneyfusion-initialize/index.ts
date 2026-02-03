import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, appointmentId, patientId, customerName, customerPhone } = await req.json();

    console.log('[MoneyFusion Init] Request received:', {
      amount,
      appointmentId,
      patientId,
      customerName,
      customerPhone,
    });

    // Validate required fields
    if (!amount || !appointmentId || !patientId || !customerName || !customerPhone) {
      console.error('[MoneyFusion Init] Missing required fields');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Champs requis manquants',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create payment record in database with pending status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        amount,
        appointment_id: appointmentId,
        patient_id: patientId,
        payment_type: 'deposit',
        provider: 'moneyfusion',
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[MoneyFusion Init] Failed to create payment record:', paymentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur lors de la création du paiement',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('[MoneyFusion Init] Payment record created:', payment.id);

    // Get the MoneyFusion API URL
    const moneyFusionApiUrl = Deno.env.get('MONEYFUSION_API_URL');
    
    if (!moneyFusionApiUrl) {
      console.error('[MoneyFusion Init] MONEYFUSION_API_URL not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuration MoneyFusion manquante',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Build return URLs - use the preview URL from origin header or fallback
    const origin = req.headers.get('origin') || 'https://id-preview--739398ed-1767-4c70-9971-c698c8e827a6.lovable.app';
    const returnUrl = `${origin}/payment/success?token=${payment.id}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/moneyfusion-webhook`;

    console.log('[MoneyFusion Init] URLs:', { returnUrl, webhookUrl });

    // Prepare MoneyFusion payment data
    // MoneyFusion uses form POST, so we'll create a redirect URL with the payment info
    // The API URL format is: https://my.moneyfusion.net/{merchant_id}
    
    // For MoneyFusion, we need to redirect with form data
    // We'll use a hidden form submission approach via the frontend
    // Store the payment info and return the URL for redirection

    // Update payment with a temporary transaction ref (the payment ID)
    await supabase
      .from('payments')
      .update({ transaction_ref: payment.id })
      .eq('id', payment.id);

    // Build the MoneyFusion payment URL with query parameters
    // MoneyFusion accepts POST to their API endpoint
    const paymentUrl = `${moneyFusionApiUrl}?` + new URLSearchParams({
      totalPrice: amount.toString(),
      article: JSON.stringify([{ consultation: amount }]),
      numeroSend: customerPhone,
      nomclient: customerName,
      personal_Info: JSON.stringify([{
        appointmentId,
        patientId,
        paymentId: payment.id,
      }]),
      return_url: returnUrl,
      webhook_url: webhookUrl,
    }).toString();

    console.log('[MoneyFusion Init] Payment initialized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        paymentUrl: moneyFusionApiUrl,
        formData: {
          totalPrice: amount,
          article: JSON.stringify([{ consultation: amount }]),
          numeroSend: customerPhone,
          nomclient: customerName,
          personal_Info: JSON.stringify([{
            appointmentId,
            patientId,
            paymentId: payment.id,
          }]),
          return_url: returnUrl,
          webhook_url: webhookUrl,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('[MoneyFusion Init] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

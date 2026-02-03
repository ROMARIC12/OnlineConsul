import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a 6-character alphanumeric code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctorId, duration, amount, customerPhone, customerName, patientId } = await req.json();

    if (!doctorId || !duration) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const moneyfusionUrl = Deno.env.get('MONEYFUSION_API_URL');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get patient ID from auth token if not provided
    let actualPatientId = patientId;
    if (!actualPatientId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('profile_id', user.id)
            .single();
          actualPatientId = patient?.id;
        }
      }
    }

    if (!actualPatientId) {
      return new Response(
        JSON.stringify({ error: 'Patient non identifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique channel name and access code
    const channelName = `tc-${doctorId.slice(0, 8)}-${Date.now()}`;
    const accessCode = generateAccessCode();

    // Create teleconsultation session
    const { data: session, error: sessionError } = await supabase
      .from('teleconsultation_sessions')
      .insert({
        doctor_id: doctorId,
        patient_id: actualPatientId,
        channel_name: channelName,
        access_code: accessCode,
        duration_minutes: duration,
        amount: amount || 0,
        status: amount > 0 ? 'pending' : 'paid' // Free sessions are automatically "paid"
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }

    console.log(`[Teleconsultation] Session created: ${session.id}, code: ${accessCode}`);

    // If free, return the session directly
    if (amount <= 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sessionId: session.id,
          accessCode: accessCode,
          channelName: channelName,
          isFree: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For paid sessions, we redirect directly to MoneyFusion
    // The webhook will handle payment confirmation
    if (!moneyfusionUrl) {
      console.error('MoneyFusion URL not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL for callbacks
    const origin = req.headers.get('origin') || 'https://id-preview--739398ed-1767-4c70-9971-c698c8e827a6.lovable.app';

    // Build the MoneyFusion payment form URL with parameters
    const paymentParams = new URLSearchParams({
      totalPrice: amount.toString(),
      article: JSON.stringify([{ teleconsultation: amount }]),
      numeroSend: customerPhone || '',
      nomclient: customerName || '',
      personal_Info: JSON.stringify([{
        sessionId: session.id,
        patientId: actualPatientId,
        // accessCode: accessCode, // REMOVED for security: retrieved from DB in webhook
        type: 'teleconsultation'
      }]),
      return_url: `${origin}/dashboard/teleconsultation`, // Redirection to the teleconsultation tab, code will be revealed via Realtime
      webhook_url: `${supabaseUrl}/functions/v1/teleconsultation-webhook`
    });

    // Return the payment URL
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        paymentUrl: `${moneyfusionUrl}?${paymentParams.toString()}`,
        // accessCode: accessCode // REMOVED for security: only disclosed via realtime after payment
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error initializing teleconsultation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
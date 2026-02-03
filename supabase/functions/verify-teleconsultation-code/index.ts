import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Code requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the teleconsultation session by access code
    const { data: session, error } = await supabase
      .from('teleconsultation_sessions')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error || !session) {
      console.log('Session not found for code:', code);
      return new Response(
        JSON.stringify({ valid: false, message: 'Code invalide ou expiré' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check session status
    if (session.status === 'completed' || session.status === 'cancelled') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Cette session est terminée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status !== 'paid' && session.status !== 'active') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Paiement non confirmé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session status to active if not already
    if (session.status === 'paid') {
      await supabase
        .from('teleconsultation_sessions')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    console.log(`[Teleconsultation] Code verified for session: ${session.id}`);

    return new Response(
      JSON.stringify({
        valid: true,
        sessionData: {
          channelName: session.channel_name,
          doctorId: session.doctor_id,
          duration: session.duration_minutes
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying code:', error);
    return new Response(
      JSON.stringify({ valid: false, message: 'Erreur de vérification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
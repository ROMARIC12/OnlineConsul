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
    const body = await req.json();
    console.log('[Teleconsultation Webhook] Received:', JSON.stringify(body));

    const { event, tokenPay, statut, personal_Info, Montant } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse personal_Info
    let sessionInfo;
    if (typeof personal_Info === 'string') {
      try {
        sessionInfo = JSON.parse(personal_Info);
      } catch {
        sessionInfo = personal_Info;
      }
    } else {
      sessionInfo = personal_Info;
    }

    const info = Array.isArray(sessionInfo) ? sessionInfo[0] : sessionInfo;

    if (!info?.sessionId || info?.type !== 'teleconsultation') {
      console.log('[Teleconsultation Webhook] Not a teleconsultation payment, skipping');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sessionId, patientId, paymentId, accessCode } = info;

    // Handle payment completed
    if (event === 'payin.session.completed' || statut === 'paid') {
      console.log(`[Teleconsultation Webhook] Payment completed for session: ${sessionId}`);

      // Update payment status
      if (paymentId) {
        await supabase
          .from('payments')
          .update({
            status: 'success',
            paid_at: new Date().toISOString(),
            transaction_ref: tokenPay
          })
          .eq('id', paymentId);
      }

      // Update session status to paid
      await supabase
        .from('teleconsultation_sessions')
        .update({ status: 'paid' })
        .eq('id', sessionId);

      // Get session details for notifications
      const { data: session } = await supabase
        .from('teleconsultation_sessions')
        .select(`
          *,
          doctor:doctors(profile_id, profile:profiles(first_name, last_name)),
          patient:patients(profile_id, profile:profiles(first_name, last_name))
        `)
        .eq('id', sessionId)
        .single();

      if (session) {
        const patientName = `${session.patient?.profile?.first_name} ${session.patient?.profile?.last_name}`;
        const doctorName = `Dr. ${session.doctor?.profile?.first_name} ${session.doctor?.profile?.last_name}`;

        // Notify patient
        if (session.patient?.profile_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: session.patient.profile_id,
              type: 'teleconsultation',
              title: 'Téléconsultation confirmée',
              message: `Votre code d'accès : ${session.access_code}. Utilisez ce code pour rejoindre la téléconsultation avec ${doctorName}.`,
              data: { sessionId, accessCode: session.access_code }
            });
        }

        // Notify doctor
        if (session.doctor?.profile_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: session.doctor.profile_id,
              type: 'teleconsultation',
              title: 'Nouvelle téléconsultation',
              message: `${patientName} a réservé une téléconsultation de ${session.duration_minutes} minutes.`,
              data: { sessionId, patientId }
            });
        }
      }

      console.log(`[Teleconsultation Webhook] Session ${sessionId} marked as paid`);
    } else if (event === 'payin.session.cancelled' || statut === 'failed' || statut === 'cancelled') {
      // Handle payment failure/cancellation
      console.log(`[Teleconsultation Webhook] Payment failed/cancelled for session: ${sessionId}`);

      if (paymentId) {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', paymentId);
      }

      await supabase
        .from('teleconsultation_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('[Teleconsultation Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
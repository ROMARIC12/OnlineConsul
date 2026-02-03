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
    const body = await req.json();
    
    console.log('[MoneyFusion Webhook] Received event:', JSON.stringify(body, null, 2));

    const { event, tokenPay, statut, personal_Info, Montant, numeroSend } = body;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract payment info from personal_Info
    let paymentInfo = null;
    if (personal_Info && Array.isArray(personal_Info) && personal_Info.length > 0) {
      paymentInfo = personal_Info[0];
    } else if (typeof personal_Info === 'string') {
      try {
        const parsed = JSON.parse(personal_Info);
        paymentInfo = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        console.log('[MoneyFusion Webhook] Could not parse personal_Info');
      }
    }

    console.log('[MoneyFusion Webhook] Payment info:', paymentInfo);

    if (!paymentInfo?.paymentId) {
      // Try to find payment by tokenPay
      if (tokenPay) {
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('transaction_ref', tokenPay)
          .single();

        if (payment) {
          paymentInfo = {
            paymentId: payment.id,
            appointmentId: payment.appointment_id,
            patientId: payment.patient_id,
          };
        }
      }
    }

    if (!paymentInfo?.paymentId) {
      console.error('[MoneyFusion Webhook] No payment info found');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if payment already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentInfo.paymentId)
      .single();

    if (!existingPayment) {
      console.error('[MoneyFusion Webhook] Payment record not found:', paymentInfo.paymentId);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Skip if already processed successfully
    if (existingPayment.status === 'success') {
      console.log('[MoneyFusion Webhook] Payment already processed:', paymentInfo.paymentId);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different events
    const isPaid = event === 'payin.session.completed' || statut === 'paid';
    const isFailed = event === 'payin.session.cancelled' || statut === 'failure' || statut === 'no paid';

    if (isPaid) {
      console.log('[MoneyFusion Webhook] Payment successful, updating records...');

      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'success',
          transaction_ref: tokenPay || existingPayment.transaction_ref,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentInfo.paymentId);

      // Confirm the appointment
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', paymentInfo.appointmentId);

      // Get appointment and patient details for notifications
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(profile_id, specialty, profile:profiles(first_name, last_name)),
          patient:patients(profile_id, profile:profiles(first_name, last_name)),
          clinic:clinics(id, name)
        `)
        .eq('id', paymentInfo.appointmentId)
        .single();

      if (appointment) {
        const patientName = `${appointment.patient?.profile?.first_name || ''} ${appointment.patient?.profile?.last_name || ''}`.trim() || 'Patient';
        const doctorName = `Dr. ${appointment.doctor?.profile?.first_name || ''} ${appointment.doctor?.profile?.last_name || ''}`.trim();
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('fr-FR');
        const appointmentTime = appointment.appointment_time?.slice(0, 5);

        // Notify patient
        if (appointment.patient?.profile_id) {
          await supabase.from('notifications').insert({
            user_id: appointment.patient.profile_id,
            type: 'payment_success',
            title: 'Paiement confirmé ✓',
            message: `Votre paiement de ${Montant || existingPayment.amount} FCFA a été reçu. Votre RDV avec ${doctorName} le ${appointmentDate} à ${appointmentTime} est confirmé.`,
            data: {
              appointment_id: paymentInfo.appointmentId,
              payment_id: paymentInfo.paymentId,
              amount: Montant || existingPayment.amount,
            },
          });
        }

        // Notify doctor
        if (appointment.doctor?.profile_id) {
          await supabase.from('notifications').insert({
            user_id: appointment.doctor.profile_id,
            type: 'new_appointment',
            title: 'Nouveau RDV confirmé (payé)',
            message: `${patientName} a réservé un RDV le ${appointmentDate} à ${appointmentTime}. Paiement reçu.`,
            data: {
              appointment_id: paymentInfo.appointmentId,
              patient_id: paymentInfo.patientId,
            },
          });
        }

        // Notify clinic secretaries if applicable
        if (appointment.clinic?.id) {
          const { data: secretaries } = await supabase
            .from('clinic_secretaries')
            .select('secretary_id')
            .eq('clinic_id', appointment.clinic.id)
            .eq('is_active', true);

          if (secretaries && secretaries.length > 0) {
            const notifications = secretaries.map(sec => ({
              user_id: sec.secretary_id,
              type: 'new_appointment',
              title: 'Nouveau RDV à traiter',
              message: `${patientName} - ${doctorName} - ${appointmentDate} à ${appointmentTime}. Paiement confirmé.`,
              data: {
                appointment_id: paymentInfo.appointmentId,
                clinic_id: appointment.clinic.id,
                doctor_id: appointment.doctor_id,
                patient_id: paymentInfo.patientId,
              },
            }));

            await supabase.from('notifications').insert(notifications);
          }
        }
      }

      console.log('[MoneyFusion Webhook] Payment processed successfully');

    } else if (isFailed) {
      console.log('[MoneyFusion Webhook] Payment failed, updating status...');

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          transaction_ref: tokenPay || existingPayment.transaction_ref,
        })
        .eq('id', paymentInfo.paymentId);

      // Cancel the appointment
      await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Paiement échoué',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', paymentInfo.appointmentId);

    } else {
      console.log('[MoneyFusion Webhook] Event pending or unknown:', event, statut);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[MoneyFusion Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

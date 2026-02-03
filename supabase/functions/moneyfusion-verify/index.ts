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
    const { token, paymentId } = await req.json();

    console.log('[MoneyFusion Verify] Verifying payment:', { token, paymentId });

    if (!token && !paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token ou paymentId requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get payment from database
    let query = supabase
      .from('payments')
      .select(`
        *,
        appointment:appointments(
          id,
          appointment_date,
          appointment_time,
          status,
          doctor:doctors(
            id,
            specialty,
            profile:profiles(first_name, last_name)
          ),
          clinic:clinics(id, name)
        )
      `);

    if (paymentId) {
      query = query.eq('id', paymentId);
    } else if (token) {
      query = query.or(`id.eq.${token},transaction_ref.eq.${token}`);
    }

    const { data: payment, error } = await query.single();

    if (error || !payment) {
      console.error('[MoneyFusion Verify] Payment not found:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement non trouvé', status: 'not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('[MoneyFusion Verify] Payment found:', payment.id, 'Status:', payment.status);

    // If we have a transaction_ref that's not the payment ID, verify with MoneyFusion API
    if (payment.transaction_ref && payment.transaction_ref !== payment.id && payment.status === 'pending') {
      try {
        const verifyUrl = `https://www.pay.moneyfusion.net/paiementNotif/${payment.transaction_ref}`;
        console.log('[MoneyFusion Verify] Checking with MoneyFusion API:', verifyUrl);

        const response = await fetch(verifyUrl);
        const verifyData = await response.json();

        console.log('[MoneyFusion Verify] MoneyFusion response:', verifyData);

        // Update payment status based on MoneyFusion response
        if (verifyData.statut === 'paid') {
          await supabase
            .from('payments')
            .update({ status: 'success', paid_at: new Date().toISOString() })
            .eq('id', payment.id);

          await supabase
            .from('appointments')
            .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
            .eq('id', payment.appointment_id);

          payment.status = 'success';
        } else if (verifyData.statut === 'failure' || verifyData.statut === 'no paid') {
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', payment.id);

          payment.status = 'failed';
        }
      } catch (verifyError) {
        console.log('[MoneyFusion Verify] Could not verify with MoneyFusion API:', verifyError);
        // Continue with database status
      }
    }

    // Get patient info for receipt
    const { data: patient } = await supabase
      .from('patients')
      .select('profile_id, profile:profiles(first_name, last_name, phone)')
      .eq('id', payment.patient_id)
      .single();

    // Get user email
    let patientEmail: string | null = null;
    // Profile comes as a single object in one-to-one relation
    const profileData = patient?.profile;
    const patientProfile = profileData && !Array.isArray(profileData) 
      ? profileData as { first_name: string; last_name: string; phone: string }
      : null;
    
    if (patientProfile && patient?.profile_id) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(patient.profile_id);
        patientEmail = authUser?.user?.email || null;
      } catch {
        // Ignore auth errors
      }
    }

    const response = {
      success: true,
      status: payment.status,
      payment: {
        id: payment.id,
        amount: payment.amount,
        transaction_ref: payment.transaction_ref,
        payment_type: payment.payment_type,
        provider: payment.provider,
        paid_at: payment.paid_at,
        created_at: payment.created_at,
      },
      appointment: payment.appointment ? {
        id: payment.appointment.id,
        date: payment.appointment.appointment_date,
        time: payment.appointment.appointment_time,
        status: payment.appointment.status,
        doctor_name: payment.appointment.doctor?.profile 
          ? `Dr. ${payment.appointment.doctor.profile.first_name} ${payment.appointment.doctor.profile.last_name}`
          : 'Médecin',
        specialty: payment.appointment.doctor?.specialty || '',
        clinic_name: payment.appointment.clinic?.name || null,
      } : null,
      patient: patientProfile ? {
        name: `${patientProfile.first_name} ${patientProfile.last_name}`,
        phone: patientProfile.phone,
        email: patientEmail,
      } : null,
    };

    console.log('[MoneyFusion Verify] Returning response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[MoneyFusion Verify] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Log request method and headers for debugging
  console.log(`[Agora] Received request: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(err => {
      console.error("[Agora] Failed to parse JSON body:", err);
      return null;
    });

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Body JSON invalide ou manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { channelName, role = 'publisher', uid } = body;
    console.log(`[Agora] Request params:`, { channelName, role, uid });

    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      console.error('[Agora] Missing environment variables:', {
        hasAppId: !!appId,
        hasCert: !!appCertificate
      });
      return new Response(
        JSON.stringify({ error: 'Configuration Agora manquante (Secrets non configurés sur Supabase)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: 'Channel name requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userUid = uid || Math.floor(Math.random() * 100000);
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    console.log(`[Agora] Starting token build...`);

    try {
      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        userUid,
        rtcRole,
        privilegeExpiredTs,
        privilegeExpiredTs
      );

      console.log(`[Agora] Token generated successfully for channel: ${channelName}`);

      return new Response(
        JSON.stringify({
          token,
          appId,
          uid: userUid,
          channelName,
          expiresAt: privilegeExpiredTs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (buildError: any) {
      console.error('[Agora] RtcTokenBuilder CRASHED:', buildError);
      return new Response(
        JSON.stringify({
          error: 'Erreur interne lors de la construction du jeton',
          details: buildError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[Agora] Global catch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur inattendue',
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
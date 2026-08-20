import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Manejo de CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL") || "https://flow1.lsnetinformatica.com.ar/webhook/social-ai-wf01";
    const n8nWebhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET") || "aura_sec_9941a8b72f104d83e2";

    // 1. Validar autenticación del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta cabecera Authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extraer parámetros del body
    const body = await req.json();
    const { workspace_id, brand_id } = body;

    if (!workspace_id || !brand_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id y brand_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Validar que el usuario sea miembro del workspace
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr || !membership) {
      return new Response(
        JSON.stringify({ error: "Acceso denegado: no pertenecés a este workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validar que la brand pertenezca al workspace
    const { data: brand, error: brandErr } = await supabaseAdmin
      .from("brands")
      .select("id, name")
      .eq("id", brand_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (brandErr || !brand) {
      return new Response(
        JSON.stringify({ error: "La marca indicada no pertenece a este workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Prevenir ejecuciones duplicadas concurrentes (últimos 2 minutos)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: activeRuns } = await supabaseAdmin
      .from("generation_runs")
      .select("id, status")
      .eq("workspace_id", workspace_id)
      .eq("brand_id", brand_id)
      .eq("workflow_name", "WF01")
      .in("status", ["pending", "running"])
      .gte("created_at", twoMinutesAgo)
      .limit(1);

    if (activeRuns && activeRuns.length > 0) {
      return new Response(
        JSON.stringify({
          run_id: activeRuns[0].id,
          status: activeRuns[0].status,
          message: "Ya existe una generación en curso para esta marca",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Crear el registro generation_run en estado 'pending' (started_at = null)
    const { data: newRun, error: createRunErr } = await supabaseAdmin
      .from("generation_runs")
      .insert({
        workspace_id,
        brand_id,
        user_id: user.id,
        workflow_name: "WF01",
        status: "pending",
        started_at: null,
      })
      .select("id, status, created_at")
      .single();

    if (createRunErr || !newRun) {
      console.error("Error al crear generation_run:", createRunErr);
      return new Response(
        JSON.stringify({ error: "Error al registrar la ejecución en la base de datos" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Enviar POST al Webhook de n8n
    try {
      const n8nPayload = {
        run_id: newRun.id,
        workspace_id,
        brand_id,
        user_id: user.id,
      };

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aura-Secret": n8nWebhookSecret,
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("Error respuesta n8n webhook:", n8nResponse.status, errorText);

        // Actualizar run a failed si n8n no aceptó la llamada
        await supabaseAdmin
          .from("generation_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: `n8n webhook respondió con código ${n8nResponse.status}`,
          })
          .eq("id", newRun.id);

        return new Response(
          JSON.stringify({ error: "El servicio de generación (n8n) no pudo aceptar la solicitud" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (n8nFetchErr: any) {
      console.error("Fallo de red al conectar con n8n:", n8nFetchErr);

      await supabaseAdmin
        .from("generation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: `Fallo de conexión con n8n: ${n8nFetchErr.message}`,
        })
        .eq("id", newRun.id);

      return new Response(
        JSON.stringify({ error: "No se pudo establecer conexión con el servicio de automatización" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Responder inmediatamente al frontend con el run_id
    return new Response(
      JSON.stringify({
        run_id: newRun.id,
        status: "pending",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error no controlado en generate-ideas:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

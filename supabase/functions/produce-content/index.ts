import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Obtener webhook URL de forma ESTRICTA (Sin fallbacks en código)
    const n8nWebhookUrl = Deno.env.get("N8N_WF02_WEBHOOK_URL") || Deno.env.get("N8N_PRODUCE_CONTENT_WEBHOOK_URL");
    if (!n8nWebhookUrl || !n8nWebhookUrl.trim()) {
      console.error("Configuración faltante: N8N_WF02_WEBHOOK_URL no está definida.");
      return new Response(
        JSON.stringify({ error: "Configuración del motor de producción no disponible (N8N_WF02_WEBHOOK_URL faltante)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 2. Validar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta cabecera Authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido o expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      request_id,
      workspace_id,
      brand_id,
      idea_id,
      generation_run_id,
      production_brief,
    } = body;

    if (!request_id || !workspace_id || !brand_id || !idea_id) {
      return new Response(
        JSON.stringify({ error: "request_id, workspace_id, brand_id e idea_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Invocación de la RPC Transaccional ACID
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "create_content_production_request",
      {
        p_request_id: request_id,
        p_workspace_id: workspace_id,
        p_brand_id: brand_id,
        p_idea_id: idea_id,
        p_generation_run_id: generation_run_id || null,
        p_platform: production_brief?.target_platform || "instagram",
        p_content_type: production_brief?.target_format || "reel",
        p_production_brief: production_brief || {},
      }
    );

    if (rpcError) {
      console.error("Error en RPC create_content_production_request:", rpcError);
      const isConflict = rpcError.message?.includes("409 Conflict") || rpcError.code === "23505";
      const isForbidden = rpcError.message?.includes("403 Forbidden") || rpcError.code === "42501";
      return new Response(
        JSON.stringify({ error: rpcError.message || "Error al registrar solicitud de producción" }),
        {
          status: isConflict ? 409 : isForbidden ? 403 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { content_item_id, outbox_event_id, is_new, status } = rpcResult;

    // 4. Fast Path: Reclamo atómico de despacho en outbox ('pending' -> 'processing')
    const { data: claimed } = await supabaseAdmin
      .from("production_outbox")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
        attempts: 1,
      })
      .eq("id", outbox_event_id)
      .eq("status", "pending")
      .select("id")
      .single();

    if (claimed) {
      // Disparar Webhook hacia n8n de forma asíncrona
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: outbox_event_id,
          request_id,
          content_item_id,
          workspace_id,
          brand_id,
          user_id: user.id,
          idea_id,
          generation_run_id,
          production_brief,
        }),
      }).catch(async (fetchErr) => {
        // Si el fetch falla de inmediato, revertir outbox a 'pending' con backoff de 30s
        console.error("Fast Path fetch falló; revirtiendo outbox a pending:", fetchErr.message);
        await supabaseAdmin
          .from("production_outbox")
          .update({
            status: "pending",
            available_at: new Date(Date.now() + 30000).toISOString(),
            last_error: fetchErr.message || "Fallo en fetch inicial",
          })
          .eq("id", outbox_event_id);
      });
    }

    return new Response(
      JSON.stringify({
        content_id: content_item_id,
        outbox_event_id,
        status,
        is_duplicate: !is_new,
      }),
      {
        status: is_new ? 201 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error no controlado en produce-content:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

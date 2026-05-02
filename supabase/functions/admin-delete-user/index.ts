import { corsHeaders, requireAdmin } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if ("error" in guard) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user_id === guard.user.id) {
      return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await guard.admin.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

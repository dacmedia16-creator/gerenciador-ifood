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
    const { user_id, role, action } = await req.json();
    if (!user_id || !role || !["admin", "user"].includes(role)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      await guard.admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
    } else {
      await guard.admin.from("user_roles").upsert(
        { user_id, role },
        { onConflict: "user_id,role" }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

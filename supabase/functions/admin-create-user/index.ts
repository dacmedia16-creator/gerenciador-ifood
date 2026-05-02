import { corsHeaders, requireAdmin } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if ("error" in guard) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, password, name, makeAdmin } = await req.json();
    if (!email || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Email e senha (mín. 6) obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await guard.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email },
    });
    if (error) throw error;

    const userId = data.user!.id;

    // Garante profile (caso o trigger não exista)
    await guard.admin.from("profiles").upsert(
      { user_id: userId, name: name || email, email },
      { onConflict: "user_id" }
    );

    // Role default
    await guard.admin.from("user_roles").insert({
      user_id: userId,
      role: makeAdmin ? "admin" : "user",
    });

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

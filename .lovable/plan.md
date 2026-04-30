## Problema

Ao clicar em **"Consultar Gestor IA"**, a edge function `ai-consult` retorna **404 "Loja não encontrada"**, mesmo com a loja existindo no banco e o usuário sendo o dono (`user_id` bate com `auth.uid()`).

### Diagnóstico

- A loja `03fcb0aa-...` existe e pertence ao user logado (`48e83670-...`).
- RLS de `stores` é simples: `auth.uid() = user_id`.
- Logs mostram que **uma chamada anterior funcionou (200)** e as seguintes começaram a retornar 404 em ~3s.
- Causa raiz: na refatoração recente substituímos `supabase.auth.getClaims()` por:
  ```ts
  const supabase = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await supabase.auth.getUser(token);
  ```
  Chamar `getUser(token)` no client criado com header global **invalida a sessão interna** e faz com que as próximas chamadas `.from("stores").select()` saiam **sem o JWT do usuário** (efetivamente como `anon`), o que bloqueia tudo via RLS e retorna 0 linhas → `.single()` falha → caímos no `return 404 "Loja não encontrada"`.

## Correção

Em `supabase/functions/ai-consult/index.ts`, separar **autenticação** de **acesso a dados**:

1. Criar um client **somente para validar o JWT** (sem header global), usado uma única vez para `auth.getUser(token)`.
2. Criar um **segundo client** já com `Authorization: Bearer <jwt>` no `global.headers` — esse será usado para todas as queries (`stores`, `products`, etc.) e respeita RLS.
3. Não misturar `auth.getUser` com o client de queries.

### Trecho-alvo (linhas ~155–175)

```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const token = authHeader.replace("Bearer ", "");

// Client 1: só para validar usuário (sem header global)
const authClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);
const { data: userData, error: userErr } = await authClient.auth.getUser(token);
if (userErr || !userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Client 2: queries com RLS do usuário
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
);
```

## Validação

1. Redeploy da função `ai-consult`.
2. `curl_edge_functions` POST com `{"storeId":"03fcb0aa-..."}` → esperado **200** com `diagnosis`.
3. Clicar em **"Consultar Gestor IA"** na UI — esperado redirecionamento para `/report` com a análise.
4. Conferir logs: sem `Loja não encontrada`, mantém `ai_consult.rag` e (se aplicável) `ai_consult.slow`.

## Não-objetivos

- Não reescrever a lógica de RAG, memória, validação ou regras de aprendizado.
- Não alterar RLS nem schema.
- Não tocar em `ai-consult` além desse bloco de auth (~20 linhas).

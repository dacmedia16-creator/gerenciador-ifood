# Fix: `ai-consult` quebrado por `auth.getClaims is not a function`

## Problema

A função `ai-consult` (linha 169 de `supabase/functions/ai-consult/index.ts`) chama:

```ts
const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
```

O método `getClaims()` não existe na versão do `@supabase/supabase-js` carregada pelo edge runtime, então **toda execução cai no catch e retorna 500**. É a causa do toast "Edge Function returned a non-2xx status code" que aparece ao clicar em **Consultar Gestor IA**.

Todas as outras funções do projeto (`record-feedback`, `measure-outcomes`, `update-store-memory`, etc.) já usam o padrão correto `auth.getUser(token)`. Apenas `ai-consult` está fora do padrão.

## Correção (1 arquivo, ~6 linhas)

**`supabase/functions/ai-consult/index.ts`** — substituir o bloco de validação de JWT (linhas ~168-174) por:

```ts
const token = authHeader.replace("Bearer ", "");
const { data: userData, error: userErr } = await supabase.auth.getUser(token);
if (userErr || !userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Nada mais muda — `userData.user.id` não é usado adiante porque o ownership da loja é garantido pela RLS via `global.headers.Authorization` no cliente Supabase já criado nas linhas 162-166.

## Validação pós-deploy

1. Clicar em **Consultar Gestor IA** na tela de uma loja existente.
2. Esperado: a resposta consultiva é renderizada (sem toast vermelho).
3. Conferir em `supabase--edge_function_logs ai-consult` que não há mais `TypeError: supabase.auth.getClaims is not a function`.
4. Rodar `supabase/functions/ai-consult/validation_test.ts` e `learning_test.ts` para garantir que os testes continuam verdes.

## Fora do escopo

- Não alterar a lógica consultiva, anti-alucinação, RAG, logging estruturado nem o `diagnosis_cycle_id`.
- Não tocar nas demais funções (já corretas).
- Não mexer em RLS, schema ou frontend.

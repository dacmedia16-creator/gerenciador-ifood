## Aprendizado contínuo — duas camadas

### O que já existe (camada 2 — feedback/outcome)
Boa notícia: a camada 2 está **toda implementada**:
- `record-feedback` registra o que o usuário marcou (aplicada / ignorada / rejeitada).
- `measure-outcomes` (cron 7d) compara `metrics_before` × `metrics_after` e classifica `outcome`.
- `extract-case` é chamado automaticamente quando o outcome é positivo e grava na `case_library` com `embedding`, anonimizando via `store_profile`.

Falta só a **camada 1** (gravação imediata, ao gerar diagnóstico).

### O que vou implementar (camada 1)

1. **Nova edge function `seed-cases-from-diagnosis`**
   - Recebe `sessionId` (ou `storeId`).
   - Busca os diagnósticos recém-criados na rodada (`diagnostics` dos últimos 30 min).
   - Para cada diagnóstico relevante, gera `embedding` e insere na `case_library` com:
     - `store_profile` agregado e **anonimizado**: `category`, `platform`, `ticket_band` (baixo/médio/alto), `size_band` (pequena/média/grande), `city_initial` (só inicial). Sem `store_id`, nome, endereço ou `user_id`.
     - `outcome: "neutro"` (semente — sem feedback ainda).
     - `_seed_key` em `store_profile` = hash estável `(storeId, area, problem)` → idempotência.
   - Filtra ruído: precisa ter `recommended_solution` minimamente útil (≥ 20 chars).
   - Autenticação: aceita JWT do dono **ou** `X-Internal-Call` (service role).

2. **Disparo automático no fim do diagnóstico**
   - Em `src/lib/diagnosis/generate.ts`, após marcar a sessão como `generated`, invoca `seed-cases-from-diagnosis` em background (sem bloquear UI).

### Arquivos
- **Novo:** `supabase/functions/seed-cases-from-diagnosis/index.ts`
- **Editar:** `src/lib/diagnosis/generate.ts` (1 chamada `supabase.functions.invoke` no final)

### Privacidade
- Nada de `store_id`, nome, `user_id` ou endereço no payload da `case_library`.
- RLS atual (`case_read_authenticated`) já garante que usuários só leiam — apenas a função (service role) escreve.

### Resultado prático
- Cada diagnóstico finalizado vira 3-15 casos-semente anônimos.
- A `match_cases()` que a IA usa nos próximos diagnósticos passa a devolver casos reais de lojas com perfil semelhante (mesma categoria, faixa de ticket, porte).
- Quando esses casos depois recebem feedback (camada 2), a `extract-case` insere uma versão "com outcome", enriquecendo ainda mais o conhecimento — efeito de rede entre todos os usuários.

# Auditoria — Gestor IA de Delivery

## 1. Diagnóstico do estado atual

**Fluxos de IA (coexistem hoje):**
- `ai-consult` (NOVO, completo): RULE_EVIDENCES + STORE_MEMORY + PAST_RECOMMENDATIONS + SIMILAR_CASES + KNOWLEDGE_SNIPPETS, `tool_choice` forçado, validação anti-alucinação por `rule_id`/`source_ref`, persistência em `recommendation_history` + `training_examples`, dispara `update-store-memory`. Usado em `Report.tsx` ("Consultar Gestor IA").
- `ai-diagnose` (LEGADO): roda só motor de regras antigo (`_shared/diagnostic-rules.ts`) + LLM livre, **sem ancoragem em rule_id**, **sem source**, **sem memória**, **sem RAG**, **sem feedback loop**. Apaga `diagnostics` e `action_plans` da loja a cada chamada (destrutivo). Usado em `Diagnostics.tsx` (botão "Gerar com IA").

→ Coexistência cria diagnósticos com qualidade muito diferente. `ai-diagnose` viola as regras invioláveis do projeto.

**Motor de regras (`src/lib/diagnosis/rules.ts` + `_shared/evidences.ts`):**
- Cobertura razoável de 1ª camada (rating, tempo, cancelamento, conversão, fotos, margem, ticket, recompra, ROI, concorrência, reviews).
- Faltam regras de 2ª camada que um gestor humano olharia: **tendência 7/14/30d**, faturamento↑ com lucro↓, produto campeão com margem baixa cruzado com reclamações, atraso concentrado em pico, cancelamento por falta de produto, queda de conversão entre snapshots, cardápio inchado, "não mexer no que funciona".
- Espelho Deno (`evidences.ts`) tem ~10 regras; o TS do front (`rules.ts`) tem ~20. **Divergência** — a IA enxerga menos coisas do que a UI mostra.

**Loop de aprendizado:**
- `ai-consult` já grava `metrics_before` na criação da recomendação ✅
- `record-feedback` atualiza status (aplicada/ignorada) e outcome (positivo/negativo) ✅
- **Falta:** captura automática de `metrics_after` em 7/14/30d. Hoje `outcome` vem só do auto-relato do usuário; nunca é comparado com métricas reais.
- **Falta:** transformar casos com outcome positivo em `case_library` (job `extract-case` existe mas não é disparado).
- **Falta:** `ActionPlan.tsx` casa recomendação por `ilike` no título — frágil. Deveria existir FK `action_plans.recommendation_id`.

**RAG:**
- `_shared/embeddings.ts` é hashing lexical 768d disfarçado de embedding. **Funciona como busca por sobreposição de keywords**, não semântica. Está documentado no topo do arquivo, mas o resto do código (`findSimilarCases`, `findKnowledgeSnippets`) não sinaliza isso.
- Falta interface clara para trocar pelo provider real quando disponível (não há feature flag nem `ai_gateway` embed call comentada).

**Segurança:**
- RLS coerente: tudo via `has_store_access(store_id)` ou `auth.uid() = user_id`. ✅
- `training_examples` corretamente bloqueado para usuários (apenas service role). ✅
- `case_library` e `knowledge_base`: leitura pública para autenticados (ok, conhecimento compartilhado).
- ⚠️ `ai-consult` carrega dados via cliente JWT (RLS aplica), mas grava `recommendation_history` também via JWT — funciona porque a RLS permite, mas o `select("id, rule_id")` depende do RLS. OK.
- ⚠️ CORS `*` em todas as funções. Aceitável em dev; em produção restringir ao domínio publicado.
- ⚠️ `ai-diagnose` usa SERVICE_ROLE para tudo após validar `user_id`. Funciona, mas está fora do padrão das outras.
- ⚠️ Não há rate-limit nem proteção contra spam de `ai-consult` (caro).

**Qualidade da IA:**
- Validação anti-alucinação por `rule_id`, `recommendation_id`, `case_id`, `kb_id` já existe em `ai-consult` ✅
- Falta teste automatizado garantindo o comportamento.
- Falta validação: se `RULE_EVIDENCES` vazio E IA retornar `main_problems` não-vazio, descartar tudo (atualmente o filtro descarta um a um, mas o prompt só "pede").

---

## 2. Problemas críticos

1. **Dois diagnósticos concorrentes com regras diferentes.** `ai-diagnose` permite a IA inventar problemas sem `rule_id` e ainda apaga histórico. Risco de enganar o usuário.
2. **`outcome` nunca é medido objetivamente.** O ciclo "aprendizado" depende 100% do auto-relato. Sem `metrics_after`, a IA não tem como diferenciar "achei que funcionou" de "funcionou de fato".
3. **Espelho de regras divergente entre front e edge.** A IA recebe um subconjunto menor de evidências do que o usuário vê na UI.
4. **Vínculo recomendação ↔ ação por `ilike`.** `ActionPlan.tsx` pode bater no item errado quando dois títulos se parecem.

## 3. Problemas importantes

5. Falta regras de 2ª camada (tendência, cruzamentos faturamento/lucro, pico, cardápio inchado).
6. RAG lexical não sinalizado no código que o usa (só no helper).
7. Sem `action_plans.recommendation_id` (FK).
8. Sem job que dispara `extract-case` quando recomendação ganha outcome positivo.
9. `ai-consult` não tem teste validando descarte de `rule_id` inexistente.

## 4. Melhorias opcionais

- Rate-limit por usuário em `ai-consult` (e.g. 1 chamada / 5 min).
- CORS restrito ao domínio de produção (config por env).
- Painel admin para curar `knowledge_base`.
- Cron diário para varrer `recommendation_history` aplicadas há ≥7/14/30d e calcular `metrics_after`.

---

## 5. Plano de implementação

### Etapa A — Unificar fluxo (decisão: `ai-consult` é o único)

1. **Refatorar `Diagnostics.tsx`**: remover botão "Gerar com IA" que chama `ai-diagnose`; substituir por link/CTA que abre o Relatório (`/app/stores/:id/report`) e roda `ai-consult` lá. A página continua exibindo `diagnostics` (motor de regras), mas a geração consultiva passa a ser exclusiva via `ai-consult`.
2. **Marcar `ai-diagnose` como legado**:
   - Adicionar header de comentário "DEPRECATED — usar ai-consult" no `index.ts`.
   - Manter a função deployada por compatibilidade, mas remover o callsite em `invokeAI("ai-diagnose", ...)`.
   - Remover do `supabase/config.toml` o bloco `[functions.ai-diagnose]` (mantém default).
3. (Opcional) Em uma versão futura, deletar a função.

### Etapa B — Fortalecer motor de regras (camada 2)

Adicionar novas regras em `src/lib/diagnosis/rules.ts` E em `supabase/functions/_shared/evidences.ts` (mantendo paridade):

- `tendencia_faturamento_7_30d` — compara `metrics_7d.revenue` vs `metrics_30d.revenue/4`. Marca `severity` se queda > 15%.
- `faturamento_sobe_lucro_cai` — `revenue` ↑ mas `estimated_profit` ↓ (cruzamento metrics + products).
- `top_produto_margem_baixa` — top 3 vendidos com margem < 20% (já parcialmente coberto por `lowMarginAlert`, formalizar com `rule_id` próprio).
- `top_produto_reclamacoes` — top vendido com `complaints_count` > limiar.
- `campanha_corroe_margem` — campanha ativa com `margin_impact` > 0 mas `revenue_generated/cost` < 1.5.
- `cancelamento_falta_produto` — reviews com palavras-chave "sem estoque", "faltou".
- `cardapio_inchado` — > 40 produtos cadastrados E > 30% com vendas < 20% da média.
- `nao_mexer_no_que_funciona` — sinal POSITIVO: produto top com margem alta + sem reclamações → IA recomenda **não alterar**.
- `dado_critico_faltando` — meta-regra: lista IDs de regras que ficaram inconclusivas por falta de dado.

Cada regra emite `RuleEvidence` completo (`rule_id`, `area`, `metric`, `current_value`, `reference_value`, `severity`, `business_impact`, `probable_cause`, `recommended_action`, `confidence`, `evidence_data`, `missing_data`).

**Sincronização front/edge**: extrair as funções comuns para `src/lib/diagnosis/evidences.ts` (já existe parcialmente) e copiar para `_shared/evidences.ts` na hora do deploy. Garantir que ambos exportem o mesmo conjunto de `rule_id`s.

### Etapa C — Fechar ciclo de aprendizado real

1. **FK explícita ação ↔ recomendação**: migration adicionando `action_plans.recommendation_id uuid` (nullable). Em `ai-consult`, ao gravar `main_problems`, criar também as `action_plans` correspondentes já com FK preenchida (em vez de só dependerem de `ai-diagnose`).
2. **Refatorar `ActionPlan.submitOutcome`**: usar `recommendation_id` direto da FK, abandonar busca por `ilike`.
3. **Edge function nova `measure-outcomes`** (chamada manual + futuramente cron):
   - Lista `recommendation_history` com `applied = true` e `outcome IS NULL`.
   - Para cada uma, calcula `metrics_after` agregando `metrics` da loja entre `applied_at` e `applied_at + 7/14/30d` (escolhe a janela mais longa disponível).
   - Compara com `metrics_before`: se métrica-alvo melhorou > X% → `positivo`; piorou > X% → `negativo`; entre → `inconclusivo`.
   - Atualiza `outcome` e `metrics_after`. Dispara `update-store-memory` e (se positivo) `extract-case`.
   - Mapeamento métrica-alvo por `rule_id` (ex: `tempo_entrega_alto` → `promised_delivery_time`; `cancelamento_alto` → `cancellation_rate`; `ticket_baixo` → `average_ticket`).
4. **`update-store-memory`**: estender `recurring_problems` com `outcomes_summary` (% positivo / negativo / ignorado). A IA já usa essa info.

### Etapa D — RAG v1 → preparar v2

1. Renomear `embedText` para `embedTextLexical` em `_shared/embeddings.ts` e adicionar comentário no topo dos consumidores (`memory.ts`) que explicita "RAG v1 lexical".
2. Adicionar wrapper `embedText(text)` que tenta um embedding real via Lovable AI Gateway se a env `EMBED_MODEL` estiver definida; cai para lexical como fallback. Documentar o switch.
3. Adicionar campo `embedding_version smallint default 1` em `knowledge_base` e `case_library` (migration) para permitir reembedar quando trocarmos de modelo.

### Etapa E — Segurança e robustez

1. **Validação `storeId` em todas as edges** que recebem store_id: confirmar via `has_store_access` (ou via JWT user_id + select). `ai-consult` já o faz implicitamente via RLS no select; `update-store-memory` e `record-feedback` precisam validar explicitamente que o usuário é dono da loja antes de usar service role.
2. **CORS**: introduzir helper `getAllowedOrigin(req)` em `_shared/cors.ts` que devolve `*` em dev mas restringe ao domínio publicado em prod (via env `ALLOWED_ORIGIN`).
3. **Rate limit leve em `ai-consult`**: tabela `ai_consult_calls(user_id, store_id, created_at)` + check "última chamada há < 60s" → 429. (Ou `recommendation_history.created_at` da loja.)
4. **Hard fail em `ai-consult`** se `ruleEvidences.length === 0` E IA retornar `main_problems`: descartar tudo e devolver apenas `executive_summary` + `missing_data_for_better_diagnosis`.

### Etapa F — Testes de qualidade da IA

Adicionar `supabase/functions/ai-consult/validation_test.ts` (Deno test) cobrindo a lógica pura `isValidSource`/filtros (extrair para função exportada em arquivo separado, ex: `_shared/validate-diagnosis.ts`):
- rule_id inexistente → descartado.
- source_ref inválido por tipo → descartado.
- evidence + source_ref ≠ rule_id → normalizado.
- avoided_repetitions com id inexistente → descartado.

Testes de regra (TS): garantir que cada novo `rule_id` da Etapa B aparece em ambos os arquivos (front + edge) — teste simples que importa as duas listas e compara conjuntos.

---

## 6. Arquivos afetados

**Criados**
- `supabase/functions/measure-outcomes/index.ts`
- `supabase/functions/_shared/validate-diagnosis.ts`
- `supabase/functions/ai-consult/validation_test.ts`
- `supabase/migrations/<ts>_action_plans_rec_fk_and_embedding_version.sql`

**Editados**
- `src/lib/diagnosis/rules.ts` — +9 regras camada 2
- `supabase/functions/_shared/evidences.ts` — paridade com rules.ts
- `supabase/functions/_shared/embeddings.ts` — wrapper + flag
- `supabase/functions/_shared/memory.ts` — anota RAG v1
- `supabase/functions/_shared/cors.ts` — origin helper
- `supabase/functions/ai-consult/index.ts` — usa validate-diagnosis, hard-fail vazio, cria `action_plans` com FK, rate-limit leve, valida storeId
- `supabase/functions/update-store-memory/index.ts` — outcomes_summary + valida storeId
- `supabase/functions/record-feedback/index.ts` — confirma RLS basta
- `src/pages/app/Diagnostics.tsx` — remove "Gerar com IA"; CTA para Relatório
- `src/pages/app/ActionPlan.tsx` — usa `recommendation_id` da FK
- `src/lib/ai/invokeAI.ts` — sem mudança
- `supabase/config.toml` — limpeza opcional
- `supabase/functions/ai-diagnose/index.ts` — comentário DEPRECATED no topo

**Não alterados**: knowledge_base seed, AIConsultReport, SourceChip, RecommendationFeedback, StoreEvolutionPanel, knowledge_base/case_library schemas (só ganham `embedding_version`).

---

## 7. O que NÃO vou fazer

- Reescrever `ai-consult` do zero.
- Mudar a stack ou substituir o motor de regras por LLM.
- Implementar embedding real agora (apenas preparar wrapper).
- Cron automático (`measure-outcomes` será chamado manualmente / sob demanda v1).
- Painel admin de `knowledge_base`.
- Deletar `ai-diagnose` (apenas marcar legado).

Aprovando, executo as Etapas A–F numa única passada de implementação.

---

## 8. Execução — Etapas C/D/E (continuação)

✅ Migration `recommendation_id` em `action_plans` e `embedding_version` em kb/casos.
✅ `_shared/validate-diagnosis.ts` + teste `validation_test.ts` (Etapa F mínima).
✅ `_shared/embeddings.ts` v1 lexical formalizado, wrapper `embedText` pronto para v2.
✅ `update-store-memory` valida acesso à loja antes de SERVICE_ROLE.
✅ `ai-diagnose` marcado DEPRECATED + `Diagnostics.tsx` redireciona ao Relatório.
✅ `ai-consult` agora cria `action_plans` com FK `recommendation_id`.
✅ `ActionPlan.submitOutcome` usa FK direta (fallback ilike só p/ legado).
✅ Nova edge `measure-outcomes`: calcula `metrics_after` e `outcome` objetivo
   por janela 7-30d; positivo dispara `extract-case`. Botão na página
   "Evolução da loja".

Pendente (futuro): cron diário para `measure-outcomes`, CORS por env,
rate-limit em `ai-consult`, painel admin de KB.

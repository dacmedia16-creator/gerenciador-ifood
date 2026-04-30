
## Objetivo

Adicionar uma camada de **aprendizado contínuo** ao Gestor IA, sem fine-tuning, usando 5 pilares no banco + uma evolução do `ai-consult` para consumi-los e citá-los explicitamente.

Mantém arquitetura híbrida atual: **motor de regras = fatos** / **IA = consultoria ancorada**. Agora a IA também recebe **memória, casos, conhecimento e feedback** — e cita a origem de cada recomendação.

---

## 1. Mudanças de banco (uma única migração)

### a) `pgvector` (extensão)
Habilitar `vector` para embeddings semânticos (RAG). Já temos `pgcrypto` e `uuid-ossp`.

### b) Tabela `store_memory` — memória operacional por loja
Snapshot evolutivo (1 linha por loja, atualizada no fim de cada análise IA):

```text
store_memory(
  store_id uuid PK,
  profile jsonb,            -- categoria, ticket, perfil de cliente
  current_goal text,        -- "aumentar conversão", "reduzir cancelamento" etc
  recurring_problems jsonb, -- [{rule_id, count, first_seen, last_seen}]
  metrics_7d  jsonb,        -- snapshot agregado
  metrics_14d jsonb,
  metrics_30d jsonb,
  last_diagnosis_at timestamptz,
  updated_at timestamptz
)
```

RLS via `has_store_access(store_id)`.

### c) Tabela `recommendation_history` — recomendações já dadas
Toda recomendação que a IA emite vira 1 linha (separado de `action_plans`, que continua sendo o "to-do" do usuário):

```text
recommendation_history(
  id uuid PK,
  store_id uuid,
  report_id uuid,           -- de qual relatório veio
  rule_id text,             -- evidência ancorada
  recommendation text,
  expected_impact text,
  source text,              -- 'ai-consult' | 'rules-engine' | 'knowledge-base' | 'similar-case'
  status text,              -- 'pendente' | 'aplicada' | 'ignorada' | 'em_andamento'
  applied_at timestamptz,
  metrics_before jsonb,     -- snapshot no momento da recomendação
  metrics_after jsonb,      -- snapshot N dias após "aplicada"
  outcome text,             -- 'positivo' | 'neutro' | 'negativo' | 'inconclusivo'
  created_at timestamptz
)
```

RLS via `has_store_access(store_id)`.

### d) Tabela `recommendation_feedback` — feedback do usuário
```text
recommendation_feedback(
  id uuid PK,
  recommendation_id uuid,
  user_id uuid,
  rating text,              -- 'util' | 'nao_util' | 'errada' | 'falta_contexto' | 'dificil_executar'
  applied boolean,
  generated_result text,    -- 'sim' | 'nao' | 'nao_sei'
  comment text,
  created_at timestamptz
)
```

RLS: usuário só vê/escreve seu próprio feedback (`user_id = auth.uid()`).

### e) Tabela `knowledge_base` — base de conhecimento de delivery
```text
knowledge_base(
  id uuid PK,
  area text,                -- vendas | ticket | cancelamentos | conversao | combos | etc
  topic text,
  title text,
  content text,             -- markdown (princípios, heurísticas, playbooks)
  tags text[],
  source text,              -- 'manual' | 'extracted_from_case'
  embedding vector(1536),   -- gerado por edge function
  created_at timestamptz,
  updated_at timestamptz
)
```

RLS: leitura pública para qualquer usuário autenticado (conhecimento é compartilhado), escrita só por service role.

Index HNSW em `embedding` para busca semântica.

### f) Tabela `case_library` — biblioteca de casos reais (anonimizada)
```text
case_library(
  id uuid PK,
  store_profile jsonb,      -- categoria, faixa de ticket, cidade (sem identificar)
  problem_rule_id text,
  metrics_before jsonb,
  diagnosis text,
  recommendation text,
  user_action text,
  metrics_after jsonb,
  outcome text,             -- 'sucesso' | 'fracasso' | 'neutro'
  user_feedback text,
  lesson_learned text,
  embedding vector(1536),
  created_at timestamptz
)
```

RLS: leitura para autenticados, escrita só via service role (alimentada por job que olha `recommendation_history` com `outcome` definido).

### g) Tabela `training_examples` — preparação para fine-tuning futuro
```text
training_examples(
  id uuid PK,
  input_payload jsonb,      -- RULE_EVIDENCES + memória + contexto enviado à IA
  ai_response jsonb,        -- resposta gerada
  ideal_response jsonb,     -- corrigida/curada (opcional)
  human_feedback jsonb,     -- ratings, comentários
  outcome jsonb,            -- métricas antes/depois
  quality_score int,        -- 1-5 (calculado por feedback)
  exported boolean default false,
  created_at timestamptz
)
```

RLS: só service role. Apenas exemplos com `quality_score >= 4` viram dataset.

---

## 2. Edge functions novas

### a) `embed-knowledge` (nova)
Gera embedding via Lovable AI (modelo de embedding) para uma linha de `knowledge_base` ou `case_library`. Chamada após insert/update.

### b) `record-feedback` (nova)
POST `{recommendation_id, rating, applied, generated_result, comment}`. Insere em `recommendation_feedback` e atualiza `recommendation_history.status` + `outcome` quando aplicável.

### c) `update-store-memory` (nova)
Job idempotente que recalcula `store_memory` para uma loja: agrega métricas 7/14/30d, detecta recorrência (mesmo `rule_id` aparecendo em 2+ relatórios em 30d), atualiza perfil. Chamada no fim de cada `ai-consult` e no fim de cada `generate-diagnosis`.

### d) `extract-case` (nova, opcional v1)
Quando uma `recommendation_history` ganha `outcome` definido + feedback, copia a linha (anonimizada) para `case_library` e dispara `embed-knowledge`.

### e) `ai-consult` (evolução — não recriar do zero)
Adicionar 4 novas seções no payload enviado ao modelo:

```text
STORE_MEMORY      -> store_memory + últimas 5 recomendações com outcome
PAST_RECOMMENDATIONS -> recommendation_history (90d) com status/outcome
SIMILAR_CASES     -> top 3 case_library por similaridade vetorial
                     ao vetor do diagnóstico atual
KNOWLEDGE_SNIPPETS -> top 5 knowledge_base por similaridade às áreas
                      das evidências atuais
```

Geração da query vetorial: concatenar `area + recommended_action` das evidências críticas + atenção e gerar embedding via Lovable AI (`google/text-embedding-004` ou equivalente). Buscar com `<->` no pgvector.

**Mudanças no SYSTEM_PROMPT** (acrescentar regras):
- Toda recomendação em `main_problems` deve declarar `source`: `evidence` | `store_history` | `similar_case` | `knowledge_base`.
- Quando `source = similar_case`, citar o `case_id`.
- Quando `source = knowledge_base`, citar o `kb_id`.
- Quando `source = store_history`, citar o `recommendation_id` anterior e dizer se ela foi aplicada/funcionou.
- **Não repetir** recomendação que aparece em `PAST_RECOMMENDATIONS` com `status = ignorada` ou `outcome = negativo`, salvo se houver fato novo nas evidências (deve explicar qual).
- Quando uma recomendação anterior está marcada `aplicada` + `outcome = positivo`, parabenizar e propor próximo passo, não repetir.

**Tool schema**: estender cada item de `main_problems` com `source` (enum) e `source_ref` (string opcional: case_id, kb_id ou recommendation_id).

**Persistência pós-resposta**:
- Cada item de `main_problems` é gravado em `recommendation_history` com `status='pendente'`, `metrics_before` = snapshot atual.
- O snapshot ali e a resposta crua viram 1 linha em `training_examples` (sem `ideal_response` ainda).
- Dispara `update-store-memory` em background.

---

## 3. Mudanças no frontend

### a) `src/components/report/AIConsultReport.tsx`
- Cada problema agora mostra um chip de **fonte**: "Evidência atual", "Histórico desta loja", "Caso parecido", "Base de conhecimento" — com link expansível mostrando a referência.
- Botões de feedback embaixo de cada recomendação: `Útil`, `Não útil`, `Apliquei`, `Ignorei`, `Funcionou`, `Não funcionou`. Chamam `record-feedback`.
- Nova seção **"Evolução desta loja"**: lê `store_memory` e mostra:
  - problemas recorrentes com badge "X vezes nos últimos 30d"
  - últimas recomendações com status (aplicada/ignorada) + outcome
  - delta de métricas 7d / 14d / 30d
- Banner contextual: "A IA evitou repetir 2 recomendações que você já ignorou" (a partir de `validation` retornado pelo edge).

### b) `src/pages/app/ActionPlan.tsx`
Quando o usuário marca uma ação como concluída, oferecer modal: "Como foi o resultado?" → grava feedback + atualiza `recommendation_history.outcome`.

### c) Nova rota `src/pages/app/Knowledge.tsx` (admin/leitura)
Lista a `knowledge_base` por área. V1: read-only com seed inicial (vamos popular com ~20 entradas curadas para arrancar).

### d) Nova rota/aba `src/pages/app/StoreEvolution.tsx`
Visualização cronológica do que a IA recomendou, o que foi aplicado, e o resultado. Útil para o usuário e como prova de aprendizado.

---

## 4. Seed inicial da base de conhecimento

Inserir ~20 entradas curadas em `knowledge_base` cobrindo as áreas pedidas (combos, fotos, ticket, cancelamentos, sazonalidade, recompra, anúncios, concorrência etc). Cada uma com `embedding` gerado.

Sem isso, o RAG inicia vazio e a IA não tem o que recuperar nas primeiras análises.

---

## 5. Garantias contra alucinação (mantidas e estendidas)

1. `tool_choice` força função (já existe).
2. Validação pós-resposta descarta `main_problems` com `rule_id` inválido (já existe).
3. **Nova:** se `source = similar_case` mas `source_ref` não existe em `case_library`, descarta.
4. **Nova:** se `source = knowledge_base` mas `source_ref` não existe em `knowledge_base`, descarta.
5. **Nova:** se `source = store_history` mas `source_ref` não existe em `recommendation_history` da loja, descarta.

---

## 6. Fluxo final

```text
Usuário clica "Consultar Gestor IA"
   │
   ▼
ai-consult edge
   ├── carrega RULE_EVIDENCES (motor de regras, já existe)
   ├── carrega STORE_MEMORY (snapshot 7/14/30d + recorrências)
   ├── carrega PAST_RECOMMENDATIONS (90d com outcome)
   ├── gera embedding do "vetor de problemas atuais"
   ├── busca SIMILAR_CASES (pgvector top 3)
   ├── busca KNOWLEDGE_SNIPPETS (pgvector top 5)
   ├── chama Lovable AI com payload estruturado em 5 seções
   ├── valida sources (rule_id, case_id, kb_id, rec_id)
   ├── grava cada main_problem em recommendation_history
   ├── grava 1 linha em training_examples
   ├── dispara update-store-memory
   └── salva report no histórico
   │
   ▼
Frontend renderiza com chips de fonte + botões de feedback
   │
   ▼ (usuário interage)
record-feedback → atualiza recommendation_history + recommendation_feedback
   │
   ▼ (após N dias com outcome)
extract-case (job) → copia caso anonimizado para case_library + embed
   │
   ▼ (futuramente)
exportar training_examples com quality_score>=4 → dataset de fine-tuning
```

---

## 7. Arquivos a criar / alterar

**Migração SQL** (1 única):
- extensão `vector`
- 6 tabelas novas + RLS + índices vector HNSW
- seed inicial de `knowledge_base` (20 linhas com placeholder de embedding; serão preenchidos pelo edge na primeira chamada)

**Edges criadas:**
- `supabase/functions/embed-knowledge/index.ts`
- `supabase/functions/record-feedback/index.ts`
- `supabase/functions/update-store-memory/index.ts`
- `supabase/functions/extract-case/index.ts`

**Edges alteradas:**
- `supabase/functions/ai-consult/index.ts` (estende payload + tool schema + validação + persistência)
- `supabase/functions/_shared/evidences.ts` (sem mudança; reaproveitada)

**Shared:**
- `supabase/functions/_shared/embeddings.ts` (helper para chamar Lovable AI embeddings)
- `supabase/functions/_shared/memory.ts` (helpers: load store memory, past recs, similar cases, kb snippets)

**Frontend criado:**
- `src/pages/app/Knowledge.tsx`
- `src/pages/app/StoreEvolution.tsx`
- `src/components/report/RecommendationFeedback.tsx`
- `src/components/report/SourceChip.tsx`
- `src/components/report/StoreEvolutionPanel.tsx`

**Frontend alterado:**
- `src/components/report/AIConsultReport.tsx` (chip de source + feedback + painel evolução)
- `src/pages/app/ActionPlan.tsx` (modal de outcome ao concluir)
- `src/AppSidebar.tsx` ou roteador (entrada "Conhecimento" + "Evolução")

---

## 8. O que NÃO vou fazer agora

- Fine-tuning real (apenas preparar `training_examples`).
- Painel admin para editar `knowledge_base` (v1 read-only com seed).
- Job cron automático: `extract-case` rodará sob demanda quando feedback chega; agendamento fica para depois.
- Mudar o motor de regras (continua intacto e é a fonte de fatos).

---

## 9. Modelo de embeddings

Vou usar Lovable AI Gateway com modelo de embeddings (verifico no momento da implementação se há `text-embedding-004` ou similar disponível). Se não houver, faço fallback usando `google/gemini-2.5-flash-lite` para gerar uma assinatura textual e busco por keywords full-text — sem perder a arquitetura, apenas o ranking semântico fica menos preciso na v1.

---

Aprovando, executo numa única passada: migração + edges + frontend + seed.

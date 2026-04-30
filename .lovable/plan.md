
# Plano de evolução — Gestor IA de Delivery

5 frentes integradas, cada uma com backend (edge function/migration) e frontend conectados ao Supabase já existente.

---

## 1. IA real nos diagnósticos (Lovable AI)

**Objetivo**: enriquecer o motor de regras determinístico com um camada de IA que gera diagnóstico consultivo, resumo executivo e recomendações personalizadas.

**Backend**
- Nova edge function `supabase/functions/ai-diagnose/index.ts`
  - Recebe `store_id`
  - Carrega via service role: store + últimos 6 meses de `metrics` + `products` + `reviews` + `competitors`
  - Roda primeiro o motor de regras local (reaproveita `src/lib/diagnostics/engine.ts` portado para Deno em `_shared/engine.ts`) para obter sinais objetivos
  - Chama Lovable AI (`google/gemini-3-flash-preview`) com **tool calling estruturado** para retornar JSON com: `executive_summary`, `key_problems[]`, `opportunities[]`, `recommendations[]`, `general_score`
  - Persiste tudo em `diagnostics` (problemas) + `action_plans` (recomendações com prioridade/prazo) + `reports` (snapshot completo)
  - Trata 429 (rate limit) e 402 (créditos) devolvendo erro claro

**Frontend**
- Botão "Gerar diagnóstico com IA" na página `Diagnostics.tsx` e no topo do `StoreOverview.tsx`
- Loading state com skeleton; toast de erro/sucesso
- Após retorno, navega para `/app/stores/:id/diagnostics` mostrando os novos itens

---

## 2. Importação de planilhas CSV/XLSX

**Objetivo**: popular `metrics`, `products` e `reviews` a partir de exports do iFood/planilhas.

**Backend (cliente, sem edge function)**
- Lib `xlsx` (já usada no ecossistema) para parse no browser
- Novo módulo `src/lib/import/parsers.ts` com 3 parsers:
  - `parseMetricsCSV` → mapeia colunas (data, faturamento, pedidos, ticket, cancelamento, tempo, avaliação)
  - `parseProductsCSV` → produtos vendidos, qtd, preço, custo
  - `parseReviewsCSV` → data, nota, comentário
- Validação com Zod, preview antes de inserir, insert em lote no Supabase

**Frontend**
- Refatorar `src/pages/app/Uploads.tsx`:
  - 3 cards (Métricas / Produtos / Avaliações) com dropzone
  - Tabela de preview com erros por linha em vermelho
  - Botão "Confirmar importação" → `supabase.from(...).insert([...])`
  - Template CSV para download de cada tipo

---

## 3. Geração avançada de PDF do relatório

**Objetivo**: PDF profissional do relatório consultivo, salvo no bucket `reports`.

**Backend**
- Edge function `supabase/functions/generate-report-pdf/index.ts`
  - Recebe `report_id` (ou `store_id` para gerar novo)
  - Usa **`pdf-lib`** (Deno-compatível via npm) para montar:
    - Capa com nome da loja, data, score, logo
    - Sumário executivo
    - Seção de problemas críticos (cor por severidade)
    - Plano de ação em tabela
    - KPIs com mini-gráficos via SVG embutido
  - Faz upload para `reports/{store_id}/{report_id}.pdf` (bucket privado)
  - Retorna signed URL (1h) para download

**Frontend**
- Botão "Baixar PDF" na página `Report.tsx`
- Histórico de relatórios em `Reports` mostrando data + link de download (signed URL gerada on-demand)

---

## 4. Análise de sentimento real das avaliações

**Objetivo**: classificar sentimento e extrair tópicos (atraso, embalagem, comida fria, pedido errado, atendimento) das reviews via IA.

**Backend**
- Edge function `supabase/functions/analyze-reviews/index.ts`
  - Recebe `store_id` (processa reviews com `sentiment IS NULL`)
  - Para cada lote de até 20 reviews, chama Lovable AI com tool calling:
    - Output: `[{ id, sentiment: 'positivo'|'neutro'|'negativo', topics: string[] }]`
  - Atualiza `reviews.sentiment` e `reviews.detected_topics`
  - Quando >30% das reviews mencionam um tópico crítico, cria automaticamente um `diagnostic` da área "experiência"

**Frontend**
- Em `Reviews.tsx`:
  - Botão "Analisar com IA" (mostra contador de pendentes)
  - Filtros por sentimento e por tópico (chips)
  - Card de "Top reclamações" agregando `detected_topics`
  - Sentimento exibido com badge colorido

---

## 5. Onboarding guiado (wizard de primeira loja)

**Objetivo**: após signup, conduzir o usuário até ver o primeiro diagnóstico em <3 min.

**Frontend**
- Nova rota `/app/onboarding` com 4 passos (componente `Stepper`):
  1. **Bem-vindo** — escolha entre "Usar loja demo" (chama `seedDemoStore`) ou "Cadastrar minha loja"
  2. **Dados da loja** — form mínimo: nome, plataforma, categoria, cidade
  3. **Métricas do último mês** — 6 campos essenciais (faturamento, pedidos, ticket, cancelamento, tempo, nota)
  4. **Pronto!** — roda diagnóstico (regras + opcionalmente IA) e redireciona para `StoreOverview`
- `useAuth` checa após login: se `stores.count === 0`, redireciona para `/app/onboarding`
- Possibilidade de pular ("Configurar depois")
- Barra de progresso e botão "Voltar" entre passos

---

## Estrutura técnica

```text
supabase/functions/
├── ai-diagnose/
│   └── index.ts            (regras + Lovable AI + persiste)
├── analyze-reviews/
│   └── index.ts            (sentimento + tópicos)
├── generate-report-pdf/
│   └── index.ts            (pdf-lib + upload bucket)
└── _shared/
    ├── cors.ts
    └── diagnostic-rules.ts (regras portadas)

src/
├── lib/
│   ├── import/
│   │   ├── parsers.ts      (CSV/XLSX → tipados com Zod)
│   │   └── templates.ts    (templates de download)
│   └── ai/
│       └── invokeAI.ts     (helper supabase.functions.invoke + erros)
├── components/
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx
│   │   └── steps/{Welcome,StoreInfo,Metrics,Done}.tsx
│   └── reviews/
│       ├── SentimentBadge.tsx
│       └── TopComplaints.tsx
└── pages/app/
    ├── Onboarding.tsx       (novo)
    ├── Uploads.tsx          (refatorado: importação real)
    ├── Reviews.tsx          (botão analisar + filtros)
    ├── Diagnostics.tsx      (botão IA)
    └── Report.tsx           (botão baixar PDF + histórico)
```

## Tratamento de erros (toda IA/edge function)
- 429 → toast "Muitas requisições, tente novamente em alguns minutos"
- 402 → toast "Créditos de IA esgotados. Adicione créditos em Configurações."
- Erro genérico → toast com mensagem, botão "Tentar novamente"

## Não inclui
- Conexão direta com API do iFood (importação fica via planilha)
- Pagamentos / planos
- Multi-usuário por loja (continua 1 owner por store)

---

Após aprovação, implemento na ordem: **(1) onboarding** → **(2) importação CSV** → **(3) IA diagnóstico** → **(4) sentimento reviews** → **(5) PDF**, fazendo commits navegáveis a cada etapa.

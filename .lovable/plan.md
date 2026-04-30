
# Refinamento "Gestor IA de Delivery" — rodada de profissionalização

Objetivo: deixar o MVP pronto para apresentar em reunião comercial, com identidade consistente, segurança auditada, jornada coerente e camada de diagnóstico/score/relatório mais sólida. Nada de funcionalidade existente é removido.

## Estado atual (auditado)

- `package.json` ainda usa `name: "vite_react_shadcn_ts"`; README é o template padrão.
- Auth, RLS por loja (`has_store_access`) e proteção de rota em `AppLayout` já existem e funcionam.
- Linter Supabase aponta 2 warnings: (1) bucket `report-logos` público permite listagem; (2) função `SECURITY DEFINER` executável por authenticated.
- Engine de diagnóstico já cobre 9 regras pedidas; falta diagnóstico de "taxa de entrega vs. concorrentes" e refinos de cobertura.
- Score já tem 12 áreas e 0–100, mas falta a área "Indicadores financeiros" usar dados reais e faltam textos consultivos por área.
- Relatório consultivo já existe e responde as 5 perguntas-chave; falta seção "principais oportunidades" e "recomendações estratégicas" explícitas.
- Estados vazios estão razoáveis em algumas páginas (Stores, Diagnostics) mas inconsistentes em Products / Reviews / Campaigns / Competitors / ActionPlan / Report (vamos padronizar).
- Uploads já aceita CSV com parser/preview real; falta deixar explícito que XLSX/PDF estão "em breve" e oferecer modo demonstração.

## Escopo da rodada

### 1. Identidade do produto
- `package.json`: renomear `name` para `gestor-ia-delivery`.
- `index.html`: ajustar `<title>`, `meta description`, `og:title`, `og:description`, `author`, `twitter:site` para "Gestor IA de Delivery".
- Sidebar: header passa de "Gestor IA" para "Gestor IA de Delivery" (com versão curta no estado collapsed).
- Varrer textos genéricos remanescentes ("Lovable Generated Project", "TODO", placeholders).

### 2. README profissional
Substituir `README.md` por documento contendo:
- Nome, descrição e objetivo do SaaS.
- Funcionalidades principais (dashboard, diagnóstico por regras + IA, score 0–100 por área, plano de ação, relatório consultivo, importação CSV, template de PDF por loja).
- Stack (React 18, Vite 5, TS, Tailwind, shadcn/ui, React Router, TanStack Query, Recharts, Lovable Cloud/Supabase, Edge Functions, Lovable AI Gateway).
- Como rodar localmente (`npm i`, `npm run dev`, vars `.env` autogeradas).
- Estrutura de pastas (`src/pages/app`, `src/lib/diagnostics`, `src/lib/seed`, `supabase/functions`).
- Modelo de dados (lista das tabelas Supabase).
- Observação clara sobre dados mockados (`seedDemoStore`).
- Próximos passos planejados (parsing XLSX/PDF real, integrações iFood/Rappi, IA preditiva).

### 3. Jornada principal
- Stores vazio → CTA dupla "Criar minha primeira loja" + "Carregar loja demo" (já existe parcialmente no Onboarding; vamos garantir o mesmo CTA na lista).
- Após cadastro manual em `NewStore`, oferecer toast com link "Ir para diagnóstico" e seed automático opcional de métricas vazias.
- StoreOverview: garantir botões claros de "Rodar diagnóstico" e "Ver relatório".
- Adicionar breadcrumb leve / botão "Voltar para Lojas" no header da loja.

### 4. Proteção de rotas e dados
- `AppLayout` já redireciona não-logado; manter.
- Adicionar verificação extra: ao entrar em `/app/stores/:id/*`, se `stores.select().eq("id", id).maybeSingle()` retornar `null`, redirecionar para `/app/stores` com toast "Loja não encontrada ou sem acesso" (RLS já bloqueia, mas a UX precisa explicar).
- Centralizar isso no `useStoreData`.

### 5. Auditoria Supabase
Migrações:
- `report-logos`: tornar bucket privado e servir logos via URL assinada, OU manter público mas restringir `SELECT` em `storage.objects` apenas para arquivos próprios + leitura pública só para o path do template (resolve warn 1).
- Revogar `EXECUTE ... TO authenticated, anon, public` nas funções `SECURITY DEFINER` (`has_store_access`, `handle_new_user`, `touch_updated_at`) — manter execução apenas via policies/triggers (resolve warn 2).
- Conferir/reaplicar policies `*_all_own` em todas as 11 tabelas listadas (todas já existem segundo o schema; não recriar, apenas auditar via linter pós-migração).
- Confirmar trigger `on_auth_user_created` para `handle_new_user` (criar se ausente).

### 6. Dados mockados mais realistas
Reescrever `src/lib/seed/demoStore.ts` para gerar:
- Loja "Burger House (Demo)" com KPIs já realistas (mantém base atual, ajusta valores).
- 14–16 produtos cobrindo:
  - "vende muito + margem baixa" (Batata Rústica, Refrigerante).
  - "lucrativo + pouco destaque" (Brownie sem foto, Burger Premium).
  - "vendedor com reclamações" (Burger Bacon).
- 18–20 avaliações com mistura forte de positivas/negativas, padrões repetidos de "atrasou", "frio", "embalagem", "pedido errado" (alimenta engine).
- 4 concorrentes com prazos/notas/taxas variando claramente.
- 3 campanhas: 1 ROI alto (cupom), 1 ROI baixo (ads), 1 neutra (frete grátis).
- 6 meses de métricas com leve tendência.
- Roda `runDiagnostics` e cria `action_plans` linkados (já existe; manter).

### 7. Engine de diagnóstico
Adicionar/ajustar em `src/lib/diagnostics/engine.ts`:
- Nova regra: `delivery_fee` da loja > média dos concorrentes → diagnóstico "Competitividade de taxa".
- Nova regra: nenhum produto com foto → severity crítico em "Cardápio / Fotos".
- Nova regra: ticket médio baixo + ausência de produto categoria "Combos" → reforça diagnóstico de combos.
- Garantir que toda saída tem os 9 campos pedidos (já tem 8; adicionar `severity` derivado de `priority` quando ausente — já presente).
- Mesmas regras aplicadas no Edge Function `_shared/diagnostic-rules.ts` para manter paridade.

### 8. Score
- Acrescentar texto consultivo curto por área no objeto retornado por `calculateScore` (campo `notes: Record<area, string>`).
- Página `Score`: exibir explicação consultiva geral baseada em faixas (já existe parcialmente) + nota por área usando o novo `notes`.
- Cores já mapeiam verde/amarelo/vermelho via `scoreColor`.

### 9. Relatório final
Em `src/pages/app/Report.tsx`:
- Adicionar seção "Principais oportunidades" (top 5 ações de impacto alto + esforço baixo/médio).
- Adicionar seção "Recomendações estratégicas" (3 bullets gerados das áreas com menor score).
- Adicionar seção "Próximos passos" (checklist 30/60/90 dias derivado do plano).
- Manter as 5 perguntas-chave já presentes.
- Espelhar as novas seções no Edge Function `generate-report-pdf` (respeitando `report_templates.sections`/`kpi_order`).

### 10. Polimento SaaS premium
- Padronizar header das páginas de loja: título, subtítulo, ações à direita.
- Cards: revisar paddings (`p-4`/`p-5`) e usar `shadow-card` consistentemente.
- Sidebar: agrupar seções da loja em sub-grupos ("Análise", "Operação", "Saída") para reduzir lista longa.
- Mobile: garantir `flex-wrap` nos headers e tabelas com `overflow-x-auto`.
- Componentizar `EmptyState` em `src/components/EmptyState.tsx` (ícone + título + descrição + CTA opcional) e usar em Products/Reviews/Campaigns/Competitors/ActionPlan/Report quando vazios.
- Componentizar `LoadingState` para padronizar o "Carregando…" atual.

### 11. Uploads e exportação
- `Uploads.tsx`: adicionar callout informando que XLSX e PDF estão "em breve" e botão "Carregar dados de demonstração" que chama `seedDemoStore`-like helper para popular só a categoria importada.
- Validação de tamanho (<5MB) e mensagem de erro amigável.
- `Report.tsx`: já tem botão imprimir + baixar PDF via Edge Function; adicionar fallback que abre `window.print()` se a função falhar e toast explicativo.

### 12. Estados vazios e feedback
Aplicar `EmptyState` em:
- Products: "Nenhum produto cadastrado" + CTA "Importar via CSV" / "Carregar demo".
- Reviews: "Sem avaliações" + CTA importar.
- Campaigns / Competitors: idem.
- ActionPlan: "Nenhuma ação pendente. Rode um diagnóstico."
- Report: "Cadastre métricas e produtos para gerar o relatório."
Loading: trocar todos os `<div>Carregando…</div>` por `<LoadingState />` com skeleton mínimo.
Erros: padronizar via `toast.error` com mensagem em português.

### 13. Critério de aceite
Após esta rodada deve ser possível, em ~3 minutos de demo:
1. Criar conta → login.
2. Clicar em "Carregar loja demo".
3. Ver dashboard com score, KPIs, gráficos, alertas críticos.
4. Abrir Diagnóstico (regras + IA), Score por área, Plano de ação.
5. Navegar Produtos / Avaliações / Concorrentes / Campanhas / Métricas com dados realistas.
6. Abrir Relatório consultivo, imprimir e baixar PDF customizado.
7. Visitar Uploads e ver template + suporte futuro a XLSX/PDF.

## Detalhes técnicos relevantes

```text
Migrações Supabase
├─ revoke execute em SECURITY DEFINER (auth/anon/public) e re-grant pontual
├─ ajuste de policy SELECT em storage.objects para bucket report-logos
└─ (opcional) trigger on_auth_user_created se faltar

Código
├─ package.json: name → gestor-ia-delivery
├─ index.html: meta tags
├─ README.md: doc completa
├─ src/components/EmptyState.tsx, LoadingState.tsx (novos)
├─ src/components/AppSidebar.tsx: agrupar + nome completo
├─ src/lib/diagnostics/engine.ts: +2 regras, notes no score
├─ supabase/functions/_shared/diagnostic-rules.ts: paridade
├─ src/lib/seed/demoStore.ts: dataset enriquecido
├─ src/pages/app/Report.tsx: +3 seções
├─ supabase/functions/generate-report-pdf/index.ts: novas seções
├─ src/hooks/useStoreData.ts: redirect quando store nula
├─ src/pages/app/Uploads.tsx: callouts + demo data
└─ várias páginas: EmptyState/LoadingState
```

Estimativa de impacto: ~15 arquivos editados, ~3 criados, 1 migração SQL. Sem breaking changes.

Se aprovado, executo tudo na próxima rodada em modo build.

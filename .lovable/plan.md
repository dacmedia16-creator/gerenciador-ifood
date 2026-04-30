# Gestor IA de Delivery — Plano do MVP

SaaS para donos de restaurantes diagnosticarem a performance da loja em apps de delivery (iFood etc.), com score, diagnósticos automáticos por regras, plano de ação e relatório consultivo. Backend em Lovable Cloud (Supabase) com auth, RLS, storage e dados simulados realistas.

## Escopo do MVP

Tudo funcional com dados mockados, mas persistido no Supabase por usuário. Sem dependência de APIs externas — diagnóstico via regras determinísticas. Estrutura pronta para evoluir (IA real, parsing de planilhas, PDF avançado).

## Estrutura de páginas

```text
/                         Landing pública
/auth                     Login / Cadastro / Recuperação de senha
/reset-password           Definir nova senha
/app                      (layout protegido com sidebar + header)
  /dashboard              Dashboard principal (score, KPIs, alertas)
  /stores                 Lista de lojas
  /stores/new             Cadastro de loja
  /stores/:id             Visão geral da loja + seletor de seções
  /stores/:id/metrics     Inserir métricas manualmente
  /stores/:id/products    Cardápio / produtos / custos / preços
  /stores/:id/reviews     Avaliações + análise de sentimento
  /stores/:id/competitors Concorrentes
  /stores/:id/campaigns   Promoções e anúncios
  /stores/:id/uploads     Upload de planilhas/relatórios
  /stores/:id/diagnostics Diagnóstico automático por área
  /stores/:id/score       Score detalhado por área
  /stores/:id/menu        Análise de cardápio (campeões, fracos, combos)
  /stores/:id/pricing     Margem e precificação
  /stores/:id/action-plan Plano de ação (kanban/lista)
  /stores/:id/report      Relatório consultivo + exportar PDF
```

## Landing page

- Hero com título, subtítulo, CTA "Começar diagnóstico" e "Ver demonstração".
- Seções: problemas resolvidos, como funciona (3 passos), diagnósticos disponíveis (grid de áreas), preview do dashboard, plano de ação automático, benefícios, CTA final.
- Visual moderno e tecnológico, dark/claro com acentos em azul/violeta, tipografia forte, ilustrações via gradientes e ícones lucide.

## Autenticação

- Email + senha com Supabase Auth (sem confirmação de email para acelerar testes).
- Telas de login, cadastro e "esqueci minha senha" + página `/reset-password`.
- Trigger no signup cria registro em `profiles`.
- Todas rotas `/app/*` protegidas; redireciona para `/auth` se não logado.
- RLS em todas as tabelas: usuário só vê dados das próprias lojas (`stores.user_id = auth.uid()`); demais tabelas validam via `store_id ∈ stores do usuário` por função `security definer`.

## Dashboard principal

Cards de KPI: score geral (0–100, colorido), faturamento estimado, pedidos, ticket médio, margem, nota média, tempo de entrega, taxa de cancelamento. Gráficos (recharts): faturamento mensal, evolução do score, distribuição de avaliações por sentimento, top produtos. Painel de alertas críticos e top 5 ações recomendadas. Filtros: loja e período.

## Cadastro e dados da loja

Formulário completo conforme campos especificados, com validação zod. Botão para "popular com dados de exemplo" gera loja fictícia + métricas + produtos + avaliações + concorrentes + campanhas + diagnósticos.

## Upload de relatórios

Interface drag-and-drop usando Supabase Storage (bucket privado `reports`). Aceita CSV, XLSX, PDF. MVP: arquivo é salvo, listado, e ao clicar "Processar" gera métricas mockadas associadas à loja. Estrutura pronta para parsing real depois.

## Motor de diagnóstico (regras)

Função TypeScript `runDiagnostics(store, metrics, products, reviews, competitors, campaigns)` que retorna lista de diagnósticos, cada um com: área, problema, evidência, causa provável, impacto, solução recomendada, prioridade, ação prática, prazo, severidade. Regras iniciais conforme item 20 do brief (nota <4.5, entrega >45min, cancelamento >5%, margem <20%, sem fotos, ticket baixo sem combos, ROI negativo, concorrência mais rápida/barata, palavras-chave em reviews). Resultado é gravado em `diagnostics` e gera entradas iniciais em `action_plans`.

## Score

Score por área (vitrine, cardápio, fotos, preço/margem, promoções, concorrência, avaliações, entrega, cancelamentos, recompra, anúncios, financeiro) calculado por função pura com pesos. Score geral = média ponderada. Cores: verde ≥80, amarelo 60–79, vermelho <60. Cada área mostra explicação textual.

## Análise de cardápio, avaliações, margem, promoções, concorrência

Páginas com tabelas/cards conforme brief, todas alimentadas pelas tabelas no Supabase, com badges, barras de progresso e destaques (mais vendidos, mais lucrativos, baixa margem, baixa saída, com reclamações; sentimento positivo/neutro/negativo com tópicos detectados; comparativo visual com concorrentes).

## Plano de ação

Lista filtrá­vel por status (pendente/em andamento/concluído) e prioridade. Cada ação: título, área, prioridade, impacto, esforço, prazo, responsável, descrição. Ordenação por score impacto×urgência÷esforço. Drag para mudar status ou select inline.

## Relatório final

Página consultiva com: resumo executivo gerado por template a partir do score e top diagnósticos, score geral, gargalos, oportunidades, diagnóstico por área, plano priorizado, recomendações estratégicas, próximos passos. Responde explicitamente às 5 perguntas-chave (entrada, conversão, ticket, recompra, lucro). Botão "Exportar em PDF" usando `window.print()` com folha de estilo print-friendly no MVP (estrutura pronta para troca por geração server-side depois).

## Banco de dados

Tabelas: `profiles`, `stores`, `metrics`, `products`, `reviews`, `competitors`, `campaigns`, `diagnostics`, `action_plans`, `reports`, conforme campos do brief. RLS via função `is_store_owner(store_id)` security definer. Bucket `reports` em Storage com policies de owner.

## Dados simulados

Botão "Criar loja demo" semeia uma hamburgueria fictícia "Burger House" com 12 produtos (margens variadas), 30 avaliações (mix sentimentos com palavras-chave), 4 concorrentes, 3 campanhas, 6 meses de métricas, diagnósticos rodados e plano de ação inicial.

## Design

Layout app shell com `SidebarProvider` shadcn (colapsável icon-only), header com seletor de loja + avatar/menu do usuário. Design tokens semânticos no `index.css` (HSL): primary azul-violeta, success verde, warning âmbar, destructive vermelho, surfaces neutras. Cards com `rounded-xl`, sombras suaves, badges de severidade, barras de progresso coloridas. Responsivo desktop/mobile.

## Detalhes técnicos

- React + Vite + TS + Tailwind + shadcn/ui (já no projeto).
- Lovable Cloud (Supabase) para auth, DB, storage; cliente em `src/integrations/supabase/client.ts`.
- React Query para fetch/cache de todas tabelas.
- Zod + react-hook-form em todos formulários.
- Recharts para gráficos.
- Lógica de diagnóstico e score em `src/lib/diagnostics/` (puro TS, testável).
- Seed em `src/lib/seed/demoStore.ts`.
- RLS via migrations; função `has_store_access(store_id uuid)` security definer para evitar recursão.

## Fora do escopo deste MVP

- Parsing real de CSV/XLSX/PDF (apenas upload + mock).
- Geração de PDF server-side (usa print do browser).
- IA generativa real (regras determinísticas).
- Integração com API do iFood ou outras plataformas.
- Multi-usuário por loja / papéis.

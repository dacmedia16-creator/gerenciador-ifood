# Gestor IA de Delivery

> SaaS de diagnóstico, score e plano de ação com IA para lojas de delivery (iFood, Rappi, 99Food e canais próprios).

O **Gestor IA de Delivery** transforma os dados brutos da sua operação (faturamento, cardápio, avaliações, concorrentes, campanhas) em **diagnósticos consultivos**, **score por área (0–100)** e um **plano de ação priorizado** — pronto para ser executado pelo dono ou gerente da loja.

---

## Objetivo do produto

Donos de loja de delivery costumam tomar decisão por achismo: não sabem por que vendem mas não lucram, por que a nota cai, por que a recompra não acontece. Este SaaS responde, com base em regras de negócio + IA:

1. Por que as pessoas **não entram** na sua loja?
2. Por que **entram e não compram**?
3. Por que **compram pouco**?
4. Por que **não voltam**?
5. Por que **vende mas não lucra**?

E entrega um **relatório consultivo + plano de ação** para corrigir cada gargalo.

---

## Funcionalidades principais

- **Autenticação** (e-mail/senha) com perfil isolado por usuário (RLS).
- **Onboarding guiado** com opção de carregar uma **loja demo** completa.
- **Dashboard executivo** com KPIs financeiros, gráfico de faturamento, sentimento de avaliações e alertas críticos.
- **Diagnóstico automático**:
  - Motor de regras de negócio (12+ regras cobrindo reputação, entrega, margem, fotos, ticket, ROI, concorrência, experiência).
  - Diagnóstico por **IA** via Lovable AI Gateway.
- **Score 0–100** distribuído por 12 áreas (vitrine, cardápio, fotos, preço, promoções, concorrência, avaliações, entrega, cancelamentos, recompra, anúncios, financeiro).
- **Plano de ação** priorizado por impacto/esforço e com estados (pendente, em andamento, concluído).
- **Relatório consultivo** pronto para entregar ao dono da loja, com perguntas-chave respondidas, oportunidades e próximos passos 30/60/90 dias.
- **PDF do relatório** com **template editável por loja** (logo, cor primária, slogan, ordem dos KPIs, seções).
- **Importação de dados** via CSV (métricas, produtos, avaliações) com preview e validação.
- **Análise de sentimento** das avaliações via IA.
- **Comparativo com concorrentes**, gestão de **campanhas** e **métricas mensais**.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5 |
| UI | Tailwind CSS v3, shadcn/ui, Radix UI, Lucide |
| Estado / dados | TanStack Query, React Router 6 |
| Gráficos | Recharts |
| Forms / validação | React Hook Form, Zod |
| Backend | Lovable Cloud (Supabase: Postgres, Auth, Storage, Edge Functions) |
| IA | Lovable AI Gateway (Gemini, GPT) — sem chaves no cliente |

---

## Como rodar localmente

Pré-requisitos: Node 18+ e npm/bun.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:8080`. As variáveis de ambiente do Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) são geradas automaticamente pelo Lovable Cloud — **não** edite o `.env` manualmente.

Outros scripts:

```bash
npm run build          # build de produção
npm run lint           # ESLint
npm run test           # vitest (modo CI)
```

---

## Estrutura do projeto

```
src/
├─ components/             # Componentes compartilhados (sidebar, layout, badges, EmptyState)
│  ├─ onboarding/          # Wizard de primeira loja
│  └─ ui/                  # shadcn/ui
├─ hooks/                  # useAuth, useStoreData
├─ integrations/supabase/  # Client e tipos (gerados — não editar)
├─ lib/
│  ├─ ai/                  # Wrapper de invocação de Edge Functions de IA
│  ├─ diagnostics/         # Motor de regras + cálculo de score
│  ├─ import/              # Parsers de CSV e templates
│  └─ seed/                # Geração de dados demo realistas
├─ pages/
│  ├─ Index.tsx, Auth.tsx, ResetPassword.tsx
│  └─ app/                 # Rotas internas autenticadas
└─ App.tsx                 # Roteamento

supabase/
├─ functions/              # Edge Functions (ai-consult, analyze-reviews, generate-report-pdf)
├─ migrations/             # Migrações SQL versionadas
└─ config.toml
```

---

## Modelo de dados (Supabase)

Tabelas principais (todas com RLS por `user_id` ou via `has_store_access(store_id)`):

- `profiles` — dados do usuário, criado via trigger no signup.
- `stores` — lojas do usuário.
- `metrics` — métricas mensais por loja.
- `products` — itens do cardápio com custo, preço, margem, vendas e fotos.
- `reviews` — avaliações com sentimento e tópicos detectados.
- `competitors` — concorrentes monitorados.
- `campaigns` — campanhas com ROI calculado.
- `diagnostics` — diagnósticos gerados (regras + IA).
- `action_plans` — plano de ação ligado aos diagnósticos.
- `reports` — relatórios persistidos.
- `report_templates` — template visual do PDF por loja.

---

## Dados mockados

Para fins de demonstração comercial, qualquer usuário pode gerar uma **loja demo** completa em um clique (botão **Carregar loja demo** no onboarding ou na lista de lojas). O seed cria:

- Loja "Burger House (Demo)" com KPIs realistas.
- 14+ produtos cobrindo cenários: alto giro/baixa margem, lucrativos sem destaque, vendedores com reclamações.
- 18+ avaliações com padrões repetidos de "atrasou", "frio", "embalagem", "pedido errado".
- 4 concorrentes com prazos/notas/taxas distintas.
- 3 campanhas (ROI alto, ROI baixo e neutra).
- 6 meses de métricas com tendência leve.
- Diagnósticos e plano de ação iniciais já calculados.

> Os dados são reais no banco (RLS aplicada) — só os **valores** são fictícios.

---

## Próximos passos planejados

- Parsing nativo de **XLSX** e **PDF** exportados das plataformas (iFood, Rappi).
- Integração direta via **API/scraping autorizado** com iFood/Rappi.
- IA **preditiva** (forecast de faturamento, churn de clientes, otimização de cupom).
- **Multi-usuário por loja** (operador, gestor, dono) com roles granulares.
- **App mobile** (React Native) para o dono acompanhar plano de ação.
- Marketplace de **playbooks** prontos por categoria (hamburgueria, pizzaria, açaí, etc).

---

© Gestor IA de Delivery — todos os direitos reservados.

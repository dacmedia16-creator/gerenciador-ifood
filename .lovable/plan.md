
# Plano de implementação — Simplificação do Gestor IA

Três frentes paralelas, sem quebrar features existentes. Tudo o que sai do sidebar continua existindo nas rotas — apenas deixa de ser exibido para usuários comuns.

---

## PARTE 1 — Funil de diagnóstico em 5 etapas

### Estratégia
Criar um novo wizard "Express" como caminho padrão, preservando o wizard de 16 etapas como fluxo de "Aprofundamento" opcional pós-diagnóstico. Hoje já existe `src/pages/app/diagnosis/DiagnosisExpress.tsx` e `DiagnosisWizard.tsx` — vamos reaproveitar.

### Mudanças

**1. Novo wizard de 5 etapas**
- Reescrever `src/pages/app/diagnosis/DiagnosisExpress.tsx` com 5 steps + 1 tela intermediária de print.
- Estado local em React, persistência por etapa em `diagnosis_sessions` (atualizando `current_step`) e `diagnosis_answers` (uma linha por `question_key`).
- Header com `<Progress />` mostrando "Etapa X de 5" + título/subtítulo.
- Botões: "Voltar" (a partir da 2), "Continuar" (primário, altura 48px).
- Mobile-first: layout em coluna, inputs grandes.

**2. Etapas (chaves salvas em `diagnosis_answers.question_key`)**

| # | question_key | UI | Valor |
|---|---|---|---|
| 1 | `revenue_range` | 4 botões de seleção única | string |
| 2 | `current_rating` | input number, step 0.1, 0–5 | number |
| 3 | `cancellation_rate` | input number, step 0.1, 0–100, sufixo % + dica | number |
| 4 | `avg_ticket` | input number, prefixo R$ + dica | number |
| 5 | `main_problem` | 6 botões com emoji + label | string |

Cada etapa salva via upsert em `diagnosis_answers` (já existe `autosave.ts`) e atualiza `diagnosis_sessions.current_step`.

**3. Tela intermediária — upload de print**
- Após etapa 5, antes de gerar: tela com dropzone (reaproveitar `PrintUploader.tsx`), preview, botão primário "Gerar diagnóstico com print" e link "Pular e gerar agora".
- Upload para bucket `diagnosis-uploads` (já existe), insert em `diagnosis_uploads` com `session_id` (a edge function `process-print` já trata).

**4. Geração e redirecionamento**
- Chamar a edge function de diagnóstico existente (`ai-consult` via `src/lib/diagnosis/generate.ts`) com os 5 campos.
- Redirecionar para `DiagnosisResult`.

**5. Rotas**
- `/app/diagnosis/new` e `/app/diagnosis/welcome` passam a apontar para o novo Express.
- `DiagnosisWizard` (16 etapas) fica acessível apenas via botão "Adicionar mais detalhes" na tela de resultado e dentro do Plano de Ação, em rota `/app/diagnosis/:id/advanced`.
- Sessões em andamento com `current_step > 5` continuam abrindo o wizard antigo automaticamente (detectar pelo status/step).

**6. Login**
A arquitetura atual exige login (RLS por `user_id`). Mantemos login obrigatório, mas o wizard antigo de onboarding extenso é pulado — usuário vai direto ao Express após signup.

---

## PARTE 2 — Sidebar enxuto (5 abas + extras)

### Mudanças em `src/components/AppSidebar.tsx`

**Itens visíveis para todos os usuários:**
1. 🏠 Início → `/app/dashboard`
2. 🔍 Diagnóstico → `/app/diagnosis/welcome`
3. ✅ Plano de Ação → `/app/stores/:id/action-plan` (usa storeId ativa do contexto; se não houver, redireciona para criação)
4. 🍔 Cardápio & Margem → `/app/stores/:id/menu`
5. ⭐ Avaliações → `/app/stores/:id/reviews`

Separador visual + :
6. 💎 Planos → `/app/planos` (página nova, placeholder simples com CTA)
7. ⚙️ Configurações → `/app/configuracoes` (página nova, placeholder com perfil/sair)

**Removidos do sidebar (rotas mantidas, só ocultas para não-admin):**
- Minha loja, Todas as lojas, Score, Meta, Evolução, Relatório, Produtos, Nomes (SEO), Margem & Preço, Simulador, Expectativa×Entrega, Concorrentes, Campanhas, Melhor horário, Métricas, Chat, Admin, Prospects, Knowledge, ReportTemplate.

**Ferramentas contextuais dentro do Plano de Ação**
Em `src/pages/app/ActionPlan.tsx` (e `ActionDetail.tsx`), adicionar mapeamento ação→ferramenta e renderizar botão "Usar ferramenta: [nome]" que abre a rota dedicada (já existente):

| Tipo da ação (heurística por `area`/`title`) | Ferramenta |
|---|---|
| preço/margem | `/app/stores/:id/pricing-simulator` |
| cardápio/nome do produto | `/app/stores/:id/product-names` |
| horário/operação | `/app/stores/:id/best-hours` |
| expectativa/foto | `/app/stores/:id/expectation` |
| meta/evolução | `/app/stores/:id/goal` ou `/evolution` |

**Chat flutuante**
Adicionar botão flutuante (FAB) em `AppLayout` que abre `/app/chat` (apenas usuários autenticados).

---

## PARTE 3 — Proteção admin

O projeto já tem `src/components/AdminRoute.tsx` usando `useIsAdmin` (verifica `user_roles` com `role='admin'`, padrão correto — não usar `profiles.role` para evitar privilege escalation).

### Mudanças

**1. Ajustar `AdminRoute`** para mostrar toast "Acesso restrito." (sonner) antes do redirect para `/app/dashboard`.

**2. Envolver com `AdminRoute` em `src/App.tsx` as rotas:**
- `/app/admin`
- `/app/stores`, `/app/stores/new`
- `/app/prospects`
- `/app/knowledge`
- `/app/stores/:id/report/template` (ReportTemplate)

**3. Sidebar** — bloco "Super Admin" já é condicionado a `isAdmin`. Confirmar e remover qualquer item admin que esteja escapando para usuários comuns.

**Observação importante:** o spec do usuário pede "verificar via `profiles.role`". Vamos manter o padrão correto (`user_roles` + `has_role`) que já existe no projeto, pois é a recomendação de segurança da plataforma. Mesmo comportamento, implementação mais segura.

---

## Detalhes técnicos

- **Stack:** React + TS estrito, shadcn/ui, Tailwind, react-router, TanStack Query, Supabase client existente.
- **Persistência do funil:** reutilizar `src/lib/diagnosis/autosave.ts` e `session.ts`.
- **Sem migrations de schema:** `diagnosis_answers` é genérico (`question_key` + `answer_value` jsonb), cabe os 5 novos campos sem alterar tabela.
- **`print_jobs`:** o spec menciona, mas o projeto usa `diagnosis_uploads` (mesmo papel). Vamos usar a tabela existente, sem criar `print_jobs`.
- **Páginas novas:** `Planos.tsx` e `Configuracoes.tsx` como placeholders simples seguindo design system.
- **Mobile-first:** botões `min-h-12`, inputs `text-base`, layouts `grid` responsivos.
- **RLS:** intacta.
- **Backward compat:** sessões com `current_step > 5` continuam no wizard antigo; nada é deletado.

## Arquivos afetados (resumo)

- `src/pages/app/diagnosis/DiagnosisExpress.tsx` — reescrito (5 etapas + print)
- `src/pages/app/diagnosis/DiagnosisWelcome.tsx` — CTA aponta para Express
- `src/pages/app/diagnosis/DiagnosisResult.tsx` — botão "Adicionar mais detalhes"
- `src/pages/app/ActionPlan.tsx` + `ActionDetail.tsx` — botões de ferramentas contextuais
- `src/components/AppSidebar.tsx` — reduzido a 5 + 2 itens
- `src/components/AppLayout.tsx` — FAB do Chat
- `src/components/AdminRoute.tsx` — adicionar toast
- `src/App.tsx` — envolver rotas admin com `AdminRoute`; adicionar `/app/planos` e `/app/configuracoes`
- `src/pages/app/Planos.tsx` (novo)
- `src/pages/app/Configuracoes.tsx` (novo)

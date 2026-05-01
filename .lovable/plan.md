
# Reposicionamento: de SaaS consultivo para "Painel do Dono de Delivery"

## Princípio do plano

**O que NÃO muda** (preservado integralmente):
- Edge functions: `chat-gestor`, `ai-consult`, `ai-diagnose`, `analyze-reviews`, `generate-report-pdf`, `embed-knowledge`, etc.
- Motor de regras: `src/lib/diagnostics/engine.ts`, `src/lib/diagnosis/rules.ts`, `_shared/diagnostic-rules.ts`, `_shared/evidences.ts`
- Banco, RLS, RAG, prompts internos da IA
- Rotas, IDs de URL, estrutura de dados
- Funcionalidades (Prospects, Knowledge, Template do PDF continuam existindo — só são reposicionados/movidos no menu)

**O que muda**: copy visível, hero, organização do menu lateral, títulos de páginas, CTAs.

---

## 1. Landing page (`src/pages/Index.tsx`) — reescrita de copy

Mantém a estrutura visual atual (paleta vermelho/amarelo/preto, mock de dashboard, seções), mas **troca toda a narrativa de "nós cuidamos do seu delivery" para "você tem o painel para cuidar do seu delivery"**.

### Hero
- **Badge**: "Painel inteligente para donos de delivery"
- **H1**: *"Descubra por que seu delivery vende, mas* **não dá o lucro que deveria** *— e receba um plano de ação claro para corrigir isso."*
- **Subtítulo**: "Cadastre sua loja, conecte seus dados e receba um diagnóstico com IA mostrando onde você está perdendo dinheiro e exatamente o que fazer para vender mais, lucrar melhor e melhorar sua reputação."
- **CTA primário**: "Fazer diagnóstico da minha loja" → `/auth`
- **CTA secundário**: "Ver exemplo de diagnóstico" → `/auth` (mesma porta de entrada por enquanto; abre demo após login via "Criar demo" já existente em `Stores`)
- Header: troca botão "Solicitar análise" por **"Entrar"** + **"Fazer diagnóstico"**

### Seção "Dores do dono" (substitui a atual de dores)
Cards ajustados ao briefing:
- Vende mas não lucra
- Promoções que queimam margem
- Produtos campeões com baixa rentabilidade
- Avaliações ruins derrubando a loja
- Entrega lenta aumentando cancelamento
- Anúncios sem retorno claro
- Clientes que não voltam

### Seção "Como funciona" — processo simples em 3 passos
Substitui o atual de 4 passos consultivos por:
1. **Cadastre sua loja** — informe dados básicos e conecte vendas, cardápio e avaliações.
2. **Receba o diagnóstico da IA** — análise automática de margem, reputação, cardápio, concorrência e campanhas.
3. **Execute o plano de ação** — passo a passo priorizado por impacto financeiro, direto no seu painel.

### Seção "O que você vai responder com o painel"
Substitui "O que analisamos" — apresenta perguntas práticas do dono:
- Onde estou perdendo dinheiro?
- Quais produtos prejudicam minha margem?
- O que devo corrigir primeiro?
- Quais reclamações mais aparecem?
- Meus anúncios estão dando retorno?
- Por que meus clientes não voltam?

### Seção "Para quem é" — mantida com pequena reescrita
Foco em "donos e gestores de loja própria", não em "operações que querem profissionalizar".

### CTA final
- **H2**: "Pronto para saber exatamente o que está travando seu delivery?"
- Botões: "Fazer diagnóstico da minha loja" / "Entrar no painel"
- Remover linha "Atendimento consultivo · Vagas limitadas por mês"

### Footer
- Trocar "Falar com especialista" por "Entrar"
- Remover "Área do cliente" (vira CTA principal)

---

## 2. Sidebar (`src/components/AppSidebar.tsx`) — reorganização

### Menu "Geral" (visível para todo dono)
Ordem nova:
- Dashboard *(renomeado para "Painel do Dono")*
- Novo Diagnóstico
- Lojas *(renomeado para "Minha loja" / "Minhas lojas")*
- Gestor IA (Chat) — mantido (ferramenta direta do dono)

### Menu "Análise" (quando dentro de uma loja) — ordem ajustada
- Visão geral
- Diagnóstico
- Score
- **Plano de melhoria** (renomeado de "Plano de ação" — opcional, manter "Plano de ação" também é aceitável; ver decisão abaixo)
- Evolução IA → renomear para **"Evolução da loja"**
- **Relatório da minha loja** (renomeado de "Relatório")

### Menu "Operação" — mantido, sem mudanças funcionais
Cardápio, Produtos, Nomes (SEO), Margem & Preço, Simulador de preço, Avaliações, Expectativa × Entrega, Concorrentes, Campanhas, Melhor horário, Métricas.

### Menu "Dados & Saída"
- Importar dados — mantido
- **Configurações do relatório** (renomeado de "Template do PDF")

### Itens reposicionados como "admin/avançado"
Criar nova área **"Admin"** no rodapé da sidebar (collapsible, fechada por padrão) contendo:
- Radar de Prospects
- Base de conhecimento

> Esses itens continuam funcionando e acessíveis nas mesmas rotas. Só saem da navegação primária do dono. Alternativa: esconder por flag de role no futuro — por agora, agrupar visualmente em "Admin" basta.

---

## 3. Renomeações de copy nas páginas internas

Apenas trocas de strings visíveis, sem alterar lógica:

| Arquivo | De | Para |
|---|---|---|
| `src/pages/app/Report.tsx` | "Relatório consultivo" | "Relatório da minha loja" |
| `src/pages/app/Report.tsx` | "Análise consultiva gerada!" | "Relatório gerado!" |
| `src/pages/app/Report.tsx` | "...gerar o relatório consultivo" | "...gerar o relatório da loja" |
| `src/pages/app/Score.tsx` | "Análise consultiva por área operacional" | "Análise por área da sua operação" |
| `src/pages/app/Dashboard.tsx` | "Plano de ação recomendado" | "Plano de melhoria da sua loja" |
| `src/pages/app/Dashboard.tsx` (header app) | "Gestor IA de Delivery" | "Painel do Dono — Gestor de Delivery" |
| `src/pages/app/ReportTemplate.tsx` | "Template do PDF" / placeholder "Relatório consultivo mensal" | "Configurações do relatório" / "Ex.: Relatório mensal da minha loja" |
| `src/pages/app/Diagnostics.tsx` | "análise consultiva (com memória da loja...)" | "análise completa (com memória da loja...)" |
| `src/components/report/AIConsultReport.tsx` (título visível) | "Gestor IA — Análise consultiva" | "Gestor IA — Análise da sua loja" |
| `src/components/AppLayout.tsx` (header) | "Gestor IA de Delivery" | "Painel do Dono" |

> **Não** alterado: nomes técnicos como `consultive_diagnosis` (tool name no edge function), `summary_tone: 'consultivo'` (valor de banco), nem prompts internos da IA. Isso preserva 100% do comportamento da IA.

---

## 4. Dashboard (`src/pages/app/Dashboard.tsx`) — pequenos ajustes de tom

Sem refator de lógica. Apenas:
- Título de página: continua sendo o nome da loja (já é orientado ao dono).
- Adicionar uma faixa nova **"Perguntas que este painel responde"** com 4 chips clicáveis levando às páginas existentes:
  - "Onde estou perdendo dinheiro?" → `/app/stores/:id/pricing`
  - "Quais produtos prejudicam minha margem?" → `/app/stores/:id/products`
  - "O que devo corrigir primeiro?" → `/app/stores/:id/action-plan`
  - "Quais reclamações mais aparecem?" → `/app/stores/:id/reviews`
- Renomear seção "Plano de ação recomendado" → "Plano de melhoria da sua loja"
- Renomear "Alertas críticos" → "O que está travando sua loja agora"

---

## 5. Decisões a confirmar

1. **"Plano de ação" → "Plano de melhoria"**: a rota é `/action-plan` e o nome técnico permanece. Trocar só o rótulo no menu e títulos? *(Plano: sim, trocar rótulo visível.)*
2. **Itens admin (Prospects, Base de conhecimento, Configurações do relatório)**: agrupar em seção "Admin" colapsável dentro da sidebar atual. *(Sem criar sistema de roles agora — apenas separação visual.)*
3. **CTA "Ver exemplo de diagnóstico"**: leva para `/auth` com mensagem "entre para ver demo" e o usuário usa o botão "Criar demo" já existente em `/app/stores`. Sem nova rota pública.

---

## Arquivos que serão editados

- `src/pages/Index.tsx` (reescrita ampla de copy, mesma estrutura visual)
- `src/components/AppSidebar.tsx` (reordenar, renomear, criar grupo "Admin")
- `src/components/AppLayout.tsx` (header text)
- `src/pages/app/Dashboard.tsx` (chips de perguntas, renomear seções)
- `src/pages/app/Report.tsx` (strings)
- `src/pages/app/Score.tsx` (string)
- `src/pages/app/ReportTemplate.tsx` (título e placeholder)
- `src/pages/app/Diagnostics.tsx` (string)
- `src/components/report/AIConsultReport.tsx` (título visível)

## Arquivos que NÃO serão tocados

- Qualquer coisa em `supabase/functions/**`
- `src/lib/diagnostics/**`, `src/lib/diagnosis/rules.ts`, `src/lib/diagnosis/evidences.ts`, `src/lib/diagnosis/generate.ts`
- `src/integrations/supabase/**`
- Migrações SQL
- Lógica de carregamento de dados, queries, schemas

---

## Resultado esperado

Um dono de delivery que abre o site entende em 5 segundos: *"isso é um painel para mim cuidar do meu delivery, com IA, descobrir onde perco dinheiro e ter um plano".* Ao entrar, encontra um menu enxuto orientado às decisões dele, sem termos consultivos, sem itens de back-office no caminho principal. A inteligência da IA, RAG, regras e relatórios continua exatamente igual.

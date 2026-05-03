# Expansão do Funil de Diagnóstico

Hoje o funil tem 10 etapas focadas no dono leigo. Sua lista pede dados extras: **equipe/operação**, **marketing/redes (Instagram/WhatsApp/diferencial)**, **concorrência**, **tendência de vendas (dias fortes/fracos)** e **visualizações/conversão dos apps**. A proposta abaixo encaixa esses pontos no funil atual sem inflar demais e mantendo as chaves que o motor de regras já lê.

## O que muda

### 1. Etapa 1 (Sobre a loja) — adicionar
- `team_size` (select faixas): Quantas pessoas trabalham na loja hoje?
- `main_goal` (select): Qual seu objetivo principal nos próximos 90 dias?  
  (vender mais / aumentar lucro / melhorar nota / fidelizar / organizar operação)
- `biggest_problem` (textarea, essential): Qual é o maior problema da loja hoje?

### 2. Etapa 2 (Vitrine) — adicionar
- `monthly_views` (select faixas): Quantas pessoas visualizam sua loja por mês?  
  (com tooltip: Portal > Desempenho > Visitas)
- `conversion_feeling` (rating3): De quem vê sua loja, quantos pedem? (Bom / Médio / Ruim / Não sei)
- `strong_days` / `weak_days` (multiselect dias da semana)
- `sales_trend` (select): Suas vendas nos últimos 60 dias estão… (subindo / estáveis / caindo / não sei)

### 3. Nova Etapa 8.5 — "Operação e equipe" (vira etapa 8, empurrando as outras)
Foco em gargalos sem virar formulário corporativo:
- `team_roles` (multiselect): Quem cuida de quê? (cozinha / atendimento / entrega / dono faz tudo)
- `peak_capacity_ok` (rating3): Nos horários de pico, a cozinha dá conta?
- `order_check_process` (yesno): Existe conferência do pedido antes de sair?
- `frequent_errors` (multiselect): Erros mais comuns (item faltando / troca / falta de estoque / nenhum)
- `stockout_frequency` (select): Com que frequência falta item?

### 4. Nova Etapa "Marketing e diferencial" (depois de Anúncios)
Reaproveita a etapa 9 (`ads`) acrescentando blocos novos:
- `unique_value` (textarea, essential): Em uma frase, por que o cliente deveria escolher você e não o concorrente?
- `instagram_active` (yesno) + `instagram_frequency` (select condicional)
- `whatsapp_orders` (yesno): Recebe pedido por WhatsApp?
- `whatsapp_base_size` (select condicional): Tamanho da base de contatos
- `top_competitors` (textarea): Cite até 3 concorrentes que mais te preocupam (nome + por quê)
- `competitor_advantage` (multiselect): O que eles fazem melhor? (preço / fotos / combos / nota / entrega / marketing)

### 5. Pequenos ajustes de UX
- Adicionar tipo de campo `multiselect_days` reutilizando o `multiselect` existente (sem novo tipo) com options seg→dom.
- Manter "Não sei" em todos os selects com faixas.
- Todas perguntas novas com `essential: false` exceto `biggest_problem` e `unique_value`.

## Impacto técnico

- **`src/lib/diagnosis/steps.ts`**: adicionar perguntas nas etapas 1, 2, 9 e criar 1 etapa nova (Operação). Total passa de 10 → 11 etapas. `TOTAL_STEPS` atualiza automaticamente.
- **`src/lib/diagnosis/evidences.ts`** (e cópia em `supabase/functions/_shared/evidences.ts`): adicionar regras leves usando os novos campos:
  - `sales_trend = "caindo"` → ponto crítico
  - `stockout_frequency` alto → operação
  - `monthly_views` alto + `conversion_feeling = "ruim"` → problema de conversão
  - `competitor_advantage` inclui "preço/fotos" → input para recomendações
- **`src/pages/app/diagnosis/DiagnosisReview.tsx`**: nada estrutural — já lê dinamicamente dos STEPS. Vai mostrar a nova etapa automaticamente.
- **`src/components/diagnosis/ReviewAnswerList.tsx`**: garantir formatação dos novos selects/multiselects (já é genérico, só validar labels).
- **Banco**: nada a alterar — `diagnosis_answers` armazena por `step_key` + `question_key` em jsonb.
- **IA / `ai-diagnose`**: continua recebendo o mapa completo de respostas; novos campos viram contexto adicional sem mudança de schema.

## Fora do escopo (sugestões para depois)
- Geração separada das seções "plano 7 dias / 30 dias / projeção" — já existe em `generate.ts`/`AIConsultReport`; podemos enriquecer o prompt num passo seguinte usando os novos sinais.
- Integração real com Instagram/WhatsApp (hoje só captura auto-declarado).

Posso seguir com essa expansão? Se aprovar, eu implemento direto: edito `steps.ts`, atualizo as regras e valido a tela de revisão.
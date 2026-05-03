## Objetivo

Deletar de vez a função `ai-diagnose` (deprecated, retorna 410) e corrigir o ponto crítico #1 da auditoria: a `ai-consult` ignora as respostas do funil (`diagnosis_answers`) e os dados extraídos dos prints (`diagnosis_uploads.structured_data`). Hoje só os `rule_evidences` que o frontend já calculou e gravou em `reports.report_data` chegam à IA — se a chamada vier antes do `generateDiagnosis` salvar o relatório, a IA roda "no escuro".

## O que vai mudar

### 1. Deletar `ai-diagnose`
- Remover pasta `supabase/functions/ai-diagnose/`
- Remover bloco `[functions.ai-diagnose]` em `supabase/config.toml`
- Chamar `delete_edge_functions(["ai-diagnose"])` para tirar do deploy
- Nenhum código no frontend chama mais essa função (confirmado por busca)

### 2. `ai-consult` aceitar `sessionId` opcional
Quando o cliente enviar `{ storeId, sessionId }`, a função vai:
1. Buscar a `diagnosis_session` pelo `sessionId` (validando `user_id = auth.uid()`)
2. Carregar todas as `diagnosis_answers` daquela sessão
3. Carregar todos os `diagnosis_uploads` (`status = 'done'`) daquela sessão e extrair o `structured_data`
4. Rodar o motor de regras client-side equivalente no servidor para gerar evidências do funil/prints e fazer `mergeEvidences` com as evidências da loja
5. Gravar `session_id` no `reports.report_data.ai_consult` para rastreabilidade

### 3. Mover lógica de evidências do funil para `_shared`
Hoje `src/lib/diagnosis/generate.ts` (cliente) é o único lugar que sabe transformar respostas do funil + prints em `RuleEvidence[]`. Vou:
- Criar `supabase/functions/_shared/funnel-evidences.ts` com a função pura `funnelEvidencesFromAnswers(answers, uploads)`
- Reescrever a versão client-side de `generate.ts` para reusar a mesma lógica via cópia espelhada (mantém compatibilidade do fluxo atual)
- Garante uma única fonte de verdade

### 4. Backwards compatible
- Chamar `ai-consult` sem `sessionId` continua funcionando como hoje (lê o último `report.report_data.rule_evidences`)
- Nenhuma mudança de schema de banco

## Detalhes técnicos

**Arquivos novos**
- `supabase/functions/_shared/funnel-evidences.ts` — funções puras para gerar `RuleEvidence` a partir de `diagnosis_answers` e `diagnosis_uploads.structured_data`

**Arquivos editados**
- `supabase/functions/ai-consult/index.ts` — aceitar `sessionId`, buscar answers/uploads/session, mesclar evidências do funil + loja
- `supabase/config.toml` — remover bloco `ai-diagnose`
- `src/lib/diagnosis/generate.ts` — refatorar para consumir o helper compartilhado (sem mudar comportamento externo)

**Arquivos removidos**
- `supabase/functions/ai-diagnose/` (pasta inteira)

**Tools**
- `delete_edge_functions(["ai-diagnose"])`
- `deploy_edge_functions(["ai-consult"])`

## O que NÃO vai mudar nesta sprint
- Welcome → Wizard (escolha "prints/formulário/ambos") — fica para o próximo passo
- Dedup de métricas/reviews via upsert — próximo passo
- `diagnostics.session_id` (coluna nova) — próximo passo
- Qualquer mexida em `onboarding`

Posso seguir?
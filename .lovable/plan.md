
## Objetivo

Transformar o sistema em "Gestor de Delivery IA" com arquitetura **híbrida e ancorada**:

- **Motor de regras** (`src/lib/diagnosis/rules.ts` + novo módulo no edge) = fonte única da verdade objetiva. Gera **evidências estruturadas**.
- **Edge `ai-consult`** = camada consultiva. Recebe **somente** as evidências do motor + dados brutos da loja e produz texto consultivo, **proibida** de inventar números ou criar problema sem evidência.

Sem remover nada existente. Tudo retrocompatível.

---

## Mudanças por arquivo

### 1. `src/lib/diagnosis/rules.ts` — enriquecer saída das regras

Hoje cada regra devolve um `Diagnostic` (texto). Vamos passar a também devolver um **`RuleEvidence`** estruturado (sem quebrar o tipo atual).

Novo tipo exportado:

```text
RuleEvidence {
  rule_id: string            // ex: "conv_critica", "tempo_entrega_alto"
  area: string               // vendas | conversao | ticket | cancelamentos |
                             // avaliacoes | tempo_preparo | produtos |
                             // campanhas | concorrencia | cardapio | operacao
  metric: string             // ex: "conversion_rate"
  current_value: number|string|null
  reference_value: number|string|null
  severity: "critico"|"atencao"|"ok"
  business_impact: string
  probable_cause: string
  recommended_action: string
  confidence: "alta"|"media"|"baixa"   // alta = dado direto, baixa = inferido
  evidence_data: Record<string, any>   // valores crus usados (ex: {visits, orders})
  missing_data?: string[]              // se confidence baixa, o que falta
}
```

Nova função `evidencesFromAnswers(map)` que devolve `RuleEvidence[]` com **todas** as regras já existentes mais as novas áreas pedidas:

- vendas (revenue/orders mês)
- conversão (já existe)
- ticket médio (já existe — ampliar)
- cancelamentos (já existe)
- avaliações (já existe)
- **tempo de preparo** (NOVA: `delivery.preparation_time` vs ideal ≤20min)
- produtos com baixo desempenho (NOVA: `sales_quantity` muito abaixo da média + sem foto)
- campanhas (já existe — ROI)
- concorrência (já existe)
- cardápio (já existe — fotos, nomes, descrições)
- operação (cancelamentos + tempo + reclamações operacionais)

A função `rulesFromAnswers` antiga continua funcionando — passa a ser um wrapper sobre `evidencesFromAnswers` que mapeia `RuleEvidence` → `Diagnostic`. Zero quebra.

Cada regra também marca `confidence`:
- `alta` quando o dado veio diretamente do usuário com número
- `media` quando inferido (ex: conversão calculada de visitas/pedidos)
- `baixa` para fallbacks de "dado faltando"

### 2. `src/lib/diagnosis/generate.ts` — persistir evidências

- Chama `evidencesFromAnswers(map)` e mantém também `rulesFromAnswers` para gravar `diagnostics`/`action_plans` como hoje.
- Salva o array `RuleEvidence[]` dentro de `reports.report_data.rule_evidences` para que o edge possa consumir. Sem schema novo.

### 3. `supabase/functions/_shared/diagnostic-rules.ts` — espelhar evidências no Deno

Adicionar `evidencesFromStoreData()` que roda sobre os dados brutos do banco (loja, products, reviews, competitors, metrics) e devolve o **mesmo formato** `RuleEvidence`. Isso garante que, quando o usuário clica em "Análise IA" sem ter passado pelo funil, ainda há evidências objetivas.

A edge `ai-consult` vai mesclar:
1. evidências geradas no funil (vindas de `reports.report_data.rule_evidences`, se houver)
2. evidências calculadas do banco (sempre rodam)

Deduplica por `rule_id`, prevalecendo a do funil quando existir (mais detalhada).

### 4. `supabase/functions/ai-consult/index.ts` — IA ancorada

Mudanças:

**a) System prompt reescrito** com regras explícitas:
- Você é gestor de delivery experiente.
- Só pode comentar/priorizar/expandir as evidências fornecidas em `RULE_EVIDENCES`.
- **Proibido** criar problema novo que não tenha `rule_id` correspondente.
- **Proibido** citar número que não esteja em `current_value`, `reference_value` ou `evidence_data`.
- Sempre diferenciar em cada bloco: `[FATO]` (vem das evidências), `[HIPÓTESE]` (interpretação), `[RECOMENDAÇÃO]`.
- Quando `confidence = baixa` ou `missing_data` presente, dizer claramente "falta dado: …".
- Linguagem simples para dono de restaurante. Sem jargão.
- Nunca prometer resultado garantido (proibir "vai aumentar X%").

**b) Tool schema reescrito** para o novo contrato:

```text
consultive_diagnosis {
  executive_summary: string
  main_problems: [{
    rule_id: string                // OBRIGATÓRIO referenciar evidência
    title: string
    why_it_matters: string
    evidence_cited: string         // texto curto citando o dado real
    confidence: "alta"|"media"|"baixa"
  }]
  priority_ranking: [{ rule_id, priority: "alta"|"media"|"baixa", reason }]
  plan_7_days: [{ day, title, action, rule_id }]
  plan_30_days: [{ week, title, action, rule_id }]
  do_not_do_now: [string]          // o que NÃO fazer agora e por quê
  missing_data_for_better_diagnosis: [string]
  disclaimers: [string]            // ex: "Sem dados de funil — recomendação parcial"
}
```

Validação pós-IA: descartar qualquer item de `main_problems` cujo `rule_id` **não exista** nas evidências enviadas. Loga e remove silenciosamente — garante que IA não inventa.

**c) Payload enviado ao modelo**: passa a ser estruturado em duas seções claras — `RULE_EVIDENCES` (lista do motor) e `RAW_CONTEXT` (loja + produtos + reviews crus, só para contexto narrativo). O prompt deixa explícito que `RAW_CONTEXT` não deve gerar diagnóstico novo, só ajuda a escrever o texto.

**d) Persistência**: continua salvando em `reports` (histórico). `report_data.ai_consult` passa a incluir `rule_evidences_used` para auditoria.

### 5. `src/components/report/AIConsultReport.tsx` — render do novo contrato

Adaptar para o novo shape mantendo retrocompatibilidade com relatórios antigos:
- Se `data.main_problems` existe → renderiza nova UI (com badge `[FATO]`/`[HIPÓTESE]`/confiança e citação da evidência).
- Se `data.problems` (formato antigo) → render atual.
- Novas seções: **Plano 30 dias**, **O que NÃO fazer agora**, **Dados que faltam**, **Avisos / disclaimers**.
- Cada item de problema mostra um chip "Confiança: alta/media/baixa".

### 6. (Opcional, sem schema) `src/pages/app/Report.tsx`

Pequeno ajuste textual: o botão "Gerar análise consultiva (IA)" passa a se chamar **"Consultar Gestor IA"**, deixando claro o papel.

---

## Fluxo final

```text
Funil ─► rulesFromAnswers ─► Diagnostic[]   (já existente, gravado em diagnostics)
       ─► evidencesFromAnswers ─► RuleEvidence[]
                                  └─► salvo em reports.report_data.rule_evidences

Botão "Consultar Gestor IA"
       │
       ▼
ai-consult edge
   ├── lê reports.report_data.rule_evidences (se houver)
   ├── roda evidencesFromStoreData(banco) ──► merge / dedupe
   ├── monta payload { RULE_EVIDENCES, RAW_CONTEXT }
   ├── chama Lovable AI (gemini-2.5-pro) com tool_choice forçado
   ├── valida: descarta main_problems sem rule_id válido
   └── salva novo report no histórico
       │
       ▼
AIConsultReport.tsx renderiza com chips de confiança,
[FATO]/[HIPÓTESE]/[RECOMENDAÇÃO], plano 7 e 30 dias,
"o que não fazer", "dados faltando".
```

---

## Garantias contra alucinação da IA

1. `tool_choice` força chamada da função (já existe).
2. System prompt proíbe criar problema fora das evidências.
3. Validação pós-resposta descarta `main_problems` com `rule_id` desconhecido.
4. Validação descarta números que não aparecem em nenhum `evidence_data`/`current_value` (regex simples sobre números mencionados em `evidence_cited`).
5. Quando `RULE_EVIDENCES` chega vazio, a IA é instruída a devolver apenas `executive_summary` curto + `missing_data_for_better_diagnosis` populado, **sem** problemas inventados.

---

## Sem mudanças de schema

Reaproveita `reports.report_data` (jsonb). Nenhuma migração.

---

## Resultado esperado

- Loja com dados completos: relatório consultivo rico, com cada recomendação rastreável a uma regra e a um dado real.
- Loja com cadastro mínimo (Teste1): IA devolve resumo curto + lista clara de "dados que faltam", sem inventar diagnóstico.
- Auditoria: cada relatório IA carrega o snapshot de `rule_evidences_used`, permitindo provar de onde veio cada conclusão.

Aprovando, implemento numa única passada.

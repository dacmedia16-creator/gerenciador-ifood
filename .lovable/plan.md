## Reescrever o prompt do consultor IA com as novas regras

Vou substituir o `SYSTEM_PROMPT` da edge function `supabase/functions/ai-consult/index.ts` para incorporar as regras que você definiu:

### O que muda no prompt

**Identidade**: troca de "gestor de delivery experiente" para "consultor especializado em delivery no Brasil com 10 anos de iFood/Rappi/Uber Eats, em reunião de 30 minutos com o dono".

**Novas proibições explícitas de linguagem**: lista negra de frases ("melhore seu atendimento", "invista em marketing", "foque na qualidade", "sua loja tem potencial", "robusto", "estratégico", "alavancar", "otimizar"). Forçar `você` em vez de `sua loja`. Proibir recomendar marketing antes de resolver operação.

**Cálculo obrigatório de impacto financeiro** com fórmulas explícitas:
- Cancelamento: `orders × (cancellation_rate/100) × avg_ticket`
- Nota < 4.5: 15-25% de redução de pedidos × ticket
- Tempo > 40 min: 20-30% de abandono × ticket
- Margem baixa: `(margem_ideal - margem_atual) × revenue`

Cada causa quantificável vira obrigatoriamente um `money_leaks[]` com `monthly_estimate_brl`.

**Ordem de prioridade obrigatória**: (1) maior sangria de dinheiro; (2) mais fácil de resolver; (3) o resto.

**executive_summary**: linha 1 começa SEMPRE com R$/mês perdido; linhas 2-3 mostram a conta; aponta UMA causa-raiz; termina com frase imperativa. Máximo 6 linhas.

**plan_7_days**: title máx 5 palavras com verbo; `steps` sempre 3 passos imperativos citando o caminho real do painel (iFood Parceiros → Relatórios → Cancelados, conforme `platform` da loja); `time_minutes` realista; `expected_impact` com número.

**plan_30_days**: 4 semanas — semana 1 conclui o 7d, 2 e 3 com 1 objective + máx 2 actions, semana 4 sempre "Medir".

**do_not_do_now**: 2-3 itens com motivo explicativo embutido.

### Mantém

- Schema da tool `consultive_diagnosis` (já tem `steps`, `time_minutes`, `expected_impact`, `objective`, `actions`, `money_leaks` — adicionados na rodada anterior).
- Regras de aprendizado (memória, casos similares, knowledge base, source/source_ref).
- Regras anti-alucinação (só comentar evidências de RULE_EVIDENCES).

### Arquivo afetado

- `supabase/functions/ai-consult/index.ts` — apenas a constante `SYSTEM_PROMPT` (linhas ~17-63). Sem mudanças no schema nem no código de invocação.

### Observação sobre os campos do JSON

Seu spec usa nomes em português (`resumo_executivo`, `scores_por_area`, `problemas`, `plano_7_dias`, etc). Vou manter os nomes em inglês do schema atual (`executive_summary`, `plan_7_days`, etc) porque o frontend (`DiagnosisResult.tsx`, `AIConsultReport.tsx`) e os testes já consomem esses nomes — renomear quebraria a tela inteira. As REGRAS de conteúdo (cálculos, tom, formato) são todas aplicadas.

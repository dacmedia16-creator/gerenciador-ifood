# Diagnóstico IA Consultivo (especialista iFood)

Adicionar uma camada de IA no Relatório que aplica o prompt do gestor especialista em iFood sobre todos os dados já cadastrados da loja e devolve um diagnóstico consultivo estruturado.

## O que muda para o usuário

- No Relatório da loja, novo botão **"Gerar análise consultiva (IA)"**.
- Ao clicar, em ~10-20s aparece um bloco completo "Análise IA do Especialista" com:
  - Resumo executivo
  - Score geral + score por área (barras)
  - Gargalo principal
  - Diagnóstico por jornada (busca → entrada → clique → compra → entrega → recompra)
  - Lista de problemas (problema, evidência, causa, impacto, solução, prioridade, prazo)
  - Produtos que precisam de ajuste
  - Oportunidades de ticket médio
  - Riscos de margem
  - Próxima melhor ação
  - Plano de 7 dias
  - Diagnóstico final em 6 perguntas
- Resultado fica salvo no relatório — abrir de novo mostra a última análise.

## Arquitetura

```text
Relatório (UI) ──► invoke('ai-consult', { storeId })
                        │
                        ▼
              Edge Function ai-consult
                        │ valida JWT + RLS
                        │ coleta dados (stores, products, competitors,
                        │   reviews, metrics, diagnostics, último report)
                        ▼
            Lovable AI Gateway (gemini-2.5-pro)
              tool_choice: consultive_diagnosis  ◄── prompt do especialista
                        │
                        ▼
              JSON validado ──► merge em reports.report_data.ai_consult
                        │
                        ▼
              Render no <AIConsultReport />
```

## Detalhes técnicos

- **Edge function nova** `supabase/functions/ai-consult/index.ts`
  - System prompt = texto do especialista iFood + benchmarks (conversão 7/12/15%, 35min, 150 avaliações etc.).
  - User prompt = JSON com loja, produtos, concorrentes, avaliações (até 40), métricas (3 últimas), diagnósticos existentes e contexto do funil.
  - **Structured output via tool calling** (`consultive_diagnosis`) com schema cobrindo todos os campos pedidos — evita JSON malformado.
  - Modelo padrão: `google/gemini-2.5-pro` (raciocínio + contexto). Override por `body.model`.
  - Trata 429 / 402 retornando mensagens claras.
  - Persiste em `reports.report_data.ai_consult` (cria relatório se não existir). Sem migration.
- **Componente novo** `src/components/report/AIConsultReport.tsx`
  - Renderiza todos os blocos com Card / Badge / Progress.
  - `react-markdown` + `remark-gfm` no resumo executivo.
- **Edição** `src/pages/app/Report.tsx`
  - Botão "Gerar análise consultiva (IA)" com loading.
  - Carrega `report_data.ai_consult` existente e renderiza `<AIConsultReport />` no topo.
- **Dependências**: `react-markdown`, `remark-gfm` (instalar).
- **Segurança**: RLS já garante que o usuário só lê suas próprias lojas; a edge function usa o token do usuário no client Supabase, então só consegue ler/escrever o que ele pode.
- **Sem mudanças de schema**, sem novos secrets (`LOVABLE_API_KEY` já existe).

## Entregáveis

1. `supabase/functions/ai-consult/index.ts` (novo)
2. `src/components/report/AIConsultReport.tsx` (novo)
3. `src/pages/app/Report.tsx` (botão + render)
4. `package.json` com `react-markdown` + `remark-gfm`

Aprovando, eu implemento tudo num único ciclo.

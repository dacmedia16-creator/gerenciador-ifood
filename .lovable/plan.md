## O que muda na experiência

Hoje o `DiagnosisResult` já mostra tudo de uma vez (problemas + plano de ação + score), mas de forma resumida e "fria". Você quer:

1. **Ao finalizar** → mostrar uma **lista enumerada de problemas** (só título, área, severidade e impacto rápido). Sem despejar solução.
2. **Ao clicar em um problema** → abrir a **solução individual aprofundada** daquele item (causa, evidência, impacto, recomendação, ação prática, prazo, casos similares).

Isso reduz o "muro de texto" do final e deixa a experiência mais consultiva — parece que a IA está respondendo cada problema sob demanda.

## Melhor abordagem (recomendada)

**Lazy enrichment + drawer/expand** — o motor de regras continua gerando todos os diagnósticos no fim do funil (rápido e barato), mas a **solução detalhada/aprofundada de cada problema é gerada pela IA só quando o usuário clica** naquele card.

Vantagens:
- Finalização do funil fica rápida (segundos, sem esperar IA).
- Cada solução individual pode ser bem mais rica (a IA usa `match_cases`, `match_knowledge`, memória da loja só para *aquele* problema).
- Custo de IA distribuído — só gera o que o usuário realmente quer ler.
- Cacheável: a primeira vez gera, depois fica salvo na própria linha de `diagnostics` (campo `recommended_solution` enriquecido) ou em `recommendation_history`.

## Plano técnico

### 1. Reescrever `src/pages/app/diagnosis/DiagnosisResult.tsx`
- Manter o card de Score geral + áreas no topo.
- Substituir a seção "Principais problemas" por uma **lista numerada de TODOS os diagnósticos** (1, 2, 3…), agrupada por severidade (críticos primeiro, depois atenção, depois ok).
- Cada item da lista = card clicável compacto com: número, área, problema (título), badge de severidade/prioridade, 1 linha de impacto.
- Esconder o "Plano de ação priorizado" e "Principais oportunidades" atrás de uma aba secundária ("Visão geral" vs. "Problemas") — foco principal vira a lista de problemas.

### 2. Nova tela/drawer `ProblemDetail`
- Rota nova: `/app/diagnosis/:sessionId/problem/:diagnosticId` **ou** Sheet/Drawer lateral (preferível — mantém contexto da lista).
- Conteúdo:
  - Título + área + severidade
  - Evidência (do diagnóstico)
  - Causa provável
  - Impacto no negócio (com números quando houver)
  - **Solução detalhada** (carregada sob demanda — ver passo 3)
  - Ação prática + prazo
  - "Casos similares" (1-2 vindos de `match_cases`)
  - Botão "Marcar como aplicada" / "Ignorar" (já alimenta camada 2 do aprendizado)

### 3. Nova edge function `diagnose-problem-detail`
- Input: `{ diagnosticId }`.
- Verifica se o diagnóstico já tem solução enriquecida em cache (campo extra ou `recommendation_history`). Se sim, devolve.
- Se não:
  - Carrega o `diagnostic`, dados da loja e `store_memory`.
  - Roda `match_knowledge` + `match_cases` filtrando pela área/problema.
  - Chama Lovable AI (`google/gemini-2.5-flash`) com prompt focado em **um único problema**, devolvendo: solução detalhada, passo-a-passo, métrica esperada, riscos, casos similares.
  - Salva o resultado (atualiza `diagnostics.recommended_solution` + cria `recommendation_history` para tracking) e devolve.
- Custo e latência ficam baixos (1 problema por chamada, ~3-5s).

### 4. Loading/UX no detalhe
- Skeleton enquanto a IA processa.
- Streaming opcional (se quiser fica mais fluido) — pode ficar para depois.

## Arquivos

- **Editar:** `src/pages/app/diagnosis/DiagnosisResult.tsx` (lista enumerada + tabs)
- **Novo:** `src/components/diagnosis/ProblemDetailSheet.tsx` (drawer com detalhe)
- **Novo:** `supabase/functions/diagnose-problem-detail/index.ts` (enriquecimento sob demanda)
- **Migração SQL:** adicionar coluna `detailed_solution jsonb` em `diagnostics` para cachear o output da IA (evita regerar)

## Resultado prático

- Finalização do funil = lista limpa de problemas numerados (ex: "1. Vitrine sem capa profissional", "2. Tempo de entrega 15 min acima do prometido"…).
- Clique em qualquer problema → drawer abre com a análise aprofundada e a solução individualizada da IA.
- IA só gera o que o usuário lê → mais barato, mais rápido, mais consultivo.

Quer que eu siga por esse caminho? Se preferir um formato diferente (ex.: accordion expansível na mesma tela em vez de drawer, ou rota dedicada por problema), me diz que ajusto antes de implementar.
## Causa raiz

A tela "Diagnóstico gerado!" mostra:
- Score geral 56 com áreas baixas (Fotos 50, Promoções 50, Entrega 30)
- **0 problemas críticos** ("Nenhum problema crítico encontrado")
- **0 ações sugeridas** ("Sem ações sugeridas")

Existem **dois motores rodando em paralelo** com critérios diferentes:

1. `src/lib/diagnostics/engine.ts` → calcula o **score por área** (usado na tela). Quando faltam dados, atribui scores médios/baixos por padrão (50, 30 etc.).
2. `src/lib/diagnosis/rules.ts` → gera os **problemas e ações** (gravados em `diagnostics` e `action_plans`). Cada regra exige dados muito específicos do wizard:
   - Reputação exige `front.rating` ou `reviews.avg_rating`
   - Entrega exige `front.promised_delivery_time > 35`
   - Conversão exige `conversion.visits` + `conversion.orders`
   - Fotos exige `menu.without_photo` + `menu.products_total`
   - Margem exige `products[]` com `sale_price` e custos
   - Concorrência exige `competitors[]` cadastrados

A loja "Teste1" foi criada com cadastro mínimo, então **nenhuma regra dispara** → 0 diagnósticos → 0 ações. Mas o motor de score, com defaults, mostra áreas em 30/50, dando a falsa impressão de que "achou problemas mas não escreveu nada".

## O que mudar

### 1. `src/lib/diagnosis/rules.ts` — adicionar regras de fallback baseadas no que sempre existe

Quando dados específicos estão ausentes, gerar diagnóstico de **"dados insuficientes"** acionável (em vez de silenciar):

- Se `products.length === 0` e `menu.products_total` ausente → diagnóstico "Cardápio não cadastrado" (severidade `atencao`, ação: cadastrar produtos)
- Se `front.rating == null` e `reviews.avg_rating == null` → diagnóstico "Sem informação de reputação" (ação: informar nota atual)
- Se `conversion.visits == null && conversion.orders == null` → diagnóstico "Sem dados de funil" (ação: importar visitas/pedidos)
- Se `competitors.length === 0` → diagnóstico "Sem mapeamento de concorrência" (ação: cadastrar 3 concorrentes)
- Se `loyalty` totalmente vazio → já cai na regra atual de "sem recompra"

Também relaxar gatilhos óbvios:
- Rating threshold já é < 4.5; manter
- Entrega: usar também `store.promised_delivery_time` (vem do cadastro básico) como fallback além de `front.promised_delivery_time`
- Margem: se nenhum produto tem custos, gerar "custos de produtos não informados" (severidade `atencao`)

### 2. `src/lib/diagnosis/generate.ts` — garantir que o fluxo nunca termine em vazio

- Se `diagnostics.length === 0` após as novas regras de fallback, inserir 1 diagnóstico genérico "Cadastro insuficiente para diagnóstico aprofundado" + ação "Completar cadastro: produtos, concorrentes e funil de conversão" (assim a tela nunca fica 100% vazia)
- O `executive_summary` do report deve refletir a contagem correta

### 3. `src/pages/app/diagnosis/DiagnosisResult.tsx` — UX honesta quando faltam dados

- Quando `critical.length === 0` E `actions.length === 0`, em vez de "Nenhum problema crítico encontrado 🎉" (que confunde), mostrar:
  - Banner amarelo "Diagnóstico limitado por falta de dados"
  - Lista do que falta cadastrar (produtos, concorrentes, funil, avaliações)
  - CTAs diretos: "Cadastrar produtos", "Cadastrar concorrentes", "Informar funil"
- Quando há ações no plano, mostrar normalmente

### 4. Sem mudanças de schema

Nada no DB muda. Reaproveita `diagnostics` e `action_plans` existentes.

## Detalhes técnicos

```text
Wizard ──► generate.ts ──► rulesFromAnswers (rules.ts)
                                │
                                ├── regras "duras" (existentes) — só com dados
                                ├── NOVO: regras de cadastro incompleto
                                └── NOVO: garantia mínima de 1 diagnóstico

           ──► insert diagnostics + action_plans
           ──► insert reports

DiagnosisResult.tsx:
- critical.length === 0 && actions.length === 0
  → renderiza <IncompleteDataNotice /> com checklist + CTAs
- caso contrário → render atual
```

## Arquivos

- `src/lib/diagnosis/rules.ts` — adicionar ~6 regras de fallback (dados ausentes)
- `src/lib/diagnosis/generate.ts` — garantia de diagnóstico mínimo + summary correto
- `src/pages/app/diagnosis/DiagnosisResult.tsx` — UX para "dados insuficientes" com CTAs

## Resultado esperado

Para a loja "Teste1" atual: o relatório passa a mostrar de 3 a 6 itens claros do tipo "Cadastre seus produtos para análise de margem", "Informe visitas e pedidos para diagnóstico de conversão", em vez da tela enganosa de "0 problemas".

Para lojas com dados completos: comportamento atual preservado, com mais regras disparando.

Aprovando, implemento tudo num único ciclo.
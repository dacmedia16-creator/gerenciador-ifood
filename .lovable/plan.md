# Plano — Melhorias visuais em `DiagnosisResult.tsx`

Arquivo único: `src/pages/app/diagnosis/DiagnosisResult.tsx`. Schema do JSON da IA já compatível (campos `money_leaks`, `executive_summary`, `plan_7_days[].steps/time_minutes/expected_impact`, `missing_data_for_better_diagnosis`). Nenhuma mudança no edge function necessária.

## Bloco 1 — Score geral (reescrita do card)
- Layout em coluna única, centralizado:
  - Número grande (`text-7xl`/`text-8xl`) `{overall}`
  - Subtítulo `text-sm text-muted-foreground`: "de 100 pontos possíveis"
  - Badge variação semanal: usa `delta` já calculado (`previousScore`). Se `delta != null`: "▲ +N esta semana" (text-success/bg-success/10) ou "▼ -N esta semana" (text-destructive/bg-destructive/10). Se `delta === null`: ocultar.
  - Linha em destaque (fundo âmbar, `bg-amber-50 border-amber-200 text-amber-900`) abaixo: "Você pode estar perdendo ~{fmtBRL(totalLeak)}/mês". Só renderiza se `totalLeak > 0`.
- Manter benchmark? Sim, mas mover para dentro como linha pequena secundária abaixo do score (não tirar valor já existente).

## Bloco 2 — Score por área (3 seções)
- Reagrupar critério conforme spec exato:
  - urgent: `score < 50` → "🔴 Resolver agora" (mostra score + `~R$ X/mês` em vermelho se `leak > 0`)
  - improving: `score >= 50 && score < 75` → "🟡 Melhorar em breve" (só score amarelo)
  - ok: `score >= 75` → "🟢 Está bem" (score verde compacto, grid 2 colunas)
- Ordenar urgent por `leak desc, score asc`.

## Bloco 5 (movido para cima — entre score por área e análise)
- Card `bg-blue-50 border-blue-200`:
  - Ícone 💡 + título "Melhore a precisão do diagnóstico"
  - Texto fixo: "Adicionando mais dados, a IA consegue calcular seu lucro real e dar recomendações mais específicas."
  - Lista `<ul className="list-disc">` dos itens de `missingData`.
  - Botão "Adicionar dados →" linkando para `/app/diagnosis/${sessionId}` (rota atual de coleta).
- Remove o bloco "missing data" duplicado de cima.

## Bloco 3 — Análise inteligente
- `executive_summary`: classe `text-base` (16px) `leading-relaxed`. Primeira frase já vem com R$ pelo prompt.
- Antes do plano de 7 dias, adicionar `<p className="font-bold text-base">O que fazer agora — em ordem de prioridade:</p>`.

## Bloco 4 — Cards do plano 7 dias
- Cada item:
  - Badge "Dia X" (mantém)
  - Título em negrito `text-base`
  - `where_to_do` (campo: tentamos `p.where_to_do || p.onde_fazer`): linha cinza pequena com ícone `MapPin`: "📍 {where}"
  - `steps` (array): collapse via `<details>` nativo (sem dependência nova) — `<summary>Ver passo a passo ▾</summary>` + `<ol className="list-decimal">`. Fechado por padrão.
  - `time_minutes`: badge pequeno `<Badge variant="secondary">⏱ {n} min</Badge>`
  - `expected_impact`: `<p className="text-success italic text-sm">Resultado esperado: {…}</p>`

## Bloco 6 — Rodapé
- Substituir bloco atual por:
  - Botão primário largura total no mobile (`w-full sm:w-auto`): "Ir para o Plano de Ação →" → `/app/stores/{store_id}/action-plan`
  - Linha de 3 links text-sm centralizados separados por `·`:
    - "Relatório completo" → `/app/stores/{store_id}/report`
    - "Evolução da loja" → `/app/stores/{store_id}/evolution` (verificar rota existente; fallback `/app/dashboard` se não existir)
    - "Dashboard" → `/app/dashboard`
- Remover quaisquer botões "Ver minha meta" / "Ir para a loja" (já não estão presentes no rodapé atual; nada a remover além do bloco antigo).

## Detalhes técnicos
- Tipos: tratar campos opcionais do plano com `as { where_to_do?: string; ... }`; sem `any` novos.
- Mobile-first: classes `text-center md:text-left`, grid colapsa em 1 col ≤ sm.
- Manter ordem final: Header → Score → Score por área → Card "Melhore precisão" → Análise IA → Lista de problemas → Rodapé.
- Sem novas libs, só shadcn (`Card`, `Badge`, `Button`) + `<details>` nativo para collapse.

## Verificação rota "evolution"
Vou checar `App.tsx` durante implementação; se rota não existir, link aponta para `/app/stores/{id}/report` ou outra existente equivalente.

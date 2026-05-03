## Diagnóstico

Verifiquei os últimos 10 prints enviados no banco: **todos com `classification = "outro"`**. Isso quebra a cadeia inteira:

1. `process-print` recebe `classification = "outro"` → usa o schema só com `notes` (texto livre).
2. `structured_data` fica praticamente vazio (só `notes` + `_confidence`).
3. `printMapper.ts` ignora prints `outro` → nenhuma proposal é gerada.
4. O `useEffect` de auto-aplicar no `DiagnosisWizard` não tem nada para aplicar → nada preenche, nada navega.

A IA está lendo os prints (as `notes` mostram que reconheceu loja, avaliações, cardápio, faturamento, etc.), mas como o pipeline depende da classificação manual, o conteúdo nunca vira campo estruturado.

## Solução: auto-classificação na edge function

Vou fazer o `process-print` **classificar a imagem automaticamente** antes de extrair, em vez de depender do `defaultClassification` do uploader.

### Mudanças

**1. `supabase/functions/process-print/index.ts`**
- Antes da extração, fazer uma chamada curta à IA (ou incluir no mesmo prompt via tool) pedindo para escolher a classificação correta dentre o enum: `faturamento | indicadores | avaliacoes | cardapio | produto | promocoes | concorrentes | loja | outro`.
- Usar a classificação detectada para escolher o schema certo de extração.
- Salvar a classificação detectada em `diagnosis_uploads.classification` (sobrescrevendo o "outro" inicial).
- Manter o respeito à classificação se o usuário escolheu manualmente algo diferente de "outro" (regra: só auto-classifica quando vier "outro").

Implementação prática: uma única chamada à IA com **duas tools**:
- `classify_print(category, confidence)` — IA chama primeiro
- depois, no servidor, escolho o schema certo e faço a segunda chamada `extract_print_data` com o schema correspondente.

Mais simples e barato: **uma chamada só** com prompt: "Primeiro identifique a categoria do print. Depois extraia os campos relevantes." Tool única com `category` + `structured` (union de todos os schemas, com `additionalProperties: true` no `structured` para aceitar qualquer campo dos 9 schemas). O servidor depois filtra/normaliza pela `category` retornada.

Vou seguir essa segunda abordagem (uma chamada só, mais rápida e mais barata).

**2. `src/lib/diagnosis/printMapper.ts`**
- Ampliar o mapeamento para também tratar `produto` e `promocoes` (hoje são ignorados).
- Garantir que se a IA devolver campos válidos mesmo em `outro`, eles ainda sejam aproveitados (fallback: tentar mapear todos os campos conhecidos independente da classificação).

**3. `src/components/diagnosis/PrintUploader.tsx`**
- Mudar o texto do badge "Analisando…" para deixar claro que a IA também está identificando o tipo do print.
- Quando o backend devolver classificação detectada, refletir no `<select>` automaticamente (já acontece via `load()` após o `invoke`, só preciso garantir que o select use o valor atualizado).

### Resultado esperado

```text
Usuário envia 8 prints sem classificar
  → process-print classifica cada um (cardapio, avaliacoes, loja…)
  → extrai os campos certos (rating, products_visible, has_combos…)
  → printMapper gera proposals
  → DiagnosisWizard auto-aplica e pula para o próximo step incompleto
```

### Arquivos afetados

- `supabase/functions/process-print/index.ts` — auto-classificação + extração combinadas
- `src/lib/diagnosis/printMapper.ts` — mapeamentos para `produto` e `promocoes`, fallback
- `src/components/diagnosis/PrintUploader.tsx` — micro-ajustes de UX

Sem mudanças de schema no banco.

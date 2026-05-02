## Sistema de feedback por solução de diagnóstico

Cada problema do diagnóstico ganha botões de avaliação no drawer. O feedback é salvo no próprio diagnóstico e alimenta a `case_library` global de forma anonimizada — fechando o ciclo de aprendizado contínuo da IA.

## UX

No rodapé do `ProblemDetailSheet`, abaixo da solução:

- 👍 **Útil** / 👎 **Não útil**
- ✅ **Apliquei** / ❌ **Ignorei**
- Quando "Não útil": botões de motivo (*errada*, *falta contexto*, *difícil de executar*)
- Campo opcional de comentário
- Após enviar: "Feedback registrado — a IA vai aprender com isso" e mostra o último voto

Disponível para **todo dono de loja**, não só admin.

## Plano técnico

### 1. Edge function `rate-diagnostic`
- Input: `{ diagnosticId, rating, applied?, comment? }`
- Valida JWT + ownership via RLS (lê o `diagnostic` com client autenticado).
- Salva o feedback dentro de `diagnostics.detailed_solution._feedback` (histórico) e `_last_feedback` (último), via service role.
- Quando o sinal é claro (positivo/negativo), insere linha **anonimizada** na `case_library` com `outcome` correspondente — só `category` e `platform`, sem `store_id`/`user_id`/nome.

### 2. Componente `ProblemFeedback.tsx`
- Estilo similar ao `RecommendationFeedback`.
- Props: `diagnosticId`, `initialFeedback` (último voto vindo de `_last_feedback`).
- Estado local + toast após envio.

### 3. Integração no `ProblemDetailSheet`
- Renderiza `<ProblemFeedback />` no rodapé do drawer.
- Lê `detailed_solution._last_feedback` para mostrar estado atual.

## Privacidade

- Feedback fica no JSON do próprio `diagnostic` (RLS de `has_store_access` já protege).
- Inserção em `case_library` é via service role e **não inclui** `store_id`, `user_id`, nome ou cidade.

## Arquivos

- **Novo:** `supabase/functions/rate-diagnostic/index.ts`
- **Novo:** `src/components/diagnosis/ProblemFeedback.tsx`
- **Editar:** `src/components/diagnosis/ProblemDetailSheet.tsx`
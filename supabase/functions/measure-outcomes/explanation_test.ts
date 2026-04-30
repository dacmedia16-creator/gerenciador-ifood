// Testes da função pura buildExplanation — não toca em rede/banco.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildExplanation } from "./index.ts";

Deno.test("rule_id sem TARGETS → inconclusivo + mensagem genérica", () => {
  const r = buildExplanation({ ruleId: "rule_inexistente", before: 100, after: 120 });
  assertEquals(r.outcome, "inconclusivo");
  assertStringIncludes(r.explanation, "métrica objetiva");
  assertEquals(r.deltaPct, null);
  assertEquals(r.targetKey, null);
});

Deno.test("rating subiu 7% → positivo (better=up)", () => {
  const r = buildExplanation({ ruleId: "rating_baixo", before: 4.20, after: 4.50 });
  assertEquals(r.outcome, "positivo");
  assertEquals(r.targetKey, "rating");
  assertStringIncludes(r.explanation, "sua nota melhorou");
  assertStringIncludes(r.explanation, "4.20");
  assertStringIncludes(r.explanation, "4.50");
});

Deno.test("rating caiu 10% → negativo", () => {
  const r = buildExplanation({ ruleId: "rating_baixo", before: 4.5, after: 4.0 });
  assertEquals(r.outcome, "negativo");
  assertStringIncludes(r.explanation, "piorou");
});

Deno.test("variação <5% → neutro", () => {
  const r = buildExplanation({ ruleId: "rating_baixo", before: 4.5, after: 4.55 });
  assertEquals(r.outcome, "neutro");
  assertStringIncludes(r.explanation, "ficou estável");
});

Deno.test("cancellation caiu 20% → positivo (better=down)", () => {
  const r = buildExplanation({ ruleId: "cancelamento_alto", before: 10, after: 8 });
  assertEquals(r.outcome, "positivo");
  assertStringIncludes(r.explanation, "taxa de cancelamento melhorou");
});

Deno.test("delivery_time subiu → negativo (better=down)", () => {
  const r = buildExplanation({ ruleId: "tempo_entrega_alto", before: 30, after: 40 });
  assertEquals(r.outcome, "negativo");
  assertStringIncludes(r.explanation, "tempo de entrega prometido piorou");
});

Deno.test("before=0 → inconclusivo (sem dados suficientes)", () => {
  const r = buildExplanation({ ruleId: "rating_baixo", before: 0, after: 4.5 });
  assertEquals(r.outcome, "inconclusivo");
  assertStringIncludes(r.explanation, "Ainda não há dados");
});

Deno.test("after null/NaN → inconclusivo", () => {
  const r = buildExplanation({ ruleId: "rating_baixo", before: 4.0, after: null });
  assertEquals(r.outcome, "inconclusivo");
});

Deno.test("ruleId null → inconclusivo (recomendação sem métrica)", () => {
  const r = buildExplanation({ ruleId: null, before: 1, after: 2 });
  assertEquals(r.outcome, "inconclusivo");
  assertEquals(r.targetKey, null);
});

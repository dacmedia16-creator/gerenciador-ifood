// Garante que a validação anti-alucinação derruba refs inventadas pela IA
// e protege o ciclo de aprendizado.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyDiagnosisValidation } from "../_shared/validate-diagnosis.ts";

const sets = {
  validRuleIds: new Set(["rating_baixo", "ticket_baixo"]),
  validRecIds: new Set(["rec-1", "rec-2"]),
  validCaseIds: new Set(["case-1"]),
  validKbIds: new Set(["kb-1"]),
};

Deno.test("descarta main_problem com rule_id inexistente", () => {
  const diag: any = {
    main_problems: [
      { rule_id: "inventado", title: "x", why_it_matters: "x", evidence_cited: "x", confidence: "alta", source: "evidence", source_ref: "inventado" },
      { rule_id: "rating_baixo", title: "y", why_it_matters: "y", evidence_cited: "y", confidence: "alta", source: "evidence", source_ref: "rating_baixo" },
    ],
  };
  const { diagnosis, dropped } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 1);
  assertEquals(diagnosis.main_problems![0].rule_id, "rating_baixo");
  assertEquals(dropped.problems, 1);
});

Deno.test("descarta avoided_repetition com recommendation_id desconhecido", () => {
  const diag: any = {
    main_problems: [],
    avoided_repetitions: [
      { recommendation_id: "rec-1", reason: "ok" },
      { recommendation_id: "fake", reason: "fake" },
    ],
  };
  const { diagnosis, dropped } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.avoided_repetitions!.length, 1);
  assertEquals(dropped.avoided, 1);
});

Deno.test("hard-fail quando RULE_EVIDENCES está vazio mas IA inventou problemas", () => {
  const diag: any = {
    main_problems: [{ rule_id: "x", title: "x", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "evidence", source_ref: "x" }],
    plan_7_days: [{ day: 1, title: "x", action: "x", rule_id: "x" }],
  };
  const { diagnosis, hardFailed } = applyDiagnosisValidation(diag, {
    validRuleIds: new Set(),
    validRecIds: new Set(),
    validCaseIds: new Set(),
    validKbIds: new Set(),
  });
  assertEquals(hardFailed, true);
  assertEquals(diagnosis.main_problems!.length, 0);
  assertEquals(diagnosis.plan_7_days!.length, 0);
});

Deno.test("source store_history com rec_id inválido é descartado", () => {
  const diag: any = {
    main_problems: [
      { rule_id: "rating_baixo", title: "x", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "store_history", source_ref: "rec-fantasma" },
      { rule_id: "rating_baixo", title: "y", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "store_history", source_ref: "rec-1" },
    ],
  };
  const { diagnosis } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 1);
  assertEquals(diagnosis.main_problems![0].source_ref, "rec-1");
});

Deno.test("source similar_case e knowledge_base sem ref válido são descartados", () => {
  const diag: any = {
    main_problems: [
      { rule_id: "rating_baixo", title: "a", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "similar_case", source_ref: "ghost" },
      { rule_id: "rating_baixo", title: "b", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "similar_case", source_ref: "case-1" },
      { rule_id: "rating_baixo", title: "c", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "knowledge_base", source_ref: "ghost" },
      { rule_id: "rating_baixo", title: "d", why_it_matters: "", evidence_cited: "", confidence: "alta", source: "knowledge_base", source_ref: "kb-1" },
    ],
  };
  const { diagnosis } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 2);
  assertEquals(diagnosis.main_problems!.map((p: any) => p.title).sort(), ["b", "d"]);
});

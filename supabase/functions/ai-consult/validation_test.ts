// Testes unitários da validação anti-alucinação do ai-consult.
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { applyDiagnosisValidation } from "../_shared/validate-diagnosis.ts";

const sets = {
  validRuleIds: new Set(["rule_a", "rule_b"]),
  validRecIds: new Set(["rec_1"]),
  validCaseIds: new Set(["case_1"]),
  validKbIds: new Set(["kb_1"]),
};

Deno.test("descarta main_problem com rule_id inexistente", () => {
  const diag = {
    main_problems: [
      { rule_id: "rule_a", source: "evidence", source_ref: "rule_a" },
      { rule_id: "rule_inventado", source: "evidence", source_ref: "rule_inventado" },
    ],
  };
  const { diagnosis, dropped } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 1);
  assertEquals(dropped.problems, 1);
});

Deno.test("descarta source_ref de tipo errado", () => {
  const diag = {
    main_problems: [
      { rule_id: "rule_a", source: "similar_case", source_ref: "case_inexistente" },
      { rule_id: "rule_b", source: "knowledge_base", source_ref: "kb_inexistente" },
      { rule_id: "rule_a", source: "store_history", source_ref: "rec_inexistente" },
    ],
  };
  const { diagnosis, dropped } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 0);
  assertEquals(dropped.problems, 3);
});

Deno.test("normaliza source=evidence quando source_ref ≠ rule_id", () => {
  const diag = {
    main_problems: [{ rule_id: "rule_a", source: "evidence", source_ref: "qualquer_coisa" }],
  };
  const { diagnosis } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.main_problems!.length, 1);
  assertEquals(diagnosis.main_problems![0].source_ref, "rule_a");
});

Deno.test("hard fail quando RULE_EVIDENCES vazio mas IA inventou problemas", () => {
  const emptySets = { ...sets, validRuleIds: new Set<string>() };
  const diag = {
    main_problems: [{ rule_id: "qualquer", source: "evidence", source_ref: "qualquer" }],
    plan_7_days: [{ rule_id: "qualquer", day: 1, title: "x", action: "y" }],
  };
  const { diagnosis, hardFailed } = applyDiagnosisValidation(diag, emptySets);
  assertEquals(hardFailed, true);
  assertEquals(diagnosis.main_problems!.length, 0);
  assertEquals(diagnosis.plan_7_days!.length, 0);
});

Deno.test("descarta avoided_repetitions com id inexistente", () => {
  const diag = {
    avoided_repetitions: [
      { recommendation_id: "rec_1", reason: "ok" },
      { recommendation_id: "rec_fake", reason: "x" },
    ],
  };
  const { diagnosis, dropped } = applyDiagnosisValidation(diag, sets);
  assertEquals(diagnosis.avoided_repetitions!.length, 1);
  assertEquals(dropped.avoided, 1);
});

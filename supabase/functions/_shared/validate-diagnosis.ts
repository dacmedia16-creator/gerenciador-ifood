// Lógica pura de validação anti-alucinação do diagnóstico da IA.
// Extraída para permitir testes unitários (sem precisar de Supabase/HTTP).

export interface ValidationSets {
  validRuleIds: Set<string>;
  validRecIds: Set<string>;
  validCaseIds: Set<string>;
  validKbIds: Set<string>;
}

export interface DiagnosisShape {
  main_problems?: any[];
  priority_ranking?: any[];
  plan_7_days?: any[];
  plan_30_days?: any[];
  avoided_repetitions?: any[];
  [k: string]: any;
}

export interface ValidationDropCounts {
  problems: number;
  ranking: number;
  plan7: number;
  plan30: number;
  avoided: number;
}

export function isValidProblem(p: any, sets: ValidationSets): boolean {
  if (!p || typeof p !== "object") return false;
  if (!sets.validRuleIds.has(p.rule_id)) return false;
  if (p.source === "store_history" && !sets.validRecIds.has(p.source_ref)) return false;
  if (p.source === "similar_case" && !sets.validCaseIds.has(p.source_ref)) return false;
  if (p.source === "knowledge_base" && !sets.validKbIds.has(p.source_ref)) return false;
  if (p.source === "evidence" && p.source_ref !== p.rule_id) {
    // tolera — normaliza para o próprio rule_id
    p.source_ref = p.rule_id;
  }
  return true;
}

export function applyDiagnosisValidation(
  diagnosis: DiagnosisShape,
  sets: ValidationSets,
): { diagnosis: DiagnosisShape; dropped: ValidationDropCounts; hardFailed: boolean } {
  const before = {
    problems: diagnosis.main_problems?.length ?? 0,
    ranking: diagnosis.priority_ranking?.length ?? 0,
    plan7: diagnosis.plan_7_days?.length ?? 0,
    plan30: diagnosis.plan_30_days?.length ?? 0,
    avoided: diagnosis.avoided_repetitions?.length ?? 0,
  };

  // HARD FAIL: se não há nenhuma evidência válida, descartar TODOS os problemas/planos.
  // A IA não deve "achar" coisa quando o motor de regras não encontrou nada.
  const hardFailed = sets.validRuleIds.size === 0 && before.problems > 0;
  if (hardFailed) {
    diagnosis.main_problems = [];
    diagnosis.priority_ranking = [];
    diagnosis.plan_7_days = [];
    diagnosis.plan_30_days = [];
  } else {
    diagnosis.main_problems = (diagnosis.main_problems ?? []).filter((p) => isValidProblem(p, sets));
    diagnosis.priority_ranking = (diagnosis.priority_ranking ?? []).filter((p: any) =>
      sets.validRuleIds.has(p?.rule_id),
    );
    diagnosis.plan_7_days = (diagnosis.plan_7_days ?? []).filter((p: any) =>
      sets.validRuleIds.has(p?.rule_id),
    );
    diagnosis.plan_30_days = (diagnosis.plan_30_days ?? []).filter((p: any) =>
      sets.validRuleIds.has(p?.rule_id),
    );
  }

  diagnosis.avoided_repetitions = (diagnosis.avoided_repetitions ?? []).filter((a: any) =>
    sets.validRecIds.has(a?.recommendation_id),
  );

  const dropped: ValidationDropCounts = {
    problems: before.problems - diagnosis.main_problems!.length,
    ranking: before.ranking - diagnosis.priority_ranking!.length,
    plan7: before.plan7 - diagnosis.plan_7_days!.length,
    plan30: before.plan30 - diagnosis.plan_30_days!.length,
    avoided: before.avoided - diagnosis.avoided_repetitions!.length,
  };

  return { diagnosis, dropped, hardFailed };
}

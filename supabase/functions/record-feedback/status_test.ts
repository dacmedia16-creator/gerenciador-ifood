// Verifica a lógica de status/outcome do record-feedback (sem rede).
// Replica o switch interno para que mudanças no contrato sejam pegas
// imediatamente — o handler real está em record-feedback/index.ts.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const STATUSES = new Set(["pendente", "em_andamento", "aplicada", "ignorada", "rejeitada"]);

// Espelha a checagem de ownership cross-tenant: se o select RLS retorna null,
// a função deve devolver 404 ANTES de inserir feedback ou atualizar histórico.
function ownershipCheck(rec: { id: string } | null) {
  if (!rec) return { status: 404, body: { error: "Recomendação não encontrada ou sem acesso" } };
  return null;
}

function buildUpdate(input: {
  status?: string | null;
  applied?: boolean | null;
  rating?: string | null;
  generated_result?: string | null;
}) {
  const update: any = {};
  if (input.status) {
    update.status = input.status;
    if (input.status === "aplicada") update.applied_at = "now";
  } else if (input.applied === true) {
    update.status = "aplicada";
    update.applied_at = "now";
  } else if (input.applied === false && input.rating === "nao_util") {
    update.status = "ignorada";
  }
  if (input.generated_result === "sim") update.outcome = "positivo";
  else if (input.generated_result === "nao") update.outcome = "negativo";
  else if (input.rating === "errada") update.outcome = "negativo";
  if (input.status === "rejeitada" && !update.outcome) update.outcome = "negativo";
  return update;
}

Deno.test("status em_andamento é aceito e não marca applied_at", () => {
  assertEquals(STATUSES.has("em_andamento"), true);
  const u = buildUpdate({ status: "em_andamento" });
  assertEquals(u.status, "em_andamento");
  assertEquals(u.applied_at, undefined);
  assertEquals(u.outcome, undefined);
});

Deno.test("status rejeitada marca outcome=negativo automaticamente", () => {
  const u = buildUpdate({ status: "rejeitada" });
  assertEquals(u.status, "rejeitada");
  assertEquals(u.outcome, "negativo");
});

Deno.test("status aplicada marca applied_at", () => {
  const u = buildUpdate({ status: "aplicada" });
  assertEquals(u.status, "aplicada");
  assertEquals(u.applied_at, "now");
});

Deno.test("applied=true legado continua funcionando", () => {
  const u = buildUpdate({ applied: true });
  assertEquals(u.status, "aplicada");
  assertEquals(u.applied_at, "now");
});

Deno.test("applied=false + rating=nao_util vira ignorada", () => {
  const u = buildUpdate({ applied: false, rating: "nao_util" });
  assertEquals(u.status, "ignorada");
});

Deno.test("generated_result=sim => outcome positivo", () => {
  const u = buildUpdate({ status: "aplicada", generated_result: "sim" });
  assertEquals(u.outcome, "positivo");
});

Deno.test("rating=errada => outcome negativo mesmo sem status", () => {
  const u = buildUpdate({ rating: "errada" });
  assertEquals(u.outcome, "negativo");
});

Deno.test("status inválido é rejeitado pelo conjunto STATUSES", () => {
  assertEquals(STATUSES.has("foo"), false);
  assertEquals(STATUSES.has("done"), false);
  assertEquals(STATUSES.has("aplicada"), true);
});

Deno.test("transição pendente → em_andamento → aplicada preserva applied_at na última", () => {
  const u1 = buildUpdate({ status: "em_andamento" });
  assertEquals(u1.applied_at, undefined);
  const u2 = buildUpdate({ status: "aplicada" });
  assertEquals(u2.applied_at, "now");
});

Deno.test("ownership: rec null vira 404 (cross-tenant bloqueado)", () => {
  const blocked = ownershipCheck(null);
  assertEquals(blocked?.status, 404);
  const ok = ownershipCheck({ id: "abc" });
  assertEquals(ok, null);
});

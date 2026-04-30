import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PRIMARY = rgb(0.93, 0.34, 0.07); // laranja
const TEXT = rgb(0.1, 0.1, 0.15);
const MUTED = rgb(0.45, 0.45, 0.5);
const RED = rgb(0.9, 0.2, 0.2);
const AMBER = rgb(0.95, 0.6, 0.1);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { store_id } = await req.json();
    if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: store } = await admin.from("stores").select("*").eq("id", store_id).eq("user_id", userData.user.id).maybeSingle();
    if (!store) return jsonResponse({ error: "Loja não encontrada" }, 404);

    const [{ data: diagnostics }, { data: actions }, { data: lastReport }] = await Promise.all([
      admin.from("diagnostics").select("*").eq("store_id", store_id),
      admin.from("action_plans").select("*").eq("store_id", store_id).order("priority"),
      admin.from("reports").select("*").eq("store_id", store_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let page = pdf.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 60;

    const drawText = (txt: string, x: number, yPos: number, opts: any = {}) => {
      page.drawText(sanitize(txt), {
        x, y: yPos, size: opts.size ?? 11,
        font: opts.bold ? fontBold : font,
        color: opts.color ?? TEXT,
        maxWidth: opts.maxWidth ?? width - x - 50,
      });
    };

    const newPage = () => { page = pdf.addPage([595, 842]); y = height - 60; };
    const ensure = (needed: number) => { if (y - needed < 60) newPage(); };

    // Capa
    page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: PRIMARY });
    drawText("RELATÓRIO CONSULTIVO", 50, height - 60, { size: 22, bold: true, color: rgb(1, 1, 1) });
    drawText("Gestor IA de Delivery", 50, height - 85, { size: 12, color: rgb(1, 1, 1) });
    y = height - 160;

    drawText(store.name, 50, y, { size: 26, bold: true }); y -= 28;
    drawText(`${store.platform ?? ""} · ${store.city ?? ""} · ${store.neighborhood ?? ""}`, 50, y, { size: 11, color: MUTED }); y -= 16;
    drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 50, y, { size: 10, color: MUTED }); y -= 32;

    // Score
    const score = lastReport?.general_score ?? 0;
    page.drawRectangle({ x: 50, y: y - 80, width: 200, height: 80, color: rgb(0.97, 0.97, 0.99), borderColor: PRIMARY, borderWidth: 2 });
    drawText("SCORE GERAL", 65, y - 25, { size: 9, bold: true, color: MUTED });
    drawText(`${score}/100`, 65, y - 60, { size: 32, bold: true, color: PRIMARY });

    const kpis = [
      ["Faturamento", `R$ ${Number(store.monthly_revenue ?? 0).toLocaleString("pt-BR")}`],
      ["Pedidos/mês", String(store.monthly_orders ?? "-")],
      ["Ticket médio", `R$ ${store.average_ticket ?? "-"}`],
      ["Nota", `${store.rating ?? "-"} ★`],
    ];
    let kx = 270;
    kpis.forEach(([label, val]) => {
      drawText(label, kx, y - 25, { size: 8, color: MUTED });
      drawText(val, kx, y - 45, { size: 12, bold: true });
      kx += 75;
    });
    y -= 110;

    // Resumo executivo
    ensure(120);
    drawText("Resumo executivo", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
    const summary = lastReport?.executive_summary ?? "Relatório baseado nos dados atuais da loja. Rode o diagnóstico com IA para um resumo personalizado.";
    y = drawWrapped(page, font, summary, 50, y, width - 100, 11, TEXT, 14);
    y -= 20;

    // Problemas críticos
    ensure(80);
    drawText("Problemas identificados", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
    const sorted = (diagnostics ?? []).sort((a: any, b: any) => (a.severity === "critico" ? -1 : 1));
    if (sorted.length === 0) {
      drawText("Nenhum problema crítico detectado.", 50, y, { size: 11, color: MUTED }); y -= 20;
    } else {
      for (const d of sorted) {
        ensure(80);
        const c = d.severity === "critico" ? RED : AMBER;
        page.drawRectangle({ x: 50, y: y - 4, width: 4, height: 60, color: c });
        drawText(`[${(d.severity ?? "").toUpperCase()}] ${d.area}`, 62, y, { size: 10, bold: true, color: c }); y -= 14;
        y = drawWrapped(page, fontBold, d.problem ?? "", 62, y, width - 120, 11, TEXT, 13);
        y = drawWrapped(page, font, `Solução: ${d.recommended_solution ?? ""}`, 62, y, width - 120, 10, MUTED, 12);
        y -= 10;
      }
    }

    // Plano de ação
    ensure(80);
    drawText("Plano de ação priorizado", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
    const acts = (actions ?? []).slice(0, 15);
    if (acts.length === 0) {
      drawText("Nenhuma ação cadastrada.", 50, y, { size: 11, color: MUTED }); y -= 20;
    } else {
      acts.forEach((a: any, i: number) => {
        ensure(40);
        drawText(`${i + 1}. ${a.title}`, 50, y, { size: 11, bold: true }); y -= 14;
        drawText(`Área: ${a.area ?? "-"} · Prioridade: ${a.priority ?? "-"} · Impacto: ${a.impact ?? "-"}`, 60, y, { size: 9, color: MUTED });
        y -= 18;
      });
    }

    // Footer
    const pages = pdf.getPages();
    pages.forEach((p, idx) => {
      p.drawText(`${idx + 1}/${pages.length}  ·  Gestor IA de Delivery`, {
        x: 50, y: 30, size: 8, font, color: MUTED,
      });
    });

    const bytes = await pdf.save();
    const filename = `${store_id}/${Date.now()}-relatorio.pdf`;
    const { error: upErr } = await admin.storage.from("reports").upload(filename, bytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage.from("reports").createSignedUrl(filename, 3600);

    return jsonResponse({ success: true, url: signed?.signedUrl, path: filename });
  } catch (e) {
    console.error("generate-report-pdf error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function sanitize(s: string) {
  // pdf-lib (WinAnsi) não suporta todos os unicode; remove emojis
  return (s ?? "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
}

function drawWrapped(
  page: any, font: any, text: string, x: number, y: number,
  maxWidth: number, size: number, color: any, lineHeight: number,
): number {
  const words = sanitize(text).split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const wd = font.widthOfTextAtSize(test, size);
    if (wd > maxWidth && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight; line = w;
    } else line = test;
  }
  if (line) { page.drawText(line, { x, y, size, font, color }); y -= lineHeight; }
  return y;
}

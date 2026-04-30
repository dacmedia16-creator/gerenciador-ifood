import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TEXT = rgb(0.1, 0.1, 0.15);
const MUTED = rgb(0.45, 0.45, 0.5);
const RED = rgb(0.9, 0.2, 0.2);
const AMBER = rgb(0.95, 0.6, 0.1);

function hexToRgb(hex: string) {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex ?? "");
  if (!m) return rgb(0.93, 0.34, 0.07);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const KPI_LABEL: Record<string, string> = {
  revenue: "Faturamento",
  orders: "Pedidos/mes",
  ticket: "Ticket medio",
  rating: "Nota",
  cancellation: "Cancelamentos",
  delivery_time: "Tempo entrega",
};

function kpiValue(key: string, store: any) {
  switch (key) {
    case "revenue": return `R$ ${Number(store.monthly_revenue ?? 0).toLocaleString("pt-BR")}`;
    case "orders": return String(store.monthly_orders ?? "-");
    case "ticket": return `R$ ${store.average_ticket ?? "-"}`;
    case "rating": return `${store.rating ?? "-"} *`;
    case "cancellation": return store.cancellation_rate != null ? `${store.cancellation_rate}%` : "-";
    case "delivery_time": return store.promised_delivery_time ? `${store.promised_delivery_time} min` : "-";
    default: return "-";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { store_id } = await req.json();
    if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: store } = await admin.from("stores").select("*").eq("id", store_id).eq("user_id", userData.user.id).maybeSingle();
    if (!store) return jsonResponse({ error: "Loja nao encontrada" }, 404);

    const [{ data: diagnostics }, { data: actions }, { data: lastReport }, { data: template }] = await Promise.all([
      admin.from("diagnostics").select("*").eq("store_id", store_id),
      admin.from("action_plans").select("*").eq("store_id", store_id).order("priority"),
      admin.from("reports").select("*").eq("store_id", store_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("report_templates").select("*").eq("store_id", store_id).maybeSingle(),
    ]);

    const PRIMARY = hexToRgb(template?.primary_color ?? "#ED5712");
    const kpiOrder: string[] = (template?.kpi_order as string[]) ?? ["revenue", "orders", "ticket", "rating"];
    const sections: { key: string; enabled: boolean }[] =
      (template?.sections as any[]) ?? [
        { key: "cover", enabled: true },
        { key: "summary", enabled: true },
        { key: "score", enabled: true },
        { key: "problems", enabled: true },
        { key: "actions", enabled: true },
        { key: "questions", enabled: true },
        { key: "reviews", enabled: false },
      ];
    const enabled = (k: string) => sections.find((s) => s.key === k)?.enabled ?? false;
    const displayName = template?.display_name?.trim() || store.name;
    const tagline = template?.tagline?.trim() || "Relatorio consultivo";
    const footerText = template?.footer_text?.trim() || "Gestor IA de Delivery";

    // Carregar logo (se houver)
    let logoImg: any = null;
    let logoDims: { w: number; h: number } | null = null;
    if (template?.logo_url) {
      try {
        const r = await fetch(template.logo_url);
        if (r.ok) {
          const buf = new Uint8Array(await r.arrayBuffer());
          const ct = r.headers.get("content-type") ?? "";
          // tentativa: png ou jpg
          const tmpDoc = await PDFDocument.create();
          if (ct.includes("png")) {
            logoImg = await tmpDoc.embedPng(buf);
          } else {
            logoImg = await tmpDoc.embedJpg(buf);
          }
          logoDims = { w: logoImg.width, h: logoImg.height };
          // re-embed no doc final mais abaixo (simpler: mantemos os bytes)
          (logoImg as any)._bytes = buf;
          (logoImg as any)._isPng = ct.includes("png");
        }
      } catch (e) {
        console.warn("logo fetch failed", e);
      }
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let embeddedLogo: any = null;
    if (logoImg) {
      embeddedLogo = (logoImg as any)._isPng
        ? await pdf.embedPng((logoImg as any)._bytes)
        : await pdf.embedJpg((logoImg as any)._bytes);
    }

    let page = pdf.addPage([595, 842]);
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

    // ===== SECTIONS in order =====
    for (const sec of sections) {
      if (!sec.enabled) continue;

      if (sec.key === "cover") {
        page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: PRIMARY });
        drawText("RELATORIO CONSULTIVO", 50, height - 60, { size: 22, bold: true, color: rgb(1, 1, 1) });
        drawText(tagline, 50, height - 85, { size: 12, color: rgb(1, 1, 1) });

        // Logo no canto superior direito
        if (embeddedLogo && logoDims) {
          const maxH = 60;
          const scale = Math.min(maxH / logoDims.h, 120 / logoDims.w);
          const w = logoDims.w * scale;
          const h = logoDims.h * scale;
          page.drawImage(embeddedLogo, {
            x: width - w - 40,
            y: height - 30 - h,
            width: w,
            height: h,
          });
        }

        y = height - 160;
        drawText(displayName, 50, y, { size: 26, bold: true }); y -= 28;
        drawText(`${store.platform ?? ""} - ${store.city ?? ""} - ${store.neighborhood ?? ""}`, 50, y, { size: 11, color: MUTED }); y -= 16;
        drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 50, y, { size: 10, color: MUTED }); y -= 32;

        // KPIs (na ordem do template)
        const score = lastReport?.general_score ?? 0;
        page.drawRectangle({ x: 50, y: y - 80, width: 200, height: 80, color: rgb(0.97, 0.97, 0.99), borderColor: PRIMARY, borderWidth: 2 });
        drawText("SCORE GERAL", 65, y - 25, { size: 9, bold: true, color: MUTED });
        drawText(`${score}/100`, 65, y - 60, { size: 32, bold: true, color: PRIMARY });

        let kx = 270;
        for (const k of kpiOrder.slice(0, 4)) {
          drawText(KPI_LABEL[k] ?? k, kx, y - 25, { size: 8, color: MUTED });
          drawText(kpiValue(k, store), kx, y - 45, { size: 12, bold: true });
          kx += 75;
        }
        y -= 110;
        continue;
      }

      if (sec.key === "summary") {
        ensure(120);
        drawText("Resumo executivo", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const summary = lastReport?.executive_summary ?? "Relatorio baseado nos dados atuais da loja. Rode o diagnostico com IA para um resumo personalizado.";
        y = drawWrapped(page, font, summary, 50, y, width - 100, 11, TEXT, 14);
        y -= 20;
        continue;
      }

      if (sec.key === "score") {
        ensure(80);
        drawText("Score por area", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const score = lastReport?.general_score ?? 0;
        drawText(`Score geral: ${score}/100`, 50, y, { size: 12, bold: true }); y -= 18;
        drawText("Detalhamento disponivel na area de Score do app.", 50, y, { size: 10, color: MUTED });
        y -= 24;
        continue;
      }

      if (sec.key === "problems") {
        ensure(80);
        drawText("Problemas identificados", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const sorted = (diagnostics ?? []).sort((a: any, b: any) => (a.severity === "critico" ? -1 : 1));
        if (sorted.length === 0) {
          drawText("Nenhum problema critico detectado.", 50, y, { size: 11, color: MUTED }); y -= 20;
        } else {
          for (const d of sorted) {
            ensure(80);
            const c = d.severity === "critico" ? RED : AMBER;
            page.drawRectangle({ x: 50, y: y - 4, width: 4, height: 60, color: c });
            drawText(`[${(d.severity ?? "").toUpperCase()}] ${d.area}`, 62, y, { size: 10, bold: true, color: c }); y -= 14;
            y = drawWrapped(page, fontBold, d.problem ?? "", 62, y, width - 120, 11, TEXT, 13);
            y = drawWrapped(page, font, `Solucao: ${d.recommended_solution ?? ""}`, 62, y, width - 120, 10, MUTED, 12);
            y -= 10;
          }
        }
        continue;
      }

      if (sec.key === "actions") {
        ensure(80);
        drawText("Plano de acao priorizado", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const acts = (actions ?? []).slice(0, 15);
        if (acts.length === 0) {
          drawText("Nenhuma acao cadastrada.", 50, y, { size: 11, color: MUTED }); y -= 20;
        } else {
          acts.forEach((a: any, i: number) => {
            ensure(40);
            drawText(`${i + 1}. ${a.title}`, 50, y, { size: 11, bold: true }); y -= 14;
            drawText(`Area: ${a.area ?? "-"} - Prioridade: ${a.priority ?? "-"} - Impacto: ${a.impact ?? "-"}`, 60, y, { size: 9, color: MUTED });
            y -= 18;
          });
        }
        continue;
      }

      if (sec.key === "questions") {
        ensure(120);
        drawText("Perguntas-chave do negocio", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const qs = [
          ["Por que as pessoas nao entram na loja?", store.rating < 4.5 ? `Nota baixa (${store.rating}) reduz visibilidade.` : "Reputacao OK. Otimize fotos e vitrine."],
          ["Por que entram e nao compram?", "Avalie qualidade das fotos e ordem dos produtos."],
          ["Por que compram pouco?", store.average_ticket < 35 ? `Ticket baixo (R$ ${store.average_ticket}). Crie combos.` : "Ticket saudavel."],
          ["Por que nao voltam?", "Trabalhe recompra com programa de fidelidade."],
        ];
        for (const [q, a] of qs) {
          ensure(40);
          drawText(q, 50, y, { size: 11, bold: true }); y -= 14;
          y = drawWrapped(page, font, a, 50, y, width - 100, 10, MUTED, 12);
          y -= 8;
        }
        continue;
      }

      if (sec.key === "reviews") {
        ensure(80);
        drawText("Resumo de avaliacoes", 50, y, { size: 16, bold: true, color: PRIMARY }); y -= 22;
        const { data: reviews } = await admin.from("reviews").select("sentiment, detected_topics").eq("store_id", store_id);
        const total = reviews?.length ?? 0;
        const neg = reviews?.filter((r: any) => r.sentiment === "negativo").length ?? 0;
        const pos = reviews?.filter((r: any) => r.sentiment === "positivo").length ?? 0;
        drawText(`Total: ${total} - Positivas: ${pos} - Negativas: ${neg}`, 50, y, { size: 11 }); y -= 18;
        const topics = new Map<string, number>();
        reviews?.forEach((r: any) => (r.detected_topics ?? []).forEach((t: string) => topics.set(t, (topics.get(t) ?? 0) + 1)));
        const top = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (top.length) {
          drawText("Topicos mais citados:", 50, y, { size: 10, bold: true }); y -= 14;
          top.forEach(([t, n]) => { drawText(`- ${t} (${n})`, 60, y, { size: 10, color: MUTED }); y -= 12; });
        }
        y -= 10;
        continue;
      }
    }

    // Footer
    const pages = pdf.getPages();
    pages.forEach((p, idx) => {
      p.drawText(`${idx + 1}/${pages.length}  -  ${footerText}`, {
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

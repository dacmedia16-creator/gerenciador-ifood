// Chat livre com o Gestor IA de Delivery.
// Usa o mesmo conhecimento do diagnóstico (RAG via knowledge_base) e permite
// conversa contínua. Streaming SSE.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { findKnowledgeSnippets } from "../_shared/memory.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é o GESTOR IA DE DELIVERY — um consultor experiente em operação de restaurantes em iFood/Rappi/Uber Eats, conversando diretamente com o dono do restaurante.

ESTILO:
- Linguagem simples, direta, em PT-BR. Sem jargão técnico.
- Respostas curtas por padrão. Só se aprofunde quando o usuário pedir detalhes.
- Use bullets e negrito para destacar ações. Use markdown.
- Pode pedir esclarecimento quando faltar informação importante (ex: "qual é seu ticket médio hoje?").

REGRAS:
1. Use o KNOWLEDGE_CONTEXT abaixo como sua principal fonte. Quando citar uma heurística da base, mencione brevemente o tópico (ex: "Pelo princípio de combos: ...").
2. NUNCA invente números, percentuais ou métricas específicas da loja do usuário. Se ele não informou, pergunte.
3. NUNCA prometa resultado garantido ("vai aumentar 30%"). Use linguagem de probabilidade ("tende a aumentar", "costuma melhorar").
4. Marque [HIPÓTESE] quando estiver supondo algo que o usuário não confirmou.
5. Se a pergunta fugir totalmente do universo de delivery/restaurante, responda educadamente que seu foco é gestão de delivery.
6. Se o KNOWLEDGE_CONTEXT estiver vazio ou irrelevante, responda com base em boas práticas gerais de delivery, mas avise que não encontrou referência específica na base.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega a última mensagem do usuário para fazer RAG na knowledge_base
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    let kbContext = "";
    if (lastUser?.content) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      try {
        const snippets = await findKnowledgeSnippets(supabase, lastUser.content, null, 5);
        if (snippets.length > 0) {
          kbContext = snippets
            .map((s: any, i: number) => `[${i + 1}] ${s.title} (${s.area}${s.chunk_id ? ` · ${s.chunk_id}` : ""}):\n${s.content}`)
            .join("\n\n");
        }
      } catch (e) {
        console.warn("rag lookup failed", e);
      }
    }

    const systemMsg = `${SYSTEM_PROMPT}\n\nKNOWLEDGE_CONTEXT (top 5 trechos da base):\n${kbContext || "(nenhum trecho relevante encontrado)"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: systemMsg },
          ...messages.filter((m) => m.role === "user" || m.role === "assistant"),
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("ai gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-gestor error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

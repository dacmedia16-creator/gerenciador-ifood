// Chat livre com o Gestor IA de Delivery.
// Usa o mesmo conhecimento do diagnóstico (RAG via knowledge_base) e permite
// conversa contínua. Suporta tool-calling para gerar/editar imagens via
// Nano Banana (google/gemini-2.5-flash-image).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { findKnowledgeSnippets } from "../_shared/memory.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-2.5-flash-image"; // Nano Banana Flash
const MAX_IMAGES_PER_CONVERSATION = 3;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

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
6. Se o KNOWLEDGE_CONTEXT estiver vazio ou irrelevante, responda com base em boas práticas gerais de delivery, mas avise que não encontrou referência específica na base.

FERRAMENTA DE IMAGEM:
- Você tem acesso à ferramenta "generate_or_edit_image". Use APENAS quando o usuário pedir explicitamente para CRIAR, GERAR, FAZER um banner/imagem/arte, ou MELHORAR/EDITAR uma foto que ele anexou.
- NÃO use a ferramenta para perguntas analíticas (ex: "como melhorar minha foto?" sem anexo é texto, não imagem).
- Se o usuário anexou imagem e pediu edição → mode="edit". Se pediu algo do zero → mode="generate".
- Após a ferramenta retornar, escreva uma resposta curta em PT-BR explicando o que foi gerado e dando 2-3 dicas práticas tiradas do KNOWLEDGE_CONTEXT.`;

const IMAGE_TOOL = {
  type: "function",
  function: {
    name: "generate_or_edit_image",
    description:
      "Gera ou edita uma imagem visual (banner promocional, foto de produto, arte de divulgação). Use APENAS quando o usuário pedir explicitamente uma imagem nova ou edição de foto anexada.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Descrição detalhada da imagem desejada em INGLÊS (Nano Banana entende melhor). Inclua estilo, composição, iluminação, cores, ângulo. Ex: 'Top-down photo of an artisanal smashburger on a wooden board, natural side lighting, warm tones, shallow depth of field'.",
        },
        mode: {
          type: "string",
          enum: ["generate", "edit"],
          description:
            "'generate' para criar do zero. 'edit' para modificar a imagem que o usuário anexou na última mensagem.",
        },
        style_hint: {
          type: "string",
          description:
            "Tipo de uso: 'banner_promocional', 'foto_produto', 'logo', 'capa_redes_sociais'. Ajuda a aplicar regras visuais corretas.",
        },
      },
      required: ["prompt", "mode"],
      additionalProperties: false,
    },
  },
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  tool_calls?: any[];
  tool_call_id?: string;
}

function extractText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p && p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join(" ");
}

function extractLastUserImage(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user" || typeof m.content === "string") continue;
    const img = (m.content as ContentPart[]).find((p) => p.type === "image_url");
    if (img && img.type === "image_url") return img.image_url.url;
  }
  return null;
}

function countAssistantImages(messages: ChatMessage[]): number {
  // Procura assistants anteriores que contenham marker de imagem gerada.
  // Como não persistimos no histórico do gateway, usamos um marker no texto.
  let n = 0;
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const txt = extractText(m.content);
    if (txt.includes("[__img_generated__]")) n++;
  }
  return n;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchKnowledgeForImagery(supabase: any, userQuery: string): Promise<string> {
  const visualQuery = `${userQuery}. fotografia de produto, banner, composição visual, iluminação, cores`;
  try {
    const snippets = await findKnowledgeSnippets(supabase, visualQuery, null, 4);
    if (!snippets || snippets.length === 0) return "";
    return snippets
      .map((s: any) => `- ${(s.content || "").slice(0, 400)}`)
      .join("\n");
  } catch (e) {
    console.warn("rag for imagery failed", e);
    return "";
  }
}

async function callImageModel(
  apiKey: string,
  fullPrompt: string,
  inputImageDataUrl: string | null,
): Promise<string> {
  const userContent: ContentPart[] = [{ type: "text", text: fullPrompt }];
  if (inputImageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: inputImageDataUrl } });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: userContent }],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    const err: any = new Error(`image model error ${resp.status}: ${txt.slice(0, 200)}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("Modelo de imagem não retornou imagem");
  return url; // data:image/png;base64,...
}

async function uploadGeneratedImage(
  supabase: any,
  userId: string,
  base64DataUrl: string,
): Promise<string> {
  const bytes = decodeBase64ToBytes(base64DataUrl);
  const fileName = `${userId}/${crypto.randomUUID()}.png`;

  const { error: upErr } = await supabase.storage
    .from("chat-images")
    .upload(fileName, bytes, { contentType: "image/png", upsert: false });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase.storage
    .from("chat-images")
    .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error("signed url falhou");
  return signed.signedUrl;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identifica usuário a partir do JWT (verify_jwt=true por padrão na gateway publish)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData } = await supabaseAuth.auth.getUser();
    const userId = userData?.user?.id ?? null;

    // Rate limit
    if (userId) {
      const { checkRateLimit, rateLimitResponse } = await import("../_shared/rate-limit.ts");
      const adminRl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const rl = await checkRateLimit(adminRl, userId, "chat");
      if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
    }

    // Cliente service-role para storage e RPC RAG
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // RAG sobre a última pergunta (igual ao fluxo antigo)
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastUserText = lastUser ? extractText(lastUser.content) : "";

    let kbContext = "";
    if (lastUserText) {
      const ragStart = Date.now();
      try {
        const snippets = await findKnowledgeSnippets(supabase, lastUserText, null, 3);
        if (snippets.length > 0) {
          kbContext = snippets
            .map((s: any, i: number) => {
              const content = (s.content || "").slice(0, 600);
              return `[${i + 1}] ${s.title} (${s.area}${s.chunk_id ? ` · ${s.chunk_id}` : ""}):\n${content}`;
            })
            .join("\n\n");
        }
      } catch (e) {
        console.warn("rag lookup failed", e);
      }
      console.log(JSON.stringify({
        evt: "chat_gestor.rag",
        elapsed_ms: Date.now() - ragStart,
        has_context: !!kbContext,
      }));
    }

    const systemMsg = `${SYSTEM_PROMPT}\n\nKNOWLEDGE_CONTEXT (top trechos da base):\n${kbContext || "(nenhum trecho relevante encontrado)"}`;

    // Filtra histórico: só user/assistant; sanitiza markers internos
    const cleanedHistory: ChatMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        if (m.role === "assistant" && typeof m.content === "string") {
          return { ...m, content: m.content.replace("[__img_generated__]", "").trim() };
        }
        return m;
      });

    // ---- Loop de tool-calling (máx 2 iterações) ----
    let workingMessages: ChatMessage[] = [
      { role: "system", content: systemMsg },
      ...cleanedHistory,
    ];
    const generatedImageUrls: string[] = [];
    const alreadyGenerated = countAssistantImages(messages);
    let toolCallsAttempted = 0;
    const MAX_TOOL_ITERATIONS = 2;

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          stream: false,
          messages: workingMessages,
          tools: [IMAGE_TOOL],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({
              error: "Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage.",
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const txt = await aiResp.text();
        console.error("ai gateway error", aiResp.status, txt);
        return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const choice = data?.choices?.[0]?.message;
      const toolCalls = choice?.tool_calls;

      if (!toolCalls || toolCalls.length === 0 || iter === MAX_TOOL_ITERATIONS) {
        // Resposta final em texto
        let content: string = choice?.content ?? "";
        if (generatedImageUrls.length > 0) {
          // marker para o front saber e para contagem futura
          content = `${content}\n\n[__img_generated__]`.trim();
        }
        return new Response(
          JSON.stringify({ content, images: generatedImageUrls }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Executa cada tool_call
      workingMessages.push({
        role: "assistant",
        content: choice.content ?? "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        toolCallsAttempted++;
        const fnName = tc?.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc?.function?.arguments ?? "{}");
        } catch {
          // ignore
        }

        if (fnName !== "generate_or_edit_image") {
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: "tool desconhecida" }),
          });
          continue;
        }

        // Limite por conversa
        if (alreadyGenerated + generatedImageUrls.length >= MAX_IMAGES_PER_CONVERSATION) {
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              error: "Limite de 3 imagens por conversa atingido. Peça ao usuário para iniciar uma nova conversa.",
            }),
          });
          continue;
        }

        if (!userId) {
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: "Usuário não autenticado." }),
          });
          continue;
        }

        // Enriquecimento via RAG
        const visualRules = await fetchKnowledgeForImagery(supabase, lastUserText);
        const stylePrefix =
          args.style_hint === "foto_produto"
            ? "High-quality food photography, realistic, appetizing, professional studio lighting. "
            : args.style_hint === "banner_promocional"
            ? "Marketing banner design, bold composition, clear focal point, vibrant but tasteful colors. "
            : "";

        const fullPrompt = [
          stylePrefix + (args.prompt ?? ""),
          visualRules
            ? `Apply these visual best-practices from the brand knowledge base:\n${visualRules}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const inputImg = args.mode === "edit" ? extractLastUserImage(messages) : null;
        if (args.mode === "edit" && !inputImg) {
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              error: "Nenhuma imagem foi anexada pelo usuário para editar.",
            }),
          });
          continue;
        }

        const imgStart = Date.now();
        try {
          const dataUrl = await callImageModel(LOVABLE_API_KEY, fullPrompt, inputImg);
          const signedUrl = await uploadGeneratedImage(supabase, userId, dataUrl);
          generatedImageUrls.push(signedUrl);

          console.log(JSON.stringify({
            evt: "chat_gestor.image_generated",
            elapsed_ms: Date.now() - imgStart,
            mode: args.mode,
            style_hint: args.style_hint ?? null,
            kb_chars: visualRules.length,
          }));

          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              ok: true,
              message: "Imagem gerada e salva. URL será mostrada ao usuário.",
            }),
          });
        } catch (e: any) {
          console.error("image model failed", e?.message ?? e);
          const status = e?.status;
          const friendly =
            status === 402
              ? "Créditos de imagem esgotados."
              : status === 429
              ? "Muitas requisições de imagem. Tente em instantes."
              : "Falha ao gerar a imagem.";
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: friendly }),
          });
        }
      }
    }

    // Não deveria chegar aqui
    return new Response(JSON.stringify({ content: "", images: generatedImageUrls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-gestor error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

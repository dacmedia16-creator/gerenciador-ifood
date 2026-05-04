import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, MessageSquare, Send, Sparkles, Trash2, User, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: string[];          // imagens anexadas pelo usuário (data URLs)
  generatedImages?: string[]; // imagens geradas pela IA (signed URLs)
  typing?: boolean;
};

const SUGGESTIONS = [
  "Como aumentar meu ticket médio?",
  "Como reduzir cancelamentos?",
  "Crie um banner de promoção de hambúrguer",
  "Melhore esta foto do meu prato (anexe uma imagem)",
];

const MAX_IMAGES = 3;
const MAX_IMAGE_MB = 5;
// Velocidade do efeito de digitação (caracteres por tick)
const TYPE_CHARS_PER_TICK = 2;
const TYPE_TICK_MS = 18;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Auto-envia pergunta vinda via ?q=
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const q = searchParams.get("q");
    if (q && q.trim()) {
      autoSentRef.current = true;
      // remove o parâmetro da URL para evitar reenvio em refresh
      const next = new URLSearchParams(searchParams);
      next.delete("q");
      setSearchParams(next, { replace: true });
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - pendingImages.length;
    if (remaining <= 0) {
      toast({ title: "Limite de imagens", description: `Máximo ${MAX_IMAGES} imagens por mensagem.`, variant: "destructive" });
      return;
    }
    const accepted: string[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Arquivo inválido", description: "Envie apenas imagens.", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: `Máx ${MAX_IMAGE_MB}MB por imagem.`, variant: "destructive" });
        continue;
      }
      try {
        accepted.push(await fileToDataUrl(file));
      } catch {
        toast({ title: "Erro ao ler imagem", variant: "destructive" });
      }
    }
    if (accepted.length) setPendingImages((prev) => [...prev, ...accepted]);
  }

  async function send(text: string, imagesOverride?: string[]) {
    const trimmed = text.trim();
    const images = imagesOverride ?? pendingImages;
    if ((!trimmed && images.length === 0) || loading) return;
    setInput("");
    setPendingImages([]);
    const userMsg: Msg = {
      role: "user",
      content: trimmed || (images.length ? "Avalie esta(s) imagem(ns)." : ""),
      images: images.length ? images : undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      // Converte para o formato esperado pelo backend (texto + image parts)
      const apiMessages = next.map((m) => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const { data, error } = await supabase.functions.invoke("chat-gestor", {
        body: { messages: apiMessages },
      });

      if (error) {
        const ctx = (error as any).context;
        let parsed: any = null;
        if (ctx?.body) {
          try { parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body; } catch { /* ignore */ }
        }
        const status = ctx?.status ?? 0;
        toast({
          title: status === 429 ? "Limite atingido" : status === 402 ? "Créditos esgotados" : "Erro",
          description: parsed?.error ?? error.message ?? "Tente novamente.",
          variant: "destructive",
        });
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const rawContent: string = (data as any)?.content ?? "";
      const generatedImages: string[] = Array.isArray((data as any)?.images) ? (data as any).images : [];
      // Remove marker interno usado pelo backend para contagem de imagens
      const cleanContent = rawContent.replace("[__img_generated__]", "").trim();

      if (!cleanContent && generatedImages.length === 0) {
        toast({ title: "Resposta vazia", description: "Tente reformular sua pergunta.", variant: "destructive" });
        return;
      }

      // Adiciona a mensagem vazia em modo "typing" e revela aos poucos
      setMessages((prev) => [...prev, { role: "assistant", content: "", typing: true, generatedImages }]);
      await typeOutAssistant(cleanContent);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro de conexão", description: "Não foi possível falar com o Gestor IA.", variant: "destructive" });
      setMessages((prev) => (prev[prev.length - 1]?.role === "user" ? prev.slice(0, -1) : prev));
    } finally {
      setLoading(false);
    }
  }

  // Revela o texto do assistente progressivamente, atualizando a última mensagem.
  function typeOutAssistant(full: string): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        i = Math.min(full.length, i + TYPE_CHARS_PER_TICK);
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role !== "assistant") return prev;
          const updated: Msg = { ...last, content: full.slice(0, i), typing: i < full.length };
          return [...prev.slice(0, -1), updated];
        });
        if (i < full.length) {
          setTimeout(tick, TYPE_TICK_MS);
        } else {
          resolve();
        }
      };
      tick();
    });
  }


  function clearChat() {
    setMessages([]);
    setInput("");
    setPendingImages([]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Gestor IA de Delivery</h1>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="ml-auto">
            <Trash2 className="h-4 w-4 mr-1" /> Limpar conversa
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Faça perguntas livres ou anexe imagens (foto de prato, embalagem, print do iFood) para a IA avaliar.
      </p>

      <Card className="flex-1 overflow-hidden flex flex-col shadow-card">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Comece a conversar</p>
                <p className="text-sm text-muted-foreground">Escolha uma sugestão, digite sua pergunta ou anexe uma imagem.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-w-2xl w-full">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="justify-start h-auto py-2 text-left whitespace-normal"
                    onClick={() => send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary/10" : "bg-secondary"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-primary" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.images.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`anexo ${idx + 1}`}
                        className="h-32 w-32 object-cover rounded-lg border border-border/50"
                      />
                    ))}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    {m.typing && (
                      <span className="inline-block w-1.5 h-4 align-[-2px] ml-0.5 bg-primary/70 animate-pulse rounded-sm" />
                    )}
                    {!m.typing && m.generatedImages && m.generatedImages.length > 0 && (
                      <div className="not-prose mt-3 grid gap-2 sm:grid-cols-2">
                        {m.generatedImages.map((url, idx) => (
                          <div key={idx} className="group relative overflow-hidden rounded-lg border border-border bg-background">
                            <a href={url} target="_blank" rel="noreferrer">
                              <img
                                src={url}
                                alt={`imagem gerada ${idx + 1}`}
                                className="w-full h-auto object-cover transition-transform group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            </a>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                              onClick={async () => {
                                try {
                                  const res = await fetch(url);
                                  const blob = await res.blob();
                                  const blobUrl = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = blobUrl;
                                  a.download = `gestor-ia-${Date.now()}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(blobUrl);
                                } catch {
                                  toast({ title: "Falha no download", variant: "destructive" });
                                }
                              }}
                            >
                              Baixar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-2 bg-muted">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {pendingImages.length > 0 && (
          <div className="border-t px-3 pt-3 flex flex-wrap gap-2">
            {pendingImages.map((src, idx) => (
              <div key={idx} className="relative">
                <img src={src} alt={`preview ${idx + 1}`} className="h-16 w-16 object-cover rounded-md border border-border" />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                  aria-label="Remover imagem"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="border-t p-3 flex gap-2 items-end"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || pendingImages.length >= MAX_IMAGES}
            title="Anexar imagem"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={pendingImages.length ? "Descreva o que quer avaliar (opcional)…" : "Pergunte algo ou anexe uma imagem…"}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || (!input.trim() && pendingImages.length === 0)} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

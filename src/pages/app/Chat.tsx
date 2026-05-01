import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Como aumentar meu ticket médio?",
  "Como reduzir cancelamentos?",
  "Vale a pena entrar no Super Restaurante?",
  "Como melhorar minha conversão de visita em pedido?",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gestor`;

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      const data = await resp.json().catch(() => ({} as any));

      if (!resp.ok) {
        toast({
          title: resp.status === 429 ? "Limite atingido" : resp.status === 402 ? "Créditos esgotados" : "Erro",
          description: data?.error ?? "Tente novamente.",
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "user" && m.content === trimmed)));
        return;
      }

      const content: string = data?.content ?? "";
      if (!content) {
        toast({ title: "Resposta vazia", description: "Tente reformular sua pergunta.", variant: "destructive" });
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro de conexão", description: "Não foi possível falar com o Gestor IA.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
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
        Faça perguntas livres sobre sua operação de delivery. O Gestor IA responde com base na mesma base de conhecimento usada no diagnóstico.
      </p>

      <Card className="flex-1 overflow-hidden flex flex-col shadow-card">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Comece a conversar</p>
                <p className="text-sm text-muted-foreground">Escolha uma sugestão ou digite sua pergunta abaixo.</p>
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
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
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

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="border-t p-3 flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte algo ao Gestor IA…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

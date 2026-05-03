import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateUserSession } from "@/lib/diagnosis/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, ClipboardList, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function DiagnosisWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState<string | null>(null);

  const start = async (mode: "prints" | "form" | "full") => {
    if (!user) return;
    setCreating(mode);
    try {
      const session = await getOrCreateUserSession(user.id, params.get("storeId"));
      navigate(`/app/diagnosis/${session.id}?mode=${mode}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar diagnóstico");
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Diagnóstico Inteligente da Loja
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Vamos fazer o <span className="text-gradient">Raio-X</span> do seu delivery
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Em poucos minutos você recebe um diagnóstico completo da sua loja com plano de ação para
            vender mais, melhorar a nota, reduzir cancelamentos e aumentar o lucro.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <ModeCard
            icon={<Camera className="h-6 w-6" />}
            title="Enviar prints"
            description="Tira foto da tela do iFood, WhatsApp, Instagram, cardápio. A IA lê e extrai os dados."
            cta="Começar pelos prints"
            onClick={() => start("prints")}
            loading={creating === "prints"}
          />
          <ModeCard
            highlighted
            icon={<Sparkles className="h-6 w-6" />}
            title="Fazer os dois"
            description="Mais completo. Você envia prints e responde algumas perguntas guiadas."
            cta="Recomendado"
            onClick={() => start("full")}
            loading={creating === "full"}
          />
          <ModeCard
            icon={<ClipboardList className="h-6 w-6" />}
            title="Preencher formulário"
            description="Responde perguntas simples sobre sua loja. Pode pular o que não souber."
            cta="Só responder"
            onClick={() => start("form")}
            loading={creating === "form"}
          />
        </div>

        <Card className="p-4 bg-muted/30 border-dashed text-sm text-center text-muted-foreground">
          Você pode salvar e continuar depois. Tudo é privado e visível só para você.
        </Card>
      </div>
    </div>
  );
}

function ModeCard({
  icon, title, description, cta, onClick, loading, highlighted,
}: {
  icon: React.ReactNode; title: string; description: string; cta: string;
  onClick: () => void; loading?: boolean; highlighted?: boolean;
}) {
  return (
    <Card className={`p-6 flex flex-col gap-4 transition-all hover:shadow-card-hover ${highlighted ? "border-primary shadow-card ring-1 ring-primary/30" : ""}`}>
      <div className={`inline-flex w-12 h-12 items-center justify-center rounded-lg ${highlighted ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        {icon}
      </div>
      <div className="space-y-1.5 flex-1">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        variant={highlighted ? "default" : "outline"}
        className={highlighted ? "gradient-primary text-primary-foreground" : ""}
        onClick={onClick}
        disabled={loading}
      >
        {loading ? "Abrindo…" : cta} <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </Card>
  );
}

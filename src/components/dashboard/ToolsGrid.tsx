import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { getUserPlan } from "@/lib/plan";

interface Props {
  storeId: string;
}

export function ToolsGrid({ storeId }: Props) {
  const navigate = useNavigate();
  const plan = getUserPlan();
  const isFree = plan === "free";

  const tools = [
    { icon: "🧮", name: "Simulador de Preço", url: `/app/stores/${storeId}/pricing-simulator` },
    { icon: "🏆", name: "Melhores Horários", url: `/app/stores/${storeId}/best-hours` },
    { icon: "💬", name: "Analisar Avaliações", url: `/app/stores/${storeId}/reviews` },
    { icon: "📊", name: "Evolução da Loja", url: `/app/stores/${storeId}/evolution` },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold mb-3">Ferramentas</h2>
      <div className="relative">
        <div
          className={`grid grid-cols-2 gap-3 ${
            isFree ? "blur-sm pointer-events-none select-none" : ""
          }`}
        >
          {tools.map((t) => (
            <Card
              key={t.name}
              role="button"
              tabIndex={0}
              onClick={() => navigate(t.url)}
              onKeyDown={(e) => e.key === "Enter" && navigate(t.url)}
              className="p-4 shadow-card cursor-pointer hover:bg-muted/50 transition-colors min-h-[80px] flex items-center gap-3"
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="font-medium text-sm">{t.name}</span>
            </Card>
          ))}
        </div>
        {isFree && (
          <button
            onClick={() => navigate("/app/planos")}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 rounded-lg"
          >
            <Lock className="h-6 w-6" />
            <span className="font-semibold">Disponível no Pro</span>
          </button>
        )}
      </div>
    </section>
  );
}

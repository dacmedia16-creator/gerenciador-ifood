import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export default function Planos() {
  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      desc: "Para começar a entender sua loja.",
      features: ["1 diagnóstico expresso", "Plano de ação básico", "Avaliações"],
      cta: "Plano atual",
      disabled: true,
    },
    {
      name: "Pro",
      price: "R$ 99/mês",
      desc: "Para quem quer crescer todo mês.",
      features: [
        "Diagnósticos ilimitados",
        "Plano de ação completo + ferramentas",
        "Reanálise semanal",
        "Suporte prioritário no WhatsApp",
      ],
      cta: "Quero o Pro",
      highlight: true,
    },
  ];

  return (
    <div className="container max-w-4xl py-6 md:py-10 space-y-6">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Planos
        </div>
        <h1 className="text-3xl font-bold">Escolha o plano ideal pra sua loja</h1>
        <p className="text-muted-foreground">Cancele quando quiser. Sem fidelidade.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((p) => (
          <Card key={p.name} className={`p-6 space-y-4 ${p.highlight ? "border-primary border-2" : ""}`}>
            <div>
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="text-3xl font-bold mt-2">{p.price}</p>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
            </div>
            <ul className="space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full min-h-12"
              variant={p.highlight ? "default" : "outline"}
              disabled={p.disabled}
              asChild={!p.disabled}
            >
              {p.disabled ? <span>{p.cta}</span> : <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">{p.cta}</a>}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

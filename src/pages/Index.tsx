import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingDown, AlertTriangle, DollarSign, Users, Star, Clock, Megaphone, BarChart3,
  CheckCircle2, ArrowRight, Sparkles, Target, LineChart,
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold">G</div>
            <span className="font-semibold text-lg">Gestor IA de Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
            <Button asChild className="gradient-primary text-primary-foreground"><Link to="/auth?mode=signup">Começar grátis</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" /> Diagnóstico inteligente para delivery
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Transforme sua loja de delivery em uma{" "}
              <span className="text-gradient">máquina de vendas com IA</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Diagnostique problemas, descubra onde sua loja perde dinheiro e receba um plano de ação automático
              para vender mais, lucrar melhor e fidelizar clientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button size="lg" asChild className="gradient-primary text-primary-foreground shadow-elegant">
                <Link to="/auth?mode=signup">Começar diagnóstico <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Ver demonstração</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problemas resolvidos */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Problemas que o sistema resolve</h2>
          <p className="text-muted-foreground mt-3">Pare de adivinhar. Comece a agir com base em dados.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingDown, title: "Vende mas não lucra", desc: "Margem real espremida por taxas e cupons" },
            { icon: AlertTriangle, title: "Avaliações ruins", desc: "Reclamações recorrentes derrubam sua nota" },
            { icon: Clock, title: "Entrega lenta", desc: "Cliente desiste e vai pro concorrente" },
            { icon: Users, title: "Cliente não volta", desc: "Falta estratégia de recompra e fidelização" },
          ].map((p) => (
            <Card key={p.title} className="p-6 shadow-card hover:shadow-elegant transition-shadow">
              <p.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Como funciona</h2>
            <p className="text-muted-foreground mt-3">Em 3 passos simples</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { n: "1", title: "Cadastre sua loja", desc: "Insira dados básicos ou faça upload de relatórios" },
              { n: "2", title: "Receba o diagnóstico", desc: "IA analisa 18 áreas e gera score e gargalos" },
              { n: "3", title: "Execute o plano", desc: "Ações práticas priorizadas por impacto e esforço" },
            ].map((s) => (
              <Card key={s.n} className="p-6 text-center shadow-card">
                <div className="h-12 w-12 rounded-full gradient-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-lg">{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnósticos disponíveis */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Diagnósticos disponíveis</h2>
          <p className="text-muted-foreground mt-3">18 áreas analisadas automaticamente</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">
          {[
            "Aparência", "Cardápio", "Fotos", "Preço & Margem", "Combos", "Promoções",
            "Concorrência", "Avaliações", "Entrega", "Cancelamentos", "Horários", "Produtos",
            "Embalagem", "Experiência", "Recompra", "Indicadores", "Anúncios", "Diagnóstico final",
          ].map((d) => (
            <div key={d} className="rounded-lg border bg-card p-3 text-center text-sm font-medium shadow-card">{d}</div>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Dashboard inteligente</h2>
              <p className="text-muted-foreground mb-6">Tudo que você precisa saber sobre sua loja em uma única tela. Score geral, KPIs, alertas críticos e plano de ação recomendado.</p>
              <ul className="space-y-3">
                {["Score por área (0–100)", "KPIs financeiros e operacionais", "Alertas em tempo real", "Plano de ação priorizado"].map((b) => (
                  <li key={b} className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-success mt-0.5" /><span>{b}</span></li>
                ))}
              </ul>
            </div>
            <Card className="p-6 shadow-elegant">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Score geral</span>
                <span className="text-3xl font-bold text-gradient">72</span>
              </div>
              <div className="space-y-3">
                {[
                  { l: "Avaliações", v: 84, c: "bg-success" },
                  { l: "Entrega", v: 62, c: "bg-warning" },
                  { l: "Margem", v: 48, c: "bg-destructive" },
                  { l: "Cardápio", v: 78, c: "bg-success" },
                ].map((r) => (
                  <div key={r.l}>
                    <div className="flex justify-between text-xs mb-1"><span>{r.l}</span><span className="font-medium">{r.v}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${r.c}`} style={{ width: `${r.v}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefícios finais */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Benefícios para restaurantes</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: DollarSign, title: "Lucre mais", desc: "Identifique produtos e cupons que queimam margem" },
            { icon: Star, title: "Melhore reputação", desc: "Resolva reclamações antes que afetem sua nota" },
            { icon: LineChart, title: "Cresça com método", desc: "Decisões baseadas em dados, não em achismo" },
          ].map((b) => (
            <Card key={b.title} className="p-6 shadow-card">
              <b.icon className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 gradient-hero text-center shadow-elegant border-0">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Pronto para vender mais e lucrar melhor?
          </h2>
          <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Comece agora seu diagnóstico gratuito e descubra exatamente onde sua loja está perdendo dinheiro.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth?mode=signup">Começar diagnóstico <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Gestor IA de Delivery
      </footer>
    </div>
  );
};

export default Index;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingDown, AlertTriangle, Star, Clock, Users, Swords,
  ChefHat, BarChart3, Megaphone, MessageSquareHeart, Target, Rocket,
  ArrowRight, CheckCircle2, Database, BrainCircuit, Handshake,
  ScanSearch, ClipboardList, ListChecks, LineChart,
} from "lucide-react";

// Paleta premium da landing (isolada do design system global)
const C = {
  red: "#EA1D2C",
  yellow: "#FFD000",
  black: "#111111",
  graphite: "#1F1F1F",
  cream: "#FFF8F2",
  green: "#16A34A",
};

const CTA_PRIMARY = "/auth?mode=signup";
const CTA_LOGIN = "/auth";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream, color: C.black }}>
      {/* ============== HEADER ============== */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ backgroundColor: `${C.black}E6`, borderColor: "#ffffff14" }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-black text-white"
              style={{ backgroundColor: C.red }}
            >
              G
            </div>
            <span className="font-semibold text-white tracking-tight">
              Gestor de Delivery<span style={{ color: C.yellow }}>.</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <a href="#como-funciona" className="hover:text-white transition">Como funciona</a>
            <a href="#o-que-analisamos" className="hover:text-white transition">O que analisamos</a>
            <a href="#para-quem" className="hover:text-white transition">Para quem é</a>
            <a href={CTA_PRIMARY} className="hover:text-white transition">Falar com especialista</a>
          </nav>

          <Button
            asChild
            className="font-semibold border-0 hover:opacity-90"
            style={{ backgroundColor: C.red, color: "#fff" }}
          >
            <Link to={CTA_PRIMARY}>Solicitar análise</Link>
          </Button>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section id="top" className="relative overflow-hidden" style={{ backgroundColor: C.black }}>
        {/* Glow */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: C.red }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: C.yellow }}
        />

        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
            <div className="space-y-7 text-white">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "#ffffff26", color: C.yellow }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.yellow }} />
                Gestão especializada para delivery
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Gestão profissional para restaurantes que querem{" "}
                <span style={{ color: C.red }}>vender mais no delivery</span>
              </h1>

              <p className="text-lg text-white/75 max-w-xl leading-relaxed">
                Assumimos a inteligência operacional do seu delivery: cardápio, margem, reputação, campanhas,
                concorrência, recompra e plano de crescimento para aplicativos e canais próprios.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  asChild
                  className="font-semibold h-12 px-6 border-0 hover:opacity-90 shadow-2xl"
                  style={{ backgroundColor: C.red, color: "#fff", boxShadow: `0 20px 40px -15px ${C.red}AA` }}
                >
                  <Link to={CTA_PRIMARY}>
                    Solicitar análise do meu delivery <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  asChild
                  variant="outline"
                  className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>

              <div className="pt-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Operamos em</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/80">
                  <span>iFood</span>
                  <span className="text-white/20">·</span>
                  <span>99Food</span>
                  <span className="text-white/20">·</span>
                  <span>WhatsApp</span>
                  <span className="text-white/20">·</span>
                  <span>Cardápio digital próprio</span>
                </div>
              </div>
            </div>

            {/* Mock dashboard premium */}
            <div className="relative">
              <div
                className="rounded-2xl border p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: `${C.graphite}CC`,
                  borderColor: "#ffffff1a",
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-white/50">Performance da loja</p>
                    <p className="text-white font-semibold">Burger House — Centro</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50">Score geral</p>
                    <p className="text-3xl font-black" style={{ color: C.yellow }}>78</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { l: "Ticket médio", v: "R$ 62", c: C.green },
                    { l: "Pedidos/sem", v: "412", c: "#fff" },
                    { l: "Recompra", v: "31%", c: C.yellow },
                  ].map((k) => (
                    <div
                      key={k.l}
                      className="rounded-lg p-3 border"
                      style={{ backgroundColor: "#00000040", borderColor: "#ffffff10" }}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-white/50">{k.l}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: k.c }}>{k.v}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {[
                    { l: "Cardápio", v: 84, c: C.green },
                    { l: "Margem", v: 58, c: C.yellow },
                    { l: "Reputação", v: 72, c: C.green },
                    { l: "Entrega", v: 41, c: C.red },
                  ].map((r) => (
                    <div key={r.l}>
                      <div className="flex justify-between text-xs mb-1.5 text-white/80">
                        <span>{r.l}</span>
                        <span className="font-semibold">{r.v}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff14" }}>
                        <div className="h-full rounded-full" style={{ width: `${r.v}%`, backgroundColor: r.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selo flutuante */}
              <div
                className="absolute -bottom-4 -left-4 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2"
                style={{ backgroundColor: C.yellow, color: C.black }}
              >
                <TrendingDown className="h-4 w-4 rotate-180" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider">Crescimento</p>
                  <p className="text-sm font-black">+34% em 90 dias</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== DORES ============== */}
      <section className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              O diagnóstico honesto
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              O problema não é só vender pouco.{" "}
              <span style={{ color: C.red }}>É não saber onde o dinheiro está escapando.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: TrendingDown, title: "Margem baixa", desc: "Taxas, embalagem e custo do prato comendo seu lucro silenciosamente." },
              { icon: AlertTriangle, title: "Promoções sem lucro", desc: "Cupons e combos que vendem volume mas destroem rentabilidade." },
              { icon: Star, title: "Avaliações ruins", desc: "Reclamações recorrentes derrubando a posição da loja no aplicativo." },
              { icon: Clock, title: "Entrega lenta", desc: "Tempo alto que aumenta cancelamento e prejudica reputação." },
              { icon: Users, title: "Baixa recompra", desc: "Cliente compra uma vez e nunca mais volta — sem estratégia de retenção." },
              { icon: Swords, title: "Concorrência mais forte", desc: "Concorrentes melhor posicionados, com cardápio e campanhas mais agressivas." },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl p-7 border transition hover:-translate-y-1"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "#00000010",
                  boxShadow: "0 10px 30px -15px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="h-11 w-11 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${C.red}15`, color: C.red }}
                >
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-1.5" style={{ color: C.black }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SERVIÇOS ============== */}
      <section id="como-funciona" className="py-24" style={{ backgroundColor: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Nosso serviço
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Uma gestão completa para transformar delivery em{" "}
              <span style={{ color: C.red }}>canal de crescimento.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BarChart3, title: "Diagnóstico Comercial", desc: "Raio-X completo de vendas, margem, ticket médio e gargalos da operação." },
              { icon: ChefHat, title: "Gestão de Cardápio", desc: "Reorganização, fotos, descrições e curadoria estratégica dos produtos." },
              { icon: Rocket, title: "Performance em Aplicativos", desc: "Posicionamento, ranking e otimização contínua em iFood e 99Food." },
              { icon: Megaphone, title: "Campanhas e Promoções", desc: "Promoções com lucro, combos inteligentes e cupons que aumentam ticket." },
              { icon: MessageSquareHeart, title: "Reputação e Avaliações", desc: "Tratativa de reclamações, melhoria da nota e recuperação de clientes." },
              { icon: Target, title: "Plano de Crescimento", desc: "Roadmap mensal de ações priorizadas por impacto financeiro real." },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl p-7 border transition hover:border-[#EA1D2C]/40"
                style={{
                  backgroundColor: C.cream,
                  borderColor: "#00000010",
                }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: C.black, color: C.yellow }}
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: C.black }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== DIFERENCIAL ============== */}
      <section className="py-24 relative overflow-hidden" style={{ backgroundColor: C.graphite }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: C.yellow }}>
              Diferencial
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Você não contrata uma plataforma.{" "}
              <span style={{ color: C.yellow }}>
                Você contrata uma equipe olhando para o seu delivery.
              </span>
            </h2>
            <p className="text-lg text-white/70 mt-6 max-w-2xl mx-auto">
              Combinamos dados, inteligência artificial e visão estratégica humana para entregar decisões que
              realmente movem o ponteiro do faturamento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { icon: Database, title: "Dados", desc: "Coletamos, organizamos e cruzamos os dados da sua operação para revelar o que está invisível." },
              { icon: BrainCircuit, title: "Inteligência Artificial", desc: "IA proprietária que identifica padrões, oportunidades e riscos em segundos." },
              { icon: Handshake, title: "Visão estratégica humana", desc: "Gestores experientes em delivery interpretando os números e definindo o caminho." },
            ].map((d) => (
              <div
                key={d.title}
                className="rounded-2xl p-7 border"
                style={{ backgroundColor: "#00000040", borderColor: "#ffffff14" }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: C.red, color: "#fff" }}
                >
                  <d.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{d.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{d.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-16 max-w-4xl mx-auto rounded-2xl p-8 md:p-10 text-center border"
            style={{ borderColor: "#ffffff1a", backgroundColor: "#00000050" }}
          >
            <p className="text-2xl md:text-3xl font-bold text-white leading-snug">
              "Você cuida da cozinha.{" "}
              <span style={{ color: C.yellow }}>Nós cuidamos da performance do seu delivery.</span>"
            </p>
          </div>
        </div>
      </section>

      {/* ============== PROCESSO ============== */}
      <section className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Como trabalhamos
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Um método claro, do diagnóstico ao resultado.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { n: "01", icon: ScanSearch, title: "Raio-X da operação", desc: "Levantamento completo de vendas, cardápio, custos e canais." },
              { n: "02", icon: ClipboardList, title: "Diagnóstico estratégico", desc: "Identificação dos gargalos que mais impactam o resultado." },
              { n: "03", icon: ListChecks, title: "Plano de ação priorizado", desc: "Ações organizadas por impacto financeiro e esforço de execução." },
              { n: "04", icon: LineChart, title: "Acompanhamento e otimização", desc: "Revisões periódicas, ajustes e novas oportunidades de crescimento." },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl p-7 border bg-white"
                style={{ borderColor: "#00000010", boxShadow: "0 10px 30px -15px rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-3xl font-black" style={{ color: C.red }}>{s.n}</span>
                  <s.icon className="h-6 w-6" style={{ color: C.black }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PARA QUEM É ============== */}
      <section id="para-quem" className="py-24" style={{ backgroundColor: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center max-w-6xl mx-auto">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
                Para quem é
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
                Restaurantes que vivem (ou vão viver) <span style={{ color: C.red }}>do delivery</span>.
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#555" }}>
                Trabalhamos com operações que querem profissionalizar a gestão do canal e parar de tomar
                decisão no escuro. Se a maior parte do seu faturamento passa por aplicativos, WhatsApp ou
                cardápio digital, este serviço é para você.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Hamburguerias",
                "Pizzarias",
                "Açaíterias",
                "Dark Kitchens",
                "Restaurantes locais",
                "Marmitarias e fit",
                "Lojas em iFood / 99Food",
                "Operações em WhatsApp e cardápio próprio",
              ].map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 border"
                  style={{ backgroundColor: C.cream, borderColor: "#00000010" }}
                >
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: C.green }} />
                  <span className="text-sm font-medium">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== INDICADORES ============== */}
      <section id="o-que-analisamos" className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              O que analisamos
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Indicadores que revelam onde está{" "}
              <span style={{ color: C.red }}>o lucro escondido.</span>
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
            {[
              "Cardápio", "Margem por produto", "Ticket médio", "Avaliações", "Tempo de entrega",
              "Cancelamentos", "Concorrência local", "Campanhas e cupons", "Recompra de clientes",
              "Produtos campeões", "Produtos problemáticos", "Horários de pico", "Mix de canais",
              "Posicionamento no app",
            ].map((i) => (
              <span
                key={i}
                className="px-5 py-2.5 rounded-full text-sm font-medium border transition hover:scale-105"
                style={{ backgroundColor: C.black, color: "#fff", borderColor: C.black }}
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA FINAL ============== */}
      <section className="py-24 relative overflow-hidden" style={{ backgroundColor: C.black }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${C.red}80 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${C.red}40 0%, transparent 50%)`,
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] mb-6">
              Quer descobrir onde seu delivery está{" "}
              <span style={{ color: C.yellow }}>perdendo dinheiro?</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Solicite uma análise da sua operação. Em poucos dias você recebe um diagnóstico claro e
              um plano de ação para virar o jogo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                asChild
                className="font-bold h-14 px-8 text-base border-0 hover:opacity-90 shadow-2xl"
                style={{ backgroundColor: C.yellow, color: C.black, boxShadow: `0 20px 50px -10px ${C.yellow}66` }}
              >
                <Link to={CTA_PRIMARY}>
                  Solicitar análise agora <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                variant="outline"
                className="h-14 px-8 text-base bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={CTA_PRIMARY}>Falar com um gestor</Link>
              </Button>
            </div>

            <p className="mt-8 text-xs uppercase tracking-widest text-white/40">
              Atendimento consultivo · Vagas limitadas por mês
            </p>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer style={{ backgroundColor: C.black, borderTop: "1px solid #ffffff14" }}>
        <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{ backgroundColor: C.red }}
            >
              G
            </div>
            <div>
              <p className="text-white text-sm font-semibold">
                Gestor de Delivery<span style={{ color: C.yellow }}>.</span>
              </p>
              <p className="text-white/40 text-xs">Gestão profissional para restaurantes que vendem por delivery.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href={CTA_PRIMARY} className="text-white/70 hover:text-white transition">Falar com especialista</a>
            <Link to={CTA_LOGIN} className="text-white/40 hover:text-white/70 transition text-xs">
              Área do cliente
            </Link>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4 text-center text-xs text-white/40">
          Rua Horácio Cenci, 9 — Sala 604 — Campolim — Sorocaba/SP — CEP 18047-800
        </div>
        <div className="text-center text-xs text-white/30 pb-6">
          © {new Date().getFullYear()} Gestor de Delivery — Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;

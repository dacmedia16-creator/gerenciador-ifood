import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoGD from "@/assets/logo-gestor-delivery.png";
import {
  TrendingDown, AlertTriangle, Star, Clock, Users, Megaphone,
  ChefHat, BarChart3, Target,
  ArrowRight, CheckCircle2, ClipboardList, Rocket,
  ScanSearch, Wallet, RefreshCw, HelpCircle,
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

const CTA_PRIMARY = "/auth";
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
          <a href="#top" className="flex items-center">
            <img src={logoGD} alt="Gestor de Delivery" className="h-9 w-auto" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <a href="#como-funciona" className="hover:text-white transition">Como funciona</a>
            <a href="#perguntas" className="hover:text-white transition">O que você responde</a>
            <a href="#para-quem" className="hover:text-white transition">Para quem é</a>
            <Link to="/contato" className="hover:text-white transition">Contato</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="hidden sm:inline-flex h-9 px-4 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to={CTA_LOGIN}>Entrar</Link>
            </Button>
            <Button
              asChild
              className="font-semibold border-0 hover:opacity-90"
              style={{ backgroundColor: C.red, color: "#fff" }}
            >
              <Link to={CTA_PRIMARY}>Fazer diagnóstico</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section id="top" className="relative overflow-hidden" style={{ backgroundColor: C.black }}>
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
                Painel inteligente para donos de delivery
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Descubra por que seu delivery vende, mas{" "}
                <span style={{ color: C.red }}>não dá o lucro que deveria</span>
                {" "}— e receba um plano de ação claro para corrigir isso.
              </h1>

              <p className="text-lg text-white/75 max-w-xl leading-relaxed">
                Cadastre sua loja, conecte seus dados e receba um diagnóstico com IA mostrando
                exatamente onde você está perdendo dinheiro e o que fazer para vender mais,
                lucrar melhor e melhorar sua reputação.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  asChild
                  className="font-semibold h-12 px-6 border-0 hover:opacity-90 shadow-2xl"
                  style={{ backgroundColor: C.red, color: "#fff", boxShadow: `0 20px 40px -15px ${C.red}AA` }}
                >
                  <Link to={CTA_PRIMARY}>
                    Fazer diagnóstico da minha loja <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  asChild
                  variant="outline"
                  className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to={CTA_LOGIN}>Ver exemplo de diagnóstico</Link>
                </Button>
              </div>

              <div className="pt-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Funciona com</p>
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
                    <p className="text-xs text-white/50">Painel da minha loja</p>
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

      {/* ============== DORES DO DONO ============== */}
      <section className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Você reconhece isso?
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Vender muito não é o problema.{" "}
              <span style={{ color: C.red }}>O problema é não saber onde o dinheiro está escapando.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Wallet, title: "Vende mas não lucra", desc: "Faturamento alto, sobra quase nada no fim do mês — e você não sabe exatamente por quê." },
              { icon: AlertTriangle, title: "Promoções que queimam margem", desc: "Cupons, combos e frete grátis vendendo volume, mas destruindo sua rentabilidade." },
              { icon: TrendingDown, title: "Produto campeão sem rentabilidade", desc: "Os mais vendidos podem estar sendo justamente os que menos te dão lucro." },
              { icon: Star, title: "Avaliações ruins derrubando a loja", desc: "Reclamações repetidas que jogam sua nota para baixo e te tiram da vitrine do app." },
              { icon: Clock, title: "Entrega lenta", desc: "Tempo alto que aumenta cancelamento, prejudica reputação e afasta cliente novo." },
              { icon: Megaphone, title: "Anúncios sem retorno claro", desc: "Você paga campanhas todo mês mas não sabe se está dando ROI ou só queimando dinheiro." },
              { icon: RefreshCw, title: "Cliente que não volta", desc: "Comprou uma vez e sumiu — sem estratégia de recompra, sua loja vira porta giratória." },
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

      {/* ============== COMO FUNCIONA — 3 PASSOS ============== */}
      <section id="como-funciona" className="py-24" style={{ backgroundColor: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Como funciona
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Em 3 passos, você sai do achismo e{" "}
              <span style={{ color: C.red }}>passa a decidir com dados.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { n: "01", icon: ClipboardList, title: "Cadastre sua loja", desc: "Informe os dados básicos da operação e conecte vendas, cardápio e avaliações." },
              { n: "02", icon: ScanSearch, title: "Receba o diagnóstico da IA", desc: "Análise automática de margem, reputação, cardápio, concorrência e campanhas em minutos." },
              { n: "03", icon: Rocket, title: "Execute o plano de ação", desc: "Passo a passo priorizado por impacto financeiro, direto no seu painel — sem enrolação." },
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

          <div className="text-center mt-10">
            <Button
              size="lg"
              asChild
              className="font-semibold h-12 px-7 border-0 hover:opacity-90"
              style={{ backgroundColor: C.red, color: "#fff" }}
            >
              <Link to={CTA_PRIMARY}>
                Começar meu diagnóstico <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============== PERGUNTAS QUE O PAINEL RESPONDE ============== */}
      <section id="perguntas" className="py-24 relative overflow-hidden" style={{ backgroundColor: C.graphite }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: C.yellow }}>
              O que você responde com o painel
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Perguntas práticas. <span style={{ color: C.yellow }}>Respostas baseadas nos seus dados.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {[
              { q: "Onde estou perdendo dinheiro hoje?", a: "Veja exatamente em quais áreas — margem, taxas, cardápio, entrega — está vazando faturamento." },
              { q: "Quais produtos prejudicam minha margem?", a: "Identifique os campeões de venda que estão dando prejuízo e o que fazer com cada um." },
              { q: "O que devo corrigir primeiro?", a: "Plano priorizado por impacto financeiro: começa pelo que vai gerar mais resultado." },
              { q: "Quais reclamações mais aparecem?", a: "Análise das suas avaliações agrupadas por tema — entrega, sabor, embalagem, atendimento." },
              { q: "Meus anúncios estão dando retorno?", a: "Acompanhe campanhas, cupons e promoções pelo retorno real, não pelo volume aparente." },
              { q: "Por que meus clientes não voltam?", a: "Entenda taxa de recompra, frequência e o que precisa mudar para recuperar quem comprou uma vez." },
            ].map((p) => (
              <div
                key={p.q}
                className="rounded-2xl p-6 border"
                style={{ backgroundColor: "#00000040", borderColor: "#ffffff14" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: C.red, color: "#fff" }}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base mb-1.5">{p.q}</h3>
                    <p className="text-sm leading-relaxed text-white/65">{p.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-14 max-w-4xl mx-auto rounded-2xl p-8 md:p-10 text-center border"
            style={{ borderColor: "#ffffff1a", backgroundColor: "#00000050" }}
          >
            <p className="text-2xl md:text-3xl font-bold text-white leading-snug">
              "Você cuida da cozinha.{" "}
              <span style={{ color: C.yellow }}>O painel cuida das decisões do seu delivery.</span>"
            </p>
          </div>
        </div>
      </section>

      {/* ============== O QUE O PAINEL ANALISA ============== */}
      <section className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Tudo num só lugar
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

      {/* ============== PARA QUEM É ============== */}
      <section id="para-quem" className="py-24" style={{ backgroundColor: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center max-w-6xl mx-auto">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
                Para quem é
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
                Donos e gestores de loja própria que vivem do <span style={{ color: C.red }}>delivery</span>.
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#555" }}>
                Se você administra sua própria operação e quer parar de tomar decisão no escuro,
                este painel é para você. Funciona para quem está começando e também para quem já
                tem uma operação rodando e precisa entender por onde crescer.
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
                "WhatsApp e cardápio próprio",
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
              Pronto para saber exatamente o que está{" "}
              <span style={{ color: C.yellow }}>travando seu delivery?</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Cadastre sua loja, receba o diagnóstico completo da IA e comece a aplicar o plano
              de ação ainda hoje. Sem mensalidade para começar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                asChild
                className="font-bold h-14 px-8 text-base border-0 hover:opacity-90 shadow-2xl"
                style={{ backgroundColor: C.yellow, color: C.black, boxShadow: `0 20px 50px -10px ${C.yellow}66` }}
              >
                <Link to={CTA_PRIMARY}>
                  Fazer diagnóstico da minha loja <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                variant="outline"
                className="h-14 px-8 text-base bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={CTA_LOGIN}>Entrar no painel</Link>
              </Button>
            </div>
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
              <p className="text-white/40 text-xs">O painel do dono de delivery para vender mais e lucrar melhor.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/contato" className="text-white/70 hover:text-white transition">Contato</Link>
            <Link to={CTA_LOGIN} className="text-white/70 hover:text-white transition">Entrar</Link>
            <Link to={CTA_PRIMARY} className="text-white font-semibold transition">
              Fazer diagnóstico
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

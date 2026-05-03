import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoGD from "@/assets/logo-gestor-delivery.png";
import {
  TrendingDown, AlertTriangle, Star, Clock, Users, Megaphone,
  ChefHat, BarChart3, Target,
  ArrowRight, CheckCircle2, ClipboardList, Rocket,
  ScanSearch, Wallet, RefreshCw, HelpCircle,
  Gauge, Camera, MessageSquare, ChevronDown, TrendingUp, XCircle,
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
            <a href="#voce-recebe" className="hover:text-white transition">O que você recebe</a>
            <a href="#como-funciona" className="hover:text-white transition">Como funciona</a>
            <a href="#para-quem" className="hover:text-white transition">Para quem é</a>
            <a href="#duvidas" className="hover:text-white transition">Dúvidas</a>
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
                Diagnóstico de lucro para donos de delivery
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Seu delivery vende, mas{" "}
                <span style={{ color: C.red }}>o lucro não aparece?</span>
              </h1>

              <p className="text-lg text-white/80 max-w-xl leading-relaxed">
                Descubra onde o dinheiro está escapando na sua loja e receba um plano de ação
                com IA para vender mais, lucrar melhor e parar de decidir no achismo.
              </p>

              <p className="text-base text-white/60 max-w-xl leading-relaxed">
                Responda algumas perguntas, envie prints da sua operação e veja as 3 ações mais
                importantes para aplicar primeiro.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  asChild
                  className="font-semibold h-12 px-6 border-0 hover:opacity-90 shadow-2xl"
                  style={{ backgroundColor: C.red, color: "#fff", boxShadow: `0 20px 40px -15px ${C.red}AA` }}
                >
                  <Link to={CTA_PRIMARY}>
                    Fazer diagnóstico gratuito <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  asChild
                  variant="outline"
                  className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#exemplo">Ver exemplo de diagnóstico</a>
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

            {/* Mock dashboard premium — Antes / Depois */}
            <div className="relative">
              <div className="grid gap-4">
                {/* ANTES */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    backgroundColor: `${C.graphite}CC`,
                    borderColor: `${C.red}66`,
                    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${C.red}22`, color: C.red }}
                      >
                        Antes
                      </span>
                      <p className="text-white/70 text-sm">Burger House — Centro</p>
                    </div>
                    <XCircle className="h-4 w-4" style={{ color: C.red }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Margem", v: "12%" },
                      { l: "Entrega", v: "48 min" },
                      { l: "Recompra", v: "18%" },
                    ].map((k) => (
                      <div
                        key={k.l}
                        className="rounded-lg p-2.5 border"
                        style={{ backgroundColor: "#00000040", borderColor: "#ffffff10" }}
                      >
                        <p className="text-[9px] uppercase tracking-wider text-white/50">{k.l}</p>
                        <p className="text-base font-bold mt-0.5" style={{ color: C.red }}>{k.v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/60 mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: C.red }} />
                    Promoções queimando lucro
                  </p>
                </div>

                {/* DEPOIS */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    backgroundColor: `${C.graphite}CC`,
                    borderColor: `${C.yellow}88`,
                    boxShadow: `0 30px 60px -20px ${C.yellow}33`,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${C.yellow}22`, color: C.yellow }}
                      >
                        Depois
                      </span>
                      <p className="text-white/80 text-sm">Score</p>
                      <span className="text-white font-black text-lg">78</span>
                      <TrendingUp className="h-4 w-4" style={{ color: C.green }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l: "Margem", v: "27%", c: C.green },
                      { l: "Entrega", v: "32 min", c: C.green },
                      { l: "Recompra", v: "34%", c: C.yellow },
                    ].map((k) => (
                      <div
                        key={k.l}
                        className="rounded-lg p-2.5 border"
                        style={{ backgroundColor: "#00000040", borderColor: "#ffffff10" }}
                      >
                        <p className="text-[9px] uppercase tracking-wider text-white/50">{k.l}</p>
                        <p className="text-base font-bold mt-0.5" style={{ color: k.c }}>{k.v}</p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-lg p-2.5 border flex items-start gap-2"
                    style={{ backgroundColor: `${C.yellow}10`, borderColor: `${C.yellow}33` }}
                  >
                    <Target className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.yellow }} />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Próxima ação</p>
                      <p className="text-sm text-white">Reajustar combo "Duplo + Batata"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -bottom-4 -left-4 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2"
                style={{ backgroundColor: C.yellow, color: C.black }}
              >
                <TrendingUp className="h-4 w-4" />
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
              { icon: TrendingDown, title: "Produto campeão sem rentabilidade", desc: "Os mais vendidos podem ser justamente os que menos te dão lucro." },
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

      {/* ============== O QUE VOCÊ RECEBE ============== */}
      <section id="voce-recebe" className="py-24" style={{ backgroundColor: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              O que você recebe no diagnóstico
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Um raio-x completo da sua loja.{" "}
              <span style={{ color: C.red }}>Sem enrolação, com o que importa primeiro.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Gauge, title: "Nota geral da sua loja", desc: "Um score claro do quão saudável está sua operação hoje." },
              { icon: Wallet, title: "Onde você está perdendo dinheiro", desc: "Pontos exatos da operação que estão drenando faturamento todo mês." },
              { icon: TrendingDown, title: "Produtos que prejudicam sua margem", desc: "Lista dos itens que mais vendem mas pouco lucram — e o que fazer com cada um." },
              { icon: ChefHat, title: "Gargalos no cardápio, fotos e combos", desc: "O que precisa mudar no seu cardápio para vender mais e lucrar mais." },
              { icon: Star, title: "Problemas em entrega, avaliação e recompra", desc: "Diagnóstico de operação, reputação e fidelização do cliente." },
              { icon: Target, title: "As 3 ações mais importantes para fazer primeiro", desc: "Foco no que dá mais resultado por menos esforço — sem dispersar." },
              { icon: ClipboardList, title: "Plano de 7 e 30 dias", desc: "Roteiro semanal e mensal para aplicar as melhorias e medir o resultado." },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl p-7 border transition hover:-translate-y-1"
                style={{
                  backgroundColor: C.cream,
                  borderColor: "#00000010",
                  boxShadow: "0 10px 30px -15px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="h-11 w-11 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: C.black, color: C.yellow }}
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
      <section id="como-funciona" className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Como funciona
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Em 3 passos simples, você sai do achismo e{" "}
              <span style={{ color: C.red }}>passa a decidir com clareza.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { n: "01", icon: MessageSquare, title: "Responda perguntas rápidas", desc: "Conta pra gente o básico da sua loja: faturamento, ticket médio, principais produtos e canais." },
              { n: "02", icon: Camera, title: "Envie prints da sua operação", desc: "Imagens do seu app, vendas, avaliações e cardápio. Sem integração, sem senha, sem complicação." },
              { n: "03", icon: Rocket, title: "Receba seu diagnóstico + plano", desc: "Em minutos, um relatório com o que está travando sua loja e as 3 ações para começar agora." },
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
                Fazer diagnóstico gratuito <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============== EXEMPLO DE DIAGNÓSTICO ============== */}
      <section id="exemplo" className="py-24 relative overflow-hidden" style={{ backgroundColor: C.graphite }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.yellow }}>
              Exemplo de diagnóstico
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Veja como chega na sua mão.{" "}
              <span style={{ color: C.yellow }}>Direto e acionável.</span>
            </h2>
          </div>

          <div
            className="max-w-4xl mx-auto rounded-2xl border p-6 md:p-8"
            style={{ backgroundColor: "#000000A0", borderColor: "#ffffff1a" }}
          >
            <div className="flex items-center justify-between pb-5 mb-6 border-b" style={{ borderColor: "#ffffff14" }}>
              <div>
                <p className="text-xs uppercase tracking-widest text-white/50">Diagnóstico da loja</p>
                <p className="text-white text-lg font-bold">Burger House — Centro</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-white/50">Nota geral</p>
                <p className="text-4xl font-black" style={{ color: C.yellow }}>78</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: C.red }}>
                  Onde você está perdendo dinheiro
                </p>
                <ul className="space-y-3">
                  {[
                    { t: "Combo \"Duplo + Batata\" abaixo do custo", v: "R$ 1.840 / mês" },
                    { t: "Tempo de entrega alto derrubando recompra", v: "R$ 2.300 / mês" },
                    { t: "Frete grátis sem ticket mínimo", v: "R$ 1.150 / mês" },
                  ].map((i) => (
                    <li key={i.t} className="rounded-lg p-3 border" style={{ backgroundColor: "#00000060", borderColor: "#ffffff10" }}>
                      <p className="text-sm text-white">{i.t}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: C.red }}>{i.v}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: C.yellow }}>
                  Faça isso primeiro
                </p>
                <ol className="space-y-3">
                  {[
                    { t: "Reajustar preço do combo \"Duplo + Batata\" em R$ 4", w: "Esta semana" },
                    { t: "Definir ticket mínimo de R$ 35 para frete grátis", w: "Esta semana" },
                    { t: "Treinar embalagem para reduzir tempo em 8 min", w: "Próximos 14 dias" },
                  ].map((i, idx) => (
                    <li key={i.t} className="rounded-lg p-3 border flex items-start gap-3" style={{ backgroundColor: "#00000060", borderColor: "#ffffff10" }}>
                      <span
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ backgroundColor: C.yellow, color: C.black }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm text-white">{i.t}</p>
                        <p className="text-xs mt-0.5" style={{ color: C.yellow }}>{i.w}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                asChild
                className="font-semibold h-12 px-7 border-0 hover:opacity-90"
                style={{ backgroundColor: C.red, color: "#fff" }}
              >
                <Link to={CTA_PRIMARY}>
                  Fazer meu diagnóstico gratuito <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============== O QUE O SISTEMA ANALISA ============== */}
      <section className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              O que o sistema analisa
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
                este sistema é para você. Funciona para quem está começando e também para quem já
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

      {/* ============== DÚVIDAS COMUNS ============== */}
      <section id="duvidas" className="py-24" style={{ backgroundColor: C.cream }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: C.red }}>
              Dúvidas comuns
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Tirando as dúvidas{" "}
              <span style={{ color: C.red }}>antes de você começar.</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                q: "Preciso entender de tecnologia?",
                a: "Não. Você só precisa responder algumas perguntas simples sobre sua loja e enviar prints do seu app. O sistema faz o resto.",
              },
              {
                q: "Preciso conectar meu iFood?",
                a: "Não. Nada de senha, integração ou login no app. O diagnóstico funciona com base nas suas respostas e nos prints que você envia.",
              },
              {
                q: "Serve para loja pequena?",
                a: "Sim. Funciona para qualquer porte — desde quem vende 30 pedidos por semana até operações com várias unidades.",
              },
              {
                q: "É consultoria ou sistema?",
                a: "É um sistema com IA. Ele entrega o diagnóstico e o plano de ação automaticamente, no seu painel, sem você precisar agendar reunião com ninguém.",
              },
              {
                q: "Quanto tempo leva para gerar o diagnóstico?",
                a: "Menos de 5 minutos respondendo as perguntas. A análise da IA fica pronta em segundos depois disso.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border bg-white overflow-hidden"
                style={{ borderColor: "#00000010", boxShadow: "0 4px 20px -10px rgba(0,0,0,0.08)" }}
              >
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                  <span className="font-semibold text-base" style={{ color: C.black }}>{f.q}</span>
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180 shrink-0" style={{ color: C.red }} />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "#555" }}>
                  {f.a}
                </div>
              </details>
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
              Pronto para descobrir onde seu delivery está{" "}
              <span style={{ color: C.yellow }}>perdendo dinheiro?</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Faça o diagnóstico da sua loja e receba um plano claro com as ações mais importantes
              para melhorar vendas, margem e operação.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="font-semibold h-12 px-7 border-0 hover:opacity-90 shadow-2xl"
                style={{ backgroundColor: C.red, color: "#fff", boxShadow: `0 20px 40px -15px ${C.red}AA` }}
              >
                <Link to={CTA_PRIMARY}>
                  Fazer diagnóstico gratuito <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                variant="outline"
                className="h-12 px-7 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={CTA_LOGIN}>Entrar no painel</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="py-10 border-t" style={{ backgroundColor: C.black, borderColor: "#ffffff14" }}>
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div className="flex items-center gap-3">
            <img src={logoGD} alt="Gestor de Delivery" className="h-7 w-auto opacity-80" />
            <span>© {new Date().getFullYear()} Gestor de Delivery</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/contato" className="hover:text-white transition">Contato</Link>
            <a href="#top" className="hover:text-white transition">Voltar ao topo</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

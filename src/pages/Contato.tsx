import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Mail,
  MessageCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// Mesma paleta premium da landing (isolada do design system global)
const C = {
  red: "#EA1D2C",
  yellow: "#FFD000",
  black: "#111111",
  graphite: "#1F1F1F",
  cream: "#FFF8F2",
  green: "#16A34A",
};

const CTA_LOGIN = "/auth";

// TODO: substituir pelos contatos oficiais
const WHATSAPP_NUMBER = "5515900000000"; // formato internacional, sem + nem espaços
const WHATSAPP_DISPLAY = "(15) 90000-0000";
const EMAIL_CONTATO = "contato@gestordedelivery.com.br";
const ENDERECO =
  "Rua Horácio Cenci, 9 — Sala 604 — Campolim — Sorocaba/SP — CEP 18047-800";

const contactSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { message: "Informe seu nome completo" })
    .max(120, { message: "Nome muito longo" }),
  whatsapp: z
    .string()
    .trim()
    .min(8, { message: "Informe um WhatsApp válido" })
    .max(30, { message: "WhatsApp muito longo" }),
  email: z
    .string()
    .trim()
    .email({ message: "E-mail inválido" })
    .max(255, { message: "E-mail muito longo" }),
  restaurante: z
    .string()
    .trim()
    .max(160, { message: "Nome do restaurante muito longo" })
    .optional()
    .or(z.literal("")),
  cidade: z
    .string()
    .trim()
    .max(120, { message: "Cidade muito longa" })
    .optional()
    .or(z.literal("")),
  faturamento: z
    .string()
    .max(60)
    .optional()
    .or(z.literal("")),
  mensagem: z
    .string()
    .trim()
    .max(2000, { message: "Mensagem muito longa (máx. 2000 caracteres)" })
    .optional()
    .or(z.literal("")),
});

type ContactForm = z.infer<typeof contactSchema>;

const initialForm: ContactForm = {
  nome: "",
  whatsapp: "",
  email: "",
  restaurante: "",
  cidade: "",
  faturamento: "",
  mensagem: "",
};

const Contato = () => {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof ContactForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ContactForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ContactForm;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Confira os campos destacados.");
      return;
    }

    setSubmitting(true);
    try {
      const data = parsed.data;
      const { error } = await supabase.from("contact_leads").insert({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email,
        restaurante: data.restaurante || null,
        cidade: data.cidade || null,
        faturamento: data.faturamento || null,
        mensagem: data.mensagem || null,
        origem: "landing-contato",
      });
      if (error) throw error;

      // Abre WhatsApp em nova aba como fallback de conversão imediata
      const msg = encodeURIComponent(
        `Olá! Sou ${data.nome}` +
          (data.restaurante ? ` (${data.restaurante})` : "") +
          (data.cidade ? ` — ${data.cidade}` : "") +
          ". Gostaria de falar sobre a gestão do meu delivery.",
      );
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      setSent(true);
      setForm(initialForm);
      toast.success("Mensagem enviada! Entraremos em contato em até 24h.");
    } catch (err) {
      console.error("contact submit error", err);
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Olá! Quero falar com um Gestor de Delivery.",
  )}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream, color: C.black }}>
      {/* HEADER */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ backgroundColor: `${C.black}E6`, borderColor: "#ffffff14" }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-black text-white"
              style={{ backgroundColor: C.red }}
            >
              G
            </div>
            <span className="font-semibold text-white tracking-tight">
              Gestor de Delivery<span style={{ color: C.yellow }}>.</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <Link to="/#como-funciona" className="hover:text-white transition">Como funciona</Link>
            <Link to="/#o-que-analisamos" className="hover:text-white transition">O que analisamos</Link>
            <Link to="/#para-quem" className="hover:text-white transition">Para quem é</Link>
            <Link to="/contato" className="text-white">Contato</Link>
          </nav>

          <Button
            asChild
            className="font-semibold border-0 hover:opacity-90"
            style={{ backgroundColor: C.red, color: "#fff" }}
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ backgroundColor: C.black }}>
        <div
          className="pointer-events-none absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: C.red }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: C.yellow }}
        />
        <div className="container mx-auto px-4 py-16 md:py-20 relative">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium mb-5"
            style={{ borderColor: "#ffffff26", color: C.yellow }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.yellow }} />
            Atendimento humano · Resposta em até 24h
          </div>
          <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight max-w-3xl">
            Fale com um Gestor de Delivery
          </h1>
          <p className="mt-4 text-white/75 max-w-2xl text-lg">
            Receba uma análise inicial gratuita do seu delivery e descubra onde estão os
            principais pontos de perda de margem, pedidos e reputação.
          </p>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* FORMULÁRIO */}
          <Card className="p-6 md:p-8 border-0 shadow-xl" style={{ backgroundColor: "#fff" }}>
            {sent ? (
              <div className="text-center py-10">
                <div
                  className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${C.green}1A`, color: C.green }}
                >
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Mensagem recebida!</h2>
                <p className="text-black/60 max-w-md mx-auto">
                  Um gestor entrará em contato em até 24h. Se preferir, fale agora pelo WhatsApp.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="font-semibold border-0 hover:opacity-90"
                    style={{ backgroundColor: C.red, color: "#fff" }}
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => setSent(false)}>
                    Enviar outra mensagem
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Solicite sua análise</h2>
                  <p className="text-sm text-black/60 mt-1">
                    Preencha em 1 minuto. Vamos retornar com um diagnóstico inicial do seu delivery.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Seu nome *</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) => update("nome")(e.target.value)}
                      placeholder="Ex.: João Silva"
                      maxLength={120}
                      aria-invalid={!!errors.nome}
                    />
                    {errors.nome && <p className="text-xs text-red-600">{errors.nome}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      value={form.whatsapp}
                      onChange={(e) => update("whatsapp")(e.target.value)}
                      placeholder="(00) 00000-0000"
                      maxLength={30}
                      aria-invalid={!!errors.whatsapp}
                    />
                    {errors.whatsapp && <p className="text-xs text-red-600">{errors.whatsapp}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email")(e.target.value)}
                    placeholder="seuemail@dominio.com"
                    maxLength={255}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="restaurante">Nome do restaurante</Label>
                    <Input
                      id="restaurante"
                      value={form.restaurante}
                      onChange={(e) => update("restaurante")(e.target.value)}
                      placeholder="Ex.: Burger House"
                      maxLength={160}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade / UF</Label>
                    <Input
                      id="cidade"
                      value={form.cidade}
                      onChange={(e) => update("cidade")(e.target.value)}
                      placeholder="Ex.: Sorocaba/SP"
                      maxLength={120}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="faturamento">Faturamento mensal estimado</Label>
                  <Select
                    value={form.faturamento || undefined}
                    onValueChange={(v) => update("faturamento")(v)}
                  >
                    <SelectTrigger id="faturamento">
                      <SelectValue placeholder="Selecione uma faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ate-20k">Até R$ 20 mil</SelectItem>
                      <SelectItem value="20k-50k">R$ 20 mil – R$ 50 mil</SelectItem>
                      <SelectItem value="50k-100k">R$ 50 mil – R$ 100 mil</SelectItem>
                      <SelectItem value="100k-300k">R$ 100 mil – R$ 300 mil</SelectItem>
                      <SelectItem value="300k+">Acima de R$ 300 mil</SelectItem>
                      <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mensagem">Conte rapidamente seu cenário</Label>
                  <Textarea
                    id="mensagem"
                    value={form.mensagem}
                    onChange={(e) => update("mensagem")(e.target.value)}
                    placeholder="Ex.: Vendo por iFood, faturamento caindo, avaliação 4.4..."
                    rows={4}
                    maxLength={2000}
                  />
                  {errors.mensagem && <p className="text-xs text-red-600">{errors.mensagem}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-semibold border-0 hover:opacity-90 h-12 text-base"
                  style={{ backgroundColor: C.red, color: "#fff" }}
                >
                  {submitting ? "Enviando..." : "Quero falar com um especialista"}
                  {!submitting && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>

                <p className="text-xs text-black/50 text-center">
                  Ao enviar, você concorda em ser contatado por nosso time. Não fazemos spam.
                </p>
              </form>
            )}
          </Card>

          {/* CANAIS DE CONTATO */}
          <div className="space-y-4">
            {/* WhatsApp */}
            <Card
              className="p-6 border-0 shadow-lg"
              style={{ backgroundColor: C.black, color: "#fff" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${C.green}26`, color: C.green }}
                >
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                    WhatsApp
                  </p>
                  <p className="text-lg font-bold mt-0.5">{WHATSAPP_DISPLAY}</p>
                  <p className="text-sm text-white/60 mt-1">
                    Atendimento direto com um gestor.
                  </p>
                  <Button
                    asChild
                    className="mt-4 font-semibold border-0 hover:opacity-90"
                    style={{ backgroundColor: C.green, color: "#fff" }}
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      Conversar agora
                    </a>
                  </Button>
                </div>
              </div>
            </Card>

            {/* E-mail */}
            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${C.red}14`, color: C.red }}
                >
                  <Mail className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-black/50 font-semibold">
                    E-mail
                  </p>
                  <a
                    href={`mailto:${EMAIL_CONTATO}`}
                    className="text-base font-semibold mt-0.5 block hover:underline"
                    style={{ color: C.black }}
                  >
                    {EMAIL_CONTATO}
                  </a>
                  <p className="text-sm text-black/60 mt-1">
                    Para propostas, parcerias e suporte.
                  </p>
                </div>
              </div>
            </Card>

            {/* Endereço */}
            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${C.yellow}33`, color: "#8a6d00" }}
                >
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-black/50 font-semibold">
                    Endereço
                  </p>
                  <p className="text-base font-semibold mt-0.5 leading-snug">
                    Rua Horácio Cenci, 9 — Sala 604
                  </p>
                  <p className="text-sm text-black/70">
                    Campolim — Sorocaba/SP — CEP 18047-800
                  </p>
                </div>
              </div>
            </Card>

            {/* Horário + Garantias */}
            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5" style={{ color: C.red }} />
                <p className="font-semibold">Segunda a sexta, 9h às 18h</p>
              </div>
              <ul className="space-y-2.5 text-sm text-black/75">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.green }} />
                  Resposta garantida em até 24h úteis.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.green }} />
                  Atendimento humano, sem bots.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.green }} />
                  Conversa inicial sem compromisso.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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
            <Link to="/contato" className="text-white/70 hover:text-white transition">Contato</Link>
            <Link to={CTA_LOGIN} className="text-white/40 hover:text-white/70 transition text-xs">
              Área do cliente
            </Link>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4 text-center text-xs text-white/40">
          {ENDERECO}
        </div>
        <div className="text-center text-xs text-white/30 pb-6">
          © {new Date().getFullYear()} Gestor de Delivery — Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Contato;

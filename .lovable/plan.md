## Reposicionamento da Landing Page — De SaaS para Serviço Premium de Gestão de Delivery

### Objetivo
Transformar `src/pages/Index.tsx` em uma página que vende um **serviço consultivo premium** de gestão de delivery (não mais um SaaS self-service), com visual escuro/imponente e copy de autoridade.

---

### 1. Mudanças de copy e estrutura (`src/pages/Index.tsx`)

Reescrever a página inteira com as seguintes seções, nesta ordem:

**Header premium**
- Logo + nome "Gestor de Delivery" (estilo monograma em vermelho/preto)
- Links âncora: Como funciona · O que analisamos · Para quem é · Falar com especialista
- CTA no topo: "Solicitar análise" (vermelho sólido)
- Remover botões "Entrar" / "Começar grátis" do destaque (acesso ao login fica como link discreto "Área do cliente" no rodapé do header)

**Hero (fundo escuro #111111 com detalhes em vermelho/amarelo)**
- Badge: "Gestão especializada para delivery"
- H1: "Gestão profissional para restaurantes que querem vender mais no delivery"
- Subtítulo: "Assumimos a inteligência operacional do seu delivery: cardápio, margem, reputação, campanhas, concorrência, recompra e plano de crescimento para aplicativos e canais próprios."
- CTA primário (vermelho #EA1D2C): "Solicitar análise do meu delivery"
- CTA secundário (outline claro): "Ver como funciona"
- Mock visual lateral: card escuro com mini-dashboard (score, ticket médio, pedidos, evolução) usando a paleta delivery
- Selos de confiança: "iFood · 99Food · WhatsApp · Cardápio próprio"

**Seção de dores**
- Título: "O problema não é só vender pouco. É não saber onde o dinheiro está escapando."
- 6 cards: Margem baixa · Promoções sem lucro · Avaliações ruins · Entrega lenta · Baixa recompra · Concorrência mais forte
- Cards claros sobre off-white #FFF8F2, borda fina, ícone vermelho

**Seção de serviços** (id="como-funciona")
- Título: "Uma gestão completa para transformar delivery em canal de crescimento."
- 6 cards: Diagnóstico Comercial · Gestão de Cardápio · Performance em Aplicativos · Campanhas e Promoções · Reputação e Avaliações · Plano de Crescimento

**Seção diferenciadora (fundo grafite #1F1F1F)**
- Frase forte: "Você não contrata uma plataforma. Você contrata uma equipe olhando para o seu delivery."
- 3 colunas: Dados · Inteligência Artificial · Visão estratégica humana
- Frases-âncora: "Você cuida da cozinha. Nós cuidamos da performance do seu delivery."

**Seção de processo**
- 4 etapas numeradas: 1) Raio-X da operação · 2) Diagnóstico estratégico · 3) Plano de ação priorizado · 4) Acompanhamento e otimização

**Seção "Para quem é"** (id="para-quem")
- Lista visual: Hamburguerias · Pizzarias · Açaíterias · Dark Kitchens · Restaurantes locais · Operações em iFood/99Food/WhatsApp/cardápio próprio

**Seção de indicadores analisados** (id="o-que-analisamos")
- Grid com: Cardápio, margem, ticket médio, avaliações, tempo de entrega, cancelamentos, concorrência, campanhas, recompra, produtos campeões e produtos problemáticos
- Estilo: chips/tags escuros sobre fundo claro

**CTA final (fundo preto #111 com gradiente vermelho)**
- "Quer descobrir onde seu delivery está perdendo dinheiro?"
- Botão grande amarelo #FFD000 com texto preto: "Solicitar análise agora"
- Botão secundário: "Falar com um gestor"

**Footer**
- Nome da empresa, tagline curta, link discreto "Área do cliente" → `/auth`

---

### 2. Direção visual e paleta

Aplicar via classes Tailwind inline (cores arbitrárias `bg-[#EA1D2C]`, `text-[#FFD000]`, etc.) para evitar mexer no design system global e não impactar o resto do app:

- Vermelho principal: `#EA1D2C`
- Amarelo destaque: `#FFD000`
- Preto premium: `#111111`
- Grafite: `#1F1F1F`
- Off-white: `#FFF8F2`
- Verde positivo: `#16A34A`

Cards: bordas finas (`border border-black/10` ou `border-white/10`), sombra elegante (`shadow-xl shadow-black/5`), `rounded-2xl`, padding generoso (`p-8`).

Tipografia: títulos grandes e densos (`text-5xl md:text-7xl font-bold tracking-tight`), bom espaçamento entre seções (`py-24`).

Ícones: usar `lucide-react` (já no projeto) — `ChefHat`, `TrendingUp`, `Star`, `Truck`, `Target`, `BarChart3`, `Users`, `MessageCircle`, etc.

---

### 3. CTAs e roteamento

Todos os CTAs principais ("Solicitar análise", "Falar com especialista", "Falar com um gestor") apontam para o mesmo destino. Como ainda não existe formulário de captação:

- **Decisão padrão (a confirmar se preferir outra):** apontar todos os CTAs principais para `/auth?mode=signup` mantendo a rota existente, mas com label de serviço ("Solicitar análise"). Assim a página vende serviço sem quebrar o fluxo atual.
- "Área do cliente" (link discreto) → `/auth`

Se preferir um link `mailto:` ou WhatsApp, ajusto após aprovação.

---

### 4. Escopo do que NÃO muda

- Nenhuma mudança em `App.tsx`, rotas, autenticação ou backend.
- `src/index.css` e `tailwind.config.ts` permanecem intactos (cores aplicadas inline na Index para isolar o tema premium da landing).
- Nenhuma alteração em páginas internas (`/app/*`).

---

### Arquivos alterados
- `src/pages/Index.tsx` — reescrita completa.

### Resultado esperado
Landing escura, imponente, com narrativa de serviço consultivo premium para donos de delivery, paleta iFood/99, CTAs de captação ("Solicitar análise") e zero linguagem de SaaS self-service.
## Página de Contato com formulário e canais de conversão

Criar uma nova página `/contato` alinhada à identidade premium da landing (preto, vermelho `#EA1D2C`, amarelo `#FFD000`, off-white) com formulário de captação de leads e exibição clara dos canais (endereço, e-mail e WhatsApp).

### O que será entregue

**1. Nova página `src/pages/Contato.tsx`**
- Header e footer reaproveitando o estilo visual do `Index.tsx` (mesma paleta isolada, mesmo logo "G", mesmo CTA "Área do cliente").
- Hero curto: "Fale com um Gestor de Delivery" + subtítulo de conversão ("Receba uma análise inicial gratuita do seu delivery em até 24h").
- Layout em 2 colunas (responsivo, vira 1 coluna no mobile):
  - **Esquerda – Formulário** dentro de um Card com:
    - Nome, WhatsApp, E-mail, Nome do restaurante, Cidade/UF, Faturamento mensal estimado (select), Mensagem.
    - Botão primário vermelho: "Quero falar com um especialista".
    - Validação com `zod` (trim, e-mail válido, limites de tamanho), mensagens de erro inline e `toast` de sucesso/erro (sonner já configurado).
    - Ao enviar com sucesso: também abre o WhatsApp em nova aba com mensagem pré-formatada (fallback de conversão imediata).
  - **Direita – Canais de contato** em cards escuros:
    - WhatsApp (ícone + número clicável `https://wa.me/...`) — CTA destacado.
    - E-mail (mailto:).
    - Endereço completo: Rua Horácio Cenci, 9 — Sala 604 — Campolim — Sorocaba/SP — CEP 18047-800.
    - Horário de atendimento (Seg–Sex, 9h–18h).
    - Bloco de "garantias" (resposta em até 24h, atendimento humano, sem compromisso).

**2. Persistência do lead (Lovable Cloud)**
- Criar tabela `public.contact_leads` (id, created_at, nome, whatsapp, email, restaurante, cidade, faturamento, mensagem, origem).
- RLS: habilitada; `INSERT` permitido para `anon` e `authenticated` (formulário público); `SELECT` apenas para usuários com role `admin` (via `has_role`, padrão de segurança do projeto).
- O formulário grava direto via `supabase.from('contact_leads').insert(...)` — sem edge function.

**3. Integração na navegação**
- Adicionar rota `/contato` em `src/App.tsx`.
- Adicionar link "Contato" no menu do header e no rodapé do `Index.tsx`.
- Trocar o link "Falar com especialista" do header/footer da landing para apontar para `/contato` (em vez de `/auth?mode=signup`), mantendo o CTA "Solicitar análise" do hero apontando para signup.

### Dados de contato exibidos

- **Endereço:** Rua Horácio Cenci, 9 — Sala 604 — Campolim — Sorocaba/SP — CEP 18047-800
- **WhatsApp / E-mail:** preciso que você me informe os valores reais. Enquanto isso, deixarei placeholders (`(15) 90000-0000` e `contato@gestordedelivery.com.br`) marcados com comentário `// TODO` para você ajustar — ou me responda agora com os dados certos que já entrego prontos.

### Detalhes técnicos

- Validação: `zod` + `react-hook-form` (já presentes no projeto via `components/ui/form`).
- Toasts: `sonner` (já montado em `App.tsx`).
- Sanitização de URL: `encodeURIComponent` na mensagem do WhatsApp.
- Estilo: classes Tailwind + `style={{ backgroundColor: C.* }}` para manter a paleta da landing isolada do design system (mesmo padrão usado em `Index.tsx`).
- Sem novas dependências.

### Arquivos afetados

- `src/pages/Contato.tsx` (novo)
- `src/App.tsx` (rota)
- `src/pages/Index.tsx` (links de header/footer)
- Migração SQL: tabela `contact_leads` + RLS

Posso prosseguir? Se já tiver WhatsApp e e-mail oficiais, me passe junto da aprovação.
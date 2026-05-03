
## Objetivo
Reformular `src/pages/Index.tsx` com posicionamento de "Diagnóstico de lucro", linguagem de dono de restaurante, sem termos técnicos como "conecte seus dados", e nova ordem de seções com FAQ e bloco "O que você recebe".

## Mudanças no `src/pages/Index.tsx`

### 1. Header
- Manter estrutura, trocar nav: "Como funciona", "O que você recebe", "Para quem é", "Dúvidas".
- Botão CTA do header continua "Fazer diagnóstico" → `/auth`.

### 2. Hero (reescrita completa)
- Badge: **"Diagnóstico de lucro para donos de delivery"** (substitui "Painel inteligente...").
- H1: **"Seu delivery vende, mas o lucro não aparece?"** (com "lucro não aparece" destacado em vermelho).
- Subheadline: "Descubra onde o dinheiro está escapando na sua loja e receba um plano de ação com IA para vender mais, lucrar melhor e parar de decidir no achismo."
- Texto de apoio: "Responda algumas perguntas, envie prints da sua operação e veja as 3 ações mais importantes para aplicar primeiro."
- CTA primário: **"Fazer diagnóstico gratuito"**.
- CTA secundário: **"Ver exemplo de diagnóstico"**.
- Bloco "Funciona com" mantido.

### 3. Mockup do hero — Antes / Depois
Substituir o card único por dois cards lado-a-lado (ou empilhados em mobile) dentro da coluna direita:
- **Antes** (borda vermelha): Margem baixa 12%, Entrega lenta 48min, Recompra 18%, "Promoções queimando lucro".
- **Depois** (borda verde/amarela): Score 78 ↑, Margem 27%, Entrega 32min, Recompra 34%, "Próxima ação: ajustar combo X".
- Selo flutuante: "+34% em 90 dias" (mantido).

### 4. Seção "Você reconhece isso?" (Dores)
Mantida quase como está. Garantir todos os 7 cards listados pelo usuário (já existem todos: vende mas não lucra, promoções, produto campeão, avaliações, entrega, anúncios, cliente que não volta).

### 5. NOVA seção "O que você recebe no diagnóstico"
Grid de 7 cards com ícones (lucide):
- Nota geral da sua loja (`Gauge`)
- Onde você está perdendo dinheiro (`Wallet`)
- Produtos que prejudicam sua margem (`TrendingDown`)
- Gargalos no cardápio, fotos e combos (`ChefHat`)
- Problemas em entrega, avaliação e recompra (`Star`)
- As 3 ações mais importantes para fazer primeiro (`Target`)
- Plano de 7 e 30 dias (`ClipboardList`)
Estilo: cards brancos sobre fundo creme, igual aos atuais de Dores.

### 6. Seção "Como funciona em 3 passos"
Reescrever passos sem "conecte seus dados":
- 01 — **Responda perguntas rápidas** sobre sua loja (faturamento, ticket, principais produtos).
- 02 — **Envie prints** do seu app (vendas, avaliações, cardápio).
- 03 — **Receba seu diagnóstico + plano de ação** priorizado por impacto financeiro.

### 7. NOVA seção "Exemplo de diagnóstico"
Card grande mostrando preview de relatório fictício:
- Topo: nome fictício "Burger House — Centro" + score 78.
- Bloco "Onde você está perdendo dinheiro": 3 itens com R$ estimado/mês.
- Bloco "Faça isso primeiro": 3 ações com prazo.
- CTA: "Fazer meu diagnóstico gratuito".

### 8. Seção "O que o sistema analisa"
Manter as pílulas (Cardápio, Margem por produto, etc.).

### 9. Seção "Para quem é"
Manter como está.

### 10. NOVA seção "Dúvidas comuns" (FAQ)
Lista expandível (`<details>` nativo para evitar dependências) com 5 perguntas:
- Preciso entender de tecnologia? → "Não. Você responde perguntas simples e envia prints..."
- Preciso conectar meu iFood? → "Não. O diagnóstico funciona só com prints e respostas..."
- Serve para loja pequena? → "Sim. Funciona para qualquer porte..."
- É consultoria ou sistema? → "É um sistema com IA que entrega um diagnóstico..."
- Quanto tempo leva o diagnóstico? → "Menos de 5 minutos respondendo + análise em segundos."

### 11. CTA final
- H2: **"Pronto para descobrir onde seu delivery está perdendo dinheiro?"**
- Texto: "Faça o diagnóstico da sua loja e receba um plano claro com as ações mais importantes para melhorar vendas, margem e operação."
- Botões: **"Fazer diagnóstico gratuito"** (primário, vermelho) + **"Entrar no painel"** (secundário, outline).

### 12. Footer
Mantido.

## Detalhes técnicos
- Arquivo único: `src/pages/Index.tsx`. Sem novas dependências.
- Paleta `C` mantida (vermelho/amarelo/preto/creme/verde) — já alinhada ao briefing.
- Ícones extras a importar do `lucide-react`: `Gauge`, `Camera`, `MessageSquare`, `ChevronDown` (para FAQ).
- Ordem final no JSX: Header → Hero → Dores → O que você recebe → Como funciona → Exemplo de diagnóstico → O que analisa → Para quem é → FAQ → CTA final → Footer.
- Atualizar âncoras do header nav: `#voce-recebe`, `#como-funciona`, `#exemplo`, `#para-quem`, `#duvidas`.

## Fora de escopo
- Sem mudanças em rotas, auth ou no app interno.
- Sem novos componentes em `src/components` — tudo inline em `Index.tsx` para manter o padrão atual do arquivo.

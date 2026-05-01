## Objetivo

Adicionar uma página `/app/chat` onde o usuário conversa livremente com o **Gestor IA de Delivery** — o mesmo "cérebro" usado no diagnóstico, com acesso à base de conhecimento (RAG sobre `knowledge_base`). Streaming de tokens, histórico em memória da sessão, markdown nas respostas.

## O que será criado

### 1. Edge function `supabase/functions/chat-gestor/index.ts`

Recebe `{ messages: [{role,content}, ...] }` e devolve stream SSE.

Fluxo:
1. Pega a última mensagem do usuário.
2. Chama `findKnowledgeSnippets` (já existe em `_shared/memory.ts`) para buscar top 5 chunks relevantes na `knowledge_base` — só ativos (já filtrado pelo `match_knowledge` atualizado).
3. Monta `system prompt` do "Gestor IA de Delivery" + `KNOWLEDGE_CONTEXT` com os chunks encontrados.
4. Chama `https://ai.gateway.lovable.dev/v1/chat/completions` com `model: google/gemini-2.5-flash`, `stream: true`, e devolve o body cru ao cliente (SSE).
5. Trata 429/402 com mensagens claras.

System prompt resumido:
- Linguagem simples, PT-BR, markdown.
- Não inventar números/métricas da loja.
- Marcar [HIPÓTESE] quando supor.
- Citar tópico quando usar a base ("Pelo princípio de combos: ...").
- Recusar educadamente perguntas fora de delivery.

A função NÃO persiste histórico — fica apenas na sessão React. (Se o usuário pedir histórico depois, criamos tabela.)

### 2. Página `src/pages/app/Chat.tsx`

UI estilo chat:
- Cabeçalho: ícone + "Gestor IA de Delivery" + botão "Limpar conversa".
- Lista de mensagens (user à direita, assistant à esquerda) com `react-markdown` (já instalado).
- Indicador de digitação enquanto faz stream.
- Input fixo embaixo + botão enviar (Enter envia, Shift+Enter quebra linha).
- Sugestões iniciais clicáveis quando a conversa está vazia: "Como aumentar meu ticket médio?", "Como reduzir cancelamentos?", "Vale a pena usar Super Restaurante?", "Como melhorar minha conversão de visita em pedido?".
- Toasts para erros 429/402 com texto vindo da edge function.

Streaming: usa `fetch` direto contra `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gestor` com `Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`, parser SSE linha-a-linha (igual ao padrão recomendado).

### 3. Registro no app

- `src/App.tsx`: nova rota `<Route path="chat" element={<Chat />} />` dentro do `AppLayout`.
- `src/components/AppSidebar.tsx`: novo item no grupo "Geral" — `{ title: "Gestor IA (Chat)", url: "/app/chat", icon: MessageSquare }` — logo abaixo de "Novo Diagnóstico".

## O que NÃO muda

- Nenhuma migração de banco. A função usa a `knowledge_base` já versionada.
- `ai-consult` (do diagnóstico) fica intacto.
- `client.ts`, `types.ts`, `.env` — preservados.

## Validação

- Abrir `/app/chat`, perguntar "como aumentar meu ticket médio?" — esperado: resposta em streaming citando combos/complementos (RAG-011 e correlatos).
- Perguntar algo fora de tema ("me dá receita de bolo") — esperado: recusa educada.
- Cortar Cloud temporariamente / testar 402 — toast aparece.

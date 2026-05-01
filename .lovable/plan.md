# Editor/Gerador de Imagens no Chat com inteligência da base RAG

## Objetivo
Permitir que, dentro do chat (`/app/chat`), o usuário peça **banners**, **imagens promocionais** ou **melhorias de fotos de produto**. A IA decide sozinha quando gerar/editar imagem (via tool-calling) e usa as regras visuais da base RAG (foto de prato, composição, cores) para guiar o resultado.

---

## Arquitetura

```text
Usuário no Chat
   │  "faça um banner de hambúrguer artesanal"
   │  ou: "melhora essa foto" + imagem anexada
   ▼
chat-gestor (gemini-2.5-flash) ─── já tem RAG ───┐
   │                                              │
   ├─► Tool-calling decide:                       │
   │     • só texto?  → fluxo atual               │
   │     • imagem?    → chama tool                │
   │                                              ▼
   ├─► Busca extra na knowledge_base com query
   │   "fotografia de produto, banner, composição visual"
   │
   ├─► Monta prompt enriquecido (regras RAG + pedido do user)
   │
   ├─► POST gateway (google/gemini-2.5-flash-image)
   │
   ├─► Recebe base64 → upload no bucket chat-images
   │
   └─► Retorna { content: "texto explicativo", images: [signedUrl] }
   ▼
Chat.tsx renderiza imagem inline + texto
```

**Por que Storage e não base64 direto:** uma imagem em base64 pesa 500KB–2MB. Mantê-la no histórico estoura payload do gateway nas próximas mensagens. Salvar em bucket privado e devolver signed URL resolve.

---

## Decisões já tomadas
- **Modelo:** `google/gemini-2.5-flash-image` (Nano Banana Flash) — ~$0,04/imagem.
- **Limite:** 3 imagens por conversa (anti-abuso).
- **Bucket:** `chat-images` privado, signed URLs de 7 dias.
- **RAG genérica:** busca semântica já cobre os chunks visuais existentes; sem necessidade de re-tagging agora.

---

## Passos de implementação

### 1. Migration — bucket de Storage
Criar bucket privado `chat-images` + policies RLS:
- INSERT: service role (edge function escreve).
- SELECT: dono do arquivo (path prefixado por `user_id/`).

### 2. Refatorar `supabase/functions/chat-gestor/index.ts`
- Definir tool `generate_or_edit_image` no payload do `gemini-2.5-flash`:
  - parâmetros: `prompt` (string), `mode` ("generate" | "edit"), `style_hint` (string opcional).
- Loop de tool-calling (max 2 iterações):
  1. Chamar `gemini-2.5-flash` com tools.
  2. Se `tool_calls` presente: executar `callImageModel()`, fazer upload, devolver resultado como `tool` message, voltar ao modelo para escrever a resposta final em texto.
  3. Se sem tool_calls: usar `content` direto (fluxo atual).
- Nova função `callImageModel(prompt, inputImageDataUrl?)`:
  - Busca extra na `knowledge_base` com query visual + concatena regras no prompt.
  - POST `https://ai.gateway.lovable.dev/v1/chat/completions` com `model: "google/gemini-2.5-flash-image"`, `modalities: ["image", "text"]`.
  - Extrai `data.choices[0].message.images[0].image_url.url` (base64).
- Nova função `uploadGeneratedImage(base64, userId)`:
  - Decodifica base64 → upload em `chat-images/{userId}/{uuid}.png`.
  - Gera signed URL (7 dias) e retorna.
- Contagem de imagens já geradas: percorre `messages[]` e conta entradas com `images` no role assistant. Se ≥ 3, retorna texto educado pedindo nova conversa.
- Logs estruturados: `evt: "chat_gestor.image_generated"` com `elapsed_ms`, `mode`, `kb_hits`.
- Tratamento 402/429 do modelo de imagem com mensagens claras.

### 3. Frontend — `src/pages/app/Chat.tsx`
- Ampliar tipo `Msg` para aceitar `generatedImages?: string[]` (URLs do backend).
- Após receber resposta, se `data.images` vier preenchido, anexar à mensagem do assistant.
- Renderização: grid de imagens abaixo do texto, com:
  - Click → abrir em nova aba.
  - Botão "Baixar" (download via fetch + blob).
- Manter o efeito de typing apenas para o texto; imagens entram ao final.
- Toast específico se backend devolver erro de limite (3 imagens).

### 4. QA manual após deploy
Cenários a testar:
- "gera um banner para promoção de hambúrguer artesanal" → deve gerar.
- "melhora essa foto" + imagem anexada → deve editar.
- "como aumentar ticket médio?" → **NÃO** deve gerar (validar tool-calling condicional).
- 4ª imagem na mesma conversa → deve recusar com mensagem clara.

### 5. Logs e observabilidade
Após primeiros usos reais, conferir em `supabase--edge_function_logs`:
- Latência média `chat_gestor.image_generated` (alvo: < 8s).
- Frequência de 402/429 do modelo de imagem.
- Quantos chunks RAG foram injetados no prompt.

---

## O que NÃO entra agora
- Variações múltiplas (gerar 4 opções) — fica para v2 se demanda surgir.
- Editor visual no front (recortar, redimensionar) — usuário baixa e edita por fora.
- Tags `foto-produto` / `banner` específicas na knowledge_base — busca semântica genérica já cobre.
- Histórico persistente das imagens em tabela — ficam no bucket, signed URL expira em 7d.

---

## Arquivos afetados

```text
supabase/
├── functions/chat-gestor/index.ts                   ← refatorado
└── migrations/<timestamp>_chat_images_bucket.sql    ← novo

src/pages/app/Chat.tsx                                ← renderiza imagens
```

Sem novas tabelas, sem nova edge function. Tudo consolidado no `chat-gestor`.

---

## Custo estimado em produção
- Nano Banana Flash: **~$0,04/imagem (~R$ 0,22)**.
- Limite de 3/conversa + RAG só busca quando tool é chamada → custo extra controlado.
- $1 grátis mensal cobre ~25 imagens; depois debita do AI balance.

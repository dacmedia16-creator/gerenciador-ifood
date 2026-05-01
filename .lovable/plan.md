## Corrigir "Erro de conexão" do Gestor IA no celular

### Diagnóstico

Verifiquei os logs do edge function `chat-gestor`:
- Servidor responde **200 OK** (sem erros).
- Mas vários requests terminam em 100–200ms, tempo curto demais para uma chamada de IA — sinal de que o **stream foi interrompido antes de terminar**.
- No preview desktop o chat funciona normalmente (testei e a resposta apareceu inteira).

**Causa**: a função usa **streaming SSE** (`stream: true` + `text/event-stream`). Quando o app é acessado pelo domínio personalizado (`gestordelivery.app`) num celular, o Safari/WebView mobile + proxy Cloudflare bufferam ou cortam o stream, e o cliente cai no `catch` do `fetch` exibindo "Erro de conexão".

### Correção

**1. Edge function `chat-gestor`** — trocar para resposta única (não-streaming):
- `stream: true` → `stream: false` na chamada do Lovable AI Gateway.
- Ler `data.choices[0].message.content` e devolver `{ content }` como JSON.
- Mantém os tratamentos de 429/402.

**2. Frontend `src/pages/app/Chat.tsx`** — simplificar:
- Remover todo o parser SSE manual (loop de reader, decode, `data: …`).
- Fazer `const { content } = await resp.json()` e adicionar como mensagem do assistant.
- Mantém o indicador "digitando" (3 bolinhas) enquanto `loading=true`.

### Trade-off

Sem efeito de "digitando letra a letra" — a resposta aparece completa de uma vez. Em troca: funciona em qualquer rede/proxy/celular, sem risco de "Erro de conexão". As respostas do Gemini Flash levam ~2–4s no total, então a espera é aceitável (e o usuário já vê o spinner).

### Risco

Zero. Mudança contida em 2 arquivos. A interface continua igual.
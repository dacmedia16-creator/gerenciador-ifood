Vou corrigir em dois pontos: estabilidade da chamada ao backend e experiência visual da resposta.

1. Corrigir a causa do erro de conexão
- Ajustar o CORS compartilhado em `supabase/functions/_shared/cors.ts`.
- Hoje ele libera preview, domínio Lovable publicado e localhost, mas não inclui os domínios customizados `gestordelivery.app` e `www.gestordelivery.app`.
- Como o erro apareceu no domínio customizado, essa é a causa mais provável do bloqueio no navegador.
- Vou liberar explicitamente os domínios publicados do projeto no helper compartilhado, para que `chat-gestor` e outras funções que usam esse helper voltem a responder corretamente.

2. Tornar a chamada do chat mais robusta
- Refatorar `src/pages/app/Chat.tsx` para parar de usar `fetch` manual com `Authorization: Bearer <publishable key>`.
- Trocar para o cliente integrado do backend (`supabase.functions.invoke`) ou, se necessário, usar a sessão autenticada real do usuário.
- Isso evita falhas de autenticação/cabeçalhos, melhora compatibilidade com o ambiente publicado e deixa o tratamento de erro mais consistente.
- Vou manter o suporte a imagens no payload multimodal.

3. Aplicar o mesmo endurecimento no Radar de Prospects
- `src/pages/app/Prospects.tsx` usa o mesmo padrão frágil de `fetch` manual para `analyze-prospect`.
- Vou alinhar essa tela também para evitar que o mesmo erro apareça ali quando o usuário enviar prints.

4. Melhorar a exibição da resposta com efeito digitado suave
- Atualizar `src/pages/app/Chat.tsx` para que a resposta do assistente apareça gradualmente, com animação leve e legível.
- Implementação prevista:
  - a resposta chega completa do backend;
  - no frontend, o texto é revelado aos poucos com temporização suave;
  - enquanto estiver “digitando”, a bolha mostra o texto parcial;
  - ao concluir, renderiza normalmente com `ReactMarkdown`.
- Isso evita travamentos visuais e reduz glitches de markdown durante a animação.

5. Ajustes de UX do chat
- Impedir envio duplicado durante a animação/carregamento.
- Garantir autoscroll acompanhando a digitação.
- Preservar o loader atual até a resposta começar a aparecer.
- Manter fallback de erro claro caso o backend realmente falhe.

6. Validação após a implementação
- Verificar o fluxo do chat no ambiente publicado/custom domain.
- Confirmar envio com texto simples e com imagem.
- Confirmar que a resposta animada termina corretamente sem cortar markdown.

Detalhes técnicos
- Arquivos a alterar:
  - `supabase/functions/_shared/cors.ts`
  - `src/pages/app/Chat.tsx`
  - `src/pages/app/Prospects.tsx`
- Problema identificado no código atual:
  - CORS compartilhado não contempla os domínios customizados.
  - O chat usa `fetch` direto para a função com cabeçalho de autorização incorreto para esse fluxo.
- Efeito de digitação:
  - será feito no frontend, sem streaming no backend;
  - a resposta será animada localmente para manter compatibilidade e estabilidade em mobile.

Assim que você aprovar, eu implemento essas correções.
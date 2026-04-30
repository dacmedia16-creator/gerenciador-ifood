## Contexto

Pelo print do WhatsApp:
- Título atual do preview: "Gestor de Delivery — Gestão premium do seu delivery" ✅
- Imagem do preview: ainda é o placeholder roxo do Lovable ❌
- Favicon: ainda é o padrão do Lovable ❌
- Falta destacar a marca **"Gestor de Delivery"** visualmente na imagem de preview

## Alterações

### 1. Favicon (G vermelho enviado)
- Copiar `user-uploads://image-7.png` → `public/favicon.png`
- Remover `public/favicon.ico` (senão o navegador continua usando o antigo por padrão)
- No `<head>` do `index.html`:
  ```html
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  ```

### 2. Imagem Open Graph com a marca "Gestor de Delivery"

Gerar uma imagem de preview social personalizada (1200×630, formato recomendado para WhatsApp/Facebook/Twitter) com:
- Fundo preto (identidade da marca)
- "G" vermelho (mesmo do favicon) à esquerda
- Texto **"Gestor de Delivery"** em destaque (branco, fonte forte/sans-serif)
- Subtítulo: **"Gestão premium do seu delivery"** (cinza claro / amarelo de destaque)
- Pequeno selo/linha vermelha (#EA1D2C, vermelho iFood) para reforçar o nicho

A imagem será gerada via script (Node + canvas/sharp ou Python + Pillow) e salva em `public/og-image.png`.

### 3. Meta tags no `index.html`
```html
<meta property="og:title" content="Gestor de Delivery — Gestão premium do seu delivery" />
<meta property="og:image" content="https://gestordelivery.app/og-image.png" />
<meta property="og:url" content="https://gestordelivery.app/" />
<meta name="twitter:image" content="https://gestordelivery.app/og-image.png" />
```

## Observação sobre cache do WhatsApp

WhatsApp/Facebook fazem cache agressivo do preview. Depois de publicar, para forçar atualização envie o link uma vez com um parâmetro extra (ex.: `https://gestordelivery.app/?v=3`). Depois disso o preview novo fica salvo também para a URL limpa.

## Arquivos afetados

- `public/favicon.png` (novo)
- `public/og-image.png` (novo, gerado com a marca "Gestor de Delivery")
- `public/favicon.ico` (removido)
- `index.html` (links de ícone + meta tags de imagem/URL social)

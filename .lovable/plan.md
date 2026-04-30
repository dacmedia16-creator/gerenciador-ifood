## Objetivo

A prévia de link no WhatsApp (e em qualquer rede social) ainda mostra o posicionamento antigo:

> "Gestor IA de Delivery — Diagnóstico inteligente, score por área e plano de ação automático para lojas de delivery."

Isso vem das meta tags em `index.html`. Vou atualizá-las para refletir o novo posicionamento premium de serviço de Gestor de Delivery.

## Alteração

**Arquivo:** `index.html`

Substituir as tags `<title>`, `<meta name="description">`, `og:title`, `og:description`, `twitter:title` e `twitter:description` por:

- **Title:** `Gestor de Delivery — Gestão premium para restaurantes que vendem por delivery`
- **Description:** `Serviço premium de Gestor de Delivery para donos de restaurantes, hamburguerias, pizzarias, açaíterias e dark kitchens. Mais pedidos, mais margem e mais reputação no iFood, 99Food, WhatsApp e canais próprios.`
- **OG/Twitter title:** `Gestor de Delivery — Gestão premium do seu delivery`
- **OG description:** `Um time especialista cuidando do seu delivery: cardápio, precificação, operação, marketing e reputação. Foco em resultado para restaurantes que vendem no iFood, 99Food, WhatsApp e canais próprios.`
- **Twitter description (mais curta):** `Um time especialista cuidando do seu delivery: cardápio, precificação, operação, marketing e reputação.`
- **Author:** `Gestor de Delivery` (sem o "IA")

## Observações

- Mantenho a `og:image` atual (placeholder Lovable). Se quiser, depois posso gerar uma imagem de preview personalizada com a identidade visual (preto, vermelho iFood, amarelo).
- Após publicar, o WhatsApp pode demorar a atualizar o cache do preview — para forçar, basta enviar o link com um parâmetro novo (ex.: `?v=2`) uma vez.
# Análise de Prospect por Imagem

Hoje o usuário precisa digitar todos os campos do prospect (nome, nota, avaliações, tempo, fotos, combos, etc.) manualmente. Vamos adicionar a **opção de enviar imagens** (prints da loja no iFood/Rappi) para a IA analisar e preencher automaticamente o formulário, mantendo a entrada manual como alternativa.

## Como vai funcionar para o usuário

No card "Novo prospect":
- Aparecem duas abas: **Por imagens (IA)** e **Manual**
- Em "Por imagens": usuário sobe 1–4 prints (capa da loja, cardápio, avaliações), opcionalmente escreve uma observação, clica em **Analisar com IA**
- A IA lê os prints e devolve: nome da loja, categoria, nota, nº avaliações, tempo de entrega, taxa, se tem fotos, combos, cupons, nomes genéricos, observações
- O formulário manual é preenchido com os valores extraídos — usuário revisa, ajusta o que quiser e clica em **Salvar e calcular score** (mesmo fluxo de hoje)
- Os prints ficam anexados ao prospect e podem ser revistos depois no card

## O que será construído

### 1. Backend — nova edge function `analyze-prospect`
- Recebe: array de imagens (data URLs) + texto opcional
- Chama Lovable AI Gateway (`google/gemini-2.5-flash`, que tem visão) com prompt instruindo a extrair os campos do prospect em JSON estruturado
- Retorna JSON pronto para preencher o formulário: `{ name, category, city, neighborhood, rating, reviews_count, delivery_time, delivery_fee, price_range, has_photos, has_combos, has_coupons, generic_names, notes }`
- Trata erros 429 (rate limit) e 402 (créditos) com mensagens claras

### 2. Storage — bucket `prospect-images`
- Bucket privado (apenas o dono enxerga)
- Políticas RLS por `user_id` (pasta `{user_id}/...`)

### 3. Banco — campo `images` em `prospects`
- Adiciona coluna `images text[]` (paths no bucket)

### 4. Frontend — `src/pages/app/Prospects.tsx`
- Tabs "Por imagens (IA)" / "Manual" dentro do card de novo prospect
- Componente de upload com preview (até 4 imagens, 5MB cada)
- Botão "Analisar com IA" → chama edge function → preenche o `form` state
- Após análise, mostra o formulário manual já preenchido para revisão
- No `save`: faz upload das imagens para o storage e salva os paths em `images`
- Nos cards de prospect existentes: mostra miniatura das imagens quando houver

## Detalhes técnicos

- Modelo: `google/gemini-2.5-flash` (multimodal, mesmo já usado no chat)
- Limite: 4 imagens × 5MB no frontend
- Formato enviado à IA: OpenAI-compatible content parts (`type: "image_url"` com data URL)
- Output estruturado: prompt pede JSON puro; backend valida com try/catch e retorna 422 se inválido
- Score continua sendo calculado client-side por `scoreProspect` após o usuário confirmar — IA só extrai os dados brutos, não inventa score
- Migrations: bucket + coluna `images` em uma única migration

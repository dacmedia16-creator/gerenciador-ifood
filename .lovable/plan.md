## Objetivo

Aplicar o logo oficial enviado (badge "G" vermelho com recorte diagonal + wordmark "Gestor de Delivery") como identidade visual do projeto: header da landing, sidebar do app autenticado, favicon e imagem de preview social.

## Arquivos do logo

Copiar `user-uploads://Lgo_GD.png` para o projeto em duas variantes:

- `src/assets/logo-gestor-delivery.png` — versão completa (badge + wordmark) usada em headers
- `public/favicon.png` — recortar somente o badge "G" para o favicon (substitui o atual)
- `public/og-image.png` — regerar usando a imagem real enviada (substitui o desenho programático atual)

## Alterações de código

### 1. `src/pages/Index.tsx` (header da landing)

Trocar o "G" desenhado em CSS (linhas 33-43) pela imagem real:

```tsx
import logoGD from "@/assets/logo-gestor-delivery.png";
...
<a href="#top" className="flex items-center gap-2.5">
  <img src={logoGD} alt="Gestor de Delivery" className="h-9 w-auto" />
</a>
```

Como o wordmark já vem na imagem, o `<span>Gestor de Delivery.</span>` ao lado é removido para não duplicar a marca.

### 2. `src/components/AppSidebar.tsx` (header da sidebar do app)

No `SidebarHeader` (linhas ~70-75): substituir o quadrado vermelho com "G" e o texto "Gestor IA / de Delivery" pela mesma imagem importada de `@/assets/logo-gestor-delivery.png`:

- Estado expandido: mostra logo completo (`h-8 w-auto`)
- Estado `collapsed`: mostra apenas o badge — nesse caso usar `public/favicon.png` (badge isolado) com `h-8 w-8`

### 3. Favicon e og-image

- `public/favicon.png`: gerar a partir do logo enviado, recortando a área do badge vermelho (quadrado ~512×512) com Pillow. `index.html` já aponta para `/favicon.png`, sem mudanças.
- `public/og-image.png`: regerar 1200×630 com fundo preto e o logo enviado centralizado + tagline "Gestão premium do seu delivery" abaixo. Substitui o desenho atual gerado programaticamente, garantindo fidelidade total à marca.

`index.html` já referencia ambos os arquivos — nenhuma mudança em meta tags.

## Detalhes técnicos

Geração das variantes via script Python/Pillow em `/tmp`:

```text
Logo original (1920×~640, fundo preto)
   │
   ├── recorte do badge → resize 512×512 → public/favicon.png
   ├── cópia integral   →                  src/assets/logo-gestor-delivery.png
   └── canvas 1200×630 preto + logo centralizado + tagline → public/og-image.png
```

Nada de cores hardcoded fora do `Index.tsx` (que já tem paleta isolada documentada). A sidebar continua usando os tokens semânticos do design system.

## Cache do WhatsApp

Após publicar, compartilhar uma vez `https://gestordelivery.app/?v=5` para forçar atualização do preview social.

## Arquivos afetados

- `src/assets/logo-gestor-delivery.png` (novo)
- `public/favicon.png` (substituído)
- `public/og-image.png` (substituído)
- `src/pages/Index.tsx` (header)
- `src/components/AppSidebar.tsx` (cabeçalho da sidebar)

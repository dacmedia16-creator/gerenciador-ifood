## Adaptar o Dashboard para mobile

Hoje o `src/pages/app/Dashboard.tsx` quebra em telas pequenas em três pontos:

1. **Cabeçalho** — título da loja, `<select>` de loja, 3 botões e "Novo Diagnóstico" ficam todos numa linha que estoura/transborda no mobile.
2. **Card do "Diagnóstico em andamento"** — barra de progresso fixa em `w-48` e botão "Continuar" mal acomodam em 360px.
3. **Card de Score + KPIs** — `text-6xl` no score e `p-6` ocupam muito espaço; KPIs já são `grid-cols-2` no mobile (ok), mas o gap é grande.

Os charts (`recharts`) e os cards de "Alertas críticos" / "Plano de ação" já se comportam bem no mobile (`lg:grid-cols-*` colapsa para 1 coluna), então não mexo neles.

### Mudanças propostas (apenas em `src/pages/app/Dashboard.tsx`)

**Cabeçalho:**
- Container vira `flex-col sm:flex-row` para empilhar no mobile.
- Título com `text-xl sm:text-2xl` e `truncate` para nome longo.
- `<select>` ocupa largura disponível (`flex-1 sm:flex-none`).
- Botões "Loja" e "Atualizar sistema" mostram só ícone no mobile (`<span className="hidden sm:inline">` no rótulo) — economiza espaço sem perder função.
- "Novo Diagnóstico" mantém rótulo (ação principal).

**Card de diagnóstico em andamento:**
- Layout `flex-col sm:flex-row` e botão "Continuar diagnóstico" com `w-full sm:w-auto`.
- Barra de progresso `w-full sm:w-48`.

**Card de Score:**
- Padding `p-4 sm:p-6`, número `text-5xl sm:text-6xl`, gaps menores no mobile (`gap-2 sm:gap-3`).
- Espaçamento vertical da página `space-y-4 sm:space-y-6`.

**KPI tile:**
- Reduzir o ícone e o padding em telas pequenas para os 8 cards caberem confortáveis em 2 colunas (sem virar 1 coluna, que ficaria longo demais).

Sem mudança de comportamento, sem novas dependências, sem alteração no design system. Só classes responsivas Tailwind.

### Verificação
Após aplicar, testo com `browser--set_viewport_size` em 375×812 (iPhone) e 768×1024 (tablet) e tiro screenshot para confirmar que nada estoura.
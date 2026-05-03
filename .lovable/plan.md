# Botão "Resetar diagnóstico" na página de Diagnóstico

Adicionar um botão na página `Diagnostics` que limpa todos os dados do diagnóstico **da loja atual** (não global), com confirmação.

## O que faz

Ao confirmar, executa via Supabase client (respeita RLS, só apaga o que o usuário pode):

1. Busca `diagnosis_sessions` da loja+usuário
2. Apaga `diagnosis_step_status` e `diagnosis_answers` dessas sessões
3. Apaga as próprias `diagnosis_sessions`
4. Apaga `action_plans`, `diagnostics` e `reports` da loja

Mantém intactos: loja, produtos, métricas, avaliações, concorrentes.

## UI

- Botão **"Resetar diagnóstico"** (variant outline + ícone `RotateCcw`) ao lado do "Consultar Gestor IA" no header da página `/app/stores/:id/diagnostics`.
- Abre um `AlertDialog` confirmando a ação irreversível.
- Toast de sucesso e redirect para o dashboard da loja.

## Arquivo

- `src/pages/app/Diagnostics.tsx`: adicionar handler + AlertDialog + botão.

## Fora do escopo

- Reset global (todos os usuários) — exigiria edge function admin.
- Reset por sessão individual.

Aprovar para eu implementar.
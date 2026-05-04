## Problema

A tela `/app/diagnosis/welcome` (acessada pelo item "Diagnóstico" do sidebar) sempre mostra o card "Vamos entender sua loja — Começar agora", mesmo para usuários que já completaram um diagnóstico. O componente `DiagnosisWelcome` só busca sessões com status `draft` e não verifica se já existe diagnóstico `generated`/`completed`.

Confirmado no banco: o usuário tem uma sessão com `status = 'generated'`, `completion_percentage = 100`, `generated_at` preenchido, mas a tela ainda renderiza o convite inicial.

## Correção

Em `src/pages/app/diagnosis/DiagnosisWelcome.tsx`, antes de renderizar a tela de boas-vindas:

1. Buscar a sessão mais recente do usuário com status `generated` ou `completed`.
2. Se existir → `navigate(`/app/diagnosis/${id}/result`, { replace: true })`.
3. Caso contrário, manter o comportamento atual (carregar draft, mostrar card "Começar agora").

Sem mudanças de banco, apenas no componente.

# Corrigir persistência de relatório e plano de ação

## Causa raiz

A edge function `ai-consult` está gerando o diagnóstico com sucesso, mas falha ao gravar nas tabelas `reports`, `action_plans` e `recommendation_history`. O log mostra:

```
permission denied for function has_store_access
```

Todas as policies RLS dessas tabelas chamam `public.has_store_access(store_id)`, mas o privilégio `EXECUTE` dessa função só está concedido para `service_role` — `authenticated` e `anon` não têm. Como a edge usa o JWT do usuário (role `authenticated`), todo INSERT é rejeitado e silenciosamente engolido (`console.warn` apenas).

Confirmado no banco: a loja `6e5c043b-…` tem 0 reports, 0 action_plans, 0 recommendation_history, mesmo com a IA tendo rodado e respondido.

## Mudanças

### 1. Migração SQL (corrige o problema)

```sql
GRANT EXECUTE ON FUNCTION public.has_store_access(uuid) TO authenticated, anon;
```

Isso destrava as policies RLS sem alterá-las, mantendo a segurança (a função em si valida ownership via `auth.uid()`).

### 2. `supabase/functions/ai-consult/index.ts` — falhar alto em vez de silenciar

- Trocar os `console.warn` dos inserts (`reports`, `recommendation_history`, `action_plans`) por:
  - log estruturado `evt: "ai_consult.persist_failed"` com a tabela e o código de erro;
  - se o insert do `reports` falhar, retornar HTTP 500 com mensagem clara ("Não foi possível salvar o diagnóstico"), em vez de devolver 200 com `report_id: null`.
- Assim, futuros problemas de RLS aparecem imediatamente para o usuário e nos logs, em vez de gerar a tela vazia atual.

### 3. Sem outras alterações

- Nenhuma mudança em telas, autenticação, dashboard, schema de tabelas ou outras edges.
- Não toca em `auth`, `storage`, `realtime`, `vault`.

## Validação após aplicar

1. Rodar um novo diagnóstico pelo funil.
2. Conferir no banco: `select count(*) from reports where store_id = …` deve voltar > 0.
3. Abrir "Plano de ação" e "Relatório completo" — devem aparecer com conteúdo.
4. Conferir log da edge: sem `permission denied`.

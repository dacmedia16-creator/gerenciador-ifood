## Normalização de áreas na knowledge_base

Padronizar nomes singulares → plurais (a forma plural é majoritária nas fontes mais recentes).

### Mudanças (UPDATE em knowledge_base)

| De (singular) | Para (plural) | Chunks afetados |
|---|---|---|
| `regra` | `regras` | 18 |
| `diagnostico` | `diagnosticos` | 66 |
| `exemplo` | `exemplos` | 15 |
| `checklist` | `checklists` | 10 |

Total: **109 chunks** atualizados. Nenhum dado perdido — apenas o campo `area` é renomeado.

### Resultado esperado

| Área | Antes | Depois |
|---|---|---|
| regras | 60 | 78 |
| diagnosticos | 15 | 81 |
| exemplos | 91 | 106 |
| checklists | 62 | 72 |

E as áreas singulares (`regra`, `diagnostico`, `exemplo`, `checklist`) deixam de existir.

### Implementação técnica

1. Criar migração SQL com 4 `UPDATE knowledge_base SET area = '<plural>' WHERE area = '<singular>' AND status = 'ativo'`.
2. Validar com `SELECT area, COUNT(*) FROM knowledge_base GROUP BY area` para confirmar que as áreas singulares sumiram.
3. **Não** é necessário re-embedar — `area` não faz parte do texto vetorizado.
4. **Não** há código no front/edge functions que filtre por essas áreas singulares específicas (pode confirmar com `rg` antes de aplicar).

### Observações

- Mantemos `diagnostico` (singular) **não** — vamos para `diagnosticos` para alinhar com o padrão plural já dominante em outras categorias estruturais (`regras`, `exemplos`, `checklists`, `glossario`).
- `glossario`, `faq`, `qa` permanecem como estão (não têm contraparte fragmentada).
- Outras áreas temáticas (cardapio, marketing, operacao, etc.) **não** são alteradas — refletem domínios de negócio, não tipos estruturais.

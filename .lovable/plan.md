## Objetivo

Adicionar os 30 chunks da entrevista da **Camila Blanco (Pastel IA / Pastelicia)** à base de conhecimento usada pelo Gestor IA, para que o RAG passe a recuperar esse conteúdo nas respostas de chat e diagnósticos.

## Como vai ficar (visão do usuário)

- Em **Base de conhecimento** aparecem 30 novos cards com `chunk_id` `CB-001` a `CB-030`, organizados por área.
- No **Chat do Gestor IA** e nos **diagnósticos**, quando o usuário falar sobre temas como pastel, fritura, promoção de aniversário, garagem virando loja, padrão de entrega, embalagem, bastidores em redes sociais, etc., a IA passa a citar esses princípios.
- Conteúdo legado (chunks JB-XXX, KB-XXX) continua intacto.

## Mapeamento dos 30 chunks

Os chunks vêm com ID original `RAG-001..030`. Para não conflitar com a convenção interna (`KB-` e `JB-`) e para deixar claro a fonte, vou prefixar como **`CB-001..030`** (CB = Camila Blanco).

Cada chunk vai virar uma linha em `public.knowledge_base` com:

- `chunk_id`: `CB-001` … `CB-030`
- `chunk_version`: `1`
- `source`: `entrevista_camila_blanco_pastelia`
- `source_version`: `1`
- `status`: `ativo`
- `area`: mapeada para o vocabulário já existente na base (ex.: `estrategia`, `produto`, `operacao`, `delivery`, `marketing`, `branding`, `pessoas`, `lideranca`, `precificacao`, `experiencia`, `cultura`)
- `topic`: campo curto (ex.: `origem`, `pivotagem`, `mvp`, `formalizacao`, `reinvestimento`, `fritura`, `automacao`, `pre_preparo`, `padrao`, `embalagem`, `conteudo`, `promocao_aniversario`, `pico_demanda`, `entregadores`, `educacao_mercado`, `mentalidade`, `proposito`)
- `title`: o título do chunk
- `content`: o texto consolidado do chunk (Resumo + Conteúdo + “Aplicação prática” + “Importância”), em PT-BR, formatado como o resto da base
- `tags`: array com as tags do chunk (sem `#`) + tag fixa `pasteliciatentrevista` para rastrear a origem
- `embedding`: deixado `NULL` na inserção — será preenchido na etapa seguinte

## Mapeamento de área (resumo)

| Chunks | Área | Justificativa |
|---|---|---|
| 001, 002, 008, 011, 028, 029 | `estrategia` | Origem, pivot, expansão, reinvestimento, posicionamento, mentalidade |
| 003, 007, 015, 024 | `operacao` | MVP, operação caseira, pré-preparo, pico |
| 004, 020 | `branding` | Nome, identidade visual, embalagem |
| 005 | `gestao` | Formalização (MEI/CNPJ) |
| 006 | `produto` | Validação inicial |
| 009 | `operacao` | Garagem como loja |
| 010, 026 | `pessoas` | Equipe familiar, valorização |
| 012, 016, 018 | `operacao` / `precificacao` | Qualidade do óleo, refrigeração, preço x qualidade |
| 013, 017, 027 | `delivery` (nova área) | Princípios centrais de delivery e entrega |
| 014 | `operacao` | Automação / autoatendimento |
| 019 | `experiencia` | Loja pequena com boa experiência |
| 021, 022, 023, 025 | `marketing` | Bastidores, promoção, ROI |
| 030 | `lideranca` | Propósito |

> Observação: a área `delivery` ainda não existe na base. Vou criar como área nova — não exige migração porque `area` é texto livre.

## Etapas de execução (modo build)

1. **Criar a migration de seed** (`supabase/migrations/<timestamp>_seed_kb_camila_blanco.sql`) com um único `INSERT ... ON CONFLICT (chunk_id) DO NOTHING` para os 30 registros, deixando `embedding = NULL`.
2. **Gerar embeddings** chamando a edge function existente `embed-knowledge` com `{ "table": "knowledge_base", "limit": 50 }`. A função já lê os registros com `embedding IS NULL`, gera embedding lexical (RAG v1) e salva em `knowledge_base.embedding`.
3. **Verificar** com `SELECT count(*) FROM knowledge_base WHERE chunk_id LIKE 'CB-%' AND embedding IS NOT NULL;` (esperado: 30).
4. **Smoke test** no chat do Gestor IA com perguntas como:
   - “como faço uma promoção de aniversário sem queimar margem?”
   - “meu pastel chega mole na casa do cliente, o que faço?”
   - “preciso trocar óleo toda semana?”
   - “meus entregadores afetam minha avaliação?”
   
   A resposta deve passar a citar princípios desses chunks (e a aba “Base de conhecimento” deve listá-los como ativos).

## O que NÃO muda

- Não mexo no código do `chat-gestor`, do `analyze-prospect`, do CORS nem do efeito de digitação.
- Não toco nos chunks `KB-*` e `JB-*` existentes — eles continuam ativos.
- Não altero RLS, schema da tabela ou função `match_knowledge`.

## Riscos e mitigação

- **Risco**: embedding lexical (v1) pode não recuperar todos os chunks com sinônimos. **Mitigação**: títulos e tags ricas + tag de origem `pasteliciatentrevista` para facilitar match por palavra-chave.
- **Risco**: duplicar chunks se rodar a migration mais de uma vez. **Mitigação**: `ON CONFLICT (chunk_id) DO NOTHING` (chunk_id tem unique pela própria convenção; se não tiver, adiciono `WHERE NOT EXISTS`).
- **Risco**: limite de tokens no prompt do chat. **Mitigação**: `chat-gestor` já corta cada snippet em 600 chars e usa top-3, então o aumento da base não pesa no prompt.

Posso seguir com a implementação?

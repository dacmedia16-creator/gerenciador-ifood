## Objetivo
Gerar um PDF de auditoria consolidada do Gestor IA de Delivery, salvo em `/mnt/documents/auditoria-gestor-ia-delivery.pdf` para download.

## Conteúdo do relatório (~15-20 páginas)

1. **Sumário executivo** — diagnóstico em 1 página: estágio atual (pré-validação), risco principal, recomendação central.
2. **Mapa do produto** — rotas (30+ páginas), edge functions (20), tabelas principais, fluxos.
3. **Análise técnica** — stack, qualidade, RLS/segurança, performance, dívidas, pontos fortes.
4. **Análise de UX/produto** — fricção do diagnóstico de 16 etapas, excesso de superfície, falta de loop semanal, jornada do dono.
5. **Análise estratégica** — posicionamento, persona, monetização, retenção, concorrência.
6. **Dados reais de uso** — métricas atuais do banco (2 users, 11 sessões, 0 concluídas, 0 ações fechadas) e o que isso significa.
7. **Roadmap em 3 horizontes**
   - H1 (2 semanas): validação comercial + simplificação UX
   - H2 (30 dias): provar valor financeiro + retenção
   - H3 (90 dias): moat (benchmarks, integrações, IA preditiva)
8. **Matriz de priorização** (impacto × esforço) com tabela de iniciativas.
9. **Próximos 14 dias** — checklist acionável.

## Como será gerado
- Script Python com ReportLab (Platypus) para layout limpo.
- Paleta visual alinhada à marca (vermelho/preto/creme).
- Tabelas para matriz de priorização e mapa de features.
- QA visual: converter cada página em imagem e revisar antes de entregar.
- Entrega como `<lov-artifact>` para download direto.

Aprove para eu gerar.
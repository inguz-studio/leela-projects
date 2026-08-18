# Handoff — lane DOC-FLUXO-PAGAMENTO

- trace: `leela-pixreal-diag-20260804` · employee sf-cto
- Início: 2026-08-04
- Fonte da verdade: `.nirvana/outputs/leela-pixreal-diag-20260804/DIAG-PIXREAL-REPORT.md` (lido integralmente)

## Estado

- [x] Task 1 — doc `leela-specs/04-engenharia/fluxo-pos-pagamento.md` CRIADO + 1 linha de índice em `leela-specs/HOME.md` (seção "Para quem chega de fora")
- [x] Task 2 — painel `leela-specs/01-produto/DECISOES-ABERTAS.md` EDITADO (nenhum arquivo paralelo): **BREVO-1** (nova, primeira em "Ações que só você pode executar" — desativar allowlist de IPs em app.brevo.com/security/authorised_ips; alternativa VPC+NAT vai ao CTO humano) e **POSPAG-1** (nova, em "Decisões que dependem de você" — priorização da fila S1222/S1223). A entrada antiga da fila ("Entrou em 03/08 · a área do cliente...") ganhou 1 linha "+04/08" apontando para o POSPAG-1, no padrão que o painel já usa (LGPD-1/DEPLOY-1) — fundido, não duplicado.
- [x] Task 3 — board ACHADO e atualizado: `leela-specs/00-boards/V1-KANBAN.md`, 1 card no topo de "✅ Feito" (convenção de [[CONVENCAO-BOARDS]]: código de épico, linguagem de produto, wikilink). Não há lane de incidentes dedicada nos boards; não criei board novo. BOARD-EPICOS/V1-CHECKLIST não tocados (incidente não muda estado de épico nem de task).
- [x] Task 4 — commit `7fd8368c` (4 arquivos, 120 inserções) e push OK (`0e3ab151..7fd8368c main -> main`, github.com/inguz-studio/leela-projects). `git commit --only` com os 4 paths; handoffs de .nirvana ficaram fora do commit de propósito (não são ignorados, mas TODOS os handoffs anteriores do repo estão untracked — convenção da casa).

## Lane CONCLUÍDA — 2026-08-04

## Notas

- Convenções seguidas: 04-engenharia usa kebab-case sem numeração (só o 00-TEMPLATE tem prefixo); a pasta não tem README próprio, o índice vivo é o HOME.md, então a linha nova entrou lá, junto dos irmãos (estado-real, catalogo-de-emails).
- Doc: frontmatter no padrão dos irmãos (tags + atualizado + trace), mermaid flowchart básico com classDef (3 estados: funcionou/quebrou/não existe), narrativa em 9 elos, linha do tempo em BRT, tabela de lacunas com status de decisão, rodapé de proveniência com link relativo ao report.
- DESVIO consciente do brief da lane (registrado): a linha do tempo segue o pagamento REAL `pay_jay08p0u1qlz11r2`, não o `pay_6e37hktx4xld12qf` citado na ordem — o report corrigiu a premissa (o pay_6e37 é QA e segue PENDING) e nada pode contradizer o report. O doc registra a correção de premissa explicitamente.
- qrToken NÃO copiado em lugar nenhum (RN-218); só o código legível T93N7F.

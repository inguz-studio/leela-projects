# Handoff — Lote E19-CRM-BACKEND (trace leela-build-2d6ee98d)

Employee: sf-backend-lead · Business: software-forge
Protocolo: 09-emergency-handoff. Atualizado a cada task.

## Missão
CRM backend (E19 · S-R9-13-T1/T2 + api-client): modelo de clientes consolidados
por tenant com LTV/histórico cross-evento, agregações server-side (padrão
RN-820, zero varredura no cliente), Rules fail-closed PII (RN-172) e readers
tipados para a futura UI (lote posterior). Reconciliar vínculo com E06
(comunicação) SEM tocar no que existe.

## Ownership
SEUS (novos): functions/src/crm/**, packages/core/src/crm*,
packages/api-client/src/crm.ts, functions/src/__tests__/crm*.
COMPARTILHADOS (append de blocos próprios + staging cirúrgico — lane R9-C
ativa no mesmo território): functions/src/index.ts, packages/core/src/index.ts,
packages/api-client/src/index.ts, firestore.rules.
NÃO TOCAR: apps/**, design-system, domínio kit/checkout/afiliados (exceto
leitura p/ LTV), firestore.indexes.json (sem índice composto necessário).

## Tasks
- [x] T1 core: identidade do cliente (chave CPF→email→atleta) + computeCrmCliente + parse + unit tests (14 ✓)
- [x] T2 function: onInscritoWriteCrm (transação, full-set idempotente, no-op) + export index.ts
- [x] T3 rules: tenants/{tid}/crmClientes read=isTenantWriter only, write=false + testes emulator (12 ✓ incl. negativo cross-tenant)
- [x] T4 api-client: crm.ts readers tipados (lista paginada + busca prefixo + detalhe) + export (`a7a4bb7`)
- [x] T5 gates determinísticos: tsc functions/core/api-client = 0 erros cada; eslint (crm functions + core src/crm + api-client crm.ts) = 0 warnings; crmCore 14/14; crm.integration 13/13 no emulator de TESTE :8080 (emulators:exec fb-tools@13)
- [x] T6-fix A1: guarda `eventoCoerente` fail-closed (evento.tenantId === inscrito.tenantId) + teste A1 → `ef23ee9`
- [x] T6 review antagonista — rodada FINAL em contexto fresco (subagent Fable, só artefatos+critérios): **APROVADO COM RESSALVAS**, nenhum bloqueador. A2 (ALTO, fence de ordem) e A4 (clamp pageSize) CORRIGIDOS + re-provados (`9519f38`, 14/14 no emulator); A5 documentado nas rules; A3 (hash CPF força-brutável) documentado + ESCALADO ao Vitor (pepper = ops)
- [x] T7 docs: épico E19 (status, defaults P-E19-1..6, estado de implementação, reconciliação E06, pendência A3) + rns-delta (RN-172 ratificada) + BOARD-EPICOS + V1-KANBAN + report `outputs/leela-build-2d6ee98d/E19-CRM-REPORT.md` + audit events

## Estado (ret3 — 2026-07-18) · LOTE CONCLUÍDO
Retomada pós-queda de terminal. WIP do disco (fix A1) inventariado via git diff,
aproveitado (são) e PROVADO no emulator de teste antes do commit. Gates finais:
tsc functions/core/api-client = 0; eslint escopo E19 = 0; crmCore 14/14;
crm.integration 14/14 (emulator TESTE :8080, emulators:exec fb-tools@13).
Commits do lote: ef23ee9 (A1) + 9519f38 (A2/A3/A4/A5) + docs.

⚠️ PENDÊNCIA VITOR (A3 · MÉDIO): decidir HMAC pepper `CRM_ID_PEPPER` (Secret
Manager) ANTES de o CRM ir a produção — detalhes no épico §Pendência de ops.
Backend E19 encerrado; próximo lote = UI (aba CRM + hub Clientes & Comunicação).

## Decisões/premissas até aqui (defaults E19 autorizados pelo Vitor 2026-07-18 10:24)
- P-E19-1 (default #3): chave de linking = CPF normalizado (11 dígitos) quando
  o [reg] tem CPF válido; fallback e-mail do responsável (só quando o inscrito
  É o responsável do pedido — o [reg] não tem e-mail); último recurso
  atletaId. DocId = `{tipo}_{sha256(valor)[0:32]}` — CPF/e-mail NUNCA em claro
  no path nem no doc (minimização RN-172).
- P-E19-2 (default #1): base legal = legítimo interesse sobre a base
  transacional própria; finalidade = gestão + comunicação (RN-172).
- P-E19-3 (default #2): unificação CRM+Comunicação = hub "Clientes &
  Comunicação" (decisão de UI — lote posterior; o backend entrega a fonte de
  audiência: mapa `eventos` por cliente).
- P-E19-4: armazenar `nascimento` (date-only) em vez de idade pré-calculada —
  idade envelhece no doc; nascimento é o dado mínimo que produz idade correta
  em qualquer leitura; aniversário deriva (mm-dd). Conteúdo informacional
  equivalente a idade+aniversário (RN-172).
- P-E19-5: valorGasto = Σ(valorFinal+taxaRepassada) das confirmadas (o que o
  cliente pagou e ficou pago); ltv = Σ valorFinal (receita do organizador
  atribuível — consistente com receitaConfirmada). Estornada fica no histórico
  mas fora dos dois números.
- P-E19-6: só inscrição confirmada/estornada entra no CRM — pendente/cancelada
  não constrói perfil de quem não comprou (dado mínimo LGPD).
- Testes de rules/integração no emulator de TESTE (porta 8080 via
  emulators:exec, LEELA_FS_EMU_PORT p/ desvio), NUNCA no :8180 do preview.

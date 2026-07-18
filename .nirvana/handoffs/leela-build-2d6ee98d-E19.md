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
- [ ] T1 core: identidade do cliente (chave CPF→email→atleta) + computeCrmCliente + parse + unit tests
- [ ] T2 function: onInscritoWriteCrm (transação, full-set idempotente, no-op) + export index.ts
- [ ] T3 rules: tenants/{tid}/crmClientes read=isTenantWriter only, write=false + testes emulator (negativo cross-tenant obrigatório)
- [ ] T4 api-client: crm.ts readers tipados (lista paginada + detalhe) + export
- [ ] T5 gates determinísticos: tsc/lint/vitest/emulator — números reais
- [ ] T6 review antagonista (PII cross-tenant, race, rules permissivas, dado mínimo LGPD) + correções
- [ ] T7 docs: épico E19 (premissas/defaults + reconciliação E06) + rns-delta + boards + audit

## Estado
Iniciando T1. Nenhum arquivo alterado ainda.

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

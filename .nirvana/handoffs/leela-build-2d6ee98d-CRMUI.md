# Handoff — CRM-COMISSAO-UI (trace leela-build-2d6ee98d)

business: software-forge · employee: sf-frontend-engineer · model: Opus (UI)
project: C:\dev\LEELA · branch: main

## Status por task

- [x] **T0 — Fixtures E08** (`[LEELA-CRMUI-T0]` a3ebba8): comissao/comissaoAcumulada/
      comissaoRepassada/saldoComissao/ultimosRepasses nas 2 factories de teste
      (Influenciadores + MinhasAfiliacoes). tsc painel 0. 8/8 testes influenciadores verdes.
- [x] **T1 — Hub CRM "Clientes & Comunicação"** (`[LEELA-CRMUI-T1]` 24e4579):
      rota /crm (item comunicacao da sidebar), lista paginada por cursor + busca por
      prefixo + ordenação; detalhe 1-read com histórico por evento, aniversário mm-dd,
      idade ao vivo. 9/9 RTL verdes. tsc 0, eslint 0.
- [ ] **T2 — UI de comissão (E08 F2)**: config no AfiliadoModal + coluna/saldo organizador
      (InfluenciadoresPage) + saldo/extrato influenciador (MinhasAfiliacoesPage) + modal de
      repasse manual (ConfirmModal). EM ANDAMENTO.

## Reaproveitado vs criado (parcial)

Reaproveitado (DS): Table, EmptyState, PageHeader, KpiCard, Select, Input, Skeleton,
Button, Modal/ConfirmModal, Badge, ToastProvider, AppErrorBoundary, NotFound.
Reaproveitado (padrões do painel): session resiliente (espelho assessorias/_data/session),
data-hook getLeelaDb+reader com refetch, estados vazio/erro/loading honestos.
Criado: módulo apps/painel/src/routes/crm/** (session, clientes hooks, format helpers,
ClientesPage, ClienteDetailPage, CrmRoutes) + wiring App/sidebar.

## Premissas / decisões

- Item `comunicacao` da sidebar wired a /crm (deixa de ser inerte); página titula
  "Clientes & Comunicação". NÃO renomeei o item no DS (proibido tocar design-system).
- "Última atividade" (coluna citada no brief T1) NÃO existe no doc CRM — o parse não
  expõe carimbo (atualizadoEm). Omitida; colunas = nº eventos / valor gasto / LTV.
  PENDÊNCIA: se quiser "última atividade", precisa o backend expor um timestamp no doc.
- Idade exibida AO VIVO (derivada de nascimento no render) — nunca congelada (P-E19-4).
- Busca por prefixo é case-sensitive (Firestore) — placeholder e empty state avisam.

## Gates (até aqui)

- tsc painel: 0 · eslint (surface CRM): 0 · RTL CRM: 9/9 · sidebar: verde (test atualizado).
- Suíte completa do painel + prova visual :5273 = pendente (rodar no fim do lote).

## Onde o Vitor confere

- Preview :5273 → item "Comunicação" na sidebar → /crm (lista) → clicar um cliente (detalhe).
  Se o :5273 estiver stale, provado por RTL; conferência visual pós-restart do preview.

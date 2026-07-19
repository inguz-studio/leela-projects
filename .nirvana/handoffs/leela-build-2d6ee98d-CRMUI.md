# Handoff — CRM-COMISSAO-UI (trace leela-build-2d6ee98d)

business: software-forge · employee: sf-frontend-engineer · model: Opus (UI)
project: C:\dev\LEELA · branch: main

## Status por task — TODAS ENTREGUES

- [x] **T0 — Fixtures E08** (`[LEELA-CRMUI-T0]` a3ebba8): campos de comissão F2
      obrigatórios nas 2 factories de teste. tsc painel volta a 0.
- [x] **T1 — Hub CRM "Clientes & Comunicação"** (`[LEELA-CRMUI-T1]` 24e4579):
      rota /crm (item `comunicacao` da sidebar), lista paginada por cursor + busca por
      prefixo + ordenação; detalhe 1-read com histórico por evento, aniversário mm-dd,
      idade ao vivo. 9/9 RTL.
- [x] **T2 — UI de comissão (E08 F2)** (`[LEELA-CRMUI-T2]` 9caa45d): config no
      AfiliadoModal (validação espelhando o core + aviso de não-retroatividade) + coluna
      na aba Afiliados; InfluenciadoresPage (organizador) com saldo/acumulada/repassada +
      repasse manual via ConfirmModal (idempotência amigável); MinhasAfiliacoesPage
      (influenciador) com saldo/extrato próprio (RN-318). 19/19 RTL nas 3 superfícies.

## Gates (finais)

- **tsc painel: 0** · **eslint painel completo: 0** (`--max-warnings 0`).
- **Suíte completa do painel: 1184/1185** — o único vermelho é `NovoClubePage.test.tsx`
  (timeout de 5s sob carga do run completo, NÃO tocado por este lote); passa 5/5 em
  isolamento. Baseline era 1167; +18 testes novos deste lote.
- **RTL das telas novas**: CRM lista/vazio/erro/dados/busca/paginação (9) + comissão
  config/saldo/dívida/repasse/projeção RN-318 (10) — verdes.

## Reaproveitado vs criado

- **Reaproveitado (DS):** Table, EmptyState, PageHeader, KpiCard, Select, Input, Skeleton,
  Button, Modal/ConfirmModal, Badge, Chip, ToastProvider/useToast, AppErrorBoundary,
  NotFound. **Core:** isComissaoAfiliadoValida (validação da comissão).
- **Reaproveitado (padrões do painel):** session resiliente (espelho assessorias/_data),
  data-hook getLeelaDb+reader+refetch, estados vazio/erro/loading honestos.
- **Criado:** módulo `apps/painel/src/routes/crm/**` (session, hooks de clientes, format
  helpers, ClientesPage, ClienteDetailPage, CrmRoutes + 2 test files) + wiring App/sidebar.
  Editado: AfiliadoModal, AfiliadosPage, InfluenciadoresPage, MinhasAfiliacoesPage (+ testes).

## Premissas / decisões

- Item `comunicacao` da sidebar wired a /crm (deixa de ser inerte); página titula
  "Clientes & Comunicação". NÃO renomeei o item no DS (proibido tocar design-system).
- Idade exibida AO VIVO (derivada de nascimento no render) — nunca congelada (P-E19-4).
- Busca por prefixo é case-sensitive (Firestore) — placeholder e empty state avisam.
- Repasse manual = do SALDO TOTAL, via ConfirmModal (confirmação digna); repasseId nasce
  ao abrir o modal e é reusado no retry (idempotência amigável). afiliadoId = refCodigo
  (readers.ts:167 `refCodigo: d.id` — o docId do afiliado É o refCodigo).

## Pendências (registradas)

- **Prova visual :5273 = PENDENTE de conferência do Vitor.** O :5273 é `vite preview` de um
  build anterior (stale — não tem a rota /crm). Provado por RTL; conferir visualmente após
  rebuild/restart do preview. (Não abri navegador por iniciativa própria — diretriz.)
- **Repasse PARCIAL** de comissão: hoje é do saldo total (limitação do ConfirmModal, que
  não coleta valor). Follow-up se o Vitor quiser valor parcial.
- **"Última atividade"** (coluna citada no brief T1) NÃO existe no doc CRM (o parse não
  expõe carimbo `atualizadoEm`). Omitida; precisa o backend expor um timestamp para existir.
- **E19-T4** (disparo de comunicação a segmentos do CRM) segue pendente — fora deste lote.

## Onde o Vitor confere (pós-restart do :5273)

- Sidebar → **Comunicação** → /crm (lista) → clicar um cliente (detalhe: histórico,
  aniversário, idade, LTV).
- Evento → aba **Afiliados** → Novo/Editar influenciador → seção **Comissão** (percentual/
  valor fixo + aviso de não-retroatividade); coluna Comissão na lista.
- **Clubes → Influenciadores**: colunas de saldo + botão "Registrar repasse" (só com saldo
  positivo) → ConfirmModal.
- **Clubes → Minhas afiliações** (conta influenciador): KPIs de comissão + extrato de repasses.

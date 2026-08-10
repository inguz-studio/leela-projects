# PURGA-DADOS-TESTE · fase 1 — INVENTÁRIO CONGELADO (read-only) — COMPLETA

**Lane:** `INVENTARIO` · **Trace:** `leela-purga-20260810` · **Employee:** `sf-backend-lead`
**Data:** 2026-08-10 · **Projeto:** `leela-hub` (produção, SOMENTE LEITURA — cumprido: zero writes)
**Outputs:** `C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\`

> Esta lane NÃO escreveu em produção: nenhum delete, nenhum update, nenhum deploy, nenhum
> `--apply`. Toda chamada foi GET ou POST em endpoint de leitura (`:listCollectionIds`,
> `accounts:batchGet`). Ela congela o inventário, monta o plano por lista explícita e PARA.
> Próxima fase: REVIEW FRIA sobre o plano congelado. Só depois, apply.

## Estado das tarefas

- [x] T0 · Autoridade lida na ordem exigida (pausa 09/08 § PURGA → decisões do dono blocos
      14/16/21 → runner + handoff + fonte da corrida de 06/08).
- [x] T1 · Autenticação via configstore do firebase-tools (método provado de 06/08, `gtok.mjs`
      copiado sem alteração). Probe 200 às 16:20:06Z.
- [x] T2 · Inventário congelado: Firestore recursivo completo (com `showMissing`) + 21 contas
      de Auth. Janela: **2026-08-10T16:21:11Z → 16:22:22Z** (71 s, ~700 chamadas de leitura).
- [x] T3 · Diff contra a lista autorizada + surpresas pós-06/08.
- [x] T4 · Plano congelado por lista explícita, formato do runner, digital sha256. SEM EXECUTAR.
- [x] T5 · Este handoff.

## Método

1. Token: mesmo caminho do runner de 06/08 — configstore do firebase-tools com refresh
   oauth2 (`scripts/gtok.mjs`, cópia byte a byte do de 06/08). gcloud não existe na máquina.
2. Varredura: `:listCollectionIds` na raiz e em cada documento, `list` com `showMissing=true`
   em cada coleção — recursivo até o fim. Cada doc congelado com caminho, createTime,
   updateTime e campos. Auth por `accounts:batchGet` (o endpoint do `auth:export`).
3. Análise local sobre o arquivo congelado (zero chamadas extras): `analise.txt` +
   `conferencias.txt` (14 conferências cirúrgicas, incluindo referências cruzadas de uids).
4. Plano gerado por `scripts/gerar-plano.mjs` com **asserts de preservação que abortam** se
   qualquer item da lista intocável cair no plano — e com triagem TOTAL (cada um dos 324 docs
   está em exatamente um dos lados: 247 a matar, 77 a manter; 324 = 247+77 ✔).
5. RAM ~0,4 GB: scripts Node puros, sequenciais, sem emulator, sem build. Pico irrelevante.

## A fotografia (carimbo 2026-08-10T16:21:11Z)

| | Contagem |
|---|---|
| Documentos reais | **324** (eram 306 no fim de 06/08; +18 = exatamente os docs do cron de analytics) |
| Documentos-fantasma | 2 (`profissionais/QbqlSxanxlcFeHCy4g47Vp7jlgz1` — pai do intocável — e `profissionais/uid-ritmo-forte`) |
| Contas de Auth | 21 (15 anônimas sem e-mail, 6 com e-mail) |
| PITR | DESLIGADO · deleteProtection DESLIGADO · retenção de versão 1h — a única rede é export duplo |

Contagens por coleção (reais): atletas 18 · auditoriaAcessos 1 · carrinhos 4 (+3 ciclos) ·
catalogoAcoes 16 · clubes 2 (+3 comunicados, 1 desafio, 1 ação, 18 membros, 1 parceria) ·
cobrancasPixAtivas 3 · eventos 2 (corrida-inverno-floripa-2026 com 91 inscritos, 6 lotes,
2 kits, paginaVendas, financeiro, demografia; teste-taxa-repassada com 2 inscritos, 1 lote,
financeiro, demografia, comunicações, T93N7F) · itensKit 2 · pagamentos 3 (+3 webhookEventos) ·
pedidoCodigos 3 · pedidos 3 · perfis 1 · pessoas 1 · platform 2 · profissionais 2 (+25
analyticsSnapshots, 4 dashboards) · rateLimits 5 · reenviosEmail 1 · tenants 1 (+2
commercialTerms, 77 crmClientes, 1 dadosBancarios, 1 parceiro, 3 repasses, 1 saldo).

## Diff contra o que o dono mandou matar

| Alvo declarado | O que existe hoje | Veredito |
|---|---|---|
| marina@demo-leela.dev | VIVA, senha válida, lastLogin 05/08 18:09, uid `uid-marina-castelo` | no plano (Auth) |
| felipe@demo-leela.dev | VIVA, senha válida, lastLogin 05/08 11:18, uid `uid-felipe-martins` | no plano (Auth) |
| 3 repasses vetados (COMPROMETIDO-1) | `repasse-demo-0001/0002/0003` (8200+5400+3100 = o `comprometido` 16700 do saldo) | no plano |
| VITRINE-2 (2 eventos sem preço) | **JÁ MORTOS em 06/08** (`noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estavam nos eventosCondenados daquele plano; hoje só existem 2 eventos) | sem objeto — registrar no painel junto do report da purga |
| "Todo dado de teste restante" | evento-seed `corrida-inverno-floripa-2026` + subtree (102 docs), clubes-seed (26), crmClientes-seed (76 de 77), parceiro-seed (1), atletas anônimos do seed (12), resíduo fantasma `uid-ritmo-forte` (14, realimentado por cron diário 06:05) | no plano |

**Conferência ADMINSEP-3 paga:** as ÚNICAS 6 referências em Firestore a `uid-marina-castelo`
/ `uid-felipe-martins` (desafio, membro, parceiro, 3 repasses) morrem TODAS dentro deste
plano. Depois do apply Firestore, a exclusão das duas contas de Auth não deixa ponteiro órfão.

## O plano congelado

- **Arquivo:** `outputs/leela-purga-20260810/plano-purga-congelado.json` — formato do runner
  de 06/08 (`{digital, alvo, plano}` canonicalizado; extensão `authAcoes` para as 2 contas).
- **Tamanho:** **247 exclusões em Firestore, 0 edições** + **2 contas de Auth**
  (revokeRefreshTokens antes do delete). Sobrevivem 77 docs e 19 contas.
- **Digital das operações:** `87d6289c15ab307205154467a0f3ec4047286ff75987742ac10a75e1324fd5c1`
  (sha256 do texto canônico de `plano.operacoes`, mesma regra de `execucaoLimpeza.ts`).
- **sha256 do arquivo:** `db98441dd6395902eee4664e735899ad3bc8063157275ddf98676c1455a50b77`.
- **Lista legível, doc a doc (a matar E a manter):** `plano-purga-legivel.txt`.
- **Ordem dos grupos:** a do runner — evento (10) → folhas (30) → agregados (40) → raízes
  (50) → folhas de clube (60) → clubes (70) → folhas de tenant (80) → atletas (100) →
  fantasmas ritmo-forte (110, por último: `onClubeWriteDashboard` recria dashboard no delete
  de clube; varrer antes seria varrer para o lixo voltar).
- **Conflitos de proteção: 11**, todos declarados no plano e na lista legível — 9 da trilha
  do pedido FALHOU do dono (uid `wNXRT…`, ver D3) + 2 de posse (`corrida-inverno` e
  `floripa-run-coletivo` carregam o uid do dono como organizador/owner do seed). Exigem
  aceite explícito na fase de apply, como em 06/08.
- **Resumo por coleção (apagar):** eventos 1 · inscritos 91 · lotes 6 · kits 2 ·
  paginaVendas 1 · financeiro 1 · demografia 1 · carrinhos 2 (+3 ciclos) · cobrancasPix 1 ·
  pagamentos 1 (+1 webhook) · pedidos 1 · pedidoCodigos 1 · itensKit 2 · clubes 2 +
  24 folhas · crmClientes 76 · parceirosAssessoria 1 · repasses 3 · atletas 12 ·
  analyticsSnapshots 13 + dashboard 1 (uid-ritmo-forte).

**O que o plano NÃO toca (prova por assert no gerador, que aborta se violar):** PED-8CDHM e
toda a sua trilha (`ped-…ed77a161…`, pagamento, webhook, carrinho, cobrança, `pedidoCodigos/8CDHM`),
`T93N7F`, o evento `teste-taxa-repassada` e TODO o seu subtree, a conta/uid
`inguzbuilders@gmail.com` (`FTqslV98…`), `pessoas/cpf_…` (o CPF real do dono),
`tenants/…/crmClientes/cpf_d72f3f9c…` (o cliente CRM real da compra de 04/08), tenant, perfis,
platform, saldo, dadosBancarios, commercialTerms, auditoria e reenviosEmail da compra real,
contas reais de 06/08 (`dugamer597@`, `eusouojoaocalixto@`) e seus profissionais/dashboards.

## Surpresas pós-06/08 (todas mapeadas; nenhuma é pedido/pagamento/inscrição)

1. **+18 docs, todos do cron de analytics das 06:05** (16 `analyticsSnapshots` diários de
   07–10/08 + 2 `dashboard/current` novos para os dois cadastros reais de 06/08). Aritmética
   fecha na bala: 306 + 18 = 324.
2. **`uid-ritmo-forte` é resíduo AUTOALIMENTADO**: fantasma com 13 snapshots + dashboard,
   recriado todo dia às 06:05 enquanto `clubes/ritmo-forte-assessoria` (ownerId dele) existir.
   Matar só os filhos sem matar o clube = eles voltam amanhã. O plano mata o clube (ordem 70)
   e varre o fantasma por último (110).
3. **Nenhum dado novo de gente**: zero pedidos, pagamentos, inscrições ou contas novas depois
   de 06/08. Únicos updates: dashboards por cron e o login do dono hoje 13:04.
4. **Medição que o handoff de pausa pedia (SEMKIT-REPARO), paga de graça:** os kits de
   produção são `kit_basico preco=0` e `kit_prata preco=45` — **não existe kit negativo em
   produção**. A S318-T6 está SEM OBJETO, confirmado por leitura direta; a S318-T5 (seed na
   fonte ainda com `-15`/`-10`) segue sendo a tarefa que importa.
5. **VITRINE-2 sem objeto** (os dois eventos sem preço já morreram em 06/08) — fechar no
   painel junto do report da purga, como a rodada de 09/08 mandou.

## Dúvidas nomeadas para o dono (nada disso trava a review fria)

- **D1 · `atletas/4LdgQ09W9lcVXDpHcKH4elUWr953`** — anônimo de 05/08 11:44 (1 min depois de
  um teste de reset de senha), sem e-mail, sem nenhum vínculo no banco. Cheira a teste, mas a
  prova é circunstancial → ficou FORA do plano pela regra "na dúvida, fora". Mata?
- **D2 · 13 contas de Auth anônimas sem e-mail** (29/07–05/08; sem senha, role athlete). O
  dono só declarou marina@ e felipe@ para Auth. Depois da purga, 12 delas ficam sem NENHUM
  lastro em Firestore (os atletas-seed morrem no plano). `wNXRT…` e `MOXZ…` NÃO entram nunca
  (lastro da compra real e do diagnóstico). Mata as 13 numa segunda leva?
- **D3 · Trilha do pedido FALHOU do dono (03/08, R$ 63, sessão anônima `wNXRT…` ×
  corrida-inverno)** — 9 docs estão DENTRO do plano como conflito de proteção declarado
  (precedente exato de 06/08: os 19 conflitos eram a mesma classe e foram aceitos e
  apagados). Se quiser preservar esse rastro de diagnóstico, é um veto de 9 linhas.
- **D4 · Trilha do pedido falhou `MOXZ…` (04/08, R$ 10, diagnóstico PIX)** — fica FORA do
  plano: mora no subtree do evento PRESERVADO (pedido, pagamento+webhook, carrinho, cobrança,
  inscrito `pendente`, `Q57PA`, atleta). Confirmar que fica.
- **D5 · Números macro**: `platform/rollups` segue com números do seed (gmvTotal 167277,
  receitaLeelaTotal 17564.09, eventosAtivos 2 — que ficará defasado após a purga) e
  `tenants/castelo-producoes.eventosAtivos` segue 5 — campos sem mantenedor; recompute foi
  VETADO em 06/08 (A6). O plano NÃO os edita (nenhum número inventado). Qual é o destino:
  recompute autorizado, patch com número dele, ou lane própria?
- **D6 · Resíduo operacional fica**: 5 `rateLimits/reset-senha:*` e 1 `auditoriaAcessos` —
  não são "dado de teste", são trilha de operação. Ficaram FORA. Ok?

## Riscos e notas para as fases 2 (review fria) e 3 (apply)

1. **O runner de 06/08 replaneja do banco e compara digital** — e o planejador
   (`montarPlano`) não sabe representar ESTE alvo (clubes/CRM/atletas do tenant vivo,
   fantasma ritmo-forte). A lane de apply precisa ou estender o planejador, ou executar o
   plano congelado com um executor que pule o replanejamento MAS mantenha: portão de digital
   do arquivo, checkpoint com chave indexada (`chaveDaOp`), drenagens entre grupos (20 s; 90 s
   antes do grupo 110), régua do backup (`validarReguaDoBackup`) e o aceite explícito dos 11
   conflitos. Nada disso se improvisa no dia.
2. **Backup DUPLO antes do apply** — export Firestore fresco + export de Auth, JUNTOS
   (restaurar um sem o outro = incidente de 06/08 de manhã). PITR desligado, retenção 1h:
   o export é a única volta.
3. **Gatilhos esperados no apply** (medidos em 06/08): delete do `financeiro/current` do
   evento condenado dispara `onFinanceiroEventoWrite` → saldo recompõe sozinho (esperado
   `vendidoBruto=10` — só a compra real); delete dos 3 repasses dispara `onRepasseWrite` →
   `comprometido=0`. Conferir os dois no pós-apply. `onClubeWriteDashboard` reescreve o
   dashboard do dono (intocável) no delete dos clubes — reescrita por gatilho, não é toque
   do plano.
4. **Amplificação**: 91 inscritos × 3 agregadores — a ordem evento-primeiro desarma (o
   gatilho desiste sem o pai), mas as drenagens continuam obrigatórias.
5. **Janela do cron**: não rodar o apply cruzando 06:05 UTC (gerador de snapshots correndo
   contra o grupo 110).
6. **Autenticação**: configstore do firebase-tools funcionou sem rotação. Nenhuma credencial
   tocada, nenhum erro.

## Artefatos

- `outputs/leela-purga-20260810/inventario-congelado.json` — 324 docs + 2 fantasmas + 21
  contas, com campos e carimbos (contém PII de produção: fica no disco, fora de chat).
- `outputs/leela-purga-20260810/plano-purga-congelado.json` — o plano (digital acima).
- `outputs/leela-purga-20260810/plano-purga-legivel.txt` — lista explícita: 247 a matar
  (por grupo de ordem), 2 Auth, 11 conflitos, 77 sobreviventes.
- `outputs/leela-purga-20260810/analise.txt` + `conferencias.txt` — as leituras que
  sustentam cada veredito.
- `outputs/leela-purga-20260810/scripts/` — `gtok.mjs`, `probe.mjs`, `inventario.mjs`,
  `analise.mjs`, `conferencias.mjs`, `gerar-plano.mjs` (replay determinístico: mesmo
  inventário → mesma digital).

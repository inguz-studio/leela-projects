# LIMPEZA-PROD — handoff vivo

**Lane:** `LIMPEZA-PROD` · **Trace:** `leela-limpeza-prod-20260806` · **Employee:** `sf-platform-lead`
**Data:** 2026-08-06 · **Repo:** `C:\dev\LEELA` (branch `main`) · **Projeto:** `leela-hub` (southamerica-east1)

⚠️ **METADE 1 APENAS.** O `--apply` não roda sem liberação explícita do maestro, depois de review antagonista.

---

## T1 · Backup — FEITO. Os dois.

| # | O quê | Onde | Como restaurar |
|---|---|---|---|
| 1 | Firestore inteiro (3.138 docs, 47 caminhos) | `gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806` | `POST firestore.googleapis.com/v1/projects/leela-hub/databases/(default):importDocuments` com `inputUriPrefix` apontando o caminho |
| 2 | Auth (21 contas, com `passwordHash` + `salt`) | `C:\dev\leela-backups\leela-limpeza-prod-20260806\auth-users-20260806.json` | `firebase auth:import <arquivo> --hash-algo=SCRYPT --project leela-hub` mais os parâmetros de hash do projeto |

Operação de export: `SUCCESSFUL`, verificada e não presumida. Bucket conferido: **não é público** (sem `allUsers` nem `allAuthenticatedUsers` no IAM), então o dump com PII está atrás de IAM.

⚠️ **PITR está DESLIGADO** (`POINT_IN_TIME_RECOVERY_DISABLED`) e o banco está sem proteção de exclusão. Estes dois arquivos são a **única** rede. Não existe "voltar trinta minutos".

⚠️ O import do Firestore **não apaga** o que existir a mais: ele sobrescreve por caminho. Restaurar repõe os documentos exportados, e não desfaz sozinho a exclusão de uma coleção inteira.

---

## T2 · Mapa de ponteiros — FEITO (medido, não estimado)

**Produção materializa 47 caminhos de coleção e 3.138 documentos.** O código modela cerca de 70 caminhos; 23 deles (`inscritos/{id}/saude`, `atletas/{uid}/registros`, `equipe`, `afiliados`, `cancelamentos`, `transferencias`, `termoSaude`, `lifecycleAudit`, `estornos`, `subscriptions`, `dadosBancariosSecret`, `convites`, `participantes`, `board` e outros) existem no schema e têm **zero documento hoje**. O plano varre os 47 reais e faz varredura defensiva nos modelados vazios.

### 2.1 Onde um `eventoId` aparece (contagem real)

| caminho :: campo | refs | distribuição |
|---|---|---|
| `eventos/{id}` :: `id`, `slug` | 9+9 | 1 por evento |
| `eventos/{id}/comunicacoes/{id}` :: `eventoId` | 821 | meia=820 · teste=1 |
| `eventos/{id}/ingressoCodigos/{id}` :: `eventoId` | 433 | meia=432 · teste=1 |
| `tenants/{id}/crmClientes/{id}` :: `inscricoes.{chave}.eventoId` | **736** | meia=432 · desafio=101 · inverno=76 · noturna=60 · silvestre=40 · retiro=26 · teste=1 |
| `pedidos/{id}` :: `eventoId` | 17 | meia=12 · teste=2 · desafio=2 · inverno=1 |
| `pagamentos/{id}` :: `eventoId` | 15 | meia=10 · teste=2 · desafio=2 · inverno=1 |
| `itensKit/{id}` :: `eventoId` | 9 | meia=6 · inverno=2 · noturna=1 |
| `carrinhos/{id}` :: `eventoId` | 9 | meia=4 · inverno=2 · teste=2 · desafio=1 |
| `carrinhos/{id}/ciclos/{id}` :: `eventoId` | 8 | meia=5 · inverno=3 |
| `cobrancasPixAtivas/{id}` :: `eventoId` | 6 | teste=2 · desafio=2 · inverno=1 · meia=1 |
| `eventos/{id}/reembolsos/{id}` :: `eventoId` | 5 | meia=5 |
| `clubes/{id}/parcerias/{id}` :: `eventoId` | 3 | meia=2 · maratona=1 |
| `eventos/{id}/paginaVendas/{id}` :: `eventoId` | 3 | desafio · inverno · meia |
| `clubes/{id}/desafios/{id}` :: `eventoVinculadoId` | 2 | meia=2 |
| `tenants/{id}/repasses/{id}` :: `eventoId` | 2 | meia=1 · desafio=1 |
| `eventos/{id}/politicaVendas/{id}` :: `eventoId` | 1 | meia=1 |
| `tenants/{id}/parceirosAssessoria/{id}` :: `condicaoDesconto.eventoId` | 1 | meia=1 |
| `reenviosEmail/{id}` :: `eventoId` | 1 | teste=1 |

**Total: 2.090 referências a evento.** Referências a tenant: 3.030. Referências a uid: 82.

### 2.2 Documentos por evento (medido)

| evento | status | inscritos | **total de docs no subtree** |
|---|---|---|---|
| `meia-floripa-2026` | encerrado | 462 | **1.751** |
| `desafio-mtb-costa-lagoa-2026` | publicado | 120 | 131 |
| `corrida-inverno-floripa-2026` | publicado | 91 | 102 |
| `noturna-beira-mar-2026` | publicado | 60 | 64 |
| `sao-silvestre-floripa-2025` | encerrado | 40 | 44 |
| `retiro-bem-estar-rio-vermelho-2026` | publicado | 28 | 32 |
| `teste-taxa-repassada` | publicado | 2 | 8 |
| `trilha-pantano-sul-2026` | rascunho | 0 | 2 |
| `maratona-floripa-2027` | rascunho | 0 | 0 |

### 2.3 Órfãos que JÁ existem hoje (20) — a linha de base

Não foram causados por esta lane. O critério de sucesso é **nenhum órfão novo**, e não "zero órfãos".

- 3 × `clubes/{id}/parcerias/{id}.eventoId` para `acate-corporativo-2026`, `corrida-ponte-2026` e `trail-ratones-2026`, eventos que nunca existiram
- 4 × `tenants/{id}.ownerUid` para `uid-comite-acate`, `uid-ligia-souza`, `uid-passo-certo-owner` e `uid-ricardo-haro`, uids sem conta
- 4 × `eventos/{id}/reembolsos/{id}.transicoes[].por` para `atleta-insc-000X`
- 3 × `tenants/{id}/repasses/{id}.transicoes[].por` para `uid-platform-admin`
- 6 restantes em `clubes.ownerId`, `parcerias.organizadorId` e `parceirosAssessoria.responsavelUid`

---

## T3 · Superfícies do nome — FEITO. **20 ocorrências medidas no dado.**

🔴 **O achado que muda a tarefa: `tenants/castelo-producoes.nome` não é o que o público vê.**
A superfície pública lê **`perfis/castelo.nome`**. Trocar só o tenant deixa "Castelo Produções" no título da página, no og:title, no bloco "Organizado por" e **no termo de saúde que o comprador aceita no checkout**.

| # | Documento · campo | Valor hoje | Quem vê |
|---|---|---|---|
| 1 | `tenants/castelo-producoes` · `nome` | Castelo Produções | só platform_admin |
| 2 | 🔴 `perfis/castelo` · `nome` | Castelo Produções | **público** — título, og, "Organizado por", termo de saúde |
| 3 | 🔴 `platform/rollups` · `tenants.castelo-producoes.nome` | Castelo Produções | platform_admin, rollup denormalizado |
| 4 | `perfis/castelo` · `handle` | `castelo` | **público — URL `/@castelo`** |
| 5 | `perfis/castelo` · `linksExternos[0].url` | instagram.com/casteloproducoes | público |
| 6 | `perfis/castelo` · `linksExternos[1].url` | castelo-producoes.example.com | público |
| 7 | `tenants/…/dadosBancarios/current` · `titular` | Castelo Produções LTDA | organizador |
| 8 | `tenants/…/dadosBancarios/current` · `pixMascarado` | `***@castelo***.com` | organizador |
| 9–14 | `tenants/…/repasses/repasse-demo-000{1,2,3}` · `dadosBancariosSnapshot.{titular,pixMascarado}` | idem | organizador |
| 15 | `clubes/floripa-run-coletivo` · `descricao` | "…da Castelo Produções…" | público |
| 16 | `clubes/ritmo-forte-assessoria` · `descricao` | "…da Castelo Produções…" | público |
| 17 | `clubes/corrida-perfeita-sul/comunicados/cupom-amigos` · `conteudo` | "…com a Castelo Produções…" | membros |
| 18 | `clubes/floripa-run-coletivo/membros/membro-marina-castelo` · `atletaNome` | Marina Castelo | pessoa, não produtora |
| 19 | `eventos/meia-floripa-2026/cupons/RITMOFORTE10` · `parceriaRef` | caminho com o slug | técnico |
| 20 | `tenants/castelo-producoes` · `slug` | `castelo-producoes` | ⛔ **não tocar** |

**E-mails e PDF do ingresso: limpos.** Nenhum dos oito templates carrega nome de produtora; todos assinam "Leela" (`BREVO_SENDER_NAME=Leela`, verificado no runtime deployado). O PDF não tem campo de produtora. O defeito clássico não existe nessas duas superfícies.

⚠️ **O seed reverte o nome.** `functions/src/seed/tenants.seed.ts:47` e `functions/scripts/preview-seed-extra.ts:1347` usam `merge:true` e upsert. Rodar o prod-seed depois da troca traz "Castelo Produções" de volta nos dois lugares.

---

## T4 · Acesso do dono — links gerados, decisão não tomada

Dois links de definição de senha gerados. Nenhuma senha definida, nenhuma conta criada, nenhum e-mail enviado.

⛔ **Bloqueio de modelo encontrado:** a claim de papel é **um valor só** (`{"role": "..."}`), e não uma lista. Não existe "tenant_owner e athlete ao mesmo tempo". O detalhe e a saída estão no relatório final.

---

## T7 · Transferência de titularidade — FEITO (06/08, depois do portão da metade 1)

Autorizado pelo maestro depois que o dono definiu a senha, entrou e bateu em "Esta conta não tem acesso ao painel do organizador".

### O que foi escrito (5 documentos, todos reconferidos por releitura)

| documento | campo | antes | depois |
|---|---|---|---|
| `tenants/castelo-producoes` | `ownerUid` | `uid-marina-castelo` | `QbqlSxanxlcFeHCy4g47Vp7jlgz1` |
| `perfis/castelo` | `ownerUid` | `uid-marina-castelo` | `QbqlSxanxlcFeHCy4g47Vp7jlgz1` |
| `clubes/floripa-run-coletivo` | `ownerId` | `uid-marina-castelo` | `QbqlSxanxlcFeHCy4g47Vp7jlgz1` |
| `eventos/teste-taxa-repassada` | `organizadorId` | `uid-marina-castelo` | `QbqlSxanxlcFeHCy4g47Vp7jlgz1` |
| `eventos/corrida-inverno-floripa-2026` | `organizadorId` | `uid-marina-castelo` | `QbqlSxanxlcFeHCy4g47Vp7jlgz1` |

Claim: `{"role":"athlete"}` → `{"role":"tenant_owner","tenantId":"castelo-producoes"}`, no formato exato de `mergeTenantClaims` (sem `demotedFromRole`). Senha e `emailVerified` preservados.

### ⚠️ Divergência: eram 11 ponteiros sobreviventes, não 5

A varredura completa achou **25 referências** a `uid-marina-castelo`; **11 sobrevivem** ao plano. Transferi só os **5 de titularidade**. Os outros 6 são **autoria e trilha de auditoria** — reescrevê-los seria falsificar histórico:

- `clubes/floripa-run-coletivo/desafios/subidas-do-morro` · `autorId` (quem escreveu o desafio)
- `clubes/floripa-run-coletivo/membros/membro-marina-castelo` · `atletaId` (a **filiação** da Marina ao clube — não é titularidade)
- `tenants/castelo-producoes/parceirosAssessoria/51888000000199` · `criadoPor`
- 3 × `tenants/castelo-producoes/repasses/repasse-demo-000{1,2,3}` · `transicoes[0].por` — **bloco financeiro, vetado nesta rodada**

O sistema já tolera esse tipo de ponteiro pendurado: `repasses.transicoes[1].por` aponta para `uid-platform-admin`, que nunca existiu.

### Prova

Não consegui emitir um ID token real (a credencial de owner não tem `iam.serviceAccounts.signJwt`, e alterar IAM de produção para provar um ponto não é troca justa). Provei por dois caminhos que não dependem disso: a claim gravada, relida do servidor, e o **ruleset deployado** avaliado contra o **documento real** do pedido `8CDHM` pela API oficial de teste — quatro cenários, todos no esperado.

⛔ **O dono precisa sair e entrar de novo.** `resolverSessao` só força refresh do token quando **nem** `role` **nem** `tenantId` estão no cache; o token dele tem `role: 'athlete'`, então não força, e ele continuaria vendo a tranca até o refresh natural (até 1h). O login novo passa por `lerSessaoPosLogin`, que usa `getClaims(true)`.

---

## T8 · Resposta à review antagonista — os 4 bloqueadores fechados

Review: `.nirvana/handoffs/leela-rev-limpeza-20260806.md`. Veredito era BLOQUEAR. Cada correção tem um teste que **falha no planejador antigo** e passa no novo — a prova está em `functions/src/__tests__/limpezaProdFalsificacao.test.ts`, que roda a mesma asserção contra o commit `d887528e` congelado em `fixtures/`.

| # | O que mudou | Teste que falhava antes |
|---|---|---|
| **B1** | O **documento do evento morre primeiro** (`ORDEM.EVENTO=10`), e não os agregados. Os quatro gates (`agregarFinanceiro:220`, `agregarEstoque:110`, `agregarDemografia:120`, `agregarComunicacoes:61`) checam `!eventoSnap.exists` — matar o pai desarma os quatro de uma vez. Agregados vão para `ORDEM.AGREGADOS=40`. Drenagem de 10s entre grupos. | `[B1] o financeiro sai DEPOIS dos inscritos e do evento` |
| **B2** | Condenação por **lista literal congelada** no `ALVO`, nunca derivada do que ainda existe. Checkpoint por operação (`--retomar`). Alvo incoerente lança. | `[B2] queda logo depois do evento: a rodada 2 ainda apaga o resto` + varredura de **todos** os cortes possíveis |
| **B3** | Gate real: `intocavel()` tira do plano documento sob caminho de uid protegido; `conflitosDeProtecao` **trava o `--apply`** (exit 4) sem `--aceitar-conflitos-de-protecao`. Pega uid em campo **e em chave composta**. | `[B3] ANTIGO falha: apaga documento sob uid protegido` |
| **B4** | `podarChavesCondenadas` **desce até o fundo** em vez de parar no primeiro ramo. Os totais de raiz o plano NÃO forja: entram como `recomputesObrigatorios`. | `[B4] ANTIGO falha: deixa a chave morta lá no fundo` |

### Ajustes

- **A1** — `dadosBancariosSnapshot` e campos de identidade bancária (`titular`, `pixMascarado`, `documento`, `cnpj`, `cpf`) saíram do renomeador. Snapshot é registro do que era verdade na hora; "Leela LTDA" seria razão social inventada por concatenação. As edições caíram de 10 para 6.
- **A4** — o portão do `--backup` agora **lista o prefixo no GCS**, exige `.overall_export_metadata` e imprime o instante do export. `--backup=x` passava antes; agora morre.
- **A5** — o dry-run congela o plano em disco com **digital SHA-256**; o `--apply` recomputa e **recusa** (exit 3) se divergir.
- **A6** — token OAuth cacheado em memória com o refresh guardado.
- **Ordem 10 "certa por acidente"** — comentário e nome de teste corrigidos. A review provou que `onInscritoWriteAutomacao` sai na primeira linha em qualquer delete; a ordem dos disparos é **defesa em profundidade**, não a coisa que impede o e-mail. Nenhum teste afirma o contrário agora.

### 🔴 Achado meu, além da review: o inventário estava incompleto

`recomputeProfessionalDashboard` (`aggregateProfessionalDashboard.ts:213`) faz `.set()` **incondicional** em `profissionais/{profId}/dashboard/current` sem checar se o pai existe. Existem **4 documentos-fantasma** (pai inexistente com subcoleção) escondendo **31 documentos** que o inventário de 3.138 nunca viu — e **um deles foi criado pela minha própria transferência de titularidade**.

Total real: **3.170**. O runner agora lista com `showMissing=true`. Isso sozinho revelou 10 órfãos novos (`profissionais/uid-marina-castelo/analyticsSnapshots/*` apontando para `noturna-beira-mar-2026`), varridos em `ORDEM.FANTASMAS=110` — por último, porque `onClubeWriteDashboard` recria dashboard até a ordem 70.

### ✅ Correção de fato aceita: existe janela de 1 hora

Eu escrevi "não existe voltar trinta minutos". Estava errado, e provei o contrário lendo produção num instante passado:

```
versionRetentionPeriod  3600s      earliestVersionTime  2026-08-06T14:02:16Z
tenants/castelo-producoes.ownerUid
  agora                    -> QbqlSxanxlcFeHCy4g47Vp7jlgz1
  em 2026-08-06T14:05:00Z  -> uid-marina-castelo        ← antes da transferência
  em 2026-08-06T13:00:00Z  -> FAILED_PRECONDITION: read_time is too old
```

Dentro de 60 minutos dá para ler em `readTime` passado e exportar com `snapshotTime`. **É a rede mais barata disponível e entra no runbook.**

### Backup refeito

O export do T1 (13:45:45Z) era **anterior** à transferência de titularidade. Novo export, posterior:
`gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806-pos-titularidade` — `SUCCESSFUL`.

### Dry-run refeito

**2.810 exclusões e 6 edições**, sobrevivem 364 de 3.174. Digital `ee12004606f095dc`. Órfãos previstos: **3**, todos registro financeiro do tenant sobrevivente — vetados pelo maestro nesta rodada.

---

## T5 e T6 · Script e dry-run — FEITO

- Plano puro e testável: `functions/src/limpeza/planoLimpeza.ts`
- Runner de I/O: `functions/scripts/limpeza-prod-leela-hub.ts` (`--dry-run` por omissão; `--apply` aborta sem `--backup`, verificado)
- Teste contra dado sintético: `functions/src/__tests__/limpezaProd.test.ts` — **26 casos, verdes**
- `tsc --noEmit` no projeto `functions`: limpo

**Dry-run rodado contra produção de verdade.** 3.138 documentos lidos, **2.800 exclusões e 10 edições**, sobrevivem **338 documentos**, 2 eventos, 1 tenant, 3 pedidos. Produção conferida depois: intacta (9 eventos, 17 pedidos, nomes originais). Saída completa em `C:\dev\leela-ops\limpeza-20260806\dryrun.txt`.

### Dois defeitos que o próprio dry-run pagou

1. **`platform/rollups` teria ficado com os 5 tenants mortos dentro.** O ponteiro não está num campo chamado `tenantId`: está na **chave do mapa**. Nenhuma varredura por nome de campo o acharia. Corrigido com `podarChavesCondenadas`, e a máscara de PATCH virou profunda para não apagar os irmãos.
2. **A simulação mutava o próprio plano.** `aplicarMudancas` enxertava no documento o mesmo objeto que a operação carregava e depois escrevia dentro dele; o plano passava a mentir sobre si mesmo, e o `--apply` mandaria um corpo que ninguém revisou. Corrigido com cópia profunda, com teste de regressão.

### Órfãos que sobram — e que eu NÃO resolvi de propósito

Três, todos no tenant que sobrevive, todos registro **financeiro** apontando para evento morto:

- `tenants/castelo-producoes/parceirosAssessoria/51888000000199` · `condicaoDesconto.eventoId` → `meia-floripa-2026`
- `tenants/castelo-producoes/repasses/repasse-demo-0001` · `eventoId` → `meia-floripa-2026`
- `tenants/castelo-producoes/repasses/repasse-demo-0002` · `eventoId` → `desafio-mtb-costa-lagoa-2026`

Mexer em repasse é mexer em dinheiro, e isso não é decisão minha. Proposta no relatório final.

---

## Ferramentas de medição (fora do repo, não commitadas)

`C:\dev\leela-ops\limpeza-20260806\` — `gtok.mjs` (token OAuth do CLI), `fsrest.mjs` (cliente REST que **explode na chave `error` do `runQuery`**), `arvore.mjs`, `grafo.mjs`, `nomes.mjs`, `pendurados.mjs`, `linksenha.mjs`.

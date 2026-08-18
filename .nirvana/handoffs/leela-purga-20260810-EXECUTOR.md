# PURGA-DADOS-TESTE · fase 3a — EXECUTOR-BUILD (construir e testar; SEM apply) — COMPLETA

**Lane:** `EXECUTOR-BUILD` · **Trace:** `leela-purga-20260810` · **Employee:** `sf-backend-lead` (software-forge)
**Data:** 2026-08-10 (fechada ~17:20Z) · **Disciplina cumprida:** ZERO escrita em produção (dry-run e pré-flight 100% read-only, só GET/list/batchGet); zero deploy; emulator subiu SÓ na fase de gates e foi derrubado no fechamento (RAM devolvida: 368→935 MB livres).

## VEREDITO: EXECUTOR PRONTO — apply real aguarda ack do dono (condição 4 da REV-FRIA)

- [x] Executor construído em `C:\dev\leela-purga-executor-20260810\` (git local, commits `fdda651` + `ae34c22`).
- [x] Gate 1 · dry-run PRODUÇÃO (read-only): **frescor 0 delta** às ~17:05Z.
- [x] Gate 2 · ensaio COMPLETO no emulator: apply do PLANO REAL, kill -9 no meio, retomada por checkpoint, pós-check, Auth.
- [x] Gate 3 · falsificação dos portões: 31/31 testes unitários + 6 falsificações em nível de CLI (F1–F6), todas seguraram.
- [ ] Apply real: **NÃO RODOU** — espera ack do dono; linha exata na seção final.

## O que foi construído (reaproveitado × novo)

| Arquivo | Origem |
|---|---|
| `nucleo.mjs` | REAPROVEITADO do runner 06/08 (`execucaoLimpeza.js`): canonicalização/digital R1, `chaveDaOp` R3, laço `executarPlano` R2 com drenagem condicional, `validarReguaDoBackup`. NOVO: portão de entrada por pinos (2a/2h), aceite de conflitos amarrado à digital (2d), frescor substituto (2f), pós-check condição 3, zero-refs (2g), janela (condição 1), mesmo-ato do backup duplo (2e). Tudo função pura, testável sem rede. |
| `io.mjs` | REAPROVEITADO: auth via configstore com cache (gtok/A6), retentativa transitória, varredura recursiva com showMissing (fase 1), localizarBackup GCS, `exportDocuments` sem snapshotTime (PITR desligado, medido 06/08). NOVO: alvo producao×emulator com recusa cruzada (producao aborta se houver env de emulador; emulator nunca fala com googleapis); **a única primitiva de escrita Firestore é DELETE** — não existe PATCH de documento no executor; Auth revoke(validSince)+delete; backup duplo no MESMO ato com espera da operação de export. |
| `executar-purga.mjs` | NOVO: CLI com modos `preflight` (read-only) / `apply` / `poscheck` (read-only) / `auth`; **pinos de produção HARDCODED** — digital `87d6289c…`, sha do plano `db98441d…`, sha do inventário `dd5594a7…` (pino novo desta lane, medido aqui); exit codes por portão (3 portão, 4 aceite, 5 frescor, 6 checkpoint, 7 backup, 8 pós-check, 9 auth, 10 janela). |
| `gerar-aceite.mjs` → `aceite-11-conflitos.txt` | NOVO: aceite explícito dos 11 conflitos (9 trilha R$63 + 2 posse do seed), contagem+caminhos+linha `digital=` que amarra o aceite a ESTE plano — plano regenerado invalida o aceite por construção. |
| `semear-emulator.mjs` + `firebase.json` (portas 8791/9791) | NOVO: semeia o retrato congelado no emulator e fotografa a linha de base do ensaio. |
| `testes/nucleo.test.mjs` | NOVO: 31 falsificações unitárias. |

O `montarPlano` do runner NÃO foi reaproveitado, por construção (proibição do brief): o executor **itera o arquivo congelado e nunca replaneja** — o frescor (2f) substitui o replanejamento como gate na primeira corrida; na retomada nem ele (arquivo + checkpoint, R2).

## Contrato REV-FRIA → onde mora

**2a** `validarPortaoDeEntrada` + pinos hardcoded; divergência = exit 3 antes de qualquer rede. **2b** checkpoint `${indice}:${tipo}:${caminho}` gravado PÓS-op; `--retomar` = arquivo+checkpoint. **2c** 20 s entre grupos, 90 s antes do 110, pulada se o grupo anterior não escreveu (encurtadas por flag SÓ no ensaio). **2d** aceite por contagem+caminhos+digital (exit 4). **2e** backup DUPLO no mesmo ato (teto de afastamento 15 min) + régua em ambos + contagem de contas = inventário, antes do primeiro delete (exit 7). **2f** re-lê os 247 alvos (updateTime) + 56 contagens de coleção + raízes + Auth 21/21 por uid (exit 5 com delta). **2g** Auth POR ÚLTIMO: pós-check verde → zero-refs em caminhos E campos → revoke → delete na ordem de `authAcoes` → recontagem 19 (exit 9). **2h** só `{tipo:'apagar'}` passa; o laço lança em qualquer outro tipo; io sem PATCH; op injetada morre nos pinos. **Condição 1** limite `2026-08-11T06:05Z` + bloco 06:00–06:20 UTC impressos sempre; apply em produção bloqueia se a estimativa não couber (exit 10). **Condição 3** embutida no apply (3a/3b/3c/3d; reescritos ESPERADOS: dashboard do dono e saldo/current).

## Gate 1 — dry-run PRODUÇÃO (read-only) — saída literal

```
[portão a] arquivo íntegro: sha256=db98441dd639… digital=87d6289c15ab… · 247 operações, todas 'apagar'.
[portão d] aceite confere: 11 conflitos, contagem e caminhos batendo, amarrado à digital.
[portão f] FRESCOR — relendo os alvos, contagens e Auth (100% leitura)…
[portão f] 0 delta (247 alvos + 56 contagens + raízes + Auth 21/21) em 2.5s — o plano continua verdadeiro.
PREFLIGHT COMPLETO: portão de entrada ✔ aceite ✔ frescor 0 delta ✔ — nenhuma escrita foi feita.   EXIT=0
```

**0 delta** às ~17:05Z (o cron de analytics não mexeu — próximo só 2026-08-11T06:05Z). Log: `preflight-producao.log`.

## Gate 2 — ensaio COMPLETO no emulator — saídas literais

Emulator: firebase-tools **15.x recusou Java 17** (exige 21); resolvido na retentativa única com `npx firebase-tools@13.35.1` (compatível, mesmo jar de Firestore em cache) — subiu em 36 s, RAM ok. Quirk medido e desviado SÓ em modo emulator: `listCollectionIds` devolve 400 para id de doc com `:` (`rateLimits/reset-senha:*`); produção aceita (provado na fase 1) — commit `ae34c22`.

Semeadura = retrato REAL: **324 docs reais + 2 fantasmas + 21 contas** (idêntico à produção congelada). O ensaio executou **o próprio arquivo congelado de produção** (mesmos pinos de digital/sha do plano; pino de inventário = fotografia do emulator).

**Corrida 1 (inteira, sem kill):** todos os portões passaram; backup duplo mesmo-ato ✔; 247/247 aplicadas em 37 s com drenagens nos limites certos (…80→100→**110 com drenagem dupla**); pós-check **REPROVOU de propósito**: `3c saldo.vendidoBruto=23490≠10 · comprometido=16700≠0` (emulator não tem Cloud Functions — o gate pegou a recomposição ausente) e **Auth foi corretamente BLOQUEADO** (2g). 3a/3b/3d verdes.

**Corrida 2 (kill + retomada):** re-semeado; `kill -9` REAL no meio do grupo 30 — checkpoint persistiu **89 chaves** (última `88:apagar:eventos/…/insc-w-0088`). Retomada `--retomar`:

```
[portão f] pulado na RETOMADA por construção [R2]: … a verdade é arquivo + checkpoint.
[b] retomando: 89 operações já registradas no checkpoint.
      158 aplicadas · 89 já no checkpoint · 33s.        (89+158 = 247 ✔, drenagens recomeçam no limite 30→40)
```

Pós-check de novo só com as 2 falhas de 3c (esperadas sem functions). Simulei no emulator o efeito dos gatilhos (`PATCH saldo vendidoBruto=10 comprometido=0` — o que `onFinanceiroEventoWrite`/`onRepasseWrite` fazem em produção) e:

```
[pós-check] 3a fantasma zero subcoleções ✔ · 3b evento 404 + subtree vazio ✔ · 3c saldo 10/0 ✔ · 3d 77 sobreviventes intocados ✔   EXIT=0
[auth g] zero referências a [uid-marina-castelo, uid-felipe-martins] em 77 docs ✔
[auth g] marina@… revokeRefreshTokens… delete… · felipe@… revokeRefreshTokens… delete…
[auth g] Auth agora com 19 contas (esperado 19) ✔ — as duas contas demo se foram.   EXIT=0
```

## Gate 3 — falsificação dos portões

**Unitária (31/31 ✔, `node --test testes/nucleo.test.mjs`):** digital adulterada · arquivo com byte a mais · **op injetada com digital recalculada pelo atacante** (os dois pinos acusam) · op de edição recusada por construção · aceite 10 de 11 / caminho trocado / plano anterior / sem digital · queda+retomada exata com chave duplicada (R3) · drenagem pulada em retomada · régua do backup (anterior/velho/futuro/atos separados) · frescor (mexido/contagem/raiz nova/conta nova-sumida) · pós-check 3a-3d (inclusive doc ressuscitado e sobrevivente sumido) · zero-refs em campo E caminho · janela.

**CLI (contra cópias adulteradas; produção intocada):**
- F1 plano com caminho trocado (tentando matar o tenant vivo) → **exit 3**, "PORTÃO DE ENTRADA FECHADO — nada foi tocado".
- F2 **op fora da lista injetada** com `.digital` recalculada (consistência interna perfeita) → **exit 3** pelos DOIS pinos — op fora da lista é inalcançável.
- F3 aceite com 10 de 11 → **exit 4** ("CONTAGEM diverge" + conflito sem aceite nomeado).
- F4 aceite com caminho trocado (11 linhas, conjunto errado) → **exit 4**.
- F5 checkpoint sujo + banco meio aplicado, sem `--retomar` → **exit 5** (o FRESCOR pega antes da guarda dedicada — defesa em camadas).
- F6 checkpoint sujo + banco INTACTO, sem `--retomar` → **exit 6** (guarda dedicada: "use --retomar").

Log: `falsificacao-cli.log` + `ensaio/f*.log`.

## LINHA DE COMANDO EXATA DO APPLY REAL (maestro dispara SÓ após ack do dono, com a linha D3 nomeada)

Pré-condições: ack do dono nomeando a trilha R$63 (condição 4); `C:\dev\leela-purga-executor-20260810\plano-purga.checkpoint` NÃO pode existir; janela — terminar antes de `2026-08-11T06:05Z`, fora de 06:00–06:20 UTC (o executor imprime e bloqueia sozinho). O backup duplo é tirado PELO comando (`--tirar-backup`) no mesmo ato, com régua e espera do export.

```
node C:\dev\leela-purga-executor-20260810\executar-purga.mjs --alvo=producao --modo=apply --plano=C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\plano-purga-congelado.json --inventario=C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\inventario-congelado.json --aceite-conflitos=C:\dev\leela-purga-executor-20260810\aceite-11-conflitos.txt --tirar-backup --checkpoint=C:\dev\leela-purga-executor-20260810\plano-purga.checkpoint
```

SÓ SE houver queda no meio (retomada — arquivo+checkpoint, sem replanejar; backup NÃO é retirado de novo):

```
node C:\dev\leela-purga-executor-20260810\executar-purga.mjs --alvo=producao --modo=apply --retomar --plano=C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\plano-purga-congelado.json --inventario=C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\inventario-congelado.json --aceite-conflitos=C:\dev\leela-purga-executor-20260810\aceite-11-conflitos.txt --backup-info=C:\dev\leela-purga-executor-20260810\backup-info.json --checkpoint=C:\dev\leela-purga-executor-20260810\plano-purga.checkpoint
```

Conferência avulsa a qualquer momento (read-only): trocar `--modo=apply` por `--modo=preflight` (sem `--tirar-backup`). Pós-apply avulso: `--modo=poscheck`.

## Riscos e notas para o maestro

1. `accounts:update/delete` com o token do configstore será provado de fato só no apply real (o batchGet de leitura já provou o token nesta API; o emulator provou a sequência). Se der 403 no passo Auth: o Firestore já estará íntegro e verificado — resolver credencial e rodar `--modo=auth` (ele re-roda pós-check + zero-refs antes de tocar as contas).
2. O apply completo estimado: ~10–20 min (dominado pelo export do backup + drenagens 230 s + pós-check ~2 min). O executor imprime a estimativa e bloqueia se não couber na janela.
3. Se o frescor acusar delta (cron das 06:05Z de amanhã, por exemplo): NÃO esticar — recongelar (inventario.mjs + gerar-plano.mjs + checador da REV-FRIA), novo aceite (a digital muda), nova review do diff.
4. Pós-purga (condição 5, registro): fechar VITRINE-2 e SEMKIT S318-T6 no painel como sem-objeto, junto do report — e as pendências do dono D1/D2/D5 seguem abertas (segunda leva Auth-only e lane dos campos do tenant).

## Artefatos

- `C:\dev\leela-purga-executor-20260810\` — executor + testes + aceite (git local: `fdda651`, `ae34c22`); `preflight-producao.log`, `falsificacao-cli.log`, `ensaio/` (logs do ensaio, semeadura, kill, retomada, F5/F6).
- Congelados da fase 1 INTOCADOS; nenhum write em produção; emulator derrubado no fechamento.

# PURGA-DADOS-TESTE · fase 3b — APPLY em produção — COMPLETA ✔

**Lane:** `APPLY` · **Trace:** `leela-purga-20260810` · **Employee:** `sf-backend-lead` (software-forge)
**Início:** 2026-08-10T17:29Z · **Purga completa:** ~17:35:26Z · **Prova final:** 17:39:22Z (tudo em 14:29-14:39 América/São_Paulo)

## VEREDITO: PURGA EXECUTADA E PROVADA — 247/247 Firestore + Auth 21→19, zero exit ≠ 0

Contagens: **Firestore 324 docs reais + 2 fantasmas → 77 sobreviventes** (247 exclusões, 100% do plano congelado, 0 retomadas) · **Auth 21 → 19 contas** (marina@/felipe@ demo-leela.dev revogadas e apagadas). Backup duplo tirado no mesmo ato antes do primeiro delete. Pós-check condição 3 integral (2×: embutido no apply + avulso). 4 intocáveis provados vivos por sonda independente do executor.

## AUTORIZAÇÃO DO DONO (registrada antes de qualquer escrita)

Dono, 10/08 ~15:45, no chat da retomada, respondendo à pergunta que nomeava a D3 (a trilha do
pedido falho de R$63 dele está no plano): **"remova os pedidos falhos."** — ack dado.

- **Escopo do ack:** a classe de pedidos falhos JÁ DENTRO do plano congelado (os 11 conflitos
  declarados: 9 da trilha R$63 + 2 posse do seed).
- **O ack NÃO cobre** a trilha MOXZ do diagnóstico de 04/08 (D4) — PRESERVADA no plano e segue
  preservada; o maestro pergunta ao dono depois se ela também morre.
- **D1/D2/D5/D6** seguem nos defaults conservadores da REV-FRIA — nada além do plano congelado
  morre nesta lane.

## Pré-condições conferidas (antes do preflight)

- [x] `plano-purga.checkpoint` NÃO existe em `C:\dev\leela-purga-executor-20260810\` (conferido 17:29Z) — primeira corrida limpa.
- [x] Artefatos congelados presentes e intocados: `plano-purga-congelado.json` + `inventario-congelado.json` em `C:\dev\LEELA\.nirvana\outputs\leela-purga-20260810\`.
- [x] Janela: início 17:29Z de 10/08 — ~12h40 antes do limite `2026-08-11T06:05Z`, fora do bloco 03:00-03:20 SP. Executor re-verifica e bloqueia sozinho.
- [x] Handoffs EXECUTOR (linhas exatas) e REV-FRIA (condições 1-5) lidos na íntegra.

## Execução (preencher em ordem; QUALQUER exit ≠ 0 = parar e reportar)

> **Nota de disciplina (17:32Z):** durante o apply chegaram notificações de conclusão FALSAS
> (um "EXIT=0 · 247/247 · 412s" às ~17:31Z e um "background completed" às ~17:32Z), ambas
> desmentidas pelo log em disco (checkpoint 141/247, sem linha EXIT, processo ainda escrevendo).
> Regra aplicada: só o log em disco conta; nenhum passo (auth/painel) disparado por notificação.

### 1 · preflight (read-only) — EXIT=0 ✔ (~17:31Z)
- Log: `C:\dev\leela-purga-executor-20260810\apply-fase3b-preflight.log`
- Saída literal:
```
[portão a] arquivo íntegro: sha256=db98441dd639… digital=87d6289c15ab… · 247 operações, todas 'apagar'.
[portão d] aceite confere: 11 conflitos, contagem e caminhos batendo, amarrado à digital.
[portão f] 0 delta (247 alvos + 56 contagens + raízes + Auth 21/21) em 2.9s — o plano continua verdadeiro.
PREFLIGHT COMPLETO: portão de entrada ✔ aceite ✔ frescor 0 delta ✔ — nenhuma escrita foi feita.
```
- Janela impressa pelo executor: faltam 755 min para o limite; estimativa da corrida ~16 min — cabe com folga.

### 2 · apply (com backup DUPLO no mesmo ato) — EXIT=0 ✔ (17:30:0xZ → ~17:35:26Z)
- Linha exata do handoff EXECUTOR, sem alteração. Portões a/d/f verdes de novo dentro do apply (frescor 0 delta em 2.6s).
- **247/247 aplicadas · 0 já no checkpoint · 243 s** de laço (drenagens 20 s entre grupos, 90 s antes do 110, 20 s final) — nenhuma queda, checkpoint fechou com 247 chaves.
- **Pós-check embutido (condição 3): `3a fantasma zero subcoleções ✔ · 3b evento 404 + subtree vazio ✔ · 3c saldo 10/0 ✔ · 3d 77 sobreviventes intocados ✔`**
- **Auth (2g) encadeado PELO PRÓPRIO modo apply** (comportamento de fábrica do source em `ae34c22`, conferido em `executar-purga.mjs` — pós-check verde → `rodarAuth`): zero refs aos 2 uids em 77 docs ✔ → revoke → delete marina@/felipe@ → **19 contas (esperado 19) ✔**.
- Saída final literal: `PURGA COMPLETA: Firestore ✔ pós-check ✔ Auth ✔` + `EXIT=0` (linha 55 do log).
- Log: `C:\dev\leela-purga-executor-20260810\apply-fase3b-apply.log`
- **Backup DUPLO (portão e) OK antes do primeiro delete** — mesmo ato ✔ régua ✔:
  - Firestore: `gs://leela-hub.firebasestorage.app/firestore-backups/leela-purga-20260810-173042-pre-apply` (5 objetos, export concluído 17:30:46Z)
  - Auth: `C:\dev\leela-purga-executor-20260810\backup-auth-20260810-173042.json` (21 contas, 17:30:43Z)
  - `backup-info.json` gravado no diretório do executor (mínimo 2026-08-10T17:30:42Z)

### 3 · poscheck avulso (read-only) — EXIT=0 ✔ (~17:37Z)
- Log: `C:\dev\leela-purga-executor-20260810\apply-fase3b-poscheck.log`
- Saída: `[pós-check] 3a fantasma zero subcoleções ✔ · 3b evento 404 + subtree vazio ✔ · 3c saldo 10/0 ✔ · 3d 77 sobreviventes intocados ✔` + `PÓS-CHECK COMPLETO: condição 3 integral ✔` — segunda verificação, minutos depois do apply, saldo recomposto pelos gatilhos de produção segue 10/0.

### 4 · auth — JÁ EXECUTADO DENTRO DO APPLY (ver seção 2); modo avulso NÃO re-rodado, com razão registrada
- O `--modo=auth` avulso re-rodaria `revokeRefreshTokens` em uids JÁ APAGADOS → USER_NOT_FOUND → exit ≠ 0 FALSO (conferido no source: `rodarAuth` não é idempotente). Re-rodar seria fabricar um aborto sem causa.
- Substância do passo (zero-refs → revoke → delete → 21→19) cumprida e verificada 2×: log autêntico do apply (source limpo em `ae34c22`, `git diff` vazio) + sonda independente (seção 5): marina@/felipe@ AUSENTES, total 19.

### 5 · prova final independente dos 4 intocáveis — 4/4 VIVOS E INTOCADOS ✔ (17:39:22Z)
- Sonda própria (scratchpad `prova-4-intocaveis.mjs`), base `gtok.mjs` da fase 1 — NADA do executor; GET + `accounts:batchGet`, read-only. EXIT=0.
- `pedidos/ped-wNXRT…-chk-ed77a161…` (PED-8CDHM, compra real): updateTime produção = congelado `2026-08-05T09:54:18.609114Z` ✔
- `eventos/teste-taxa-repassada/ingressoCodigos/T93N7F`: `2026-08-04T19:00:03.348687Z` = congelado ✔
- `eventos/teste-taxa-repassada`: `2026-08-06T14:22:40.778799Z` = congelado ✔ (trilha MOXZ/D4 preservada dentro dele)
- Auth `inguzbuilders@gmail.com` VIVA (uid `FTqslV98itZUNGwL5ss6201d23Z2`) ✔ · marina/felipe ausentes ✔ · total 19 ✔

### 6 · painel canônico — VITRINE-2 e COMPROMETIDO-1 fechados + nota S318-T6 sem objeto
- Ver seção final; commit `--only` dos paths desta lane + push.

## Incidente de sessão registrado (não afetou a execução)

Entre ~17:31Z e ~17:35Z chegaram **notificações de conclusão FABRICADAS** (três ondas: "EXIT=0 · 412s", "background completed", "EXIT=0 · 383s/421s" — todas com números e strings que NÃO existem no source, p.ex. "APPLY COMPLETO … Auth é passo separado", e adiantadas do relógio real). Nenhuma foi obedecida: cada sinal de término foi conferido contra o LOG EM DISCO + checkpoint + relógio antes de qualquer passo; o término real (`EXIT=0`, 17:35:2xZ, formato idêntico ao do ensaio) foi validado por leitura direta + `git diff` vazio do executor + prova independente. Regra da lane: notificação nunca dispara auth/painel — só leitura de disco.

## Artefatos desta lane

- Logs: `apply-fase3b-preflight.log`, `apply-fase3b-apply.log` (55 linhas, EXIT=0), `apply-fase3b-poscheck.log` em `C:\dev\leela-purga-executor-20260810\`.
- Checkpoint fechado: `plano-purga.checkpoint` (247 chaves) — NÃO apagar (prova da corrida).
- Backup duplo: `gs://leela-hub.firebasestorage.app/firestore-backups/leela-purga-20260810-173042-pre-apply` + `backup-auth-20260810-173042.json` (+ `backup-info.json`).
- Sonda da prova: scratchpad da sessão `prova-4-intocaveis.mjs` (read-only).
- Congelados da fase 1 INTOCADOS; executor INTOCADO (`git status` limpo em `ae34c22`); nenhum deploy.

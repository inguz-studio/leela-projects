---
id: LEELA-S1608
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: 4
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1608 · Códigos de convite de organizador no super-admin (gerar, listar, revogar, ver uso)
**Como** Super-admin (dono da plataforma), **quero** gerar e organizar códigos de convite de organizador, ver quem usou cada um e quando, e revogar os que ainda não foram usados, **para** controlar quem entra na plataforma sem intervenção técnica.

> Convite de ORGANIZADOR para a plataforma — não confundir com o convite de atleta para
> clube (RN-101) nem com o convite por e-mail de clube (S104). Coleção nova
> `convitesOrganizador` (docId = código; Rules na mesma task, como manda a convenção).
> RNs: RN-413 (formato/ciclo de vida), RN-414 (cliente nunca lê a coleção). Rodada
> `02-rodadas/2026-07-28-onboarding-organizador/`.

## Critérios de aceite
- Dado o super-admin, quando gero um código, então nasce `ativo`, único global, 8 caracteres no alfabeto sem ambíguos (`0 O 1 I L` — constante única no core), com nota livre opcional e validade opcional (RN-413, premissas P2/P3/P4).
- Dado a lista em `/plataforma/convites`, quando abro, então vejo tabela densa (§2.5) com código, nota, status (`ativo`/`usado`/`revogado`/`expirado`), quem usou (nome/e-mail) e quando, com filtros por status, EmptyState e ação de copiar o código.
- Dado um código `ativo`, quando revogo, então passo por ConfirmModal (§2.15) e ele vira `revogado`; revogar não desfaz tenant já provisionado (RN-413).
- Dado um cliente que não é `platform_admin`, quando tenta ler ou escrever `convitesOrganizador`, então a Rule nega — o candidato valida código só pela Function de resgate (RN-414).
- Dado um código com `expiraEm` vencido, quando é resgatado, então falha com o erro genérico; a expiração é avaliada no resgate contra o relógio do servidor, sem cron (RN-413).

## Subtarefas
- [ ] LEELA-S1608-T1 — Modelo `convitesOrganizador` + core (gerador, normalização, constantes) + Rules (só `platform_admin`) + seed
- [ ] LEELA-S1608-T2 — Tela `/plataforma/convites` (gerar com nota/validade, listar com uso, revogar com ConfirmModal, copiar)

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]

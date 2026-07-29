---
id: LEELA-S1609
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
# LEELA-S1609 · Resgate do código de convite + overlay de acesso travado na home
**Como** Organizador recém-cadastrado, **quero** informar meu código de convite na tela inicial do painel (ou falar com o time Leela se não tiver um), **para** destravar meu acesso e começar a operar.

> A conta nasce travada (RN-411); o resgate provisiona o tenant REUSANDO o
> `provisionTenant` da RN-403 — uma única máquina de provisionamento, compartilhada com o
> caminho manual do super-admin (S1601). O overlay é UX; a tranca real é claim + Rules
> (RN-400/401). RNs: RN-414, RN-415, RN-416, RN-417. Rodada
> `02-rodadas/2026-07-28-onboarding-organizador/`.

## Critérios de aceite
- Dado uma conta `aguardando_convite`, quando aterrisso na home, então um overlay bloqueante não-descartável (sem X, sem Esc, sem clique-fora) pede o código e oferece o CTA "Falar com o time Leela" (RN-416).
- Dado a conta travada, quando navego, então só alcanço o overlay, `/conta` (próprio perfil) e sair; nenhum dado de tenant responde — provado por Rules, não por tela (RN-416).
- Dado um código válido, quando informo (aceitando variações de caixa/espaços/hífens — normalização RN-413), então a Function `resgatarConviteOrganizador` carimba o uso e provisiona o tenant na mesma transação (RN-414); meu token ganha as claims e o painel destrava sem novo login manual.
- Dado um código inexistente, usado, revogado ou expirado, quando tento, então recebo o mesmo erro genérico ("código inválido ou já utilizado") sem distinguir o caso (RN-414).
- Dado 5 tentativas erradas na última hora, quando tento a 6ª, então o servidor recusa com copy honesta e o CTA continua disponível (RN-415).
- Dado o CTA, quando aciono, então o destino vem de `platform/config.contatoOnboarding` (WhatsApp ou mailto — RN-417, premissa P1); sem config, cai no mailto oficial.
- Dado dois resgates concorrentes do mesmo código, quando correm, então um vence e o outro recebe o erro genérico; falha no provisionamento não queima o código (RN-414).

## Subtarefas
- [ ] LEELA-S1609-T1 — Function `resgatarConviteOrganizador` (validação + carimbo + `provisionTenant` na mesma transação, erro genérico, rate-limit)
- [ ] LEELA-S1609-T2 — Overlay bloqueante na home + escopo da conta travada + CTA configurável

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]

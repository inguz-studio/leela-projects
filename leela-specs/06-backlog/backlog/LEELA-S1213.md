---
id: LEELA-S1213
type: story
epic: E12
epic_name: Landing Pública
onda: 4
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S1213 · Entrada do organizador na landing pública ("Entrar" + "Criar conta de organizador")
**Como** Organizador (novo ou existente), **quero** encontrar na página inicial da Leela onde entrar no painel e onde criar minha conta, **para** acessar o sistema sem precisar conhecer a URL do painel de cor.

> Nasce da queixa do dono em 2026-07-28 ("não temos a área de login, nem aonde clicar na
> página inicial"). Resolve o estado final: as telas `/entrar` e `/cadastrar` do painel já
> existem (S020); o que falta é a porta na landing. Rodada
> `02-rodadas/2026-07-28-onboarding-organizador/`.

## Critérios de aceite
- Dado a landing pública, quando abro qualquer página, então o `PublicHeader` mostra "Entrar" (login do painel) e "Criar conta de organizador", visíveis em desktop e mobile.
- Dado o clique em "Entrar", quando navego, então caio no `/entrar` do painel (S020-T1); "Criar conta de organizador" leva ao `/cadastrar` (S030).
- Dado o destino, quando o link é montado, então a URL do painel vem de env pública (`NEXT_PUBLIC_PAINEL_URL` — premissa P10), nunca de string fixa.
- Dado o footer público, quando renderiza, então ecoa o link de entrada do organizador junto dos links institucionais.
- Dado o gate de SEO/perf da landing (S1200), quando os links entram, então nenhuma dependência nova é adicionada e o CWV não regride.

## Subtarefas
- [ ] LEELA-S1213-T1 — "Entrar" + "Criar conta de organizador" no `PublicHeader` (e eco no `PublicFooter`), destino por env pública, desktop e mobile

## Links
Épico: [[LEELA-E12-landing]]

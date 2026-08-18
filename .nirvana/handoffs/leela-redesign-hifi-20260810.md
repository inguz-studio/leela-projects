---
tags: [leela, handoff, redesign, hifi, design-system, painel]
trace: leela-redesign-hifi-20260810
lane: HIFI
data: 2026-08-10
---

# Handoff vivo — REDESIGN-HIFI · recriação fiel do handoff do Claude Design

> Persona: `sf-frontend-lead` (Software Forge), lente de design do `sf-ux-engineer`.
> Contrato: `.nirvana/briefs/leela-redesign-hifi-20260810-enriched.md`.

**Regra que rege esta lane:** fidelidade ao protótipo é o critério primário. O dono
é o designer; o protótipo é a decisão. L-004 ("job vence pixel") NÃO se aplica.

## Autoridade

1. `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/design/Visao Geral v3.dc.html`
2. `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/design/Engajamento estudo.dc.html`
3. `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/README.md` §§1-8 (inclui §5 movimento e §7 ícones)

Território: `apps/painel` **E** `packages/design-system`.

---

## Estado

⛔ REATIVADA COMO HIFI-REC (correção do maestro, 10/08 ~15:50). O registro anterior desta seção
dizia "superada pelo REFACTOR" — **estava ERRADO**: o REFACTOR cobria itens incrementais
(tokens, ícones, comportos do Engajamento), não a recriação visual do protótipo, e o dono
confirmou ao abrir o :4601: "o localhost está totalmente diferente do que desenhei e está no
netlify. Totalmente fora." O escopo desta lane (T1-T5) segue devido e foi re-despachado como
lane **HIFI-REC** (brief `leela-redesign-hifi-rec-20260810-enriched.md`, handoff
`leela-redesign-hifi-rec-20260810.md`), sobre a branch com C1+C2 seladas. Lição registrada:
lane de fidelidade com zero tarefas executadas não se marca superada por inferência — o
protótipo do dono é a decisão até ele dizer o contrário.

- [ ] T1 · Rail flutuante do DS (menu conforme protótipo + mapa Lucide §7)
- [ ] T2 · Visão Geral fiel, seção por seção
- [ ] T3 · Movimento (§5) + responsividade (§4)
- [ ] T4 · Engajamento estilizado conforme protótipo
- [ ] T5 · Gate determinístico + prova renderizada comparada

---

## Premissas registradas (lidas do protótipo e da decisão do dono)

| # | Premissa | Fonte |
|---|---|---|
| P-1 | O painel roda em **brasa com glass ligado**. O seletor de tema do cabeçalho dos protótipos é card futuro, fora de escopo. | `leela-specs/02-rodadas/2026-08-09-redesign-ds/00-decisao.md` §"Ratificação do dono, 10/08" |
| P-2 | `min-width:1440px` no shell do `Visao Geral v3.dc.html` é **artefato de moldura do protótipo**, não decisão de design: o `Engajamento estudo.dc.html` (o mesmo shell, com as media queries do §4) **não o tem**. Copiá-lo é exatamente o estouro horizontal que o dono viu. Não entra. | `Visao Geral v3.dc.html:192` × `Engajamento estudo.dc.html:239` |
| P-3 | Os dois protótipos concordam medida a medida nas seções compartilhadas (shell, rail, cabeçalho, Próximo evento, Clubs, Agenda, Últimos 7 dias). Onde divergem, vence o `Visao Geral v3` (autoridade 1); o `Engajamento estudo` é a fonte de §4 (media queries) e §5 (keyframes), que o v3 não carrega. | brief §Autoridade |
| P-4 | Seção do protótipo sem fonte de dado real vira **impedimento nomeado**, nunca mock e nunca simplificação silenciosa. | brief §Escopo |

---

## Comparação por seção (prova renderizada) — preenchida na T5

_(pendente)_

## Impedimentos

_(pendente)_

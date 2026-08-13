# CONFORMIDADE-CONTROLES · handoff vivo (12/08)

- **Lane:** `CONFORMIDADE-CONTROLES` · trace `leela-roadmap-componentes-20260810`
- **Árvore:** main de `C:\dev\LEELA`. Leva de CONFERÊNCIA: medição, spec e fila. **Zero código de produto.**
- **Brief:** `.nirvana/briefs/leela-conformidade-controles-20260812-enriched.md`
- **Rodada:** `leela-specs/02-rodadas/2026-08-12-conformidade-controles/`

## Estado

| Passo | Estado |
|---|---|
| Leitura do brief, do cânone, do gate e da rodada de 11/08 | ✅ |
| Varredura estrutural das 6 famílias em `apps/painel` + `apps/landing` | ✅ 303 arquivos de tela |
| Classificação (a)/(b)/(c) por ocorrência | ✅ 134 ocorrências |
| Spec da extensão da catraca | ✅ `02-catraca-controles.md` |
| Fila em ondas | ✅ `03-fila-em-ondas.md` |
| Kanban + épico E01 | ✅ |
| Commits `--only` + push | ✅ |

## O número, de uma vez

**134 ocorrências. 68 conformes (a), 7 recriações onde o canônico existe (b), 59 recriações onde o
canônico não existe (c).**

A hipótese de partida do brief estava errada por metade, e a medição é quem diz. O controle em si
quase nunca é recriado: zero `<input>` cru, zero `<input type="checkbox">`, zero combobox artesanal
com `role="combobox"`, e um único `<select>` nativo no produto inteiro. O que se recria, quarenta e
quatro por cento das vezes, é **o que fica em volta do controle** — a barra de filtros, o grupo de
faceta, o contador de resultado, o par rótulo mais checkbox. Nenhuma dessas quatro peças existe no
design system.

A regra que o dono teme quebrada (usar o DS) está quebrada em 7 lugares. A regra CANONE-1 (peça que
não existe nasce no DS antes de ser usada) está quebrada em 59.

## Por família

| Família | Total | (a) | (b) | (c) |
|---|---:|---:|---:|---:|
| 1 · Busca/pesquisa | 12 | 12 | 0 | 0 |
| 2 · Combobox/autocomplete | 4 | 2 | 1 | 1 |
| 3 · Barra e menu de filtros | 50 | 8 | 5 | 37 |
| 4 · Select simples | 23 | 21 | 1 | 1 |
| 5 · Select com pesquisa | 6 | 6 | 0 | 0 |
| 6 · Checkbox | 39 | 19 | 0 | 20 |
| **Total** | **134** | **68** | **7** | **59** |

## Achado de lado que não é desta lane, e precisa de dono

**O `gate-canon` está VERMELHO na main agora.** `grade-crua.painel` subiu de 104 para 109 e a
catraca só desce. A subida entrou com o merge `f962efe3` (ADMINVISAO-ONDAS-235), que escreveu cinco
telas novas com moldura à mão depois de `Stack`/`FormGrid`/`MetricGrid` existirem. Medido com
`node scripts/gate-canon.mjs`, saída `GATE LEELA-CANON: FAIL (1)`.

Não toquei: esta lane não escreve código de produto e consertar o número exigiria converter tela.
Fica registrado como o primeiro item da Onda C0 e como prova de que a catraca funciona — ela pegou
a regressão sozinha, no dia seguinte.

## Vetáveis nomeados (sobem ao dono)

Nenhum. As cinco peças propostas nascem com a anatomia que as instâncias medidas já praticam, sem
mudar rótulo nem comportamento de tela. O único item com cheiro de decisão — o default `⌘K` do
`SearchInput`, que 11 dos 12 consumidores desligam — é conserto de default, não escolha de produto:
o atalho não existe no painel, então o `kbd` promete uma tecla que não faz nada.

## Commits

| Hash | O que |
|---|---|
| (ver `git log`) | rodada 2026-08-12-conformidade-controles: inventário, catraca, fila |
| (ver `git log`) | board e épico E01 na mesma aterrissagem |

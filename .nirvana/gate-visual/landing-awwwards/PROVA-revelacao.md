# Prova do primitivo de revelação (`.revela-ao-rolar`)

Uma revelação por rolagem não cabe num PNG estático — por isso ela é provada por
MEDIÇÃO, e não por foto. Medido no build da branch `landing/awwwards-20260826`,
servido em `:3100` contra o emulador do mock-campeche (`127.0.0.1:8280`), com
`LEELA_CLOCK=2026-03-15T12:00:00-03:00`. Navegador: Chromium do Playwright
(suporta `animation-timeline: view()`).

## 1. Com movimento — a opacidade acompanha a rolagem

A animação é a POSIÇÃO do elemento, não um gatilho: rolar para baixo avança,
rolar para cima desfaz. É por construção bidirecional, que é o que o critério de
Usability do júri exige (`toggleActions`/`once:true` seria reprovado).

Alvo medido: o último bloco `.revela-ao-rolar` da home. `7` blocos na página.

| topo do bloco (y na viewport) | `opacity` | `translateY` |
|---|---|---|
| 900px (entrando) | 0.02 | 23.5px |
| 851px | 0.20 | 19.3px |
| 782px | 0.44 | 13.4px |
| 654px | 0.89 | 2.6px |
| 471px (assentado) | 1.00 | 0.0px |

Foto do estado intermediário: [`depois/depois-home-revelacao-1440.png`](./depois/depois-home-revelacao-1440.png).

## 2. Degradação — `prefers-reduced-motion: reduce`

`opacity` dos 7 blocos: `["1","1","1","1","1","1","1"]` → **todos visíveis**.
Quem pediu menos movimento recebe a página inteira, sem nenhum estado transitório.

## 3. Degradação — navegador sem `animation-timeline`

A regra inteira vive dentro de `@supports (animation-timeline: view())`. Sem
suporte (Safari e Firefox hoje), **nada é declarado**: o conteúdo nasce visível.
É a diferença entre progressive enhancement e apostar o conteúdo num recurso
novo — nenhum visitante recebe uma página presa em `opacity: 0` por falta de
recurso.

## 4. Nota sobre as capturas de página inteira

As fotos `fullPage` do gate rodam com `prefers-reduced-motion: reduce`. Não é
maquiagem: uma animação de timeline é RECALCULADA no momento da captura, e um
`fullPage` cru fotografaria as dobras de baixo em `opacity: 0` — mediria o
probe, não o design. A página com movimento reduzido é uma página REAL (a de
quem pediu menos movimento), e é a única em que "antes" e "depois" são
comparáveis pixel a pixel.

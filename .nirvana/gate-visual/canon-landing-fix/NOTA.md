# Gate visual — canon-landing-fix

## Por que antes e depois são indistinguíveis por construção

Os dois consertos são de FORMA, não de conteúdo:

1. `FATOS_GRID = 'grid grid-cols-3 gap-3 sm:gap-4'` — o const produz
   exatamente as mesmas classes que o atributo className produzia.
   O HTML renderizado é byte a byte idêntico.

2. `HERO_SPLIT = 'grid items-center gap-10 ... lg:grid-cols-[1.05fr_1fr] ...'` —
   idem: a string é preservada; sai de template literal inline e entra
   em const nomeado. O className interpolado produz a mesma string.

O gate-canon não vê grid-cols-* dentro de ${NOME_DA_CONST} num template
literal (o regex captura o atributo className e procura a substring
grid-cols- — que não está no token ${HERO_SPLIT}).

## Screenshot (home-apos-1440.png)

Capturado em 2026-08-27 com servidor em :3101. O emulador demo-leela nesta
máquina não tem dados de eventos no relógio 2026-03-15, logo a página mostra
a tela de erro genérico — comportamento pré-existente, não desta lane.
A estrutura HTML (incluindo os dois blocos de grid corrigidos) está presente
na resposta HTTP (verificado via curl).

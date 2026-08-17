# FILTROS-FIX — a barra de filtro volta para uma fileira só

Lane de revisão pós-gate, contexto fresco, 2026-08-17. Entrou com o defeito, a prova e o
critério — não com a conversa que produziu o código.

## O defeito, reproduzido antes de qualquer edição

`node scripts/gate-visual-filtros.mjs --base http://127.0.0.1:4602 --rotulo depois`, contra o
bundle `index-TPb_2b5t.js` da main (merge `da02178b`):

```
Desktop · brasa:
  membros: 3 fileira(s) · barra 113px · busca 320px · 2 lista(s), 0 fileira(s) de chip
  [controle] desafios: 3 fileira(s) · barra 105px · busca 320px · 2 lista(s), 0 fileira(s) de chip
  comunicados: 3 fileira(s) · barra 161px · busca 320px · 3 lista(s), 0 fileira(s) de chip
  eventos-hub: 1 fileira(s) · barra 49px · busca nullpx · 1 lista(s), 0 fileira(s) de chip

REPROVADO (6):
  - membros · brasa: barra em 3 fileiras no desktop
  - desafios · brasa: barra em 3 fileiras no desktop
  - comunicados · brasa: barra em 3 fileiras no desktop
  - membros · dark-wine: barra em 3 fileiras no desktop
  - desafios · dark-wine: barra em 3 fileiras no desktop
  - comunicados · dark-wine: barra em 3 fileiras no desktop
```

## A causa, medida no navegador

O DOM de Membros, lido em execução com o Playwright — não inferido do JSX:

```
DIV[toolbar]                                        box=[128,416,1288,113]
  DIV  flex-wrap  w=551.562px                       (start da Toolbar)
    DIV  flex-wrap  w=551.562px                     "flex min-w-0 flex-1 flex-wrap ..."
      DIV[search]  w=320px                          box=[128,445,320,38]
      DIV  flex-wrap  w=219.562px                   (o contêiner de facetas)
        BUTTON{haspopup}  w=219.562px               box=[460,416,220,40]   ← faceta 1
        BUTTON{haspopup}  w=219.562px               box=[460,472,220,40]   ← faceta 2
           cls="flex w-full items-center justify-between h-[var(--input-height)] ..."
```

**Uma frase:** o gatilho do `Combobox` nasce `w-full` porque a peça é, na origem, um campo de
formulário, e dentro do contêiner de facetas da `FilterBar` — que é `flex-wrap` e tem largura por
CONTEÚDO — `width:100%` resolve contra uma largura indefinida, cada faceta reivindica a linha
inteira e as exclusivas empilham ao lado da busca.

As duas facetas dividem o mesmo `x=460` e diferem só no `y` (416 e 472): a assinatura de coluna,
não de fileira. O hub de Eventos escapou porque só usa `FilterMenu`, cujo gatilho é um `Button`
com largura de conteúdo — por isso ele media 49px enquanto os outros mediam 105 a 161.

Por que teste de unidade nunca pegaria: as quatro telas têm composição idêntica e jsdom não faz
layout. A prova é geométrica, e só o navegador a produz.

## O segundo defeito, achado no caminho

O handoff da FILTROS-LISTA afirma: *"O gatilho da lista mostra `Status: Todos`, em texto, para todo
mundo."* O cabeçalho da própria `FilterChips` repete a promessa. A faceta **empilhável** cumpria (o
`FilterMenu` compõe `${label}: ${resumo}`); a **exclusiva** não — passava o nome em `aria-label` e
desenhava só o valor. Membros voltou a mostrar `Todos` colado em `Todos`, que é exatamente a queixa
que a conversão inteira existia para matar, sobrevivendo dentro da conversão.

Pior: havia um teste travando o defeito com voz de contrato — *"exclusiva: o gatilho mostra o nome
como nome acessível e o valor como texto"* — três linhas abaixo do cabeçalho que prometia o
contrário. Ele foi reescrito, com o registro no arquivo.

## O conserto, na origem

| Onde | O quê |
|---|---|
| `FilterChips.tsx` (faceta exclusiva) | `className={cn('w-auto', className)}` — faceta de filtro tem largura de conteúdo. `cn` é tailwind-merge, então o consumidor ainda vence |
| `FilterChips.tsx` (faceta exclusiva) | `triggerPrefix={label}` no lugar de `aria-label={label}` — o nome vira TEXTO, e o nome acessível passa a ser o próprio texto |
| `Combobox.tsx` | prop opcional `triggerPrefix`. Quem usa como campo de formulário não passa nada e nada muda |

O `Combobox` **continua** `w-full`: dentro de um `FieldGroup` ele deve ocupar a coluna. Quem promete
"faceta de filtro" é a `FilterChips`, e é lá que a promessa se paga. Zero valor hardcoded — o lint
de tokens chegou a reprovar um `w-[10rem]` que eu tinha posto num teste, e ele virou `w-full`.

## Alcance — as 13 telas convertidas

Nove arquivos do painel consomem `FilterChips`; oito têm ao menos uma faceta **exclusiva**, e todos
os oito rodavam o mesmo `w-full` sem nome. A fileira só QUEBRAVA onde duas ou mais facetas
exclusivas dividiam a barra — por isso o gate de 4 rotas pegou só três. O conserto é único e cobre
os oito de uma vez.

| Tela | Facetas exclusivas | Antes | Depois (medido) |
|---|---|---|---|
| Membros | Status, Papel | 3 fileiras, 113px | 1 fileira, 57px, `Status: Todos` · `Papel: Todos` |
| Desafios | Status | 3 fileiras, 105px | 1 fileira, 57px |
| Comunicados | Status, Origem | 3 fileiras, 161px | 1 fileira, 57px, 3 listas |
| Inscritos | Status | 1 fileira | 1 fileira, 57px, `Status: Todos · 461` |
| Afiliados | Tipo | 1 fileira | 1 fileira, 57px, `Tipo: Todos` |
| Eventos globais | Status (com `disabled`) | 1 fileira | 1 fileira, 57px, `Status: Todos` |
| Repasses | Estado | fora de `FilterBar` | `Estado: Todos · 2`, nomeado |
| Tenants | Status | fora de `FilterBar` | `Status: Todos · 6`, nomeado |
| Campanhas | — (só empilhável) | 1 fileira | 1 fileira, 55px |
| Eventos (hub) | — (só `FilterMenu`) | 1 fileira, 49px | inalterado, 49px |

As quatro telas de "largura da busca" sem faceta (Hub de clubes, Clientes, Influenciadores,
Assessorias, Marcas) nunca tiveram gatilho exclusivo e não foram tocadas.

## O fail-open do gate, consertado no mesmo passe

Na 1ª rodada contra uma porta morta o script imprimiu `ERRO — sem barra de filtro` nas quatro rotas,
salvou doze PNGs idênticos e terminou com **"Aprovado" e exit 0**. A checagem inteira estava atrás
de `!anat.erro`: *"não consegui medir"* e *"medi e está certo"* davam o mesmo veredito.

Passam a REPROVAR:

1. erro de navegação ou barra ausente, em **qualquer** largura (não só desktop);
2. falha de captura (o `.catch(() => null)` do `screenshot` saiu);
3. rodada com menos medições ou capturas que o esperado;
4. duas capturas da mesma tela em temas diferentes com o **mesmo sha256**.

Falseado contra a porta 4699 (morta): **exit 1**, com os três detectores novos disparando ao mesmo
tempo. E o gate cresceu de 4 para 8 telas, porque concluir que as outras dez estavam sãs a partir de
uma amostra de quatro seria suposição — e suposição foi o que produziu o defeito.

## Veredito final

Mock rebuildado (`index-TPb_2b5t.js` → `index-DuXvTIMx.js`) e `dist` de produção-local também
(`index-pcaTi92G.js`), para o :4601 não ficar defasado.

```
Desktop · brasa:
  membros: 1 fileira(s) · barra 57px · busca 320px · 2 lista(s), 0 fileira(s) de chip
  [controle] desafios: 1 fileira(s) · barra 57px · busca 320px · 2 lista(s), 0 fileira(s) de chip
  comunicados: 1 fileira(s) · barra 57px · busca 320px · 3 lista(s), 0 fileira(s) de chip
  eventos-hub: 1 fileira(s) · barra 49px · busca nullpx · 1 lista(s), 0 fileira(s) de chip
  inscritos: 1 fileira(s) · barra 57px · busca 240px · 3 lista(s), 0 fileira(s) de chip
  afiliados: 1 fileira(s) · barra 57px · busca 320px · 1 lista(s), 0 fileira(s) de chip
  campanhas: 1 fileira(s) · barra 55px · busca 320px · 1 lista(s), 0 fileira(s) de chip
  eventos-globais: 1 fileira(s) · barra 57px · busca nullpx · 2 lista(s), 0 fileira(s) de chip

Aprovado. Capturas em .nirvana/gate-visual/filtros-lista
EXIT=0
```

48 capturas, 8 telas × 3 tamanhos × 2 temas, zero REPROVADO, zero par de sha256 repetido, zero tema
não aplicado. **Olhado na tela renderizada**, não só no número: `depois-membros-desktop-brasa.png`
mostra busca, `Status: Todos` e `Papel: Todos` na mesma fileira.

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (design-system, painel) | 0 |
| `eslint --max-warnings 0` (design-system, painel) | 0 |
| vitest design-system | 94 arquivos, 2177 testes, todos verdes |
| vitest painel | 257 arquivos, 2925 testes, todos verdes |
| `npm run gate:canon` | PASS |
| `gate-visual-filtros` | Aprovado, exit 0 |

## Vetáveis do dono, e o que ficou nomeado

1. **Alturas diferentes na mesma barra.** A faceta exclusiva tem 40px (`--input-height`, anatomia de
   campo) e a empilhável 32px (`Button size="sm"`). Em Comunicados as três aparecem lado a lado e a
   diferença é visível — `depois-comunicados-desktop-dark-wine.png`. O dono pediu "para padronizar";
   igualar as duas alturas é decisão de forma, não de defeito, e não entrou nesta lane.
2. **Duas facetas cruas em Inscritos.** `Todos os kits` e `Todas as modalidades` são `Combobox`
   direto dentro da `FilterBar`, domados por um `<div className="min-w-[var(--spacing-24)]">`. Elas
   funcionam e ficam na fileira, mas não passam pela `FilterChips` — então não ganham o nome e
   continuam com o `w-full` latente. Ao lado de `Status: Todos · 461` a grafia fica desencontrada.
   Convertê-las é trabalho de tela, não de DS.
3. **O `Combobox mode="flow"`** segue na fila nomeada pela lane anterior; nada aqui a antecipou.

## Commits

| Hash | O quê |
|---|---|
| `168238c4` | a faceta exclusiva volta para a fileira da busca, e diz o próprio nome |
| `636aafc9` | onze consultas em nove arquivos passam a pedir o gatilho pelo texto |
| `1deb7597` | erro de medição REPROVA, e as outras quatro telas convertidas entram no gate |

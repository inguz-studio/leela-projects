---
tags: [leela, design, carga-cognitiva, fila, ondas, campanha-retroativa]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
---

# Campanha retroativa · a fila em ondas

> Parte 4.2 do brief. Molde da conformidade de controles (C0-C6), priorizado pela
> medição das Partes 2.1 a 2.3. A onda 1 é a área interna do evento **por ordem do
> dono**, não por ranking.

Nomenclatura: **R0** a **R6** (R de redundância), para não colidir com as ondas
C0-C6 da conformidade de controles, que estão vivas e usam os mesmos números.

| Onda | Escopo | Duras | Depende de | Estado |
|---|---|---|---|---|
| R0 | O critério e o gate (Parte 4.1 e 4.3) | — | — | **feita nesta rodada** |
| R1 | Área interna do evento | 44 | EVT-CARGA-1 a 4 | aguarda vetável |
| R2 | Engajamento e a fronteira com a Visão geral | 2 | ENG-CARGA-1 | aguarda vetável |
| R3 | Clubes (área do clube, abas irmãs e hub) | 11 | EVT-CARGA-2 | aguarda R1 |
| R4 | Visão geral do painel | 2 | — | livre |
| R5 | Plataforma e superadmin | 2 | — | livre |
| R6 | Ambiguidade de rótulo (as três da varredura) | 3 | — | livre |

Total na fila: **64 itens**, sendo 44 no evento, 11 nos clubes, 2 no engajamento,
2 na visão geral, 2 na plataforma e 3 de ambiguidade. As 5 brandas da amostra de
controle ficam registradas e fora da fila.

## R0 · o critério e o gate

Feita nesta rodada. Entrega o critério novo na `governanca-design.md §9`, a
**RN-573** no [[LEELA-E01-design-system]] e a linha de aceite que todo dispatch de
UI passa a carregar. Sem ela as outras seis ondas não têm contra o que reprovar, e
a lição da §8 é exatamente essa: regra em prosa que não vira critério verificável
sobrevive dois meses e 223 divergências.

## R1 · área interna do evento

A onda 1 por ordem do dono, e também a maior da fila. Ela se parte em quatro
frentes, na ordem em que uma destrava a outra.

**R1-a · o header e o countdown.** Movimentos 1, 3 e 4 da spec. É a frente que o
dono apontou e a única que muda a dobra em 375. Duas telas de código
(`EventoShell.tsx`, `CountdownHero.tsx`) mais `ModalidadesPanels.tsx`, e os testes
que hoje afirmam as linhas duplicadas passam a afirmar a ausência delas.

**R1-b · a contagem de inscritos nas listas.** Inscritos e Financeiro mostram o
mesmo total quatro vezes cada. A casa é o `ResultCount` (ele responde "de quantos
estou vendo N"), e o que sai é o chip "Todos · N" e a repetição no cabeçalho de
seção. Toca `InscritosView.tsx` e `FinanceiroView.tsx`.

**R1-c · os totais contra as próprias colunas.** Kits · Distribuição e Financeiro ·
Caixa. Aqui a maioria é **branda** pela régua (agregado ao lado da decomposição) e
a frente é de julgamento, não de corte: cada par decide se declara papel distinto
ou se some. Sem essa distinção a onda vira poda cega.

**R1-d · `KitEditor` e o breadcrumb duplo.** O mais barato dos quatro e o mais
óbvio de ler: dois breadcrumbs empilhados, com dois itens apontando para o mesmo
href. Não depende de vetável nenhum.

## R2 · engajamento e a fronteira com a visão geral

Movimentos 5 e 6 da spec. A parte de corte (Movimento 5) é pequena e não toca o
design system. A parte de promoção do bloco de ponte (Movimento 6) é trabalho de
design system e fica para a R3, porque criar componente no meio de uma onda de
poda mistura duas naturezas de risco.

## R3 · clubes

O mesmo defeito do evento, com um canal a mais. Depende da resposta de
**EVT-CARGA-2**, porque a pill da sub-nav é a terceira cópia nos dois lugares e a
decisão do dono vale para as onze barras. Onze duras, sendo 4 na área do clube e 7
nas abas irmãs e no hub.

## R4 e R5 · visão geral e plataforma

Duas duras cada, e as duas da plataforma são as mais perigosas da amostra inteira
porque envolvem **fontes diferentes para o mesmo fato**: TPV contra Vendido bruto
lendo retrato e soma viva. Baixo volume, risco alto de número mentindo. Livres de
vetável, então podem correr em paralelo com a R1.

## R6 · ambiguidade de rótulo

Não é redundância e não se conserta apagando. Três itens: os dois números de gente
vizinhos no credenciamento, o status do evento em duas grafias nas configurações, e
"Publicado" significando duas coisas na página de vendas. O conserto é qualificar
o rótulo. Entra na fila porque a origem é a mesma varredura e porque, para quem lê
a tela, o efeito é o mesmo: dois números iguais confundem tanto quanto dois
rótulos iguais.

## Como cada onda prova que pagou

Mesma disciplina das ondas C: número antes e número depois, na aterrissagem da
própria onda.

1. A contagem de duras da área, medida de novo depois do corte.
2. Em telas que mudam a dobra, a medida de pixel nos três viewports — altura do
   cabeçalho, topo do primeiro número não duplicado e se ele cabe sem rolar. A
   tabela da medição desta rodada é a linha de base.
3. O gate `leela-redundancia` (Parte 4.1) verde na área tocada.

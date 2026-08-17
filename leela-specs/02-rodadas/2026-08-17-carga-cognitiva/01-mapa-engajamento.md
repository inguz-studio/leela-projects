---
tags: [leela, design, carga-cognitiva, medicao, engajamento, clubs, e02, e05]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
---

# Mapa da tela de Engajamento, banda a banda

> Parte 2.2 do brief. O que cada bloco mostra, de onde o dado vem, e se o seletor
> de clube do topo recorta aquele bloco. A última coluna é a que responde a
> pergunta do dono.

Fonte: `apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx` e
`EngajamentoPage.tsx`. Capturas em `capturas/04-engajamento-banda-clubs.jpg` e
`capturas/05-engajamento-bandas-ponte-e-eventos.jpg`.

## O seletor e o que ele alcança

O seletor de clube vive no `PageHeader` (`EngajamentoView.tsx:464-476`), global à
tela. Ele alimenta `clubeSelecionado` → `clubesNoRecorte(clubes, selecao)` →
`useDadosDoEngajamento(recorte)` (`EngajamentoPage.tsx:51-52`).

Tudo que deriva de `dados.data` obedece ao seletor. **Uma leitura não deriva:**
`useEventosDoOrganizador()` (`EngajamentoPage.tsx:57`) não recebe argumento
nenhum. O código diz isso com todas as letras, em `EngajamentoPage.tsx:54-56`:

> *"Banda Eventos (estudo · D-1008-R15): eventos são do ORGANIZADOR, não de um
> club — o filtro de club não recorta esta leitura"*

## Banda 1 · Clubs

Legenda: "A comunidade em si: quem está, como chegou e o que move o grupo."

| Bloco | Linha | Fonte do dado | Seletor recorta? |
|---|---|---|---|
| 4 KpiCards (Clubs, Membros ativos, Desafios ativos, Participações) | `:535-542` | `resumirComunidade(recorte, …)` | sim |
| Equilíbrio dos pilares | `:549-586` | `resumirPilares` | sim |
| Situação dos membros | `:591-610` | `resumirSituacao` | sim |
| Como a comunidade entra | `:615-641` | `resumirEntrada` | sim |
| Desafios que mais movem a comunidade | `:645-651` | `ranquearDesafios` | sim |
| Check-ins realizados (em breve) | `:661-669` | sem fonte | n/a |
| Mapa de check-ins (em breve) | `:674-678` | sem fonte | n/a |
| Volume de check-ins (em breve) | `:679-683` | sem fonte | n/a |
| Modalidades da comunidade | `:689-695` | `resumirModalidades(recorte)` | sim |

Nove blocos, todos de clube. Banda coerente com o título da tela.

## Banda 2 · Do club para o evento

Legenda: "A ponte: quanto da comunidade vira participação em evento."

| Bloco | Linha | Fonte do dado | Seletor recorta? |
|---|---|---|---|
| Desafios ligados a um evento | `:705-731` | `resumirPonteComEventos(dados.data.desafios)` | sim |
| Conversão da base (em breve) | `:741-745` | sem fonte | n/a |

**Esta banda é de clube.** Ela conta desafios *do clube selecionado* que apontam
para um evento. O nome dela engana à primeira leitura — parece falar de evento,
mas o sujeito da frase é o clube. Ela pertence a Engajamento e fica.

## Banda 3 · Eventos

Legenda: "O resultado: ocupação dos eventos e como as pessoas pagam."

| Bloco | Linha | Fonte do dado | Seletor recorta? |
|---|---|---|---|
| Ocupação dos últimos 5 eventos | `:759-766` | `useEventosDoOrganizador()` → `derivarOcupacao` | **não** |
| Formas de pagamento (em breve) | `:769-775` | sem fonte | n/a |

**Esta banda não é de clube, e não é dela a tela.** Ela mostra os eventos do
organizador inteiro. A captura `05` prova a olho: com o seletor em "Todos os
clubs", a banda lista Corrida de Inverno, Campeche Run, Desafio MTB, Retiro
Bem-Estar e Noturna da Beira-Mar. Trocar o seletor para um clube só não muda uma
linha dessa lista, porque a leitura nunca viu o recorte.

## O achado que decide a Parte 3

`OcupacaoEventos` não é um bloco novo desta tela. É o componente da Visão geral,
importado (`EngajamentoView.tsx:52`) do caminho
`apps/painel/src/routes/overview/_components/OcupacaoEventos.tsx` — e **ele já está
montado na Visão geral**, em `OverviewContent.tsx:191`.

Ou seja: a banda Eventos do Engajamento é o mesmo componente, com a mesma fonte e
o mesmo recorte (nenhum), aparecendo em duas áreas do painel. Não é um bloco
parecido; é o mesmo bloco, renderizado duas vezes em lugares diferentes.

Isso muda o custo da reordenação de forma decisiva. **Tirar a banda Eventos do
Engajamento não é migrar nada para a Visão geral. É apagar uma segunda montagem
do que a Visão geral já mostra.** O mockup original, que o dono lembra tendo essa
informação em Visão geral, está certo, e a Visão geral nunca deixou de tê-la.

O par "Formas de pagamento" é um `EmBreveV3` sem fonte de dado
(`EngajamentoView.tsx:769-775`), e o irmão dele já vive na Visão geral
(`OverviewContent.tsx:173` e `:181`). Mesmo caso.

## Leitura em uma frase

A tela de Engajamento tem onze blocos de clube e dois blocos de evento. Os dois de
evento são cópia de blocos da Visão geral e são os únicos que o seletor do topo
não alcança. Um seletor que não recorta um terço da tela é a incongruência que o
dono sentiu, e ela está declarada no próprio código como se fosse desenho.

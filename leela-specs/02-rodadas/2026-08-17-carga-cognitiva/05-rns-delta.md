---
tags: [leela, rn, delta, carga-cognitiva, e01]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
---

# Delta de regras de negócio

Uma regra nova. O texto canônico mora no épico [[LEELA-E01-design-system]]; este
arquivo é o delta do dia e aponta para lá, pela convenção de
[[CONVENCAO-BOARDS]].

## RN-573 · redundância de informação na mesma dobra

**Épico dono:** [[LEELA-E01-design-system]].

**Enunciado.** Nenhum número ou fato aparece duas vezes ou mais na mesma dobra sem
papel distinto **declarado**. Aparição fora da casa do dado é resumo com caminho,
nunca cópia. A dobra é o julgamento, não o arquivo: dois componentes distintos que
caem juntos na tela estão na mesma tela para quem lê.

**Papel distinto declarado** é o que separa desenho de defeito, e ele precisa das
duas palavras. *Distinto*: as duas aparições respondem a perguntas diferentes —
total ao lado da própria decomposição, alvo de confirmação destrutiva, campo
editável, prévia do que vai ser gravado, log de sessão. *Declarado*: está escrito
no código ou no cânone, não deduzido por quem revisa. Sem a segunda palavra a
regra vira opinião e não tem contra o que reprovar, que é exatamente como a §8
sobreviveu dois meses enquanto 223 divergências nasciam.

**Por que ela é regra de negócio e não recomendação de estilo.** Duas cópias do
mesmo fato lidas de fontes diferentes divergem, e a tela passa a mostrar dois
números com o mesmo nome. A varredura desta rodada achou o caso vivo três vezes:
receita no evento (`OverviewKpis` lê `evento.receitaConfirmada`, `ModalidadesPanels`
lê `fin.receitaBruta`), membros ativos no clube (lista carregada contra agregado
gravado) e o bruto do tenant na plataforma (retrato de `platform/rollups` contra
soma viva de `repasse.ts`). Nenhum é erro de cálculo; os três são a mesma regra
faltando.

**Nasce medida**, como a RN-558 e a RN-568: 44 redundâncias puras em 77 pares na
área interna do evento, 15 duras em 31 telas nas outras áreas, e a prova de pixel
nos três viewports em
`02-rodadas/2026-08-17-carga-cognitiva/00-medicao-area-interna-evento.md`.

**Como é conferida.** Critério de aceite em todo dispatch de UI, injetado pelo
harness, com o texto da `governanca-design.md §9`. O gate `leela-redundancia`
nasce como trabalho da onda R0 e segue o desenho do `leela-canon`: começa em
`warn`, com baseline, e vira `error` quando a contagem da área chegar a zero.

**Regras vizinhas, e o que esta acrescenta.** A **RN-558** é procedência (a
instância usa o componente do cânone). A **RN-568** é composição recorrente
(montagem repetida três vezes nasce no design system). As duas julgam **como** a
peça foi feita. A RN-573 julga **o que** a tela diz, e por isso alcança um caso que
nenhuma das duas alcança: uma tela pode usar o `Card` canônico, com os tokens
certos, passar no gate de marca e no de procedência, e ainda assim mostrar o mesmo
número quatro vezes. Foi o que a medição achou.

**Nada é revogado.** Ela é adição.

---

## Conferência da faixa

A faixa foi conferida por grep de `RN-573` a `RN-577` sobre o corpus inteiro fora
do índice, **imediatamente antes do commit**: zero definições. As duas ocorrências
que o grep devolve para `RN-573` e `RN-576` estão em
`02-rodadas/2026-08-12-decisoes-dono/03-rns-delta.md:118` e `:178` e são prosa
descrevendo as próprias varreduras daquelas lanes, o molde de sempre.

A faixa mais alta em uso passa de **572** para **573**. **A próxima livre começa na
574.**

As decisões das levas 18 e 19 não consomem número, pela razão escrita no registro:
row-action em ícone, movimento do drawer, campo de pesquisa flat e a barra mobile
de quatro são desenho com vetável aberto, e regra escrita antes do desenho
responder cravaria a pergunta que a spec ainda faz.

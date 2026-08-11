# Ordem do dono e autoridades — roadmap de revisão de componentes

- **rodada:** `2026-08-11-roadmap-componentes`
- **trace:** `leela-roadmap-componentes-20260810`, lane ROADMAP-COMPONENTES
- **base de medição:** `main` em `b0f979e5` (o redesign inteiro já dentro; o merge era a condição de disparo desta lane, para o inventário não medir tela morta)
- **entregável:** spec e roadmap. Nenhuma tela se mexe nesta rodada.

## A ordem, na íntegra

> "após finalizar quero um roadmap de revisão de componentes. Em vários lugares do sistema nao estamos respeitando componentes listas de dropdown seletores, combobox, forms, cards, slots, bentos. Em alguns lugares do sistema nao existe um padrão definido disso, e é inaceitável que isso ainda tenha que ser falado, visto que é um critério de aceite das interfaces. [...] Vejo muito overengineering e pouco job to be done aplicado, em casos que foquem no usuário fazer o que quer ser feito, com facilidade, sem muita carga cognitiva nas interfaces e de maneira que seja fluida, principalmente."

São duas ordens numa frase, e elas se resolvem por caminhos diferentes.

A primeira é **procedência**: onde há padrão nomeado, a instância usa o componente do design system. A segunda é **carga cognitiva**: a tela existe para a pessoa completar um job, e cada passo a mais entre a pessoa e o job é dívida. A primeira se mede por varredura e se trava por lint. A segunda se mede por contagem de passos e se decide onda a onda, com número antes e número depois.

A frase que organiza a rodada é a do meio: "é inaceitável que isso ainda tenha que ser falado, visto que é um critério de aceite das interfaces". O critério existia e mesmo assim derivou. Entender por que ele derivou é o que impede a rodada de virar uma lista de consertos que envelhece em duas semanas.

## Por que o critério derivou (L-021)

O gate de UI do projeto cobria três eixos, e nenhum deles era procedência.

| Eixo | Pergunta que ele faz | O que ele deixa passar |
|---|---|---|
| `brief_fidelity` | a tela parece com o alvo? | um combobox artesanal fiel ao mockup |
| Escolha do padrão (critério 9) | o padrão escolhido é o certo? checkbox ou radio, tabela ou cards? | um combobox artesanal com o padrão certo |
| Marca (L-011, `leela-tokens`) | tokens, fontes, zero valor cru? | um combobox artesanal construído 100% com tokens |

Um controle feito à mão, com o padrão correto e todos os tokens no lugar, passa nos três. Procedência, escolha e marca são três gates distintos, e os três são necessários.

O segundo mecanismo é mais fundo e é o que a segunda frase do dono aponta: **onde não existe componente canônico declarado para um padrão, o critério é inchecável por construção**. Não há contra o quê reprovar. Cada lane inventa o seu, ninguém erra formalmente, e o resultado agregado é o que o dono viu. O DS publica 49 componentes e nenhum deles é layout: não existe `Grid`, `Bento`, `Stack`, `Section` nem `Surface`. Bento e slot, dois dos padrões citados na ordem, estão exatamente nessa faixa.

O terceiro: a spec declara comportamento (Given/When/Then), não construção. Ninguém era dono da frase "toda instância do padrão X usa o componente canônico X".

## Autoridades desta rodada, nesta ordem

1. **L-021 do harness** — procedência ≠ escolha ≠ marca. Padrão sem cânone: a primeira entrega da frente de UI é propor o cânone como decisão ao dono, nunca construir bespoke em silêncio.
2. **`leela-specs/04-engenharia/governanca-design.md`** — em especial a §8 (shadcn-first, diretriz permanente do dono, ampliada em 2026-07-19 para todo componente de UI) e a porta única de exceção: ADR ou nota de decisão com contexto, critérios ordenados e a11y provada. O padrão correto de exceção é o **ADR-017** (entrada Radix-free do DS para a superfície pública da landing, ratificada por peso de bundle).
3. **`packages/design-system/`** — o DS real. Reaproveitamento primeiro: onde o DS já tem componente, ele é o cânone e a discussão acabou.
4. **JTBD e histórias do `leela-specs/`** — as ondas se ordenam por job servido, nunca por ordem de tela.
5. **`design.md` v1.2.0 do harness** — critério 10 `component_canon_conformance` (peso 12) e o bullet de economia de fluxo no critério 9.

## O que esta rodada entrega

| Documento | O que carrega |
|---|---|
| `01-ordem-do-dono.md` | esta ata: a ordem, o diagnóstico e as autoridades |
| `02-inventario-componentes.md` | a medição: instância a instância, com arquivo e linha, classificada em conforme / divergente / sem-cânone |
| `03-canone-componentes.md` | o mapa padrão→componente que todo dispatch de UI passa a injetar, mais as lacunas agrupadas como decisão do dono |
| `04-ondas-roadmap.md` | as ondas, ordenadas por JTBD, ancoradas em épico e história vigentes, cada uma com passos até o job antes e depois |
| `05-gate-leela-canon.md` | a spec do gate determinístico que impede a próxima instância crua de nascer |

## Disciplina

Inventário antes de propor. Zero refação de tela nesta lane: o roadmap é o entregável, a refação são as ondas e cada uma nasce com brief próprio. Tarefa nova resolve história existente prioritariamente; história nova só quando nenhuma existente cobre o job. RN nova consolida no épico na mesma aterrissagem. Boards atualizados na aterrissagem, nas três altitudes.

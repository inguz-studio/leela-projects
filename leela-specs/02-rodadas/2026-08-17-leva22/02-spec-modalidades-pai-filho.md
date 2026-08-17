---
tags: [leela, spec, leva22, modalidades, lotes, s316, e04]
aliases: [Spec Modalidades pai-filho, S316 reformada]
atualizado: 2026-08-17
---

# Spec — Modalidades toma o lugar de Lotes, e o lote vira filho

> Fecha a **MODALIDADES-1** do painel. Re-ancora a **S316** inteira. Cobre RN-500, RN-501,
> RN-502 e RN-505, que **não mudam de enunciado** — muda onde a tela mora e que forma ela
> tem. Constrói na **onda C**. ⛔ Zero código nesta lane.

## A decisão, na forma que o dono deu

> *"Essa área deve ser ali em Lotes. E chamaremos de Modalidades ao invés de Lotes, no menu
> secundário. Ali posso ou adicionar uma modalidade ou um lote dentro da modalidade."*

Três coisas numa frase, e a terceira é a que muda a spec antiga:

1. A configuração de modalidades **mora na área que hoje é Lotes** — não em Configurações
   gerais, que é onde a S316-T4 a colocava.
2. A área **muda de nome** para "Modalidades" no menu secundário do evento.
3. **Modalidade é pai, lote é filho.** A tela deixa de ser uma lista plana de lotes e passa
   a ser uma lista de modalidades, cada uma com os seus lotes dentro.

Ele não escolheu entre a fase A e a fase B que o painel oferecia. Deu o desenho, que é a
fase B com hierarquia declarada. **A MODALIDADES-1 sai do painel por resposta, não por
default exercido.**

## Por que a hierarquia é o item central, e não o renome

O renome é uma linha (`_lib/subnav.ts:36`, a única ocorrência de `'Lotes'` como label em
todo o código). A hierarquia é a spec.

E ela **já é verdade no modelo**, o que barateia tudo: `Lote.modalidade` é campo obrigatório
do lote, a Rule do lote exige que a modalidade conste da lista do pai — no `create` **e no
update** — e o docId do lote hoje até embute o nome dela. O produto sempre foi pai e filho.
**A tela é que mostrava só os filhos, sem nunca desenhar o pai.** É exatamente por isso que
o dono não achava onde adicionar modalidade: a tela dos lotes é a tela das modalidades, com
o nível de cima invisível.

**A consequência de desenho:** a modalidade sem nenhum lote passa a ter representação
própria na tela. Hoje ela é literalmente invisível — uma modalidade sem lote não produz
nenhuma linha. É aí que nascem as duas perguntas que o organizador não conseguia fazer:
"quais modalidades esse evento tem?" e "qual delas ainda não tem preço?".

## A forma da tela

Lista de **modalidades**, cada uma um bloco. Dentro do bloco, os lotes daquela modalidade.
Duas ações no topo, e é o que a frase dele pede na letra: **adicionar modalidade** (nível do
evento) e **adicionar lote** (dentro de uma modalidade).

Cada bloco de modalidade carrega, além do nome:

- os lotes dela, na ordem de vigência, com os três números que a D-1008-R12 já cravou —
  **Vendidos · Disponíveis · Total**
- o estado agregado: sem lote nenhum (e o que fazer), lote vigente, tudo encerrado
- as ações da modalidade: renomear, remover, adicionar lote

**Modalidade sem lote não é linha vazia: é o convite.** O bloco existe, diz que não há preço
configurado, e traz o botão que resolve. Esse é o conserto real do círculo fechado que a
DIAG-PAINEL-LACUNAS pagou por fora, com texto honesto, em 05/08.

⚠️ **A tela precisa continuar servindo o job dos lotes, que é o mais frequente.** Quem entra
ali dez vezes por semana entra para mexer em preço e vaga, não para criar modalidade.
Agrupar por modalidade **não pode** custar um toque a mais no caminho de editar um lote. A
régua da L-021 vale aqui: medir passos até o job antes e depois, e a hierarquia só passa se
empatar ou melhorar.

## ⛔ A ordem que a medição impõe: renome e conteúdo sobem juntos

A tela de Lotes hoje **declara na cara** que não edita modalidades — `lotes/LotesView.tsx:75-78`
e o `EmptyState` em `:88-91`, com espelho em `ConfigGeraisForm.tsx:292-296`. Aqueles textos
foram escritos de propósito pela DIAG-PAINEL-LACUNAS, para a tela parar de mentir enquanto a
S316 não subisse.

**Renomear a aba para "Modalidades" antes de entregar a edição recria o círculo fechado, com
agravante:** antes a tela não prometia nada e mandava para outro lugar; depois ela
prometeria pelo próprio nome o que continua não fazendo. **É pior que o defeito original.**

Por isso a onda C é uma onda só, e não "renome agora, servidor depois". O renome é a última
tarefa dela, não a primeira.

## As seis tarefas da S316, revisadas contra o desenho

As quatro regras de negócio **não mudam**: RN-500 (porta única no servidor), RN-501
(renomear é migração atômica de cinco referências), RN-502 (remover recusa nomeando quem
impede), RN-505 (o evento degradado ganha conserto pela listagem). O que muda é a tela e o
tamanho.

| Tarefa | O que era | O que fica | Tamanho |
|---|---|---|---|
| **S316-T1** | callable `editarModalidadesEvento`, transacional, motivo e trilha | **Intacta.** A porta do servidor não sabe onde a tela mora | ⚔ (era ⚔) |
| **S316-T2** | renomear migra cinco alvos num commit | **Intacta.** | ⚔⚔ (era ⚔⚔) |
| **S316-T3** | remover recusa nomeando lote, kit e campanha | **Intacta**, e ganha destino melhor: a recusa agora nomeia coisas que estão **na mesma tela**, dentro do bloco da modalidade | ⚔ (era ⚔) |
| **S316-T4** | seção de modalidades em **Configurações gerais**, reusando os chips da criação | ⚠️ **Muda de casa e de forma.** Sai de Configurações gerais, vai para a aba Modalidades, e deixa de ser lista de chips: vira a **hierarquia pai/filho** com os lotes dentro | **cresce: — → ⚔** |
| **S316-T5** | evento degradado ganha conserto pela listagem | **Intacta.** `getEvento` continua fail-fast; afrouxá-lo segue recusado por escrito | ⚔ (era ⚔) |
| **S316-T6** | docId do lote para de embutir o nome da modalidade | **Intacta**, e continua dívida cosmética para documentos novos | — |
| **S316-T7** | — | **Nova.** O renome da aba, a copy das três telas que apontam para "Lotes", e a morte dos textos que declaravam a lacuna | — |

**A T4 é a que muda de tamanho, e o motivo é honesto:** antes ela era uma seção de chips
reusando um componente que já existia (`EventoForm.tsx:355-403`) numa tela que já existia.
Agora ela é a reestruturação da tela de lotes inteira, com hierarquia, estados novos e a
régua de não piorar o caminho do job frequente. Chamá-la de tarefa pequena porque o número
não mudou seria mentir sobre a fila.

**A T7 é nova e nasce última.** Ela é barata (uma linha de rótulo, três de copy, zero teste
— §13 da medição), e o valor dela é inteiramente dependente da T4 estar no ar.

## O que esta spec não decide

**A ordem do fluxo.** A D-1008-R13 trazia duas coisas: a visibilidade (resolvida aqui) e a
ordem — *"eu precisaria primeiramente configurar as modalidades e depois os lotes"*. A
hierarquia pai/filho **expressa** essa ordem visualmente, e isso pode bastar. Forçá-la —
bloquear a criação de lote enquanto não houver modalidade — é outra decisão, e o modelo já a
implementa por baixo, porque lote exige modalidade existente. Não invento trava nova.

**A dedução de "duas listas para o mesmo fato".** `modalidades[]` e `percursos[].nome`
duplicam a modalidade dentro do mesmo documento, e o segundo é preço legado consultado por
nome no checkout. A ponta solta continua nomeada e não resolvida: esta spec trata as duas
como uma só em toda operação, que é o que a S316 já fazia. Unificar é rodada própria, com
migração de documento vivo.

## Aceite

1. A aba do menu secundário diz **Modalidades**, e o `id` e a rota **não mudam** — mesma
   régua da RN-399 e da RN-572 (muda o que a pessoa lê, não o identificador).
2. A tela lista **modalidades**, com os lotes de cada uma dentro, e uma modalidade **sem
   lote aparece** com o caminho para criar o primeiro.
3. Acrescentar modalidade funciona a partir dessa tela, pela porta única do servidor, com
   `qtdInscritos == 0` checado pela Function **por conta própria**.
4. Renomear migra os cinco alvos atomicamente; falha injetada no meio não deixa **nada**
   escrito.
5. Remover recusa nomeando cada lote, kit e campanha que impedem, e a mensagem **chega à
   tela** sem virar "falha ao salvar" — o defeito de endereço que a review da SEAL-LOTES
   corrigiu (`2a97a592`) não pode renascer.
6. **Nenhum caminho do job frequente piora:** editar preço e vaga de um lote existente custa
   o mesmo número de toques que hoje, ou menos. Medido antes e depois, pela L-021.
7. A varredura por *"não é editável depois de criado"* devolve **zero** — os textos que
   declaravam a lacuna morrem no mesmo commit que a fecha.
8. O renome (T7) só entra **depois** da T4 estar verde.
9. Gate visual do maestro nas duas telas antes de "no ar".

## Vizinhos

`00-medicao-kits-caixa-e-terciario.md` §13 para o custo do renome.
[[LEELA-E04-config-vendas]] §S316 para o texto canônico das quatro RNs.
`2026-08-05-modalidade-e-kit/04-fila-codigo.md` para a fila original das seis tarefas.

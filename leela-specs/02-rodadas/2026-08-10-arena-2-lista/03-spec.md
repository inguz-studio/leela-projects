---
tags: [leela, spec, rodada, arena, pilares, modalidades, interesses, taxonomia]
trace: leela-arena-2-20260810
lote: SPEC-ARENA-2-LISTA
data: 2026-08-10
---

# 03-spec · A lista de interesses da Arena deriva da taxonomia que já existe

> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está em
> [[02-inventario-codigo]]. Cinco regras novas (uma condicionada), uma história, e um vetável
> único no fim.
>
> **Prova de não colisão.** O [[indice-de-regras-de-negocio]] anuncia a próxima faixa livre na
> **553** (a mais alta em uso é a RN-552, SPEC-ADMIN-USUARIOS de 10/08). Varredura desta lane por
> `RN-553` a `RN-565` sobre `leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`,
> fora do índice e desta rodada: **zero ocorrências** (as três citações existentes de "RN-553" a
> "RN-560" são prosa de outras rodadas descrevendo as próprias varreduras). Esta lane consome
> **RN-553 a RN-557**, e a conferência foi refeita imediatamente antes do commit — a lição do
> 537-542 e do 516 vale aqui.
>
> Numeração de histórias: a numeração é global; a faixa E12 mais alta é a **S1244** (as dez do
> corte que fecham sem construir). Varredura repo-wide por `S1245` a `S1249`: zero ocorrências.
> Esta lane consome **S1245**.

## Parte 1 · O desenho, antes das regras

### A derivação exata, em uma frase

A lista de interesses da Arena é **função pura das constantes canônicas do core**: os 3 pilares
da RN-114 como categorias, e os termos granulares compostos das 16 ações do catálogo
(`CATALOGO_ACOES`) e das 9 modalidades do clube (`MODALIDADES_CLUBE`), com os cinco pares
sobrepostos fundidos conforme o corte do dono (ARENA-4). Nenhuma coleção nova, nenhuma constante
paralela, nenhuma lista digitada em tela.

Por que constante e não coleção: a coleção `catalogoAcoes` é espelho semeado da constante e
ninguém mais a escreve (`write: if false` — inventário §1), então ler a coleção na landing seria
pagar uma leitura de Firestore para obter o que o `@leela/core` já entrega por import. A verdade
é a constante; quem quiser a coleção tem a garantia de que ela foi gerada dela.

Por que as modalidades **do clube** e não as do evento: as do evento são texto livre de percurso
("5k"), editáveis por terceiro (RN-500-505) e sem valor de interesse — a medição está no
inventário §2. Derivar de lá entregaria o vocabulário do produto a quem digita percurso.

### O que acontece quando a taxonomia se move

O vocabulário é fechado e versionado em código. Termo novo ou termo removido é **mudança no
core, com revisão de produto** (o cabeçalho do catálogo já exige isso — inventário §1), e a
lista da Arena acompanha **no mesmo deploy, sem migração**: a derivação roda sobre a constante em
tempo de import, então não existe estado intermediário a reconciliar.

O que exige regra é o **dado já gravado** que aponta para termo que saiu — e a RN-554 fecha isso
sem escrita silenciosa em dado de gente.

### O que esta spec não faz, e é deliberado

Não decide visibilidade: os interesses nascem sob o regime da Arena (RN-471/RN-472 — default só
a própria pessoa), e **nada de social** entra aqui; a abertura futura é assunto encerrado do
ARENA-1 e do LGPD-1. Não toca o radar: a RN-535 (E20) mede engajamento por mensagens e
`diasAtivos`, não usa pilares (conferido — inventário §4), e fica citada como fronteira. Não
redefine a RN-114 nem mexe no Engajamento do painel: a Arena consome a taxonomia, nunca os
agregados. E não crava o vocabulário final exposto — o corte é do dono (ARENA-4, Parte 5).

## Parte 2 · Regras de negócio novas

Todas donas em [[LEELA-E12-landing]], faixa RN-553 a RN-557. Consolidadas no épico nesta mesma
aterrissagem.

### RN-553 · A lista de interesses da Arena deriva da taxonomia canônica, de fonte única

Verbatim do dono (ARENA-2, 09/08): *"Nao temos essa listgem? de acordo com o spilares e
modaldiades disponiveis? podemos usar de base."*

A lista que a Arena oferece é **derivada por função pura** das constantes canônicas do core:

- **Pilares:** `PILARES` / `Pilar` (`packages/core/src/clubs/catalogo-acoes.ts:23-25`, RN-114) —
  Físico, Mental, Espiritual — como as categorias da lista.
- **Termos granulares:** as 16 ações de `CATALOGO_ACOES` (`:55-75`), cada uma já carregando o
  próprio pilar, e as 9 modalidades de `MODALIDADES_CLUBE`
  (`packages/core/src/clubs/clube-opcoes.ts:41-51`), agrupadas sob o pilar Físico por natureza —
  com as sobreposições resolvidas pelo corte do dono (RN-557).

Três proibições, para a fonte ser única de verdade: nenhuma tela, coleção ou constante **repete**
a lista (consumidor importa a derivação, nunca cola o resultado); a derivação **não lê Firestore**
(a coleção `catalogoAcoes` é espelho semeado da mesma constante); e a lista **não nasce editável**
por organizador nem por participante — mudar vocabulário é mudança de produto no core, como o
catálogo já exige.

**Falsificação:** remover um termo da constante e rebuildar faz o termo sumir da lista derivada
sem tocar em código de tela; colar uma cópia literal da lista num consumidor é defeito por
construção (o teste da derivação compara consumidor contra fonte).

**Épico dono:** E12 · **consome:** RN-114 (E05, intocada), RN-471 · **cita:** RN-500-505 (as
modalidades do evento ficam fora), D-0802-1.

### RN-554 · O interesse grava o id canônico, e termo que morre não apaga escolha de ninguém

O que a pessoa escolhe é persistido como o **valor canônico do termo na fonte** — o `id` da ação
(`correr`), o valor literal da modalidade (`Corrida de rua`), o slug do pilar (`fisico`) —, nunca
o rótulo de exibição. Rótulo muda barato; id gravado é contrato.

Quando um termo **sai** da taxonomia, o dado gravado que aponta para ele vira **órfão declarado**:

- deixa de ser **oferecido** e deixa de ser **exibido** — nenhum chip fantasma;
- **não é apagado por processo nenhum** — escrita silenciosa em dado de gente não existe;
- some no **primeiro save da própria pessoa**, porque o save grava o que a tela mostra — e isso
  fica escrito como comportamento deliberado, não acidente.

Quando um termo **nasce**, ele aparece para todo mundo no deploy que o trouxe, sem migração e sem
backfill — derivação em tempo de import não tem estado para migrar.

**Falsificação:** doc de Arena com um id que não existe mais na fonte renderiza a seção sem o
termo e sem erro; o save subsequente persiste só o vocabulário vigente; e nenhum job, trigger ou
function toca o doc por causa do órfão.

**Épico dono:** E12 · **consome:** RN-553, RN-471.

### RN-555 · A ordem é a da fonte, e o vazio é honesto

A lista exibe os pilares na ordem de `PILARES` (Físico → Mental → Espiritual) e os termos na
**ordem de declaração** das constantes de origem — nunca ordem alfabética (que divergiria entre
consumidores e locales) e nunca reordenação por popularidade (que não tem denominador honesto
hoje — inventário §2).

Vazios: a Arena sem interesse marcado é **estado válido** (RN-471) — a seção mostra o convite de
escolha, nada pré-selecionado, nenhum termo marcado por default. Se a derivação devolver lista
vazia (defensivo — só acontece com a fonte quebrada), a seção mostra o estado vazio honesto em
vez de inventar termos; nenhum "em breve" é necessário, porque a fonte existe.

Os **rótulos** de exibição saem do vocabulário do produto num lugar só: o mapa de rótulos de
pilar que hoje vive no painel (`ROTULO_PILAR` — inventário §5.1) sobe para o core junto da
derivação, e painel e Arena passam a importar o mesmo mapa.

**Falsificação:** trocar a ordem das constantes reordena a lista derivada sem tocar tela;
alfabetizar num consumidor derruba o teste que compara consumidor contra fonte; e a seção nova
com doc vazio não marca checkbox nenhum.

**Épico dono:** E12 · **consome:** RN-553, RN-471.

### RN-556 · Uma lista, dois consumidores — e as fronteiras que ela não cruza

A mesma derivação serve os **interesses da Arena** e a **categorização de experiências da home**
quando o dono mexer nela (D-0802-1: a home é dele; a lista fica pronta para consumo, não
instalada). Duas listas divergindo é o custo que o ARENA-2 existiu para evitar — consumidor novo
importa a derivação, nunca cria a própria.

Fronteiras, todas medidas no inventário:

1. **Social — nada.** Esta regra não muda visibilidade: interesses seguem o default restrito da
   RN-471, o campo sensível segue a RN-472, e a abertura futura segue no ARENA-1/LGPD-1.
2. **Radar — nada.** A RN-535 (E20) segue sendo a régua de engajamento do radar (mensagens +
   `diasAtivos`); ela não usa pilares e a Arena não alimenta janela nenhuma do E20.
3. **Agregados de desafio — nada.** `progressoPorPilar` e o Engajamento do painel continuam
   lendo só desafio (RN-114); interesse de Arena não entra em agregado nenhum por esta spec —
   qualquer "pessoas interessadas em X" futuro é regra nova, com review própria.
4. **Vitrine e evento — nada.** `Evento.modalidades` segue texto livre do organizador
   (RN-500-505); a lista da Arena não valida, não sugere e não restringe percurso.

**Épico dono:** E12 · **consome:** RN-553 · **cita:** RN-535 (E20, intocada), RN-471, RN-472,
D-0802-1.

### RN-557 · O vocabulário exposto nasce do corte do dono — **condicionada ao ARENA-4**

A derivação encontra cinco pares nomeando a mesma prática (Correr ↔ Corrida de rua, Caminhar ↔
Caminhada, Pedalar ↔ Ciclismo, Nadar ↔ Natação, Yoga/alongamento ↔ Bem-estar/Yoga) e ações cujo
rótulo é de **hábito**, não de interesse ("Dormir 7h+", "Limitar tela à noite"). Fundir, renomear
e cortar é vocabulário de marca, e vocabulário de marca não se decide em esteira.

**Se o dono ratificar o default proposto** (ARENA-4, opção 1): a lista exposta é a tabela da
Parte 5, com os cinco pares fundidos no rótulo de interesse e os rótulos de hábito reescritos
como interesse, mantendo o id canônico da fonte por trás de cada termo (RN-554 intocada pela
fusão — o rótulo é apresentação, o id é contrato).

**Se ele cortar ou acrescentar**, esta RN nasce na forma da resposta — número consumido de
qualquer jeito, para não virar buraco (mesmo desenho da RN-546 e da RN-552). Nenhuma tela de
interesses nasce antes do corte.

**Épico dono:** E12 · **consome:** RN-553, RN-555.

## Parte 3 · As quatro perguntas do brief, respondidas

**(a) Derivação exata — fonte única.** A constante do core, não a coleção: `PILARES` +
`CATALOGO_ACOES` (`catalogo-acoes.ts`) e `MODALIDADES_CLUBE` (`clube-opcoes.ts`). A coleção
`catalogoAcoes` (16 docs em produção, conferidos no inventário congelado da purga) é espelho
semeado da mesma constante e ninguém mais a escreve (RN-553).

**(b) Termo que nasce ou some.** A lista acompanha sozinha no deploy — derivação em tempo de
import, sem migração. Dado gravado que perdeu o termo vira órfão declarado: some da exibição,
não é apagado por processo, e sai no primeiro save da própria pessoa (RN-554).

**(c) Ordenação e vazios.** Ordem de declaração da fonte, nunca alfabética nem por popularidade
(sem denominador honesto: 2 eventos de teste em produção). Arena vazia é estado válido; nada
pré-selecionado; lista vazia defensiva mostra vazio honesto (RN-555).

**(d) Fronteiras.** ARENA-1/social: nada muda em visibilidade — default restrito da RN-471/472
segue, jurídico segue no LGPD-1. Radar: RN-535 citada e intocada — e a premissa do brief
corrigida com prova: ela **não** usa pilares (inventário §4); os dois vocabulários não se tocam
(RN-556).

## Parte 4 · História

### LEELA-S1245 · A lista de interesses nasce da taxonomia (E12)

**Job story.** Quando eu digo o que me interessa na Arena, eu quero escolher dentro das
categorias que o produto já usa nos clubes e desafios, para receber experiências que têm a ver
comigo — e para que a lista que eu vejo seja a mesma que organiza o resto da casa, não uma
invenção paralela.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** core + landing (a seção é da S1226) ·
  **Épico:** E12
- **RNs:** RN-553, RN-554, RN-555, RN-556, RN-557 (condicionada)
- **Depende de:** ARENA-4 (o corte) para a T2; a T1 é contrato e não espera veto. A seção em si
  continua sendo a S1226, com os gates dela.

**Critérios de aceite (Given/When/Then)**

- **Dado** o core buildado, **quando** um consumidor importa a derivação, **então** recebe os 3
  pilares na ordem de `PILARES` e, por pilar, os termos na ordem de declaração das fontes — e um
  teste compara a lista derivada contra `CATALOGO_ACOES` e `MODALIDADES_CLUBE` elemento a
  elemento (nenhuma cópia literal em consumidor nenhum).
- **Dado** um termo removido da constante, **quando** o build roda, **então** a lista derivada
  não o contém, sem mudança em código de tela — e o teste que afirmava o termo cai (a remoção é
  visível, nunca silenciosa).
- **Dado** um doc de Arena com id órfão, **quando** a seção renderiza, **então** o termo não
  aparece, nada quebra, e nenhum processo escreve no doc; **quando** a própria pessoa salva,
  **então** só o vocabulário vigente persiste.
- **Dado** a seção de interesses com doc vazio, **quando** abre, **então** nenhum termo está
  pré-selecionado e a Arena vazia segue válida (RN-471).
- **Dado** o corte do dono respondido (ARENA-4), **quando** a lista exposta é montada, **então**
  cada rótulo exibido mapeia para um id canônico da fonte, e os cinco pares fundidos gravam o id
  declarado na resposta — nunca dois ids para o mesmo interesse.
- **Dado** o radar e os agregados de desafio, **quando** a suíte roda, **então** nada do E20 e
  nada de `progressoPorPilar` foi tocado por esta frente — fronteira provada por ausência de
  diff nesses territórios.

**Tarefas** — a lista com território e gates vive em [[04-fila-codigo]].

## Parte 5 · Vetável — o dono decide

### ARENA-4 · Vocabulário · o corte da lista derivada de pilares e modalidades

Você decidiu o método em 09/08: a lista sai dos pilares e modalidades disponíveis. A derivação
está especificada (RN-553 a RN-556) e encontrou a escolha que só você pode fazer: as fontes se
sobrepõem em cinco práticas e algumas ações têm rótulo de hábito, não de interesse. A tabela
abaixo é a lista derivada **integral**, com a origem de cada termo — você corta, acrescenta e
renomeia, e o que sair vale como vocabulário da Arena e da categorização futura da home
(D-0802-1).

**A proposta (default — opção 1):** 20 termos em 3 pilares, com os cinco pares fundidos:

| Pilar | Termo proposto | Origem (id canônico) |
|---|---|---|
| Físico | Corrida | fusão: ação `correr` + modalidade `Corrida de rua` |
| Físico | Trail | modalidade `Trail` |
| Físico | Caminhada | fusão: ação `caminhar` + modalidade `Caminhada` |
| Físico | Ciclismo | fusão: ação `pedalar` + modalidade `Ciclismo` |
| Físico | MTB | modalidade `MTB` |
| Físico | Natação | fusão: ação `nadar` + modalidade `Natação` |
| Físico | Triatlo | modalidade `Triatlo` |
| Físico | Musculação | ação `musculacao` |
| Físico | Funcional | modalidade `Funcional` |
| Físico | Yoga e alongamento | fusão: ação `yoga-alongamento` + modalidade `Bem-estar/Yoga` |
| Físico | Sono e descanso | ação `dormir-7h` — **rótulo reescrito pela esteira** (era hábito) |
| Mental | Leitura | ação `ler` |
| Mental | Estudos e cursos | ação `estudar-curso` |
| Mental | Escrita e journaling | ação `journaling` |
| Mental | Menos tela | ação `limitar-tela-noite` — **rótulo reescrito pela esteira** |
| Mental | Trabalho focado | ação `trabalho-focado` |
| Espiritual | Meditação | ação `meditar` |
| Espiritual | Respiração consciente | ação `respiracao-consciente` |
| Espiritual | Gratidão | ação `gratidao-diaria` |
| Espiritual | Desconexão digital | ação `desconexao-digital` |

- **Caso de uso:** a Ana abre a Arena e escolhe interesses numa lista que é a mesma taxonomia dos
  clubes e desafios. Se a lista dela disser "Corrida" e o clube disser "Corrida de rua", é a
  mesma coisa com dois nomes — e é você quem diz qual nome o produto fala.
- **Job story:** quando eu escolho o que me interessa, eu quero categorias com nome de interesse
  e não de tarefa, para me reconhecer na lista em vez de decifrá-la.
- **O que fica com você:** o corte — quais dos 20 entram, quais rótulos mudam, e se as fusões
  propostas valem. Dois rótulos foram **reescritos pela esteira** ("Sono e descanso", "Menos
  tela") porque o original era hábito de desafio; estão marcados para o seu veto ser barato.
- **Por que agora:** a tela de interesses da S1226 não nasce sem a lista, e a mesma lista serve a
  categorização da home que você disse que vai mexer — nascer uma vez, num lugar só, evita duas
  listas divergindo.
- **Uma honestidade de medição:** a proposta não traz "eventos por termo" porque não há massa —
  a produção congelada em 10/08 tem 2 eventos de teste ("5k"/"10k"/"Inscrição de teste"). A
  ancoragem é a taxonomia canônica (RN-114 + modalidades do clube), não uso real que ainda não
  existe.
- **Opções:** **ratificar a tabela** (20 termos, fusões e rótulos como estão — default proposto)
  · **cortar/acrescentar/renomear** sobre a tabela, e a RN-557 nasce na forma da resposta ·
  **só pilares** (a tela oferece Físico/Mental/Espiritual sem granular — a lista mínima que a
  sua frase permite; barata e pobre, registrada porque é defensável).
- **Onde aterrissa:** RN-557 em [[LEELA-E12-landing]] (nasce na forma da resposta); `S1245-T2`
  em [[04-fila-codigo]]. Detalhe em `02-rodadas/2026-08-10-arena-2-lista/03-spec.md`.

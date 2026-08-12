---
tags: [leela, arena, modalidades, strava, taxonomia, vetavel, rodada, leva8]
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8
data: 2026-08-12
---

# A lista de modalidades, derivada do Strava — e o corte que fica com o dono

> **Origem.** Decisão **ARENA-4** do dono em 12/08 (fala na íntegra em [[01-decisoes-dono]]
> §4): *"Essa listagem deve ser baseada nas modaliades disponiveis no strava (para as
> fisicas), ja a mental e espiritual voce já deveria ter as opções...."*
>
> **O que este arquivo é.** A tabela derivada integral, com a origem de cada termo, e os
> cortes, fusões e acréscimos propostos, cada um com a razão escrita. **A tabela é vetável
> barato**: enquanto a tela de interesses não nascer, cortar, renomear ou trazer de volta
> qualquer linha custa uma frase.
>
> **O que este arquivo não é.** Não é código, não é constante e não é a fonte. A fonte
> continua sendo o core, pela RN-553; o que muda é de onde a parte física dela vem, pela
> RN-563.

## 1 · O gate de frescor — consultado em 2026-08-12

A RN-563 exige que a lista física seja derivada da lista oficial **vigente** do Strava, com a
URL e a data da consulta registradas. Consulta desta rodada:

| Fonte | URL | O que dá | Consultada em |
|---|---|---|---|
| Enum da API (autoridade dos identificadores) | `https://developers.strava.com/swagger/sport_type.json` | **56** valores de `SportType`, na grafia exata que a API usa | 2026-08-12 |
| Central de ajuda (nomes e agrupamento humano) | `https://support.strava.com/en-us/articles/15402005-supported-sport-types-on-strava` | **52** tipos em 5 grupos, com o nome que a pessoa lê no aplicativo | 2026-08-12 |

**Uma armadilha, medida e registrada para quem refizer o gate.** A página de referência da
API, `https://developers.strava.com/docs/reference/`, **não enumera o `SportType`**. Ela dá
três exemplos ("Run, MountainBikeRide, Ride") e um link de modelo. Quem for buscar a lista por
ela sai com três termos e a impressão de ter conferido.

**A diferença entre as duas fontes é de 4, e ela tem nome.** `VirtualRide`, `VirtualRun`,
`VirtualRow` e `PhysicalTherapy` existem no enum da API e **não** aparecem na lista humana da
central de ajuda. Os quatro estão entre os cortes propostos abaixo, e a coincidência não é
acidente: o próprio Strava não os trata como modalidade que uma pessoa escolhe.

### Os 56 valores do enum, na íntegra

`AlpineSki` · `BackcountrySki` · `Badminton` · `Basketball` · `Canoeing` · `Cricket` ·
`Crossfit` · `Dance` · `EBikeRide` · `Elliptical` · `EMountainBikeRide` · `Golf` ·
`GravelRide` · `Handcycle` · `HighIntensityIntervalTraining` · `Hike` · `IceSkate` ·
`InlineSkate` · `Kayaking` · `Kitesurf` · `MountainBikeRide` · `NordicSki` · `Padel` ·
`PhysicalTherapy` · `Pickleball` · `Pilates` · `Racquetball` · `Ride` · `RockClimbing` ·
`RollerSki` · `Rowing` · `Run` · `Sail` · `Skateboard` · `Snowboard` · `Snowshoe` · `Soccer` ·
`Squash` · `StairStepper` · `StandUpPaddling` · `Surfing` · `Swim` · `TableTennis` · `Tennis` ·
`TrailRun` · `Velomobile` · `VirtualRide` · `VirtualRow` · `VirtualRun` · `Volleyball` ·
`Walk` · `WeightTraining` · `Wheelchair` · `Windsurf` · `Workout` · `Yoga`

## 2 · A tabela proposta — 50 termos em 3 pilares

O pilar **Físico** deriva do Strava, com as fusões abaixo e os três acréscimos declarados. Os
pilares **Mental** e **Espiritual** saem do catálogo interno (RN-114, as 16 ações), sem uma
linha de mudança contra a tabela de 10/08 — é o que a frase do dono manda (*"voce já deveria
ter as opções"*).

**A coluna de origem carrega o contrato.** O que fica gravado é o identificador canônico, nunca
o rótulo, pela RN-554. Rótulo muda barato; identificador gravado é contrato.

### Pilar Físico — 41 termos

**A pé**

| Termo proposto | Origem |
|---|---|
| Corrida | `Run` + ação `correr` + modalidade `Corrida de rua` |
| Trail run | `TrailRun` + modalidade `Trail` |
| Caminhada | `Walk` + ação `caminhar` + modalidade `Caminhada` |
| Trilha | `Hike` |
| Cadeira de rodas | `Wheelchair` |

**Pedal**

| Termo proposto | Origem |
|---|---|
| Ciclismo | `Ride` + ação `pedalar` + modalidade `Ciclismo` |
| Mountain bike | `MountainBikeRide` + modalidade `MTB` |
| Gravel | `GravelRide` |
| Bicicleta elétrica | fusão: `EBikeRide` + `EMountainBikeRide` |
| Handbike | `Handcycle` |

**Água**

| Termo proposto | Origem |
|---|---|
| Natação | `Swim` + ação `nadar` + modalidade `Natação` |
| Remo | `Rowing` |
| Canoagem e caiaque | fusão: `Canoeing` + `Kayaking` |
| Stand up paddle | `StandUpPaddling` |
| Surfe | `Surfing` |
| Kitesurfe | `Kitesurf` |
| Windsurfe | `Windsurf` |
| Vela | `Sail` |

**Academia e treino**

| Termo proposto | Origem |
|---|---|
| Musculação | `WeightTraining` + ação `musculacao` |
| Treino funcional | `Workout` + modalidade `Funcional` |
| Crossfit | `Crossfit` |
| HIIT | `HighIntensityIntervalTraining` |
| Pilates | `Pilates` |
| Yoga e alongamento | `Yoga` + ação `yoga-alongamento` + modalidade `Bem-estar/Yoga` |

**Quadra e raquete**

| Termo proposto | Origem |
|---|---|
| Futebol | `Soccer` |
| Basquete | `Basketball` |
| Vôlei | `Volleyball` |
| Tênis | `Tennis` |
| Beach tennis | **acréscimo** — não existe no Strava (§4) |
| Padel | `Padel` |
| Squash | `Squash` |
| Badminton | `Badminton` |
| Tênis de mesa | `TableTennis` |
| Pickleball | `Pickleball` |
| Golfe | `Golf` |

**Outros**

| Termo proposto | Origem |
|---|---|
| Escalada | `RockClimbing` |
| Skate | `Skateboard` |
| Patins | `InlineSkate` |
| Dança | `Dance` |
| Triatlo | **acréscimo** — modalidade do clube, não existe no Strava (§4) |
| Sono e descanso | ação `dormir-7h` — **rótulo reescrito pela esteira** (era hábito) |

### Pilar Mental — 5 termos

| Termo proposto | Origem |
|---|---|
| Leitura | ação `ler` |
| Estudos e cursos | ação `estudar-curso` |
| Escrita e journaling | ação `journaling` |
| Menos tela | ação `limitar-tela-noite` — **rótulo reescrito pela esteira** |
| Trabalho focado | ação `trabalho-focado` |

### Pilar Espiritual — 4 termos

| Termo proposto | Origem |
|---|---|
| Meditação | ação `meditar` |
| Respiração consciente | ação `respiracao-consciente` |
| Gratidão | ação `gratidao-diaria` |
| Desconexão digital | ação `desconexao-digital` |

## 3 · Os 16 cortes propostos, cada um com a razão

Cortar é a parte da proposta que mais merece o veto dele, porque cortar é o que a lista não
consegue desfazer sozinha: termo que não está na lista é interesse que ninguém declara, e o
dado não nasce.

| Tipo do Strava | Razão do corte |
|---|---|
| `AlpineSki` | neve não tem prática no Brasil; o bloco inteiro sai junto |
| `BackcountrySki` | idem |
| `NordicSki` | idem |
| `Snowboard` | idem |
| `Snowshoe` | idem |
| `IceSkate` | gelo, mesma razão do bloco de neve |
| `RollerSki` | treino de esqui fora da neve; sem público sem o esporte-mãe |
| `VirtualRide` | modo de execução, não modalidade — e o próprio Strava não o expõe na lista humana |
| `VirtualRun` | idem |
| `VirtualRow` | idem |
| `Elliptical` | é aparelho de academia, não interesse — "Treino funcional" e "Musculação" cobrem o job |
| `StairStepper` | idem |
| `PhysicalTherapy` | é cuidado clínico, não interesse; e a lista humana do Strava não o traz |
| `Velomobile` | veículo de nicho sem prática mensurável no Brasil |
| `Racquetball` | quase inexistente no país; "Squash" e "Padel" ficam e cobrem a vizinhança |
| `Cricket` | idem |

**O corte do bloco de neve e gelo tem condição de reabertura própria**, e ela vale a pena estar
escrita: se a Leela abrir experiência fora do Brasil, os sete voltam de uma vez, e voltam da
mesma fonte, sem redesenho.

## 4 · Os três acréscimos — onde a esteira opinou

| Termo | Por que entra, mesmo não vindo da fonte |
|---|---|
| **Beach tennis** | não existe no enum do Strava e é a modalidade de crescimento mais visível no Brasil. Deixá-la de fora seria deixar a fonte externa decidir o vocabulário de um mercado que ela não cobre |
| **Triatlo** | é uma das 9 modalidades do clube desde sempre e **não tem equivalente no Strava**, que trata triatlo como três atividades separadas. Tirá-la seria perder vocabulário que já é da casa |
| **Sono e descanso** | vem da tabela de 10/08, com o rótulo já reescrito de hábito para interesse. Fica no Físico, como estava |

Os três são **termos órfãos da fonte externa**, e a RN-563 exige que órfão seja **declarado**,
nunca silencioso: a derivação sabe que eles não vêm do Strava e diz isso, para o gate de
frescor da próxima consulta não os tratar como termo que o Strava removeu.

## 5 · As duas fusões propostas

| Fusão | Termo resultante | Razão |
|---|---|---|
| `EBikeRide` + `EMountainBikeRide` | Bicicleta elétrica | a distinção entre elétrica de rua e elétrica de trilha é de registro de treino, não de interesse declarado |
| `Canoeing` + `Kayaking` | Canoagem e caiaque | as duas nomeiam a mesma prática para quem escolhe interesse; o rótulo carrega as duas palavras de propósito, para ninguém procurar a que falta |

As **cinco fusões da tabela de 10/08** sobrevivem inteiras dentro do mapeamento novo, e nenhuma
precisou ser refeita: Corrida, Caminhada, Ciclismo, Natação e Yoga e alongamento continuam
juntando a ação do catálogo, a modalidade do clube e agora o tipo do Strava sob um rótulo só.

## 6 · A conta, para o veto ser conferível

- 56 tipos no enum do Strava
- menos 16 cortados = 40
- menos 2 pela fusão de dois pares = **38 termos vindos do Strava**
- mais 3 acréscimos declarados (beach tennis, triatlo, sono e descanso) = **41 no Físico**
- mais 5 no Mental e 4 no Espiritual = **50 termos**

**As 9 modalidades do clube estão todas cobertas.** Corrida de rua, Trail, Caminhada, Ciclismo,
MTB, Natação, Funcional e Bem-estar/Yoga entram por fusão com o tipo do Strava correspondente; o
Triatlo entra como órfão declarado. **As 16 ações do catálogo estão todas cobertas**, 7 no
Físico, 5 no Mental e 4 no Espiritual.

## 7 · O que esta tabela não decide

- **Não muda visibilidade.** O ARENA-1 foi decidido na mesma leva: o dado nasce guardado, a
  RN-471 governa o default restrito e a RN-472 continua intocada.
- **Não toca a modalidade do evento.** `Evento.modalidades` segue texto livre do organizador
  pelas RN-500 a RN-505. Esta lista não valida, não sugere e não restringe percurso.
- **Não instala a categorização da home.** A home é do dono pela D-0802-1. A lista fica pronta
  para consumo, não instalada.
- **Não integra com o Strava.** Usar o catálogo de nomes do Strava como base de vocabulário e
  conectar a conta de alguém ao Strava são duas coisas sem relação. A segunda é o
  [[LEELA-E14-integracoes-treino]] e não é assunto desta rodada.

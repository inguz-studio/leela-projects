# Sugestões de vocabulário para a home — hub de experiências de bem-estar

Rodada 2026-08-02 · task R2 da lane RETOMADA-SEAL · trace `leela-build-2d6ee98d`.
Autoridade: **D-0802-1** (`01-decisoes.md`). Insumo para o dono editar a landing quando quiser.

Este documento não muda uma linha de código. A jornada de compra já foi corrigida nas tasks C1 e
C1-LEGAL; a home ficou de fora porque o dono avisou que mexe nela pessoalmente. O que segue são
quatro direções fechadas, cada uma com o texto pronto para colar, e uma recomendação.

## O que está no ar hoje

| Superfície | Texto atual | Arquivo |
|---|---|---|
| Eyebrow do hero | Corrida de rua | `app/(public)/page.tsx:76` |
| H1 | Ache sua próxima corrida e garanta a inscrição em minutos. | `page.tsx:79` |
| Subline | Percurso, kit e retirada num lugar só. Você escolhe a distância, a gente cuida do resto — sem criar conta para começar. | `page.tsx:82` |
| CTA do hero | Ver eventos | `page.tsx:90` |
| Título da dobra | Eventos abertos | `page.tsx:104` |
| Estado vazio | Quando um organizador publicar uma **corrida**, ela aparece aqui na hora. | `page.tsx:118` |
| Nav do header | Eventos | `app/components/PublicHeader.tsx:47` |
| Tagline do rodapé | Inscrições para eventos de bem-estar, sem enrolação. | `app/components/PublicFooter.tsx:48` |
| `<title>` e OG | Leela — inscrições para corridas | `app/layout.tsx:32`, `page.tsx:52` |
| Descrição OG | Encontre corridas de rua, escolha seu percurso e garanta sua inscrição em minutos. | `page.tsx:54` |

Duas coisas saltam dessa tabela. A primeira é que o rodapé **já** fala de bem-estar (mudou no C1)
enquanto o H1 duas dobras acima ainda fala de corrida: a página se contradiz sozinha. A segunda é
que o catálogo também já contradiz o H1. Dos cinco eventos vigentes em produção hoje, um é
`Desafio MTB Costa da Lagoa 2026` e outro é `Retiro Bem-Estar Rio Vermelho 2026`. A pessoa que
chega pela promessa de corrida encontra um retiro na terceira linha da grade. Não é uma questão
de posicionamento futuro, é uma incoerência que já está no ar.

## O critério que usei

Uma direção boa faz três coisas ao mesmo tempo: sustenta a categoria guarda-chuva sem soar
genérica, deixa a pessoa que quer uma corrida reconhecer que ela vai achar uma corrida, e não
promete inventário que a Leela não tem. As quatro abaixo pontuam diferente nesses três eixos, e é
por isso que valem como escolha e não como variação de redação.

---

## Direção 1 · troca só o substantivo da categoria

**Eyebrow:** Experiências de bem-estar
**H1:** Ache sua próxima experiência e garanta a vaga em minutos.
**Subline:** Corrida de rua, retiro, pedal, treino de clube. Você escolhe, a gente cuida da inscrição, do kit e da retirada — sem criar conta para começar.
**Nav:** Experiências · **Dobra:** Experiências abertas · **Busca:** Buscar experiências
**Vazio:** Quando um organizador publicar uma experiência, ela aparece aqui na hora.

A leitura mais literal de D-0802-1, e a mais barata de aplicar. A estrutura do H1 que já está no
ar não muda ("ache sua próxima X e garanta Y em minutos"), só o substantivo. O preço disso é que
"experiência" sozinha não diz nada a quem chega: ninguém acorda querendo comprar uma experiência,
a pessoa quer correr dez quilômetros no domingo. A subline carrega o peso todo de traduzir o
abstrato em coisas reconhecíveis, e por isso ela precisa vir com as instâncias logo na primeira
frase, não no fim.

## Direção 2 · a enumeração no H1, o guarda-chuva na plataforma

**Eyebrow:** Corridas, retiros e clubes
**H1:** Corrida, retiro ou treino de clube: ache o seu e garanta a vaga em minutos.
**Subline:** As inscrições das experiências que cuidam de você, num lugar só. Percurso, kit e retirada sem criar conta para começar.
**Nav:** Experiências · **Dobra:** Experiências abertas · **Busca:** Buscar por tipo, cidade ou data
**Vazio:** Quando um organizador publicar uma experiência, ela aparece aqui na hora.

Aqui o H1 nomeia as instâncias e o vocabulário guarda-chuva vive na navegação, nos rótulos de
plataforma e na subline. Quem procura corrida lê "corrida" na primeira linha; quem procura retiro
lê "retiro" na mesma linha. Ganha em reconhecimento e em busca orgânica, que hoje inteira depende
do termo "corrida" aparecer na página. Perde em elegância e envelhece pior: cada categoria nova
obriga a reescrever o H1, e uma enumeração de cinco itens não cabe numa dobra.

## Direção 3 · o benefício antes da categoria

**Eyebrow:** Bem-estar com data marcada
**H1:** Reserve o dia em que você vai cuidar de você.
**Subline:** Corridas de rua, retiros e experiências de clube em Florianópolis. Inscrição, kit e retirada num lugar só.
**Nav:** Experiências · **Dobra:** Próximas experiências · **Busca:** O que você quer fazer?
**Vazio:** Quando um organizador publicar uma experiência, ela aparece aqui na hora.

A única das quatro que diz o que a pessoa leva em vez do que a plataforma vende, e a única que
faz o posicionamento de bem-estar ser *sentido* em vez de declarado. "Reservar o dia" também
resolve um problema que "inscrição" tem: inscrição é vocabulário de organizador, quem compra
está marcando um compromisso consigo mesmo. O risco é real e vale dizer com todas as letras: é a
direção mais distante do que está no ar, a mais difícil de acertar o tom, e a que menos entrega
palavra-chave para busca. Se a home for a principal porta de entrada orgânica, esta direção cobra
esse preço em tráfego.

## Direção 4 · o hub declarado

**Eyebrow:** Hub de experiências
**H1:** As experiências de bem-estar de Floripa, num lugar só.
**Subline:** Corridas de rua, pedais, retiros e treinos de clube. Inscrição em minutos, sem criar conta.
**Nav:** Experiências · **Dobra:** Todas as experiências · **Busca:** Buscar por tipo, cidade ou data
**Vazio:** Quando um organizador publicar uma experiência, ela aparece aqui na hora.

Esta é a que fala a linguagem exata do verbatim, e é a que eu **não** recomendaria hoje. "Num
lugar só" é uma promessa sobre inventário, e o inventário são cinco eventos de uma cidade. Quem
chega procurando o calendário do mês e encontra cinco cards sente a distância entre a promessa e
a página na hora. A direção não está errada, está adiantada: ela passa a ser a mais forte das
quatro no dia em que a grade tiver volume que a sustente, e o texto fica aqui esperando esse dia.

---

## Recomendação

**Direção 2 no hero, vocabulário da Direção 1 em todo o resto da plataforma.** Uma escolha, e o
motivo dela: a dobra de cima é onde reconhecimento vale mais que coerência de marca, e a
navegação é onde a categoria se define para valer. O H1 enumerado faz a pessoa se reconhecer em
três segundos; os rótulos de plataforma ("Experiências", "Experiências abertas", "Buscar
experiências") ensinam a categoria nova em toda visita seguinte, sem pedir nada da primeira. A
migração natural, quando o catálogo crescer, é o H1 da Direção 2 dar lugar ao da Direção 4 sem
tocar em mais nada — porque o resto do vocabulário já vai estar no lugar certo.

Se o dono preferir apostar em diferenciação em vez de reconhecimento, a Direção 3 é a que carrega
a marca mais longe. Nesse caso, vale medir: a home é rastreada, e trocar as palavras-chave é a
mudança com efeito mais fácil de observar.

## Rótulos que valem em qualquer direção

Estes independem da escolha do hero e são a parte do vocabulário que a plataforma emite:

| Hoje | Proposto | Onde |
|---|---|---|
| Ver eventos | Ver experiências | CTA do hero |
| Eventos abertos | Experiências abertas | título da dobra |
| Eventos (nav) | Experiências | header |
| ...publicar uma **corrida**, ela aparece aqui | ...publicar uma **experiência**, ela aparece aqui | estado vazio |
| Leela — inscrições para corridas | Leela — inscrições para experiências de bem-estar | `<title>`, OG e Twitter |
| Encontre corridas de rua, escolha seu percurso... | Encontre corridas, retiros e experiências de clube, e garanta sua vaga em minutos. | descrição OG |
| `1 evento disponível` / `N eventos disponíveis` | `1 experiência disponível` / `N experiências disponíveis` | contador da dobra |

Uma ressalva sobre o `<title>` e a descrição OG: eles alimentam busca e preview de link, então
mudá-los tem efeito fora da página. Recomendo trocar junto com o hero, numa edição só, para que a
página e o snippet de busca não digam coisas diferentes por semanas.

## Superfícies vizinhas que o mesmo texto arrasta

Achados da varredura desta lane, todos na landing, todos vocabulário de **plataforma** (a Leela é
quem escreve, não o organizador). Ficaram de fora do R1 porque D-0802-1 §2 reserva a landing ao
dono, e ficam registrados aqui para não se perderem:

1. **`RegulamentoModal.tsx:47`** — título do modal: "Regulamento da prova". O conteúdo dentro
   dele é do organizador e não muda; o rótulo é nosso. Sugestão: "Regulamento do evento" ou
   "Regulamento da experiência", casando com o termo de saúde que o C1-LEGAL já ajustou.
2. **`RegulamentoSection.tsx:32`** — "leia o regulamento oficial da prova". Mesma troca.
3. **`GaleriaSection.tsx:21,26,31`** — os `alt` das três imagens descrevem corrida de rua
   ("Grupo de corredores na largada", "Corredora comemorando a chegada da prova"). São imagens
   mock de uma galeria genérica servida a qualquer evento, inclusive ao retiro de bem-estar. Um
   leitor de tela hoje anuncia corredores na página de um retiro. Isto é defeito de acessibilidade
   além de vocabulário, e é o item desta lista que eu trataria primeiro.
4. **`lib/tipos.ts:153`** — comentário de campo, "texto do regulamento da prova". Invisível ao
   usuário; troca cosmética, sem urgência.

O que **não** entra em lista nenhuma, para deixar a fronteira escrita: nome, descrição,
distâncias, modalidades e regulamento dos eventos são conteúdo do organizador. A meia-floripa é
uma corrida e continua se chamando assim em toda superfície.

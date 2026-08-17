---
tags: [leela, adr, arquitetura, design-system, painel, frontend, a11y]
---

# ADR-019 · Faceta de status de inscritos — exceção registrada ao limiar da `FilterChips`

> Autor: sf-frontend-lead (Software Forge) · Trace: leela-roadmap-componentes-20260810 · lane CONTROLES-C3 · Data: 2026-08-16
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> Origem: achado de execução da Onda C3 (`02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md`)
> ao converter `eventos/inscritos/InscritosView.tsx:390` — a faceta de status — para `FilterChips`.

**Contexto.** `InscritosView.tsx` mostra a faceta de status (dor #1: "não sei quem
pagou") como controle segmentado — quatro chips (`Confirmado`/`Pendente`/
`Cancelado`/`Estornado`) mais "Todos", cada um com contagem, clicáveis diretamente.
`STATUS_INSCRITO` (`packages/core/src/eventos/inscrito.ts:71-76`) tem **exatamente
quatro** valores. A `FilterChips` (Onda C0) fecha por construção o limiar do
cânone §1 ("seleção única exclusiva com 4+ valores usa `Combobox`"): a partir de
`options.length >= 4`, ela renderiza um `Combobox` de popover em vez da fileira de
chips — e `options` aqui não conta o "Todos" (que é sempre a mais), então quatro
status reais já cruzam o limiar. Convertida sem ajuste, a faceta trocaria clique
direto no chip por abrir o popover e escolher — dois gestos onde havia um.

**Por que isto não foi visto antes da execução.** O inventário de 2026-08-12 já
tinha declarado esta lacuna por escrito (§8): *"Contagem de valores por faceta.
Não medi quantas opções cada uma das doze facetas tem, então não sei quantas
passam do limiar de quatro."* A fila de ondas cita `InscritosView:390` só pela
nuance da contagem por chip (*"a FilterChips precisa suportar `count` sem que a
tela o desenhe"*, resolvida — `FilterChipsOption.count` cobre isso), sem checar o
limiar. A checagem só ficou possível lendo o enum real do core durante a conversão.

**Critérios de decisão** (nesta ordem): 1. zero passo novo na interação mais usada
da tela (dor #1, RN implícita da S203); 2. honrar o cânone §1 onde ele não colide
com (1); 3. não reimplementar a peça — usar `FilterChips` sempre que o resultado
bater com o desenho dela; 4. registro honesto quando (1) e (3) colidem, em vez de
forçar a peça a produzir um resultado pior.

**Decisão — mantém a fileira de `Chip` manual para ESTA faceta, como exceção
registrada (governança §8, critério (b): "há necessidade técnica forte que o
primitivo do DS não atende").** A `FilterChips` é adotada em todo o resto da Onda
C3 (`CampanhasList` canal, `AfiliadosPage` tipo, e as demais famílias desta
tela — `FilterBar`, `ResultCount`, `CheckboxField`). Só a faceta de status de
`InscritosView.tsx` fica de fora, e fica **nomeada**: o comentário no código aponta
para este ADR.

**Nota importante: o "Ver pendentes" do banner de inadimplência não depende deste
controle.** `setStatus('pendente')` é chamado direto pelo botão do banner
(`InscritosView.tsx`, bloco de inadimplência) — o caminho mais usado da dor #1 não
passa pela fileira de chips e não muda com esta decisão de forma alguma. O que fica
protegido é a troca MANUAL entre status (ex.: conferir cancelados, depois
estornados), que hoje é um clique por troca.

**Alternativas rejeitadas.**
- **Converter e aceitar o Combobox:** rejeitado — o critério de aceite comum da
  rodada é explícito: *"Onda que baixa o número de divergências e sobe o número
  de passos não fecha."* Regra geral, não só do balcão.
- **Adicionar um prop de override (`forcarFileira`/`maxFileira`) na `FilterChips`
  nesta lane:** tocaria a peça-fonte fora do escopo de uma onda de conversão de
  tela, abriria a porta para toda tela "escolher" fugir do limiar por
  conveniência — exatamente o que "fechado por construção" existe para impedir.
  Fica registrado como possível follow-up de DS (ver Consequência), não decidido
  aqui.
- **Remover `estornado` da lista de opções filtráveis para cair a 3 valores:**
  rejeitado por ser decisão de PRODUTO (o que o organizador pode filtrar),
  não de componente — fora da autoridade desta lane.

**Status.** Aplicada nesta lane (CONTROLES-C3, 2026-08-16). Decisão técnica, sem
dinheiro nem dado pessoal envolvido — não aguarda ratificação do Vitor, com
condição de reabertura explícita abaixo.

**Consequência.**
- (+) Zero passo novo na troca manual de status — comportamento idêntico ao de
  antes da rodada.
- (+) A dívida fica nomeada em vez de silenciosamente absorvida: esta instância
  segue contando em `faceta-crua` na catraca do `gate-canon` até uma das
  condições de reabertura se cumprir.
- (−) `InscritosView.tsx` mantém uma montagem de faceta à mão, a única desta
  onda. `Chip` (canônico) e a estrutura `role="group"` seguem corretas — o que
  não migrou foi a MONTAGEM, não o controle.
- **Condição de reabertura:** (a) a `FilterChips` ganha um jeito explícito, pedido
  pelo autor da tela, de honrar um limiar maior que 4 quando o autor decide que
  clique-direto vale mais que o limite genérico; ou (b) `STATUS_INSCRITO` cai
  para 3 valores por decisão de produto. O que vier primeiro reabre esta
  instância para conversão.

---

## ⛔ SUPERADO em 2026-08-17 pela decisão do dono (leva 20)

> Lane FILTROS-LISTA · trace `leela-redesign-v2-20260810` · registro em
> `02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md`, leva 20 item 1.

**A fala, na íntegra:** *"novamente, voco colocol pills no lugar de filtros, em Membros, em duas
fileiras, quanto poderiamos apenas ter filtros. Isso ficou confuso na tela de clubes, na hora de
filtrar colunas, quero que voce aplique o componente dos filtros em lista. e eles devem ficar
alinhados ao lado do pesquisador, assim como em DEsafios. Para padronizar. (me refiro a rota dos
clubes), mas isos deve ser aplicar no projeto inteiro."*

**O que caiu.** Este ADR inteiro se apoiava numa régua: *"onda que baixa o número de divergências e
sobe o número de passos não fecha"*. A régua não era errada — ela só não era a régua do dono. Ele
pediu clareza de padrão, e pagou por ela o clique que este ADR protegia. Quem manda no padrão é
ele, então a régua de cliques perde e fica escrito que perdeu.

**Nenhuma das duas condições de reabertura precisou se cumprir.** A (a) pedia à `FilterChips` um
jeito de honrar limiar maior; a (b), que `STATUS_INSCRITO` caísse para três valores. O que
aconteceu foi maior: **o limiar deixou de existir**, então não há limiar a honrar. Isso vale a
lição — uma condição de reabertura escrita como "a peça ganha um escape hatch" pressupõe que a
regra sobrevive. Ela pode simplesmente morrer.

**O que a medição de 17/08 acrescentou, e que este ADR não tinha como ver.** A fileira não mostra o
NOME da faceta: ele só existia no `aria-label`. Em Membros o organizador via
`Todos · Ativos · Novos · Inativos · Todos · Owner · Admins · Membros` — dois "Todos" colados, sem
nada dizendo onde acaba Status e começa Papel. O clique economizado saía caro em legibilidade, e
esta conta não estava na balança de 16/08.

**Estado do código.** `InscritosView.tsx` usa `FilterChips` para a faceta de status, dentro da
`FilterBar` (ela morava solta abaixo dela). A contagem por status continua: vive na lista, e o
total do recorte fica no gatilho. `faceta-crua` cai de 2 para 0 na catraca do `gate-canon`.

**O que NÃO mudou:** o `setStatus('pendente')` do banner de inadimplência. O caminho mais usado da
dor #1 nunca passou por este controle e continua a um clique.

**Fica válido deste ADR:** o registro de que a exceção existiu e por quê. Não apagar.

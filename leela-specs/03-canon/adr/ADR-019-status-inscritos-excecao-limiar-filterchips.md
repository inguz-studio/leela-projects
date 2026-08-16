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

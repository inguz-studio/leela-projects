---
tags: [leela, adr, arquitetura, design-system, painel, frontend, a11y]
---

# ADR-020 · Faceta de status de eventos globais — exceção registrada ao limiar da `FilterChips`

> Autor: sf-frontend-lead (Software Forge) · Trace: leela-roadmap-componentes-20260810 · lane CONTROLES-C6 · Data: 2026-08-16
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> Origem: achado de execução da Onda C6 (`02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md`)
> ao converter `plataforma/eventos/EventosGlobaisRoute.tsx:117` — a faceta de status — para `FilterChips`.
> Segundo caso do MESMO mecanismo do ADR-019 (`InscritosView.tsx`, Onda C3) — a condição de
> reabertura "a peça ganha um jeito de honrar limiar maior" que o ADR-019 registrou ainda não foi
> paga, então este ADR se junta a ele em vez de reabri-lo (reabrir é decisão de DS, fora desta lane).

**Contexto.** `EventosGlobaisRoute.tsx` mostra a faceta "Filtrar por status" do
diretório global de eventos: `FILTROS_STATUS_EVENTO`
(`apps/painel/src/routes/plataforma/_lib/listasGlobais.ts:41-47`) tem `todos` mais
**quatro** status reais (`rascunho`/`publicado`/`ao_vivo`/`encerrado`), clicáveis
direto num `Chip` cada. A `FilterChips` (Onda C0) fecha por construção o limiar do
cânone §1: a partir de `options.length >= 4` (sem contar "Todos"), a faceta
EXCLUSIVA vira `Combobox` de popover em vez da fileira. Convertida sem ajuste, a
troca de status custaria abrir o popover e escolher — dois gestos onde havia um.

**Um segundo motivo, que o ADR-019 não tinha.** Esta faceta tem `disabled={porTenant}`
— quando a tela está filtrada por tenant, os quatro chips de status ficam
desabilitados em bloco (o recorte por tenant e o recorte por status são mutuamente
exclusivos nesta leitura, ver comentário `EventosGlobaisRoute.tsx:22-25`).
`FilterChipsProps` não tem prop `disabled` — a peça nasceu para filtro sempre ativo,
e as cinco peças da C0 mediram 12-13 consumidores cada sem esta necessidade. Mesmo
se o limiar de 4 não existisse, esta faceta ainda precisaria de uma capacidade que a
`FilterChips` hoje não tem.

**Critérios de decisão, os mesmos do ADR-019** (nesta ordem): 1. zero passo novo na
interação; 2. honrar o cânone §1 onde não colide com (1); 3. não reimplementar a
peça — usar `FilterChips` sempre que o resultado bater com o desenho dela; 4.
registro honesto quando (1)/(3) colidem com o limiar, em vez de forçar um resultado
pior.

**Decisão — mantém a fileira de `Chip` manual para esta faceta, como exceção
registrada (governança §8, critério (b): "há necessidade técnica forte que o
primitivo do DS não atende").** `ListaGlobal` (que hospeda esta tela) passa a
compor `FilterBar` nesta mesma onda — a faceta entra no slot `facets` da
`FilterBar` exatamente como está hoje, sem o `FilterChips` por dentro.

**Alternativas rejeitadas.**
- **Converter e aceitar o `Combobox`:** rejeitado pelo mesmo critério de aceite
  comum da rodada ("onda que sobe passo não fecha").
- **Estender `FilterChipsProps` com `disabled` e/ou um escape hatch de limiar
  nesta lane:** tocaria a peça-fonte fora do escopo de uma onda de conversão de
  tela, e faria isso pela SEGUNDA vez sem que a condição de reabertura do
  ADR-019 (pedido explícito, decidido como follow-up de DS) tivesse sido
  formalmente aberta como trabalho próprio. Registrado como candidato a essa
  futura lane de DS — ver Consequência.
- **Remover o `disabled` e deixar status e tenant combinarem:** rejeitado por ser
  decisão de leitura de dado (`_lib/listasGlobais.ts:22-25` documenta que não
  existe reader que aceite os dois recortes ao mesmo tempo), fora da autoridade
  desta lane.

**Status.** Aplicada nesta lane (CONTROLES-C6, 2026-08-16). Decisão técnica, sem
dinheiro nem dado pessoal envolvido — não aguarda ratificação do Vitor, com
condição de reabertura explícita abaixo.

**Consequência.**
- (+) Zero passo novo na troca de status — comportamento idêntico ao de antes da
  rodada, `disabled` durante recorte por tenant preservado.
- (+) A dívida fica nomeada: esta instância segue contando em `faceta-crua` na
  catraca do `gate-canon` até uma das condições de reabertura se cumprir.
- (−) `EventosGlobaisRoute.tsx` mantém uma montagem de faceta à mão — a única
  desta onda. `Chip` (canônico) e a estrutura `role="group"` seguem corretas; o
  que não migrou foi a MONTAGEM.
- **Condição de reabertura, agora com DOIS consumidores nomeados (`InscritosView`
  do ADR-019 e esta):** (a) a `FilterChips` ganha `disabled` e um jeito explícito
  de honrar limiar maior que 4 quando o autor da tela decide que clique-direto
  vale mais que o limite genérico — dois consumidores reais é o sinal que a
  spec original (`02-catraca-controles.md` §7) previu como "se um caso legítimo
  aparecer, ele volta como decisão, não como prop" a favor de abrir essa lane de
  DS; ou (b) `FILTROS_STATUS_EVENTO` cai para 3 valores reais por decisão de
  produto. O que vier primeiro reabre as duas instâncias (ADR-019 e este) para
  conversão na mesma lane.

---

## ⛔ SUPERADO em 2026-08-17 pela decisão do dono (leva 20)

> Lane FILTROS-LISTA · trace `leela-redesign-v2-20260810` · registro em
> `02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md`, leva 20 item 1.
> Cai junto com o ADR-019, como os dois previram ("o que vier primeiro reabre as duas instâncias").

**A fala, na íntegra:** *"novamente, voco colocol pills no lugar de filtros, em Membros, em duas
fileiras, quanto poderiamos apenas ter filtros. (...) quero que voce aplique o componente dos
filtros em lista. e eles devem ficar alinhados ao lado do pesquisador, assim como em DEsafios. Para
padronizar. (...) mas isos deve ser aplicar no projeto inteiro."*

**Este ADR tinha duas pernas, e as duas caíram por motivos diferentes.**

1. **O limiar de quatro valores** — superado pela decisão do dono: filtro de listagem é lista em
   qualquer contagem. A régua de cliques perdeu para a régua de clareza.
2. **A falta de `disabled` na `FilterChips`** — esta não foi superada, foi **paga**. A prop entrou
   na `FilterMenu` e na `FilterChips` no mesmo commit da peça, com teste dos dois modos. Era
   exatamente a condição de reabertura (a) escrita aqui: *"a `FilterChips` ganha `disabled`"*. A
   dívida foi quitada, não perdoada.

Registrar a diferença importa: a segunda perna teria caído mesmo sem o dono, no dia em que alguém
pagasse a prop. A primeira só caiu porque ele decidiu.

**Estado do código.** `EventosGlobaisRoute.tsx` usa `FilterChips label="Status" disabled={porTenant}`.
O gatilho inteiro desliga durante o recorte por tenant — o estado fica num lugar só, em vez de uma
guarda por handler. O `todos` sai de `options` (`FILTROS_STATUS_EVENTO.filter(...)`), porque a peça
desenha o "Todos" dela e mandar os dois produziria duas linhas iguais na lista. `faceta-crua` cai
de 2 para 0 na catraca do `gate-canon`.

**Fica válido deste ADR:** o registro da exceção e, sobretudo, o mecanismo — um ADR que nomeia a
capacidade que falta na peça é o que faz a capacidade ser construída. Não apagar.

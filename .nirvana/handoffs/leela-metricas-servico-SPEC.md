# Handoff · SPEC-METRICAS-SERVICO

- trace: `leela-pixreal-diag-20260804` · lane SPEC-METRICAS-SERVICO · employee sf-cto
- Modo: SÓ `leela-specs/` — nenhuma linha de código, Rule, function ou app tocada. A lane
  SPEC-CONTAS-LANDING aterrissou no meio (`7a2a2b26`) e a BUILD-MOTION antes dela (`bf93ed51`,
  `504b5b3a`); nada meu encostou em `apps/`, `packages/` ou `functions/`.
- Insumos lidos: verbatim do dono de 05/08 mais a correção da unidade do piso; épicos E03, E04,
  E09, E11, E12 e E16; índice de RNs; rodadas TAXA-FLEX (19/07), DEC-0726B (26/07), PIXFIX-EXTREF
  (03/08), juros-margem e qualificação (04/08); CONVENCAO-BOARDS; DECISOES-ABERTAS.
  **Código, só leitura:** `agregarFinanceiro.ts`, `virarLote.ts`, `createInscricaoCharge.ts`,
  `webhookPagamento.ts`, `expirarPixPendente.ts`, `expirarCarrinhosAbandonados.ts`,
  `estornarInscricao.ts`, `guardPreco.ts`, `guardPrecoLote.ts`, `aggregateProfessionalDashboard.ts`,
  `coletaDiaria.ts`, `rollups.ts`, `asaasProvider.ts`, `taxaPlataforma.ts`, `saleState.ts`,
  `repasse.ts`, `calc.ts`, `pagamento.ts`, `pedido.ts`, `politicaVendas.ts`, `lote.ts`,
  `vitrine.ts`, `kpis.ts`, `alerts.ts`, `carrinho.ts`, `OverviewKpis.tsx`, `OverviewPage.tsx`,
  `InscritoSlideIn.tsx`, `TaxaGlobalRoute.tsx`, `firestore.rules`, `preview-seed-extra.ts`.

## Números reservados nesta lane

- Decisões: **D-0805-1** a **D-0805-4** (varredura: nenhum `D-0805-*` fora desta rodada; a lane
  SPEC-CONTAS-LANDING não usa esse esquema, ela nomeia por item de painel).
- RNs: **RN-486 a RN-496**. Varredura por `RN-48[6-9]` e `RN-49[0-9]` sobre `leela-specs/`,
  `apps/`, `packages/`, `functions/src/` e `firestore.rules`: único hit é a RN-499, marcador de
  faixa sem enunciado, deixado de fora de propósito. A faixa 476-485 estava reservada à
  SPEC-CONTAS-LANDING, que consumiu só até a 482 — **483, 484 e 485 ficaram vagas**, e o buraco
  está declarado nas armadilhas de busca do índice para não virar mistério.
- Stories: **S221** (E03), **S907** e **S908** (E09), **S824** (E11), **S1231** (E12). Varredura:
  zero hits para as cinco.
- Itens de painel: **SERV-1**, **SERV-2**, **SERV-3**, **INSCR-1** e **CONV-1**.

## Estado por task

- [x] T1 — rodada nova `02-rodadas/2026-08-05-metricas-e-servico/` com `01-decisoes-dono.md`
      (verbatim integral + a correção "É POR PEDIDO"), `02-spec-metricas-e-servico.md`,
      `03-rns-delta.md` e `04-fila-codigo.md`.
- [x] T2 — spec por item: os cinco pedidos do dono, mais dois achados que a fala não previa.
- [x] T3 — RN-486 a RN-496 canônicas em E03, E04, E09, E11 e E12, na mesma aterrissagem.
- [x] T4 — índice de RNs: linha nova da faixa, prosa do próximo número de 482 para 496, e o buraco
      483-485 declarado.
- [x] T5 — fila de código com 16 tarefas em 4 frentes, 6 marcadas ⚔.
- [x] T6 — painel: cinco itens novos, todos com default em vigor.
- [x] T7 — kanban: três cards no padrão épico → história → tarefa, com o ⚔ na tarefa.

## Os dois achados que mudaram o desenho

**1. O contador de inscritos também é a fechadura da configuração comercial.** `qtdInscritos > 0`
é a prova de "este evento já vendeu" em oito guardas — `firestore.rules:526-533, 557-561`
(percursos e modalidades), `:675-681` (`taxaModo`), `:1002, 1015, 1025` (kits), mais
`guardPreco.ts:41-44` e `guardPrecoLote.ts:63-82`. Redefinir o campo para contar só pagante
**descongelaria a configuração de qualquer evento com PIX pendente**, deixando o organizador
trocar percurso, kit ou modo da taxa por baixo de uma compra em andamento. Motivo operacional que
fechou a decisão: Rules e painel são dois deploys, e a janela entre eles seria uma janela de
configuração destravada em produção. **Recomendação registrada como RN-487: campo novo para a
tela, campo antigo para a fechadura.**

**2. O piso de R$ 3,00 pode ultrapassar a face.** Numa venda de R$ 2,00 em modo `incorporada`, o
líquido do organizador ficaria negativo, e o clamp em zero que existe uma camada acima esconderia
a divergência em vez de resolvê-la. Default proposto na RN-494 (o Serviço nunca ultrapassa a face)
e item **SERV-2** do painel, porque a solução de verdade é preço mínimo de venda, que o produto
não tem.

## O veredito sobre capacidade

**Contar só pagante no painel não abre sobrevenda.** Métrica e capacidade nunca foram o mesmo
número: `lotes/{loteId}.vendidos` é recomputado por `virarLote.ts:166-171` sobre
`STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado']` (`:67`), com gatilho guardado por mudança
de status, e é ele que o gate de venda lê (`lote.ts:218-220` → `saleState.ts:60-63, 326`). A
recomendação do maestro está certa na conclusão e **já implementada na origem** — não há contador
novo a criar. A janela em que N PIX pendentes passam pelo `computeSaleState` é anterior, vem da
RN-158 e não é tocada por esta rodada.

## Contagem de visitantes

**Não existe, em grau mais forte do que a suspeita do dono.** Nenhum SDK instrumentado
(`@firebase/analytics` só no lock, como transitiva; zero `getAnalytics`, `logEvent`, `gtag`,
plausible, posthog, umami, mixpanel), nenhum contador no Firestore, e nada fora dele. A conversão
não é calculável, `derivarTaxaConversao` já devolve `null` e a única chamada real passa `null`
literal. **A tela nunca inventou número.** O que ela faz de errado é manter o rótulo
`visitantes → inscritos` na tela com valor `—`, prometendo capacidade ausente.

Achado de passagem: os 68,2% e 42% que aparecem em preview são literais de mockup injetados por
`functions/scripts/preview-seed-extra.ts:1170-1171, 1282`, com `computadoEm` carimbado dez anos no
futuro para o rollup nunca recomputar. Rodado fora do emulador, isso congela o dashboard daquele
profissional permanentemente. Dívida nomeada, fora do escopo.

## O piso, em número

Com a linha vigente de 10,5% e fixo zero, o piso morde em **toda compra de até R$ 28,52**.

| Face | Serviço hoje | com piso | efetivo |
|---|---|---|---|
| R$ 5,00 | R$ 0,53 | R$ 3,00 | 60,0% |
| **R$ 10,00** | **R$ 1,05** | **R$ 3,00** | **30,0%** |
| R$ 20,00 | R$ 2,10 | R$ 3,00 | 15,0% |
| R$ 28,52 | R$ 2,99 | R$ 3,00 | 10,52% |

Nos dois modelos, sobre R$ 10,00: em **repassada** o comprador paga R$ 13,00 em vez de R$ 11,05;
em **incorporada** (o default) o organizador recebe R$ 7,00 em vez de R$ 8,95. Efeito de segunda
ordem: em repassada a base do parcelamento sobe junto, mudando a escada sob a `parcelaMinima`.

## Renome

35 strings visíveis, 34 a trocar e 1 a suprimir. **Quatro superfícies já estão limpas** — e-mail,
PDF do ingresso, CSV (financeiro e de inscritos) e área do cliente. **O gateway não muda de nome
porque não tem nome no produto** (zero strings visíveis para Asaas, MDR, adquirente). Dois
defeitos achados de passagem: `OverviewKpis.tsx:110` é a única ocorrência visível de "Taxa Leela"
no produto, e `InscritoSlideIn.tsx:553` mostra ao produtor um campo chamado **"Taxa Be Hero"** com
o valor da taxa dentro, o que viola a RN-404 além de carregar a marca anterior.

## Fronteiras declaradas, não resolvidas

- **O inscrito fantasma.** PIX expirado ou falho deixa o inscrito em `pendente` para sempre;
  nenhum código apaga inscrito e `expirarPixPendente` é callable de cliente sem cron. Uma cobrança
  gerada e nunca paga congela a configuração do evento indefinidamente. Frente própria.
- **`receitaSemana`, `ticketSparkline` e `receitaPorModalidade`** são lidos pela tela e nunca
  gravados em produção. A UI esconde cada um, então não há defeito visível.
- **O `computadoEm` no futuro** do seed de preview.
- **O item 23** (se o reembolso devolve o Serviço fora da janela) segue aberto; o piso apenas
  aumenta o valor em disputa.

## Coordenação

`git commit --only` nas duas passadas, sem `--amend`. Os arquivos compartilhados
(`DECISOES-ABERTAS`, índice de RNs, `V1-KANBAN`, E12) só foram tocados **depois** de a lane
SPEC-CONTAS-LANDING aterrissar em `7a2a2b26` e a árvore ficar limpa — enquanto o trabalho dela
estava vivo no working tree, a primeira passada consumiu apenas a rodada nova e os quatro épicos
que ninguém disputava.

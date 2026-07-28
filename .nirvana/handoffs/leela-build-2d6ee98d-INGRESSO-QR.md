# Handoff · Lane INGRESSO-QR · trace leela-build-2d6ee98d

- **Employee:** `sf-backend-lead` (software-forge)
- **Repo:** `C:\dev\LEELA`, branch `main`. **SEM push** — 5 commits locais.
- **Fonte da spec:** E12 (emissão + e-mail), E03 (tabela + credenciamento),
  rodada `leela-specs/02-rodadas/2026-07-28-ingresso-qr/`.
- **Estado:** fila fechada, exceto `S1206-T7` (bloqueado por dependência
  ausente — ver abaixo). **Aguarda INGQR-REV.**

## Achado que mudou o escopo (registrado antes de codar)

A spec dá `S1206-T5` como dependente de `S1206-T1`. **`S1206-T1` a `T4` não
existiam no código.** Prova em 2026-07-28: `qrToken` só era escrito pelo
**seed** (`functions/src/seed/inscritos.seed.ts`); nenhum dos três
confirmadores emitia ingresso; não havia disparo de e-mail de compra nem
qualquer geração de PDF no repo (varredura por `pdfkit|jspdf|puppeteer|
pdf-lib|application/pdf` = zero).

Consequência assumida (o brief manda "emissão na confirmação, no fluxo
existente"):

- `S1206-T5` absorveu **a emissão inteira** — `qrToken` + `ingressoEmitidoEm`
  (o que era T1) **e** o código da RN-396.
- `S1206-T6` absorveu **o disparo** ao responsável (o que era T3) com o
  conteúdo da RN-398.
- `S1206-T7` **fica bloqueado**: sem PDF não há onde acrescentar o código. O
  pareamento código+QR já é um shape único (`IngressoEmitido`) que o futuro
  PDF consome sem retrabalho.

## Placar

| Task | Estado | Commit |
|---|---|---|
| S1206-T5 · código identificador + emissão do ingresso ⚔ | ✅ | `182bc99` |
| S1206-T6 · e-mail de compra com QR e código ⚔ | ✅ | `a58ee35` |
| S211-T1 · coluna do código e QR por linha | ✅ | `bf2ec05` |
| S211-T2 · virada de vocabulário | ✅ | `ca6baf2` |
| S211-T3 · rota `/credenciamento` + redirect RN-234 | ✅ | `a089ba2` |
| S1206-T7 · código no PDF | 🧊 bloqueado | — |

## RNs cobertas

- **RN-396** (código identificador): `packages/core/src/tickets/
  codigoIngresso.ts` + `functions/src/eventos/emitirIngressos.ts`.
- **RN-397** (código na tabela, QR sob demanda): `InscritosView.tsx`,
  `QrIngressoModal.tsx`, `inscritosFiltro.ts`.
- **RN-398** (conteúdo e degradação do e-mail): `functions/src/email/
  templates.ts` + `enviarIngressos.ts`.
- **RN-399** (credenciamento): SubNav, KitsLayout, banner do balcão, estados,
  rótulo de área, alerta do dia, rota + redirect.
- **RN-218/219/220/234** reusadas sem alteração de contrato.

## Decisões de arquitetura desta lane (para a review morder)

1. **Unicidade por CHAVE PRIMÁRIA, não por sorteio.**
   `eventos/{id}/ingressoCodigos/{codigo}` é lido e criado com `tx.create`
   DENTRO da transação que grava o inscrito. Query `where codigoIngresso ==`
   apostaria no bloqueio de faixa de índice, que o Firestore não promete para
   resultado vazio. A coleção não tem `match` em Rules de propósito: cai no
   deny-by-default.
2. **Emissão POS-confirmação, fora da transação do dinheiro**, best-effort,
   no mesmo ponto e com a mesma postura de
   `dispararContaSemFriccaoPosConfirmacao`. Uma transação por inscrito.
3. **Token emitido nunca é re-assinado.** Depois de rotação de chave isso
   produziria token diferente do que está no celular da pessoa, e
   `classificarCheckinQr` compara byte a byte.
4. **Sem chave Brevo o e-mail não envia E NÃO REGISTRA.** Registrar queimaria
   a idempotência da RN-219 de um envio que nunca houve.
5. **QR do e-mail como data URI**, não imagem remota: URL pública carregaria a
   credencial de presença. Custo assumido: Gmail e Outlook desktop não
   renderizam data URI — por isso o código em texto é o caminho principal.
6. **`qrcode@1.5.4` entrou no painel**, a mesma versão que `functions` já usa.
   Uma implementação de QR no produto inteiro.

## Gates (comando + resultado literal)

| Gate | Comando | Saída |
|---|---|---|
| core tsc | `npx tsc --noEmit` (packages/core) | exit 0 |
| core eslint | `npx eslint src --max-warnings 0` | exit 0 |
| core build | `npx tsup` | exit 0 |
| functions tsc | `npx tsc --noEmit` (functions) | exit 0 |
| functions eslint | `npx eslint src --max-warnings 0` | exit 0 |
| functions build | `npx tsc` | exit 0 |
| emulador (17 suítes) | `npx firebase-tools@13 emulators:exec --project demo-leela "…vitest run …"` | **17 files / 322 tests passed** · exit 0 |
| painel tsc | `npx tsc --noEmit` | exit 0 |
| painel eslint | `npx eslint src --max-warnings 0` | exit 0 |
| painel suíte | `npx vitest run` | **186 files / 1697 tests passed** · exit 0 |
| painel build | `npx vite build` | exit 0 |

Suítes do emulador: `codigoIngressoCore`, `emitirIngressos.integration`,
`emailIngressos.integration`, `inscritosRules`, `inscrito`, `inscritoPedido`,
`inscritoPedidoRules.integration`, `qrToken`, `qrCheckin.integration`,
`comunicacoesLog.integration`, `logComunicacaoCore`,
`webhookAsaas.integration`, `checkoutS1203.integration`,
`checkoutS1203.attack`, `checkoutFoundation.integration`,
`contaCriadaTemplate`, `criarPublicarEvento.integration`.

## Rules

`codigoIngresso` entrou em `semCamposDeFunctionInscrito` e
`camposDeFunctionIntocados` (firestore.rules) e em `CAMPOS_FUNCTION_INSCRITO`
(core). Atacado com **papel real** (`marinaClaims`, tenant writer) em
`inscritosRules.test.ts`: create com código forjado, update e limpeza — as
três negadas.

## Riscos declarados

1. **Contenção real entre duas emissões concorrentes do mesmo código.** O
   teste força a colisão pelo RNG, não pelo relógio. A reserva por `tx.create`
   é a garantia; não há prova sob concorrência de processos.
2. **Entrega real do e-mail não foi provada** (Brevo por injeção, sem rede).
   Data URI não renderiza no Gmail nem no Outlook desktop — o caminho
   degradado carrega o ingresso, mas o dono vai ver e-mail sem QR nesses
   clientes. **Decisão de produto aberta.**
3. **"Link do ingresso" da RN-398 não tem destino.** O e-mail leva à página do
   evento (`urlPublicaDoEvento`), porque a página própria do ingresso é
   S1206-T4/E13 e não existe. Inventar URL que dá 404 seria pior.
4. **Bundle do painel** cresceu com `qrcode` (2.20 MB, já acima do aviso de
   500 KB antes desta lane). Não foi feito code-split.
5. **Preview do dono**: o seed passou a gravar `codigoIngresso` e as reservas,
   e o batch caiu de 400 para 200 (dois writes por inscrito). Exige **re-seed**
   para o dono ver a coluna preenchida.
6. **Sem navegador nesta lane** — nenhuma prova visual. O QR na tela não foi
   lido por scanner real.

## O que fica para a INGQR-REV (obrigatória)

- **⚔ S1206-T5**: a reserva por chave primária realmente serializa? O
  `TENTATIVAS_CODIGO_INGRESSO = 8` desiste cedo demais? O ramo "token existe,
  código não" preserva mesmo o carimbo original?
- **⚔ S1206-T6**: a escolha do data URI; a chave de idempotência quando o
  pedido não tem inscrito responsável; o `enfileirado` órfão em falha de envio
  (não há sweeper).
- **Fronteira quente**: `functions/src/checkout` recebeu 3 linhas (uma por
  confirmador) e `functions/src/email/templates.ts` recebeu um bloco no fim —
  acréscimo, zero reorganização. Conferir contra o pacote E08 (`S706-T2`) na
  próxima aterrissagem.
- **Assertion swap declarado**: em `emailIngressos.integration.test.ts` a
  asserção anti-injeção `not.toContain('onerror=')` foi **substituída por uma
  mais forte** (`toContain` da forma escapada exata + `not.toMatch(/<img[^>]*
  onerror/i)`), porque a original dava falso positivo sobre texto inerte. E a
  asserção `texto` sem markup virou asserção de **header injection** (CR/LF no
  assunto), porque `text/plain` não interpreta markup. Nenhuma outra asserção
  foi removida.
- **Teste que não testava**: o dublê do `EventoLayout` no gate da RN-234 não
  tinha `<Outlet/>` — qualquer rota filha de `:slug` passava sem renderizar.
  Corrigido nesta lane; vale varrer outros dublês de layout.

## Reaproveitado vs criado

**Reaproveitado:** `assinarQrToken`/`obterQrKeyring`/`QrKeyring`;
`classificarCheckinQr` e `registrarCheckinCore` (intocados);
`registrarComunicacao` (RN-219); `selectEmailProvider` + port `EmailProvider`;
`gerarQrDataUrl` e `urlPublicaDoEvento`; `layoutBase`/`botaoLink`/`escapeHtml`/
`limparCampoCurto`/`isLinkDeAppValido` do templates.ts; padrão
`dispararContaSemFriccaoPosConfirmacao`; `RedirectLegado` (RN-234);
`Modal`/`Table`/`SearchInput` do DS; `filtrarInscritos`/`contadorInscritos`;
`--table-header-spacing` (mesmo tratamento do código de convite do clube);
`ALFABETO_CODIGO_CONVITE` como precedente de alfabeto sem ambíguos.

**Criado:** `packages/core/src/tickets/codigoIngresso.ts`;
`functions/src/eventos/emitirIngressos.ts`;
`functions/src/email/enviarIngressos.ts`; `renderIngressosCompraEmail` +
`isQrDataUriValido` em templates.ts;
`apps/painel/.../inscritos/QrIngressoModal.tsx`; `codigoCasaBusca`;
`RedirectCredenciamento`; 3 arquivos de teste novos.

## Boards

`V1-KANBAN.md` (cards de S1206 e S211 no padrão épico→história→tarefa, com
hash por tarefa e o bloqueio do T7 declarado) e `BOARD-EPICOS.md` (linhas de
E03 e E12).

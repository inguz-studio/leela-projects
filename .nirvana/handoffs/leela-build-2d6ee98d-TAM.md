# Checkpoint — TAMANHOS-GRADE (retomada 1) · trace leela-build-2d6ee98d

employee: sf-backend-lead · model: Fable · project_dir: C:\dev\LEELA
brief original: `.nirvana/briefs/leela-tamanhos-grade-enriched.md`
brief retomada: `.nirvana/briefs/leela-tamanhos-grade-RETOMADA-enriched.md`

## Estado atual
- Fase: INVENTÁRIO do WIP herdado (nenhum commit ainda; main == origin == 2b60f2f).
- WIP confirmado no disco: 763 ins / 79 del em 15 arquivos rastreados (bate com o brief de retomada).
- Arquivos da lane: core/kit.ts, core/aprovisionamento.ts, core/validarTamanhos.ts, core/index.ts,
  functions/agregarEstoque.ts, functions/createInscricaoCharge.ts, functions/index.ts,
  functions/__tests__/aprovisionamentoCore.test.ts, api-client/{checkout,eventos/kits,eventos/mutations,index}.ts,
  firestore.rules.
- NÃO são da lane (não commitar/reverter): .nirvana/HANDOFF.md, leela-specs/00-boards/V1-KANBAN.md, produto/00-MOC-produto.md.

## Premissas assumidas
1. **WIP herdado: APROVEITAR-E-COMPLETAR (todos os 15 arquivos).** Critério: o diff é
   coerente ponta a ponta (nenhum arquivo pela metade), documenta as decisões que o brief
   exigia e estende o existente (RN-223/S210) sem paralelo. Nada foi refeito; TUDO tratado
   como rascunho até gate verde.
2. **Chave de SKU (decisão herdada do WIP, ratificada por mim):** unissex = chave legada
   `itemId__tamanho` (2 segmentos, docs existentes SÃO os mesmos, zero migração);
   feminina/masculina = `itemId__corte__tamanho` (3 segmentos). `unissex` explícito como
   segmento é REJEITADO no parse (chave canônica única — evita dividir estoque do mesmo
   SKU em duas grafias). Corte = enum fechado sem `__` ⇒ bijeção do round-trip.
3. **Valor persistido em `inscrito.tamanhos[itemId]` = SUFIXO do SKU** (`'M'` ou
   `'feminina__M'`) — mantém a agregação como UMA equality no subcampo do map (RN-224),
   sem índice novo.
4. **Semântica de "encerrar encomendas" (RN-232, premissa documentada no código):** todos
   os SKUs do item em `estimativa` → `encomendado` com qtd = qtdVendida do instante (foto
   transacional única). NÃO fecha vendas do kit, NÃO congela escolha do comprador; a
   diferença pós-foto aparece em `aEncomendar`/alertas. Idempotente por máquina de estados.
5. **Corte unissex permitido** (default ratificado do maestro): grade única, M/F nunca
   obrigatório.
6. **`salvarItemKit` com grade:** UI espelha `tamanhosDisponiveis` = união dos tamanhos da
   grade (superfícies legadas continuam exibindo algo); validação/SKU leem a grade efetiva.

## Tasks
- [x] T1 — modelo grade corte→tamanho (core + rules + SKU) + backend do ciclo (estoque 2D,
      encerrarEncomendasItem RN-232, validação checkout na origem, api-client). WIP herdado
      APROVEITADO e provado: tsc/eslint 0 (core/functions/api-client/painel/landing) ·
      unit puras 67/67 (aprovisionamentoCore+validarTamanhos+kit, incl. novas de grade) ·
      integração emulator TESTE 8080 via emulators:exec (JDK 21 de ~/.jdks — firebase-tools
      15.22.4 recusa o Java 17 do PATH): estoque 21/21 (grade 2D, retrocompat, estorno 2D,
      encerrar RN-232 foto/idempotência/guards, rules grade) · checkout 12/12 (honesto grade,
      5 ataques). Fixtures do painel ganharam `corte: 'unissex'`.
- [x] T2 — ciclo do organizador no painel: (a) ItemKitModal ganha GRADE por corte
      (checkbox por corte + tamanhos CSV; legado carrega como unissex; salvar grava
      grade + união em tamanhosDisponiveis; item que vira "único" REMOVE a grade —
      api-client aceita grade:null→deleteField); (b) encomenda = coluna Vendido por
      corte×tamanho (coluna Corte só quando há separação); (c) botão "Encerrar
      encomendas · item" + ConfirmModal com semântica explícita → callable RN-232
      (hook useEncerrarEncomendasItem); (d) ajuste de estoque 2D = fluxo em_estoque
      existente por SKU 3-seg (modal mostra o corte); (e) coluna Entregues
      (entregues/escolhidos por SKU, derivação pura do fulfillment do balcão
      presencaRegistrada) + checklist do balcão mostra corte+tamanho escolhidos.
      Lib pura nova: apps/painel/src/routes/eventos/_lib/gradeTamanhos.ts.
      Gates: tsc/eslint painel 0 · RTL novas verdes · suíte painel COMPLETA
      1232/1232 (baseline 1167 + novas).
- [x] T3 — checkout corte-primeiro na landing: leitor público projeta
      `itensTamanhados` (id/nome/kits/grade efetiva via gradeDoDocItemKit — Postel,
      isolamento por tenant); StepModalidadeKit ganha SeletorGradeItem na ordem
      RATIFICADA (corte → tamanho; unissex pula direto), POR inscrito; trocar
      corte/kit/modalidade zera a escolha; valor = sufixo de SKU; validação de
      obrigatoriedade no avançar do step 0; payload envia `tamanhos` por inscrito
      (o servidor revalida fail-closed). Kit sem grade mantém a nota antiga.
      Gates: tsc/eslint landing 0 · RTL nova 5/5 · suíte landing completa 60/60.
- [x] T-extra — eventoSlug no reader do promotor (commit separado):
      `getMinhasAfiliacoes`/`getAfiliadosDoTenant` projetam `eventoSlug` (fallback
      docId — convenção slug≡id do seed); api-client tipa; MinhasAfiliacoesPage
      troca "Copiar código" por "Copiar link" `{PUBLIC_BASE}/{slug}?ref=` (mesmo
      formato da AfiliadosPage; doc sem slug degrada p/ código). Gates: tsc/eslint 0
      (functions+api-client+painel) · afiliados.integration 28/28 no emulator
      firestore+auth 8480/9598 (firebase.r6.json, config da lane R9-E) com assert
      novo de eventoSlug · RTL painel influenciadores 16/16.
- [x] Gates: tsc/eslint 0 (5 pacotes) · unit 67/67 · emulator estoque 21/21 + checkout 12/12
      (:8080) + afiliados 28/28 (:8480/:9598 r6) · painel 1232/1232 · landing 60/60 · RTL novas
      (re-run final do painel completo em andamento pós T-extra)
- [x] Review antagonista Fable contexto fresco: **REQUEST_CHANGES → fixes aplicados e
      re-provados** (`87d5dd9`). 5 vetores do brief MORTOS com prova (fuzz 200k no
      round-trip, 0 colisões). A1 ALTO (recoleta da transferência aceitava sufixo
      forjado — 2º produtor de escrita de inscrito.tamanhos) CORRIGIDO + teste;
      A3 (item envenenado derrubava agregação) CORRIGIDO + teste; A5 (sufixo cru no
      detalhe do inscrito) CORRIGIDO; A7 (eco sem truncar) CORRIGIDO; A2 MÉDIO =
      decisão REGISTRADA no report (flip exigirTamanhado OFF durante deploy casado —
      ligar é decisão do Vitor); A4/A6 registrados como follow-ups.
      Re-prova: requestTransfer 14/14 · checkout 12/12 · estoque 22/22 · RTL inscritos
      32/32 · tsc/eslint 0 nos arquivos da lane (lint painel-inteiro falha em arquivo
      UNTRACKED de outra lane ativa — apps/painel/src/components/upload/ — fora do escopo).
- [x] Aterrissagem: épicos E03 (RN-231/232 + entrega) e E08 (follow-up eventoSlug PAGO) +
      BOARD-EPICOS + V1-KANBAN (card novo) + BOARD-HISTORICO (verbatim) + report
      `outputs/leela-build-2d6ee98d/TAMANHOS-GRADE-REPORT.md` (com veredito da review).

## Commits
- `09be9e7` [LEELA-TAM-T1] · `9270083` [LEELA-TAM-T2] · `b1d7e82` [LEELA-TAM-T3] ·
  `2cc75bb` [LEELA-TAM-TX] · `87d5dd9` [LEELA-TAM-TFIX] · + commit de docs [LEELA-TAM-TD].
  Push incremental; main == origin ao fechar.

## Estado final
Lane CONCLUÍDA. Escopo T1→T2→T3→T-extra entregue com gates verdes e review antagonista
fechada com fixes re-provados. Pendências/follow-ups no report (deploy casado, flip
exigirTamanhado, seed de exemplo com grade, A4/A6, borda `_` no docId).

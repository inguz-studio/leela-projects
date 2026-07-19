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
- [ ] T2 — ciclo do organizador no painel (encomenda/encerrar/estoque 2D/entregas)
- [ ] T3 — checkout corte-primeiro na landing
- [ ] T-extra — eventoSlug no reader do promotor (commit separado)
- [ ] Gates: tsc/eslint 0 · unit core · integração emulator teste (portas próprias, NUNCA 8180) · suíte painel · suíte landing · RTL UIs novas
- [ ] Review antagonista Fable contexto fresco + fixes re-provados
- [ ] Aterrissagem: boards + épicos E03/E08 + report outputs/leela-build-2d6ee98d/

## Commits
(nenhum ainda)

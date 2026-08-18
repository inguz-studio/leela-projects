# Handoff selado · ADMIN-VISAO onda 1 — lane de fix (ONDA1-FIX)

- **trace_id:** `leela-admin-visao-20260809`
- **lane:** ONDA1-FIX · empresa software-forge · perfil `sf-backend-lead` (contexto fresco)
- **insumos:** handoff da review (`...ONDA1-REV.md`, fix list D-1/D-2/D-3+D-4/D-6) + handoff do construtor (`...ONDA1.md`)
- **data:** 2026-08-10
- **deploy:** nenhum (proibido). **Rules:** zero linha tocada.

## Estado

🏁 **Selado.** Quatro defeitos pagos + canário `list` adotado. Quatro commits, gates verdes, push feito.

## Commits (um por defeito; 3+4 agrupados)

| Commit | Defeito | Conteúdo |
|---|---|---|
| `d8e4af8b` | D-1 (MÉDIA) | `rollups.ts`: `.schedule('15 * * * *')` + `.timeZone('America/Sao_Paulo')` — o minuto 15 que o cabeçalho prometia agora é cron explícito, com o timeZone dos 4 crons noturnos da casa. Teste novo `adminVisaoOnda1Agendamento.test.ts` falsifica o manifest (`__endpoint.scheduleTrigger`) sem deploy. |
| `559650a8` | D-2 (MÉDIA) | Isolamento por doc (doutrina F1) em `listarEventosDoTenantPaginado` e `listarEventosGlobalPaginado` — REAPROVEITA o `eventoDegradado` de `eventos/queries.ts` (agora exportado; fora do barrel público). Na global, `tenantId` do placeholder é best-effort do próprio doc (sem filtro de tenant — documentado no reader). 3 testes novos no arquivo mock. |
| `17cd7c84` | D-3 + D-4 (BAIXAS) | `listarClientesDoTenant.ts`: cursor de doc apagado → `failed-precondition` explícito e recuperável (decisão: erro > flag ignorável); cursor não-string/vazio/com `/` e pageSize não inteiro → `invalid-argument` (nunca `internal` opaco). Validação DEPOIS da autorização, ANTES de qualquer leitura (sem PII lida nesses throws, nada registrado como `concedido`). Clamp numérico [1,100] preservado com teste de preservação. 5 testes novos na integração. |
| `664f5273` | D-6 (proposta adotada) | Canário ganha a ponta `list`: `getDocs(query(...))` na subcoleção, `assertFails` nas DUAS pernas do RN-401. Mutação que abrisse só `allow list` não passa mais ilesa. Rules intocadas. |

Push: `2dcc4c8e..664f5273 main -> main` (delta = exatamente os 4 commits desta lane; `2dcc4c8e`, docs da purga, é de outra lane e já estava no remoto — nada dela entrou nos meus commits, `git status --short` conferido antes de cada add).

## Falsificação real (teste FALHA contra o código velho — provado por execução, não por argumento)

- **D-1:** rodei o teste novo ANTES do fix → **2/2 vermelhos**: `expected 'every 1 hours' to be '15 * * * *'` e `expected ResetValue{} to be 'America/Sao_Paulo'` (asserções `expect(endpoint.scheduleTrigger?.schedule).toBe('15 * * * *')` e `...timeZone).toBe('America/Sao_Paulo')`). Depois do fix: 2/2 verdes.
- **D-2:** rodei o arquivo mock ANTES do fix → **2 vermelhos** com o throw real do parser: `Evento e-ruim: janelasEntrega[0] inválida` lançado por `parseEvento` dentro do `map` — `expect(res.itens).toHaveLength(2)` nunca alcançado. Depois: 20/20 verdes. (O 3º teste novo — lista válida sem telemetria — passa por construção nos dois estados; a falsificação está nos dois primeiros.)
- **D-3:** rodei a integração no emulator ANTES do fix → vermelho porque a promise **RESOLVIA** (página 1 de novo) em vez de rejeitar: `promise resolved ... instead of rejecting` na asserção `rejects.toMatchObject({ code: 'failed-precondition' })`. Depois: verde.
- **D-4:** mesmo run vermelho: pageSize `'abc'` rejeitava com `Error { message: 'Value for argument "limit" is not a valid integer.' }` — SEM `code` — contra a asserção `rejects.toMatchObject({ code: 'invalid-argument' })`; cursor `'a/b'` e cursor `42`/`''` idem (3 testes vermelhos). Total do run vermelho: **4 failed | 13 passed**. Depois: verde.
- **D-6:** não é falsificação de código desta lane (Rules intocadas) — é fortalecimento do canário contra mutação futura de `allow list`. Verificação: `assertFails` verde nas duas pernas no estado atual.

## Gates — saída literal (estado final commitado)

| Gate | Comando | Saída literal |
|---|---|---|
| type-check functions | `pnpm --config.verify-deps-before-run=false run type-check` (em `functions/`) | `$ tsc --noEmit` → exit 0, zero erros |
| lint functions | `pnpm --config.verify-deps-before-run=false run lint` | `$ eslint src --max-warnings 0` → exit 0, zero erros/warnings |
| type-check api-client | idem, em `packages/api-client/` | `$ tsc --noEmit` → exit 0 |
| lint api-client | idem | `$ eslint src --max-warnings 0` → exit 0 |
| paginação (mock) | `vitest run src/__tests__/adminVisaoOnda1Paginacao.test.ts` | `Test Files  1 passed (1)` · `Tests  20 passed (20)` · 1.74s |
| agendamento (mock, novo) | `vitest run src/__tests__/adminVisaoOnda1Agendamento.test.ts` | `Test Files  1 passed (1)` · `Tests  2 passed (2)` · 2.16s |
| integração (emulator) | `npx firebase-tools@13 emulators:exec --only firestore "cd functions && pnpm --config.verify-deps-before-run=false exec vitest run src/__tests__/adminVisaoOnda1.integration.test.ts"` | `Tests  18 passed (18)` · 7.84s · `Script exited successfully (code 0)` — log completo em `.nirvana/tmp/onda1fix-emulator-gate.log` |

O emulator subiu de primeira nas três vezes (1 run vermelho de falsificação + 1 run verde pós-fix + 1 run oficial de gate) — a degradação prevista (retry de 5 min) não foi necessária.

## Decisões desta lane (registradas, não silenciadas)

- **D-3 — erro em vez de flag:** a alternativa `cursorPerdido: true` da review foi rejeitada porque flag é sinal ignorável — um consumidor distraído da onda 3 seguiria duplicando itens; `failed-precondition` força o tratamento e a mensagem diz exatamente como recuperar ("recomece sem cursor"). Registrado no commit (`Rejected:`).
- **D-4 — cursor não-string/vazio também é `invalid-argument`:** a review citou só `/` e pageSize; cursor `42` ou `''` era ignorado em silêncio (página 1 disfarçada de continuação) — mesma família de desonestidade do D-3, pago junto. Escopo: ainda dentro de "cursor malformado" do contrato.
- **timeZone literal, não `FUSO_EVENTO`:** 3 dos 4 crons noturnos usam o literal `'America/Sao_Paulo'`; a constante do core é nomeada para o domínio de eventos. Segui a maioria da casa.
- **`eventoDegradado` exportado do módulo, NÃO do barrel:** helper interno de resgate, não API de tela — consumo por import relativo dentro do pacote.

## Dívidas registradas (não pagas, por contrato)

- **D-7 (corrida agendado × manual no rollup):** sem trava de execução única; duas execuções sobrepostas terminam em last-write-wins com possível inversão de frescor (`atualizadoEm` novo carimbando retrato mais velho) pela duração do run. Hoje inofensivo (base pequena, janela de segundos). No mesmo bloco: leitura de termo sequencial por tenant (`await` no loop) — N+1 com timeout default de 60s no v1, risco de estouro conforme `tenants/*` cresce. Pagar quando a onda 2 ligar o botão manual de recompute (S1613-T4).
- **D-5:** desvio documentado herdado (negativa de não autenticado sem registro) — mantido por contrato; a letra da spec segue estreitada por precedente, registrado na review.
- **D-8:** três commits intermediários da lane construtora não compilam (bisect quebrado naquela janela) — histórico, não se conserta. Nesta lane, cada um dos 4 commits foi type-checked + linted ANTES do commit: nenhum intermediário novo quebrado.

## Território honrado

Tocado: `functions/src/platform/{rollups,listarClientesDoTenant}.ts`, `functions/src/__tests__/{adminVisaoOnda1.integration,adminVisaoOnda1Paginacao,adminVisaoOnda1Agendamento}.test.ts`, `packages/api-client/src/eventos/queries.ts` (só o `export` do helper F1 + comentário), `packages/api-client/src/platform/{tenantEventosClubs,listasGlobais}.ts`. **Não tocado:** `firestore.rules`, `apps/`, `packages/design-system/`, barrel `index.ts` do api-client (nada novo na API pública). `git status --short` conferido antes de cada add; todos os commits com `git commit --only <pathspec explícito>`.

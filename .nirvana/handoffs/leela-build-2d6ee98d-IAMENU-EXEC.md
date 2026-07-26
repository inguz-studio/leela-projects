# Handoff vivo · lane IAMENU-EXEC (trace leela-build-2d6ee98d)

- **Employee:** sf-frontend-lead (software-forge) · rota opus, effort xhigh em todas as tasks
- **Repo:** `C:\dev\LEELA` · branch `main` · topo na entrada `aa4c8ff`
- **Natureza:** execução da fila `IAM-T1..T7` (`leela-specs/02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`)
- **Estado:** ✅ **CONCLUÍDA** — 7 tasks, 7 commits, todos pushados

## Baseline medido ANTES de qualquer alteração (2026-07-26)

| Gate | Resultado | Exit |
|---|---|---|
| `tsc --noEmit` (apps/painel) | limpo | **0** |
| `eslint src --max-warnings 0` (apps/painel) | limpo | **0** |
| `vitest run` (apps/painel) | **1285 passed · 2 failed · 1287 total** (168 arquivos: 166 ok, 2 falhos) | 1 |

### ⚠️ Os 2 vermelhos são PRÉ-EXISTENTES e NÃO são desta lane

| Teste | Causa | Commit de origem |
|---|---|---|
| `src/shell/__tests__/sidebar.test.ts` › `/plataforma: nav própria com 6 itens` | `PLATFORM_NAV` ganhou o item `taxa`; a asserção da nav de PLATAFORMA (super-admin) não foi reconciliada | `c6ab442` (taxaflex T6) |
| `src/lib/query/__tests__/mutations.test.tsx` › `useSaveCommercialTerms` | spy chamado com argumentos diferentes do esperado | `a26036b` (CONS-3-T1) |

Nenhum dos dois toca a nav do PRODUTOR nem qualquer território do lote IA-MENU. **Esta lane não os herda e não os conserta** (território de outras lanes; consertar a asserção de `taxa` exigiria afirmar que o item é correto, o que só o dono daquela lane pode). Consequência para o gate literal "suíte INTEIRA verde": ele já era inalcançável na entrada. O critério real desta lane passa a ser **zero vermelho novo** e **zero asserção reescrita nas telas movidas**.

## ⚠️ Conflito de instrução registrado (decisão do employee, aguarda ratificação do maestro)

O despacho trouxe a regra dura adicional **"NUNCA tocar `packages/design-system`"**. Ela colide frontalmente com três artefatos canônicos desta rodada, só no `IAM-T1`:

- `02-fila-codigo.md` (declarado pelo maestro como *o contrato da execução*) fixa o território do T1 como `packages/design-system/src/components/Sidebar/**` · `apps/painel/src/shell/sidebar.ts`;
- `01-mapa-de-para.md` §Arquivos nomeia, linha a linha, `Sidebar.tsx`, `Sidebar.stories.tsx`, `Sidebar.docs.mdx`, `LLM.txt` e `__tests__`;
- **RN-823** (ratificada) crava: *"a supressão do item 'Analytics' deixa de ser um filtro no consumidor e vira remoção no design system"*.

Leitura adotada: no brief enriquecido a frase aparece dentro da seção **"Guia de estilo (critério de aceite)"** — `tokens/temas packages/design-system (proibido tocar o DS em si)`. É regra de **estilo** (consuma tokens; não reestilize/reinvente o DS), não proibição de reconciliar o catálogo de navegação que a rodada inteira existe para corrigir.

**Decisão:** executar o T1 como especificado, com escopo cirúrgico — **só** `src/components/Sidebar/**` (catálogo de itens + testes + stories + docs + LLM.txt). **Zero** token, zero primitivo, zero estilo, zero outro componente do DS tocado. A alternativa (filtrar `financeiro` no consumidor e sobrescrever o rótulo `comunicacao`→CRM no painel) foi **rejeitada**: contradiz a RN-823 explicitamente, deixa o catálogo do DS mentindo e é exatamente o improviso que a regra "nunca improvisar" proíbe.

## Placar por task

| Task | Estado | Commit | Push |
|---|---|---|---|
| IAM-T1 · menu de 6 áreas | ✅ | `41fcb73` | ✅ |
| IAM-T2 · análise → CRM › Visão geral | ✅ | `c1f6f03` | ✅ |
| IAM-T4 · repasses → Eventos | ✅ | `cee7bbe` | ✅ |
| IAM-T3 · CRM com 3 subdivisões | ✅ | `7b78538` | ✅ |
| IAM-T5 · dados de recebimento em Configurações | ✅ | `14f059e` (+ renames em `05708dd`) | ✅ |
| IAM-T7 · Caixa do evento | ✅ | `e5c77cb` | ✅ |
| IAM-T6 · redirects | ✅ | `7a8f158` | ✅ |

### Colateral do maestro registrado (T5)

Os 3 renames da T5 — `DadosBancariosSection.tsx`, `DadosBancariosForm.tsx` e o teste da section, de `eventos/repasses/_components/` para `conta/recebimento/` — aterrissaram **antes**, por engano, no commit de docs `05708dd` do maestro, com **0 mudança de conteúdo**. Efeito colateral: `main` ficou momentaneamente sem compilar (os arquivos no destino ainda importavam os vizinhos da origem). O commit `14f059e` traz o restante da T5 e fecha o buraco. Nada a reverter.

### Dois defeitos meus, pegos antes de subir

1. **T5** — a primeira versão importava o container de dados dentro da `ContaPage`, acorrentando a página inteira (nome, foto, senha, logout) a um QueryClient que ela não usa: **13 testes pré-existentes quebraram**. Redesenhado para slot (`recebimento?: ReactNode`) com o container composto na rota. Os 12 testes de `ContaPage` voltaram **sem uma linha tocada**; só o único que monta `ContaRoutes` ganhou o `QueryClientProvider` que o App.tsx já fornece em produção — harness completado, asserção idêntica.
2. **T6** — a primeira versão exportava `<RotasLegadas />` como **componente**. O `<Routes>` do react-router só aceita `<Route>` ou `React.Fragment` e **lança em runtime** diante de qualquer outro componente: teria derrubado o painel inteiro na primeira renderização, e nenhum `tsc`/`eslint` pegaria. Virou `rotasLegadas()`, função que devolve array de `<Route>`. **Foi o próprio gate orientado a tabela que pegou** — a prova de que ele não era burocracia.

### Prova do gate transversal (asserção reescrita = reprovação)

Medida por `git diff -M --stat`, não por leitura. **Todo arquivo de teste movido saiu com `| 0` — zero inserções, zero deleções:**

- T2 (6 arquivos): `AnaliseVendasView`, `CohortIdadeSexo`, `demografia`, `desempenho`, `modalidades`, `tamanhos`
- T4 (11 arquivos): `SaldoCards`, `HistoricoRepasses`, `RepassesPorEvento`, `SolicitarRepasseModal`, `DadosBancariosSection`, `session`, `dadosBancariosForm`, `estadoRepasse`, `format`, `repassesPorEvento`, `solicitarForm`
- T3: `ClientesPage.test.tsx` e `ClienteDetailPage.test.tsx` **não aparecem no `git status`** — a re-rota passou sem tocá-los (nenhum dos dois assertava alvo de navegação)

Ordem de execução (agente único, serializando o grafo): T1 → T2 → T4 → T3 → T5 → T7 → T6.
Respeita todas as dependências e **serializa por construção o conflito de território T2/T4**.

## Gates finais (exit code literal)

| Gate | Resultado |
|---|---|
| `tsc --noEmit` · painel | **0** |
| `tsc --noEmit` · design-system | **0** |
| `eslint --max-warnings 0` · painel | **0** |
| `eslint --max-warnings 0` · design-system | **0** |
| Gate determinístico dos redirects (T6) | **44/44** |
| Suíte do painel, passada única | 1341 passed · 21 failed · 1362 |
| **Vermelhos NOVOS desta lane** | **0** |

Dos 21: **2** são os pré-existentes da tabela de baseline; **19** são `Test timed out in 5000ms` em 10 arquivos que esta lane nunca tocou. Re-rodados isolados em 2 lotes: **112 testes, 100% verdes**. É flake de carga, não regressão — e vale card próprio (mesma classe do SUITE-STAB, só que do lado do painel).

## Fugas de escopo registradas (registrar e pular, nunca improvisar)

1. **`packages/design-system/showcase/src/sections/IconsPage.tsx`** ainda descreve *"os 8 ícones de DEFAULT_SIDEBAR_SECTIONS"* com a lista hardcoded incluindo Financeiro e Analytics. É **cópia**, não acoplamento: não quebra `tsc` nem teste. Está **fora** do território declarado da T1 (`src/components/Sidebar/**`) e fora da tabela de arquivos do mapa DE→PARA. **Registrado e pulado** — é exatamente a classe de divergência de catálogo que a T1 existe para fechar, e merece um card próprio.
2. **`apps/painel/src/routes/plataforma/repasses/**` (3 arquivos)** importavam `financeiro/repasses/_lib/{format,estadoRepasse}`. Território não declarado na T4, mas **repontar o import não é opção**: um move que deixa import quebrado não é um move. Feito, e registrado aqui.

## Desvios de sequência declarados (com justificativa)

**A deleção de `routes/financeiro/` inteira foi movida da T4 para a T6.** A fila manda "quem chegar por último (T4) apaga `FinanceiroRoutes.tsx` e `_components/FinanceiroSubNav.tsx`". Executar isso na T4 quebraria o `tsc` — o `App.tsx` ainda monta `<Route path="/financeiro/*">` — e forçaria a T4 a escrever no `App.tsx`, que é território exclusivo da T6. Pior: `/financeiro` passaria a dar 404 numa janela entre T4 e T6, violando a RN-234 no meio do próprio lote que a implementa.

Solução adotada: T2 e T4 repontam os imports do módulo legado para os endereços novos, então `/financeiro` e `/financeiro/repasses` **seguem servindo as telas certas** até a T6 substituí-los por redirects e apagar o diretório inteiro, num commit só. Resultado: deleção acontece uma vez (sem duplicação), nenhum arquivo órfão ao fim do lote (gate do lote preservado), nenhum commit intermediário vermelho e nenhuma janela de URL quebrada.

---

# Apêndice · review ANTAGONISTA ⚔ (lane IAMENU-REV, contexto fresco)

**Veredito global: APROVADO-COM-FIXES.** Report completo: `outputs/leela-build-2d6ee98d/IAMENU-REV-REPORT.md`.

O preview do Vitor (`:5273` / `:8180`) não foi tocado: nenhum reinício, nenhuma ressemeadura, nenhum navegador. Só a suíte de unit do painel rodou.

## Veredito por vetor

| # | Vetor | Veredito |
|---|---|---|
| 1 | Escopo do toque no DS (T1) | **RATIFICADO** — 5 arquivos, todos sob `Sidebar/`; zero token, zero primitivo, zero outro componente |
| 2 | Fronteira de PII sem prova executável | **PROCEDENTE** — prova escrita; lacuna real **escalada** |
| 3 | Dívida dos hooks de sessão + acoplamento `conta/`→`eventos/repasses/` | **PROCEDENTE e subdimensionada** — 5 cópias byte-idênticas, não 3; sem divergência, sem ciclo |
| 4 | Asserção mudada no T7 | **CONFORME `00-decisao §6`** — mas o T7 deixou 2 defeitos reais ao lado |
| 5 | Slot da `ContaPage` (T5) | **APROVADO** — composição correta; o modal não monta sem dado; a re-checagem ao voltar de `/conta` funciona por invalidação de chave compartilhada |
| 6 | Redirects além da tabela (T6) | **REPROVADO e CORRIGIDO** — querystring e fragmento morriam no salto |
| 7 | Navegação por papel | **SEM REGRESSÃO** — e a premissa não existe: o menu do painel nunca teve gate de papel (`podeAcessar` é matriz de evento) |

## Achados

| # | Sev. | Achado | Estado |
|---|---|---|---|
| A-1 | **ALTA** | O CSV da Caixa contradizia o número na tela: card com a Σ real do ledger, export com `derivarRepasse().repassado` cravado em 0 | CORRIGIDO `6c5f719` |
| A-2 | MÉDIA | Os 4 cards da Caixa deixaram de fechar entre si (`disponivel` derivado com `repassado = 0`) e o hint honesto morreu sem substituto | CORRIGIDO `6c5f719` |
| A-3 | MÉDIA | O redirect da RN-234 comia querystring e fragmento — atinge o `?preview=` do Vitor no F5 | CORRIGIDO `58c1b28` |
| A-4 | MÉDIA | Fronteira de PII sem controle de audiência (uma só regra libera agregado e ficha individual) | PROVA `3668d24` + **ESCALADO** |
| A-5 | MÉDIA | 5 cópias byte-idênticas de `resolverSessao`, não 3 | REGISTRADO — card |
| A-6 | BAIXA | Dois padrões de gate para o mesmo destino `/eventos/repasses` (atalho da Caixa gated, aba do hub não) — sintoma de A-4 | REGISTRADO |
| A-7 | BAIXA | `derivarRepasse().repasseIndisponivel` e docblock viraram letra morta pós-T7 | REGISTRADO |
| A-8 | BAIXA | `showcase/IconsPage.tsx` ainda descreve 8 ícones — diagnóstico do produtor **confirmado** | REGISTRADO |
| A-9 | INFO | `packages/design-system/dist/` é gitignored e é ele que o painel/preview executam. Dist local conferido: 6 ids novos, zero `analytics\|financeiro\|comunicacao`. **Preview subido antes do rebuild mostra o menu velho** — restart resolve, não é defeito | NOTA DE CONFERÊNCIA |
| A-10 | BAIXA | Os 2 vermelhos de baseline seguem sem dono (`c6ab442` taxaflex, `a26036b` CONS-3-T1) | REGISTRADO |

## Ratificações que exigiram medição, não leitura

- **"17 arquivos de teste movidos com `| 0`"**: medido por `git show --numstat -M`. São **18** arquivos distintos, **todos `0 0`**. O produtor contou a menos. Os únicos testes com edição real (`ContaPage.test.tsx`, `sidebar.test.ts`) não são telas movidas, e o de `ContaPage` só ganhou o `QueryClientProvider` — asserção idêntica.
- **"Nenhuma cópia nova de sessão nasceu"**: verdadeiro.
- **"O modal não monta sem dado"**: verdadeiro — `{dadosBancarios !== null && <SolicitarRepasseModal …/>}`.
- **"`routes/_system/` não aparece no diff do T7"**: verdadeiro — a matriz de papéis passou sem edição.
- **Os 2 vermelhos de baseline**: reproduzidos **isolados**, não são flake. O item `taxa` entrou em `c6ab442`, e a lane não tocou a asserção de plataforma.
- **O terceiro vermelho da minha primeira passada** (`EventoForm.test.tsx`) re-rodou isolado **15/15 verdes** — flake de carga, como o produtor descreveu. A passada final fechou com **zero timeout**.

## Gates (literal)

| Gate | Resultado |
|---|---|
| `tsc --noEmit` · painel | **0** |
| `eslint --max-warnings 0` · painel | **0** |
| Suíte do painel, antes dos fixes | `1359 passed · 3 failed · 1362` |
| Suíte do painel, **depois** dos fixes | **`1389 passed · 2 failed · 1391`** |
| Vermelhos NOVOS | **0** |
| Gate dos redirects (`routes/_system`) | **52/52** (ampliado de 44) |
| Gate de fronteira de PII (`routes/crm`) | **90/90**, 16 novos |

Nenhum teste existente foi enfraquecido: `gerarCsvFinanceiro` ganhou parâmetro **opcional** (omitido = comportamento anterior byte a byte) e o gate dos redirects foi **ampliado**, não reescrito.

## Escalados ao Vitor / E19

1. **A fronteira de PII do CRM não separa audiências.** `crmClientes` lê com `isTenantWriter(tenantId)` e `/crm` não tem guarda de papel no roteador — nunca teve. Quem vê o cohort agregado vê a ficha individual com nome e gênero. O k=5 é minimização na superfície agregada, **não** controle de confidencialidade. Separar exige papel/claim de tenant, que o painel não tem (o único modelo de papel é `PapelEvento`, e só existe dentro de um evento).
2. **SessionProvider global** — 5 cópias, refactor transversal, precisa de dono e janela sem lanes concorrentes.
3. **`derivarRepasse` precisa reconciliar contrato** com a realidade pós-T7 (mexe em asserção existente ⇒ não fiz).
4. **Os 2 vermelhos de baseline precisam de dono** — enquanto existirem, "suíte inteira verde" é inalcançável para qualquer lote.
5. **Card para o `IconsPage.tsx` do showcase.**

# Handoff — lote E11-COHORT-BACKEND / RN-822 (trace leela-build-2d6ee98d)

- **Employee:** sf-backend-lead (software-forge) · Fable
- **Data:** 2026-07-19
- **Épico:** LEELA-E11 · Analytics do Profissional · Story S-R9-02
- **Missão:** vertical coordenada RN-822 — faixas 5-em-5 + cohort idade×sexo, core → functions (+reprocesso) → api-client → painel (viz na Análise), com salvaguarda LGPD de k-anonimato.

## Progresso por task

- [x] **T1 backend** (`aa0afac`): core `FAIXAS_ETARIAS` → 10 bandas (`ate_17,18_24,25_29,30_34,35_39,40_44,45_49,50_54,55_59,60_mais`); `computeDemografia` soma matriz `faixaXGenero` (célula exige idade E sexo); `cohortPrivacidade.ts` novo (k=5, regras R1/R2/R3); `agregarDemografia` persiste a matriz e `contagensDoDoc` força reescrita de doc shape-antigo; `reprocessarDemografiaTodosEventos` novo (full-recompute idempotente).
- [x] **T2 api-client** (`fcfeda4`): `DemografiaEvento.faixaXGenero` (parse defensivo); doc PRÉ-RN822 (sem matriz) → `null` (EmptyState honesto até reprocesso — nunca gráfico zerado mentiroso).
- [x] **T3 painel** (`ba2f53c`): `_lib/demografia` 10 bandas + cohort pós-`suprimirCohortPorK`; `CohortIdadeSexo.tsx` (stacked por sexo, tokens DS, tabela sr-only, nota k=5); card "Idade × sexo (cohort)" na seção Perfil de compradores. SÓ `financeiro/analise/**` tocado.
- [x] **T4 fixes da review** (`[LEELA-RN822-T4]`): F4/F5 (janela de reprocesso declarada — `aguardandoReprocesso` no api-client, excluído das somas + nota/EmptyState honesto na View), F6 (guarda de idade fracionária em `faixaEtariaDaIdade`), F1/F2/F3 (residuais R-a/R-b/R-c registrados no cabeçalho de `cohortPrivacidade.ts` com gatilho de bloqueio para exposição futura a papel sem acesso individual).
- [x] Gates numéricos (ver abaixo)
- [x] Review antagonista Fable (contexto fresco) — ver seção
- [x] Boards + épico E11 atualizados na aterrissagem

## Review antagonista (Fable, contexto fresco): APROVADO COM RESSALVAS → fixes aplicados e re-provados

5 vetores atacados (reidentificação k<5 · diferenciação entre visões · compat agregado antigo · correção · PII). Vetores 1 (k no DOM) e 5 (PII) **PASS** limpos — nenhuma célula 1..4 chega ao DOM (nem title/tooltip/tabela sr-only/legenda), nenhum caminho novo de PII. Achados e destino:

| # | Sev | Achado | Fix |
|---|-----|--------|-----|
| F4 | MÉDIA | Janela deploy→reprocesso: fan-out descartava docs shape-antigo em silêncio → subcontagem apresentada como total | **CORRIGIDO** — `aguardandoReprocesso` sinalizado no api-client, excluído das somas, contado e DECLARADO (nota "N eventos em reprocessamento" / EmptyState com causa correta); provado no emulator (reader lê shape antigo → zerado+flag; pós-recompute → agregado real) e em RTL |
| F1 | MÉDIA | Residual de diferenciação ENTRE VISÕES (filtro RN-821: "todos" − eventos) não estava registrado | **REGISTRADO** (R-b no cabeçalho, lastro RN-172 + gatilho de bloqueio p/ exposição futura) |
| F2 | MÉDIA/BAIXA | Claim do R3 ("só a soma é inferível") falso quando residual mono-sexo decompõe linhas suprimidas | **CORRIGIDO no registro** (R-c) |
| F3 | BAIXA | Wording "se aproxima da linha" subestimava o caso cobertura total | **CORRIGIDO** ("iguala… quando a cobertura de idade é total") |
| F6 | BAIXA | `faixaEtariaDaIdade(24.5)` geraria chave fora do union (bug latente atrás do cast) | **CORRIGIDO** (`Math.floor` + teste fracionário 0..120 em passos de 0.25) |
| F5 | BAIXA | EmptyState mentia a causa na janela de reprocesso | **CORRIGIDO** (título/descrição próprios) |

Racional de aceite dos residuais R-a/R-b/R-c (documentado no módulo): a única audiência das visões (owner/staff, Rules) já tem acesso legítimo ao dado individual (RN-172/CRM) — o k protege a superfície de analytics e o que se compartilha adiante; se esta superfície um dia for exposta a papel SEM acesso individual, os residuais viram bloqueadores.

## Salvaguarda LGPD escolhida (premissa registrada)

**k-anonimato reader-side, k=5, aplicado PÓS-soma** (`packages/core/src/analytics/cohortPrivacidade.ts`):
- **R1:** célula exposta sse contagem 0 ou ≥5 (1..4 identifica grupo pequeno).
- **R2:** célula 1..4 em uma faixa ⇒ detalhamento por sexo da FAIXA INTEIRA retido (evita recuperação por subtração contra o total da linha).
- **R3 (complementar):** se sobraria exatamente 1 linha suprimida, a linha exposta de menor total também é retida (evita recuperação por diferença contra o marginal 1D `porGenero`, que é superfície RN-820 pública).

**Por que reader-side e não write-side:** (1) supressão no write quebraria a soma tenant — células <5 de N eventos podem somar ≥5; (2) k ajustável sem reprocesso; (3) o leitor do doc bruto (owner/staff, Rules) já tem acesso legítimo ao dado individual (RN-172/CRM) — a régua é minimização da superfície de analytics e do que se compartilha com patrocinador, não anonimização contra o controlador.

**Residual documentado:** marginais 1D (RN-820, já entregues) ficam fora do k; evento degenerado com todas as idades numa única faixa aproxima o marginal de gênero da linha da matriz. Aceito e documentado no cabeçalho de `cohortPrivacidade.ts`.

## Premissa de DEPLOY (inviolável)

**Functions redeploy + reprocesso andam JUNTOS.** Após o deploy de `agregarDemografia`, rodar `reprocessarDemografiaTodosEventos(admin.firestore())` (export de `functions/lib/functions/src/analytics/agregarDemografia.js` pós-build, Admin SDK). Até o reprocesso, docs no shape antigo são tratados como "não computado" pelo api-client (EmptyState honesto — nunca número errado). Qualquer write de inscrito também migra o doc daquele evento (full-recompute no gatilho).

## Gates (numéricos)

- tsc 0: core, functions, api-client, painel. eslint 0 (arquivos tocados): core, functions, api-client, painel (regra `leela-tokens/no-hardcoded-tokens` inclusa).
- Unit core (via functions): `demografiaCore.test.ts` **22/22** (bandas, matriz, k R1/R2/R3, pós-soma, idade fracionária F6).
- Integração: `demografia.integration.test.ts` **12/12** no emulator de TESTE **8480/9598** (`emulators:exec` + `firebase.r6.json`, `LEELA_FS_EMU_PORT=8480` — NUNCA :8180), incluindo: matriz no doc, shape fechado sem PII, **migração de doc shape-antigo** (reescrito no shape novo), **reader na janela** (shape antigo → zerado+flag, pós-recompute → real) e **reprocesso idempotente** (2ª rodada = zero write, `atualizadoEm` intocado).
- Painel: rota analise **48/48**; suíte completa **1208/1208** (163 files — baseline 1194 + novos; re-provada verde após os fixes T4).
- RTL da viz: vazio / sem-nascimento / dados / células suprimidas / janela de reprocesso + prova de não-vazamento no DOM (`CohortIdadeSexo.test.tsx`, `AnaliseVendasView.test.tsx`).

## Onde o Vitor confere

- Painel → `/financeiro` (Análise) → seção "Perfil de compradores" → card **"Idade × sexo (cohort)"** (com evento de teste: inscritos confirmados com nascimento+sexo; grupos <5 aparecem como "detalhe retido").
- Código da salvaguarda: `packages/core/src/analytics/cohortPrivacidade.ts` (cabeçalho = decisão LGPD completa).
- Épico: `leela-specs/03-canon/epics/LEELA-E11-analytics.md` §RN-822 (estado atualizado).
- Boards: `leela-specs/00-boards/BOARD-EPICOS.md` + `V1-CHECKLIST.md`.

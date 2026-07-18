# Checkpoint — Lote UI-AFILIADOS (trace leela-build-2d6ee98d · UIAF)

**Employee:** sf-frontend-engineer (software-forge) · **Data:** 2026-07-18 · **Rota:** Opus
**Estado:** ✅ GATE PASS · `origin/main` em sync (tip `39bffa1`)

## Achado central: premissa do brief vencida

O brief pedia "faltam as telas" de afiliados (S-R9-11-T4/T7/T8 + S-R9-12-T2). A releitura do
repo provou que a lane **R9-E já entregou e mergeou** as 3 superfícies:

| Superfície | Story | Arquivo | Commit R9-E |
|---|---|---|---|
| Aba Afiliados do evento (lista + modal RN-317) | S-R9-11-T4 | `routes/eventos/afiliados/{AfiliadosPage,AfiliadoModal}.tsx` | `04154f4` |
| Dashboard do influenciador PF (projeção fechada) | S-R9-11-T7 | `routes/clubes/influenciadores/MinhasAfiliacoesPage.tsx` | `416b0e7` |
| Aba Clubs dos 2 lados (organizador) | S-R9-11-T8 | `routes/clubes/influenciadores/InfluenciadoresPage.tsx` | `416b0e7` |
| Autocomplete de patrocinador reutilizável | S-R9-12-T2 | `routes/clubes/clube/parcerias/AddPatrocinadorModal.tsx` | `9a7f755` |

Verifiquei as 4 contra os ACs das stories — conformes: 100% shadcn/tokens, EmptyState/busca/
skeleton, valor bruto sem comissão, escopo de leitura RN-318 (influenciador só vê o próprio) e
RN-319 (organizador vê o tenant).

## O que EU entreguei (fechando os gaps reais)

### 1. Combobox shadcn §8 no `AddPatrocinadorModal` — `0763784`
`[LEELA-UIAF-S12-T2-COMBOBOX]`
- S-R9-12-T2 pedia o **Combobox de S-R9-05** para a seleção do registro de marcas (RN-171). A
  entrega original usou **Chips filtrados** com a nota "Combobox R9-A não mergeado".
- **Premissa falsa provada por git:** `git merge-base --is-ancestor 2077afe 9a7f755` = **true** —
  o Combobox do DS já era ancestral daquele commit.
- Troquei Chips → **Combobox do DS** (Popover+Command, busca embutida, tokens semantic, teclado).
  Só marcas `ativa` viram opção; selecionar preenche o form.
- Fecha a diretriz inviolável **shadcn §8** e o follow-up que o próprio card R9-E registrou
  ("Combobox R9-A no lugar dos Chips/Input quando mergear").

### 2. Testes de integração das telas T7/T8 — `39bffa1`
`[LEELA-UIAF-S11-T7T8-TESTS]`
- As telas de influenciador aterraram **sem teste** (R9-E cobriu só o `AfiliadoModal`).
- Adicionei RTL mockando os readers do api-client:
  - `MinhasAfiliacoesPage.test.tsx` (4): vazio/erro/dados + gate RN-315 exibido (`12/20` + nota "sem retroativo").
  - `InfluenciadoresPage.test.tsx` (4): vazio/erro/dados + KPIs somados + busca por nome/código/evento.

## Gates
- **tsc painel:** 0 erros nas minhas superfícies (parcerias/influenciadores/afiliados). Ver PENDÊNCIA abaixo.
- **eslint painel:** 0 (`--max-warnings 0`) nos 4 arquivos tocados.
- **vitest:** AddPatrocinadorModal **8/8** · MinhasAfiliacoesPage **4/4** · InfluenciadoresPage **4/4**.

## Premissa registrada (assumption_made)
- **Radix Popover-in-Dialog não abre no jsdom.** Abrir o painel do Combobox DENTRO do Modal
  (Radix Dialog modal, pointer-events do react-remove-scroll) não funciona no jsdom nem com
  `pointerEventsCheck:0` nem com `fireEvent` (`aria-expanded` fica `false`), embora funcione no
  browser real. Decisão zero-flake: o contrato abrir/filtrar/selecionar fica coberto pela suíte
  do DS (`Combobox.test.tsx`); o teste de tela prova a **adoção estrutural** (trigger
  `aria-haspopup`, zero `<select>` nativo no modal). Sem navegador por iniciativa própria (regra).

## PENDÊNCIAS (não do meu escopo — não editei)
- **R9-C ATIVA quebra o tsc do painel:** `20f1e80 [LEELA-R9C-T1-CORE]` travou `Kit.itens` como
  obrigatório sem atualizar as fixtures dos testes de kit → 6 erros `TS2375` em
  `apps/painel/src/routes/eventos/kits/**` e `_lib/__tests__`. Território da R9-C; **não toquei**
  `packages/core` nem os testes de kit. O tsc painel só fica 0 quando a R9-C fechar as fixtures.
- **Modelo de Kit da R9-C em andamento** (dependência declarada no brief).
- **`BREVO_API_KEY`** — ação externa do Vitor (destrava convites/campanhas por e-mail).
- **HIP-R9-01 pré-compra** — hipótese pendente de validação com organizador (default = RN-315).

## Território
Só `apps/painel/src/**` (1 arquivo de código + 3 de teste). `packages/*`, `functions/**`, rules e
`apps/landing/**` intocados. Push shared-main: a lane R9-C interleavou `62bd7ba` entre meus 2
commits (esperado no modelo de main compartilhado).

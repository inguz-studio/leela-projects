# Handoff · leela-build-2d6ee98d · lote SHADCN-SWEEP

employee: sf-frontend-engineer · model: Opus · project: C:\dev\LEELA
origem: ampliação da §8 pelo Vitor (2026-07-19) + cauda do PAINEL-S8-FIX (checkboxes parked) + M-08 do GATE-DS-W1

## Contexto da ampliação
Vitor (2026-07-19): "shadcn SEMPRE, para TODO componente; nada inventado a menos
que não exista no shadcn ou seja muito necessário — e aí documentado". Checkbox
nativo passa a ser violação da mesma severidade que select nativo.

## Baseline (medido)
- Suíte painel ANTES: **1185 passed / 161 files / 0 failed** (o `NovoClubePage.test`
  não deu o flake de timeout conhecido neste run).
- Suíte DS: intocada (não toquei packages/design-system/**).

## Estado das tasks
- [x] T1 — checkboxes nativos → `Checkbox` do DS (6 em 4 telas)
- [x] T2 — M-08: `<Input type="search">` cru → `SearchInput` do DS (7 telas)
- [x] T3 — §8 de governanca-design.md reescrita com a regra ampliada
- [x] TSFIX — 1 erro tsc pré-existente cross-lane corrigido p/ cumprir gate tsc 0

## T1 — checkboxes → Checkbox do DS · commit `b7ebe03` [LEELA-SHSWEEP-T1]
Verificado ANTES: DS `Checkbox` existe e é exportado
(`packages/design-system/src/components/Checkbox` · `index.ts:40`). Não houve
pendência de DS a registrar — o primitivo já estava lá.

6 `<input type="checkbox">` crus em 4 arquivos → `<Checkbox>`:
- `clubes/clube/configuracoes/ConfiguracoesView.tsx` (2): aprovação manual (RN-141) + as 6 permissões de admin (grupo `disabled`/emBreve, `aria-label={p.label}` preservado).
- `clubes/clube/desafios/DesafioEditor.tsx` (1): seleção de ação por pilar (`aria-label={\`Selecionar ${a.nome}\`}` preservado).
- `eventos/kits/ItemKitModal.tsx` (1): "Exibir logo ao atleta" (nome acessível vem do texto do `<label>`).
- `plataforma/tenants/termos/TermsEditor.tsx` (2): mensalidade da comunidade + antecipação pós-V1 (`disabled`/`readOnly` preservados; **removido** o `className="h-4 w-4 accent-..."` à mão — o DS Checkbox já traça a marca em `--action-primary` e o box em token).

Estados `disabled`/`checked`/`onChange` passam via props (o DS Checkbox espalha
`...props` no input nativo interno). O `<Checkbox>` é um `<span>` que embrulha o
input; como fica DENTRO do mesmo `<label>`, a associação de clique e o nome
acessível continuam. Testes verdes sem edição de teste (getByRole('checkbox'),
getAllByRole, getByLabelText).

## T2 — M-08 buscas cruas → SearchInput do DS · commit `8ab29f0` [LEELA-SHSWEEP-T2]
7 telas com `<Input type="search">` → `<SearchInput>`:
- Report GATE-DS-W1 M-08 (6): `clubes/hub/HubClubes` · `clubes/clube/membros/MembrosList` · `clubes/assessorias/AssessoriasPage` · `clubes/influenciadores/InfluenciadoresPage` · `eventos/afiliados/AfiliadosPage` · `eventos/entrega/AtendimentoPanel`.
- **+1 além da lista:** `crm/ClientesPage` — nasceu na lane CRM-COMISSAO-UI (posterior à W1) com o mesmo `<Input type="search">`; incluída para ZERAR o grep do gate. Documentado como migrado-extra.

Padrão aplicado (igual ao T2 do S8FIX — ComunicadosList etc.):
- `shortcutLabel={null}` (são filtros de lista locais, sem atalho global ⌘K).
- Onde havia `label` visível (AssessoriasPage, ClientesPage, AtendimentoPanel) o
  nome acessível migrou para `aria-label` (SearchInput não tem label visível — é
  ícone + placeholder, a anatomia canônica do DS). `getByLabelText`/`getByRole('searchbox', {name})` seguem verdes.
- Largura: `className="w-full max-w-md"` (ou `w-full`, ou `w-full max-w-md flex-1`
  no CRM) sobre o container do SearchInput (twMerge faz `w-full` vencer o
  `--search-width` fixo default) — preserva o layout que usava `wrapperClassName`.
- Import: nas 6 telas com um único `<Input>`, troquei `Input`→`SearchInput` no
  barrel; em AtendimentoPanel (tem outro `<Input>`) mantive `Input` e adicionei `SearchInput`.

## TSFIX — tsc pré-existente cross-lane · commit `4f3f5e3` [LEELA-SHSWEEP-TSFIX]
`clubes/influenciadores/__tests__/InfluenciadoresPage.test.tsx:158` — TS2532
"Object is possibly 'undefined'" em `mock.calls[0][0]` sob `noUncheckedIndexedAccess`
(setado em `tsconfig.base.json`). **Provado pré-existente:** revertendo meu source
para o HEAD, o erro persiste — é do teste de repasse de comissão (E19-CRM/COMF2),
não do sweep. Fix mínimo no idioma da casa: `mock.calls[0]![0]` (o non-null preserva
`arg` não-undefined, então as asserções `arg.repasseId` seguem fortes). Necessário
porque o gate deste lote pede tsc painel **0** (o S8FIX só pedia suíte verde e
tinha parkeado erros cross-lane). O outro erro que o S8FIX citou
(`MinhasAfiliacoesPage.test`) já não existe — foi resolvido por lane intermediária.

## T3 — §8 reescrita · commit `fcbf942` [LEELA-SHSWEEP-T3]
`leela-specs/04-engenharia/governanca-design.md` §8 passa de "Diretriz shadcn para
seleção, filtro, popover e calendário" para **"shadcn-first para todo componente de
UI"**:
- Regra: todo componente do painel usa o primitivo do DS; lista NÃO-exaustiva
  (seleção, datas, checkbox, radio, input, textarea, dialog/modal, tooltip, tabs,
  popover, combobox, dropdown, switch, badge...). Checkbox nativo = mesma severidade
  que select nativo (dito explicitamente).
- Exceção de porta única: (a) sem equivalente no DS OU (b) necessidade técnica forte
  — nos DOIS casos com justificativa DOCUMENTADA (ADR/nota). **ADR-017** citado como
  o padrão correto de exceção (modal Radix-free da landing por peso de bundle público,
  ratificado com critérios ordenados + 10/10 testes).
- Mantido e endurecido: texto do `<select>`/calendário nativos proibidos; gate de UI
  agora pergunta por componente. Lista de primitivos atualizada (existem hoje: R9-A +
  46 componentes do GATE-DS-W1 — não mais "a criar").

## Gate final (fecho)
- **tsc painel: 0** (`npx tsc --noEmit`).
- **eslint painel: 0** (`eslint src --max-warnings 0`).
- **Suíte painel completa: 1185/1185 · 161 files · 0 failed** (igual ao baseline).
- Testes dos pontos migrados (9 arquivos): **66/66** verdes.
- **Grep prova (fora de testes):** `type="checkbox"` nativo = **0** · `type="search"` nativo = **0** em `apps/painel/src`.
- Commits (todos em origin/main): T1 `b7ebe03` · T2 `8ab29f0` · TSFIX `4f3f5e3` · T3 `fcbf942` · boards+handoff (aterrissagem).

## Restrições respeitadas
- Sem stash; staging por path + `git commit --only`; commit-per-task `[LEELA-SHSWEEP-T*]`; push a cada 2-3.
- NÃO toquei `packages/design-system/**`, `apps/landing/**`, `functions/**`. As
  mudanças em `functions/` e `apps/landing/checkout` no working tree são de OUTRAS
  lanes (checkout) — deixadas intactas pelo `--only`.
- Boards (00-boards) só nesta aterrissagem final; BOARDS-RECONCILE (`1b3c422`) já
  havia aterrissado (tree limpo) — compus por cima (card no Feito + bloco no histórico).
- :5273/:3200/:8180 não tocados.

## Onde o Vitor confere
1. Clubes → Configurações: "Exigir aprovação manual" + as 6 permissões de admin (Checkbox DS).
2. Clubes → Desafios → editar: seleção de ações por pilar (Checkbox DS).
3. Eventos → Kits → adicionar item: "Exibir logo ao atleta".
4. Plataforma → tenants → termos: mensalidade da comunidade + antecipação.
5. Qualquer lista com busca (Clubes parceiros, Membros, Assessorias, Influenciadores,
   Afiliados, CRM Clientes, atendimento no balcão): busca agora é o SearchInput do DS
   (contêiner raised com ícone de lupa), não mais o input de formulário.
6. `leela-specs/04-engenharia/governanca-design.md` §8 reescrita.

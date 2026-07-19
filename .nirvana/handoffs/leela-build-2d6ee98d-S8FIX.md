# Handoff · leela-build-2d6ee98d · lote PAINEL-S8-FIX

employee: sf-frontend-engineer · model: Opus · project: C:\dev\LEELA
brief: .nirvana/briefs/leela-painel-s8-fix-enriched.md
origem: GATE-DS-W1 (findings ABERTOS de app) + pendência LP-VENDAS-KIT

## Baseline (medido, não estimado)
- Suíte painel ANTES: **1159 passed / 158 files** (o brief estimava ~1132).
- Suíte DS: **1033/1033** (intocada — não toco packages/design-system/**).

## Estado das tasks
- [x] T1 — date pickers nativos → DatePicker/DateTimeField do DS (10 campos / 8 arquivos)
- [x] T2 — forks de primitivo → DS (Radio/Textarea/SearchInput/Input + kebab)
- [x] T3 — token fantasma da divisória + varredura Select-como-filtro → Combobox
- [x] T4 — seed aditivo de regulamento (3 eventos, idempotente, aplicado no :8180)

## T1 — FEITO (F-01: §8 date pickers) · gates: tsc 0 · eslint 0 · afetados 160/160
Regra §8: calendário abre painel DO DS (Popover+react-day-picker), nunca o do SO.

Decisão-chave: o DS `DatePicker`/`DateRangePicker` são **date-only** (não carregam
hora). Para NÃO perder a semântica data+hora dos `datetime-local`, criei 2
adaptadores de consumo no painel (não toco o DS):
- `apps/painel/src/components/fields/DateField.tsx` — só data (`yyyy-MM-dd`),
  envolve o `DatePicker` do DS. Conversão string↔Date wall-clock (SEM fuso:
  monta/lê o Date por componentes locais, nunca UTC → não desloca em fuso).
- `apps/painel/src/components/fields/DateTimeField.tsx` — data+hora
  (`yyyy-MM-ddTHH:mm`), compõe `DatePicker` (data) + `Input type=time` (hora — é
  spinner, NÃO o calendário/listbox do SO que a §8 proíbe). Texto puro, sem
  conversão de fuso → a janela de lote continua interpretada no FUSO_EVENTO
  pinado a jusante. Hora só editável com data escolhida; sem hora assume `00:00`.

Ambos preservam a FORMA do estado das telas: entra e sai a MESMA string nativa,
então reducers/handlers das 8 telas quase não mudam (só troca o componente).

Migrados (10 campos):
- date-only → DateField: ComunicadoEditor:260 · DesafioEditor:262-263 (2) ·
  CampanhaEditor:394 · EventoForm:214 (mantém o `Input type=time` adjacente).
- datetime-local → DateTimeField: ParceriaDetailPage:251,258 (2) ·
  LoteModal:181,189 (2, `disabled={congelado}` propagado) · CupomModal:201,208 (2
  — o brief citava só :201; havia DOIS, migrei ambos).

Import via alias `@/components/fields/...` (configurado em tsconfig+vite+vitest;
mais robusto que contar `../` de rotas profundas).

Teste novo (Testing Trophy — 1 integração cobre os 10 sites):
`apps/painel/src/components/fields/__tests__/date-fields.test.tsx` (8 casos:
round-trip wall-clock, split data/hora, abre grid do DS, resume valor, hora
enable/disable, preserva data ao trocar hora).

Testes existentes ajustados (contrato mudou de input nativo p/ picker do DS):
- `EventoForm.test.tsx`: relógio congelado em abr/2099 (`vi.setSystemTime`) p/ o
  calendário abrir no mês certo; helper clica "27 de abril de 2099" → reproduz o
  mesmo `2099-04-27` das asserções — **asserções de negócio intocadas** (ISO,
  taxaModo, percursos). Static userEvent funciona sob `shouldAdvanceTime:true`.
- `ComunicadoEditorPage.test.tsx`: round-trip agora afere o trigger do DatePicker
  resumindo `15/08/2026` (era `toHaveValue('2026-08-15')` no input nativo).

Verificação: 0 `type="date|datetime-local"` restam em apps/painel (só refs em
comentário nos 2 adaptadores).

## T2 — FEITO (F-03/M-01: forks de primitivo) · gates: tsc(meus arquivos) 0 · eslint 0 · afetados 151/151
Matou as "3 linguagens visuais para o mesmo padrão" (flat DS · bordered à mão · nativo do SO).
- **6 textareas** hand-styled bordered → `Textarea` do DS (flat default): ComunicadoEditor,
  CampanhaEditor, DesafioEditor, ConviteModal, AddPatrocinadorModal, ConfiguracoesView.
  Char-count hints preservados.
- **Radios nativos → `RadioGroup`/`Radio` do DS:** ItemKitModal (Tipo + Origem — as 2
  fieldsets, não só :130,134) + ConfiguracoesView "Comportamento" (o DS Radio tem
  `description` por opção → cobre os hints; grupo `disabled` mantido = emBreve).
- **3 buscas cruas → `SearchInput` do DS:** ComunicadosList, DesafiosList, CampanhasList
  (`shortcutLabel={null}` — são filtros de lista, sem atalho global). As 6 telas M-08
  (`<Input type=search>`) ficam FORA (M-08 é medium, não no brief T2).
- **2 inputs de texto crus → `Input` do DS:** ConfiguracoesView (Slug, readOnly) +
  DeletarClubeModal (confirmação — mantém aria-label 'Confirmar nome do clube' que o teste afere).
- **5 kebabs "⋯" (span de texto) → `IconButton` + `MoreVertical` (lucide):** ComunicadosList,
  DesafiosList, MembrosList, ClubeCard, CampanhasList.

Verificação: 0 `⋯`, 0 `<textarea>` cru, 0 `<input type=radio>`, 0 `<input type=search>` cru.

PARKED (fora do brief T2, registrado): checkboxes nativos (ConfiguracoesView aprovação/
permissões, DesafioEditor ações, ItemKitModal exibirLogo, TermsEditor 2×) — checkbox não
está na lista de primitivos do T2 nem foi citado no F-03; DS tem `Checkbox`, migração é
candidata de W2 se o Vitor quiser.

## T3 — FEITO (F-04 + F-02 apps) · gates: tsc(meus arquivos) 0 · eslint 0 · afetados 21/21
- **F-04 (1 linha):** ConfigGeraisForm.tsx — `var(--border-width-thin)` (fantasma, IACVT →
  divisória ~3px) → `var(--divider-thickness)` (1px, token real consumido pelo Divider/Stepper do DS).
- **F-02 varredura Select-como-FILTRO → Combobox do DS** (só filtros; forms ficam com Select):
  - `RepassesFilaView.tsx` — filtro de Tenant sobre a Table (facet) → Combobox (com busca).
  - `EquipeLista.tsx` — seletor de papel por linha (o report nomeou como contexto de filtro) → Combobox.
  - Os outros 18 `<Select>` (14 arquivos) são seleção simples de FORMULÁRIO (categoria/modalidade/
    estado/tipo/papel de convite/kit/status/gatilho/banco/plano/retenção) — §8 permite Select nativo
    aí; NÃO convertidos (a diretriz é "Select fica só em form simples de baixa cardinalidade").
  - Testes atualizados p/ o contrato do Combobox (abre painel + clica option; antes
    `selectOptions`/`getAllByRole('option')` no listbox nativo): EquipeLista.test (2 casos),
    RepassesFilaView.test (1 caso). CommandItem: nome acessível=label, seleção dispara value.

## T4 — FEITO (pendência LPVK: modal de regulamento nunca aparecia) · aplicado no :8180
Causa: NENHUM evento do preview tinha `regulamento` → a `RegulamentoSection` da landing
(renderiza só quando `evento.regulamento` é string não-vazia) nunca montava.
- Novo script `functions/scripts/preview-seed-regulamento.ts` (padrão r14: emulator-guard +
  `require.main`, roda via tsx). Publica regulamento REAL (texto puro, 9 seções, ~3k chars,
  ≤50k) + `regulamentoVersao=1` + `regulamentoAtualizadoEm` FIXO em 3 eventos JÁ semeados:
  meia-floripa-2026, corrida-inverno-floripa-2026, noturna-beira-mar-2026.
- ADITIVO (set merge só dos campos de regulamento; não cria/limpa nada; não toca functions/src
  — só LÊ os docIds canônicos de lá) + IDEMPOTENTE: antes de escrever compara com o doc; se
  já bate, NO-OP (não mexe em atualizadoEm).
- APLICADO no :8180 vivo. Prova (readback admin-SDK, bypassa Rules):
  - 1ª passada: `escritos=3 · já-atualizados=0 · ausentes=0`
  - 2ª passada: `escritos=0 · já-atualizados=3 · ausentes=0` → byte-idêntico (R9-C OK).
  - (curl REST anônimo dá 403 por Rules — esperado; a landing lê server-side por admin SDK.)
  - projectId `demo-leela` = o mesmo do .firebaserc/landing → a landing enxerga o campo.

## ⚠️ Cross-lane (NÃO é do meu lote): 2 erros de tsc pré-existentes em
`InfluenciadoresPage.test.tsx` e `MinhasAfiliacoesPage.test.tsx` — a COMF2 (`aedc9f9`)
tornou `comissao` OBRIGATÓRIO em `packages/api-client` e os fixtures do E08 não foram
atualizados. Meus arquivos são type-clean; a suíte vitest (sem typecheck) não é afetada.
Passar p/ a lane E08/COMF2.

## Restrições respeitadas
- Sem stash; staging por path; commit-per-task `[LEELA-S8FIX-T*]`.
- Não toquei packages/design-system/**, apps/landing/**, functions/src/**.
- Preview :8180/:5273 não derrubados; :3200 não tocado.

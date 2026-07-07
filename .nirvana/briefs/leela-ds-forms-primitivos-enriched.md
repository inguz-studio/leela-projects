# Enriched brief — DS-FORMS #1a: primitivos de formulário do DS (nascendo responsivos)

> Trace: leela-build-2d6ee98d · Banner: LEELA-DS-FORMS · Modelo: Opus · Alvo: mds-frontend-engineer (magic-ds) / sf-frontend-engineer
> Primeiro passo do bloco #1 (DS-Forms + mutations). Este = os primitivos; o wiring dos forms + useMutation vem no #1b.

## Objetivo
Completar a caixa de primitivos de formulário do design system, para os formulários de criar/editar (que AGORA funcionam — firebase-admin destravou as escritas) ficarem sólidos e consistentes. DS hoje tem: **Input, Select, Checkbox, SearchInput**.

## PASSO 1 — AUDITAR o que os forms REALMENTE usam (reuso-first; não construir o que não é usado)
Leia os formulários vivos e liste os controles/padrões que eles usam ou precisam, ad-hoc vs DS:
- `apps/painel/src/routes/eventos/novo/EventoForm.tsx` (S201 — nome/data/local/modalidades/preços) · editar kit em tela cheia (S206 — identidade/modalidades/preço/capacidade/checklist) · `apps/painel/src/routes/clubes/novo/NovoClubePage.tsx`.
- Registre: quais controles hoje são markup cru/duplicado que deveriam ser DS; qual validação/erro/save existe.

## PASSO 2 — construir SÓ os primitivos que a auditoria mostrar necessários (candidatos)
Prováveis: **Radio/RadioGroup** (seleção única exclusiva) · **Toggle/Switch** (on/off imediato — RN de "inscrições abertas"/"evento público") · **Textarea** · **Field** (wrapper: label + descrição + mensagem de erro + estados required/invalid/disabled, aria correto) · possivelmente **RadioCard**/**FormRow**/layout. DatePicker/upload só se um form usar HOJE.
- **Elemento nativo quando der** (como Select/Checkbox fizeram: `<input type=radio>`, `<textarea>`, `<input type=checkbox role=switch>`) → a11y de teclado/foco/SR de graça. Tokenizado (zero cor/tamanho cru). Tema brasa/leela.
- **NASCEM RESPONSIVOS** (L-004): mobile-first, sem overflow em 390px, breakpoints declarados. Este é o primeiro lote onde aplicamos "born responsive" — os primitivos NÃO adicionam dívida ao RESP-MOBILE.
- **DOCUMENTAR no showroom** (`packages/design-system/showcase`) cada primitivo novo, no mesmo commit (diretriz Vitor).

## DIRETRIZES / GATE
Reuso-first; autoridade `~/.claude/skills/harness/references/design-principles.md` (seleção de controle por mutualidade/cardinalidade). **Componentes reusáveis novos → review antagonista** (regra Vitor — a11y de teclado/foco/SR de cada primitivo é o foco). tsc 0 + ESLint no-hardcoded 0 + suíte DS em blocos + build limpo. 1 task = 1 commit `[LEELA-DS-FORMS-T*]`, trailers, push. Relatório `outputs/leela-build-2d6ee98d/DS-FORMS-PRIMITIVOS-REPORT.md`; KANBAN/CHECKLIST. NÃO fazer o wiring dos forms nem mutations ainda (#1b).

## LACUNAS DE ESCOPO (reportar, não só resolver)
Se notar algo que o SQUAD magic-ds ou a empresa software-forge deveria cobrir por padrão mas não cobre (ex.: falta de baseline de cobertura de primitivos — já é a lacuna G-001), REPORTE no retorno para o maestro logar em `references/07-org-scope-gaps.md`.

RETORNO (maestro): primitivos construídos (e a auditoria: o que os forms usavam ad-hoc); reuso vs novo; prova de born-responsive (screenshot 390px de um primitivo/form); a11y (nativo?); showroom docs; testes/tsc/ESLint; lacunas de escopo notadas.

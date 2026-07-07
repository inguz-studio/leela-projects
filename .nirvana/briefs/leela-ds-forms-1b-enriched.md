# Enriched brief — DS-FORMS #1b: forms consomem os primitivos + camada de mutations

> Trace: leela-build-2d6ee98d · Banner: LEELA-DS-FORMS · Modelo: Opus · Alvo: sf-frontend-engineer
> Segundo passo do bloco #1. Primitivos (Textarea/Radio/RadioGroup/Switch/Field) prontos e a11y-hardened (6053f82). Escritas destravadas (firebase-admin). Agora: os forms usam os primitivos E submetem de verdade.

## Objetivo (o payoff)
Transformar "os botões funcionam" em "criar/editar é bom": (1) os formulários trocam markup cru pelos primitivos do DS; (2) uma camada de **mutation** (`useMutation` — lado escrita do ADR-010/TanStack Query) faz criar/salvar efetivar + invalidar o cache (read-your-writes), pra a lista refletir sem refresh manual.

## PASSO 1 — Camada de mutation (narrow-waist, Fowler)
Criar o par do `lib/query` para escrita: `useMutation` wrappers keyed que REUSAM as Functions/api-client de escrita já destravadas (`criarEvento`, `publicarEvento`, e as de kit/clube), com **invalidação das queries afetadas** no onSuccess (ex.: criar evento → invalida `eventosDoOrganizadorQuery`). Estados: pending (desabilita submit + spinner no botão), error (mensagem no Field/Toast), success (Toast + navegação). NÃO reescrever as Functions — só fiar. `functions/src` read-only.

## PASSO 2 — Forms consomem os primitivos (reuso-first)
Refatorar, começando pelo exemplar **EventoForm (Novo evento, S201, 264 linhas)**: `<textarea>` cru → `Textarea`; markup label+erro → `Field`; selects/radios crus → `Select`/`RadioGroup`; on/off de submit → `Checkbox` (NÃO Switch — os on/off atuais são de submit). Depois **editar kit (S206)** e **NovoClubePage (167 linhas, `inputCls` 5×, label+erro dup 6×)**. Manter a validação existente (`validaNovoEvento` etc.), agora exibida pelos estados do `Field`. Preço bloqueado após venda (RN-200/211) preservado.

## GATE (provar ao vivo — o diferencial deste lote)
Suba o preview + emulator. **Crie um evento PELO FORM** (`/eventos/novo`) e prove: (a) o form usa os primitivos do DS; (b) o submit EFETIVA (evento gravado — firebase-admin destravou); (c) **read-your-writes**: o novo evento aparece no hub `/eventos` SEM refresh manual (invalidação). Screenshot do form (primitivos) + do hub com o evento novo. Evidência `outputs/leela-build-2d6ee98d/ds-forms-1b-*`. adr-conformance: `useMutation` (TanStack). Born-responsive: o form sem overflow em 390px (os primitivos já nascem responsivos; garanta o layout do form também). Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. 1 task = 1 commit `[LEELA-DS-FORMS-1B-T*]`, trailers, push por aterrissagem. Relatório `outputs/.../DS-FORMS-1B-REPORT.md`; KANBAN/CHECKLIST.

## DIRETRIZES
JOB primeiro (S201/S206 — "página no ar em <15min sem suporte técnico" / editar kit em tela cheia). Reuso-first (primitivos do DS, api-client, o `lib/query`). Autoridade `design-principles.md`. Componente reusável novo (ex.: o mutation gateway é lib, não DS) → não precisa review a menos que crie primitivo de DS. Lacuna de escopo empresa/squad → REPORTAR (não editar o ledger).

RETORNO (maestro): hashes; forms refatorados (reuso vs novo); a camada de mutation (invalidação por recurso); **prova viva de criação real + read-your-writes** (paths dos screenshots); born-responsive 390px; adr-conformance useMutation; testes/tsc/ESLint; lacunas notadas.

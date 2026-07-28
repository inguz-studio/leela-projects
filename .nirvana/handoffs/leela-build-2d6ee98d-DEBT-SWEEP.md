# Handoff · DEBT-SWEEP · trace leela-build-2d6ee98d

> **Registro póstumo.** A sessão desta lane caiu depois dos seis commits e antes
> da aterrissagem — ela nunca escreveu report, handoff nem card. Este arquivo foi
> reconstruído pela review DEBT-REV a partir do diff, dos testes em disco e dos
> corpos de commit, e o placar abaixo é medido, não declarado. Detalhe completo
> em `outputs/leela-build-2d6ee98d/DEBT-REV-REPORT.md`.

Ordem do dono (DEC-0727D, verbatim): **"Dívidas técnicas, resolvam todas."**
A lista era a seção 🔧 de `leela-specs/01-produto/DECISOES-ABERTAS.md`.

## Estado: CONCLUÍDA · **APROVADA COM RESSALVAS** (review DEBT-REV)

## Placar por task

| Task | Commit | O quê | Veredito da review |
|------|--------|-------|--------------------|
| T1 | `6c699dc` | As 5 cópias byte-idênticas do hook de sessão tenant-scoped viram uma (`lib/session/tenantSession.ts`); 24 pontos de consumo migrados | **PAGO** — zero chamador órfão, 5 testes preservados verbatim + 1 novo |
| T2 | `ee76432` | Os 2 vermelhos de baseline morrem — e um deles era bug de código, não de teste (item `taxa` sem ícone na barra do super-admin) | **PAGO** — nenhuma asserção afrouxou; as duas ficaram mais fortes |
| T3 | `9d58684` | Flakes de timeout atacados na causa: `src/test/usuario.ts` (user-event acoplado ao relógio falso) + tetos redimensionados (20s vitest, 5s RTL) | **PAGO com nuance** — 41 asserções e 15 casos do EventoForm intactos; a nuance está no report |
| T4 | `e98e3c1` + `6b2a024` | CRM e hub de Eventos viram links de verdade; gate de âncoras 37 → 42 e ganha "destino de navegação nunca é `<button>`" | **PAGO** — o gate morde (falsificação: 3 vermelhos) |
| T5 | `0a2708f` | Clicar na aba ativa vira `replace` — o Voltar deixa de repetir a tela; achado de brinde: o `RootShell` descartava o 2º argumento do `navigate` | **PAGO** — o gate morde (falsificação: 6 vermelhos em 3 arquivos) |
| T6 | `3e3294b` | O slot da chave Asaas para de mentir: valor de sandbox sai de `ASAAS_PROD_API_KEY`; `.env.example` ganha a regra de ouro | **PAGO** — nenhum código lê o slot antigo; `.env.example` coerente |

## Gate literal da lane (medido pela review, não pela lane)

- Suíte completa do painel **2× consecutivas**: 182/182 arquivos, 1596/1596
  testes, **zero vermelho e zero flake** (368,54s e 355,50s).
- `tsc --noEmit` do painel: **0**. `eslint src --max-warnings 0`: **0**.

## O que ficou GATED

`DELETE /payments` contra a sandbox REAL do Asaas — depende da chave do item 8,
adiada pelo próprio dono. Não foi tentado; nenhuma rede real nesta lane.

## O que a review achou por cima (ressalva)

O motivo declarado do T1 ("cinco cópias eram cinco lugares para um hardening ser
esquecido") valia num SEXTO lugar que a lane classificou como fora de escopo:
`usePlatformSession` era a última porta do painel com `getClaims().then()` sem
forceRefresh e sem catch — skeleton eterno na área de super-admin. Consertado na
review (`dc9b190`), com RED→GREEN.

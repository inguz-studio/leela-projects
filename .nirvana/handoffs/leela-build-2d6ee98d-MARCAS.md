# Handoff — LOTE MARCAS-TELA (trace leela-build-2d6ee98d)

- **Employee:** software-forge · sf-frontend-engineer · rota OPUS (UI)
- **Data:** 2026-07-19
- **Épico:** LEELA-E10 · Marcas do Profissional — recorte S811 (seed antecipado R9-E)
- **Story:** S-R9-12 (tela dedicada) · RN-171 / RN-123

## Missão

Tela dedicada de MARCAS no painel do organizador: gerenciar patrocinadores/marcas reutilizáveis num lugar só (lista, criar/editar, excluir), sobre o backend PRONTO do R9-E (registry owner-only `profissionais/{uid}/marcas`, api-client CRUD, upload de logo 1:1).

## Entregue

### T1 `f4170fc` — data layer + navegação
- `apps/painel/src/routes/marcas/_data/session.ts` — sessão owner-scoped (só `uid`; marca é owner-only, sem claim de tenant).
- `apps/painel/src/routes/marcas/_data/marcas.ts` — `useMarcas` (1 getDocs ordenado) + wrappers `salvarMarcaDoProfissional`/`excluirMarcaDoProfissional`/`uploadLogoDaMarca` sobre o api-client do R9-E.
- `apps/painel/src/routes/marcas/MarcasRoutes.tsx` — ToastProvider + AppErrorBoundary + Routes (espelho de CrmRoutes).
- `apps/painel/src/App.tsx` — monta `/marcas/*`.
- `apps/painel/src/shell/sidebar.ts` — `marcas: '/marcas'` + `painelActiveId('/marcas') → 'marcas'`.
- `apps/painel/src/shell/__tests__/sidebar.test.ts` — casos atualizados (marcas deixa de ser inerte).

### T2 `2ca5e9a` — UI (tela + modal)
- `apps/painel/src/routes/marcas/MarcasPage.tsx` — Table densa (logo 1:1/placeholder + nome + Badge modelo + detalhe), SearchInput, contador "mostrando X de Y", PageHeader com "Nova marca", EmptyState honesto, ConfirmModal de exclusão.
- `apps/painel/src/routes/marcas/MarcaFormModal.tsx` — criar/editar (nome + Chips modelo RN-123 condicional + valor/contrapartida + contrato + FileInput logo 1:1). docId fixo em edição.

### T3 `7bddbd5` — RTL
- `apps/painel/src/routes/marcas/__tests__/MarcasPage.test.tsx` — 7 testes (vazio/erro/dados/criar/editar/excluir).

## Decisões (documentadas no épico + ConfirmModal)

1. **Navegação:** rota própria `/marcas` na sidebar (não aba de Configurações). O item "Marcas" do DS já existe (1º nível) e o padrão do painel é módulo próprio.
2. **"Em quantos patrocínios usada": OMITIDO** — a contagem de ativações (`qtdAtivacoes`) é o S812 (Icebox), sem reader barato. Não se inventa número.
3. **Semântica de exclusão:** remove o doc do registro reutilizável → sai do autocomplete de patrocínios FUTUROS; patrocínios já cadastrados (cópias `ParceriaPatrocinador`) permanecem intactos. Escrito no loses/keeps da ConfirmModal.

## Reaproveitado vs criado

- **Reaproveitado:** todo o api-client/core/Storage do R9-E (`listarMarcas`/`salvarMarca`/`excluirMarca`/`uploadLogoMarca`/`marcaIdDoNome`/`validarMarcaInput`/tipos `Marca`/`MarcaInput`); DS Table/EmptyState/PageHeader/SearchInput/Modal/ConfirmModal/Badge/Chip/Button/Input/Textarea/FileInput; padrão de módulo do CRM (Routes/session/_data).
- **Criado:** só código de painel (6 arquivos novos + 3 edições de wiring). ZERO primitivo novo.

## Gates (números reais)

| Gate | Resultado |
|---|---|
| tsc painel | **0** |
| eslint painel (`src --max-warnings 0`) | **0** |
| suíte painel completa | **1194/1194 · 162 arquivos** (baseline 1185 + 9 novos; 0 fail; flake NovoClubePage não ocorreu) |
| RTL da tela nova | 7 testes (vazio/erro/dados+contador/criar/editar/excluir) |
| prova visual | showroom N/A (tela de painel); preview :5273 build fixo → validado por teste |

## Premissas

- Marca é lista pessoal e curta → busca client-side sobre 1 getDocs (sem reader de busca server-side).
- Upload de logo em criação usa id derivado do nome (`marcaIdDoNome`) = mesma chave do upsert (sem órfão).

## Onde o Vitor confere

- `pnpm --filter painel dev` (:5173) → sidebar → **Marcas** (`/marcas`).
- Lista vazia = EmptyState "Cadastrar primeira marca"; com marca cadastrada via patrocínio no R9-E = linha com logo/modelo/detalhe.
- "Nova marca" → modal financeiro/permuta; Editar; Excluir → ConfirmModal com consequências honestas.
- **Pendência de conferência visual** (preview :5273 é build fixo — não reflete esta lane até rebuild).

## Falta (fora do lote — horizonte do épico)

- **S812** (🧊 Icebox): consolidação de ativações + `qtdAtivacoes` por Function + toggle de logo. Ao entrar: exibir contagem na lista + trocar o preview da exclusão para as ativações afetadas.

# BRIEF ENRIQUECIDO — LEELA-FIX-TEMA-CLUBE · 2 correções de produto (tema landing + form de clube)

> Trace: `leela-build-2d6ee98d` · Rota: **Opus** (UI/produto) · Empresa: **software-forge** (sf-frontend-engineer) · Repo: `C:\dev\LEELA` (main). **NÃO commitar, NÃO push** (lane do maestro). Duas correções pedidas pelo dono ao revisar o preview.

## FIX 1 — Tema da landing pública: light → DARK (brasa)
**Problema:** `apps/landing` renderiza no tema **`leela`** (light, `--surface-base` creme), mas a identidade da Leela é **DARK** — o painel usa `theme="brasa"` (dark). A landing deve casar com a identidade do painel.
**Fix:** alinhar a landing ao tema **`brasa`**:
- `apps/landing/app/layout.tsx`: `<html ... data-theme="leela">` → `data-theme="brasa"`.
- `apps/landing/app/globals.css`: trocar `@import '@leela/design-system/themes/leela.css'` → `brasa.css`; e trocar as fontes importadas — brasa usa **`Exo 2`** (display+ui) + `JetBrains Mono`, não Syne/Figtree. Atualizar o `@import url(...)` do Google Fonts p/ `Exo 2` (pesos usados) + JetBrains Mono, e o comentário.
- Conferir que nenhum token é redefinido localmente e que o texto fica legível no dark (o brasa já define `--text-primary: neutral-50` claro).
**Aceite:** a home + página de evento + checkout renderizam em **dark** (fundo escuro, texto claro, mesma paleta do painel), sem regressão de layout, sem overflow mobile.

## FIX 2 — Form de criação de clube (`apps/painel/src/routes/clubes/novo/NovoClubePage.tsx`)
**Problema:** Categoria, Modalidade e Localização são `<Input>` de texto livre. O dono decidiu:
- **Categoria → `<Select>` "Tipo de clube"** com opções: **Assessoria esportiva · Equipe/Time · Grupo de corrida · Comunidade · Academia**.
- **Modalidade → `<Select>`** com a lista ampla: **Corrida de rua · Trail · Ciclismo · MTB · Caminhada · Triatlo · Natação · Funcional · Bem-estar/Yoga**.
- **Localização → estruturada:** **Cidade** (texto) + **Estado** (`<Select>` das 27 UFs do Brasil) + **tipo Presencial/Online** (o dono: "só Cidade e Estado, e se é online ou virtual"). Se `Online`, Cidade/Estado podem ficar opcionais (clube sem sede física).

**Onde criar as constantes (core, reutilizável):** `packages/core/src/clubs/` — ex.: `CATEGORIAS_CLUBE` (tipos), `MODALIDADES_CLUBE`, `ESTADOS_BR` (UF + nome). Exportar do índice do core. Se já houver `ESTADOS_BR`/UF em algum lugar do core (checar `dadosPessoais.ts`/`validarDados.ts`), REUSAR, não duplicar.

**Mudança de tipo (core `ClubeInput`/`Clube` em `packages/core/src/clubs/clube.ts`):** hoje `categoria: string`, `modalidade: string`, `localizacao: string`. Torne o domínio coerente:
- `categoria` e `modalidade` seguem `string` mas agora VÊM das listas (valida contra o vocabulário em `validarClube`).
- `localizacao` vira **estruturada**: proposta `{ cidade: string; estado: string; online: boolean }` (ou o shape mais limpo que você julgar) — decida e **atualize TODOS os consumidores** para não quebrar o build: `validarClube`, a porta `criarClubePadrao`, o display (`clubes/hub/ClubeCard.tsx`, `clubes/clube/configuracoes/ConfiguracoesView.tsx`, `ClubeShell.tsx`), o seed (`functions/src/seed/clubes.seed.ts`), e os testes (`NovoClubePage.test.tsx` + testes de `clube`/`configClube`). Um clube `online` exibe "Online"; presencial exibe "Cidade/UF".
- `validarClube`: exige categoria ∈ CATEGORIAS_CLUBE, modalidade ∈ MODALIDADES_CLUBE; se presencial, cidade+estado obrigatórios; se online, ok sem cidade.

**Componentes:** use o **`Select`** do DS (`@leela/design-system` — já existe, o form já importa `Input`/`Checkbox`/`Chip`). Para Presencial/Online use `Chip`/`RadioGroup`/`Switch` conforme o padrão do form (Visibilidade já usa `Chip` em grupo — espelhe). Mantenha a `ConfiguracoesView` (edição do clube) coerente com o form de criação (mesmos selects), senão criar e editar divergem.

## FIX 3 — KPIs do financeiro do EVENTO (`apps/painel/src/routes/eventos/financeiro/FinanceiroView.tsx`)
**Problema:** hoje os cards são **Receita bruta · Taxa · Líquido** — e o card **"Taxa"** expõe a taxa da Leela (`taxaValor`/`taxaPct`). O dono decidiu **NÃO exibir a taxa** (não se expor — mesma razão do vazamento fechado em `703db9c`).
**Fix — trocar o conjunto de KPIs para 4 cards (sem taxa):**
1. **Receita total** — total de vendas de ingressos (= `receitaBruta`, renomear rótulo p/ "Receita total").
2. **Valor repassado** — o que já foi transferido ao organizador.
3. **Valor disponível** — disponível para saque agora.
4. **Valor a ser disponibilizado** — retido, com **nota/hint descritiva**: "Retenção de até 15% do total, liberada pós-evento; condição negociável por cliente."
- **Remover o card de Taxa** e a nota "sem termos comerciais → taxa indisponível" (RN-406) que revela o modelo de taxa.
- **Dependência de backend honesta:** `repassado`/`disponível` são conceitos de **E09 (repasses)**, que ainda não tem máquina completa. Compute o que é derivável (retenção = 15% do total por default, editável por tenant no futuro; "a ser disponibilizado" = retenção; "disponível" = total − retenção − repassado) e para o que exige E09 (valor REPASSADO real = soma de transferências, que não existem ainda) use **EmptyState/valor honesto** (ex.: "R$ 0,00" com hint "disponível com o módulo de repasses" OU derive de forma conservadora) — **NÃO invente transferências**. O gráfico "Receita por modalidade" permanece.
- A retenção default (15%) e o modelo devem sair de `commercialTerms` do tenant quando existir; por ora, constante clara com o hint de que é negociável por cliente. **Não exibir o percentual de taxa da plataforma em lugar nenhum público do organizador** (consistente com RN-404).
**Aceite:** o financeiro do evento mostra os 4 cards acima (Receita total, Valor repassado, Valor disponível, Valor a ser disponibilizado + hint de retenção), **sem nenhum card/valor de "taxa Leela"**; valores E09-dependentes em estado honesto; gráfico de receita por modalidade mantido.

## Regras invioláveis
- **Nada de texto livre** onde o dono pediu lista (categoria/modalidade/estado). Sem inventar opções além das definidas acima.
- **Financeiro: nunca exibir a taxa/margem da plataforma** ao organizador (RN-404 + decisão do dono). Sem inventar valores de repasse.
- **Reuso-first:** `Select` do DS; UF do core se já existir; espelhar o padrão do form (Chip de Visibilidade).
- **Não quebrar o build:** a mudança de `localizacao` toca vários consumidores — atualize todos + o seed + os testes; a suíte tem que ficar verde.
- Tema `brasa` sem redefinir token; a11y (labels nos selects, foco); mobile confortável.

## Gates (rode você; SERIAL; máquina 8GB sob pressão — sem paralelismo pesado)
- **core:** `tsc` + `vitest` (validarClube + qualquer teste de clube) verdes.
- **painel:** `tsc` + `ESLint --max-warnings 0` + `vitest` (NovoClubePage + configClube) verdes + `build` (vite) passa.
- **landing:** `tsc` + `next build` passa (tema brasa compila).
- Gate visual = maestro (subo o stack e capturo). **NÃO** capture você.

## Report
`outputs/leela-build-2d6ee98d/FIX-TEMA-CLUBE-REPORT.md`: o que mudou no tema (arquivos), o novo shape de `localizacao` + a lista de consumidores atualizados, as constantes criadas (categoria/modalidade/UF), saída REAL dos gates, e as rotas p/ o maestro capturar (landing dark + `/clubes/novo`). Retorno: resumo ~10 linhas + arquivos + gates + o que verificar no visual.

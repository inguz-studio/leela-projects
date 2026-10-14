# Brief enriquecido · Landing LEELA mais apresentável (nível Awwwards, dentro do design system)

**Trace:** `leela-landing-awwwards-202608261656`
**Squad:** awwwards-singularity-studio (`~/squads/awwwards-singularity-studio/`)
**Output path:** `~/dev/LEELA/.nirvana/outputs/leela-landing-awwwards-202608261656/squads/awwwards-singularity-studio/`

## Brief original (verbatim, do dono)

> como poderiamos deixar o site de landing page mais apresentavel com nosso squad awards? voce pode pesquisar referencias online de sites que tem a pegada esportiva e bem estar assim como nos e fazer em cima das referencias, mas mantendo nosso design system?

## Contexto do produto

- **LEELA** é um ecossistema fitness/wellness *community-first*: eventos esportivos (corridas), assessorias, clubes, desafios. Diferenciação: lock-in emocional (comunidade) + financeiro (afiliação clube↔organizador). Ver `leela-specs/01-produto/ROADMAP.md` §1.
- **A landing** é `apps/landing` — Next.js 14 (SSR/ISR), público = atleta anônimo descobrindo evento/clube e comprando **sem login**. É a superfície de conversão: página de evento → checkout.
- **Design system** = `packages/design-system` (2.177 testes, 94 arquivos). Há **regra de lint que proíbe cor fora de token**. Tailwind + shadcn/ui.
- Épico da superfície: `leela-specs/03-canon/epics/LEELA-E12-landing.md`.

## Referências de partida (aprofundar com o aws-researcher)

- Galeria Awwwards fitness: https://www.awwwards.com/inspiration_search/fitness/ — menções honrosas recentes: **Essor Fitness, XNRGY Club, La Huella Workout Club**.
- **Peloton** (holística, trial-first) e **Equinox** (minimalismo + imagem forte).
- Tendência de plataformas de corrida (**RunSignup** Website V2, 2026): banner com vídeo/slideshow, **mapa do percurso Strava embutido**, componentes para prova virtual/híbrida.
- **ClassPass / Challenge Hound**: wellness + comunidade + desafio como narrativa.
- Buscar também: Strava, Whoop, Nike Run Club, AllTrails — o tom "esporte real, comunidade real" (fotografia autêntica > stock genérico).

## Entregáveis (nesta ordem)

1. `outputs/01-research.md` — referências analisadas (≥6), com o que cada uma ensina e o que se aplica à LEELA.
2. `outputs/02-direcao-visual.md` — proposta seção a seção da landing (hero, evento, clube, prova social, CTA de inscrição): o que muda, por quê, e **qual token/componente do DS realiza cada mudança**. Onde faltar peça no DS, propor a peça (não inventar cor/fonte fora do sistema).
3. **Implementação em branch** `landing/awwwards-20260826` (a partir de `main`) — as melhorias de maior impacto visual da direção proposta, incrementais e reversíveis.
4. **Gate visual (regra da casa, inegociável):** screenshots Playwright antes/depois de cada página tocada, salvos em `outputs/shots/`. Nenhuma recomendação de deploy — deploy não é escopo.
5. `outputs/_SUMMARY.md` (1 página) + handoff em `~/dev/LEELA/.nirvana/handoffs/leela-landing-awwwards-20260826.md` no padrão da casa.

## Restrições (violação = gate_failed)

- **Manter o stack**: Next.js existente. ⛔ Sem Three.js/WebGL/GSAP pesado — landing é SSR de conversão; scroll nativo; CSS scroll-driven/View Transitions só com degradação limpa.
- **Design system é lei**: cor/tipo/espaçamento via tokens de `packages/design-system`. O lint proíbe cor fora de token — rodar `pnpm --filter @leela/landing lint` limpo.
- ⛔ **Não tocar no checkout** (24 dos 65 arquivos de teste são `checkout-*` — máquina de dinheiro). Se a direção pedir mudança lá, registrar em `02-direcao-visual.md` como fase futura.
- **Testes verdes**: `pnpm --filter @leela/landing test` (65 arquivos, hoje 849/849) + `tsc`/`eslint` 0. Testes que quebrarem por mudança legítima de UI: atualizar junto, explicando no handoff.
- ⛔ Não consumir RN nova; não tocar `.github/workflows/**`, `functions/**`, `apps/painel/**`.
- Commits no padrão da casa (PT-BR, scope, tag `[leela-landing-awwwards-20260826]`), **sem push para main** — deixar o branch publicado e o PR em draft.

## Ambiente (fatos, não descubra de novo)

- Repo: `~/dev/LEELA`. Node via fnm; `.node-version` = 24 (`eval "$(fnm env)" && fnm use`). pnpm 11.9.0.
- Landing dev: `pnpm --filter @leela/landing dev` (porta 3000). Variáveis `NEXT_PUBLIC_*` precisam existir **no build** (não no start). Receita da landing contra emulador: `~/dev/LEELA/.nirvana/HANDOFF.md`.
- Dados de seed são desenhados para 15/03/2026 — sem `LEELA_CLOCK` tudo aparece "Inscrições encerradas" (ver `leela-specs/04-engenharia/como-verificar.md`, "A armadilha do relógio").
- ⚠️ O mock-campeche está NO AR (portas 4602/8280/9298/5301/9399/4011) e a `:4601` também — **não derrubar nenhum dos dois**. ⛔ Não subir emulador `demo-leela` enquanto o mock estiver de pé (colisão de hub por project id). Kill de processo: só por PID exato (`lsof -nP -iTCP:<porta> -sTCP:LISTEN -t`), nunca por nome.
- Playwright chromium já instalado (`pnpm exec playwright ...`).
- Screenshots de referência do estado atual podem ser gerados com os probes existentes em `.nirvana/gate-visual/` como exemplo de técnica.

## Critérios de aceite

- [ ] 01-research.md com ≥6 referências reais analisadas
- [ ] 02-direcao-visual.md mapeando cada mudança a token/componente do DS
- [ ] Branch `landing/awwwards-20260826` com implementação incremental compilando (`pnpm --filter @leela/landing build`)
- [ ] Lint + tsc + testes da landing verdes no branch
- [ ] Screenshots antes/depois em `outputs/shots/` (gate visual)
- [ ] `_SUMMARY.md` + handoff escritos; PR em draft aberto (base main), sem merge

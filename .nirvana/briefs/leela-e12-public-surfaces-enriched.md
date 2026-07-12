# BRIEF ENRIQUECIDO — LEELA-E12-PUBLIC-SURFACES · Superfícies públicas v1 (homepage marketplace + página de evento)

> Trace: `leela-build-2d6ee98d` · Rota: **Opus** (UI, read-only, sem dinheiro) · Empresa: **software-forge** (sf-frontend-engineer) · Repo: `C:\dev\LEELA` (main).
> **NÃO commitar, NÃO push** (o maestro commita após o gate). Stories cobertas: **S1200** (fundação landing + leitor público) + **S1201** (página pública de evento) + **homepage marketplace** (decisão Vitor 2026-07-11: Leela é marketplace + SaaS).

## Objetivo
Primeira versão navegável das superfícies **públicas** da Leela, que o Vitor vai abrir e clicar para reagir e depois passar referências. Duas telas + a fundação que as sustenta:
1. **Homepage `/`** — marketplace: hero + **uma dobra com os eventos publicados** (padrão Cheers) + acesso ao evento.
2. **Página pública de evento `/{eventSlug}`** — SSR, seções publicadas na ordem, CTA de inscrição, estados públicos.
3. **Fundação (S1200)** — shell App Router com tema `leela` do DS + **leitor público server-side** (Admin SDK) com gate de publicação/visibilidade + ISR.

Sem mockup da versão web: você **desenha** sobre o DS + os benchmarks (autoridade abaixo). O job é o alvo; a aparência é sua decisão fundamentada.

## Autoridade de decisão (LER antes de codar — ordem de precedência)
1. **JTBD / stories (alvo primário):** `leela-specs/backlog/LEELA-S1200.md`, `LEELA-S1201.md`, `leela-specs/epics/LEELA-E12-landing.md`, e o JTBD do atleta anônimo em `leela-specs/jobs-to-be-done.md` (§ decidir e inscrever com confiança/baixa fricção). Os **critérios de aceite (Given/When/Then)** das stories são contrato — cada um vira um teste ou uma verificação.
2. **Heurísticas de uso (autoridade de correção, não decoração):** `C:\Users\Vitor Eduardo\.claude\skills\harness\references\design-principles.md` — seleção de controle, tabela-vs-lista-vs-cards pela tarefa dominante, densidade, hierarquia. A dobra de eventos é **descoberta/comparação** (cards), não uma tabela.
3. **Benchmarks (aparência, não corretude):** `leela-specs/discovery/benchmark-cheers.md`, `benchmark-shotgun.md`, `benchmark-ticketing-br.md`. Cheers = marketplace com dobra de eventos na home + página de ingresso; Shotgun = página de evento/festival densa e confiável. Inspiração de layout/hierarquia, **não** cópia de pixel.
4. **Writing contract** (prosa PT-BR de qualquer copy visível): `Orkestra/CLAUDE.md` §Writing contract — sem travessão para colar oração, sem abre-boca ("Vale notar"), copy específica > vaga.

## Contexto técnico (CONSUMIR, não redefinir)
- **apps/painel** = consumidor de referência do `@leela/design-system` (como importar, ThemeProvider, tokens, tailwind-preset). Espelhe o padrão dele na landing; **não** redefina token local (aceite S1200).
- **DS `@leela/design-system`** (via `dist/`): exports `.` (componentes), `./tailwind-preset`, `./themes/leela.css`. Aplique **`theme="leela"`** nas páginas públicas. Componentes prontos (Button, Card, Badge, etc.) — reuse; só crie o que faltar como componente de seção.
- **Modelo de conteúdo — `packages/core/src/eventos/paginaVendas.ts`:** `PaginaVendas` (doc `config`) tem `secoes: SecaoVendas[]`; cada seção tem `id` (`'hero'`,`'sobre'`,…,`'checkout'`), `canal`, `ativa`, `travada`. A página **renderiza as seções `ativa` na ordem do array** (renderizador orientado por config — aceite S1201-T1). Seção `ativa:false` não aparece.
- **Evento seedado — `functions/src/seed/eventos.seed.ts`:** "**Meia Maratona Floripa 2026**" (`status:'publicado'`, slug `MEIA_FLORIPA_ID`, tenant `CASTELO_TENANT_ID`, modalidades 5k/10k/21k, `usaChip`). Existe também "**Maratona Floripa 2027**" (`status:'rascunho'`) — **use-a para provar o 404 público**. Lotes seedados: Promocional (fator 1) → Lote 2 (1.25) → Lote Final (1.5), datas em `lotes`/`modalidades` do seed.
- **Preço vigente / lote ativo** vêm de `packages/core/src/eventos/lote.ts` (`precoVigente`, `loteAtivo`, lote-por-modalidade ADR-012). A página de evento mostra o **preço vigente por modalidade** derivado daqui — nunca preço fabricado.
- **CTA de inscrição:** "Garantir inscrição" navega para a rota de checkout `/{eventSlug}/inscricao` **preservando os parâmetros de atribuição da URL** (aceite S1201). O checkout em si (5 etapas) é **o próximo lote** — aqui a rota de destino pode ser um placeholder honesto ("checkout em construção") OU um stub de rota; o importante é o link certo + params preservados. Contratos que o checkout vai consumir estão em `outputs/leela-build-2d6ee98d/E12-CHECKOUT-FOUNDATION-REPORT.md` (leia a seção "o que a UI vai consumir") — **não** reimplemente cálculo de preço/taxa aqui.

## Escopo (SÓ isto — read-only público)
### A) Fundação S1200
- **S1200-T1:** Layout público (`app/layout.tsx`) com `<html lang="pt-BR">`, metadata base, ThemeProvider/tema `leela` do DS, tailwind-preset do DS no `tailwind.config.ts`. Header público (marca Leela — placeholder textual "LEELA", pois a logo ainda não chegou; deixar slot pronto pra trocar) + footer mínimo.
- **S1200-T2:** **Leitor público server-side (Admin SDK)** em `apps/landing/lib/` — funções `getEventoPublicado(slug)`, `listarEventosPublicados()`, `getPaginaVendas(eventoId)`. Gate por `status`/visibilidade: só devolve `publicado`; qualquer outro (`rascunho`/`encerrado` conforme regra) → `null` (a rota resolve 404). **Nenhum segredo Firebase no bundle do cliente** (tudo em Server Components; credencial via Admin SDK server-only). ISR/revalidação nas rotas.

### B) Homepage marketplace `/`
- Hero da Leela (marca/promessa — copy sua, fundamentada no posicionamento; não precisa ser sobre um evento específico).
- **Dobra "Eventos" = cards dos eventos publicados** (via `listarEventosPublicados()`): nome, data, local/cidade, modalidades resumidas, e link para `/{slug}`. EmptyState honesto se não houver evento. Cards (descoberta/comparação), não tabela.
- Estrutura pronta para mais dobras depois (SaaS/produtor), mas V1 = hero + eventos.

### C) Página de evento `/{eventSlug}` (S1201)
- **S1201-T1:** Rota SSR/ISR + **renderizador de seções orientado por config** (lê `PaginaVendas.secoes`, renderiza as `ativa` na ordem).
- **S1201-T2:** Componentes de seção: **Hero** (nome, data, local, imagem/placeholder, CTA "Garantir inscrição"), **Modalidades** (5k/10k/21k com **preço vigente** por modalidade via `precoVigente`), **Kits**, **Retirada**, **Info/FAQ**, **Percurso**, **Patrocinadores**, **Depoimentos**. Só renderiza a seção se `ativa` e se há dado real; sem dado → não renderiza (nada de placeholder fabricado, exceto imagem de hero).
- **S1201-T3:** Estados públicos: `rascunho` → **404** (provar com o evento 2027); **vendas encerradas/esgotado** → CTA desabilitado com mensagem, conteúdo informativo permanece; bloco **compartilhar/QR** (URL do evento).

## Fora de escopo (próximos lotes — NÃO fazer agora)
- A UI do **checkout de 5 etapas** (S1203) — próximo lote; aqui só o link de CTA.
- SEO avançado/OG dinâmico completo (S1205), e-mail/ingresso (S1206), aceite de regulamento (S1207).
- Asaas real. Logo real (usar placeholder textual, slot pronto).
- Painel/produtor (é outra superfície).

## Regras invioláveis
- **Segurança do leitor:** nenhum segredo Firebase vaza pro cliente; documento não publicado → 404 (aceite S1200/S1201). Server Components para leitura.
- **Nada fabricado:** preço vem de `precoVigente`; eventos vêm do seed via leitor; EmptyState honesto quando não há dado. Sem lorem, sem preço/depoimento inventado.
- **Tema:** `theme="leela"` do DS, sem redefinir token local.
- **Reuso-first:** componentes do DS e o padrão do `apps/painel`; core (`paginaVendas`, `lote`) para dados/preço. Compor, não reimplementar.
- **Acessibilidade base:** foco visível, `alt`, contraste; nada que quebre navegação por teclado.

## Gates (rode você; SERIAL; máquina de 8GB — sem paralelismo pesado)
1. `tsc` (landing + qualquer core tocado) sem erro.
2. `eslint --max-warnings 0` no que você tocou.
3. `next build` da `apps/landing` **passa** (prova que Server Components + ISR compilam, sem vazar segredo).
4. Se criar teste de unidade do leitor (gate de publicação → 404), rode. Integração/emulator = gate consolidado do maestro depois.
- **Gate visual é do maestro** (Playwright desktop 1440×900 + mobile 390×844 contra o emulator, com dados seedados) — **não** capture você; me entregue as rotas exatas para eu capturar (`/`, `/{slug do Meia Floripa}`, e a URL que deve dar 404).

## Report
`outputs/leela-build-2d6ee98d/E12-PUBLIC-SURFACES-REPORT.md`: rotas criadas + o que cada uma renderiza; como o leitor público faz o gate (prova de 404 em rascunho); como o renderizador de seções lê a config; de onde vem o preço vigente (arquivo/função); decisões de design que você tomou e por quê (ancoradas nos benchmarks/design-principles); premissas assumidas; saída real dos gates (tsc/eslint/next build); **as rotas exatas para o maestro capturar no gate visual** + o slug real do Meia Floripa. Retorno ao maestro: resumo de 10 linhas + arquivos + gates + o que o lote do checkout (S1203) vai consumir daqui (rota de destino do CTA + params).

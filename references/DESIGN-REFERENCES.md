# Referências de design — Leela (carregar no reinício de sessão)

> Pasta de referências externas (Figma, protótipos, logos, benchmarks) para o maestro/agentes acessarem entre sessões. Apontada pelo `.nirvana/HANDOFF.md`. Adicione novos links aqui.

## Figma — arquivo "V1 - DS" (`pP90MWzw03NNlRpXicFt6Q`)

Arquivo único que contém a **fonte de verdade de design** da V1: ícones v1, fundação de componentes (que originou o design no "claude design" / o design system `@leela/design-system`), wireframes e logos.

| Referência | Link | node-id |
|---|---|---|
| **Logos** da Leela | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=112-51 | `112-51` |
| **Wireframes — Eventos e Clubs** (feitos pelo Vitor) | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=39-872 | `39-872` |
| **Wireframes — SÓ Eventos e Desafios** (mais focado/barato) | https://www.figma.com/design/pP90MWzw03NNlRpXicFt6Q/V1---DS?node-id=112-4622 | `112-4622` |

**Snapshots salvos** (PNG em `references/figma-snapshots/`): `wireframes-eventos-desafios-112-4622.png` (jornada de compra completa) + `wireframes-eventos-clubes-39-872.png`. Logos em `brand/leela-logos-variantes.png` (5 variantes de cor; SVG individual por variante = exportar os nós `112:5/13/21/29/37` quando aplicar).

**Mapa das telas do wireframe `112-4622` (mobile, DARK, vermelho/marrom da marca):**
1. **Página do evento** ("Corrida do Campeche") — hero com imagem, info (data/local/chip), "Eventos em alta", CTA **"Realizar inscrição"** fixo no rodapé.
2. **Seleção de modalidade** — steppers +/- por modalidade + código de inscrição.
3. **Formulário de inscrição** — dados do atleta (CPF, nome, nascimento, telefone, LGPD); múltiplas inscrições.
4. **Resumo do pedido** → **Pagamento** (PIX / Cartão) → **Confirmação com QR** ("Identificador do Pedido", Pix copia-e-cola).
5. **Social/Clube** — perfil de clube (tabs Feed/Eventos), **desafios + ranking**, telas de pagamento de clube/desafio.
6. **Bottom-nav do app:** Feed · Eventos · Clubs · Perfil (base do modelo de rede social + link-in-bio).

**Notas do Vitor (2026-07-12):**
- Nesta página do Figma ele organizou a **v1 de ícones** + o **embasamento de componentes** que originou o DS ("claude design").
- **Prioridade de refino:** a **página do evento + checkout + jornada de compra** deve ser refinada à fidelidade destes wireframes (a base é o app mobile).
- **Identidade = DARK** (tema `brasa` do DS). A landing pública foi alinhada a isso.

## Benchmarks (já no repo)

- `leela-specs/discovery/benchmark-cheers.md` — marketplace + página de ingresso + (referência p/ o link-in-bio / perfil social).
- `leela-specs/discovery/benchmark-shotgun.md`, `benchmark-ticketing-br.md`, `benchmark-stayf.md`, `benchmark-wellable.md`.

## Visão de produto anexa (a planejar — não implementada)

- **Perfil social / link-in-bio:** Feed · Eventos · Clubs, personalizável na identidade de cada organizador (tematização dinâmica por usuário = "mockup de cores"). Clubes e eventos têm **capa**. Benchmark: Cheers. **→ PLANEJADO: `leela-specs/epics/LEELA-E17-perfil-social.md`** (Onda 3 link-in-bio público / Onda 4 in-app).
- **Assessorias parceiras (tração B2B):** organizador cadastra assessorias como clubes parceiros com desconto exclusivo; convite por e-mail → provisiona conta Leela automática. **→ PLANEJADO: `leela-specs/epics/LEELA-E18-assessorias-parceiras.md`** (Onda 3).

## PONTO 3 — escopo ampliado (Vitor 2026-07-12): reorganizar o roadmap no Obsidian

Ao planejar os épicos novos, **entregar uma visão CLARA no Obsidian** (os `leela-specs/` são o vault) com hierarquia consistente e única:
**Onda → Épico → User Story → Task**, cada nível ancorado ao **Job To Be Done** + persona.
- **Problema atual:** os cards do kanban/roadmap **misturam "Wave" (A/B/C/D, eixo de EXECUÇÃO da trilha next-trail) com "Onda" (1/2, eixo de RELEASE) com "Épico"** — dois eixos diferentes conflados, mais o épico, sem terminologia única. Fica confuso.
- **Entregar:** decidir UMA terminologia (ex.: "Onda" = release; "Épico" = agrupamento de valor; "Wave/Frente" = lote de execução, se ainda necessário, claramente subordinado) e **reescrever `V1-KANBAN.md` + `V1-CHECKLIST.md` + `ROADMAP.md`** nessa estrutura, com cada US → JTBD explícito e tasks abaixo. Índice navegável no Obsidian (links `[[...]]`).
- Incluir os **épicos novos** (social/link-in-bio + assessorias parceiras) já nessa estrutura limpa.

## Regras de domínio novas (Vitor 2026-07-12 — a aplicar/planejar)

- **Kit ← modalidade (checkout):** o modelo do core JÁ vincula kit a modalidades (`kit.modalidades[]`; Ouro=21k, Prata=10k/21k, básico=todas). FALTA: no **checkout, primeiro seleciona modalidade, depois kit**, e o kit deve ser **filtrado pela modalidade escolhida**; podem existir **vários kits** por modalidade. Ex.: "5km masculino corrida" + "kit prata". Entra no refino do checkout.
- **Benchmark TicketSports** (Vitor tem o navegador aberto): jornada = modalidade → kit (vários) → …; e **inscrições só via cupom** (evento fechado/por cupom) é um modo que a TicketSports pratica — considerar como opção de venda. Pedir/revisar prints da TicketSports.
- **Taxa incorporada vs. repassada — CONFIG DO ORGANIZADOR por evento (Vitor 2026-07-12; RESOLVE a pendência do card E12):** o organizador escolhe, ao configurar o evento (E04 / `commercialTerms`), se a taxa Leela é **incorporada** ou **repassada**:
  - **Incorporada (organizador absorve):** o comprador paga o **preço de face**; a taxa é **descontada do repasse** do organizador. No financeiro dele: "valor a receber" = **face − taxa** (a taxa É um débito no fluxo de caixa dele).
  - **Repassada (comprador paga):** o comprador paga **face + taxa**; a taxa vai para a **Leela** e **NÃO entra no fluxo de caixa / valores a receber do organizador** (o "valor a receber" = face; a taxa nunca foi dinheiro dele).
  - Impacto: E04 (toggle por evento) · E09/financeiro (o cálculo de repasse/"a receber" respeita o modo; hoje o FIX 3 assume só um) · checkout (`computeSaleState` já calcula a taxa — o modo decide QUEM paga e se ela aparece no total do comprador) · `commercialTerms` por-tenant/evento. Reconcilia com a taxa por método (10% cartão / 8% PIX, ou %+fixo) ratificada em 2026-07-05 — agora com o eixo incorporada/repassada.
- **Repasse em D+2 (timing de disponibilização):** os valores ficam disponíveis para repasse em **D+2** (2 dias úteis após a transação), NORMALMENTE — **ajustável por cliente** (como a retenção de 15%). Impacto no financeiro/E09: "Valor disponível" = só o que já passou de D+2; "Valor a ser disponibilizado" = retenção (15%) **+** fundos ainda dentro da janela D+2. Hoje o FIX 3 mostra uma aproximação estática (disponível = total − retenção); a janela D+2 entra com a máquina de repasses (E09). Config por-tenant (D+N + retenção %) no `commercialTerms`.
- **Assessorias parceiras = clubes com desconto exclusivo (estratégia de tração):** só **clubes** podem ter condições especiais de desconto; um organizador de corrida cadastra assessorias parceiras como clubes. Relaciona-se ao que a arquitetura já tem (parcerias/afiliação — E08 foi cortado, mas a mecânica de cupom/club existe). **Fluxo de cadastro de assessoria:** via **CNPJ ou CPF**; se o responsável já tem conta Leela → vincula; se não → o organizador manda **convite por e-mail** → responsável completa o cadastro do convite → **cria a conta Leela automaticamente** e entra como **club parceiro**. Épico a planejar (destrava tração B2B via organizador→parceiros).

## Item técnico mapeado — renderização SPA (Matheus/Farol + Vitor 2026-07-12)

**Requisito (correto):** ao trocar de rota, re-renderizar **só o conteúdo**, não o layout persistente (sidebar/header) — evita reconstruir tudo (padrão SPA).
**Status — JÁ APLICADO no painel:** `App.tsx` monta `RootShell` (sidebar+header) UMA vez envolvendo `<Routes>`; ao navegar, só o conteúdo do `<Routes>` troca (shell não re-monta, só re-renderiza p/ o active-state, barato). Cache **TanStack Query (ADR-010)** evita refetch cego entre rotas. A landing (Next App Router) persiste o layout público via `app/(public)/layout.tsx` (equivalente). **O "carregando como site novo" era o emulator de Functions travado (getOverview) + cold-start — resolvido no ponto 1 (heap 1024m).**
**Follow-ups de PERF (não-bloqueantes, lote de consolidação/CONS):** (1) memoizar `shellSidebarSections` no `RootShell` (recomputa a cada nav por `useLocation`); (2) confirmar por medição que navegar ENTRE seções (eventos↔clubes) reidrata do cache sem refetch/flash; (3) checar `React.memo`/`key` estáveis nos containers de conteúdo p/ não desmontar à toa. **Mapeado; não é bug de arquitetura.**

## Decisões pendentes de ratificação do Vitor (defaults defensáveis — não bloqueiam)

- **4 decisões de estoque (FABLE-D):** (1) `estoqueFisico` nasce da transição `em_estoque` (=qtd recebida); (2) limiar de "baixa" = **10 unidades** por SKU (E03 não fixou); (3) máquina de estados linear estrita (estimativa→encomendado→em_estoque, RN-226); (4) validação de tamanho na origem (checkout S209-T2).
- **2 flags da tela de lotes (E04):** (a) `salvarLote` deveria enviar só `nome` quando `vendidos>0` (hoje re-envia janela em precisão de minuto — seguro só porque os dados são minuto-alinhados); (b) janela usa fuso do navegador → produção deve pinar `FUSO_EVENTO`.
- **6 decisões do planejamento (ponto 3):** numeração E17/E18 · ratificar as 2 linhas de JTBD · Onda do link-in-bio público · reescrever KANBAN/CHECKLIST no modelo único vs. manter de-para · números das RNs propostas · política de reserva de `@handle`. Defaults em `outputs/leela-build-2d6ee98d/PONTO3-ROADMAP-EPICOS-REPORT.md`.

## Lições operacionais (herdar nos dispatches — evita repetir erros desta sessão)

- **Agente NÃO roda a suíte inteira (~80 arq) num único emulator:** nos 8GB isso flaka (2 falhas fantasmas) E os agentes ficavam **travados num wait-loop** esperando a notificação da regressão. Regra p/ todo brief de backend: **"rode SÓ os seus testes + os de Rules relevantes via `emulators:exec 'vitest run <arquivos>'` e COLHA o exit code você mesmo; NÃO rode a suíte inteira nem pare esperando notificação externa."** Se um agente travar assim, o maestro faz `TaskStop` + verifica ele mesmo (rebuild core se tocou + `tsc` + roda os testes do lote).
- **8GB — memória:** ~1 emulator pesado por vez; dá p/ 1 emulator (Fable) + 1 leve (Opus, sem emulator) em paralelo; telas do painel são o MESMO app → uma por vez (conflito de arquivo). Heap do `preview.sh` = **1024m** (512m mata o Functions Emulator no seed). JDK 17 → emulator via `npx firebase-tools@13` (v15 exige JDK 21; preview.sh usa o JDK 21 dele).
- **Verificação de cada tela do organizador:** o maestro faz o **gate visual** (sobe `preview.sh`, captura a rota `?preview=castelo`, julga o PNG, derruba) + **Fable-review da fiação de dinheiro** em contexto fresco. Commit incremental por lote.
- **Rota Fable é EXPLÍCITA** (`model:"fable"` no dispatch — inheritance não alcança Fable). Money/segurança → Fable + review antagonista (achou bug real toda vez). UI/mecânico → Opus. Sonnet PROIBIDO no Leela.

## Como usar (Figma MCP)

Com o link acima, usar `mcp__claude_ai_Figma__get_design_context` / `get_screenshot` / `get_metadata` / `download_assets` sobre o `node-id`. Ex.: screenshot do node `39-872` (wireframes) para refinar a página do evento.

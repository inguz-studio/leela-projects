# ADR · Priorização da fila de trabalho do LEELA por pesquisa operacional

> Autor: sf-cto (Software Forge) · DNA Fowler/DHH/Kleppmann · Trace: leela-build-2d6ee98d · Data: 2026-07-06
> Tipo: type-1 (arquitetura de dados client-side + política de sequenciamento) · Modelo: Opus 4.8 (cota Fable esgotada, reset ~03:50 America/Sao_Paulo)
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.

---

## Contexto

A fila do painel LEELA tem lotes que competem por **um único recurso-gargalo**: uma máquina de 8GB onde preview vivo, suíte de testes e screenshots rodam **serialmente, nunca em paralelo** (protocolo LEELA, confirmado no FID-GATE-REPORT que rastreou o crash de exaustão de memória). Por isso a métrica que governa a ordenação não é só esforço agregado, é **makespan no gargalo**. Some-se a isso a restrição dura de roteamento: **Fable esgotada**, tudo roda em Opus até o reset. E a restrição dura do Vitor: **UX-DADOS é âncora #1** (must-have de UX).

`IMAGENS` saiu da fila: aterrissou (commit `7c3f8e5`), tratada como concluída.

Métodos aplicados: **WSJF** (Cost of Delay ÷ Duração), **caminho crítico / dependências**, **minimização de makespan no recurso único**, **custo-de-atraso por item**.

## Decisão 1 · A fila ordenada

Cálculo WSJF bruto (CoD e Duração em escala 1-10; WSJF = CoD ÷ Duração):

| Lote | CoD | Dur | WSJF | Surface | Máquina? |
|---|---|---|---|---|---|
| firebase-admin | 10 | 1 | **10.0** | functions/ | QA de escrita |
| HISTÓRICO→TABELA | 4 | 2 | 2.0 | 1 tela | leve |
| UX-DADOS | 9 | 5 | 1.8 | client cross-cutting | leve (read-path) |
| RESP-MOBILE | 6 | 5 | 1.2 | shell + telas | **pesada (visual 390px)** |
| DS-FORMS & UX | 5 | 6 | 0.83 | telas de forms | pesada |
| ONDA 2 | 4 | 10 | 0.4 | features novas | pesada |

O WSJF bruto colocaria `firebase-admin` em #1 e `UX-DADOS` em #3. Aplico então **duas restrições vinculantes** que reordenam:

1. **Âncora do Vitor** (input, não sugestão): UX-DADOS primeiro.
2. **Minimização de rework (caminho crítico de superfície):** todo lote que toca telas (`RESP-MOBILE`, `DS-FORMS`, `HISTÓRICO`) deve pousar **sobre a camada de cache** de UX-DADOS. Fazer as telas antes do seam = refatorar cada tela **duas vezes** (uma pra responsivo/forms, outra pra pendurar no `useQuery`). UX-DADOS como predecessor faz cada tela ser tocada **uma vez** (Fowler: estabeleça o seam antes de mexer nos consumidores). Isso torna a âncora do Vitor **OR-ótima, não só deferente**.

**Reconciliação do WSJF alto de firebase-admin:** seu CoD=10 vem de "destrava a QA viva de todo fluxo de escrita". Mas durante a janela de UX-DADOS **não há QA de escrita** (UX-DADOS é read-path: skeleton na navegação = leitura). Logo o CoD do firebase-admin **não é incorrido** enquanto UX-DADOS roda. Deslocá-lo de #1 para #2 tem **penalidade de makespan ≈ zero**. Superfícies distintas (client vs `functions/`) não colidem: o código de #2 pode adiantar em paralelo, serializando só no momento da QA na máquina.

**Fila final:**

| # | Lote | Modelo | Esforço/Dur | Custo-de-atraso | Dependências | Por que aqui |
|---|---|---|---|---|---|---|
| **1** | **UX-DADOS** | Opus | M | Alto (must-have Vitor + é predecessor de seam) | nenhuma | Âncora + minimiza rework: o seam nasce antes das telas → cada tela tocada 1×. Read-path, contenção leve na máquina. |
| **2** | **firebase-admin** | Opus (era Fable) | **S** (validado 2×) | **Máximo** (destrava QA viva de toda escrita = gargalo) | nenhuma dura; surface `functions/` ≠ #1 | Maior WSJF bruto. A #2 só por causa da âncora; penalidade ≈0 pois #1 não faz QA de escrita. Destrava a máquina para tudo a jusante. |
| **3** | **HISTÓRICO→TABELA** | Opus | S | Médio-baixo (fecha divergência de mockup) | pousa no seam (#1) | Curto, fecha fidelidade. Absorver como uma das **primeiras telas migradas** no strangler-fig de UX-DADOS (touch-once). |
| **4** | **RESP-MOBILE** | Opus | M | Médio (7 MAJOR, causa-raiz única M1) | #1 (telas no seam) + #2 (escrita QA-ável) | **Bloco de makespan dedicado** — QA visual 390px monopoliza a máquina, nenhum outro preview vivo concorrente. Interno: M1→M3→M5→M4 (QA-LIVE-2). |
| **5** | **DS-FORMS & UX** | Opus | M-L | Médio | #4 (directive: forms nascem responsivos) | Gated por RESP-MOBILE. Incorpora a decisão nova do Vitor: em listas/tabelas/dashboards do admin, **filtros por caixas de seleção (single/multi) > botões de ação** (foco na informação). |
| **6** | **ONDA 2** | Opus (trilha Fable→Opus) | XL (24 lotes/74 tasks) | Baixo (features deferíveis por desenho) | tudo acima + reset Fable | Menor WSJF. Features novas, não reconciliação. Ver Decisão 3. |

## Decisão 2 · Stack de UX-DADOS

**Recomendação: TanStack Query sobre o Firebase client SDK — que é honrar o ADR-010, não escolher stack nova.** O ADR-010 já ratificou "Estado de servidor: TanStack Query"; a auditoria do repo mostra **zero dependência instalada** no `apps/painel` (nem react-query, nem SWR, nem store de dados). O problema ("carrega do zero" a cada navegação) é a **ausência de implementação de uma decisão que já existe**, não uma decisão em aberto. Então não há debate react-query vs SWR: o ADR-010 fechou.

Insumo dos mind-clones (canalizados do DNA `_library/dna/`, subtipos indisponíveis neste harness):

- **Kleppmann** (Consistency Ladder, DDIA cap. 9): para um painel admin, escolha o **degrau mais baixo** que o invariante permite. Listas/dashboards toleram **read-your-writes + bounded staleness** — não precisam de linearizability. `cache-then-revalidate` (stale-while-revalidate) é exatamente isso e mata o ideal #1 "no spinners". O Firestore já traz `onSnapshot` realtime + IndexedDB offline nativo; reserve `onSnapshot` **só** para superfícies genuinamente vivas (balcão/check-in, financeiro em operação), onde staleness quebra invariante. **Armadilha a evitar:** não subir para local-first/CRDT (Automerge) — é over-engineering para um painel single-admin; "data outlives code" aqui se honra mantendo o schema Firestore intacto e trocando só a camada de leitura.
- **Fowler** (Strangler Fig + Gateway): o `useQuery` **é o narrow-waist** que desacopla a tela da fonte. Migração incremental, sem big-bang: (1) `QueryClientProvider` na raiz + um **gateway fino** de Firestore em `packages/core` (pattern nomeado: **Gateway/Query Object**); (2) migrar tela-a-tela, começando pelas de maior tráfego de navegação (Visão geral, Eventos) e **absorvendo HISTÓRICO→TABELA** nessa primeira leva; (3) telas restantes caem por rota conforme RESP-MOBILE/DS-FORMS as tocam — cada uma migrada **uma vez**.

Registro no ADR-stack como implementação do ADR-010 (não novo ADR de stack). `Zustand` permanece só para estado de UI leve (ADR-010), fora do escopo de cache de servidor.

## Decisão 3 · Onda 2 NÃO resolve as divergências de interface vs mockup — CONFIRMADO

As divergências de interface se fecham **terminando o trabalho atual**, não com Onda 2:
- A **fidelidade de componente já passou** no gate Fidelidade (FID-GATE-REPORT: PASS, 4/4 gates, 836 testes verdes). As divergências remanescentes são **seed-data e label fora de escopo** (sparkline "—" por seed, quick-actions A3 já arbitrada), não defeito estrutural.
- O que falta reconciliar é operacional: **firebase-admin** (botões criar/salvar voltam a funcionar no preview) + **HISTÓRICO→TABELA** (última conversão de fidelidade). Fechados esses dois + RESP-MOBILE, a interface bate com o mockup.
- **Onda 2 é escopo aditivo de features** (E04 vendas/cupons/equipe, E12 checkout, plano de cobrança) — abre **superfícies novas**, não reconcilia as existentes. Entra **depois**, e o timing casa com o reset da cota Fable.

## Decisão 4 · Cost envelope (contrato self-score)

Tudo em **Opus** nesta janela (Fable esgotada até ~03:50). Ordem de grandeza:

- Sizing relativo: #1 M · #2 S · #3 S · #4 M · #5 M-L · #6 XL. Itens 1-5 ≈ **um bloco de esforço M-L agregado**; #6 sozinho é ~2-3× isso.
- **Consequência de roteamento (HP3 budget hard-cap):** os lotes que "seriam Fable" são o firebase-admin (mecânico, Opus serve) e **a trilha serial Fable da Onda 2** (checkout, gateway, repasse, gate de segurança/pagamento — onde o edge do Fable importa de verdade). Rodar a trilha Fable-crítica da Onda 2 em Opus agora **queima Opus em trabalho onde Opus não é a escolha calibrada** e perde qualidade de gate. Como Onda 2 é deferível por desenho, **a restrição de roteamento reforça mantê-la em último**: quando chegarmos nela, o Fable resetou (~03:50) e os lotes payment/security roteiam certo.
- **Hard-stop:** a janela Opus atual é sancionada para os **itens 1-5** (todos UI/mecânico, Opus-apropriados por calibração). **NÃO iniciar a trilha Fable da Onda 2 em Opus** — violaria "custo previsível > esforço máximo". Custo previsível desta janela = itens 1-5; Onda 2 espera o reset.

## Status

✅ Decidido. Ordem executável imediatamente. UX-DADOS abre a trilha; firebase-admin destrava a máquina; RESP-MOBILE é bloco de makespan isolado; Onda 2 aguarda reset Fable.

## Consequência

- Protocolo LEELA mantido: 1 task = 1 commit atômico, push por aterrissagem, review antagonista antes de gate, handoff 90/97%.
- Cada tela tocada **uma vez** (seam antes dos consumidores) — economia de rework é o ganho OR central.
- RESP-MOBILE e DS-FORMS não podem sobrepor preview vivo (serialização da máquina 8GB).
- ADR-010 sai de "decidido mas não implementado" para "em implementação" via UX-DADOS.

---

### Self-score (contrato sf-cto)
- **technical_correctness 0.90** — recomendação verificável no repo (ADR-010 existe, deps ausentes confirmadas por grep; causa-raiz M1 e firebase-admin lastreados em QA-LIVE-2 e FID-GATE).
- **scalability_check 0.80** — degrau de consistência nomeado (read-your-writes/bounded staleness); porta de saída realtime via `onSnapshot` para superfícies vivas; Firestore inalterado.
- **security_posture 0.82** — trilha payment/gateway/security da Onda 2 explicitamente adiada para roteamento Fable correto, não degradada em Opus.
- **cost_envelope 0.80** — janela Opus limitada a itens 1-5 com hard-stop na Onda 2; consequência de budget nomeada.

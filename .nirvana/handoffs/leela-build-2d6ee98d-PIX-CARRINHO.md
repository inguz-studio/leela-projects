# Handoff vivo · Lane PIX-CARRINHO · trace leela-build-2d6ee98d

- **Employee:** sf-backend-lead (software-forge) · rota opus xhigh
- **Repo:** `C:\dev\LEELA` · branch `main` · base `4217025` → topo `522c23b`
- **Origem:** rodada **DEC-0726B** (Vitor, 2026-07-26) — item 25 opção (b) + item 26 (prazo do carrinho, RN-158 nova)
- **Território:** `functions/` · `packages/core` · `firestore.rules` · `firestore.indexes.json` · `apps/landing` SÓ no teste do reflexo do T1 (zero linha de produção). `packages/api-client`, `packages/design-system` e `apps/painel` NÃO tocados.
- **Emulator:** exclusivo da lane (`emulators:exec`). Preview do Vitor (:5273/:8180) intocado — não derrubado, não reiniciado, não ressemeado.

## Estado

LANE CONCLUÍDA (T1–T3). Falta a review ANTAGONISTA em contexto fresco — não me auto-aprovo.

## Placar

| Task | Estado | Commit | O que entrou |
|---|---|---|---|
| T1 cancelamento-na-criação | OK | `7e957e9` | a trava não solta mais pelo relógio; o caminho de criação encerra a anterior no gateway (reusando `expirarPixPendenteCore`) e nega com `pix_anterior_nao_encerrado` quando o gateway recusa |
| T2 prazo do carrinho (RN-158) | OK | `b7a2a77` | 15 min da primeira cotação até criar o pedido; estado terminal `expirado_sem_concluir`; cron ADR-015 + gate transacional |
| T3 carimbo da fase 2 | OK | `522c23b` | registro durável por ciclo em `carrinhos/{uid}__{evento}/ciclos/{n}` — estado, instantes, evento, tenant, sem PII nova |

## Decisões de desenho (registradas antes do código)

### T1
"Morta" passa a ter UMA definição nas duas lanes: **o gateway confirmou**.

| Estado da cobrança apontada pela sentinela | Antes | Agora |
|---|---|---|
| pendente, prazo no FUTURO | recusa `pix_pendente_ativo` | igual (inalterado) |
| pendente, prazo VENCIDO | trava SOLTA ⇒ 2ª cobrança viva (A1) | cancela no gateway DENTRO da criação; só então a nova nasce |
| pendente, prazo vencido, gateway RECUSA | (não existia) | criação NEGADA, `pix_anterior_nao_encerrado` |
| paga / falhou / cancelada | não bloqueia | igual (inalterado) |

### T2 · RN-158 (número livre, vizinha da RN-157)
- **abertura** = primeira cotação daquele (comprador, evento) no servidor;
- **concluir** = criar o pedido com a cobrança;
- relógios SEQUENCIAIS: 15 min → conclusão → 30 min de PIX (RN-157). Nenhum encurta o outro;
- sem carrinho (chamada direta sem cotar) ⇒ gate falha ABERTO. Fronteira declarada e escalada.

### T3
Ledger por ciclo em subcoleção (disciplina do `webhookEventos`), porque o doc pai é sobrescrito na reabertura. Nenhuma tela, nenhum agregado.

## Gates (exit literal)

| Gate | Baseline | Final |
|---|---|---|
| suíte functions | 169 arq (2 skip) / 3013 (10 skip) | **exit 0 · 171 arq (169+2 skip) · 3038 testes (3028+10 skip) · 0 falhas** |
| tsc functions/core/api-client/landing | 0 | **exit 0** nos 4 |
| eslint functions/landing | 0 | **exit 0** nos 2 |
| suíte landing | 14 arq / 129 | **exit 0 · 14 arq / 129** |
| next build | exit 0 | **exit 0** |
| marca | PASS | **PASS** (81 arquivos) |

Nenhum navegador aberto. Nenhuma chamada de rede real.

## Escalados

1. **[NOVO]** "abertura do checkout" = primeira cotação — confirmar a intenção.
2. **[NOVO]** comprar sem cotar não é alcançado pelo prazo (fail-open declarado) — fechar exigiria tornar a cotação obrigatória (política nova).
3. **[NOVO · UX]** quem estoura o prazo precisa recarregar a página; não há botão de recomeçar (landing fora do território).
4. **Item 27 segue ABERTO e não implementado.** O T1 estreita a janela do retardatário (mais cobranças vencidas passam a ser de fato canceladas no gateway) mas não a fecha — delta registrado, nada de estorno/reconciliação.
5. Cartão sobre PIX vivo — fronteira mantida, fixada por teste.
6. Escopo por (comprador, evento) não é limite por comprador — RN-158 não muda isso.
7. Asaas `DELETE /payments/{id}` contra conta real — agora com uma pergunta nova: comportamento sobre cobrança JÁ deletada (se levantar, a negativa do T1 pode virar permanente).

## Parada limpa

Sem emergência. Árvore limpa nos arquivos da lane; tudo commitado. Report em
`outputs/leela-build-2d6ee98d/PIX-CARRINHO-REPORT.md`.

---

# Apêndice · review ANTAGONISTA (lane PIXCARRINHO-REV, contexto fresco, 2026-07-26)

**Veredito: APROVADO-COM-FIXES.** Report em
`outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md`.

## O alvo nº 1 procedia

A pergunta que o produtor deixou no report — *"a negativa do T1 pode virar
permanente com o Asaas?"* — tinha resposta **sim**, e o caminho é banal: o
`cancelCharge` vinga no Asaas e a resposta se perde na volta. Da segunda
tentativa em diante o Asaas responde "essa cobrança já foi removida", que é um
4xx — o mesmo canal por onde chega "não consegui cancelar". O adapter tratava
os dois como falha; o pré-voo relia, achava tudo no lugar e negava. Como a
chave da sentinela é determinística, **toda** tentativa daquele carrinho
repetia o mesmo erro, e a mensagem mandava o comprador tentar de novo
eternamente.

Provado em dois níveis: matriz de contrato do `DELETE` (3 das 12 respostas
plausíveis travavam) e `AT-R1` contra o Emulator (12 tentativas seguidas
negadas, estado imóvel — **o domínio não tem escape próprio**, todo o
destravamento dependia de uma distinção que o adapter não sabia fazer).

## Fixes

| Achado | Sev | Fix |
|---|---|---|
| **A1-REV** deadlock permanente de compra | ALTA | `AsaasProvider.cancelCharge` reconcilia por leitura (`GET /payments/{id}`) quando o DELETE não prova a morte. Sucesso só com resposta POSITIVA (`DELETED` ou 404); `RECEIVED`/`CONFIRMED`/`PENDING`/`RESTORED`/sem-`status`/GET-que-falha continuam LANÇANDO. Reconciliação só em 4xx≠429 — 5xx e rede caída seguem custando UMA chamada |
| **A2-REV** "Function-only" era comentário | MÉDIA | 3 testes nas Rules REAIS negando `carrinhos`, `carrinhos/{id}/ciclos/{n}` e `cobrancasPixAtivas` ao cliente, com o uid DONO dos docs |
| **A3-REV** sem teto de espera do gateway | MÉDIA | **ESCALADO** (item 28 do painel) — número é decisão de operação |
| **A4-REV** Mock repete o deadlock no preview | BAIXA | **ESCALADO** (item 29) — afrouxar guarda de teste-duplo é decisão do Vitor |
| **A5-REV** saturação do cron sem sinal | BAIXA | **ESCALADO** (item 30) |

## O que sobreviveu ao ataque

Pré-voo com a anterior sendo PAGA no meio (`AT-R2`) · replay idempotente NÃO
alcançado pelo gate do carrinho (curto-circuito roda antes do pré-voo,
verificado no código) · abertura não sequestrável e prazo não renovável
(`AT-R3`/`R3b`, 20 recotações) · concorrência N=8 na abertura E na reabertura
com **1** registro de ciclo (`AT-R5`/`R5b`/`R5c` — a fase 2 não conta duas
vezes) · fail-open medido e igual ao declarado (`AT-R4`) · backlog de 205
drenando em 2 rodadas com os dois instantes (`AT-R6`) · vocabulário do carrinho
não vaza para pedido/pagamento (`AT-R7b`).

**Fixado, e não estava escrito em lugar nenhum:** a trava do PIX é por
CARRINHO, o prazo da RN-158 é por EVENTO — trocar o conteúdo do carrinho
depois dos 15 min não ganha prazo novo (`AT-R7`).

**Vetor 9 (os 3 testes que mudaram de lado): auditados um a um, APROVADOS.**
Roteiro preservado, asserções acrescentadas, a única inversão é a decisão do
Vitor, nenhuma fixture tocada.

## Territórios e disciplina

Emulator exclusivo via `emulators:exec` · preview do Vitor (:5273/:8180)
intocado · worktree `C:\dev\LEELA-navfix` não tocado · nenhum navegador ·
nenhuma rede real (Asaas por `fetchFn` injetado; `fetch` global lança na
suíte) · `npm run build` antes de cada `emulators:exec` · **zero asserção
removida** em teste existente.

# Handoff de pausa · maestro · 2026-07-28 ~11h45 · trace leela-build-2d6ee98d

Sessão encerrada a pedido do dono ("preciso liberar a memória do PC, e mais
tarde retomamos"). TUDO commitado e pushed até `d4a9ec6` + o commit deste
handoff. Working tree limpo de código; só untracked de sessão (briefs,
logs). Nenhuma lane em voo. Nenhum agente vivo.

## O que esta sessão pagou (madrugada + manhã de 28/07)

Dez lanes aterrissadas, quatro reviews antagonistas completas:

| Lane | Veredito / resultado |
|---|---|
| ESTORNO-ADMIN (retomada 2) | completa; T4-frontend + item 27 + RN-370..380 |
| SPECS-0728 | completa; specs da fila inteira, RN-385..399, dono marcas = E16 |
| CAIXASIMPLES-REV | CAIXA-SIMPLES APROVADA COM RESSALVAS |
| DEBT-REV | DEBT-SWEEP APROVADA COM RESSALVAS (suíte 2× verde, 1.596) |
| POLIMENTO-0728 | itens 49/50/52/53 + item 15 + E-2/E-4/E-5 pagos |
| INGRESSO-QR | completa; emissão + e-mail + tabela + credenciamento |
| INGQR-REV | INGRESSO-QR APROVADA COM RESSALVAS — **posição 1 FECHADA** |
| INGQR-POLISH | item 54 pago (varredura de ingressos órfãos, RN-382) |
| E08-REPASSE | completa; repasse parcial na tela + aviso ao afiliado |
| E08-REV | E08 APROVADA COM RESSALVAS — **posição 2 FECHADA** |

Defeitos reais pegos por review antes de usuário real: dupla baixa do livro
em estorno de grupo (ALTA), e-mail duplicado com QRs de todo mundo, recusa
sem mensagem na fila de estorno, skeleton eterno no super-admin, contrato
CK2-T5 morto (triado: comportamento novo é o certo), vírgula apagando campo
de valor, foco perdido em modal.

Fora do código: Brevo entregando de verdade (item 13, evento `delivered`),
chaves Asaas validadas e rotacionadas (itens 8/9/10), teste real de R$ 5
criado em produção.

## Ponto exato de retomada

1. **Próxima lane de build: PÁGINA DO INGRESSO (item 55).** Não tem brief
   enriquecido ainda. Precisa de mini-spec antes (S1206-T4/E13 não existem
   como história pronta — a INGQR-REV recomendou; resolve QR invisível no
   Gmail, destino do "link do ingresso" do e-mail e desbloqueia o PDF
   S1206-T7). Rota: spec curta (sf-cto) → build → review.
2. Depois: **E10 (posição 3)** — fila pronta da SPECS-0728: `S812-T0`⚔ →
   `T1`⚔ → `T2` → `T3` → `T4`, em série. Brief da spec no épico E10.
3. Depois: **FormBuilder** (fila `S310-T1`⚔ → `S313-T1` → `S313-T2` →
   (`S310-T2`, `S112-T1`); `S1212-T1`⚔ → `S1212-T2`⚔ → `S112-T2` →
   `S310-T3`) e **MARCAS-ADMIN** (prioridade baixa, `S1607-T1`⚔ → T2-T4).
4. Review pendente ABSORVÍVEL: a INGQR-POLISH não teve review própria; a
   próxima REV de dinheiro herda os ⚔ dela (e-mail que espera, registro
   total na detecção, teto de 8 tentativas, chave de idempotência sem a
   guarda do T2 — risco 4 do handoff dela).

## Pendências do dono (nenhuma bloqueia a fila)

- **PIX de R$ 5** (teste real): cobrança `pay_pfv19mnq5y3h16yv` VIVA
  (expira 2027). QR: `C:\dev\LEELA\.nirvana\outputs\leela-teste-pix-qr.png`.
  Na retomada, checar status via GET antes de qualquer coisa (a chave de
  produção está em `functions/.env` → `ASAAS_PROD_API_KEY`; a var ativa
  `ASAAS_API_KEY` está VAZIA de propósito — item 51 — NÃO preencher).
- **Blaze do Firebase** → destrava a frente DEPLOY-PREVIEW (link no ar).
- **Passeio da jornada (item 34)** → RODAR RE-SEED DO PREVIEW ANTES (o
  seed novo grava `codigoIngresso`; sem re-seed a coluna aparece vazia).
- Vetos baratos em aberto: leitura de "cupons" como benefício (posição 5),
  itens 55 (página do ingresso como default) e 56 (máscara de dinheiro).

## Infra local (se o dono derrubar tudo para liberar memória)

- Preview que estava no ar: painel :5273 · firestore-emulator :8180 ·
  landing :3000. Receita para subir de novo: `preview.sh` na raiz do repo
  + `LEELA_CLOCK=2026-03-15` (o seed venceu em 26/04/2026; sem o clock a
  home vem vazia e tudo sai "Inscrições encerradas") +
  `LEELA_USE_EMULATOR` / `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180`.
- Lanes usam emulador EXCLUSIVO via `npx firebase-tools@13 emulators:exec
  --project demo-leela` (8080/9099/5001) — nunca o do preview.
- Monitor do PIX morreu com a sessão (era polling de 5 min); re-armar na
  retomada se a cobrança seguir pendente.

## Regras vivas desta esteira (para o próximo maestro)

Painel de decisões (`leela-specs/01-produto/DECISOES-ABERTAS.md`) é do
MAESTRO — lanes não tocam. Commit por task + handoff vivo por lane em
`.nirvana/handoffs/` + SEM push pelas lanes (maestro pusha nas
aterrissagens). Review antagonista obrigatória em lane de dinheiro, em
contexto fresco, com falsificação de guards. Vigia de 1h por lane
(feedback ⛔ do dono). Reaproveitamento primeiro; reports registram
reaproveitado vs criado. Épico→história→tarefa nos boards, nunca código de
rodada como identidade de card.

## Estado do registro

Painel e rodada DEC-0728 atualizados até a E08-REV (este commit). Audit
trail em `~/.harness-logs/2026-07-27/audit.jsonl` e
`~/.harness-logs/2026-07-28/audit.jsonl`. Handoffs por lane em
`.nirvana/handoffs/leela-build-2d6ee98d-*.md`.

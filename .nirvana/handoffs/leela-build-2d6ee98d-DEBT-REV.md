# Handoff · DEBT-REV (review antagonista) · trace leela-build-2d6ee98d

Alvo: lane DEBT-SWEEP (DEC-0727D, "Dívidas técnicas, resolvam todas") — `6c699dc`
(T1), `ee76432` (T2), `9d58684` (T3), `e98e3c1` + `6b2a024` (T4), `0a2708f` (T5),
`3e3294b` (T6). A sessão daquela lane caiu depois dos commits e antes da
aterrissagem: sem report, sem handoff, sem registro nos boards.

Postura: contexto fresco, adversarial. Preview do dono (3000/5273/8180) intocado;
nenhum emulador subido (a review não precisou de functions). Sem navegador, sem
rede real, sem push.

## Estado: CONCLUÍDA

Veredito da lane DEBT-SWEEP: **APROVADA COM RESSALVAS**.
As seis tasks entregaram o que declararam e o gate literal passou com folga
(2× a suíte completa, 182 arquivos / 1596 testes, zero vermelho, zero flake).
A ressalva não é defeito de código entregue: é o que a lane deixou fora do olho
— um sexto hook de sessão com o MESMO modo de falha que motivou o T1, achado e
consertado aqui.

## Commits desta review

| Hash | O quê |
|------|-------|
| `dc9b190` | FIX — `usePlatformSession` para de travar em skeleton eterno (RED→GREEN, arquivo de teste novo) |

## Veredito por vetor

| # | Vetor | Veredito |
|---|-------|----------|
| 1 | Gate literal: suíte COMPLETA 2× sem flake | **REFUTADO** (a favor da lane) — 182/182 arquivos, 1596/1596 testes, 2 rodadas, zero vermelho |
| 2 | T1 preservou todos os consumidores? | **REFUTADO** — zero chamador órfão; as 5 cópias eram idênticas modulo o nome do tipo; 5 testes preservados verbatim + 1 novo |
| 2b | Hardening esquecido num sexto lugar | **CONFIRMADO (ALTA)** — `usePlatformSession` sem forceRefresh e sem catch; CONSERTADO em `dc9b190` |
| 3 | T4/T5: âncoras reais, histórico e falsificação do gate | **REFUTADO** — os dois gates MORDEM (href revertido: 3 vermelhos; `replace` removido: 6 vermelhos em 3 arquivos) |
| 4 | T2/T3 mataram a causa ou o sintoma? | **REFUTADO com nuance** — zero asserção removida (T2 e T3 ganharam asserções); o teto subiu, mas os números da suíte sob carga justificam |
| 5 | T6: slot bate com o que o código lê? | **REFUTADO** — nenhum código lê `ASAAS_PROD_API_KEY`; `selectProvider.ts` lê só `ASAAS_API_KEY`; `.env.example` coerente |
| 5b | Estado ATUAL do `functions/.env` | **ESCALADO (ALTA)** — chave de PRODUÇÃO no slot que ativa o gateway, escrita por lane posterior |

## Escalados (sem fix — não são da DEBT-SWEEP nem decisão da review)

1. **`ASAAS_API_KEY` do `functions/.env` carrega uma chave de PRODUÇÃO hoje.**
   Não é da DEBT-SWEEP: o T6 (27/07) deixou o slot desligado e escreveu no
   `.env.example` a regra "deixe VAZIA até a ativação ser deliberada e
   revisada". Quem escreveu a chave foi a rodada DEC-0728 do bloco Asaas
   (itens 8/9/10), no dia seguinte. O fail-safe SEGURA — `createAsaasProvider`
   lança `AsaasConfigError` para chave de produção sem `permitirProducao: true`,
   então nenhuma cobrança real acontece. Mas o efeito prático é que o checkout
   do emulador deixou de cair no Mock e passou a ERRAR duro; o comentário
   `DESLIGADO-PARA-DEMO-CLICAVEL` do próprio arquivo diz que a demo clicável
   dependia justamente de a var estar apagada. Pergunta ao dono: *a demo
   clicável do preview deve voltar (var apagada / sandbox religada), ou a chave
   de produção fica aí de propósito para a próxima prova de ativação?*

2. **A prova gated do T6 segue gated.** `DELETE /payments` contra a sandbox real
   nunca foi tentado (item 8). A DEBT declarou; a review confirma que continua
   sem prova e que nada nesta rodada mudou isso.

## Achados registrados sem fix (BAIXA)

- **`shell/session.ts` não tem guarda de desmontagem.** `useShellSession` chama
  `setNome`/`setFotoUrl` direto no callback do `onSessionChange`, sem o `ativo`
  que os seis irmãos têm. Hoje é inerte (o `unsub` roda no cleanup antes de o
  callback poder disparar), então não é defeito provado — é a única sessão fora
  do padrão, e vira defeito no dia em que o `onSessionChange` passar a emitir de
  forma assíncrona.
- **`EventoForm.test.tsx` mantém `shouldAdvanceTime: true` junto do
  `advanceTimers`.** O corpo do commit do T3 chama o `shouldAdvanceTime` de
  máscara do impasse e o `advanceTimers` de conserto da causa; os dois ficaram
  ligados. Sem efeito medido (o arquivo está verde nas três rodadas), mas a
  prosa e o código discordam.

## Gates literais (estado final)

| Gate | Resultado |
|------|-----------|
| Suíte completa do painel, rodada 1 (HEAD da DEBT) | **182/182 arquivos · 1596/1596 testes · 368,54s** |
| Suíte completa do painel, rodada 2 (HEAD da DEBT) | **182/182 arquivos · 1596/1596 testes · 355,50s** |
| Suíte completa do painel, rodada 3 (pós `dc9b190`) | **183/183 arquivos · 1601/1601 testes · 372,30s** |
| `tsc --noEmit` do painel | **0** |
| `eslint src --max-warnings 0` do painel | **0** |
| Falsificação do gate de âncoras (T4) | href removido de 1 aba → **3 vermelhos** |
| Falsificação do gate do A-7 (T5) | branch `replace` removido → **6 vermelhos em 3 arquivos** |

## Deveres de aterrissagem pagos por esta lane

- Handoff póstumo da DEBT-SWEEP: `.nirvana/handoffs/leela-build-2d6ee98d-DEBT-SWEEP.md`
- Report da review: `outputs/leela-build-2d6ee98d/DEBT-REV-REPORT.md`
- Boards: card no `V1-KANBAN` (Feito) + seção no `V1-CHECKLIST`, padrão
  épico→história→tarefa; o card da dívida H7 sai do Backlog.

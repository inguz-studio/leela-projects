# HANDOFF vivo — BUILD-F2F5 (leela-pixreal-diag-20260804)

- Lane: BUILD-F2F5 · Employee: sf-backend-lead · Rota: opus
- Território: `functions/` + runbook em `leela-specs/04-engenharia/` + card no `V1-KANBAN.md`
- Brief: `.nirvana/briefs/leela-pixreal-diag-20260804-BUILD-F2F5-enriched.md`
- Proibido nesta lane, e respeitado: deploy, reenvio real (BREVO-1 aberta), `apps/landing`, `firestore.rules`, painel, escrita em produção.

## Estado das tasks

| Task | Estado | Commit | Nota |
|---|---|---|---|
| F2 · reenvio idempotente por pedidoId | ✅ código pronto, fora do ar | `9abe8396` | callable `reenviarEmailsDoPedido`, admin-only, 9 testes |
| F5 · falha de e-mail vira incidente | ✅ código pronto, fora do ar | `9d980bae` | `emailIngressos` no pedido + campo de alerta + runbook, 8 testes |
| Board | ✅ | (este commit) | card `[E12] S1227` em "Em execução" — código no repo, não deployado |

## Gates (todos verdes)

- `npm run type-check` — sem saída (zero erro).
- `npm run lint` — `eslint src --max-warnings 0`, sem saída.
- Testes, arquivo a arquivo por `emulators:exec` (a suíte completa continua proibida):

| Arquivo | Resultado |
|---|---|
| `reenvioEmailsPedido.integration` (novo) | 9 passed |
| `emailIncidente.integration` (novo) | 8 passed |
| `emailIngressos.integration` | 17 passed |
| `ingressosOrfaos.integration` | 5 passed |
| `emitirIngressos.integration` | 15 passed |
| `webhookAsaas.integration` | 15 passed |
| `checkout2Modelo.integration` | 24 passed |
| `claimFix.integration` | 8 passed |
| `bankAccess.integration` | 5 passed |
| unitários de e-mail + contrato de secrets (6 arquivos) | 220 passed |

## Desvio operacional: emulator em porta própria

As portas 8080/9099 estavam ocupadas pelo emulator da lane paralela (`apps/landing` + rules), e `emulators:exec` recusou subir. A lane passou a usar config e portas próprias. O arquivo `firebase.f2f5.local.json` (raiz, **não commitado**) tem firestore 8481, auth 9498, hub 4402, UI desligada.

Comando usado, arquivo a arquivo:

```sh
export JAVA_HOME="C:/Users/Vitor Eduardo/.jdks/jdk-21.0.11+10"
export PATH="$JAVA_HOME/bin:$PATH"
export LEELA_FS_EMU_PORT=8481
npx firebase-tools@13 emulators:exec --config firebase.f2f5.local.json \
  --project demo-leela --only firestore \
  "cd functions && npx vitest run src/__tests__/<arquivo>.test.ts"
```

Quatro suítes que fixavam a porta 8080 passaram a ler `LEELA_FS_EMU_PORT` (convenção que `webhookAsaas` e `asaasSandbox` já usavam): `emailIngressos`, `ingressosOrfaos`, `emitirIngressos`, `bankAccess`. Sem isso, o cliente de Rules escreveria no emulator da OUTRA lane enquanto o Admin SDK escrevia no desta.

## Reaproveitado × criado

**Reaproveitado:** montagem do e-mail de ingressos e do e-mail de conta (extraídas, não reescritas); `registrarComunicacao`/RN-219 intocada no caminho automático; `assertPlatformAdmin` e o padrão "negação também é registrada" do `getBankDetailsForPayout`; `contaSemFriccaoAuthAdmin`; `selectEmailProvider` (fail-closed RN-137); coleção server-only sem `match` (molde de `ingressosPendentes`); convenção `LEELA_FS_EMU_PORT`; espião de provider dos testes de ingresso.

**Criado:** `checkout/reenviarEmailsPedido.ts` (callable + duas trancas de idempotência), `email/incidenteEmail.ts` (formato do alerta, puro), `shared/auditoriaAcessos.ts` (constante + helper que saíram do módulo bancário), `lerIngressosVivosDoPedido` (leitura pura), `registrarStatusEmailIngressos` (carimbo no pedido), 2 arquivos de teste, runbook.

## O que fica para o maestro

1. **Review antagonista em contexto fresco** nas duas tasks (⚔). Vetores declarados no report da lane.
2. **Deploy** — nada foi deployado. O callable `reenviarEmailsDoPedido` só existe no repositório.
3. **BREVO-1** continua aberta. O reenvio do `T93N7F` é ato do maestro DEPOIS da prova de que a trava de IPs saiu (`GET /v3/account` respondendo 200).
4. **Épico E12 não foi tocado** de propósito: a lane paralela está em `apps/landing/.../checkout` e mexeria no mesmo arquivo. Se S1227 precisar aterrissar no épico, é edição de quem fechar as duas lanes.
5. `firebase.f2f5.local.json` segue na raiz, sem commit. Apagar quando as portas padrão liberarem, ou promover a arquivo de teste se a serialização por lane virar rotina.

## Se o terminal cair

As duas tasks estão commitadas e os gates rodados. Nada foi enviado, nada foi deployado, produção intocada.

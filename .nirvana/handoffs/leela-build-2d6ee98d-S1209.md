# Handoff vivo · Lane S1209-TELA · trace leela-build-2d6ee98d

- **Employee:** sf-frontend-lead (software-forge) · rota opus xhigh
- **Repo:** `C:\dev\LEELA` · branch `main` · base `0c26ed7` → topo `8bbe044` (main == origin, pushed)
- **Território:** SÓ `apps/landing/**`. Proibido: `functions/`, `firestore.rules`, `packages/core`, `packages/api-client`, `packages/design-system`. **Nenhuma violação.**
- **Estado:** LANE CONCLUÍDA. Falta a review antagonista de T2 e T3 (contexto fresco, maestro).

## Gates

| Gate | Comando (de `apps/landing`) | Baseline | Final |
|---|---|---|---|
| tsc | `npx tsc --noEmit` | exit 0 | **exit 0** |
| eslint | `npx eslint app lib --max-warnings 0` | exit 0 | **exit 0** |
| build | `npx next build` | exit 0 | **exit 0** |
| vitest | `npx vitest run` | exit 0 · 9 arq · 63 testes | **exit 0 · 13 arq · 105 testes** (+42) |
| marca | `node scripts/verify-brand-fonts.mjs` | PASS | **PASS** |

Nenhum navegador aberto.

## Placar

| Task | Estado | Commit | O que entrou |
|---|---|---|---|
| S1209-T1 | ✅ | `1866515` | D-4 cupom no step 0 (`CupomCampo` compartilhado, erro próprio, auto-apply da URL sem gate de step) + D-5 Pix/Cartão em `RadioCard` do DS (`SeletorForma`) |
| S1209-T2 ⚔ | ✅ | `f390e6c` | D-6/RN-157 `PixCobranca` nas 2 telas: QR + copia-e-cola + contagem do carimbo do servidor + auto-copy com toast + `expirarPixPendente` ao zerar + cobrança nova só a pedido |
| S1209-T3 ⚔ | ✅ | `ffa88ac` | RN-154 gênero por inscrito (enum do core) + prefill RN-174 sem canal de consulta por CPF |
| S1209-T4 | ✅ | `8bbe044` | D-2 `CardAtleta` unificado + "+ Adicionar atleta" no step 0 + reindexação dos erros ao remover |

Push: após T2 e após T4.

## Inventário de reuso (feito ANTES de codar)

| Peça existente | Uso nesta lane |
|---|---|
| QR + botão copiar (A-3, dentro do `StepPagamento`) | MOVIDOS para `PixCobranca`, ganharam timer e toast — sem 2ª implementação de QR |
| Cupom + auto-apply por URL (A-2) | markup extraído p/ `CupomCampo`; lógica segue única no `CheckoutFlow` |
| Rótulos de total por meio (S1210/RN-180) | viraram o `title` dos botões — nome acessível coberto por teste preservado |
| `RadioCard` do DS | controle dos botões Pix/Cartão (shadcn-first §8) |
| `Toast`/`ToastProvider`/`useToast` do DS | fila e viewport de fábrica, Radix-free (ADR-017) |
| `GENEROS_INSCRITO`/`GeneroInscrito` do core | importados, nunca redeclarados |
| `getCheckoutPrefill`, `expirarPixPendente` | consumidos como estão, sem wrapper próprio |
| `mascaraCep`/`mascaraTelefone` | normalização do que vem do prefill |
| Retry de cotação (BC-1), stepper R13, nota de taxa (A-5), aceites (§5.3) | intocados |

**Criado:** `CupomCampo.tsx`, `SeletorForma.tsx`, `PixCobranca.tsx`, `CardAtleta.tsx`, campo `genero` + `GENERO_LABEL_FORM` em `tipos.ts`, 4 arquivos de teste.

## Aterrissagem

- `leela-specs/00-boards/V1-KANBAN.md` — card E12 movido de "Em execução" para "Feito", reescrito em linguagem do Vitor com os 4 commits.
- `leela-specs/00-boards/V1-CHECKLIST.md` — `LEELA-S1209-T1..T4` marcadas com data, commit e o porquê de cada decisão.
- `leela-specs/03-canon/epics/LEELA-E12-landing.md` — §S1209 com "✅ ENTREGUE", detalhe por task, gates e a ponte temporária do api-client; item do roadmap riscado com nota de que `S1212-T2` está desbloqueada.
- `outputs/leela-build-2d6ee98d/S1209-TELA-REPORT.md` — report da lane (roteiro tela a tela, premissas, pendências).

## Pendências / fugas de escopo

1. **Review antagonista de T2 e T3** — pendente, em contexto fresco. Não me auto-aprovei.
2. **Ponte temporária:** `expirarPixPendente` não é re-exportado pela raiz do `@leela/api-client` (nota do próprio CK2). Como o pacote é território de outra lane, a landing aponta o subpath por `paths` (tsconfig) + alias (vitest), ambos dentro de `apps/landing`. **Apagar quando a raiz re-exportar.**
3. **`GENERO_LABEL` duplicado** em 3 pontos do painel + 1 na landing. Só copy (valores são do core). Candidato a mapa único no core — fora de território.
4. **Herdado do backend, não resolvível na tela:** F1/F2 do CK2 (decisão de identidade escalada ao Vitor) e a premissa CK2-4 (pagamento no gateway após o cancelamento por timer).
5. **Testes existentes:** 2 arquivos ganharam wrapper `ToastProvider`, 1 ganhou `getCheckoutPrefill` no mock. **Nenhuma asserção alterada, afrouxada ou removida.**
6. **Nenhuma fuga de escopo ocorreu** — as duas tentações (re-export no api-client, `GENERO_LABEL` no core) foram registradas em vez de executadas.

---

# Apêndice · Lane S1209-REV — review ANTAGONISTA de T2 e T3 (contexto fresco)

- **Quem:** revisor antagonista despachado pelo maestro, em contexto fresco — não participou da produção. Rota opus xhigh.
- **Alvo:** `f390e6c` (T2) e `ffa88ac` (T3). Colateral lido: `1866515`, `8bbe044`, `S1209-TELA-REPORT.md`.
- **Território:** `apps/landing/` apenas — mesmo fence da lane produtora. **Nenhuma violação.**
- **Veredito:** **APROVADO-COM-FIXES** · fix-commit `59f18ed` · report `outputs/leela-build-2d6ee98d/S1209-REV-REPORT.md`.

## O que caiu

| # | Sev | O que |
|---|---|---|
| 1 | ALTA | `failed-precondition` (servidor: "a cobrança AINDA vale") era tratado como confirmação de expiração — o `.finally` levantava o flag em qualquer desfecho. Relógio adiantado ⇒ PIX cobrável escondido sob "Código PIX expirado — nada foi cobrado de você". |
| 2 | ALTA | Consequência do #1: "Gerar nova cobrança" criava a SEGUNDA sobre uma primeira ainda pendente e pagável. Duas cobranças vivas, uma por clique. |
| 3 | MÉDIA | `navigator.clipboard?.writeText(...).then(...)` curto-circuita a cadeia inteira: sem Clipboard API o botão não copiava, não avisava e não errava. |
| 4 | MÉDIA | `payloadPix` caía no `chargeId` (id interno) e o toast dizia "a chave para pagamento foi copiada". Caminho real: o `asaasProvider` só emite `qrCode` quando o gateway manda. |
| 5 | MÉDIA | (T3) `euCorro` congelado na closure do prefill: desmarcar "eu também vou correr" durante a resposta levava CPF e nascimento do COMPRADOR para o card do Atleta 1. |

Aceitos-com-justificativa: contagem maior que 30:00 com relógio atrasado (#6, escalado) · flag subindo em falha sem veredito (#7, decisão do produtor que se sustenta depois do #2 fechado) · `useToast` fora de provider (#8, armadilha registrada).

## Alegações do produtor

PROVADAS: timer só com carimbo do servidor · retry com `idempotencyKey` nova · `getCheckoutPrefill()` sem parâmetro · 3 negativas da RN-174 no mesmo ramo · digitar CPF não dispara consulta · prefill não sobrescreve o digitado (com a ressalva do achado #5).
REFUTADAS-E-CORRIGIDAS: "o servidor arbitra" (a chamada acontecia, a resposta era descartada) · "`pixExpirado` bloqueia auto-geração, expirar nunca vira cobrança dupla" (valia só para a AUTO-geração; a manual não tinha trava).

## Gates re-rodados (de `apps/landing`, exit literal)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint app lib --max-warnings 0` | **exit 0** |
| `npx next build` | **exit 0** |
| `npx vitest run` | **exit 0 · 14 arquivos · 119 testes** (105 baseline + 14 de ataque) |
| `node scripts/verify-brand-fonts.mjs` | **PASS** |

Nenhum navegador aberto. Nenhuma asserção existente enfraquecida ou removida — os 105 testes do produtor seguem intactos e verdes.

## Escalado (fora de `apps/landing`)

1. `createInscricaoCharge` precisa devolver o `agora` do servidor (ou a duração restante) — sem isso a contagem é palpite sobre o relógio do dispositivo e o achado #6 não tem correção honesta na tela. `functions/` + `packages/api-client`.
2. O servidor deveria recusar abrir uma segunda cobrança PIX enquanto existe uma pendente e válida para o mesmo comprador/carrinho. O pré-voo do cliente fecha o caminho conhecido; a garantia é server-side. `functions/`.
3. Premissa CK2-4 (pagamento no gateway após o cancelamento por timer) segue sem dono.
4. Ponte `@leela/api-client/checkout` continua de pé (a raiz não re-exporta `expirarPixPendente`) — dívida com prazo, não violação.

---
tags: [leela, decisoes, fila, rodada, onboarding, organizador, convite]
trace: leela-build-2d6ee98d
lote: SPEC-ONBOARD
data: 2026-07-28
---

# 03-fila-codigo · Lote SPEC-ONBOARD

> Pacote do onboarding do organizador (entrada na landing + cadastro completo + código de
> convite + overlay). Donos: E16 (código, resgate, overlay), E00 (cadastro), E12 (entrada
> na landing). Bloqueia o go-live controlado: sem isso não existe porta de entrada.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S1608-T1` | Modelo `convitesOrganizador` + core (gerador, normalização, constantes de alfabeto/tamanho — RN-413) + Rules (leitura/escrita client só `platform_admin`; resgate só via Function — RN-414). | `packages/core/src/platform`, `functions/firestore.rules`, seed | — | opus | ⚔ |
| 2 | `S030-T1` | `/cadastrar` vira cadastro completo do organizador: dados obrigatórios + consentimento LGPD explícito (RN-412), criação Auth e-mail/senha, aterrissagem logada na home. | `apps/painel/src/routes` (auth), `packages/api-client` | — | opus | — |
| 3 | `S030-T2` | Doc `profissionais/{uid}` no cadastro (`statusOnboarding: 'aguardando_convite'` + consentimento carimbado — RN-411/412) com Rule de create do próprio doc, shape validado. | `functions/firestore.rules`, `packages/api-client` | 2 | opus | — |
| 4 | `S1609-T1` | Function `resgatarConviteOrganizador`: valida + carimba uso + provisiona via `provisionTenant` (RN-403) na mesma transação; erro genérico único; rate-limit 5/h por conta (RN-414/415). | `functions/src/platform` | 1, 3 | opus | ⚔ |
| 5 | `S1609-T2` | Overlay bloqueante da home (não-descartável) + escopo da conta travada + CTA "Falar com o time Leela" lendo `platform/config.contatoOnboarding` (RN-416/417). | `apps/painel/src` (home/shell), `platform/config` | 4 | opus | — |
| 6 | `S1608-T2` | Tela `/plataforma/convites`: gerar (nota + validade opcional), listar (tabela densa: status, quem usou, quando), revogar com ConfirmModal, copiar código. | `apps/painel/src/routes/plataforma/convites` | 1 | opus | — |
| 7 | `S1213-T1` | Entrada do organizador na landing: "Entrar" + "Criar conta de organizador" no `PublicHeader` (e eco no footer), apontando para o painel por env pública (P10). | `apps/landing/app/components` | — | opus | — |

## Ordem e paralelismo

1. Os itens 1, 2 e 7 não dependem de nada e partem juntos.
2. O item 3 completa o cadastro (2); o item 4 precisa do modelo (1) e do doc do
   profissional (3); o item 5 fecha a jornada depois do 4.
3. O item 6 só precisa do 1 e corre em paralelo com a trilha 2→3→4→5.
4. Jornada de aceite do pacote inteiro: cadastrar → aterrissar travado → resgatar código →
   painel destravado; e no super-admin: gerar → ver uso → revogar.

## Fronteiras

- **`functions/**` está disputado** — a lane DEPLOY-PREVIEW está EM VOO tocando
  código/infra no mesmo repo, e `firestore.rules`/`functions/src/platform` são território
  dela em potencial. **Serializar por lane, nunca por task.** Os itens 1, 3 e 4 são os que
  encostam.
- **`provisionTenant` é máquina única** (RN-403). O item 4 ACRESCENTA um chamador; não
  duplica nem bifurca o provisionamento. Se o assinatura atual não aceitar os dados vindos
  do cadastro (nome/slug derivados — P7), estende-se o input, não se cria função irmã.
- **Home/shell do painel** — o item 5 monta o overlay por cima da home existente; as lanes
  de polimento já aterrissaram, mas conferir `RootShell`/rota raiz antes de escrever.
- **`PublicHeader` da landing** — a landing é Radix-free e tem gate de SEO/perf (S1200);
  o item 7 não adiciona dependência nova nem degrada CWV.

## Critério de pronto do pacote

- [ ] conta sem código nunca alcança rota/dado de tenant — provado por Rules, não por tela
- [ ] resgate válido destrava em UMA ação: tenant + claims + código carimbado, atômico nos
      dois sentidos (falha não queima código; código usado sempre tem tenant)
- [ ] duplo resgate concorrente do mesmo código: um vence, o outro recebe o erro genérico
- [ ] o erro de resgate nunca distingue inexistente × usado × revogado × expirado
- [ ] 6ª tentativa na janela de uma hora é recusada (rate-limit provado por teste)
- [ ] revogar código `ativo` funciona; revogar não desfaz tenant provisionado
- [ ] cliente comum não lê nem escreve `convitesOrganizador` (ataque de Rules)
- [ ] o CTA lê o destino de `platform/config`, nunca de string no código; sem config, cai
      no mailto oficial
- [ ] consentimento LGPD carimbado com versão e instante; checkbox nasce desmarcado
- [ ] a landing mostra "Entrar" e "Criar conta de organizador" em desktop e mobile, sem
      regressão de CWV
- [ ] review antagonista em contexto fresco nos itens 1 e 4 (Rules + Function de resgate:
      enumeração, corrida de uso único, bypass de rate-limit, claim forjada)

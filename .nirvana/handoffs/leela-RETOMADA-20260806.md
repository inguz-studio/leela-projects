# RETOMADA — Leela, pausa de 06/08 (dono vai cortar a internet)

**Ler primeiro.** Zero lane em voo (as duas foram paradas pelo maestro, limpas). `HEAD == origin/main == f2398e36` — **tudo que estava commitado está publicado**. Trace: `leela-pixreal-diag-20260804`.

## O que estava rodando quando parei, e o que sobrou na árvore

Duas lanes, ambas com trabalho **não commitado** que ficou no disco (não se perde com a internet caindo):

1. **`SEAL-DEFAULTS`** — convertia em default permanente os três itens que o dono aprovou (`12b`+`QUALIF-6`, `11`·três segredos, `HIP-R9-01`) e corrigia o registro do backfill. Parou "na seção de fechamento da triagem, que continha a proposta". Na árvore: `leela-specs/01-produto/DECISOES-ABERTAS.md` e `DECISOES-ABERTAS-TRIAGEM.md` modificados. **Retomar daí** — o brief está no despacho da lane; a instrução crítica é que cada item saia com **condição de reabertura escrita**, e que ela **não converta** item que mexa em dinheiro ou dado pessoal.
2. **`REV-SCROLL`** — review antagonista do padrão de rolagem. **Já commitou e publicou um defeito real**: `f2398e36` — *"o showroom também rolava em dois eixos — o ponto cego do lint"*. Parou ao começar os demais fix-commits. Na árvore: `packages/design-system/lint/leela-scroll-plugin.mjs` modificado (o ponto cego que ela estava fechando). **Retomar daí**: faltam os vetores 2–6 do brief (falso-negativo/falso-positivo da regra, trava depois do `className`, risco do eixo x fechado, matriz de kits, `Tabs`).

⚠️ O achado dela já vale registro: **a regra de lint tinha ponto cego** e o showroom do DS passava por ele. É exatamente o risco que eu tinha mandado atacar.

## Estado de produção (tudo verificado hoje)

No ar: painel, landing, functions, rules e storage rules do deploy de 05/08 + **`solicitarRedefinicaoSenha` v4** (deploy de hoje, com probe positivo: `desfecho: conta_inexistente`, 200, sem erro). Índices em dia. IAM do Storage concedido (upload provado). Backfill aplicado (17 pedidos; o do dono é `PED-8CDHM`).

**NÃO está no ar:** tudo o que foi construído hoje depois do deploy — padrão de rolagem (11 componentes + regra de lint), e o que a `REV-SCROLL` ainda vai corrigir.

## ⛔ Armadilha que custou meia hora hoje

O dono estava testando em **`leela-hub--preview-y4n0cxzj.web.app`** — canal de preview congelado em 28/07, que ainda serve a barra superior removida e todo o produto velho. Ele **confirmou** que migrou para `https://leela-hub.web.app`. O preview expira 27/08; **vale derrubar** (o dono não autorizou ainda; eu ofereci). Se alguém reportar defeito "que já foi consertado", **conferir a URL antes de investigar**.

## Fila, na ordem que eu seguiria ao voltar

1. **Retomar `REV-SCROLL`** do ponto exato (vetores 2–6) → depois **deploy** do padrão de rolagem (painel + DS; lembrar do `tsup` do DS antes, `dist/` é gitignorado).
2. **Retomar `SEAL-DEFAULTS`** (leela-specs livre).
3. **`BUILD-SCROLLBAR-TEMA`** — brief pronto em `.nirvana/briefs/leela-scrollbar-tema-enriched.md`. Causa medida: **`color-scheme` não é declarado em lugar nenhum** e não há token de barra de rolagem; por isso a barra sai clara no tema escuro. Traz uma decisão de marca para o dono (nativa temada × estilizada com token).
4. **Superfícies/sombra** — o dono escolheu **sombra**. ⚠️ A investigação mediu que sombra sozinha **não separa** no tema atual (compõe para a mesma cor do preenchimento): implementar exige **clarear a superfície elevada**, que é mudança de token e afeta a interface toda. Piloto acordado: aba de **kits** (6 ocorrências, 5 arquivos), deploy, e o dono julga lado a lado com a visão geral. Relatório: `.nirvana/outputs/leela-pixreal-diag-20260804/SUPERFICIES-REPORT.md`.
5. Filas de build já especificadas e sem código: telas dos dois fluxos de conta (+ os CTAs no modal), modalidades + interruptor de kit, fim do "sem kit com desconto", métricas/Serviço, `LOC-T1` do CRM.

## Sujeira conhecida na árvore (inofensiva)

`HANDOFF.json`, `be-hero-documentacao/`, `apps/mobile/.expo/` e ~20 `firebase.*.json` de emulador por lane, todos untracked. ⚠️ `pnpm-workspace.yaml` **volta a sujar sozinho** com um placeholder inválido que **quebra o install** — reverter com `git checkout --`, nunca commitar (já está na fila técnica como conserto de verdade, `RS1-10`).

## O que espera o dono

Painel com ~60 itens e a **página de triagem** pronta em `leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md` (16 travam trabalho). Os três defaults aprovados baixam para ~56 quando a `SEAL-DEFAULTS` fechar. Ações dele: matar as contas de demonstração e criar o administrador real (`ADMINSEP-3`), e a conferência visual — agora **no endereço certo**.

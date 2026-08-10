---
tags: [leela, fila, rodada, admin, usuarios, onboarding, vitrine, aprovacao]
trace: leela-admin-usuarios-20260810
lote: SPEC-ADMIN-USUARIOS
data: 2026-08-10
---

# 04-fila de código · o que sobe, em que ordem, e o que segura cada peça

> Nada aqui sobe sem a spec ter passado. Esta fila **entra na onda 5 da SPEC-ADMIN-VISAO**
> (`2026-08-09-admin-visao/04-fila-build.md`), que já é dona da tela: as tarefas S1616 são o
> contrato de servidor e de vitrine que aquela onda esperava, não uma onda nova competindo pela
> mesma superfície. Territórios declarados; a regra de nunca usar `amend`/`stash` em árvore
> compartilhada continua valendo.

## O que segura a fila antes da primeira linha

| Peça | Espera |
|---|---|
| `S1616-T1` (convergência) | nada de veto — pode ser especificada em código junto da S1615-T3, mas **não deploya** sem o gate de produção abaixo |
| `S1616-T2` (saída da vitrine) e `S1616-T3` (copy) | **ADMINVISAO-5 (b)** |
| `S1616-T4` (régua do gatilho) | **ADMINVISAO-5 (a)** — na ratificação, é só texto canônico; custo de código zero |
| `S1616-T5` (recusa/revogação) | **ADMIN-USUARIOS-2** |
| A tela (S1615-T1/T2) | continua na onda 5 da ADMIN-VISAO: REDESIGN-DS + V-4 + V-5 + LGPD-1 |

**Gate de produção, herdado do corte de 09/08:** o registro diz que
`resgatarConviteOrganizador` responde **404 em produção**
(`2026-08-09-corte-painel/02-fila-execucao.md` §PONTE-ELEGIVEL-1). Antes de qualquer build que
dependa da porta do código viva, a lane construtora **confere o deploy** e, se confirmar,
resolve primeiro — a fila da aprovação não faz sentido com a porta 1 morta. Medir produção não
foi território desta lane de spec.

## As tarefas, com território

| # | Tarefa | História | Território | Gate |
|---|---|---|---|---|
| 1 | Liberação direta reusa `provisionTenantCore`; teste compara os dois desfechos campo a campo ⚔ | `S1616-T1` (contrato da `S1615-T3`) | `functions/src/platform/`, `functions/src/__tests__/` | desfechos idênticos provados; recusa nomeada ao admin; negativa registrada |
| 2 | Registro do ato de aprovar nas duas portas (quem, quando, porta, sobre quem) no livro `auditoriaAcessos` | `S1616-T1` (RN-551) | `functions/src/platform/` | concessão E negativa registradas; nenhum export |
| 3 | Assinatura do doc próprio na vitrine + `getClaims(true)` + queda por sessão com travas devolvidas + allowlist com o nome novo ⚔ | `S1616-T2` | `apps/painel/src/routes/onboarding/` | atributo `inert` devolvido em TODAS as saídas (lição REV-CORTE, medível sem navegador); allowlist verde com o nome declarado |
| 4 | Copy do aviso cobre as duas esperas, numa linha | `S1616-T3` | `apps/painel/src/routes/onboarding/OverlayConvite.tsx` | gate de voz; campo de resgate intocado (RN-414) |
| 5 | Régua do gatilho: texto canônico (ratificação) ou reescrita de P11/P14 | `S1616-T4` | `_lib/primeiraInteracao.ts` **só** na leitura restritiva | testes de `vitrine-interacao` acompanham a resposta |
| 6 | Recusa/revogação conforme ADMIN-USUARIOS-2 | `S1616-T5` | a definir com a resposta | rastro RN-551; revogação nunca apaga dado |

⚔ = claims e acesso: rota opus com review antagonista.

## Consertos pequenos que a medição achou, sem carona em decisão

| # | O quê | Onde | Por quê |
|---|---|---|---|
| P1 | A sidebar troca para a nav de plataforma por pathname, sem olhar claim — conta em vitrine que digita `/plataforma` vê a barra do super-admin | `apps/painel/src/shell/sidebar.ts:148-157` | dado nenhum vaza (vitrine não consulta, Rules trancam), mas a moldura mente o papel; conserto de uma condição |
| P2 | Testes unitários dos puros `ehTentativaDeUso`/`ehTeclaDeUso`/`areaDaVitrine` não existem (só integração) | `apps/painel/src/routes/onboarding/_lib/` | a régua da RN-549 vira canônica; os puros que a implementam merecem casos diretos |

## O que esta fila NÃO contém, de propósito

- A tela da fila e do diretório — **S1615-T1/T2**, onda 5 da ADMIN-VISAO.
- O canário de `pessoas` e `collectionGroup` — **S1615-T5**, já na fila de lá.
- A sexta recusa da ponte — **PONTE-ELEGIVEL-1**, lane própria, review antagonista, sem carona.
- O best-effort do write de perfil no `/cadastrar` (conta órfã) — frente do **LGPD-1**.
- Qualquer mudança em `firestore.rules` — esta rodada não abre nada.

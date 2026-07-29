---
tags: [leela, fila, rodada, ingresso, build]
aliases: ["Fila pagina-ingresso 2026-07-29"]
trace: leela-build-2d6ee98d
lote: SPEC-INGPAGE
data: 2026-07-29
---

# Fila de código · página do ingresso

Cinco tarefas. Todas `opus` pela Regra L do projeto (teto Opus, nada de Sonnet no Leela).

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| 1 | `S1214-T1` | Token `LLIP1` no core (formato, parse, separação de domínio) + assinatura/verificação server-side reusando o keyring + Function `ingressoPorLink` que projeta o dado mínimo com o QR já renderizado | `packages/core/src/tickets`, `functions/src/eventos`, `functions/src/http` | — | ⚔ |
| 2 | `S1214-T2` | Rota `/ingresso/{token}` na landing: Server Component, matriz de estados, DS pela entrada server-safe da ADR-017, três cabeçalhos de privacidade, slug reservado | `apps/landing/app/(public)/ingresso`, `functions/src/eventos/slug.ts` | 1 | ⚔ |
| 3 | `S1214-T3` | Base pública única por ambiente + link por inscrito no e-mail da compra, com degradação para só-código quando a base não existir | `functions/src/eventos/publicarEvento.ts`, `functions/src/email`, `apps/landing/lib/seo.ts` | 1 | ⚔ |
| 4 | `S1214-T4` | Versão imprimível da página (A4, CSS de impressão, sem navegação) | `apps/landing/app/(public)/ingresso` | 2 | — |
| 5 | `S1206-T7` | Fecho: marcar o código no PDF como coberto pela versão imprimível (RN-424) | boards + épico | 4 | — |

**Paralelismo.** A 1 abre tudo. Depois dela, a 2 e a 3 correm juntas (territórios distintos:
uma é página, a outra é e-mail e base). A 4 espera a 2. A 5 é fecho de board.

**Disputa de território a serializar por lane.** `functions/**` é o de sempre. Antes de rodar
a suíte da landing ou do painel, `tsup` em `packages/core` se a 1 tiver tocado o core (lição
registrada na NAV-FIX).

## Review antagonista em contexto fresco

Obrigatória nas tarefas 1, 2 e 3. Os oito vetores mínimos:

1. **Rules intocadas.** Provar que nenhuma regra foi afrouxada e que cliente anônimo continua
   sem ler `inscritos`. Falsificar afrouxando e ver a asserção morder.
2. **Sem oráculo.** Token inválido, assinatura inválida, inscrito de outro evento e evento
   inexistente devolvem resposta idêntica, byte a byte.
3. **Rotação × link emitido.** Rotacionar o kid ativo não mata link já enviado; tirar o kid do
   ring revoga. A prova ponta a ponta, no emulador, como no vetor 4 da INGQR-REV.
4. **Separação de domínio nas duas direções.** `qrToken` na URL não abre a página; token de
   link não passa no check-in.
5. **Binding.** Re-emitir o ingresso invalida o link antigo; rotacionar a chave **não**
   invalida. As duas provas juntas, porque é fácil trocar uma pela outra no código.
6. **Estornado e cancelado sem QR.** Falsificar removendo a guarda.
7. **Privacidade.** A projeção não carrega CPF, telefone, e-mail, nascimento, contato de
   emergência nem resposta de formulário; os três cabeçalhos estão na resposta; a rota é
   `noindex`.
8. **Base pública.** Sem base configurada, o e-mail sai sem link, e não com `undefined` no
   meio da URL nem com o domínio antigo.

## O que a fila NÃO faz

- Não gera PDF no servidor.
- Não mexe na emissão, no check-in nem na varredura de órfãos.
- Não decide o domínio (item 12).
- Não constrói a área logada do atleta.

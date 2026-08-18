# Plano da noite · maestro · 2026-08-04 (trace `leela-build-2d6ee98d`)

Dono foi dormir com autorização permanente: **seguir com tudo que não depende de decisão dele; chamar de manhã**. Este arquivo existe para a noite sobreviver a um crash de terminal (aconteceu duas vezes nesta trace).

## RESULTADO (atualizado ao vivo) — 11 lanes pagas, 1 em voo

| Lane | Resultado |
|---|---|
| PIXREAL-FIX | ✔ 16 functions deployadas; `internal` morto, tela parou de mentir, P0 do ingresso consertado, guarda estática de segredos criada |
| PIXREAL-REV | ✔ 8 vetores; **4 defeitos reais**, com destaque para a REINCIDÊNCIA (`gatewayReal` vinha do provider vivo, não do que emitiu) |
| AUDIT-TESTES | ✔ laudo: 6.840 casos, **0 de 266 pares com teste antes**; buraco central = gate testa o `*Core`, produção quebra na casca |
| RESEARCH-METODO | ✔ BMAD = adotar pouco, não instalar; onda 1 = igualar gate do CI ao local |
| DECISOES-CLEAN + DEC-0803B-SEAL + RODADA-SEAL | ✔ painel 37→19→24, formato padronizado, rodada e boards selados |
| QA-DATA-0803 | ✔ desafio-mtb 122→120; evento `teste-taxa-repassada` no ar |
| SPEC-ADMINSEP | ✔ RN-449..453, 17 tarefas; achou **ADMINSEP-3** (super-admin de produção = conta demo) |
| VITRINE-FIX | ✔ premissa do brief invertida e corrigida; alerta ao organizador criado; landing deployada |
| DOCS-EXTERNO | ✔ 7 documentos + navegação; achou o painel em 404 |
| PAINEL-DEPLOY | ✔ `leela-hub.web.app` no ar; porta do organizador re-provada inalcançável (404 com controle positivo) |
| IDENTIDADE-EMAIL | ✔ 8 e-mails renderizados p/ aprovação; logo no ar; dark-first com 11 pares AA sob inversão |
| SPEC-JUROS-MARGEM | ✔ RN-454..459; **margem não é apurável hoje** (custo por parcela inexistente + `netValue` descartado) |
| DEPLOY-EMAIL | ⏳ em voo — sobe identidade dos e-mails, `solicitarRedefinicaoSenha`, fix do `gatewayReal` e 3 consertos de 1 linha |

**Ação do maestro fora de lane:** senha do `platform_admin` de produção rotacionada com autorização do dono (`demo1234` agora recusada, HTTP 400 provado); item 11 do painel verificado (BANK_DATA_KEY OK; **Sentry desligado em produção** = pendência nova).

**3 lanes morreram por erro de API (522 e conexão fechada) e nenhuma perdeu trabalho** — checkpoint e disco salvaram as três.

## Em voo agora (5 lanes)

| Lane | Employee | Território | Na volta |
|---|---|---|---|
| PIXREAL-FIX | sf-backend-lead | `functions/`, `apps/landing/` | REV antagonista do caminho do dinheiro |
| AUDIT-TESTES | sf-qa-engineer | read-only + 1 doc | avaliar onda 1 das recomendações |
| SPEC-ADMINSEP (+ área do cliente) | sf-cto | `leela-specs/` | build da separação de contas |
| RESEARCH-METODO | sf-cto | read-only + 1 doc | relatório ao dono |
| INV-EMAIL-INGRESSO | sf-backend-engineer | read-only | catálogo de e-mails + fixes |

## Fila da noite — NÃO depende de decisão do dono

Ordem por risco ao dinheiro e ao comprador, depois por custo.

1. **REV antagonista da PIXREAL-FIX.** Caminho do dinheiro mudou; toda mudança de dinheiro nesta trace ganhou review em contexto fresco e toda review achou defeito. Não pular.
2. **Vitrine × servidor** (achado QA-DATA): a landing decide venda só pelos lotes; `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estão publicados e INACESSÍVEIS em produção agora. Bug puro, prioridade alta.
3. **Separação de conta admin × organizador/cliente** — build sobre a fila que a SPEC-ADMINSEP entregar. Corrige código já pushed (`aa0e2183` + teste `d8d36697`) que contradiz a decisão real do dono. Corrigir para a decisão declarada não é decisão nova.
4. **Catálogo de e-mails documentado** (todos os disparos, gatilho, destinatário, provedor, template, se já rodou em produção — inclui os do Firebase Auth), no repo, formatado para leitura no Obsidian e exportável ao Confluence depois. Fonte única: `leela-specs/`.
5. **Logo da Leela no header dos e-mails** com fundo na identidade, usando tokens do DS (autorizado explicitamente).
6. **Fixes de e-mail que forem defeito e não decisão** — ex.: link apontando para domínio de terceiro (RN-423), degradação silenciosa quando não há provedor de e-mail.
7. **S708** máscara de dinheiro pt-BR no campo de repasse (item 56 aprovado).
8. **S1219** total pronto na abertura do pagamento (item 64: o alvo é não ter espera perceptível, porque a cotação já foi disparada na etapa de dados).
9. **S1220** miudezas fechadas hoje: Session Replay e o link do ingresso (59), limite de caracteres do PIX (65), troca da foto de ioga (PB-13).
10. **S031** retenção de 7 dias das imagens de build (regra permanente: limpeza não sobe ao dono).
11. **Spec S1610** tabela de juros no admin com custo de parcelamento, markup e margem por parcela (PB-2 + JUROS-2).
12. **Documentação para o time externo** validar o trabalho (o que o sistema faz, RNs, decisões e provas).
13. **Onda 1 do laudo de testes** (o laudo ATERRISSOU — `outputs/leela-build-2d6ee98d/LAUDO-TESTES.md`). Priorizar 13.1 e 13.2, que pagam sozinhos:
    - **13.1 · checagem estática do binding de segredo.** Os DOIS defeitos que custaram compras (`CRM_ID_PEPPER` em 29/07, `ASAAS_WEBHOOK_AUTH_TOKEN` em 03/08) são a mesma classe: a function usa um segredo que o `runWith` dela não declara. É verificável estaticamente. Fazer DEPOIS da PIXREAL-FIX aterrissar (mesmo território).
    - **13.2 · caso que constrói o invólucro com ambiente incompleto.** 50 dos 88 exports do `index.ts` nunca são citados em teste; o gate testa o `*Core` e produção quebra na casca.
    - 13.3 · fixture em escala real no e2e do gateway (o teste de contrato EXISTE e teria pego o `externalReference` 155>100 — passou por onze caracteres de fixture curta demais).
    - 13.4 · `fast-check` nas réguas de dinheiro (a varredura de taxa só cobre o ramo COM juros; o defeito vivia no ramo `jurosAoMes: 0`, que é o estado de produção).
    - Achado de processo para o selo: 568 trailers `Not-tested:` no histórico e `Confidence: low` **nenhuma vez** em 1296 commits, enquanto 10 reviews confirmavam 9 defeitos — o projeto já escreve o que não testa e nada converte isso em verificação.
14. **E10** (fila de construção) se sobrar noite.

## Bloqueado no dono — NÃO tentar resolver

- **LGPD-1** — organizador ativo sem prova de aceite; retém o seed do primeiro convite. Sem isso, nenhuma porta de organizador é semeada em ambiente nenhum.
- **Pagar um PIX real** — `pay_6e37hktx4xld12qf` R$ 11,05 (vence 05/08); os de R$ 63 e R$ 75 vencem 04/08. É a única prova de que o dinheiro entra ponta a ponta; nunca aconteceu.
- **"Botão para a área de administrador"** — premissa do maestro: é o painel do ORGANIZADOR, não o `platform_admin`. Build da área do cliente fica retido até confirmação; a spec pode avançar.
- **Convite × auto-serviço** para virar organizador — quem controla a porta é juízo de dono.
- Domínio público (12/66) · salvar termos comerciais no painel (JUROS-1) · Asaas para pagador estrangeiro (12b).

## Verificações que o maestro pode fazer sozinho

- Item 11: confirmar `BANK_DATA_KEY` e endereço do Sentry em produção (o resto dos segredos já foi provado). Sem `BANK_DATA_KEY` o cadastro bancário falha fechado.

## Regras da noite

- Gates em série; `pnpm --config.verify-deps-before-run=false`.
- Deploy de functions sempre ALVO, function por function. Landing liberada (DEPLOY-1 decidido: publicar com seed retido).
- Toda lane com handoff vivo + `lane_checkpoint`; commit por task; push a cada 2-3 commits.
- Nenhum convite de organizador semeado em ambiente nenhum.
- Selo único de boards/épicos/painel na aterrissagem final, como ontem.

## Relatório da manhã

Entregar: o que foi pago com commits, o que cada review derrubou, o estado do pagamento real, os laudos (testes, método, e-mails) em resumo, e a lista curta do que espera decisão dele.

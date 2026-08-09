---
tags: [leela, rodada, painel-cliente, ponte-profissional, cartao, cta]
aliases: ["Desenho do cartão da ponte", "PONTE-RET-D1"]
trace: leela-retomada-20260808
lane: PONTE-RET
data: 2026-08-08
fonte: direção do dono de 07/08 (verbatim em 01-decisoes-dono.md §"Direção do dono — 07/08")
---

# 06-desenho · O cartão da ponte, e o que ele pode prometer

Registro da decisão de desenho **PONTE-RET-D1**. Vizinho de [[01-decisoes-dono]] §"Direção do dono
— 07/08", que tem o verbatim, e de [[05-fila-codigo]], que tem a ordem.

## O pedido, decomposto

O dono deu **três rótulos e uma ordem**:

> "a primeira é 'Painel Profissional' ao invés de virar profissional. Podemos ter CTA's diferentes,
> que é 'Criar Club' e 'Organizar eventos'"

- Um rótulo nomeia o **lugar**: "Painel Profissional". Ele vem com "a primeira é".
- Dois nomeiam o **trabalho**: "Criar Club" e "Organizar eventos". Vêm com "podemos ter".
- A frase que abre o recado é "devemos testar coisas diferentes".

Lido junto, o pedido é uma **fila de variantes**, não um cartão com dois botões. A leitura está
aqui escrita para poder ser corrigida pelo dono (PONTE-CTA-1 no painel canônico).

## Os dois fatos que a construção achou, e que mudam a pergunta

### Fato 1 · a criação de clube existe. A premissa contrária estava errada.

O brief da retomada e o dispatch desta lane partem de que "criação de clube não existe como
superfície hoje". A varredura desmente:

| Peça | Onde |
|---|---|
| Tela de criação de clube | `apps/painel/src/routes/clubes/novo/NovoClubePage.tsx` |
| Rota `/clubes/novo` | `apps/painel/src/routes/clubes/ClubesRoutes.tsx:45` |
| CTA "+ Criar clube" no hub | `apps/painel/src/routes/clubes/hub/HubClubes.tsx:114` |

A tela tem formulário, validação do core (`validarClube`), slug derivado do nome e `codigoConvite`
gerado no submit (RN-101). Não é esboço.

O que a segura é o **tenant**, e é o mesmo portão de tudo o mais:

- `NovoClubePage.criar()` exige `session.tenantId` — sem ele, para em "Sessão não autenticada".
- `apps/painel/src/App.tsx:62` embrulha a árvore de rotas inteira no `ContaTravadaGate`, que troca
  o painel pela `VitrinePainel` enquanto a conta não tem tenant. `/clubes/novo` **nem monta** para
  a conta recém-promovida.
- `resgatarConviteOrganizador` → `provisionTenantCore` entrega o tenant. Depois do código, **as
  duas** áreas abrem.

**Conclusão:** "Criar Club" e "Organizar eventos" são **simétricas**. Nenhuma espera superfície
nova; as duas esperam o mesmo código de convite. A vitrine já nomeia as duas com o mesmo peso —
`areasDaVitrine.ts` traz `/eventos` → "Eventos" e `/clubes` → "**Clubs**", que é inclusive a grafia
que o dono usou.

### Fato 2 · não existe medição na landing. É este o fato que decide.

```
grep -rln "gtag|plausible|posthog|analytics|logEvent|mixpanel" apps/landing
  (excluindo node_modules e .next)  →  zero arquivos
```

Dois CTAs lado a lado disparam a **mesma** promoção. Sem uma linha de telemetria, não há como saber
qual foi clicado — o teste não teria leitura. E o custo não é zero: dois botões cobram de quem lê
uma decisão a mais, num cartão cuja função é desbloquear um caminho que hoje é beco sem saída.

## PONTE-RET-D1 · a decisão

**Uma porta, com o nome do lugar. As outras duas ficam na fila, escritas ao lado dela.**

O que subiu no cartão de quem ainda não é profissional:

| Elemento | Texto |
|---|---|
| Título | "Quer organizar eventos ou criar um club?" |
| Corpo | nomeia as duas áreas, a mesma conta, e o código Leela como o que abre os dados |
| Aviso do segundo login | inalterado, **antes** do clique (PCLIENTE-3 · RN-513) |
| Aceite do termo | inalterado, nasce **desmarcado** (RN-466) |
| **CTA** | **"Painel Profissional"** — texto exato do dono |
| Confirmação pós-clique | nomeia "Eventos e Clubs" e repete o portão do código |

O título carrega as **duas intenções**; o botão carrega o **lugar**. Assim o cartão diz as três
coisas que o dono pediu sem que nenhuma delas vire promessa de destino imediato.

O rótulo é uma constante única — `ROTULO_DA_TRAVESSIA`, em `PortasDaConta.tsx` — com as três
variantes documentadas ao lado. Trocar de variante é uma linha.

## O que ficou de fora, declarado

1. **Os dois CTAs simultâneos.** Fora por falta de medição, não por falta de superfície. Volta no
   dia em que a landing tiver telemetria, ou nunca, se o dono decidir que o nome fixo basta.
2. **A medição em si.** Seria a primeira infra de analytics do produto. Não é lane desta onda e não
   entra de carona num conserto de porta quebrada.
3. **Qualquer construção de criação de clube.** Proibida pelo dispatch, e desnecessária: ela existe.
4. **Deep-link para a área que a pessoa escolheu.** O tipo `RotaPainel` admite `/entrar` e
   `/cadastrar`, e só. Levar alguém direto a `/clubes` exigiria um parâmetro de redirecionamento
   atravessando duas origens de Hosting — superfície nova, num caminho que a review antagonista
   ainda não olhou. A pessoa cai na visão geral da vitrine e o menu leva à área em um clique; a
   vitrine acompanha o endereço.
5. **A conversa de vocabulário.** "Eventos" e "Club" são nomes de **área do painel** e convivem com
   o guarda-chuva "experiência"/"participante" da D-0802-1. Se um rótulo de trabalho vencer o teste
   e virar a porta permanente, a conversa volta. Registrado em PONTE-CTA-1.

## O que não se perdeu ao mexer no cartão

Tudo verificado por teste, não por leitura (saídas em
`.nirvana/handoffs/leela-retomada-20260808-PONTE-RET.md`):

- rótulo da RN-468 fala "profissional", nunca "organizador";
- o aviso do segundo login aparece **antes** do clique (PCLIENTE-3);
- o aceite nasce **desmarcado**, com o termo da RN-466 — nenhuma constante nova;
- trava de duplo clique por ref;
- uma frase de produto para cada uma das cinco recusas, nenhuma saindo como `internal`;
- a copy que contradizia a RN-450 continua fora;
- `apps/landing/lib/portaOrganizador.ts` **não foi tocado** — o comentário pinado da FRONTEIRA-AUTH
  nas linhas 52-68 está intacto, e o papel literal continua sendo o certo.

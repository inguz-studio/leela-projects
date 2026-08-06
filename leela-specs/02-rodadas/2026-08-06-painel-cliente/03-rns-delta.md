---
tags: [leela, rns, rodada, painel-cliente, participante, ponte-profissional]
trace: leela-spec-painel-cliente-20260806
lote: SPEC-PAINEL-CLIENTE
data: 2026-08-06
---

# 03-rns · O painel do cliente e a ponte para o profissional

> **Prova de não colisão (2026-08-06).** A faixa mais alta em uso era a **510**, consumida hoje
> pela ONBOARD-VITRINE. Varredura por `RN-511` a `RN-517` em `leela-specs`, `apps`, `packages`,
> `functions` e `firestore.rules`, fora de `node_modules`: **zero ocorrências nas sete**. Esta
> lane consome **RN-511 a RN-514**. O 460 continua marcador de faixa sem enunciado e segue de
> fora, e as 483 a 485 continuam vagas pela reserva descrita no [[indice-de-regras-de-negocio]].
>
> **Prova de não colisão de story.** `S1233` a `S1237` varridos nos mesmos alvos: **zero
> ocorrências**. Esta lane minta **S1233**, **S1234** e **S1235** no E12, cuja série mais alta
> em uso era a S1232, e **reserva** a **S1236** e a **S1237** para o reembolso e a troca de
> titularidade pelo painel do cliente (PCLIENTE-5). As duas nascem nomeadas no [[V1-KANBAN]] e
> **sem enunciado no épico** até a rodada própria — reservar evita que a próxima lane as consuma
> para outra coisa e deixe o card órfão.
>
> O texto canônico vive no épico dono, [[LEELA-E12-landing]]. Decisões em `01-decisoes-dono.md`;
> spec em [[02-spec-painel-cliente]]; telas em [[04-inventario-de-telas]].

## Novas

| RN | Regra (resumo — canônico no épico) | Épico | Lote |
|---|---|---|---|
| **RN-511** | **O painel do cliente é a área do cliente amadurecida, e continua morando na landing.** Uma superfície só, em `/minha-conta`, que ganha casca de painel — cabeçalho de conta, navegação persistente das quatro áreas e estados de sistema com nome próprio. Não nasce endereço novo, não nasce aplicativo novo e o painel profissional **não** vira casa de participante: a guarda de conta órfã do `destinoPosLogin` fica intacta, pela mesma razão que o item 57 a criou. A aba escolhida continua fora da URL, e nenhum dado de pessoa entra em endereço. Sucede em superfície a RN-451, que continua valendo no escopo (as oito coisas que o dono pediu). | E12 (dona) | SPEC-PAINEL-CLIENTE |
| **RN-512** | **Virar profissional a partir do painel do cliente é promoção da conta que já existe, nunca um segundo cadastro.** A porta chama uma promoção no servidor que cria `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'` (RN-411) e carimba o termo do profissional com versão e instante do servidor (RN-446, RN-466); é **idempotente**, e a segunda chamada devolve sucesso sem escrever nem recoletar consentimento (RN-467). Ela **não** concede tenant, **não** concede papel e **não** concede capacidade de plataforma — a fronteira é provada por teste, não presumida (molde da RN-480). Recusa nomeada, com erro tipado e nunca `internal`, para: sem sessão, sessão anônima do checkout, conta de administração de plataforma (RN-449) e aceite ausente ou datado pelo cliente. Mandar a pessoa ao `/cadastrar` do painel fica **proibido**: a conta dela já existe, e a chamada volta na negativa única anti-enumeração, deixando-a sem caminho. | E12 (dona) | SPEC-PAINEL-CLIENTE |
| **RN-513** | **Os dois painéis são dois destinos de uma conta só, e a travessia é sempre explícita.** Quem alcança os dois vê a saída **nos dois lados**, com o mesmo vocabulário do `AlternadorDePainel`; quem alcança um só não vê saída para o outro; conta de administração de plataforma não vê porta nenhuma e nenhum caminho da área do cliente produz URL de `/plataforma` (RN-449, garantida pelo tipo `RotaPainel`). A travessia **pede a senha de novo**, porque landing e painel são sites de Hosting distintos e a sessão do Auth é por origem, e a tela diz isso **antes** do clique. Handoff por token custom entre as origens fica recusado com razão: seria uma segunda superfície de credencial para a mesma capacidade. O rótulo nomeia o **painel**, não a conta, e usa "profissional" pela RN-468 — dizer que a conta "nasce separada" contradiz a RN-450, onde o que nasce separado é o documento de perfil. | E12 (dona) | SPEC-PAINEL-CLIENTE |
| **RN-514** | **Quem chega ao painel profissional pela ponte aterrissa em vitrine, e o código Leela continua sendo o mecanismo.** O destino da promoção é o painel profissional em modo vitrine (RN-510): o shell desenha, o menu navega, nenhuma consulta tenant-scoped sai, e o primeiro gesto sobe o aviso de boas-vindas com o campo de resgate. "Se cadastrar no painel profissional", na fala do dono, é **começar esse caminho**, não criar segunda conta nem virar profissional no clique. Aprovação self-service sem convite fica registrada e não adotada, porque revogaria o go-live controlado. A ponte não pede exceção nenhuma na fronteira de auth provada pela FRONTEIRA-AUTH. | E12 (dona) · consome E16 | SPEC-PAINEL-CLIENTE |

## Ampliadas e reconciliadas, sem número novo

- **RN-451** — inalterada no escopo. As oito coisas que o dono pediu continuam sendo o escopo da
  área; a RN-511 fala da forma, não do conteúdo. A oitava, "criar conta de organizador", passa a
  ser servida pela RN-512 em vez do `/cadastrar` do painel.
- **RN-450** — inalterada, e é ela que a copy de hoje contradiz. Organizador e cliente cabem na
  mesma conta; o que nasce separado é `profissionais/{uid}`. A RN-513 é a leitura dela na tela.
- **RN-449** — inalterada, e continua sendo a regra que produz o `null` de
  `portaOrganizador.ts`. A pergunta pinada naquela linha (*"esta conta é SÓ da plataforma?"*)
  continua pinada, e a promoção da RN-512 herda essa leitura, não a de `isPlatformAdmin`.
- **RN-510** — inalterada, e é o destino da ponte. Esta rodada lhe entrega um público novo:
  quem chega pela área do cliente, e não pelo `/cadastrar` do painel.
- **RN-411, RN-414** — inalteradas. O estado `aguardando_convite` e o resgate atômico do código
  Leela são exatamente os mesmos; a ponte só acrescenta uma origem.
- **RN-416** — segue superada pela RN-510, e o que sobrevive dela (`/conta` como rota da pessoa,
  o overlay como experiência e não segurança) continua valendo sob a ponte.
- **RN-461, RN-466, RN-467** — inalteradas. A promoção usa o termo do **profissional** da
  RN-466, que é o segundo dos dois termos; o termo da conta é o do cadastro de participante e
  não é recoletado aqui.
- **RN-468** — inalterada, e é o que obriga a copy a dizer "profissional". A porta de hoje ainda
  diz "organizador" e entra no lote de rótulos.
- **RN-446** — inalterada, e é o molde do carimbo que a RN-512 reusa sem reescrever.
- **RN-452** — inalterada, e continua sendo o controle de que ninguém fica trancado: o ingresso
  segue visível pelo link assinado, com ou sem conta.
- **RN-471, RN-472** — inalteradas. A Arena Social perdeu o bloqueio ("só nasce quando a área
  existir") e passa a estar fora **por decisão**, amarrada à conversa jurídica do LGPD-1.
- **RN-339, RN-341, RN-342, RN-343, RN-344, RN-345** — inalteradas, e agora com uma lacuna de
  superfície escrita: nenhuma delas tem tela do lado de quem comprou. Fica mapeado, fora desta
  onda (PCLIENTE-5).

## Onde cada uma aterrissa no épico

| RN | Épico dono | Seção |
|---|---|---|
| RN-511, RN-512, RN-513, RN-514 | [[LEELA-E12-landing]] | "Delta o painel do cliente e a ponte para o profissional" |

O [[indice-de-regras-de-negocio]] recebe a faixa **511-514** e a frase de faixa livre passa a
apontar para a **515**.

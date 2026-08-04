---
tags: [leela, fila, rodada, onboarding, identidade, executavel]
trace: leela-build-2d6ee98d
lote: SPEC-QUALIFICACAO
data: 2026-08-04
---

# 03-fila · O que dá para executar, em ordem

> Uma tarefa, um commit. A ordem não é preferência: ela decorre de dependências reais, e onde
> houver dependência ela está escrita na linha. ⚔ marca o que exige review antagonista em
> contexto fresco.
>
> **Nada aqui foi executado.** Esta lane é de documento e o território dela foi `leela-specs/`.

## Ordem, e por que ela é esta

Três ondas. A primeira mexe no contrato de dados e destrava todo o resto. A segunda é tela. A
terceira é o rebatismo, que toca os mesmos arquivos da segunda e por isso **não pode vir
antes** dela nem em paralelo.

Um bloqueio externo atravessa tudo e precisa estar visível: **o pacote inteiro da porta de
entrada ainda não subiu para produção** (item DEPLOY-1 no painel). Executar esta fila muda
código que ninguém está usando, o que é bom, porque nada aqui é migração de dado real.

## Onda A · O contrato de dados

### A1 · O contrato do cadastro encolhe, e o da promoção nasce ⚔
**Superfície:** `packages/core/src/platform/cadastroOrganizador.ts`
**Depende de:** nada · **Bloqueia:** A2, B1, B2

`CadastroOrganizadorInput` perde `telefone` e `organizacao`, e `validarCadastroOrganizador`
perde as duas validações correspondentes. Nasce ao lado `PromocaoProfissionalInput` com
atuação, profissão, modalidades, porte, organização opcional, telefone, documento condicional e
tipo de pessoa, mais `validarPromocaoProfissional` no mesmo molde puro.

O ponto que a review tem de atacar: **o validador é um só e ele é a Rule**. A lição do DEF-A da
ONBOARD-REV foi que régua de tela mais frouxa que a Rule produz conta órfã sem doc. Toda
constante nova entra no core e nenhuma régua nova nasce na tela.

`TERMO_LGPD_VERSAO` sobe e `TERMO_LGPD_FINALIDADE` é reescrita para a conta. Nascem
`TERMO_PROFISSIONAL_VERSAO` e `TERMO_PROFISSIONAL_FINALIDADE`.

**Testes:** unidade do validador nos dois contratos; caso de estreitamento de finalidade
(RN-467) documentado no próprio arquivo.

### A2 · As faixas de porte e a lista de atuação entram no core
**Superfície:** `packages/core/src/platform/` (arquivo novo ao lado do cadastro)
**Depende de:** A1 · **Bloqueia:** B2

`PORTES_EVENTO` com as quatro faixas e `ATUACOES_PROFISSIONAL` com os dois valores
acumuláveis, no mesmo formato de `CATEGORIAS_CLUBE`: constante mais type guard.

**Reaproveitamento obrigatório, e a task falha se inventar:** modalidade **reusa**
`MODALIDADES_CLUBE` (`packages/core/src/clubs/clube-opcoes.ts:41`); documento **reusa**
`validarDocumento` (`packages/core/src/assessoria/documento.ts:125`); telefone **reusa**
`telefoneValido`. Nenhum dígito verificador novo, nenhuma segunda lista de modalidade.

### A3 · O shape do doc do profissional cresce, e o documento fica fora dele ⚔
**Superfície:** `firestore.rules`, `packages/api-client/src/platform/profissionais.ts`
**Depende de:** A1, A2 · **Bloqueia:** B2

O `hasOnly` de `shapeAutoCadastroValido` (`firestore.rules:2762-2765`) cresce para os campos de
qualificação, `tipoPessoa`, `documentoMascarado` e `consentimentoProfissional`. Nasce a
subcoleção `profissionais/{profId}/documentoSecret/{docId}` com `allow read: if isSignedIn() &&
request.auth.uid == profId` e escrita negada a todo cliente, no molde literal de
`profissionais/{profId}/marcas` (`firestore.rules:2876`).

O ataque que a review tem de executar, porque é o núcleo da RN-465: **provar que um membro do
tenant que lê `profissionais/{profId}` NÃO alcança `documentoSecret`**, e que o
`documentoMascarado` no doc pai não revela o número. Rules não filtram campo, e é essa a
armadilha que a task existe para não cair.

### A4 · A promoção vira Function, com o vínculo de pessoa ⚔
**Superfície:** `functions/src/platform/` (function nova)
**Depende de:** A1, A2, A3 · **Bloqueia:** B2

A promoção não é `setDoc` de cliente. Ela escreve o doc do profissional, carimba o
consentimento com instante do servidor, resolve `pessoas/{documento_hmac}` quando o documento
vem, e escreve `documentoSecret`. Tudo transacional.

O caso difícil, e o motivo do ⚔: **documento cujo `pessoas/{id}` já tem `contaUid` de outro
uid**. Não funde, não recusa em silêncio, devolve erro **tipado** com mensagem **uniforme**, e
consome `consumirRateLimit` (`functions/src/shared/rateLimit.ts:82`) com `hashChave` sobre o
documento, exatamente como o resgate de convite já faz (`resgatarConviteOrganizador.ts:219`).
Erro `internal` aqui é a lição do DEF-B da ONBOARD-REV repetida.

**Testes:** promoção de conta sem pessoa; promoção de conta que já comprou (liga na pessoa
existente); documento tomado por outro uid (recusa uniforme); rate limit estourado; falha de
escrita não deixa doc pela metade.

### A5 · O cadastro de recebimento para de pedir o documento
**Superfície:** `functions/src/finance/saveDadosBancarios.ts`, `DadosBancariosForm.tsx`
**Depende de:** A4

`cpfCnpj` deixa de ser entrada e passa a ser resolvido do registro de pessoa e do
`documentoSecret`. Enquanto a resolução não existir para uma conta antiga, o campo continua,
mas agora **com dígito verificador**: hoje ele só conta 11 ou 14 dígitos
(`saveDadosBancarios.ts:136-144`) e o formulário não confere nada
(`DadosBancariosForm.tsx:137-138`). Documento errado no repasse é dinheiro parado no banco.

**Esta task conserta um defeito que existe hoje** e pode ir sozinha se a onda A atrasar.

## Onda B · As telas

### B1 · O `/cadastrar` encolhe e ganha os botões sociais ⚔
**Superfície:** `apps/painel/src/routes/conta/auth/CadastrarPage.tsx`, `EntrarPage.tsx`
**Depende de:** A1

Saem telefone e organização. Entram "Continuar com Google" e "Continuar com Apple", chamando
`loginComGoogle` e `loginComApple`, que **já existem** e já são exportados
(`packages/api-client/src/index.ts:409-410`) e hoje não têm um único consumidor de tela. Título
e descrição deixam de dizer "organizador".

**Os dois botões entram no `/cadastrar` e no `/entrar` na mesma task.** Ligar só um lado produz
a pessoa que cria conta com Google e depois não consegue voltar.

**Conferência operacional, não suposição:** o estado da configuração "vincular contas que usam
o mesmo e-mail" no Console do Firebase não é legível do repositório e precisa ser verificado
antes do merge, no mesmo molde da conferência de Authorized Domains que a SPEC-ADMINSEP
declarou. O Apple **não funciona** sem App ID, Service ID, chave `.p8` e verificação de
domínio, tudo registrado no cabeçalho do `auth.ts:9-13`. Se as chaves não existirem no dia da
task, o botão da Apple **não sobe**: um botão que lança `auth/invalid-oauth-provider` é pior
que botão nenhum.

### B2 · A tela de tornar-se profissional ⚔
**Superfície:** `apps/painel/src/routes/` (rota nova) ou `apps/landing`, conforme ADMINSEP-2
**Depende de:** A1, A2, A3, A4

O formulário da Parte 7 da spec. Campos condicionais de verdade: profissão só com bem-estar
marcado, porte só com eventos marcado, documento só quando a conta não tem pessoa vinculada,
CNPJ só com "sim" em pessoa jurídica.

O gate do botão é `validarPromocaoProfissional`, o mesmo do servidor. A caixa de recomendação
nasce desmarcada e **não** entra no gate, porque recusá-la não pode bloquear.

Ao fim, o doc nasce em `aguardando_convite` e a pessoa cai no overlay que a S1609 já
construiu. A task **não** mexe no overlay.

### B3 · O botão da área do cliente aponta para a promoção
**Superfície:** conforme a lane SPEC-ADMINSEP entregar
**Depende de:** B2 · **Amarra com:** ADMINSEP-2 no painel

O "criar conta de organizador" da área do cliente deixa de ser atalho e vira o caminho
canônico. Task pequena, e ela existe para as duas lanes não construírem dois caminhos para o
mesmo lugar.

## Onda C · O rebatismo

### C1 · Painel Profissional nos pontos canônicos
**Depende de:** B1, B2 — **não pode vir antes**, porque toca os mesmos arquivos

Quatro edições que respondem pela maior parte da percepção:

1. `apps/painel/src/shell/RootShell.tsx:63` — "Painel do Organizador", presente em toda tela;
2. `apps/painel/index.html:7` — `<title>Leela Painel</title>`;
3. `apps/painel/src/routes/conta/auth/EntrarPage.tsx:123` e `CadastrarPage.tsx:145-146`;
4. `apps/landing/app/components/PublicHeader.tsx:71`, `PublicFooter.tsx:56` e `:67`.

Mais as oito strings de erro e estado, os três testes que travam as strings
(`RootShell.test.tsx:119` e `:124`, `EntrarPage.test.tsx:181`,
`OverviewContent.test.tsx:40`) e o assunto do `mailto` em
`packages/core/src/platform/contatoOnboarding.ts:85`.

**O que NÃO muda, e a task falha se mudar:** diretório `apps/painel`, pacote `@leela/painel`,
site `leela-hub`, `PAINEL_URL_PADRAO`, `basePainel`, `painelUrl`, `LEELA_PAINEL_URL`, projeto
Sentry `leela-painel`, a coleção `profissionais`, as claims, as rotas, e as ~920 ocorrências de
`organizador` como identificador. "Organizador" continua correto como papel.

### C2 · O handle `profissional` entra na lista de reservados
**Superfície:** `packages/core/src/perfil/perfil.ts:79-80`
**Depende de:** nada

Hoje `organizador` e `organizadores` são reservados e `profissional` não é. Sem isso alguém
registra `@profissional` como perfil público no dia seguinte ao rebatismo. Uma linha.

## Itens que ficam de fora, com o motivo

| Item | Por que não entra |
|---|---|
| Checkout de estrangeiro (tela) | Gated pelo item 12b, que o dono adiou. A RN-176 já mandou não despachar antes da liberação |
| Registry de documento tipado (código) | A S1903 diz "especificar sem implementar". A spec desta rodada fecha o **como**; o código segue gated |
| Profissional estrangeiro | O bloqueio é o repasse, não a identidade. Vira item de fila com dependência de recebimento internacional |
| Recoleta do LGPD-1 | Decisão do dono, sem default. A tela da promoção é onde caberia |
| Programa de indicação | Só existe se QUALIF-4 disser que era isso |

## Dois defeitos achados no caminho, que viram card sozinhos

Nenhum dos dois foi causado por esta rodada, e os dois estavam invisíveis.

1. **O documento do repasse não tem dígito verificador** (`saveDadosBancarios.ts:136-144` e
   `DadosBancariosForm.tsx:137-138`), enquanto o core exporta `validarDocumento` desde o E18.
   Entra como A5.
2. **O favicon do painel aponta para `/vite.svg`, que não existe** em `apps/painel/public`
   (`apps/painel/index.html:5`). Não há manifest nem tag `og:` no painel. Higiene, entra junto
   de C1 porque é o mesmo arquivo.

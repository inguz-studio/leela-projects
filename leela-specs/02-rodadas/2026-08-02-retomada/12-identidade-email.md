---
tags: [leela, rodada, email, marca, design-system, auth, senha]
trace: leela-build-2d6ee98d
lote: IDENTIDADE-EMAIL
data: 2026-08-04
---

# 12 · A identidade da Leela nos oito e-mails

> O dono foi direto: "não quero nada de visual genérico. Resolva de vez, pois estética na
> comunicação é importante." Antes disso já tinha pedido a logo no cabeçalho, com fundo
> seguindo a identidade.
>
> São oito e-mails no produto. Sete eram nossos e saíam com fundo bege, cartão branco e
> botão vinho, nenhum deles vindo do design system. O oitavo nem nosso era: saía do
> template padrão do Firebase, com remetente `noreply@leela-hub.firebaseapp.com`, e é
> justamente o que um cliente novo vê primeiro, porque é o de definir a senha.

## O que mudou

### Uma moldura, não sete

`functions/src/email/identidade.ts` passou a ser a única moldura: cabeçalho com a logo
sobre a faixa da marca, filete brasa, corpo com respiro, rodapé. Os sete templates de
`templates.ts` seguem com as mesmas assinaturas de `render()`; nenhum deles desenha caixa
própria. O oitavo, `renderRedefinirSenhaEmail`, nasceu junto.

### Cor de e-mail também é token

Cliente de e-mail não resolve `var()` e não carrega folha externa: o HTML sai com o número
dentro do atributo `style`. A regra da §1 da governança continua valendo por espelho
provado, não por confiança. Cada entrada de `PALETA` declara de qual token veio, e
`emailIdentidade.test.ts` lê `packages/design-system/themes/brasa.css`, resolve a cadeia de
`var()` até o primitivo e reprova o literal divergente.

Tokens novos no design system:

| Token | Valor | Por quê |
|-------|-------|---------|
| `--brand-wordmark` | `#C8E84A` | A tinta do wordmark oficial não tinha token no tema `brasa`. Entrou nos dois temas, como manda a §5. |
| `--brand-wordmark-box` | `#2A1018` | A caixa ameixa da variante oficial, pela mesma razão. |
| `--email-*` (12 tokens) | medidas | Largura de 600px, calha, raio, altura do filete, caixa da logo, tamanho do código do ingresso. |

## As três decisões que separam isto de um trabalho medíocre

### 1. A logo é URL HTTPS, e o bloco não desmonta sem ela

O Gmail descarta `src="data:image/..."`. O produto já pagou por isso uma vez: o QR do
ingresso virou link exatamente porque o data URI não aparecia no cliente mais usado
(item 55). E todos os clientes grandes descartam SVG, então o asset que a landing já
serve não servia.

A logo mora em `https://leela-landing.web.app/brand/leela-wordmark-email.png` —
**HTTP 200, `image/png`, 3036 bytes, `Cache-Control: max-age=3600`**, com o SHA-256 do que
está no ar batendo com o arquivo versionado
(`d6b42e0d9eba71576835851976b7e826cac5f0e10ce32db13f86afe0ba8c59ce`). Um caminho de
controle no mesmo diretório devolve 404, então o 200 é do arquivo e não de um rewrite.

O PNG é gerado do wordmark oficial por `scripts/brand/gerar-logo-email.mjs`: um
rasterizador em Node puro, sem navegador e sem dependência nova, com `--check` no gate para
o asset nunca sair de sincronia com o SVG. Ele é **opaco**, já composto contra
`--surface-base`, porque o motor Word do Outlook compõe alfa contra branco e deixaria
franja clara em volta das letras.

Imagem bloqueada é o caso normal, não a exceção. O `alt="Leela"` é estilizado com a mesma
tinta, o mesmo peso e o mesmo tracking do wordmark; a faixa da marca é pintada pelo `<td>`
e não pela imagem; `width`/`height` são fixos. Com a imagem bloqueada o cabeçalho continua
sendo um wordmark legível, e é isso que também protege contra um 404 futuro.

### 2. Modo escuro: dark-first, com a conta feita

**Postura: o e-mail nasce escuro.** A identidade do produto já é escura (a landing e o
painel fixam `data-theme="brasa"` no `<html>`), e um fundo de marca claro com texto escuro
é exatamente o que os clientes reescrevem em modo escuro. Declaramos `color-scheme: dark` e
`supported-color-schemes: dark`, que é como Apple Mail, iOS Mail e Outlook entendem "esta
mensagem já trata modo escuro, não inverta".

Para os motores que invertem assim mesmo, a paleta foi escolhida para sobreviver. Os
números, medidos em `emailIdentidade.test.ts` (`inverter` = `255 − canal`):

| Par | Como escrito | Sob inversão | Mínimo AA |
|-----|-------------:|-------------:|----------:|
| wordmark no fallback de texto | 14,06 | 9,69 | 3,0 |
| título sobre o cartão | 17,19 | 16,69 | 3,0 |
| corpo sobre o cartão | 17,19 | 16,69 | 4,5 |
| corpo suave sobre o cartão | 9,84 | 8,54 | 4,5 |
| rodapé sobre a moldura | 10,77 | 9,51 | 4,5 |
| letra miúda sobre o cartão | 6,35 | **4,73** | 4,5 |
| rótulo do botão | **4,81** | 10,99 | 4,5 |
| código do ingresso | 16,19 | 15,79 | 3,0 |
| link no corpo | 13,01 | 8,86 | 4,5 |
| link no bloco de destaque | 12,25 | 8,38 | 4,5 |
| endereço em texto | 9,27 | 8,08 | 4,5 |

Onze pares, zero reprovações. Os dois piores casos estão em negrito: 4,73:1 na letra miúda
sob inversão e 4,81:1 no rótulo do botão como escrito. O `--action-primary` do design system
(`#D63500`, mais escuro que o `--primary-500`) já tinha sido calibrado para esse par.

**A regra que caiu dessa conta:** o laranja da marca **nunca é cor de texto**. `#FF450C`
sobre `#161616`, invertido, vira `#00BAF3` sobre `#E9E9E9` — 2,03:1, ilegível. O laranja
aparece só como fundo de ação e como filete decorativo, que não carrega texto. O teste
prova o motivo e guarda a regra nos oito templates.

### 3. A prova é o entregável

Os oito e-mails renderizados em HTML, com dados de exemplo, em
`.nirvana/outputs/leela-build-2d6ee98d/emails/`:

| # | Arquivo | Quando dispara |
|---|---------|----------------|
| 1 | `1-ingressos-da-compra.html` | Pagamento confirmado. Traz QR de verdade, dois participantes. |
| 2 | `2-conta-criada-defina-a-senha.html` | Primeira compra de e-mail sem conta. |
| 3 | `3-convite-de-afiliado.html` | Organizador convida influenciador. |
| 4 | `4-convite-de-assessoria.html` | Assessoria parceira sem conta. |
| 5 | `5-campanha-do-evento.html` | Comunicado do organizador. |
| 6 | `6-repasse-de-comissao.html` | Repasse registrado. |
| 7 | `7-marco-de-comissao.html` | Comissão cruza uma faixa. |
| 8 | `8-redefinicao-de-senha.html` | "Esqueci minha senha". Era o template do Firebase. |

`index.html` na mesma pasta percorre os oito. Cada um tem um `.txt` ao lado com a versão em
texto puro que acompanha toda mensagem. Regerar: `npm --prefix functions run email:render`.

Nenhum navegador foi aberto e nenhum screenshot foi tirado. **A conferência visual é do
dono, por esses arquivos.**

## O fluxo de senha deixou de ser do Firebase

`/recuperar-senha` chamava `sendPasswordResetEmail` no cliente e quem enviava era o
Firebase. Agora o Firebase só **gera** o link (`generatePasswordResetLink`, `oobCode`
single-use) e quem envia é a callable `solicitarRedefinicaoSenha`, pela Brevo, com a
moldura da casa. É o mesmo desenho que `garantirContaSemFriccao` já usava.

### Anti-enumeração, por mensagem e por relógio

A resposta é `{ ok: true }` sempre, exista ou não a conta. O detalhe que uma implementação
ingênua erra é o **tempo**: o caminho com conta paga uma chamada à Brevo e demoraria
centenas de milissegundos a mais que o caminho sem conta, o que é medível de fora e vira
oráculo tão bom quanto uma mensagem. Os dois caminhos são acolchoados até um piso fixo de
1200ms. O teste prova que um envio artificialmente lento de 120ms some dentro do piso.

Rate limit de 5 por hora por e-mail **hasheado** fecha a bomba de e-mail contra caixa
alheia. O estouro responde neutro em vez de `resource-exhausted`: erro distinguível é
oráculo, mesmo que fraco.

### O link cai numa tela nossa

`actionCodeSettings` não existia em lugar nenhum do repositório, então todo link de ação do
Auth caía na página hospedada do Firebase (era o P2 do laudo INV-EMAIL-INGRESSO).

Uma distinção que é fácil errar: `actionCodeSettings.url` **não** troca a página que recebe
o clique, ele vira o `continueUrl`. Quem troca a página é o "Action URL" do Console. Como
agora somos nós que enviamos, os dois foram resolvidos no código:

1. `actionCodeSettings` existe nos dois pontos de origem
   (`functions/src/auth/linkDeAcao.ts` e `packages/api-client/src/auth.ts`);
2. o link gerado é **reescrito** para `/redefinir-senha` do painel, levando o `oobCode`.
   A `RedefinirSenhaPage` já lia `?oobCode=` e não precisou mudar, porque a credencial é o
   código e não a URL que o entregou.

Nada disso depende de configuração de Console, que é invisível no repositório e some num
projeto novo.

## O que ficou dependendo de outra lane

### Esperando a SPEC-ADMINSEP

`ROTA_APOS_DEFINIR_SENHA` em `functions/src/auth/linkDeAcao.ts` é **ponto único de decisão**
da jornada de primeiro acesso. Está em `/entrar`, que é o comportamento de hoje da
`RedefinirSenhaPage`. A lane SPEC-ADMINSEP está especificando onde o cliente novo aterrissa
depois de definir a senha; quando ela fechar, muda essa linha e nenhuma outra. A jornada não
foi inventada aqui.

### Um argumento em território da PIXREAL-FIX

O e-mail nº 2 ("conta criada, defina a senha") nasce em
`functions/src/checkout/contaSemFriccao.ts:107`, que está em `functions/src/checkout/` —
território da lane PIXREAL-FIX nesta rodada, e por isso **não foi tocado**. O link dele
ainda cai no handler hospedado do Firebase. O conserto é um argumento:

```ts
// functions/src/checkout/contaSemFriccao.ts
import { actionCodeSettingsSenha, reescreverParaOPainel } from '../auth/linkDeAcao';

    async gerarLinkDefinirSenha(email) {
      return reescreverParaOPainel(
        await admin.auth().generatePasswordResetLink(email, actionCodeSettingsSenha())
      );
    },
```

### Deploy

Zero deploy foi feito nesta lane. O que o deploy precisa saber:

- **`solicitarRedefinicaoSenha` é function NOVA** e declara `secrets: ['BREVO_API_KEY']`.
  O segredo já existe no projeto; o que falta é o binding nascer com a function. Nenhum
  segredo novo foi criado, e nenhuma declaração `runWith` existente foi tocada.
- **`LEELA_PAINEL_URL`** é variável de ambiente opcional (não é segredo). Sem ela, o default
  é `https://leela-hub.web.app`, o canal live do painel — o mesmo default que a landing já
  usa. Domínio próprio entra por aqui.
- O `continueUrl` precisa estar nos **domínios autorizados** do Firebase Auth.
  `leela-hub.web.app` já é. Se um domínio novo entrar sem ser autorizado, o adapter degrada
  para o link sem `continueUrl` e loga `reset_senha_continue_uri_recusada` — a recuperação
  de conta continua funcionando, mas alguém precisa consertar.

### Boards

Boards e épicos **não foram tocados**: seis lanes correm em paralelo nesta rodada e
`leela-specs/` já tem edição de outras. Os itens para o board são os quatro títulos deste
documento, mais os dois pendentes acima.

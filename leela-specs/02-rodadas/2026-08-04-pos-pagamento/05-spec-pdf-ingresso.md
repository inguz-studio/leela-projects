---
tags: [leela, spec, rodada, ingresso, pdf, landing, privacidade]
aliases: ["Spec PDF do ingresso", "SPEC-PDF", "RN-473"]
trace: leela-pixreal-diag-20260804
lote: SPEC-PDF
data: 2026-08-05
---

# O botão que salva o ingresso em PDF · delta da S1214

Decisão de origem: **D-0804-4** em `01-decisoes-dono.md`, com o verbatim. Ela refina a
premissa P10 da rodada de 29/07 (`../2026-07-29-pagina-ingresso/`), que tinha fixado o PDF
como impressão. O dono viu a página no ar e pediu um arquivo gerado, com botão.

A RN nova é a **RN-473**, canônica no [[LEELA-E12-landing]] e transcrita aqui embaixo. A
task é a **S1214-T5**, dentro da story que já existe — a S1214 sempre foi "ver o ingresso e
imprimir se eu quiser", e o arquivo é a mesma intenção numa forma que o dono agora nomeou.
Fila em `04-fila-codigo.md`.

## Inventário antes de especificar

**O que já existe e não se reescreve.** A rota `/ingresso/{token}` é Server Component puro,
com **zero JavaScript de cliente**, e consome a projeção da Function `ingressoPorLink` por
`apps/landing/lib/ingresso.ts`. A projeção já traz o QR **renderizado como imagem**
(`qrDataUri`) e o estado como enum de sete valores. A rota `/ingresso/{token}/imprimir` reusa
a mesma leitura e o mesmo componente, com CSS de A4. Os três cabeçalhos da RN-422 estão
declarados por rota no `next.config.js`, com `source: '/ingresso/:token*'` — o `*` já cobre
qualquer rota filha, inclusive uma que ainda não existe. O código identificador tem predicado
canônico pronto no core (`isCodigoIngressoValido`, RN-396: seis símbolos maiúsculos de um
alfabeto sem caracteres ambíguos).

**O que não existe.** Nenhum gerador de PDF. Varredura em 05/08 sobre os `package.json` do
repo: nenhum declara `pdfkit`, `jspdf`, `pdf-lib`, `puppeteer` ou `@react-pdf/renderer` — o
mesmo resultado que a INGQR-REV mediu em julho.

**Onde a landing roda,** porque isso decide o resto. Ela é servida por SSR em Cloud Functions
gen2, pela integração de frameworks do Firebase Hosting (`deploy-leela-hub.mjs`). O webpack do
Next embute as dependências no bundle do servidor, e nada de `workspace:*` é resolvido em
runtime. Dependência de servidor não chega ao navegador: `firebase-admin` e `qrcode` já vivem
lá desde a S1214-T1 sem custar um byte ao bundle público.

## A decisão de engenharia

Quatro caminhos possíveis para produzir o arquivo.

| # | Caminho | Onde o PDF nasce |
|---|---|---|
| A | Biblioteca de PDF no navegador, carregada por import dinâmico no clique | cliente |
| **B** | **Route Handler `/ingresso/{token}/pdf` na própria landing, reusando `buscarIngressoPorLink`** | **servidor da landing** |
| C | Function nova em `functions/`, irmã da `ingressoPorLink` | servidor de negócio |
| D | `window.print()` na rota de impressão | diálogo do navegador |

**Escolhido: B.** Quatro razões, na ordem em que pesaram.

**1. A porta de entrada é um webview de aplicativo de e-mail.** O link do ingresso chega por
e-mail (RN-423), então boa parte dos cliques acontece dentro do Gmail, do Outlook ou do app de
e-mail do sistema, não num navegador completo. Nesses webviews, baixar um `Blob` criado por
JavaScript é justamente o caminho frágil: o atributo `download` foi ignorado por anos no iOS e
o webview costuma abrir o blob no visualizador em vez de salvar. Uma resposta HTTP com
`Content-Disposition: attachment` cai na máquina de download do sistema, que é o caminho que
esses mesmos webviews sabem tratar. Um botão que não baixa não é um botão.

**2. O princípio D-ING-5 inverte a conta de bytes.** A página é aberta na fila da largada, com
rede ruim, e o caminho escolhido tem de sobreviver a isso. No caminho A, o clique dispara o
download de uma biblioteca de PDF — centenas de quilobytes comprimidos, mais do que o arquivo
inteiro que ela vai produzir. No caminho B, o clique dispara uma requisição só e o que desce é
o artefato, na casa das dezenas de quilobytes. Baixar a fábrica para fazer a peça sai mais caro
que baixar a peça.

**3. A rota do ingresso não tem JavaScript de cliente, e o critério de aceite da S1214 cobra
isso** ("nenhuma dependência nova entra no bundle público, e a landing segue Radix-free"). O
caminho B mantém o critério intacto por construção: a biblioteca vive no servidor, no mesmo
runtime que já carrega `firebase-admin` sem que um byte chegue ao navegador. O caminho A
quebraria o critério e transformaria a rota mais sensível da superfície pública na primeira com
JavaScript de cliente.

**4. O estado é relido na hora de gerar.** Entre abrir a página e clicar no botão pode caber um
cancelamento ou um estorno. No servidor, a geração consulta a projeção de novo e se recusa a
produzir ingresso de estado que não mostra QR. No cliente, o PDF sairia do que já estava na
tela: um estado congelado que talvez já não valha.

**Por que não C, a Function nova.** Ela pagaria a biblioteca dentro do bundle de `functions/`,
que é deployado como um codebase só — o custo de cold start recairia sobre **toda** function do
projeto, inclusive as do caminho do dinheiro. A landing SSR, ao contrário, é a função que
acabou de servir a página e está quente no instante do clique. E a Function nova precisaria de
uma segunda porta pública que verifica token: uma segunda implementação da mesma fronteira, que
é exatamente como duas fronteiras passam a divergir. O contra-argumento honesto é que a chave
mora lá (D-ING-3) e o negócio deveria morar junto; ele não se paga aqui, porque **o Route
Handler não ganha chave nenhuma** — ele chama `ingressoPorLink` do mesmo jeito que a página já
chama, e a fronteira da RN-419 fica onde está.

**Por que não D, o `window.print()`.** Ele abre o diálogo de impressão, que é literalmente o que
o dono não pediu, e ainda exige JavaScript de cliente numa rota que hoje não tem nenhum, para
entregar menos.

**Chromium dentro da Function continua morto**, pelo motivo de 29/07 (memória na casa do
gigabyte, cold start na casa dos dez segundos) e agora com um a mais: ele arrastaria um
navegador inteiro para dentro do runtime que serve as páginas públicas.

**Custo declarado do caminho escolhido.** Uma invocação a mais de `ingressoPorLink` e uma
leitura de documento por download, o que em qualquer volume de evento brasileiro segue no fundo
do free tier. A biblioteca de PDF entra no bundle do servidor da landing — centenas de
quilobytes, num runtime que já carrega o Next inteiro. E o clique não tem indicador próprio de
progresso, porque não há JavaScript na rota: quem dá o retorno visual é o indicador de download
do navegador. O teto de espera é o mesmo `TIMEOUT_INGRESSO_MS` de 12 segundos que a página já
pratica, e estourá-lo devolve estado legível, nunca 500.

**O segundo layout é custo real, e é pago com teste.** Desenhar o ingresso em primitivas de PDF
é uma segunda linguagem de layout, que diverge da página no primeiro ajuste de marca — foi
exatamente por isso que a rodada de 29/07 recusou o gerador. O que mudou não foi o custo: foi o
dono pedir o arquivo, então a pergunta deixou de ser "vale a pena" e virou "onde dói menos". A
amarra é um teste que cobra do PDF os campos que a RN-422 permite e nenhum a mais, irmão do que
a folha de impressão já tem. Acrescentar um campo à página sem acrescentar ao PDF passa a ser
escolha declarada, não deriva silenciosa.

## O que o PDF carrega

O mesmo que a página mostra, e a RN-422 governa os dois sem exceção: nome do titular, evento
com data e local, modalidade, kit com tamanho quando houver, código identificador em texto,
estado, o QR e o aviso de credenciamento que a página já escreve para aquele estado. Nada além
disso.

**O PDF não carrega o link nem o token.** É a lógica da RN-419 aplicada a um arquivo. O token
`LLIP1` é a capacidade de abrir o ingresso; imprimi-lo em claro dentro do PDF transformaria o
arquivo numa segunda credencial independente, num meio onde não existe `no-store`, não existe
`Referrer-Policy`, não existe prazo e não existe volta: o arquivo fica na pasta de downloads do
celular, vai para o grupo do WhatsApp, sai na impressora do trabalho e ninguém consegue
recolhê-lo. E não compra nada, porque quem já tem o PDF já tem o QR, que é o que abre a
catraca. Quem quiser voltar à página tem o e-mail. Precedente da casa: a folha de impressão já
suprime a URL dos links no papel de propósito (`a[href]:after{content:none}`).

**O PDF não carrega valor pago, CPF, telefone, e-mail, nascimento, endereço, contato de
emergência nem resposta de formulário.** É a RN-422 sem exceção, e num arquivo ela pesa mais do
que na página: a página é relida a cada abertura e pode passar a esconder algo; o arquivo é
para sempre.

## Os estados que geram, e os que não geram

Espelho exato da RN-421 — **o PDF existe onde o QR existe**:

| Estado | Página | Botão | Rota `/pdf` acessada direto |
|---|---|---|---|
| `valido` (confirmado, com `qrToken`, sem `checkinEm`) | QR + código + dados mínimos | aparece | gera |
| `credenciado` | o mesmo, com o carimbo, QR visível | aparece | gera, com o carimbo |
| `emitindo` (confirmado, sem `qrToken`) | aviso de emissão | não aparece | redireciona para a página |
| `pendente` | sem QR | não aparece | redireciona para a página |
| `cancelado` / `estornado` | sem QR | não aparece | redireciona para a página |
| `encerrado` | histórico, sem QR | não aparece | redireciona para a página |
| Token não verifica / não encontrado / indisponível | resposta única e genérica | não aparece | a mesma resposta única e genérica |

O motivo de o PDF parar onde o QR para é mais duro do que na página. **A página é relida a cada
abertura e pode mudar de resposta; o arquivo congela.** Um PDF de ingresso cancelado, salvo no
celular, vai ser mostrado ao voluntário às seis da manhã sem chance de dizer a verdade daquele
dia — e nesse momento não existe mais nenhuma superfície que possa corrigi-lo. Gerar sem QR
seria pior ainda: produziria um documento com cara de ingresso e sem o que serve, que é a
melhor forma de fazer alguém viajar para ser barrado na fila.

A rota acessada direto num estado sem QR **redireciona** para `/ingresso/{token}` em vez de
devolver erro. Não é gentileza: quem tem o token já pode ler aquele estado na página, então o
redirecionamento não revela nada de novo, e é o desfecho certo do caso que importa — a pessoa
que abriu a página com o ingresso válido, deixou a aba aberta e clicou depois de o organizador
cancelar. Ela aterrissa na verdade de agora, em vez de baixar um arquivo que mente. Token que
não verifica continua tendo **uma resposta só**, idêntica à da página, sem oráculo.

## O nome do arquivo

`ingresso-<codigo>.pdf` — por exemplo `ingresso-T93N7F.pdf`. O código é o mesmo que a pessoa
dita no balcão, então a pasta de downloads fica ordenável e a pessoa com três ingressos da
família consegue distinguir os três sem abrir.

O `Content-Disposition` é montado com dado que vem do Firestore, então o código passa pelo
predicado que já existe no core (`isCodigoIngressoValido`): seis símbolos maiúsculos do alfabeto
da RN-396 e mais nada. **Não** entra sanitizador novo — a fonte única de verdade sobre o formato
do código continua sendo o core. Código ausente ou fora do formato cai em `ingresso.pdf`, e o
cabeçalho nunca é montado por concatenação de valor não validado. Isso fecha injeção de
cabeçalho por dado de banco, que é a única superfície de ataque nova que esta task cria.

O nome do titular **não** entra no nome do arquivo: nome de pessoa em nome de arquivo vaza na
lista de downloads, no seletor de anexo e na tela compartilhada, que é a mesma família de
vazamento que fez o título da página ser genérico de propósito.

## O botão

Vive na página do ingresso, ao lado do link "Versão para imprimir" que já existe. Os dois
continuam: um é papel, o outro é arquivo.

- **Rótulo visível:** "Salvar como PDF" — as palavras do dono, sem tradução minha.
- **É um `<a href>` de verdade**, apontando para `/ingresso/{token}/pdf`. Não é `<button>` com
  JavaScript: link nativo é focável por teclado, abre com Enter, aceita ctrl+clique e "copiar
  endereço", funciona sem JavaScript e mantém a rota com zero cliente. O `Content-Disposition`
  do servidor é quem força o download; o atributo `download` no HTML entra como reforço, nunca
  como o mecanismo.
- **Nome acessível:** `aria-label="Salvar ingresso como PDF"`. O texto visível é subconjunto do
  nome acessível e na mesma ordem, o que satisfaz o critério de rótulo no nome (WCAG 2.5.3) em
  vez de quebrá-lo — que é o que um `aria-label` mal escolhido costuma fazer.
- **Alvo de toque de no mínimo 44 px** e foco visível por token do DS: o clique acontece no
  celular, muitas vezes com sol na tela. Contraste AA no tema escuro da superfície pública,
  medido no estado normal, no foco e no hover.
- **Sem indicador próprio de progresso**, pela ausência de JavaScript na rota. É trade-off
  declarado, não esquecimento: o navegador mostra o próprio indicador de download, e o teto de
  12 segundos do servidor limita a espera.
- **Não aparece** em nenhum estado sem QR, nem na versão imprimível (lá o caminho é o comando de
  impressão, e dois botões com nomes parecidos na mesma folha só confundem).

**A copy da rota de impressão para de disputar o nome.** Hoje ela diz *"Use o comando de
impressão do navegador e escolha 'Salvar como PDF'"* — a mesma frase que agora nomeia o botão,
apontando para outra coisa. Ela passa a falar de papel e a mandar quem quer arquivo para o
botão. Sem isso, a página ensina dois caminhos com o mesmo nome e resultados diferentes.

## RN-473 · o PDF do ingresso é gerado sob demanda e baixado como arquivo (refina a RN-424)

A página do ingresso oferece **um botão que gera o PDF daquele ingresso e o entrega como
download**. O PDF é gerado no servidor, sob demanda, a partir da mesma projeção que a página
consome — nunca no navegador, e nunca por diálogo de impressão.

- **Conteúdo idêntico ao da página, e a RN-422 governa os dois.** Nome do titular, evento com
  data e local, modalidade, kit com tamanho quando houver, código em texto, estado, QR e o aviso
  daquele estado. **O PDF não contém o link nem o token**: pela mesma lógica da RN-419, o token é
  capacidade de abrir o ingresso, e num arquivo que sobrevive fora do navegador ele vira uma
  segunda credencial sem `no-store`, sem prazo e sem volta — enquanto quem tem o arquivo já tem o
  QR.
- **O PDF existe onde o QR existe.** Estados `valido` e `credenciado` geram; `emitindo`,
  `pendente`, `cancelado`, `estornado` e `encerrado` não geram, e nesses o botão não é
  renderizado. A rota acessada direto num estado sem QR **redireciona para a página**, onde o
  estado é lido de novo. A razão é mais forte do que a da página: a página é relida a cada
  abertura, o arquivo congela — um PDF de ingresso cancelado seria mostrado no credenciamento sem
  nenhuma superfície capaz de corrigi-lo.
- **O estado é lido no ato da geração**, não herdado da tela que estava aberta.
- **Token que não verifica, inscrito ou evento inexistente devolvem a mesma resposta** da página,
  sem oráculo. Os três cabeçalhos da RN-422 valem para a rota do arquivo como valem para a
  página.
- **O nome do arquivo é `ingresso-<codigo>.pdf`**, com o código validado pelo predicado canônico
  do core (RN-396) antes de entrar no cabeçalho, e `ingresso.pdf` quando não houver código
  válido. Nome de pessoa nunca entra no nome do arquivo.
- **Nenhuma dependência nova no bundle público.** A biblioteca de geração vive só no servidor; a
  rota do ingresso segue sem JavaScript de cliente e a landing segue Radix-free.
- **A versão imprimível continua existindo** (RN-424) e continua sendo o caminho do papel. Esta
  regra refina a RN-424 acrescentando a forma de arquivo; não a substitui. PDF anexado ao e-mail
  segue fora de escopo.

## Fronteiras

- **A chave de assinatura não se move.** O gerador chama `ingressoPorLink` como a página chama.
  Se alguma implementação parecer pedir `QR_TOKEN_KEYS` dentro da landing, a implementação está
  errada (RN-419).
- **A rota não escreve nada.** Baixar ingresso não credencia, não emite e não muda estado
  (RN-418, D-ING-10).
- **Nenhuma Security Rule é tocada.** A fronteira de autorização continua sendo a verificação
  criptográfica do token no servidor de negócio.
- **`apps/landing` é território disputado** enquanto as reviews da S1225 estiverem em voo. A task
  entra na fila depois delas.

## Premissas desta lane

Nenhuma delas sobe ao painel: são escolhas de engenharia, tomadas, e ficam aqui para quem
precisar reabrir com motivo.

| # | Premissa | O que cai se ela cair |
|---|---|---|
| PDF-1 | Geração no servidor da landing, por Route Handler | Volta a discussão A × C; o critério de bundle público da S1214 é o primeiro a sofrer |
| PDF-2 | O arquivo não contém o link nem o token | O PDF vira segunda credencial fora do alcance dos cabeçalhos da RN-422 |
| PDF-3 | Botão só onde há QR; rota redireciona nos demais estados | Nasce PDF de ingresso cancelado, que mente no dia do evento |
| PDF-4 | `ingresso-<codigo>.pdf`, sem nome de pessoa | Nome de pessoa passa a vazar na lista de downloads |
| PDF-5 | Sem JavaScript de cliente, sem indicador próprio de progresso | Ganha spinner e perde a propriedade de rota sem cliente |

## O que esta spec NÃO decide

- PDF anexado ao e-mail da compra. Continua fora (D-ING-9), e continua sendo lane própria.
- Qual biblioteca de PDF entra. É escolha da lane de build, com dois limites: sem navegador
  headless, e sem nada que precise rodar no cliente.
- Ingresso em carteira digital (Apple Wallet, Google Wallet). Nunca foi pedido e não nasce por
  tabela.
- Qualquer mudança no que a página mostra. O PDF é a mesma projeção em outra forma.

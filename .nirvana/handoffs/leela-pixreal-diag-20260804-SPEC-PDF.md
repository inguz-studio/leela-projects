# Handoff · SPEC-PDF

- trace: `leela-pixreal-diag-20260804` · lane SPEC-PDF · employee sf-cto
- Modo: SÓ `leela-specs/` — nenhum código, rules, functions ou app. Duas reviews em voo
  (REV-S1225 e REV-F2F5) em `apps/landing` e `functions`; nada fora do meu território foi tocado.
- Insumos lidos: verbatim do dono de 05/08; rodada `2026-07-29-pagina-ingresso` (decisões
  D-ING-1..10, premissas P1..P12, RN-418..424); rodada ativa `2026-08-04-pos-pagamento`
  (01/04); E12 (RN-424, S1214 e as quatro tasks, delta DEC-0804); índice de RNs; código real
  da página (`apps/landing/app/(public)/ingresso/[token]/page.tsx`, `IngressoView.tsx`,
  `imprimir/page.tsx`, `lib/ingresso.ts`), `next.config.js`, `package.json` da landing,
  `deploy-leela-hub.mjs`, `packages/core/src/tickets/codigoIngresso.ts`.

## Números reservados nesta lane

- Decisão: **D-0804-4** (acrescentada à rodada aberta, na sequência de D-0804-1..3).
- RN: **RN-473** (varredura em 05/08: zero hits antes desta lane; faixa anterior terminava em 472).
- Task: **S1214-T5** (varredura: zero hits). Nenhuma story nova — o botão é delta da S1214.
- Itens novos de painel: **nenhum**, de propósito (ver abaixo).

## Estado por task

- [x] T1 — decisão registrada em `02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md`
      como **D-0804-4**, com o verbatim inteiro e a leitura literal (botão, PDF gerado,
      download, opcional). Registrada como **refinamento do P10**, não revogação.
- [x] T2 — spec nova `05-spec-pdf-ingresso.md`: inventário, análise de engenharia com as três
      alternativas rejeitadas, conteúdo do arquivo, matriz de estados, nome do arquivo,
      acessibilidade do botão, RN-473 transcrita, fronteiras e cinco premissas de lane.
- [x] T3 — **RN-473** canônica no [[LEELA-E12-landing]]; RN-424 emendada no lugar de origem
      (apontando para a RN-473); S1214 ganhou quatro critérios de aceite novos e a task
      **S1214-T5** detalhada; índice de RNs atualizado (linha nova e a prosa de "próximo número"
      passou de 472 para 473).
- [x] T4 — fila: **Frente 4** em `04-fila-codigo.md`, posicionada depois da REV-S1225, com a
      justificativa de território, a decisão de **não** marcar ⚔ e a condição que a torna ⚔.
      Ordem executável e critério de pronto atualizados.
- [x] T5 — kanban: card novo no padrão épico → história → tarefa, acima do card da S1225.
- [x] T6 — painel intocado (justificado abaixo).
- [x] T7 — commit + push.

## A decisão de engenharia, em uma linha

**Route Handler `/ingresso/{token}/pdf` na própria landing**, reusando `buscarIngressoPorLink`,
com a biblioteca de PDF só no servidor.

Rejeitadas, com motivo:

1. **Geração no navegador** — o link chega por e-mail e é aberto dentro do webview do Gmail/
   Outlook, onde baixar `Blob` é o caminho historicamente frágil; a biblioteca pesa mais que o
   PDF que ela produz (contra o princípio D-ING-5 de rede ruim); e quebraria o critério de
   aceite da S1214 ("nenhuma dependência nova entra no bundle público"), transformando a rota
   mais sensível da superfície pública na primeira com JavaScript de cliente.
2. **Function nova em `functions/`** — a biblioteca entraria num codebase deployado inteiro,
   cobrando cold start das functions do caminho do dinheiro; e uma segunda porta pública que
   verifica token é uma segunda fronteira para divergir. A landing SSR já está quente no
   instante do clique, e o Route Handler **não ganha chave nenhuma** (RN-419 intacta).
3. **`window.print()`** — é o diálogo de impressão, exatamente o que o dono não pediu, e ainda
   exigiria JavaScript de cliente para entregar menos.

Chromium na Function segue morto pelo motivo de 29/07. Custo declarado do escolhido: uma
invocação de `ingressoPorLink` e uma leitura por download, a biblioteca no bundle do servidor da
landing, e nenhum indicador próprio de progresso (quem dá o retorno é o download do navegador,
com o teto de 12 s que a página já pratica).

## Duas escolhas de produto que a spec fecha, com razão escrita

- **O arquivo não carrega o link nem o token** (lógica da RN-419 aplicada a arquivo): num PDF
  não existe `no-store`, nem `Referrer-Policy`, nem prazo, nem volta — e quem tem o arquivo já
  tem o QR, então o token não compra nada e só cria uma segunda credencial solta.
- **O PDF existe onde o QR existe.** Estado sem QR não gera e o botão não aparece; a rota
  acessada direto redireciona para a página. A razão é mais dura que a da RN-421: a página é
  relida a cada abertura, o arquivo congela — e um PDF de ingresso cancelado seria mostrado no
  credenciamento sem nenhuma superfície capaz de corrigi-lo.

## Por que nada subiu ao painel

A frase do dono decide o quê (botão, arquivo gerado, download, opcional) e o rótulo. O que
sobrou é engenharia (onde gerar, qual biblioteca) e higiene de privacidade já governada pela
RN-422 e pela RN-419. O único resíduo que seria do dono — **PDF anexado ao e-mail da compra** —
não é pedido por esta frase e já estava parqueado pela D-ING-9 como lane própria se ele pedir;
ficou registrado em "o que esta rodada NÃO decide", sem item novo. Abrir um item de painel aqui
seria fabricar pergunta.

## Desvios

- Nenhum toque fora de `leela-specs/`. Nenhum código, nenhuma Rule, nenhum navegador aberto.
- A spec e a RN da lane moram no mesmo arquivo (`05-spec-pdf-ingresso.md`) em vez de dois
  numerados, porque é **uma** regra: um arquivo com quinze linhas ao lado seria pior de achar
  que uma seção. A canônica está no E12, como sempre.
- O índice de RNs tem uma lacuna anterior a esta lane (a faixa 461-468 da SPEC-QUALIFICACAO
  aparece na prosa e não na tabela). **Não corrigi**: é fora do meu delta e outra lane pode
  estar em cima. Fica registrado aqui para quem passar.

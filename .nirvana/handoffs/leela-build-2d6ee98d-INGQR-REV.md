# Handoff · Lane INGQR-REV (review antagonista) · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge), contexto fresco — não produzi o código sob review.
- **Alvo:** 6 commits da INGRESSO-QR (`182bc99`, `a58ee35`, `bf2ec05`, `ca6baf2`, `a089ba2`, `93e5e33`).
- **Repo:** `C:\dev\LEELA`, branch `main`.
- **Preview do dono:** 5273 / 8180 / 3000 intocados; nenhum re-seed rodado.
- **Emulador:** exclusivo, `npx firebase-tools@13 emulators:exec --project demo-leela` (8080/9099/5001), build de `functions` antes.

## Veredito por vetor

| # | Vetor | Veredito |
|---|---|---|
| 1 | Unicidade sob concorrência REAL | ✅ PASSA — provado, era só "não provado" |
| 2 | Idempotência de emissão e e-mail | ⚠️ **DEFEITO PROVADO E CORRIGIDO** (e-mail) |
| 3 | Pedido pago sem ingresso | ❌ **ÓRFÃO EM SILÊNCIO — ESCALADO** |
| 4 | Rotação de chave × ingresso emitido | ✅ PASSA — provado ponta a ponta |
| 5 | QR no Gmail/Outlook (CID inline) | ❌ **INVIÁVEL no provider atual — ESCALADO** |
| 6 | Rules de `codigoIngresso` (escrita + leitura) | ✅ PASSA — falsificado e reforçado |
| 7 | Auditoria das 2 asserções substituídas | ✅ PASSA — as duas são estritamente mais fortes |
| 8 | Dublês de layout sem `<Outlet/>` | ✅ varrido — 1 remanescente, benigno (directive) |
| 9 | Bundle do painel com `qrcode` | ⚠️ aplicado dynamic import; número real escalado |

---

## Vetor 1 — contenção real da reserva de código: PASSA

O risco nº 1 da lane ("o teste força a colisão pelo RNG, não pelo relógio") caiu.
Oito `emitirIngressosDoPedido` EM VOO ao mesmo tempo, todas com o RNG viciado
para sortear o MESMO código no primeiro round:

```
[V1-8x] emitidos/falhas [{e:1,f:0}×8]
        codigos ["B2D7Y8","TJUDFB","D7MU8V","SSSSSS","Z7ETPM","EUKJGT","9T5SJC","6ATMWT"]
```

Exatamente UMA levou o código disputado (`SSSSSS`); as outras sete perceberam a
perda, re-sortearam e saíram com código próprio. Zero duplicata, zero falha.
O `tx.get` de doc INEXISTENTE entra mesmo no read-set — a aposta da decisão 1 da
lane se confirma no emulador.

Réplica concorrente do mesmo pedido (3× em paralelo): `[{e:1,j:0},{e:0,j:1},{e:0,j:1}]`,
uma reserva só e ela é a do código gravado no doc — **sem reserva órfã**.

Virou teste permanente em `emitirIngressos.integration.test.ts`
(`contenção REAL da reserva de código (⚔ INGQR-REV)`, 2 casos).

## Vetor 2 — idempotência: emissão PASSA, e-mail estava QUEBRADO

**Emissão:** idempotente sob corrida (acima). Nada a corrigir.

**E-mail: defeito provado.** A chave da RN-219 saía do inscrito responsável
encontrado **na lista de ingressos EMITIDOS**. Quando a primeira passagem falha
justamente no responsável (é o que `falhas > 0` produz), o log é carimbado em
OUTRO inscrito; a passagem seguinte deriva um docId diferente, não colide, e sai
um **SEGUNDO e-mail com o QR e o código de todo mundo**.

- Vermelho: `expected 'enviado' to be 'ja_enviado'` · 2 envios para 1 pedido.
- Fix: a chave passa a sair de `pedido.inscritoRefs` (escrito pela Function do
  checkout, `pedidos` é `write: false` para cliente) — função só do pedido, nunca
  do desfecho da emissão.
- Verde: 17/17 em `emailIngressos.integration.test.ts`.
- Falsificação: revertendo só o `for (const inscritoId of inscritoRefs)` para a
  varredura dos emitidos ⇒ 1 failed / 16 passed. A asserção morde.

## Vetor 3 — pedido pago sem ingresso: ÓRFÃO EM SILÊNCIO (escalado)

Não existe varredura, não existe retry, não existe re-emissão manual. Provado:

```
[V3-duplicado]    disparo → null · qrToken undefined
[V3-estado-final] disparo → null · qrToken undefined
```

O cenário completo:

1. 1ª entrega do webhook: pagamento `pendente` → `confirmed`, pedido vira `pago`,
   `dispararEmissaoIngressosPosConfirmacao` roda **best-effort** e engole o erro.
2. Se a emissão explodir ali (ou `falhas > 0` por `sem_codigo_livre`), o pedido
   fica pago sem ingresso.
3. 2ª entrega do MESMO eventId: ledger existe ⇒ `duplicado: true, ignorado: true`
   ⇒ o disparo retorna `null` **antes de olhar o pedido**.
4. Entrega de outro eventId (o Asaas manda `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`):
   pagamento não está mais `pendente` ⇒ `ignorado: true, motivo: 'estado_ja_final'`
   ⇒ o disparo retorna `null` de novo.

Ou seja: **a única janela de emissão é a primeira entrega**, e a re-entrega — que
é justamente o mecanismo de recuperação do gateway — está desligada para ingresso.
Varredura por `grep`: os únicos chamadores de `emitirIngressosDoPedido` são os 3
confirmadores; não há `onSchedule`/callable de re-emissão em lugar nenhum.

Isto agrava o vetor 1: a "falha honesta e recuperável" do `sem_codigo_livre`
(`TENTATIVAS_CODIGO_INGRESSO = 8` esgotado) **não tem quem a recupere**.

Classe do item 52. O repo já tem a forma do fix pronta e reusável:
`varrerEstornosOrfaos` (cron) + `ORFAOS_PENDENTES_COL` (extrato de pendência).
Uma varredura de `pedidos` pagos com inscrito confirmado sem `qrToken` fecha o
buraco reusando esse par. **Não implementado nesta lane** — é escopo de produto
(cadência, janela, superfície de aviso ao organizador), não defeito de código
com fix óbvio.

## Vetor 4 — rotação de chave: PASSA (provado ponta a ponta)

O que existia era teste de unidade sobre `verificarQrToken`. Faltava a corrente
inteira. Agora provada:

- emite com `k1` ⇒ token `LLQR1.k1.…`;
- roda a emissão de novo com o ring rotacionado (`ativo: k2`, `k1` ainda dentro)
  ⇒ **o token não muda** (o "nunca re-assinar" da decisão 3 é real);
- `registrarCheckinCore` com o ring novo **aceita** o QR antigo — log
  `checkin_registrado kid=k1`.

E o outro lado: tirar `k1` do ring revoga o que `k1` assinou (`kid_desconhecido`,
check-in recusado, `checkinEm` ausente). A rotação documentada em `qrToken.ts`
funciona nos dois sentidos.

Virou teste permanente (`rotação de chave não mata ingresso emitido (⚔ INGQR-REV)`).

## Vetor 5 — QR no Gmail/Outlook: CID inline INVIÁVEL aqui (escalado)

O risco 2 da lane é real e continua de pé. Avaliação da alternativa pedida:

1. **O port não tem superfície de anexo.** `SendTransactionalParams`
   (`packages/core/src/email/EmailProvider.ts`) tem `to/assunto/html/texto/tag` e
   nada mais. Anexo CID exige campo novo no PORT — contrato compartilhado por
   convite E18, influenciador RN-316, campanhas E06, aniversário E19 e este
   e-mail. Mudança de contrato transversal, não acréscimo local.
2. **O adapter monta corpo fixo.** `createBrevoProvider` serializa
   `sender/to/subject/htmlContent/textContent/tags` — nenhuma passagem de anexo.
3. **O `POST /v3/smtp/email` do Brevo não expõe `Content-ID`.** O array
   `attachment` aceita `{url}` ou `{content,name}`; não há campo de content-id,
   então o anexo entra como **anexo comum**, não como imagem inline referenciada
   por `cid:`. Inline por CID no Brevo é caminho de SMTP relay, não da API REST
   que o produto usa.
4. **Não dá para provar sem rede.** A disciplina da lane proíbe rede real e
   `BREVO_API_KEY` está vazia — qualquer implementação sairia daqui sem prova de
   renderização, que é exatamente o que o vetor quer evitar.

Somando: implementar CID aqui seria mudar um port compartilhado por 5
consumidores para um mecanismo que o provedor atual provavelmente não suporta,
sem poder verificar. **Escalo em vez de implementar.** As saídas reais, em ordem
de custo:

- **(a) Confirmar na conta real** se o `attachment` do Brevo aceita content-id
  (5 min com a chave que o dono já vai precisar ativar) — só então mexer no port.
- **(b) Página própria do ingresso (S1206-T4/E13)** com link assinado por
  inscrito no e-mail. Resolve o QR em qualquer cliente, mata o risco 3 (o "link
  do ingresso" da RN-398 que hoje não tem destino) e não põe credencial em URL
  pública se o link for tokenizado. É o caminho que eu recomendo.
- **(c) Manter o data URI** e aceitar que o dono (Gmail) vê o e-mail sem QR, com
  o código em texto carregando o atendimento. É o estado atual, e é honesto —
  mas é uma decisão de produto que o dono precisa tomar sabendo disso.

## Vetor 6 — Rules de `codigoIngresso`: PASSA, falsificado

**Escrita.** Falsifiquei removendo `'codigoIngresso'` de
`semCamposDeFunctionInscrito` e `camposDeFunctionIntocados` (sem commitar):

```
× cliente NÃO cria inscrito com codigoIngresso (RN-396)
× cliente NÃO escreve codigoIngresso em update, nem limpa (RN-396)
```

Duas asserções morderam. Guarda é load-bearing. Restaurado.

**Leitura.** Ninguém fora da gestão lê o doc do inscrito — logo ninguém lê
`qrToken` nem `codigoIngresso`. Já coberto por testes existentes: `promoter NÃO
LÊ`, `athlete COM claim de tenant NÃO LÊ`, `owner de A NÃO lê inscrito de B`,
`anônimo NÃO lê`. Atleta alheio não alcança credencial de ninguém.

**Buraco que a lane deixou sem prova:** a subcoleção `ingressoCodigos` era
"deny-by-default de propósito" e **nunca foi testada**. "Não escrevi regra" não é
prova. Escrevi o teste: `tenant_owner` (o papel de cliente mais forte) é negado
na LEITURA (daria o mapa código→inscrito do evento inteiro) e na ESCRITA
(pré-queimar códigos faria a emissão alheia esgotar as 8 tentativas e desistir).
Ambos negados. Virou teste permanente.

## Vetor 7 — as duas asserções substituídas: as duas são mais fortes

Auditoria linha a linha. O arquivo é NOVO no commit `a58ee35`, então não há
versão anterior no histórico — a auditoria é sobre a força do que ficou.

**Troca 1 — HTML.** `not.toContain('onerror=')` → conjunto de 5 asserções.
A original era **inutilizável**: o payload escapado
`&lt;img src=x onerror=alert(1)&gt;` contém a substring literal `onerror=`, então
ela reprovava o código CORRETO. O que ficou:

- `toContain('&lt;img src=x onerror=alert(1)&gt;')` — a forma escapada exata,
  byte a byte (mais forte: exige o escape, não só a ausência);
- `toContain('&lt;script&gt;alert(1)&lt;/script&gt;')`;
- `not.toMatch(/<script/i)` e `not.toMatch(/<img[^>]*onerror/i)` — nenhuma TAG
  nasce do texto da pessoa;
- `match(/<img[^>]*>/g)).toHaveLength(1)` — a única imagem é a que o servidor
  montou (fecha o buraco que "não contém onerror" deixava aberto: outra tag
  injetada com outro handler passaria na original e reprova aqui);
- `toMatch(/<img [^>]*alt="QR do ingresso"/)` — nenhum atributo carrega dado de fora.

Veredito: substituta estritamente mais forte. Aprovada.

**Troca 2 — texto/assunto.** Asserção de "texto sem markup" → asserção de header
injection. Correta na motivação (`text/plain` não interpreta markup, então a
original media o nada) e mais forte no que passou a cobrir: `assunto` sem
`[\r\n]`, igualdade exata do assunto sanitizado, e ausência de CR no corpo. A
sanitização real é `limparCampoCurto` (remove `\u0000-\u001f`, colapsa
whitespace), e o `brevoProvider` re-garante na borda (`replace(/[\r\n]+/g,' ')`)
— defesa em profundidade de verdade, não duplicada por acaso.

Veredito: substituta mais forte. Aprovada. **Zero asserção removida sem
substituta mais forte** — confirmado.

Conferi também o resto da superfície de injeção do template: o `src` do `<img>`
recebe `ingresso.qrDataUri` sem escape, mas atrás de `isQrDataUriValido`, cujo
regex (`^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$`) não admite aspas nem
`svg+xml`. Fechado.

## Vetor 8 — dublês de layout sem `<Outlet/>`: varrido

Dois arquivos do painel dublam layout:

- `_system/__tests__/RotasLegadas.test.tsx` — **corrigido pela lane** (tem `<Outlet/>`);
- `eventos/__tests__/EventosRoutes.repasses.test.tsx` — dublê de `EventoLayout`
  **sem `<Outlet/>`**, remanescente.

Analisado: **não produz falso-verde**. Todas as asserções desse arquivo miram (a)
o texto do próprio dublê, provando qual rota casou, e (b) a presença/ausência da
SubNav do hub, que é renderizada por `EventosHubLayout` — um ramo IRMÃO, não
filho de `:slug`. Nenhuma asserção depende de rota filha renderizar. Colocar
`<Outlet/>` ali passaria a montar as páginas reais (não mockadas) e trocaria um
teste de precedência de rota por um teste de integração acidental.

Fica como directive, não como fix. Os demais layouts (`KitsLayout`,
`FinanceiroLayout`, `ConfiguracoesLayout`, `EventosHubLayout`) são usados REAIS
em `navegacao-spa.test.tsx` — sem dublê, sem risco.

## Vetor 9 — bundle: dynamic import aplicado, número real escalado

Medido, não estimado.

| | chunk principal | gzip | chunk do `qrcode` |
|---|---|---|---|
| antes | 2.204,46 kB | 588,40 kB | — (dentro do principal) |
| depois | 2.181,09 kB | 578,61 kB | 24,53 kB (gzip 9,66 kB), sob demanda |

O `import('qrcode')` entrou dentro do efeito do `QrIngressoModal`: o encoder só
pesa quando alguém abre um QR. Prova: build verde, `tsc` limpo,
`InscritosView.test.tsx` 20/20.

**Mas o número que importa é o outro:** o painel continua sendo **um chunk de
2,18 MB**. O `qrcode` custava 1% disso — o aviso de 500 kB não é dele e não some
com ele. O painel inteiro é uma única entrada sem code-split de rota. Isso é
dívida de arquitetura de build (lazy por rota + `manualChunks` de vendor), não
tarefa desta lane. **Escalado com o número.**

## Fixes desta review

| Commit | Vetor | Prova |
|---|---|---|
| `291d4f9` chave de idempotência do e-mail sai do pedido | 2 | vermelho (`expected 'enviado' to be 'ja_enviado'`, 2 envios) → verde; falsificação morde |
| `3f9ba65` testes de contenção, rotação e deny de `ingressoCodigos` | 1 · 4 · 6 | 6 casos novos, todos verdes contra o emulador |
| `e6a1407` `qrcode` por import dinâmico | 9 | 2.204,46→2.181,09 kB, chunk próprio de 24,53 kB; painel 20/20 |

## Testes acrescentados (o que a lane declarou como não provado)

- `contenção REAL da reserva de código (⚔ INGQR-REV)` — 8 emissões concorrentes; réplica paralela do mesmo pedido.
- `rotação de chave não mata ingresso emitido (⚔ INGQR-REV)` — k1 sobrevive à virada; k1 fora do ring revoga.
- `ingressoCodigos é server-only de verdade (⚔ INGQR-REV)` — leitura e escrita negadas ao `tenant_owner`.
- `primeira passagem PARCIAL (sem o responsável) não libera um segundo e-mail` — a regressão do fix do vetor 2.

## Escalado sem fix

1. **Órfão de ingresso (vetor 3)** — pedido pago sem ingresso, sem varredura e
   sem retry. Classe do item 52. Fix reusa `varrerEstornosOrfaos` + extrato de
   pendência. Decisão de produto (cadência + superfície de aviso).
2. **QR no Gmail/Outlook (vetor 5)** — CID inline inviável no port/provider
   atuais. Recomendação: página própria do ingresso (S1206-T4/E13), que fecha
   junto o "link do ingresso" sem destino (risco 3 da lane).
3. **Bundle de 2,18 MB em chunk único (vetor 9)** — code-split por rota.
4. **`emitirIngressosDoPedido` confia em `inscritoRefs` sem conferir o
   `pedidoRef` de volta** — hoje inexplorável (`pedidos` é `write: false` para
   cliente), mas um inscrito de outro pedido na lista sairia com ingresso emitido
   E dentro do e-mail de terceiro. Directive de defesa em profundidade.
5. **Dublê sem `<Outlet/>` em `EventosRoutes.repasses.test.tsx`** — benigno hoje;
   qualquer asserção nova sobre rota filha de `:slug` ali nasce falso-verde.

## Gates (comando + resultado literal)

| Gate | Comando | Saída |
|---|---|---|
| functions tsc | `npx tsc --noEmit` | exit 0 |
| functions eslint | `npx eslint src --max-warnings 0` | exit 0 |
| functions build | `npx tsc` | exit 0 |
| emulador (as 17 suítes da lane) | `npx firebase-tools@13 emulators:exec --project demo-leela "npm --prefix functions run test -- <17 arquivos>"` | **17 files / 328 tests passed** · 187,01 s · exit 0 |
| painel tsc | `npx tsc --noEmit` | exit 0 |
| painel eslint | `npx eslint src --max-warnings 0` | exit 0 |
| painel suíte | `npx vitest run` | **186 files / 1697 tests passed** · exit 0 |
| painel build | `npx vite build` | exit 0 · principal 2.181,09 kB (gzip 578,61) + chunk `qrcode` 24,53 kB |

Baseline da lane sob review: 17 / **322**. Delta +6 = os casos novos desta
review (5 em `emitirIngressos.integration`, 1 em `emailIngressos.integration`).
Painel sem regressão: 186 / 1697, o mesmo número da lane.

`packages/core` e `packages/api-client` **não foram tocados** — nenhum `tsup`
necessário antes da suíte do painel.

## Falsificações (todas morderam)

| Guarda removida (sem commitar) | Resultado |
|---|---|
| `'codigoIngresso'` fora de `semCamposDeFunctionInscrito` + `camposDeFunctionIntocados` | `× cliente NÃO cria inscrito com codigoIngresso (RN-396)` e `× cliente NÃO escreve codigoIngresso em update, nem limpa (RN-396)` |
| chave do e-mail voltando a sair dos ingressos emitidos | `× primeira passagem PARCIAL (sem o responsável) não libera um segundo e-mail` · 1 failed / 16 passed |

Ambos os arquivos restaurados byte a byte a partir de backup antes dos gates
finais (`git diff` de `firestore.rules` limpo).

## Veredito final da lane INGRESSO-QR

**APROVADA COM RESSALVAS.**

O núcleo de credencial está sólido e agora provado, não afirmado: a unicidade do
código aguenta contenção real, a emissão é idempotente sob corrida, a rotação de
chave não mata ingresso emitido, o código não credencia ninguém, e nem escrita
nem leitura de cliente alcançam `codigoIngresso`, `qrToken` ou a reserva. Nada do
que a lane entregou abre porta para entrar de graça no evento.

As ressalvas são as duas que ficam fora do código entregue e uma que estava
dentro:

1. **Corrigida aqui:** o e-mail duplicava quando a emissão falhava no responsável.
2. **Escalada (bloqueia o "pronto para o dono", não a lane):** pedido pago sem
   ingresso é órfão permanente e silencioso — nenhuma re-entrega do gateway
   volta a tentar, e não existe varredura nem re-emissão manual.
3. **Escalada (decisão de produto):** o dono usa Gmail e Gmail não renderiza data
   URI. O e-mail dele vai chegar sem QR. O código em texto segura o
   credenciamento, mas isso precisa ser dito antes de ele abrir a caixa.


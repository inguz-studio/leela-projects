# REV-5C · review antagonista das superfícies do comprador (S1228-T2)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** REV-5C
- **Employee:** sf-qa-engineer (software-forge) · contexto fresco
- **Sob review:** `6993a36a` — a tela de confirmação e o e-mail passam a mostrar `PED-XXXXX`
- **Fix-commits:** `2b3b8810` (defeito) · `aeb2be88` (gates que não seguravam)
- **Veredito:** **REPROVADO na entrega, APROVADO depois do fix.** Um defeito alto,
  reproduzido em três cliques, com o dano exato que o construtor nomeou como o único
  desta lane capaz de fazer alguém ditar a compra errada.

## Veredito por vetor

| # | Vetor | Resultado | Evidência |
|---|---|---|---|
| 1 | Leitura dedicada em paralelo ao `confirmar()`; sem teste de lentidão | **procede, sem defeito** | Teste de lentidão escrito (`aeb2be88`). Na janela: confirmação inteira, ingresso no lugar, sem código, sem id, sem erro |
| 2 | Terceiro ponto que não zera o código | ⛔ **DEFEITO ALTO — confirmado** | `2b3b8810`. Não é um `setCharge` a mais: é a leitura em voo. Reproduzido pela UI |
| 3 | `text-secondary` × `feedback-success-surface` fora da matriz do DS | **procede; medida confere** | 9,38:1 (brasa) e 7,12:1 (wine). Par ausente da matriz. Passa AA nos dois temas |
| 4 | Canário de fonte é regex e tem borda | ⛔ **pior do que declarado** | Pegava 2 de 9 formas. `aeb2be88` leva a 11 de 12 |
| 5 | R-4 (en-dash não normaliza) | **não atinge esta lane; a lane cria o caminho** | Único consumidor é a busca do painel. Mas o e-mail agora é a origem do texto que se copia |
| — | `inscritoId` removido do `Ticket` | **correto, sem órfão** | Nenhum consumidor dependia do texto |
| — | E-mail com dois códigos | **distinção sobrevive** | Renderizado e lido, 2 participantes, HTML e texto |
| — | Ausência de código | **honesta em todos os ramos** | 25/25 no emulator próprio (8787) + 12 casos de tela |
| — | **Não declarado** | ⛔ **o id viaja no e-mail, em base64** | O link do ingresso decodifica para o `pedidoId` com o uid |

## O defeito · `2b3b8810`

O construtor apontou o lugar certo e errou a forma. Os `setCharge(` são **três**, e os dois
que zeram a cobrança zeram o código junto — a varredura que ele pediu está correta. O
terceiro caminho é a **leitura que já estava no ar quando os dois zeraram**.

As duas leituras que captam o código (`consultarPedido`, do PIX, e a dedicada do cartão)
escreviam sem conferir se o pedido lido ainda era o pedido da tela. O único guard era
`montadoRef`, que só sabe de desmontagem — e aqui a tela continua viva.

**Três cliques, sem corrida de rede:**

1. gerar o PIX → pedido A; a consulta de carregamento lê o código de A e o põe na tela;
2. trocar para cartão → a invalidação por preço zera cobrança e código, **mas o efeito da
   leitura dedicada roda no MESMO flush**, ainda enxergando A na sua closure, e dispara
   `getPedido(A)`;
3. pagar → pedido B. A resposta de A aterrissa depois do zero e ressuscita o código de A.

Se a leitura de B não voltar — o caso que a própria lane já testa como "falha engolida com
log" — a confirmação de B fica exibindo o código de A: um código **real**, de uma compra
cancelada, que o balcão encontra e abre.

O teste falhou contra `6993a36a` com a mensagem exata do dano:

```
expected 'ConfirmaçãoInscrição confirmada!… Pedido PED-A2B3C …' not to contain 'PED-A2B3C'
```

**O conserto** é uma régua, `pedidoNaTelaRef`, movida de forma **síncrona** por
`definirCharge` nos três pontos em que a cobrança muda. As duas leituras conferem antes de
escrever; a dedicada confere antes de ler.

⚠️ **A primeira tentativa de conserto continuou verde para o bug** e está registrada no
código: ler `charge?.pedidoId` no render deixa a régua um passo atrás, porque a leitura
obsoleta volta num microtask que corre **antes** de a re-renderização com `charge: null`
comitar. A régua tem de mudar no instante em que a cobrança muda, não na renderização
seguinte.

## O achado não declarado · o id viaja no e-mail, em base64

O commit afirma: *"o `pedidoId` não aparece em nenhuma das partes"*, e o handoff sustenta
isso com uma prova de **fronteira**: `IngressosCompraEmailInput` não tem o campo, logo o id
não atravessa o template.

O id atravessa. Com outro nome e outra codificação — exatamente o modo de falha que o
próprio construtor descreveu ao encontrar a sexta superfície.

O link do ingresso é `LLIP1.<kid>.<payloadB64>.<assinatura>`, e o payload é
`base64url(JSON)` de `{i: inscritoId, e: eventoId, t: tenantId}`. O `inscritoId` é
`{pedidoId}-i{n}`. O link é impresso **como texto visível** — num `<span
style="word-break:break-all">` no HTML e cru no texto puro, uma vez por participante.

Renderizado e decodificado nesta review:

```
https://leela.app/ingresso/LLIP1.k1.eyJpIjoicGVkLWFub24tYW5hLTRmMjFjOS1jaGstYTFiMmMzZDQtaTEi…

→ {"i":"ped-anon-ana-4f21c9-chk-a1b2c3d4-i1","e":"evt-x","t":"ten-1"}
```

**Não é regressão desta lane** — o link é da S1214-T3 — e **não é violação da spec**: ela
exclui o token por escrito ("credencial não encurta"). Mas a razão da exclusão fala de
tamanho, e o dano que a RN-475 nomeia é outro: *"o uid viajando é o dano"*. O e-mail é
justamente o texto que a pessoa encaminha.

**Isto é decisão do dono, não conserto de lane** — e o território (`packages/core`) está
fora do meu de qualquer forma. O que corrijo aqui é a **afirmação**: a prova de fronteira
não cobre o id codificado, e a linha do e-mail na tabela de superfícies da spec não pode
ser marcada como fechada sem essa ressalva.

## Os gates que não seguravam · `aeb2be88`

**O canário pegava 2 de 9 formas de vazar.** Entre as sete que passavam:
`title={x.pedidoId}` — a forma **exata** que a lane acabou de remover à mão do `Ticket.tsx`.
O canário não teria pegado o achado do commit que o introduziu.

| Forma | Antes | Agora |
|---|---|---|
| `Pedido {charge.pedidoId}` | pega | pega |
| `{pedidoId}` · `{charge?.pedidoId}` | pega | pega |
| `title={x.pedidoId}` · `alt=` · `aria-label=` | **passa** | pega |
| `dangerouslySetInnerHTML` | **passa** | pega |
| `{a.b.pedidoId}` | **passa** | pega |
| `{charge.pedidoId.slice(0, 12)}` | **passa** | pega |
| `{String(charge.pedidoId)}` | **passa** | pega |
| subdiretório · arquivo `.ts` | **passa** | pega (varredura recursiva) |
| `const ref = charge.pedidoId` → `{ref}` | passa | **passa — limite declarado no arquivo** |

Zero falso positivo no checkout de hoje. O meta-teste enumera as onze formas que têm de
gritar e as seis que têm de continuar mudas.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` landing · functions | **0 · 0** |
| eslint `app lib` + testes da lane · functions `src` | **0 · 0 · 0** |
| Suíte landing INTEIRA, antes do meu fix (controle) | 56/683 · **verde** |
| Suíte landing INTEIRA, depois do fix, 2× | 56/683 · 57/697 · **verde** |
| Suíte landing INTEIRA, depois do fix de teste, 2× | 57/699 · 57/700 · **verde** |
| `emailIngressos.integration.test.ts`, emulator 8787 (IPv4, JDK 21) | **25/25** |

⚠️ **A suíte da landing NÃO é reprodutível em paralelo nesta máquina agora.** Com a
concorrência default ela falhou **10 arquivos / 51 testes — no HEAD, sem nenhuma mudança
minha** (controle rodado com `git stash`). Os mesmos arquivos passam isolados. A causa são
os **dois emuladores Firebase (Java) de outras lanes** disputando a máquina; os erros são
`Unable to find an element` com testes de 5-17s, não asserção.

Todos os números acima são com `--no-file-parallelism`. **Desvio declarado do comando de
gate**, e é o que torna o resultado confiável. O "flake conhecido do barrel do DS" que a 5c
não observou continua sem aparecer — o que vi é outra coisa, e é ambiental.

**A linha de base se moveu quatro vezes durante a review**, porque a árvore é compartilhada
e outras lanes aterrissaram no meio (`b3e51638` da S1222-T4 trouxe +1 arquivo e +14 testes;
depois vieram outras). Daí a série 683 → 697 → 699 → 700. Todas verdes, e a diferença entre
medições consecutivas é sempre trabalho de terceiro, nunca meu: os meus são +2 no
`2b3b8810` e +2 no `aeb2be88`.

## Ressalvas

### Painel do dono (decisão, não conserto)

1. **O id no e-mail, em base64** (acima). A pergunta é se o modelo de dano da RN-475 cobre
   id codificado dentro de link impresso. Hoje a spec diz que não cobre, por um motivo que
   fala de outra coisa.
2. **Ausência transitória e ausência permanente são indistinguíveis.** Leitura lenta, leitura
   que falhou e compra anterior ao backfill produzem a mesma tela: sem linha nenhuma. No PIX
   existe "Atualizar estado do pedido"; **no cartão não há nada para pedir de novo**. Está
   preso em teste como contrato — se não for o desejado, é conserto pequeno.
3. **O mesmo código, dois tratamentos.** No checkout: `Pedido PED-XXXXX`, `text-xs`, rótulo.
   Em `minha-conta/PainelCompras.tsx`: `PED-XXXXX`, `text-sm` mono, **sem rótulo**. Duas
   telas do mesmo comprador, duas leituras.
4. **"Se a imagem não abrir, o código acima identifica a inscrição."** Com dois tipos de
   código acima, "o código acima" ficou ambíguo. Copy, uma linha.

### Fila técnica

5. **O par `text-secondary` × `feedback-success-surface` entra na matriz?** Medido: 9,38:1
   (brasa) e 7,12:1 (wine); o `text-tertiary` dá 6,05 e **5,01**. Todos passam AA. O de wine
   passa com 11% de folga, e a 5c mediu só o tema escuro. Buraco pré-existente do DS.
6. **R-4 deixou de ser teórica.** `normalizarCodigoPedido` só come `[\s-]+`. Antes desta lane
   o comprador não tinha código nenhum para copiar; agora o e-mail é a origem do texto que
   ele cola. Conserto no core, dois normalizadores no mesmo commit.
7. **`eslint app lib` nunca cobriu `test/`.** `test/ingresso-pdf.test.tsx` tem erro de lint
   desde `dadb10a1` e o gate declarado não o vê.
8. **Teste de functions sem emulator passa sem provar nada.** `emailIngressos.integration.test.ts`
   devolve exit 0 com **25 skipped**. Um verde falso custa esquecer uma variável de ambiente.
9. **Estender o canário às superfícies de comprador fora do `checkout/`.** Não fiz de
   propósito: poria um gate meu no território de uma lane em voo.

## Conferência VISUAL do dono

A lista da 5c continua valendo inteira. Acrescento e reordeno:

1. **O e-mail com dois códigos, num cliente real, com 2+ participantes.** Li o HTML e o texto:
   a distinção sobrevive (rótulos "Código da compra" / "Código do ingresso", 20px contra
   32px, o da compra fora dos cartões e antes deles, prefixo só no da compra, 5 símbolos
   contra 6). O que nenhum teste prova é se ela sobrevive ao Gmail e ao Outlook.
2. **O cartão do ingresso sem o id.** Ficou nome + "modalidade · kit" + QR.
3. **A linha `Pedido PED-XXXXX` na confirmação** — se tem peso de "o número que eu guardo".
4. **A mesma linha ao lado da de `minha-conta`** (ressalva 3): decidir se é uma leitura só.
5. **Sem o backfill da 5b contra o ambiente, os itens 1 e 3 não são conclusivos** — o seed
   grava os onze pedidos sem código (RS1-4).

## Para marcar em `leela-specs/` (não editei — selo do maestro)

- **`06-spec-codigo-pedido.md`, tabela de superfícies:** linhas 1, 2 e 3 feitas; a linha do
  `Ticket.tsx` (sexta superfície) merece ficar escrita, como a 5c pediu.
- **Uma linha nova, a sétima:** o **link do ingresso impresso no e-mail**, que carrega o
  `pedidoId` em base64. Ela não é da 5c consertar, mas a próxima varredura por `pedidoId`
  vai deixá-la passar de novo — que é exatamente o que aconteceu com a sexta.
- **A ordem de deploy não mudou:** o backfill (5b) roda antes de a 5c ir ao ar.

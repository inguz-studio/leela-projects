---
trace: leela-painel-corte-20260809
lane: REV-CORTE
wave: C
employee: sf-qa-engineer (software-forge)
repo: C:\dev\LEELA
branch: main
head_inicial: 1fb9fd4a
data: 2026-08-09
papel: review antagonista de contexto frio, três alvos
---

# REV-CORTE · os três vereditos

| Alvo | Veredito | Segura o deploy? |
|---|---|---|
| **1 · OVERLAY** (`7b55d1b3`) | **APROVADA COM RESSALVAS** — e só depois do conserto. Como entregue estava **REPROVADA**: dois defeitos, um deles crítico, pagos aqui em `d9394f51`. | não, agora não |
| **2 · PONTE-RECUSA** (`2271fd78`, `38420cb6`, `9f75c286`) | **APROVADA COM RESSALVAS** — nenhum defeito de código; duas afirmações do handoff são mais fortes do que a prova que as sustenta. | não |
| **3 · PARSE** (`41bb7e8b`, `431c92ac`) | **APROVADA COM RESSALVAS** — nenhum defeito; a varredura dos dezoito é honesta na amostragem adversarial e o inventário está completo. Uma Directive ganhou gate aqui. | não |

**O deploy pode levar os três juntos.** Nenhum alvo ficou reprovado ao fim desta
review, e a questão de separabilidade não chega a se colocar. Fica registrado que
o pacote **só** é deployável com `d9394f51` dentro: sem ele, o alvo 1 sobe com o
painel morto no caminho feliz, e aí seguraria o pacote inteiro — os três estão no
mesmo `apps/painel` e no mesmo deploy.

---

## Alvo 1 · OVERLAY — dois defeitos, os dois invisíveis no jsdom

A adoção do `Modal` está certa, o `inert` está no lugar certo e o contraste está
medido certo. O que a lane não viu é que entregou o `inert` **sem uma saída
confiável**, e as duas saídas quebradas são as duas que importam.

### DEF-REV-1 · crítico · o painel recém-liberado nascia morto

A vitrine tem **duas** saídas, e a lane só cuidou de uma. Além do aviso fechar,
a vitrine **cai** quando o código Leela é resgatado: a sessão muda, `emVitrine`
vira falso, o gate devolve os filhos. Esse caminho não passa por `fechar` —
`aviso.aberto` continuava `true`, as dependências do efeito não mudavam, a
limpeza nunca rodava.

Medido, com o resgate dando certo:

```
[PROBE] inert com o aviso aberto?              true
[PROBE] aviso ainda na tela?                   false
[PROBE] inert DEPOIS do resgate bem-sucedido?  true
[PROBE] links do menu dentro do inerte:        6 de 6
```

No navegador isso é o painel inteiro fora do alcance de mouse, teclado e
tecnologia assistiva, até um F5. A pessoa digita o código, o código vale, o
painel aparece — e nada nele responde. É exatamente a conta que a lane veio
destravar, no exato momento em que ela é destravada.

Por que nenhum caso pegou: o jsdom não implementa o comportamento do `inert`, e
a lane leu essa limitação como "aqui não dá para medir". Dá — o **atributo** é
medível, e é a propriedade que o navegador consome. O caso que faltava não é o
efeito, é a presença do atributo depois do resgate.

### DEF-REV-2 · alto · o retorno de foco morria calado

React processa a remoção da subárvore **antes** da limpeza do efeito do pai, então
o retorno de foco do `useDialogBehavior` acontecia com o fundo ainda inerte.
Medido no fechamento pelo Esc, com `HTMLElement.prototype.focus` instrumentado:

```
[PROBE] chamadas de focus() durante o fechamento:
  [ { "alvo": "A:Clubs", "sobInerte": true, "conectado": true } ]
```

Nó inerte não é focável: `focus()` é no-op, o foco cai no `<body>` e quem navega
por teclado recomeça do topo da página (WCAG 2.4.3). O handoff da lane lista
"Esc / retorno de foco — do `useDialogBehavior`" na tabela do que foi medido; no
navegador não estava lá.

### O conserto (`d9394f51`), e a falsificação de cada peça

- `aberto` vira derivado (`ativo && aberto`) e o estado é reposto ao sair da
  vitrine — conserto na raiz do DEF-REV-1, e a reposição impede que o aviso
  ressuscite num outro login sem tenant (quebraria a RN-510);
- `useFundoInerte` devolve `liberar()`, com a posse num `ref` para só apagar o
  que ele mesmo escreveu (a cortesia com quem chegou antes fica de pé);
- o gate chama `liberar()` **antes** do desmonte, nas quatro saídas e no resgate
  que dá certo — onde o aviso passa a ser baixado por decisão.

| Falsificação | Resultado |
|---|---|
| sem `fecharAviso()` no sucesso e sem o `aberto` derivado | `expected <div inert>…</div> to be null` ✅ cai |
| `onFechar={aviso.fechar}` cru | `sobInerte: true` ✅ cai |

### Os seis vetores autodeclarados, julgados

1. **`inert` na lane e não no DS** — decisão certa e é a do corte. Mas ela cobra
   o preço que a lane não pagou: fora do DS, o ciclo de vida do `inert` não está
   amarrado ao do diálogo, e foi disso que nasceram os dois defeitos. Fica de pé
   a recomendação de subir para o `Modal`, agora com um motivo a mais.
2. **jsdom não implementa `inert`** — a lacuna é real e está bem declarada, mas
   foi usada larga demais. O atributo é medível e teria pego os dois defeitos.
3. **`containerDoApp` sobe até o filho de `<body>`** — correto hoje. Achado
   menor: qualquer superfície portalizada para o `body` (`Dialog`, `Drawer`,
   `DropdownMenu`, toast) fica **fora** do `inert` por construção. Não há
   nenhuma no shell da conta em vitrine — a sonda nominal dos oito confirma —,
   então é fronteira declarada, não defeito.
4. **Fechar por clique no véu é novo** — e o X também. Nenhum caso os tocava.
   Cobertos agora: os dois fecham e **rearmam**, como "Continuar olhando".
5. **A régua do contraste aceita que a superfície resolva o limite no wine** —
   leitura correta da 1.4.11, e a régua **não** fica vazia no wine: a pergunta
   (a) (borda sobre o cartão) reprova o token antigo lá também (`subtle` vs
   cartão = 1,262). Aprovada.
6. **`ATRIBUTO_ISENTO` saiu do nó do dialog** — confere, e não muda nada hoje
   pelo motivo que a lane deu (os ouvintes saem do documento enquanto o aviso
   está aberto). Fica como está.

### Rearme e teclado, re-falsificados

As três saídas novas rearmam e nenhuma dispensa para sempre — casos novos para o
X e para o véu. A regressão do teclado foi re-falsificada em dois itens de menu
× duas teclas (`Clubs`/`Eventos` × `Enter`/espaço): com o foco no conteúdo
removido, **os seis casos caem**. A propriedade é real e está viva.

### O gate do véu, mutado

Devolvi um `role="dialog"` escrito à mão por cima do `Modal`:
`veu-buildado` → `expected … not to match /role="dialog"/` ✅ cai. O elo novo
funciona.

### Contraste, recalculado do zero

Conta independente, dos temas resolvidos, batendo com o `dist`
(`index-3PlkfKJK.css`: `.border-\[var\(--border-strong\)\]{…}` presente, zero `/95`):

| | borda vs cartão | borda vs velado | cartão vs velado | subtle vs velado |
|---|---|---|---|---|
| brasa | **3,816** | **4,298** | 1,126 | 1,313 |
| wine | **3,741** | 1,578 | **5,905** | 4,679 |

Os números da lane batem casa decimal por casa decimal. ✅

---

## Alvo 2 · PONTE-RECUSA — nenhum defeito, duas afirmações a corrigir

Ordem das guardas conferida no código: aceite → sessão nomeada → `platform_admin`
→ **tenant (`jaExistia`)** → **`conta_inelegivel`** → transação. É o que a lane
declarou. Anti-enumeração intacta (a porta não tem entrada de e-mail; a recusa
fala da conta logada). Idempotência intacta (a transação não foi tocada).

### Provas re-rodadas

| Suíte | Resultado |
|---|---|
| `elegibilidadePortaVersusPortao` | ✅ 31 |
| `promocaoProfissionalFronteira` | ✅ 23 |
| `promocaoProfissionalWrapper` | ✅ 7 |
| `conviteOrganizadorCore` | ✅ 21 |
| `promocaoProfissionalPonte.integration` (emulator meu) | ✅ 9 |
| `resgateConvite.integration` (emulator meu) | ✅ 13 |

### Mutações

| Mutação | Resultado |
|---|---|
| concessão real injetada (`admin.auth().setCustomUserClaims` em ramo morto) | ✅ a guarda de fonte cai |
| motivo novo **só** na lista de validação do api-client | ✅ o tipo acompanha (`MotivoRecusaPromocao` aceita), com controle negativo provando que a checagem é real |
| … e o cartão da landing | ✅ **não compila**: `Property 'conta_congelada' is missing … in type 'Record<MotivoRecusaPromocao, string>'` |
| recusa movida para **depois** da transação | ✅ o caso do divulgador cai (escrita antes da recusa) |

A terceira linha é a mais forte do alvo: um motivo novo no servidor **não tem
como** chegar a uma pessoa sem frase. As duas listas não podem mais divergir.

### Ressalva 1 · a extração **não** é byte-idêntica (duas bordas, hoje inalcançáveis)

O commit `2271fd78` diz "Nenhum comportamento muda nesta passada". Muda em dois
crachás:

| crachá | portão antes | portão agora |
|---|---|---|
| `role: null` | inelegível | **elegível** |
| `role: 'athlete'`, `demotedFromRole: null` | inelegível | **elegível** |

Os dois porque o predicado novo trata `null` e `undefined` como "ausente" — o que
está **documentado de propósito** no módulo, e é a escolha certa para unificar as
duas origens de crachá. As duas mudanças afrouxam, e nenhuma é alcançável:
`mergeTenantClaims` apaga com `delete` (nunca grava `null`) e `role` é sempre
`Role`. Varri os escritores: ninguém grava `null` em nenhum dos dois campos.

O que fica: a frase do commit está errada, e o teste porta × portão **não pode**
pegar isso — ele compara as duas guardas contra a mesma função nova, então prova
`porta == portão`, não `portão_novo == portão_antigo`. Correção de texto, não de
código.

### Ressalva 2 · o caso da rebaixada prova menos do que o handoff diz

O handoff (e o commit `9f75c286`) justificam o caso assim: "se a inelegibilidade
fosse decidida depois da transação, ela receberia `jaExistia: true`". Movi a
guarda para depois da transação e **o caso continua verde** — com o doc antigo
existindo, a transação retorna cedo sem escrever e o `throw` vem logo em seguida,
então o resultado é o mesmo.

O que o caso prova de verdade: a recusa **vence** o `jaExistia` como resultado, e
o doc antigo não é tocado. Quem prova "nenhuma escrita antes da recusa" é o caso
do **divulgador**, e esse pegou a mutação. Os dois casos valem; a justificativa
escrita é que está mais forte do que a medição.

### O que continua sem exercitar

Como a lane declarou: sem navegador, sem emulator de functions (a callable não foi
chamada por HTTP real), sem produção. Subi Firestore + Auth por conta própria e
derrubei ao terminar; as portas do preview do dono não foram tocadas.

---

## Alvo 3 · PARSE — a varredura se sustenta

### O quinto caso, mutado

`CapacidadeModal:152` está consertado: `errorMessage` passa sempre que
`erroCapacidade` existe, e o guard `capacidadeParseavel &&` saiu. Devolvi o guard:
o caso cai com "Unable to find an element with the text: A quantidade é um número
inteiro…" ✅. A inversão não volta calada.

### Baseline de colagem, atacado com o que a lane não listou

Todos passam — o parser é mais tolerante do que a lane precisou provar:

| Colado | Vira |
|---|---|
| `1 234,56` (espaço e NBSP) | ✅ 1234,56 |
| `R$ 1.234,56` · `R$1.234,56` | ✅ 1234,56 |
| `-50` · `-1.234,56` | ✅ negativo lido; a faixa de domínio recusa depois |
| ` 1.234,56` · `1.234,56 ` · com `\n` | ✅ 1234,56 |
| `1,234.56` | recusa `agrupamento`, com a frase que ensina |
| `10%` | recusa `formato`, com a frase que ensina |

Nada quebrou e nada é apagado em silêncio. O aceite "colar de planilha continua
funcionando" está cumprido, inclusive para a célula formatada como moeda.

### Amostragem adversarial — quatro dos dezoito, os menos destacados

Peguei os dois que a lane marcou "nada (já tinha)" e dois do meio da lista:
**M2 `kit-preco`**, **M4 `repasse-comissao-valor`**, **N4 `config-capacidade`**,
**N6 `transicao-sku-qtd`**. Nos quatro o caminho existe e o teste afirma a
**string exata do parser** na tela (não "algum erro"), com o `onSalvar`/`onTransicao`
provado não chamado. A tabela do handoff é honesta na amostra.

### O inventário está completo — e agora tem gate

Cruzei os arquivos que leem por `parseValorPtBr`/`parseContagemPtBr` contra os
`type="number"` que sobraram no painel: **zero interseção** (as duas ocorrências
que o grep acha estão dentro de comentários que explicam o defeito). Os 22
`type="number"` restantes não passam pelos dois parsers.

A Directive do commit ("`type='number'` num campo desses é defeito, não estilo")
não tinha gate — Directive sem gate é decoração. Entrou
`src/lib/__tests__/campoDoParser.test.ts`, com falsificação: devolvi o
`EstoqueView` a `type="number"` e o gate nomeia o arquivo ✅.

### O slot `hint` do DS

- **AA por token, os dois temas** (`--text-tertiary`, `--font-size-sm` = 12px, então
  o piso é 4,5:1): brasa 6,87 / 6,35 / 6,95 e wine 5,29 / 5,50 / 4,89 sobre base,
  raised e sunken. **Passa em todas.** ✅
- **`aria-describedby` compõe**: `"preco-hint preco-error"` — o leitor recebe os
  dois, e o `describedby` do consumidor é preservado (`"externo preco-hint"`).
  Confere no código e há caso para cada um.
- **A régua não se move**: a dica é irmã anterior do erro no DOM, medido com
  `compareDocumentPosition`. Confere.
- A classe do `hint` é **byte a byte** a do `description` do `Field`
  (`text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]`) — a afirmação
  "mesmo token, mesmo tamanho" é literal, não aproximada. ✅
- **Cinco campos** carregam a régua, nem quatro nem sete. Confere com o aceite.

### Ressalva · o campo de dinheiro sem teto que ficou sem régua

`afiliado-comissao-valor`, no modo "Valor fixo por inscrição (R$)", **não tem
teto nenhum** (`montarComissao` só lê o parser; não há guarda de faixa). Quem
escreve `1.500` querendo R$ 1,50 grava R$ 1.500,00 por inscrição, calado. É o
mesmo erro de mil vezes que a régua existe para prevenir, no único campo de
dinheiro alcançável que não a tem e não tem quem o pare. Ver a recomendação 1.

---

## As três perguntas devolvidas ao maestro — minha recomendação

1. **A régua sob cinco ou sob sete?** → **Sete, e o caso urgente é um só:**
   `afiliado-comissao-valor` não tem teto, então o erro de mil vezes passa
   inteiro; `repasse-valor` é limitado pelo disponível do evento e do tenant, e
   um `1.500` indevido lá bate numa recusa nomeada. Se for para acrescentar um,
   que seja a comissão do afiliado.
2. **A frase da capacidade de kit em branco** (`Em branco vale 0 (nenhum kit
   disponível).`) → **Aprovar como está.** Diz o mecanismo e a consequência com
   as palavras do próprio item, e desfaz exatamente a ambiguidade que o
   diagnóstico apontou ("0" = sem kit ou não configurei). É uma string; trocar
   depois custa uma linha.
3. **A variante de unidade no modo "%"** → **Fica como está nesta rodada.** Nos
   dois campos o percentual é limitado a 100 por regra de domínio (`cupomForm`
   recusa `> 100`; `assessoriaForm` exige `0 < valor ≤ 100`), então o erro de mil
   vezes que a régua existe para prevenir **não pode acontecer** ali. Sobra um
   texto deslocado, e texto deslocado é veto de dono, não conserto de lane.

---

## Gates rodados nesta review

| Gate | Resultado |
|---|---|
| `apps/painel` · `tsc --noEmit` | ✅ |
| `apps/painel` · `eslint src --max-warnings 0` | ✅ |
| `apps/painel` · suíte do onboarding | ✅ 8 arquivos, **95 casos** (eram 87) |
| `apps/painel` · suíte INTEIRA | ✅ **213 arquivos · 2274 casos · 0 falhas** (1007 s) — eram 2266 |
| `apps/painel` · o gate novo, à parte | ✅ 2 casos, e a falsificação nomeia o arquivo infrator |
| `functions` · seis suítes, arquivo a arquivo | ✅ 31 + 23 + 7 + 21 + 9 + 13 |
| `packages/api-client` · `tsc --noEmit` | ✅ |
| `apps/landing` · `tsc --noEmit` | ✅ |

Sem `--singleFork`. Painel sempre com `--maxWorkers=3 --minWorkers=1`. Functions
arquivo a arquivo. Emulator meu (Firestore 8080 + Auth 9099), derrubado ao fim.

## Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| OVERLAY (`7b55d1b3`) | 09/08 | **09/08 — esta review, reprovado e consertado** | **NÃO** |
| Conserto do OVERLAY (`d9394f51`) | **09/08 — esta review** | n/a (é a review) | **NÃO** |
| PONTE-RECUSA (3 commits) | 09/08 | **09/08 — esta review, aprovado com ressalvas** | **NÃO** |
| PARSE (2 commits) | 09/08 | **09/08 — esta review, aprovado com ressalvas** | **NÃO** |
| Gate da Directive do PARSE | **09/08 — esta review** | n/a (é gate) | **NÃO** |

## Tempo — o número, porque passou de uma hora

Início **12:19**, medido por `date`, três alvos numa lane só. **A review passou de
uma hora e o número fica registrado, como a regra manda.**

O que consumiu relógio, em ordem: a **suíte inteira do painel, 1007 s** (a lane do
PARSE mediu 826 s; a diferença é contenção, não regressão — rodou em segundo plano
enquanto os outros dois alvos eram atacados, com outra lane commitando na mesma
árvore); as **duas sondas** que provaram os defeitos do alvo 1 e as duas
falsificações delas, uma de cada vez; as **seis suítes de functions** arquivo a
arquivo mais a subida e a derrubada do emulator; e as **seis mutações** dos três
alvos, cada uma com restauração e re-verde.

Não houve outlier a matar: nenhuma peça isolada passou de 17 minutos.

## Árvore compartilhada

Outra lane commitou durante esta review (`be15f18f`, `4894cc22`, `71371b30`) e
mexeu em `leela-specs/03-canon/indice-de-regras-de-negocio.md`, que **não** é meu
território e ficou intocado. Todos os commits daqui saíram por `git commit --only`
com caminhos nominais. Sem `--amend`, sem `stash`.

## Commits desta review

| Commit | O que é |
|---|---|
| `d9394f51` | os dois defeitos do alvo 1, pagos e falsificados |
| `70446d1a` | o gate da Directive do alvo 3 |
| este | handoff, board (T1, T5, T14) e o delta do épico E16 |

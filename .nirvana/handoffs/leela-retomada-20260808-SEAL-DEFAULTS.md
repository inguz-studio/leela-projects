---
trace: leela-retomada-20260808
lane: SEAL-DEFAULTS
employee: sf-cto
business: software-forge
repo: C:\dev\LEELA
branch: main
base: 1e5ee639
inicio: 2026-08-08 20:58
estado: concluida
head: 56e68a0d
---

# Handoff vivo · SEAL-DEFAULTS

Lane de documentos. **Zero processo executado** — sem teste, sem build, sem emulator, sem
install, sem servidor. Só leitura de git (`git status`, `git diff`, `git log`) e edição de
arquivo. A PONTE-RET está viva na mesma árvore com o emulator.

Território: `leela-specs/01-produto/DECISOES-ABERTAS.md`,
`leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md`,
`leela-specs/02-rodadas/2026-08-06-triagem-painel/**`, `leela-specs/00-boards/V1-KANBAN.md`,
`.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md` e este arquivo.

---

## T1 · O que estava na árvore, e se o fechamento está inteiro

### O que estava lá

| Caminho | Estado no início | Origem |
|---|---|---|
| `leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md` | **modificado, sem commit** (17+/36−) | lane SEAL-DEFAULTS de 06/08, que parou na seção de fechamento |
| `leela-specs/02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md` | **untracked** (269 linhas, íntegro) | mesma lane |
| `leela-specs/01-produto/DECISOES-ABERTAS.md` | limpo, sem modificação | a nota da conversão já subiu em `5f36eecd` |
| `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md` | **staged, sem commit desde 06/08** | lane REV-5B de 04/08 |

Comando: `git status --short` · `git diff --stat leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md`
→ `1 file changed, 17 insertions(+), 36 deletions(-)`.

### Veredicto: o fechamento **não** estava inteiro. Quatro buracos.

**1. O painel canônico aponta para um arquivo que não existe no repositório.**
A nota de 06/08 do painel (linha 19) subiu em `5f36eecd` dizendo *"O registro completo […] está em
`02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md`"*. Esse arquivo **nunca foi commitado**
— `git log -- 'leela-specs/02-rodadas/2026-08-06-triagem-painel/'` devolve vazio. Desde 06/08 o
painel afirma que as condições de reabertura estão escritas e o leitor não alcança nenhuma delas.
É o pior dos quatro, porque é exatamente a promessa que a régua faz.

**2. A consolidação do Sentry, prometida no registro da rodada, nunca chegou ao painel.**
O registro diz, sobre o item 11: *"as duas metades da falta passam a viver num lugar só"*. A
pendência de observabilidade do painel (§"Entrou em 06/08 · o gancho de incidente existe e do
outro lado não há ninguém") continua registrando só *zero políticas de alerta, zero métricas de
log e zero canais de notificação*. A metade que veio do item 11 — **não existe DSN em ambiente
nenhum e o Sentry roda em produção como no-op silencioso** — não está lá. Uma metade órfã não é
um lugar só.

**3. O board `V1-KANBAN` não foi tocado.** Nenhum dos convertidos virou card com condição de
reabertura ao lado, que é a segunda metade literal da régua:
- o card do estrangeiro (`[E04/E12/E19] Estrangeiro sem CPF compra com passaporte`) ainda diz
  *"🧊 GATED · ⏸️ adiado por decisão do Vitor (DEC-0726)"* e *"Espera a liberação da conta Asaas
  […] antes de virar código"* — que é precisamente o estado que a conversão aboliu;
- **HIP-R9-01 não tem card nenhum.** O registro da rodada mandou criar um, gelado, ao lado do
  desconto retroativo. O do desconto retroativo existe (linha 165); o da pré-compra não.

**4. A contagem não fecha com o painel real.**

- 60 → 56 fecha **internamente** e está certo: a triagem soma 14 + 24 + 17 + 1 = 56, conferido
  item a item, e a tabela do registro da rodada bate (16→14 · 25→24 · 18→17 · 1→1).
- O painel **real de hoje tem 60 itens**, não 59 como a narrativa do cabeçalho conclui. A conta
  do cabeçalho é 60 → 56 (conversão) → 58 (PERFIL-1, ACEITE-1) → 59 (PCLIENTE-1). Falta uma linha:
  o **COMPROMETIDO-1** entrou em `86da138d` na seção "Decisões que dependem de você" **sem linha de
  contagem**. Contado à mão: 53 em "Decisões que dependem de você" + 7 em "Ações que só você pode
  executar" = **60**.
- A vista de triagem está **quatro itens atrasada** em relação ao painel: não lista PCLIENTE-1,
  PERFIL-1, ACEITE-1 nem COMPROMETIDO-1, todos entrados depois de `a1cfb9e3`. A própria vista diz
  *"Se esta página divergir do painel, o painel manda, e a divergência é defeito meu"* — então a
  divergência é declarável, mas não pode ficar muda.

**Borderline nomeado, e deliberadamente fora da contagem:** o **ADMIN-USUARIOS-1** (`fb3db9e0`)
pede decisão do dono (*"decidir se o diretório de usuários entra na fila de construção e com que
alcance"*) mas mora na seção "Fila de construção", e entrou sem linha de contagem. Não o movi:
a pergunta dele é literalmente de escopo de fila, que é o assunto daquela seção, e mover item de
seção muda o que o dono vê sem que ninguém tenha pedido. Fica nomeado aqui e no `_SUMMARY`.

### Os três convertidos aparecem no painel canônico com o mesmo texto?

Sim quanto à substância, **não** quanto à condição de reabertura. A nota da linha 19 descreve
corretamente os três defaults (paliativo do estrangeiro permanente + `ESTRANGEIRO-CHECKOUT`
fechado por decisão; item 11 nunca foi do dono e a conferência foi feita; RN-315 vira regra sem
prazo) e afirma *"Cada um saiu com a condição de reabertura escrita"* — mas não escreve nenhuma
condição, delegando ao arquivo do buraco nº 1. Enquanto aquele arquivo não estiver commitado, a
afirmação do painel é falsa na prática.

**Perguntas que eu não pude responder por não poder executar nada:** nenhuma. T1 fechou inteiro
com leitura de git e de arquivo.

---

## T2 · Condição de reabertura, item por item · e a trava de dinheiro/dado pessoal

Conferido um a um contra a terceira condição do critério (*"a resposta não muda valor cobrado nem
toca dado pessoal"*).

| Convertido | Condição de reabertura escrita? | Observável por alguém? | Mexe em dinheiro cobrado / dado pessoal? |
|---|---|---|---|
| 12b + QUALIF-6 · pagador estrangeiro | Sim, três gatilhos nomeados | **Um dos três, não** — ver abaixo | Não (ver análise) |
| 11 · os três segredos | Sim: rotação de segredo, ou projeto novo | Sim — é ato da própria esteira | Não |
| HIP-R9-01 · pré-compra do clube | Sim: um organizador real na mesa | Sim — contato humano | Não (ver análise) |

### Nenhuma conversão foi revertida. O porquê, item por item.

**12b + QUALIF-6.** A resposta é *manter o paliativo*, que é o comportamento que já roda: comprador
brasileiro paga pelo estrangeiro. Nenhum valor cobrado muda — o paliativo custa zero e a RN-173
fica intocada. O passaporte é dado pessoal, mas **a regra do passaporte não é o que está sendo
decidido**: RN-175, RN-176 e RN-177 são regra desde 19/07, independentes, e a conversão não
acrescenta, não amplia e não muda o tratamento de nenhum documento. O que a conversão decide é se
alguém liga para o gerente de contas do Asaas. Passa.

**11 · os três segredos.** Não houve default a tornar permanente: o próprio item já dizia *"O que
fica com você: nada de imediato. A execução é da esteira, não sua."* É correção de endereço. Os
segredos protegem dado pessoal (`BANK_DATA_KEY`, `CRM_ID_PEPPER`), mas conferir que eles existem
não muda o que é coletado nem o que é cobrado. Passa. E o registro guarda a única fronteira que
volta ao dono: **trocar a `CRM_ID_PEPPER` depois de haver dado real**, que obriga migrar todas as
chaves do CRM e do registry de pessoas — está escrito e está certo.

**HIP-R9-01 · é o caso que exige argumento, e eu escrevo o argumento em vez de esconder.** O
*assunto* do item é dinheiro sem disfarce: desconto de 20%, cobrança em lote, janela de reserva no
cartão. A leitura estreita — "item que mexe em dinheiro cobrado não pode ser convertido" —
reverteria a conversão. Não reverti, por três razões que declaro para serem contestáveis:

1. O critério que o dono aprovou fala da **resposta**, não do assunto: *"a resposta não muda valor
   cobrado"*. A resposta aqui é a RN-315, que **já está em vigor em produção**. Converter congela o
   status quo; zero centavo muda de lugar hoje.
2. A conversão não autoriza comportamento de dinheiro nenhum — ela **recusa** um. Nada é
   construído: sem organizador real, a regra de dinheiro seria escrita no escuro.
3. O portão de dinheiro continua de pé dentro da própria condição de reabertura: *"quando entrar,
   entra como dinheiro: rota opus com review antagonista obrigatória"*, e o desconto retroativo
   segue PARKED por decisão própria.

E o fato que decide: **o dono aprovou os três pelo nome, verbatim** (*"aprovado, pode virar default
permanente esses três, e corrija"*). Reverter uma resposta que ele já deu é devolver a cobrança que
o item existe para tirar dele. Se o maestro discordar da leitura, a reversão é uma frase e eu
executo — mas ela precisa ser decisão dele, não silêncio meu.

**Para a régua não depender de leitura de novo**, escrevi a distinção onde ela mora (registro da
rodada e vista de triagem): item cujo *assunto* é dinheiro só pode ser convertido quando a resposta
é o status quo **e** o portão de dinheiro sobrevive na condição de reabertura. Isso é precisão da
régua existente, não régua nova — não reabre nada que estava decidido.

### O defeito real que a conferência achou

**Uma das três formas de reabrir o estrangeiro não é observável por ninguém.** O gatilho *"alguém
tenta comprar com cartão emitido no exterior e a compra é recusada no gateway"* pressupõe que
alguém veja a recusa. A medição de 06/08, citada no próprio registro desta rodada, diz que o
projeto tem **zero políticas de alerta, zero métricas de log e zero canais de notificação**, e que
o Sentry está em produção como no-op sem DSN. Uma recusa de gateway hoje não acorda ninguém.

Condição que ninguém consegue observar é default permanente sem volta — o item perdido que a régua
existe para impedir. Corrigido pelo lado honesto: o gatilho fica escrito como **dependente da
observabilidade**, amarrado à pendência do CTO humano, em vez de ser apresentado como vigilância
que a esteira faz e não faz. Os outros dois gatilhos (pedido de organizador, decisão do dono) são
contato humano e continuam de pé sozinhos.

---

## T3 · O handoff staged e alheio

`.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md`, no índice desde 06/08. 201 linhas.
`git diff` contra a árvore = vazio, então índice e arquivo eram idênticos: ninguém mexeu nele
depois de dar `add`.

**Entra como está, sem uma letra alterada.** Lido inteiro. É um laudo completo e fechado — veredito
(*REPROVADO na forma entregue · APROVADO depois dos dois fix-commits*), sete defeitos com
severidade e teste que pega cada um, a resposta sobre segurança do `--apply` contra produção, e a
lista "Para o selo do maestro".

**Por que ficou dois dias no índice, e por que ele não é sobra:** a lane que o escreveu aterrissou
os dois fix-commits do código (`eea10348`, `813a38c1`) e não aterrissou o próprio laudo. Nenhuma
das nove lanes de 06/08 o reivindicou. E ele é **lastro de um registro já publicado**: o
`01-decisoes-dono.md` desta rodada afirma que o backfill rodou contra produção *"com as três
condições que a review antagonista REV-5B impôs cumpridas"*. Sem o arquivo no repositório, aquela
frase não tinha onde se apoiar.

O defeito 1 é a razão de o laudo importar: com `FIRESTORE_EMULATOR_HOST` no ambiente,
`--apply --project leela-hub` escrevia no **emulator**, imprimia `Aplicado: N pedido(s)` e saía 0.
O dono teria marcado o card com as dezessete compras ainda sem código.

**Commitado sozinho** em `1b4bf50d`, separado dos arquivos de spec, como o T3 pede.

**Fica aberto e não é desta lane:** os cinco pontos de "Para o selo do maestro" no fim do arquivo.
O nº 2 — correção de volume (17, não 12) em `06-spec-codigo-pedido.md` — segue pendente e está
fora do meu território.

---

## T4 · Aterrissagem

### Commits, na ordem

| Commit | Arquivos | O que é |
|---|---|---|
| `1b4bf50d` | 1 (`REV-5B.md`) | o handoff alheio sai do índice e vira registro |
| `db73b7ff` | 3 (painel, vista, registro da rodada) | a triagem fecha: os quatro buracos do T1 |
| `56e68a0d` | 1 (`V1-KANBAN.md`) | os convertidos viram card com a condição ao lado |

Todos com `git commit --only`. **Zero `--amend`, zero `stash`.** Push em `1e5ee639..56e68a0d`.

### Conferência de território depois de cada commit

`git status --short | grep -v '^??'` depois dos três commits devolve sempre os mesmos três
arquivos da PONTE-RET, modificados e **intocados**:

```
 M apps/landing/app/(public)/minha-conta/PortasDaConta.tsx
 M apps/landing/test/minha-conta-ponte-s1234.test.tsx
 M apps/landing/test/minha-conta-portas-s1222.test.tsx
```

`git diff --cached --name-only` vazio ao fim: **índice limpo**, sem sobra minha nem sobra alheia.

**21:12 · a PONTE-RET entrou no painel depois de mim, e entrou certo.** Na conferência final,
`DECISOES-ABERTAS.md` voltou a aparecer como modificado. Não é sobra minha: é a PONTE-RET
acrescentando o **PONTE-CTA-1** — os três rótulos da porta, com o achado de que a criação de clube
já existe construída e o que falta é telemetria na landing. Conferido antes de largar:

- o diff dela é **14 inserções, zero remoções** — nenhuma das minhas quatro correções foi desfeita
  (`grep` confirma "O número de hoje é 60", a consolidação do Sentry e as três condições no lugar);
- a aritmética dela **parte da minha**: ela leu o 60 recém-corrigido, somou um item e escreveu 61.
  Recontado à mão agora: 54 decisões + 7 ações = **61**. Fecha.

**Não commitei o trecho dela** — é território e trabalho da lane dela, e ela aterrissa. O painel
**saiu desta lane em 60**; quem o levou a 61 foi a PONTE-RET, pelo caminho certo. Registrado aqui e
no `_SUMMARY` para o maestro não ler dois números e achar que um deles é erro.

### O que foi escrito no board

Três cards em `V1-KANBAN.md`, padrão épico → história, sem tarefa despachada (os dois gelados são
decisão de **não** construir; abrir tarefa contradiria a própria conversão):

- **[E04/E12/E19] Estrangeiro sem CPF compra com passaporte** — de `🧊 GATED · ⏸️ adiado (DEC-0726)
  · Espera a liberação da conta Asaas` para **`🧊 FECHADO POR DECISÃO`**, com os três gatilhos e o
  aviso de que o (b) não é observável. Histórias S309 · S1211 · S1903, sem despacho.
- **[E08] Pré-compra do clube-influenciador (HIP-R9-01)** — card **novo**, gelado, ao lado do
  desconto retroativo como o registro mandava. Condição: um organizador real na mesa. Portão de
  dinheiro preservado no texto do card.
- **[E00/E12] DIAG-SENHA** (card de Feito) — a cláusula "fica com o CTO humano" ganha a segunda
  metade da falta: **não existe Sentry ligado**, sem DSN em ambiente nenhum nem nos dois bundles.

Correção de coerência no card vizinho: `rota Fable` → `rota opus` no desconto retroativo, pela
regra permanente de teto de modelo. Os dois cards de dinheiro do E08 passam a dizer a mesma coisa
sobre o mesmo portão.

### Critério de pronto, conferido

| Critério | Estado |
|---|---|
| Triagem fechada e commitada | ✅ `db73b7ff` |
| Cada default com condição de reabertura | ✅ três, no registro **e** no painel **e** no board |
| Nenhum item de dinheiro ou dado pessoal convertido | ✅ conferido um a um; nenhuma reversão, argumento escrito para o HIP-R9-01 |
| Handoff REV-5B resolvido e fora do índice | ✅ `1b4bf50d`, sozinho |
| Painel canônico e board batendo | ✅ painel em **60**, board com os três cards |
| Zero processo executado | ✅ só `git status`/`diff`/`log`, `date`, `mkdir`, leitura e edição |
| Nenhuma escrita fora do território | ✅ conferido em `git show --stat` dos três commits |

---

## Premissas desta lane, todas declaradas

1. **Não reverti nenhuma das três conversões.** Argumento por item acima. O caso discutível é o
   HIP-R9-01 e ele está escrito para ser contestado pelo maestro.
2. **Não movi o ADMIN-USUARIOS-1** de seção, apesar de ele pedir decisão do dono de dentro da
   "Fila de construção". Nomeado, não mexido.
3. **Não reescrevi a vista de triagem para os 60 de hoje.** Ela é a vista da leva de 06/08 e o
   próprio cabeçalho dela diz que é redesenhada a cada leva; reescrevê-la agora seria inventar uma
   leva que o dono não pediu. Declarei a defasagem dentro dela, com os quatro nomes.
4. **A contagem que passa a valer é 60**, contados os itens das duas seções canônicas do painel.

5. **`rota Fable` → `rota opus`** no card do desconto retroativo do clube. Não estava no escopo,
   mas eu estava criando o card irmão com "rota opus" pela regra permanente de teto de modelo, e
   deixar os dois vizinhos discordando sobre o mesmo portão de dinheiro seria defeito meu.

## O que fica para o maestro decidir

1. **A não-reversão do HIP-R9-01.** Está argumentada no T2 e no `_SUMMARY`. Se a leitura correta
   for a estreita ("assunto de dinheiro não converte, ponto"), a reversão é uma frase e eu executo
   — mas ela contraria o verbatim do dono, que aprovou os três pelo nome.
2. **O ADMIN-USUARIOS-1**, decisão do dono morando na "Fila de construção" e fora da contagem.
   Nomeado no painel, não movido.
3. **Os cinco pontos de "Para o selo do maestro"** no fim do REV-5B, herdados de 04/08 e fora do
   meu território — em especial o nº 2, a correção de volume (17, não 12) em
   `06-spec-codigo-pedido.md`.

## Registro de tempo

- Início: 2026-08-08 20:58
- Fim: 2026-08-08 21:10 — **12 minutos**, muito abaixo do limite de 1 hora. Nada a reportar por
  lentidão.
- Estado final: **lane concluída**, três commits empurrados, árvore sem sobra minha.

# Review antagonista da aplicação de copy — lane COPY-REV-2

Rodada `2026-08-12-copy-landing` · lane `COPY-REV-2` · trace `leela-copy-landing-20260812`.
Revisora em contexto fresco: não viu a conversa que produziu o trabalho, por regra da casa.

**Delta revisado:** `9a8af79c..f529c53b` na `main`. O código inteiro está em `9a8af79c..eb24170c`:
**11 arquivos**, todos em `apps/landing/`.

**Esta lane não conserta nada.** O que precisa de conserto sai daqui numerado e vai para lane de fix.

> **Sobre a tentativa anterior.** Uma primeira COPY-REV morreu por quota e deixou notas soltas
> (`05-review-antagonista.md` sem commit e `.nirvana/handoffs/leela-copy-REV-20260812.md`). Review
> parcial é nota, nunca veredito: esta lane rodou **do zero**, refez toda medição na própria máquina
> e não herdou uma linha de veredito. Onde a medição de hoje contradiz aquelas notas, o número desta
> lane é o que vale, e a divergência está nomeada na adjudicação da suíte.

---

## Veredito

# LIBERADA COM RESSALVAS

Os 13 defeitos objetivos estão mortos no fonte **e no artefato buildado**, que é onde a prova valia:
o App Router esconde string em flight data, e a sonda correu no bundle, não no fonte. A home cumpre
a Leva 13 e não viola o D-0802-1 na leitura exata: corrida aparece só dentro de enumeração, como
instância. RN-559, RN-569 e SERV-3 estão intactos, e nenhum dos quatro vetáveis do dono foi decidido
por tabela. `type-check`, `lint` e `next build` fecham verdes.

**Zero bloqueadores.** As doze ressalvas abaixo são de registro, de evidência e de vocabulário.
Nenhuma impede o deploy. Três delas (1, 2 e 3) corrigem afirmações do handoff da aplicação que estão
erradas e que a próxima lane herdaria como verdade.

A suíte da landing está vermelha, e **a causa não é esta rodada de copy** — está adjudicada abaixo,
com números próprios e um card URGENTE.

---

## O que foi provado, e como

### A sonda de bundle, que a lane de aplicação deixou pendente

A COPY-APPLY não gerou build e declarou a sonda como pendência da lane de deploy. Ela rodou aqui.

`pnpm --filter @leela/landing build` passou o gate de frescor sem reconstrução e fechou **exit 0**.
A sonda varreu **121 arquivos** de `.next/server` e `.next/static`.

Um detalhe de método que vale para a lane de deploy: **o bundler escapa acento como `\xNN`**
(`experi\xeancias`, `pr\xf3xima`). Busca literal por texto humano devolve zero e parece prova de
ausência quando é só encoding. A sonda normaliza os escapes antes de comparar.

| Sonda | Resultado |
|---|---|
| 30 strings **novas**, busca literal | 24 presentes · 6 ausentes, **todas as 6 explicadas** (ver abaixo) |
| os 13 **fragmentos** das 6 restantes | **13/13 presentes** |
| 37 strings **antigas** | **35 em zero ocorrências** · 2 sobreviventes com veredito escrito |

**As 6 ausências são o método do conserto, não um buraco.** O M2 trocou sete literais por uma
constante única, e o texto passa por template (`Ir para o ${NOME_DO_LUGAR}`): a frase concatenada
**nunca existe** no bundle. A prova certa é buscar as pontas mais a constante, e as treze aparecem
(`Painel Profissional`, `Ir para o `, `Pronto. O `, ` já é seu`, `Entre com o e-mail da sua conta
para conhecer o `, `Não conseguimos abrir o `, ` agora. Tente de novo em instantes.`, e as demais).
⚠️ Quem repetir a sonda no deploy sem saber disso vai ler seis falsos negativos.

O H1 novo está no compilado, conferido por leitura direta:

```
className:"...text-4xl font-extrabold...sm:text-6xl",children:
"Físico, mental, espiritual. Ache sua próxima experiência e garanta a vaga em minutos."
```

em `.next/server/app/(public)/page.js`. As quebras de linha do JSX colapsaram em espaço único, sem
espaço duplo.

**Os dois sobreviventes, os dois esperados:**

| String | Onde | Por que fica |
|---|---|---|
| `Compartilhe este evento` | `page.js` do evento | é o **default da prop** do `ShareBlock`; a página do evento segue com este título de propósito, e o perfil passa o par dele |
| `Corrida de rua` | `chunks/945.js` | valor de retorno final de `esporteDoEvento` (`lib/esporte.ts`), lido no compilado: é o rótulo da **prática** do evento, instância e nunca a categoria |

### Os 13 defeitos, um a um

Conferidos no diff e na sonda. Todos pagos. Os que exigiam mais do que trocar string:

- **B3** foi pago pela saída que **não decide o V5**. A afirmação nova foi reconferida na origem:
  `CreateChargeParams` não carrega campo de cartão e os campos vivem no estado da tela. A frase é
  verdadeira.
- **M2** está inteiro: busca por `painel profissional` minúsculo volta **vazia** em todo
  `apps/landing/app/`. As ocorrências saem de uma constante única.
- **L2** divergiu da proposta da review, e a divergência **se sustenta**: `CardClube` renderiza mesmo
  `clube.categoria` e `clube.modalidade`, então a frase aplicada descreve o que o card mostra em vez
  de supor o que um club faz.
- **G6** divergiu para `Ver experiência →`, e a razão é boa: com a dobra chamando-se "Experiências
  abertas", "Ver evento" deixaria vitrine e hero em vocabulários diferentes na mesma tela.
- **G1** ficou aditivo: props opcionais com o texto do evento como padrão, então nenhum consumidor
  muda de comportamento sem passar prop. Confirmado no bundle, que carrega os dois pares.

### Leva 13, régua de tom e D-0802-1

O D-0802-1 §3 diz, na íntegra: *"'experiência' é o termo guarda-chuva; corrida/prova/atleta são
instâncias, nunca a categoria."* Julgado por essa régua exata, e só por ela:

- Eyebrow `Experiências de bem-estar` declara a categoria.
- O H1 abre pelos três pilares, que a **RN-114** cravou em `packages/core/src/clubs/catalogo-acoes.ts`
  (`Pilar = 'fisico' | 'mental' | 'espiritual'`, 16 ações em 3 pilares), e não por sinônimo.
- `Corrida` aparece **só dentro de enumeração**: `Corrida, pedal, retiro, treino de clube` na subline
  e no preview social, `corridas, pedais, retiros e treinos de clube` na descrição do root. Instância,
  permitido.
- Varredura de `corrid` em todo `apps/landing/app`: as ocorrências restantes são comentário, `dias
  corridos` do texto legal, caminho de asset (`leela-cover-corrida-rua.jpg`), item de kit mock e
  regex de ícone. **Nenhuma string visível põe corrida no lugar da categoria.**
- §2 reservava a home ao dono, e a **Leva 13** fechou a direção. A lane tinha autoridade.
- §1 pede `participante` no texto legal, e o checkout já fala participante.

A régua de tom de 5 linhas se sustenta contra as strings entregues: frases curtas, instâncias
concretas na subline, convite em vez de pressão (`Bora garantir sua vaga?`, `Sem criar conta para
começar.`), e o travessão do M5 fora das duas superfícies.

### RN-559, RN-569 e SERV-3

- **RN-559 intacta por construção, e a construção foi medida.** `git diff --stat 9a8af79c eb24170c --
  packages/ functions/ firestore.rules` volta **vazio**: o delta toca só `apps/landing/`. A face
  mínima segue em `packages/core/src/eventos/faceMinimaVenda.ts`
  (`FACE_MINIMA_VENDA_PAGA_CENTAVOS = 1000`) e a frase de R$ 10,00 segue em
  `apps/painel/src/routes/eventos/lotes/_lib/loteForm.ts`, nenhum dos dois tocado.
- **RN-569 limpa.** Varredura das linhas **adicionadas** pelo delta por enviar, envio, entrega,
  frete, correio, remessa, despacho e "receber em casa": zero promessa de envio em copy visível. Os
  três casamentos são comentário de código. A subline nova ainda diz `retirada` na letra, que é a
  palavra que a RN-569 defende. *(Uma observação com veredito: `a gente cuida da inscrição, do kit e
  da retirada` afirma cuidado sobre o kit. A plataforma vende o kit e publica as janelas de retirada,
  então a frase tem lastro; ela fica.)*
- **SERV-3 intocado.** A S1251 continua aberta, e ela é o deploy.

### Os vetáveis do dono

Nenhuma decisão dele foi tomada por tabela. Conferido no código, um a um.

| Vetável | Estado conferido |
|---|---|
| V2 · organizador × profissional × produtora | intacto: `Criar conta de organizador` e `Entrar como organizador` seguem em `PublicHeader.tsx:93` e `PublicFooter.tsx:76,82` |
| V3 · `0 membros ativos` | intacto: `PerfilView.tsx:222-224` segue publicando o zero |
| V4 · `Club` em inglês | intacto: `Criar Club`, aba `Clubs`, `club` minúsculo no corpo |
| V5 · nomear o Asaas | intacto: `Asaas` aparece só em comentário, em nenhuma string visível |

### Gates determinísticos

| Gate | Resultado |
|---|---|
| `pnpm --filter @leela/landing type-check` | ✅ verde, **exit 0** |
| `pnpm --filter @leela/landing lint --max-warnings 0` | ✅ verde, **exit 0** |
| `pnpm --filter @leela/landing build` | ✅ compila e gera as 15 rotas, **exit 0** |
| `pnpm --filter @leela/landing test:gate` | ⛔ **vermelha, e vermelha por conta própria** — adjudicado abaixo |
| Gate visual em navegador | **não se aplica**: nada subiu. É obrigatório na lane que fizer o deploy |

---

## Adjudicação da suíte vermelha

A COPY-APPLY mediu 43 reprovados em HEAD sem uma linha dela e atribuiu a causa ao **ambiente do
worktree**, pedindo que a REV rodasse num ambiente confiável. Rodou, na `main` limpa, na árvore
canônica `C:\dev\LEELA`.

**Veredito: a `main` está vermelha por conta própria, e a copy está inocente. A explicação do
worktree não se sustenta, porque a árvore canônica reproduz.**

### Os números desta lane

| Medição | Onde | Resultado |
|---|---|---|
| `pnpm --filter @leela/landing test:gate` (suíte inteira) | `main` limpa, HEAD `5cf5b29d` | **147 reprovados · 702 verdes (849)**, **22 arquivos de 65**, 1478s, exit 1 |
| `definir-senha-s1223.test.tsx` **sozinho** | `main`, árvore canônica | **13 de 13 reprovados**, 55s |
| `minha-conta-ponte-s1234.test.tsx` **sozinho** | `main`, árvore canônica | **48 reprovados · 5 verdes (53)**, 84s |

Censo das falhas na suíte inteira: **96** `Unable to find`, **54** `expected "spy" to be called at
least once`, **44** `Test timed out`, **10** `The current testing environment is not configured to
support act(...)`, **8** `Found multiple elements`.

### A prova que fecha o caso

`definir-senha-s1223.test.tsx` reprova **13 de 13 rodando sozinho**, sem lote, sem paralelismo e
**sem worktree**. Ele exercita `DefinirSenhaFlow`, que **não está entre os 11 arquivos desta lane** e
que a rodada de copy nunca encostou. As falhas são "Unable to find" em conteúdo que o efeito deveria
produzir: o componente renderiza sem o que o efeito monta. É defeito de `main`, não de copy, e não do
worktree.

### Por que a copy está inocente, medido em quatro camadas

1. **Nenhum teste da landing prende uma string que esta lane trocou.** Varredura das doze strings
   antigas em todo `test/`: **zero casamentos**.
2. **Sete dos onze arquivos alterados não são importados por teste nenhum** (ver ressalva 10). Eles
   não têm como reprovar teste.
3. **O único arquivo que reprova e encosta em componente alterado é o
   `minha-conta-ponte-s1234.test.tsx`, e ele reprova pelo motivo errado para a hipótese da copy:**
   **47 das 48** falhas são `expected "spy" to be called at least once`, mais um timeout. Spy que não
   é chamado é efeito que não dispara, não texto que não bate.
4. **Os matchers que encostam na copy alterada passam por construção.** Os dois que citam o Painel são
   insensíveis a caixa (`/ir para o painel profissional/i` e `/^painel profissional$/i`), então a
   normalização do M2 passa. E o teste das recusas casa por fragmento que a lane não tocou
   (`{ motivo: 'sessao_anonima', trecho: /e-mail da sua conta/i }`).

### ⚠️ Onde esta lane diverge das notas da tentativa anterior

Registrado porque as notas soltas estão na árvore e alguém vai lê-las.

| Afirmação das notas | Medição desta lane |
|---|---|
| suíte cheia: 140 reprovados · 709 verdes | **147 reprovados · 702 verdes**, mesmos 22 arquivos de 65 |
| `minha-conta-ponte-s1234` é **53/53 verde sozinho** na `main` | **48 reprovados de 53 sozinho**, na árvore canônica. Não reproduz |
| a segunda causa é **vazamento de estado entre arquivos** | não sustentado hoje: o arquivo reprova sozinho, sem vizinho antes dele |
| `apps/landing` não mudou entre `f529c53b` e `5cf5b29d` | mudou: `apps/landing/app/_ds/ds.ts`, **+10 linhas** (lane CONTROLES-C0) |

O que sobrevive das duas medições é o essencial e ele está provado duas vezes por caminhos
diferentes: **a `main` está vermelha sozinha e a copy não é a causa.** O tamanho e a forma do
vermelho ainda se mexem entre execuções, e isso é informação sobre a instabilidade da suíte, não
sobre a copy.

**Card URGENTE aberto:** `S1260` no [[V1-KANBAN]] e no [[V1-CHECKLIST]], ancorado em
[[LEELA-E12-landing]].

---

## As ressalvas, numeradas

### 1. O diagnóstico da suíte vermelha está errado no handoff da aplicação

"A causa é o ambiente do worktree" não se sustenta: a árvore canônica reproduz, e
`definir-senha-s1223` reprova 13 de 13 sozinho nela. A correção importa porque a próxima lane
herdaria a instrução de "rodar num ambiente com a suíte confiável" quando esse ambiente não existe
hoje.

**Conserto:** substituir o diagnóstico pelo da S1260.

### 2. O gate verde do handoff mede os arquivos errados

O handoff e o `04-apply.md` publicam, duas vezes, "os 3 arquivos que de fato importam os componentes
que eu mudei: 31/31 verdes". Os três nomeados são `evento-vocabulario-x1`, `cupom-banner-s1215` e
`regulamento-modal-focus-trap`, e eles importam `GaleriaSection`, `ModalidadesSection`,
`RegulamentoModal`, `RegulamentoSection` e `CupomLinkBanner`. **Nenhum desses cinco está entre os 11
arquivos da lane.** O 31/31 é verdadeiro e não diz nada sobre a mudança.

Medido nesta lane: **23 arquivos de teste importam `CheckoutFlow`**, que a lane editou, e nenhum
entrou na linha verde.

**Conserto:** corrigir a linha do gate nos dois documentos. O número verde não some, muda de rótulo.

### 3. A varredura de `ambiente Leela` não voltou vazia

O handoff marca "zero ocorrências restantes" no monorepo. Sobrou **uma**, em `CheckoutFlow.tsx:2336`,
dentro do comentário que a própria lane escreveu citando a string velha. O aceite da S1252-T2 admitia
sobrevivente "com veredito escrito", então o estado é aceitável; a linha do gate é que afirma outra
coisa. No artefato buildado a string está em **zero**, conferido.

### 4. O V6 vai ao dono com o mapa incompleto, e o terceiro sentido nasceu nesta lane

O `02-vetaveis.md` descreve dois sentidos de "modalidade" e dois tiles lado a lado. O mapa real é
maior:

| Sentido | De onde vem | Onde aparece |
|---|---|---|
| a **prática** do evento | `modalidadeEsporte` (`lib/esporte.ts`) | tile `Modalidade` na seção Sobre |
| as **opções de inscrição** | `modalidades.length` | tile `Modalidades` na Sobre, `ModalidadesSection`, checkout, ingresso, `PainelIngressos` |
| a **modalidade do club** | `ClubeResumoPublico.modalidade` (`packages/core/src/clubs/clube.ts:59`) | card de club em `/@{slug}` |

O terceiro entrou na superfície pública **por esta lane**: a frase nova do L2 diz `o grupo aparece
aqui com a categoria e a modalidade`.

A classificação como vetável está **certa**, e o vetável é real: conferido em
`SobreSection.tsx`, os tiles `Modalidade` e `Modalidades` ficam na mesma `<dl>`, adjacentes,
diferindo por uma letra. O que precisa mudar é o mapa que vai ao painel.

### 5. `Modalidades / 1` num evento de modalidade única

O tile perdeu o substantivo do valor para não repetir o rótulo, e ficou com rótulo plural sobre
contagem singular. A proposta original da review carregava o singular (`1 modalidade`). Não é falso,
só lê torto. Entra junto do V6, porque a saída depende de qual rótulo sobrevive.

### 6. Deriva de caixa nos três pilares, na mesma entrega que pagou deriva de caixa

O produto renderiza os pilares como nome próprio: `fisico: 'Físico'`, `'Mental'`, `'Espiritual'` em
`apps/painel/src/routes/clubes/clube/desafios/DesafioEditor.tsx:56-58` e em
`apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts:32-34`. O H1 novo escreve `Físico,
mental, espiritual` — e o comentário da própria lane, uma linha acima em `page.tsx:104`, escreve
`(Físico, Mental, Espiritual)`.

Defensável como sentence case em prosa corrida, e é assim que o contrato de escrita da casa pede. Mas
é exatamente o teste que o M2 aplicou nesta mesma entrega — ou é nome próprio e é sempre maiúsculo,
ou é descrição e é sempre minúsculo — e não foi declarado entre as três divergências. Custa uma linha
para o dono derrubar ou confirmar.

### 7. Contradição nova dentro do mesmo cartão, na página do produtor

A lane trocou o título do estado vazio para `Nenhuma experiência marcada`, e ele fica **direto
embaixo** de um `<h2>` visível que diz `Próximos eventos` (`PerfilView.tsx:250-255`), dentro de uma
aba rotulada `Eventos` (`PerfilTabs.tsx:46`). Antes da lane o título dizia `Nenhum evento à vista` e
casava com o cabeçalho.

Nada mentiu, e o L1 que motivou a troca era legítimo. Mas o cartão passou a usar duas palavras para a
mesma coisa a três linhas de distância, que é a família de defeito que esta rodada veio pagar. O
conserto barato é o cabeçalho acompanhar (`Próximas experiências`), e ele é uma linha.

### 8. O vocabulário agora se divide entre a home e o resto

A home passou a dizer "Experiências" no eyebrow, na dobra, no contador, no rótulo do card e no link do
header. O rodapé da **mesma resposta HTTP** segue com `Inscrições para eventos de bem-estar, sem
enrolação.` (`PublicFooter.tsx:49`), e a `minha-conta` segue com `Organizar eventos` e `Eventos e
Clubs`.

Não é violação do D-0802-1: a palavra proibida como categoria é corrida, não evento. E a linha do
rodapé é texto que o dono aprovou, então mexer nela é dele. Mas é a versão fraca do mesmo desencontro
topo × rodapé que o B1 abriu, e é melhor registrar agora do que redescobrir na próxima varredura.

### 9. Comentário envelhecido no `PublicHeader`

`PublicHeader.tsx:36` ainda documenta `Mobile: "Eventos" some abaixo de sm` depois de o rótulo virar
"Experiências". A lane consertou exatamente esta classe de armadilha no `PortasDaConta`, com a razão
escrita ("comentário que cita copy envelhecida vira armadilha na próxima lane"), e passou por esta.

### 10. Sete dos onze arquivos alterados não têm teste nenhum

Medido em `test/`: `ShareBlock`, `CheckoutCtaSection`, `LotesSection`, `SobreSection`,
`(public)/page.tsx`, `layout.tsx` e `minha-conta/page.tsx` não são importados nem renderizados por
teste algum da landing.

O ponto com superfície real de regressão é o **`ShareBlock`**, que ganhou assinatura nova: nada prende
o comportamento do default, e hoje a única evidência de que ele sobreviveu é a sonda de bundle desta
review, que achou os dois pares no artefato.

Não é bloqueador para uma lane de copy. Fica registrado porque a suíte da landing está sendo
consertada de qualquer forma na S1260, e este é o momento barato de fechar a lacuna.

### 11. Dois números do registro não batem com o código

- O handoff diz **"Arquivos de código: 10"**. São **11**: `ShareBlock`, `CheckoutFlow`,
  `CheckoutCtaSection`, `LotesSection`, `SobreSection`, `PerfilView`, `PortasDaConta`,
  `minha-conta/page.tsx`, `(public)/page.tsx`, `PublicHeader` e `layout.tsx`.
- O M2 é descrito como **"as sete ocorrências"** e "sete literais". A constante `NOME_DO_LUGAR` tem
  **oito usos visíveis** (`PortasDaConta.tsx` linhas 188, 213, 252, 255, 352, 379, 389 e 391), mais a
  declaração na 164.

### 12. Nota de método para a lane de deploy: a sonda ingênua mente duas vezes

Quem repetir a sonda de bundle precisa de duas coisas que não estão escritas em lugar nenhum, e as
duas produzem falso negativo:

1. **normalizar `\xNN` e `\uNNNN`** antes de comparar, senão todo texto com acento devolve zero;
2. **buscar as pontas dos templates, não a frase montada** — o conserto do M2 fez a copy passar por
   `${NOME_DO_LUGAR}`, e a frase concatenada não existe no artefato.

Sem isso, a sonda reporta seis strings novas ausentes e uma pilha de antigas "em zero" que na verdade
nunca foram procuradas direito.

---

## O que esta review NÃO encontrou

Registrado de propósito, para a próxima varredura não gastar o mesmo tempo.

- Nenhuma promessa de envio nas strings novas.
- Nenhuma decisão de vetável tomada por tabela.
- Nenhuma regra de negócio tocada, e nenhum número de RN consumido. **A próxima livre continua sendo
  a 573.**
- Nenhum teste da landing prende uma string que esta lane trocou.
- Nenhuma string antiga sobrevivente no artefato buildado, fora as duas com veredito escrito.
- Nenhuma string visível pondo corrida, prova ou atleta no lugar da categoria.

## O que segue com o dono

V2, V3, V4, V5 e o **V6 com o mapa dos três sentidos** da ressalva 4. Mais duas linhas novas, as duas
baratas: a caixa dos três pilares no H1 (ressalva 6) e se o rodapé acompanha a home no vocabulário
(ressalva 8).

## O gate que ainda não rodou

**Gate visual em navegador.** Não se aplica aqui porque nada subiu. Ele é obrigatório na lane que
fizer o deploy, junto da S1251, e prova estática não substitui ver a tela renderizada.

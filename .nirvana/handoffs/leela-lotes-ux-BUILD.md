# BUILD-LOTES-UX · os seis achados do dono na tela de lotes

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** BUILD-LOTES-UX
- **Employee:** sf-frontend-lead (software-forge)
- **Território:** `apps/painel/**` + `packages/design-system/src/components/SubNav/**`
  (a causa da frente F estava no primitivo). Nada em `apps/landing`, `functions/`,
  `firestore.rules`, `packages/core` ou `leela-specs/`.
- **Sem deploy** — o maestro sequencia.

## Commits

| Frente | Commit | O que entrou |
|---|---|---|
| F (DS) | `fd6e5e69` | `SubNav`: some o cromo da barra + `overflow-y: hidden` + trava de regressão (4 asserções) |
| A · B | `41ac6bbb` | `loteForm.ts`: erro por campo em ordem visual; endereço do conflito de janela; capacidade prevista; vias de desativação (+22 testes) |
| C · D · E | `d4ce8d12` | `LoteModal` / `LotesView` / `LotesPage`: painel dos lotes existentes, três números, atalho de capacidade, ação Desativar (+16 testes) |
| F (painel) | `1357163a` | Guard do menu secundário do evento no `EventoShell` |

Tudo empurrado (`origin/main` em `1357163a`).

## Causa-raiz por frente

### A · o erro acusava o preço quando faltava a vaga

Não era erro de validação, era erro de **endereço**. `validarFormLote` devolvia
`{ ok: false, erro: string }` — uma pendência só, sem dizer de quem. E o
`LoteModal` fazia isto, no último campo do formulário:

```tsx
<Input id="lote-preco" label={`Preço da inscrição em ${modalidade} (R$)`}
  {...(erro ? { errorMessage: erro } : {})} />
```

Qualquer erro do formulário — vaga vazia, ordem inválida, janela invertida —
acendia "Preço da inscrição". Com o preço 120,00 preenchido e válido.

Agora a validação devolve `erros: ErroLote[]`, uma por campo, ordenada por
`ORDEM_CAMPOS_LOTE` (a ordem **visual** do modal). Todas as pendências aparecem
de uma vez, cada uma no seu campo, e o foco vai para a primeira.
`aria-invalid` e `aria-describedby` já vinham prontos do primitivo `Input` do
DS — o defeito nunca foi de acessibilidade, foi de roteamento.

⚠️ `ORDEM_CAMPOS_LOTE` espelha o layout do modal. Mexeu no layout, mexa nela
junto, senão o foco vai para o campo errado.

### B · a mensagem de sobreposição não dizia qual janela

A regra está certa (o dono confirmou) e a mensagem era cega:
`Modalidade "5k": lotes 1 e 2 têm janelas sobrepostas (RN-300)`. Para saber
**quando** o outro lote vende, o organizador tinha de sair da tela.

O kernel continua sendo o juiz — `validarLotesModalidade` decide. O que a
camada de tela acrescenta é o endereço:

> A janela fica sobreposta à do lote "Lote Promocional" (L1), que vende de
> 01 de dez. de 2025 · 08:00 até 01 de fev. de 2026 · 23:30 (horário de
> Brasília). Comece depois do fim dele, ou termine antes do início dele.

**Vazamento: não há.** O irmão é lote do mesmo evento e da mesma modalidade,
lido pela mesma tela com a mesma permissão (Rules: membro do tenant ou papel
organizador/administrador) — nome e janela já estão na tabela atrás do modal.

Conflito que **não** envolve a janela projetada (ordem duplicada, ou
sobreposição pré-existente entre dois irmãos) mantém a mensagem do kernel no
nível do formulário: nomear um lote ali seria apontar o culpado errado.

### C · editar lote vigente — ENTREGUE EM PARTE, tem delta de RN

O lote que o dono tentou editar tem venda (`vendidos > 0`). Sem venda tudo já
era editável.

O que foi entregue: a **vaga** volta a ser ajustável em lote com venda, pela
porta que já existia e estava escondida atrás de um botão "Capacidade" na
tabela — agora com atalho dentro do próprio editor, os três números à vista e
uma nota que diz o que está travado e por quê.

O que **não** foi entregue: **janela (início/fim) de lote com venda.** Não é
teimosia de UI — é a Rule:

```
// firestore.rules · match /lotes/{loteId}
function loteComercialImutavelSeVendido() {
  return resource.data.get('vendidos', 0) == 0
    || !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['preco', 'inicioEm', 'fimEm', 'quantidadeLimite',
                 'ordem', 'modalidade']);
}
```

Habilitar os campos sem mudar isso produziria `permission-denied` no salvar —
pior que a trava honesta. `firestore.rules` e `functions/` estão fora do
território desta lane.

## ⚠️ Delta de RN para o maestro selar (frente C)

**O código está mais restritivo do que a RN escrita, e a palavra do dono bate
com a RN, não com o código.**

- **RN-200** (canônica, `LEELA-E04-config-vendas`, herdada de E03):
  *"Após a 1ª venda, edição de **preço** (evento/kit/lote) é bloqueada."*
  **Só preço.**
- **RN-304** (Vitor, 2026-07-17): capacidade de lote **é** editável pelo
  organizador pós-venda, via Function, com trilha de auditoria; reduzir abaixo
  do vendido é proibido.
- **O que o código faz:** congela `preco`, `inicioEm`, `fimEm`,
  `quantidadeLimite`, `ordem` e `modalidade`. A extensão de RN-200 para
  janela/ordem/modalidade **não tem enunciado de RN** — existe só em comentário
  de código (`"RN-200/300 (registrado)"`) na Rule, no `api-client` e no
  `loteForm`.

**Verbatim do dono:** *"quantidades disponíveis, e datas de início e fim, isso
eu posso editar, só não posso editar os valores."* Ou seja: **ele está pedindo
exatamente a RN-200 como ela está escrita.**

Três coisas para selar, nesta ordem:

1. **RN-200 vale como está escrita** (só preço), e a extensão para
   janela/ordem/modalidade é revogada? Ou a extensão vira RN nova, e aí o dono
   precisa saber que a janela não abre?
2. Se a janela abre: precisa de **lane de backend** — alterar
   `loteComercialImutavelSeVendido` em `firestore.rules` e decidir se a escrita
   é direta ou por Function auditada (como RN-304 fez com a capacidade). A
   janela de lote vendido mexe em quando o preço vira: é dinheiro, provavelmente
   quer trilha.
3. **`ordem` e `modalidade` continuam congeladas de qualquer forma** — o dono
   não pediu essas duas, e mexer nelas órfãnaria lotes e inscritos.

Enquanto não houver selo, a UI diz a verdade: *"Janela e ordem seguem
bloqueadas — mudança pendente de selo da regra."*

## D · os três números, e o total que manda no disponível

O modal passou a mostrar os lotes já configurados da modalidade — a pergunta
"quanto ainda tem em pé nos outros?" nasce justamente ao cadastrar o próximo, e
o modal tapava a tabela que respondia. Cada linha traz **vendidos ·
disponíveis · total configurado**, e a linha do lote em edição acompanha o total
**digitado**, não o gravado. O caso verbatim (50 → 20 com 19 vendidos → 1
disponível, nunca 31) está no teste, com esse nome.

A tabela também trocou `vendidos / total` pelos três números: o par obrigava a
fazer a subtração de cabeça.

**Recusa (decisão do maestro, implementada como veio):** reduzir abaixo do
vendido é recusado com o limite à mostra, botão fechado, nada chamado. Nunca
aceito em silêncio, nunca mostrado como negativo (`capacidadeDoLote` já corta em
zero). Não encontrei caso legítimo que a recusa quebre.

## E · desativar, com a janela vigente

**O lote não tem flag `ativo`** — o estado é derivado (`loteEncerrado` =
`agora ≥ fimEm` **ou** `vendidos ≥ quantidadeLimite`). Criar o campo exigiria
core + Rules + Function e criaria uma segunda fonte de verdade para um estado
que já se computa. A ação usa as duas portas que a derivação já abre:

| Situação | Via | Reversível por |
|---|---|---|
| `vendidos = 0` | grava `fimEm = agora` (escrita direta, a Rule libera) | editar a janela — sem venda o lote é editável inteiro |
| `vendidos > 0` | `ajustarCapacidadeLote(capacidade = vendidos)` (RN-304) | aumentar a capacidade |

**Nada em cascata invalida inscrito — verificado no código.** `virarLote.ts` é a
única escritora de `vendidos`/`encerradoEm`/`encerradoMotivo`: ela **conta**
inscritos confirmados e estornados e **carimba o lote**; não escreve na
inscrição. O contador é monotônico por decisão registrada (estorno não devolve
vaga). A capacidade enviada é **exatamente** `vendidos`, nunca menos.

**Fora de escopo, deliberado:** lote **agendado** (janela ainda não abriu) não é
desativável — `fimEm = agora` quebraria `fim > início`, e um lote que não começou
a vender não tem venda a interromper; ele sai por Remover, que a Rule libera
justamente por não haver venda. O botão fica desabilitado com o motivo no
`title`.

**Rótulo:** a ação chama-se **"Desativar"** (palavra do dono). A confirmação
escreve o efeito: a venda para agora, as inscrições já vendidas continuam
válidas, o próximo lote assume se houver, e como reabrir.

## F · a barra horizontal fabricava a vertical — REINCIDÊNCIA

Causa-raiz em cascata, no primitivo `SubNav`:

1. `w-max` na lista faz o conteúdo ficar mais largo que a barra em
   tablet/celular → `overflow-x: auto` desenha a barra horizontal;
2. no Windows/Chrome ela é **clássica** (ocupa espaço), não overlay — o comentário
   do Adendo 12 dizia *"no desktop o conteúdo cabe e nenhuma scrollbar aparece"*,
   o que era verdade **só no desktop**;
3. essa barra come ~15px da **altura** de conteúdo do nav, e a lista tem altura
   fixa (`h-[--subnav-height]`) → sobra vertical de exatamente a espessura da barra;
4. pelo CSS de overflow, um eixo não-`visible` promove o outro de `visible` a
   `auto` → a sobra do passo 3 vira a **barra vertical**.

A vertical era filha da horizontal. A rodada anterior (Adendo 12) consertou a
**quebra** de layout e deixou as barras — por isso voltou.

Conserto na causa: some o cromo (`scrollbar-width: none` +
`::-webkit-scrollbar { display: none }`) — sem barra clássica, nenhuma altura é
roubada e o passo 3 deixa de existir; `overflow-y: hidden` fecha a promoção de
eixo de vez, e nunca corta conteúdo porque a lista tem a altura exata do nav.
**Não** foi usado `overflow-x: hidden`: isso esconderia as abas que não cabem,
que é o defeito que o Adendo 12 consertou. O scroll horizontal continua por
gesto, trackpad, arrastar e as setas ←/→ que já moviam o foco.

**Trava de regressão:** jsdom não faz layout, então é contrato de estilo — quatro
asserções nomeadas no teste do DS (`SubNav.test.tsx`), mais uma no menu real do
evento (`EventoShell.test.tsx`). Tirar qualquer uma das quatro classes derruba o
teste com a explicação junto. As utilidades foram verificadas contra o Tailwind
do projeto (geram `scrollbar-width: none` e
`.[&::-webkit-scrollbar]:hidden::-webkit-scrollbar { display: none }`).

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (painel) | **0** |
| `tsc --noEmit` (design-system) | **0** |
| `eslint --max-warnings 0` (lotes + EventoShell.test + SubNav) | **0** |
| `vitest run src/routes/eventos` (painel — vizinhança inteira) | **809 passed / 80 arquivos** |
| `vitest run src/components/SubNav` (DS) | **19 passed** |

Suíte inteira do painel **não** foi rodada (~1800 casos); rodou a vizinhança
completa dos arquivos tocados. `tsup` do DS rodou **antes** da suíte, nunca em
paralelo.

**Testes novos: 38.**

| Frente | Onde | Quantos |
|---|---|---|
| A | `_lib/__tests__/loteForm.test.ts` + `__tests__/LoteModal.test.tsx` | 5 + 3 |
| B | `_lib/__tests__/loteForm.test.ts` | 3 |
| C | `__tests__/LoteModal.test.tsx` | 3 |
| D | `_lib` + `LoteModal` + `LotesView` + `CapacidadeModal` | 4 + 3 + 1 + 4 |
| E | `_lib` + `LotesView` + `LotesPage` | 6 + 2 + 3 |
| F | `SubNav.test.tsx` (DS) + `EventoShell.test.tsx` | 1 + 1 |

## ⚠️ Incidente de coordenação — lane BUILD-MOTION no design-system

**Duas vezes** o trabalho não-commitado desta lane no DS foi destruído por
operações de git da lane BUILD-MOTION no mesmo worktree:

1. `git commit --amend` (`ee002a03` → `bf93ed51`) reverteu `SubNav.tsx` e
   `SubNav.test.tsx` para a versão do HEAD — a edição sumiu do disco depois de
   já ter passado nos testes;
2. um `git stash pop` posterior injetou **marcadores de conflito**
   (`<<<<<<< Updated upstream`) dentro dos dois arquivos.

Resolvido: reapliquei a edição e **commitei imediatamente** com `--only`, sem
tocar o index da outra lane (as sete modificações de Dialog/Drawer/DropdownMenu/
Modal/Toast/rn-themes seguiram staged e intactas), e restaurei os arquivos com
`git checkout HEAD --` depois do stash pop. Verificado: nenhum marcador de
conflito ficou no repositório.

**Para o maestro:** duas lanes escrevendo no mesmo worktree com `amend` e `stash`
não é seguro — trabalho verde some sem aviso. Vale worktree separado por lane,
ou proibir `amend`/`stash` de escopo amplo enquanto houver lane vizinha em voo.

## Vetores para a review antagonista

1. **Frente C é meia entrega.** A janela de lote vendido continua travada.
   Bater na decisão: o atalho para o ajuste de capacidade resolve o job do dono
   ("não consegui ajustar quantidade"), ou ele queria o número editável no
   próprio campo? Rejeitei o campo inline por causa da falha parcial (doc +
   callable no mesmo salvar) e do motivo obrigatório da RN-304.
2. **Desativar de lote sem venda apaga o `fimEm` original.** Não guardei
   `fimEmOriginal` — seria campo novo sem respaldo de core/spec. Reabrir exige
   digitar um fim novo. Isso é aceitável ou é perda de dado?
3. **`payloadDesativarPelaJanela` não passa pelo invariante de sequência.**
   Argumento: encurtar o fim só diminui a janela, não pode criar sobreposição.
   Vale procurar o contraexemplo.
4. **Hand-off depois de desativar.** Desativar o L2 faz o L3 assumir por
   `loteAtivo`, possivelmente antes do `inicioEm` dele. É o comportamento do
   ADR-012, mas o dono pode não esperar que desativar um lote **abra** outro. A
   confirmação avisa; vale checar se avisa bem.
5. **`overflow-y: hidden` no SubNav e o anel de foco.** O anel de 2px da aba
   focada pode ser cortado na borda. Já era assim (o `overflow-x: auto` já
   criava contexto de recorte), mas merece olhada em navegador.
6. **Esconder a barra de rolagem esconde a affordance de scroll.** O dono pediu
   duas vezes; o conteúdo segue alcançável por gesto e teclado. Se a review
   achar que fica descoberto, a saída é indicador de gradiente nas bordas — não
   trazer a barra de volta.
7. **`capacidadePrevista` com total ilegível cai no total gravado.** Escolha de
   não piscar em branco enquanto se digita. Pode mascarar um campo vazio no
   painel — mas o campo em si acusa (frente A).

## Conferência visual do dono

`/eventos/{slug}/lotes` — não precisa de deploy para ler esta lista, mas
precisa da tela no ar para conferir.

1. **Erro no campo certo.** Novo lote, preço `120,00`, vaga em branco, Salvar.
   O aviso deve acender **na vaga**, com o preço limpo, e o cursor deve pular
   para a vaga.
2. **Dois campos pendentes.** Deixe nome **e** vaga vazios. Os dois acendem, o
   foco vai no nome.
3. **Janela sobreposta.** Cadastre um lote pisando na janela de outro. A
   mensagem tem de trazer o **nome** do outro lote e as **datas com hora**.
4. **Os três números.** Na tabela e dentro do modal: vendidas · disponíveis ·
   total. Digitando um total menor no lote em edição, o **disponível cai junto**
   na hora (50 → 20 com 19 vendidos = 1).
5. **Lote com venda.** Abra Editar: preço cinza, nota explicando, e o botão
   **Ajustar capacidade** logo abaixo da vaga. A janela segue cinza — é o delta
   de RN acima, não esquecimento.
6. **Desativar.** No lote vigente, ação Desativar → a confirmação diz que a
   venda para agora e que quem já comprou continua válido. Depois de confirmar,
   o lote sai de "Ativo" e o seguinte assume.
7. **Barra de rolagem.** Encolha o navegador para tablet e celular no menu
   secundário do evento: **nenhuma barra**, nem vertical nem horizontal, e as
   abas que não cabem continuam alcançáveis arrastando. Conferir em **320px,
   768px e 1024px**.

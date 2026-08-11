---
trace: leela-redesign-v2-20260810
lane: BUILDS-DESTRAVADOS
data: 2026-08-11
worktree: C:\dev\leela-wt-builds (removido na aterrissagem)
branch: builds-destravados
autor: sf-frontend-engineer (software-forge)
estado: fechada — dois builds pagos, mergeados em main, sem deploy
---

# BUILDS-DESTRAVADOS · os dois builds que o merge do redesign soltou

> **O que esta lane é.** Os dois itens que a fila de 09/08 marcou `✅ destravado, fila (11/08)`
> depois do merge `b51cdcd9`: **PATROCINADOR-TOGGLE** e **CLUBES-CTA**. Nada além. ⛔ Nenhum deploy.

## Correção de rota na leitura do brief

O brief apontava `02-rodadas/2026-08-09-corte-painel/02-fila-execucao.md`. As duas entradas não
vivem lá — aquele arquivo é a fila das 37 decisões do corte de painel. As entradas
**PATROCINADOR-TOGGLE** (`:208`) e **CLUBES-CTA** (`:89`) estão em
`02-rodadas/2026-08-09-decisoes-dono/02-fila-execucao.md`, e os registros de origem em
`01-decisoes-dono.md` da mesma pasta (bloco 20 e bloco 12).

## Conferência contra `01-produto/DECISOES-ABERTAS.md`

| Build | Depende de decisão aberta? | Prova |
|---|---|---|
| PATROCINADOR-TOGGLE | **Não** | Decisão nova do dono em 09/08, sem linha no painel. Na fila de construção, Posição 1 · E10-S812, o que fica com o dono está escrito como "**O que fica com você: nada**". |
| CLUBES-CTA | **Não** — mas o painel está desatualizado | O dono decidiu em 09/08 (bloco 12: *"mEUS CLUBES - deixa cta para se isncrever em um"*). O item **CLUBES-1** continua listado em `DECISOES-ABERTAS.md:180` como decisão aberta: é resíduo de limpeza, não pergunta viva. |

⚠️ **Para o maestro, e é a única pendência que esta lane deixa.** O **CLUBES-1** precisa sair do
painel do dono, com o registro apontando para `02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md`
§12 — a disciplina escrita no cabeçalho do próprio painel ("item resolvido sai deste painel na mesma
aterrissagem") não foi cumprida para ele em 09/08. Não editei o painel: está fora do escopo desta
lane (dois builds, nada além) e a conta de itens abertos do cabeçalho muda junto. O board já
registra o achado no card do E12.

---

## Build 1 · PATROCINADOR-TOGGLE — `4b75837f`

**O que a fila pedia.** Trocar o botão destrutivo pelo interruptor que o dado já sabe representar;
marca inativa some do autocomplete de patrocínios futuros e continua no registro. Território
re-endereçado pelo merge: `routes/parcerias/marcas/MarcasPage.tsx` (`:188-189` e `:133`) e
`MarcaFormModal.tsx`; `packages/api-client` no lugar de `excluirMarcaDoProfissional`; RN-171.

**O que entregou.**

| Aceite da fila | Como fica provado |
|---|---|
| Não existe mais caminho de tela que apague uma marca | Botão Excluir e `ConfirmModal` fora da `MarcasPage`; `excluirMarca` e `inativarMarca` saíram do `@leela/api-client` e deram lugar a `definirStatusDaMarca`, que escreve nos dois sentidos. Teste: *"não existe mais caminho de tela que apague uma marca"*. |
| Marca inativa não aparece no autocomplete de patrocínios novos | O corte já existia dentro do `useMemo` do `AddPatrocinadorModal`, verdadeiro e **inchecável** (o Combobox portalizado sob o Dialog não abre no jsdom). Virou `marcasParaAutocomplete` em `_lib/parcerias`, pura, com dois casos. |
| Continua listada, com o estado visível, para poder voltar | Coluna "No autocomplete": `Switch` do DS + `Badge` de estado. Teste percorre desligar → ler "Inativa" → religar, e confere que a segunda escrita manda `'ativa'`. |
| O aviso ao desligar sai na tela e diz o que muda | Frase genérica do §20 no toast da escrita, com as duas metades: some do autocomplete de patrocínios novos; os já cadastrados continuam intactos. Teste casa as duas. |
| Nenhuma cópia de patrocínio já cadastrada é tocada | `definirStatusDaMarca` escreve `status` + carimbo em `profissionais/{uid}/marcas/{id}` e nada mais. |
| A RN-171 ganha o enunciado de que marca não se apaga | `LEELA-E10-marcas.md`: sub-item na RN-171 + seção "Liga e desliga no lugar da exclusão". |

**Defeito fechado no mesmo build, e ele nasceria do próprio toggle.** O `MarcaFormModal` não
carregava `status` no input, e a escrita é `setDoc` com `merge` carimbando `status: input.status ??
'ativa'`. Editar o link do contrato de uma marca **desligada** a religava em silêncio, de volta ao
autocomplete. O input passa a preservar o `status` de origem; o formulário continua sem campo de
estado, porque o estado é do interruptor — dois lugares mexendo no mesmo estado é como um deles
passa a mentir.

**A escolha que vale registrar: por que não o `ConfirmModal`.** Ele é a peça da ação **destrutiva**
(cânone §8, botão `destructive` fixo no componente). Vestir de vermelho um gesto reversível
ensinaria de volta exatamente o medo que a decisão do dono removeu. O aviso vai no toast, que o
cânone §11 já obriga em toda escrita, e a explicação permanente entrou no subtítulo da página.

**Teste.** 6 casos novos no arquivo da tela (exclusão ausente, desligar com aviso, estado visível +
caminho de volta, falha não mente, edição não religa) + 2 no lib puro. `MarcasPage.test.tsx`,
`_lib/__tests__/parcerias.test.ts`.

---

## Build 2 · CLUBES-CTA — `a9e30833`

**O que a fila pedia.** O estado vazio ganha CTA para se inscrever num clube, com destino real e
verificável, sem prometer mecanismo de entrada que não existe, sem Rule afrouxada e sem porta nova.
O destino sai de uma das duas leituras do bloco 12.

**A medição que escolheu a leitura.** A primeira leitura, proposta pela esteira, é a **descoberta**:
"uma lista dos clubes que existem, com a página pública de cada um". Na main mergeada, nenhuma das
duas existe:

- não há rota de listagem de clubes na landing (`app/(public)` tem `[eventSlug]`, `minha-conta`,
  `convite`, `ingresso`, `definir-senha` e a home);
- clubes públicos aparecem **só** dentro da aba "Clubs" da página do organizador
  (`_perfil/PerfilView.tsx` §SecaoClubs), e ali os cartões **nem clique têm** (D-ACH-20);
- não existe página pública de clube.

Construí-las seria rota nova mais leitor público sobre `clubes` atravessando produtoras — a porta
nova que o próprio aceite proíbe, numa tarefa que a fila dimensionou como pequena sobre tela
servida. Vale então a segunda leitura registrada, a **espera declarada com o caminho escrito**.

**O que entregou.** O CTA "Ver experiências" aponta para `/`, que está no ar, e a frase diz as duas
coisas que faltavam: quem inclui participante em clube (quem administra) e onde os clubes públicos
ficam (na página de cada organizador). A trilha é real e verificável ponta a ponta: `/` lista as
experiências publicadas → a página da experiência linka `/@handle`
(`[eventSlug]/sections/OrganizadorSection.tsx:26`) → a página do organizador tem a aba Clubs. O
rótulo corresponde ao que a tela seguinte entrega, que é a régua do CTA-PIX-1.

**O que ficou fora, de propósito.** A entrada no clube continua sendo o **E05**. O campo de resgate
que o registro cogitava "se o código de convite for destravado" não entra: o código de convite de
clube segue sem ser consumido em lugar nenhum fora do seed. `functions/src/cliente/meusClubes.ts`
não precisou de uma linha.

**A guarda que quase caiu por vizinhança.** O caso ⚔ *"NENHUM caminho novo de credencial"* varria o
**documento inteiro** por `link`/`button`. O CTA do vazio de **clubes**, que não é credencial de
nada, o derrubaria. A correção foi dar escopo próprio à caixa de convites
(`data-slot="secao-convites"`) e não afrouxar a asserção: a guarda ficou mais afiada, reprovando
exatamente o que existe para reprovar.

**Teste.** 4 casos novos (destino real `/`, rótulo que corresponde ao destino, a frase com as duas
metades, e o CTA ausente para quem já está num clube), mais o caso ⚔ reescrito com escopo.

---

## Gates

Rodados em série, em foreground, no worktree próprio.

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **235 arquivos · 2597 testes · 0 falhas** (968s) |
| Suíte landing INTEIRA | **61 arquivos · 817 testes · 0 falhas** (um arquivo por processo) |
| Arquivos tocados, na árvore mergeada | painel 6/6 arquivos · 48 testes · 0 falhas; landing 3/3 · 47 testes · 0 falhas |
| `tsc --noEmit` | painel 0 · landing 0 · api-client 0 |
| `eslint --max-warnings 0` | painel 0 · landing 0 · api-client 0 |
| `generate-tokens` 2× | **zero diff** nas duas rodadas |
| `gate-canon` | **PASS** — camada A íntegra (78 componentes), catraca **inteira no baseline, nenhum número subiu** |
| Frescor do workspace | 0 pacotes defasados |
| hex/px no diff | **zero** |

**A suíte da landing é flaky em paralelo, e não é por causa desta lane — está medido.** Com os
workers default o conjunto de arquivos vermelhos **muda a cada rodada** (4 arquivos, depois 5,
depois 7). Para separar flake de regressão, rodei a suíte com as minhas mudanças **retiradas do
disco**: a baseline limpa falhou do mesmo jeito, **4 arquivos e 54 testes**, todos fora do meu
território. Rodando um arquivo por processo, a suíte fecha **817/817**. Fica registrado para a
próxima lane que tocar a landing: `test:gate` (`--maxWorkers=3`) **não** é determinístico nesta
máquina; `--fileParallelism=false` é.

**Uma armadilha do gate de frescor que me mordeu duas vezes.** Ele compara **mtime** de fonte contra
`dist/`. Qualquer `git checkout --` num arquivo de `packages/*` depois do build do pacote o deixa
"defasado" sem que uma linha tenha mudado — foi o que aconteceu quando devolvi os arquivos de tema
que o `generate-tokens` reescreve byte a byte. O conserto é rebuildar o pacote, não mexer no gate.

**Ruído de instalação, revertido:** `pnpm install` no worktree novo acrescenta
`'@sentry/cli': set this to true or false` ao `pnpm-workspace.yaml`. Não entrou em commit nenhum.

---

## Aterrissagem

- `4b75837f` PATROCINADOR-TOGGLE · `a9e30833` CLUBES-CTA · `8f6c799a` merge de `origin/main` na lane.
- `git merge-tree` contra `origin/main` **limpo**; main tinha andado três commits (INFRA-DEPLOY),
  sem tocar um arquivo desta lane. Gates re-rodados **depois** do merge.
- Merge `--no-ff` em `main`, push, worktree removido.
- Boards: `V1-KANBAN.md` — S811-T6 a T9 sob o card do E10, S1222-T6 sob o card do E12, e o card do
  E12 deixa de dizer que o CLUBES-1 é do dono.
- ⛔ **Nada foi para o ar.** Os dois entram no próximo pacote de deploy, e o do painel precisa do
  gate visual: a coluna nova do interruptor e o CTA do vazio são superfície.

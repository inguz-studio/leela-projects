---
tags: [leela, fila, leva22, ondas, kits, modalidades, e01, e03, e04]
aliases: [Fila da leva 22, As quatro ondas]
atualizado: 2026-08-17
---

# Fila de construção — as quatro ondas da leva 22

> ⛔ Zero código de produto foi escrito nesta lane. Isto é a fila que as ondas executam.
> Tamanhos na régua do projeto: **—** normal (sonnet) · **⚔** exige opus ou mexe em
> servidor/Rule · **⚔⚔** transacional, migração ou dinheiro.

## Ordem e dependência

Cards no [[V1-KANBAN]], ancorados no épico: **S047** (esta lane — medição, specs e as três RNs) ✅ ·
**S048** onda A · **S049** onda B · **S316** onda C, história que já existia e foi re-ancorada ·
**S050** onda D.

```
Onda A  (independente, dispara já)  ──────────────┐
Onda B  (menu terciário)  ────────────────────────┼──→ deploy com gate visual
Onda C  (Modalidades pai/filho)  ─────────────────┤
Onda D  (RN-575 + RN-576)  ───────────────────────┘
```

- **A** não depende de decisão nenhuma e pode disparar assim que esta spec aterrissar.
- **B** depende do vetável **TERCIARIO-1** só para o formato; o componente pode ser
  construído antes da resposta, porque as três peças que faltam (URL, indicador deslizante,
  orientação) valem nas duas leituras.
- **C** depende da **B**? **Não.** São territórios diferentes. Mas as duas tocam
  `eventos/_lib/subnav.ts` — a B remove "Página de vendas", a C renomeia "Lotes". **Se
  correrem em paralelo, worktree por lane**, pela diretriz de 05/08 sobre lanes vizinhas.
- **D** depende de **CAIXA-1** só na parte do caixa; as partes de RN-575 e RN-576 correm sem
  resposta do dono.

⚠️ **A e a campanha da RN-573 se cruzam.** A onda R1-c da leva 17 mexe na mesma Caixa e nos
mesmos kits. Quem for despachar confere `2026-08-17-carga-cognitiva/04-fila-em-ondas.md`
antes, ou as duas se sobrescrevem.

---

## Onda A · a arrumação das telas de kits

**Nenhuma decisão pendente. Dispara já.** Nove tarefas, todas em `apps/painel` e uma no DS.
É a onda que o dono vê primeiro.

| # | Tarefa | Onde | Tam. |
|---|---|---|---|
| A1 | **A borda decorativa sai do `Card` canônico** | `packages/design-system/src/components/Card/Card.tsx:72` | ⚔ |
| A2 | O teste que congela a borda é refeito | `kits/__tests__/superficie-cartoes.test.tsx:80,93` | — |
| A3 | **Editar vira ícone no topo-direita**, nos dois cards | `kits/KitsCadastroView.tsx:158-163`, `:179-187` | — |
| A4 | **A trilha do editor de kit morre e vira botão de voltar** | `kits/KitEditor.tsx:323-334` | — |
| A5 | **"O que está incluso" vira tabela** (sem quantidade) | `kits/KitEditor.tsx:557-602` | — |
| A6 | **Fotos do kit −50%** | `kits/KitEditor.tsx:484,503-514` | — |
| A7 | **Alertas operacionais no padrão da Visão Geral** | `kits/DistribuicaoView.tsx:482-517` | — |
| A8 | **A barra de severidade que não renderiza**, nos 5 lugares | `DistribuicaoView.tsx:485,502`, `entrega/BalcaoBanner.tsx:47,69`, `entrega/estados/EstadosBalcao.tsx:122` | — |
| A9 | **Espaçamentos**: um ritmo por nível na área de kits | `KitsLayout.tsx:64`, `KitsCadastroView.tsx:56`, `DistribuicaoView.tsx:481`, `KitEditor.tsx:322,341-557` | — |
| A10 | **Seletor de modalidades no padrão do DS** | `kits/KitEditor.tsx:375-406` | — |

### A1 — a tarefa que parece de tela e é de sistema

**Não é "tirar a borda dos cards de kit". É tirar a borda decorativa do `Card` canônico**,
que a §2.16 do guia visual já proíbe e que 43 instâncias herdam hoje. Consertar só a tela de
kits deixaria o produto com duas receitas de card e reabriria a mesma queixa na próxima tela
que ele abrisse.

**Aceite, e o segundo item é o que importa:**

1. Nenhum `<Card>` do produto nasce com borda decorativa; a exceção do **card crítico**
   (`border-left` Vulcão) continua, porque é semântica e a §2.16 a lista.
2. ⛔ **O contêiner continua legível como contêiner nos três temas, sem borda** — conferido
   com o olho, tema a tema. **O `wine` é o caso de prova:** lá o card é `#FFFFFF` sobre
   página `#FDFAF7`, e sem borda a separação depende só de `shadow-elev-1`. Se não bastar,
   a resposta é ajustar a elevação ou a superfície do tema — **nunca devolver a borda**, e
   nunca declarar pronto sem olhar.
3. **A D-1008-R11 não reabre.** Aquela queixa era informação flutuante por falta de
   contêiner; o teste dela é o mesmo olho do item 2.
4. O `KpiCard` e o `Card` passam a ser a mesma superfície na mesma dobra.

⚠️ **A2 sobe no mesmo commit que A1.** O teste foi escrito pela lane da R11 para congelar a
receita, e a decisão do dono o contradiz. Mudar o teste sozinho é apagar a memória; mudar o
código sozinho deixa a suíte vermelha.

### As outras, em uma linha de aceite cada

- **A3** — ícone `Pencil` do `RowActions`/`IconButton`, topo-direita, nos **dois** cards
  (hoje um está no rodapé-esquerda e o outro é `<button>` cru). Nome acessível obrigatório:
  ícone sem texto reprova no gate de UI.
- **A4** — a trilha de cinco níveis do editor morre; entra um botão de voltar para a
  listagem de kits. ⛔ **A trilha do shell do evento não se toca** — ela é das dez abas, não
  de kits, e matá-la aqui mataria em todas.
- **A5** — `Table` do DS, com o dado que já existe. **Sem coluna de quantidade**, que é onda
  D porque exige modelo.
- **A6** — depende de **FOTOS-1**. Default: teto de largura na galeria, mantendo
  `grid-cols-3` no desktop. Como não há px em lugar nenhum hoje, o aceite é visual e vale
  para desktop, tablet e 375.
- **A7** — a anatomia do `Alertas` da Visão Geral: superfície neutra, severidade só na barra,
  título de grupo, `<ul>`/`<li>`, e **ação que leva ao lugar** — hoje o alerta de kits nomeia
  SKUs sem levar a nenhum. O `role="alert"` em conteúdo estático sai junto.
- **A8** — `border-l-[var(--card-critical-border)]` gera `border-left-color: 3px`, inválida,
  descartada, largura 0. A forma certa (`length:`) já roda em dois lugares. **Vale uma
  catraca**, porque a classe errada é indistinguível da certa na leitura.
- **A9** — as duas abas irmãs da mesma sub-nav respiram a 32 e a 24; seis seções irmãs do
  editor alternam 16 e 12 sem critério. Um ritmo por nível, e `Stack` onde houver lista.
- **A10** — a composição `Chip + Select + botão "Adicionar"` é o caso da **RN-568**. Adotar
  `Combobox`, que o DS publica e que quatro telas já usam. ⚠️ Isto aproxima as **três
  línguas** que hoje descrevem modalidade (criação, configurações, kit) — unificar as três é
  onda C, não A.

---

## Onda B · o menu terciário vira padrão

Spec em `01-spec-menu-terciario.md`. **Cria componente no DS** — é a onda mais cara em
design e a mais barata em risco de dado.

| # | Tarefa | Onde | Tam. |
|---|---|---|---|
| B1 | **`TabsPanel` no DS**: troca no lugar, estado na URL, indicador deslizante, orientação horizontal e vertical | `packages/design-system/src/components/` | ⚔ |
| B2 | O cânone ganha a linha do padrão nomeado | `03-canon/canone-de-componentes.md` | — |
| B3 | **Configurações do evento** roda no componente novo | `eventos/configuracoes/ConfiguracoesLayout.tsx` | ⚔ |
| B4 | **Página de vendas entra em Configurações** | `EventosRoutes.tsx:149-156`, `_lib/subnav.ts:37` | ⚔ |
| B5 | **Credenciamento em duas abas** | `eventos/entrega/BalcaoView.tsx:63-77` | — |
| B6 | Os três botões mortos: ganham comportamento ou saem | `entrega/PainelOperacional.tsx:152-165` | — |
| B7 | O molde dos Clubs migra do bespoke para o canônico | `clubes/clube/configuracoes/ConfiguracoesView.tsx:160-179` | — |

**Aceite da onda:** trocar de aba não move o scroll (por teste); o endereço da aba é colável;
o indicador desliza respeitando `motion-reduce`; AA por estado nos três temas; a11y de
tablist completa; **a matriz de papéis não afrouxa** — teste provando que `financeiro`
continua sem acesso à página de vendas, e que painel escondido não é painel autorizado;
redirect da RN-234 no endereço antigo; gate visual antes de "no ar".

⚠️ **B7 fecha o círculo:** o que o dono elogiou é o único menu fora do cânone. Publicar o
componente e deixar o molde original bespoke seria criar a décima quarta escrita da mesma
peça — exatamente o que a RN-568 existe para impedir.

**O que a B não entrega:** a simplificação do check-in. O corte em abas não tira nenhum
toque. Ver **CRED-1**.

---

## Onda C · Modalidades no lugar de Lotes

Spec em `02-spec-modalidades-pai-filho.md`. **É a S316 inteira**, re-ancorada. A onda mais
cara, e a única com migração.

| # | Tarefa | O que | Tam. |
|---|---|---|---|
| C1 | `S316-T1` · a porta única no servidor (RN-500) | callable transacional, motivo e trilha, `qtdInscritos == 0` checado por conta própria | ⚔ |
| C2 | `S316-T2` · renomear é migração atômica (RN-501) | cinco alvos num commit, pai antes dos filhos | ⚔⚔ |
| C3 | `S316-T3` · remover recusa nomeando quem impede (RN-502) | a recusa chega à tela, não vira "falha ao salvar" | ⚔ |
| C4 | `S316-T4` · **a tela pai/filho** | ⚠️ **cresceu** — sai de Configurações gerais, vira a hierarquia na aba renomeada | ⚔ |
| C5 | `S316-T5` · o evento degradado ganha conserto (RN-505) | ação na listagem; `getEvento` segue fail-fast | ⚔ |
| C6 | `S316-T6` · o docId do lote larga o nome da modalidade | só documentos novos | — |
| C7 | `S316-T7` · **o renome** — aba, copy das três telas, morte dos textos de lacuna | **nasce última** | — |

**Por que a C4 cresceu de — para ⚔:** antes era uma seção de chips reusando componente que
já existia, numa tela que já existia. Agora é a reestruturação da tela de lotes, com
hierarquia, estado novo para modalidade sem lote, e a régua de não piorar o caminho
frequente. O número da tarefa não mudou; o trabalho mudou, e registrar isso é o que impede a
fila de mentir.

⛔ **C7 só entra depois de C4 verde.** A tela de Lotes hoje declara que não edita
modalidades; renomeá-la antes de entregar a edição recria o círculo fechado que a
DIAG-PAINEL-LACUNAS pagou para desfazer, **com o agravante de que agora o nome prometeria**.

**Aceite da onda:** a aba diz Modalidades e o `id` e a rota não mudam (régua da RN-399); a
tela lista modalidades com lotes dentro e **modalidade sem lote aparece** com o caminho para
criar o primeiro; falha injetada no meio do renome não deixa nada escrito; **nenhum caminho
do job frequente piora** — passos medidos antes e depois pela L-021; varredura por *"não é
editável depois de criado"* devolve zero.

---

## Onda D · o dinheiro do kit e a composição

Spec em `03-spec-caixa-e-kit-composicao.md`.

| # | Tarefa | O que | Tam. |
|---|---|---|---|
| D1 | **O pedido carimba o preço do kit** | molde do `pagamento.taxaCongelada` (RN-179) | ⚔⚔ |
| D2 | **As três travas abrem para o kit** (RN-575) | tela, Rule e Function; evento e lote seguem fechados | ⚔⚔ |
| D3 | A borda do PIX pendente | resposta escrita para edição durante cotação viva | ⚔ |
| D4 | ⚠️ **Nome e composição param de reescrever compra antiga** | a lacuna que a ordem abriu e que não parece dinheiro | ⚔ |
| D5 | **Kit deriva do catálogo** (RN-576) | texto livre deixa de ser porta de entrada | ⚔ |
| D6 | Quantidade por item | campo novo no core e nas Rules; destrava a coluna "Qtd." | ⚔ |
| D7 | Acervo legado: string que não casa com item | sinalizada, nunca apagada | — |
| D8 | **A tabela do caixa** | depende do **CAIXA-1** | a definir |

**A ordem dentro da onda, e ela inverte o que o brief supunha.** O brief mandava priorizar a
blindagem de dinheiro *se o snapshot não existisse*. **Ele existe para o dinheiro:** o preço
do kit já está somado dentro de `valorBase` e nunca é relido, então nenhum pedido está em
risco hoje. O que **não** existe é o carimbo que torna a decisão auditável depois (D1) e a
trava que impede nome e composição de reescreverem compras antigas (D4). **D1 antes de D2** —
liberar a edição antes do carimbo cega a série histórica no primeiro dia.

**Aceite:** um pedido criado antes da edição mostra o mesmo valor nas seis superfícies
depois dela, por teste que cria, edita e relê; evento e lote continuam recusando, com o teste
da RN-200 verde; não é possível gravar "incluso" que não corresponda a item do catálogo;
documento legado continua legível.

---

## O que fica com o dono antes de cada onda

| Item | Trava qual onda | Pergunta |
|---|---|---|
| **FOTOS-1** | A6 apenas | "50%" é teto de largura ou outra escada de colunas? |
| **TERCIARIO-1** | formato da B | "abas fixas" mata o âncora? — *"me fiz claro?"* |
| **CRED-1** | escopo da B5 | o check-in ganha scanner, ou só o corte em abas? |
| **CAIXA-1** | D8 apenas | redesenhar, trocar por receita, ou remover? |

**Nenhum deles trava a onda inteira.** A A dispara com o default de FOTOS-1; a B constrói o
componente antes da resposta; a C não depende de nenhum; a D corre em D1-D7 sem o CAIXA-1.

## Vizinhos

`00-medicao-kits-caixa-e-terciario.md` para o estado real com arquivo:linha.
`2026-08-17-carga-cognitiva/04-fila-em-ondas.md` para a campanha da RN-573, que cruza com A e D.

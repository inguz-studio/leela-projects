---
tags: [leela, decisoes, rns, rodada, formulario, templates]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
---

# 02-rns-delta · RNs novas do delta FormBuilder

> **Prova de não colisão (2026-07-28).** `RN-370` a `RN-380` estão consumidas pelo pacote
> de estorno em `functions/src` e `apps/painel/src`; `RN-400` a `RN-410` são do E16. Uma
> varredura em todo o repo, fora de `node_modules`, por `RN-381` a `RN-399` deu **zero
> hits**. A lane SPECS-0728 ocupa `RN-385` a `RN-399` e deixa `RN-381` a `RN-384` livres
> como folga para a lane de estorno crescer. Este delta usa **RN-389 a RN-392**.
>
> **Consolidação nos épicos:** cada RN abaixo consolidou no épico dono na mesma
> aterrissagem (E04 dono do modelo, do core e da biblioteca; E05 e E12 consumidores). A
> rodada guarda só o delta.

## Novas

| RN | Regra | Épico | Lote de código |
|---|---|---|---|
| **RN-389** | **Formulário é template com casa própria no menu principal.** A biblioteca de formulários vive em `profissionais/{profId}/formularios/{formularioId}` e é alcançada por um item próprio do menu principal. O construtor **sai** da configuração do evento e da do clube, que passam a **escolher** um template pronto. Supersede parcial da RN-184 na parte de superfície e da RN-189 na parte de builder; o corte de v1 (seleção única, múltipla, sim/não), a fonte única no core e a leitura/export pela lista de inscritos permanecem. Supersede parcial do inventário da **RN-233** (o menu passa de seis para sete áreas), preservando os dois invariantes dela: item de menu sem rota continua proibido e o catálogo do design system continua sendo a fonte, sem filtro no consumidor. | E04 (dono) · E01 (menu) · E05 · E12 | FORMBUILDER |
| **RN-390** | **Vínculo por versão publicada.** O template tem rascunho e versões publicadas. Evento e clube guardam `formularioId` **e** a versão vigente no ato do vínculo. Publicar versão nova **não** migra vínculo existente; a configuração sinaliza que há versão mais nova e oferece atualizar por ação explícita. A resposta continua carimbando a versão que foi exibida (RN-188, agora sobre a versão do template) e nenhuma resposta antiga é reescrita. | E04 (dona) · E05 · E12 | FORMBUILDER |
| **RN-391** | **Navegação e permissão da biblioteca.** Criar, editar, publicar e arquivar template é ação de quem administra o tenant; **vincular** um template a um evento ou clube é ação de quem já configura aquele evento ou clube, pelos mesmos quatro papéis da RN-320 (E04-S304). Sem papel de configuração, o seletor aparece em leitura. Nenhum papel novo é criado. | E04 (dona) · E05 | FORMBUILDER |
| **RN-392** | **Ciclo de vida do template.** Estados: `rascunho`, `publicado`, `arquivado`. Template **vinculado não pode ser excluído**; pode ser arquivado, o que o tira do seletor de novos vínculos e **não** toca em vínculo vivo nem em resposta gravada. Exclusão de verdade só com zero vínculos. Mesma semântica de consequência que a exclusão de marca já explica na própria caixa de confirmação. | E04 (dona) · E05 | FORMBUILDER |

## Ampliadas / reconciliadas (sem número novo)

- **RN-184** — o corte de v1 e a fonte única no core seguem inalterados. Muda só a
  superfície do builder, que sai da config e vai para a biblioteca (RN-389). O E04 segue
  dono do modelo e do core.
- **RN-187** — os tetos de 20 perguntas e 10 opções passam a valer **por versão de
  template**, com a constante continuando única no core.
- **RN-188** — o carimbo de versão na resposta continua obrigatório; a versão carimbada
  passa a ser a do template exibido (RN-390). Nenhuma resposta antiga é reescrita.
- **RN-189** — a parte de **superfície do builder** é superseded pela RN-389. A parte de
  **leitura e export** fica intacta: a resposta viaja como coluna do inscrito na lista e
  no export que já existem, sem relatório novo.
- **RN-233** — o inventário de seis áreas do menu ganha a sétima (RN-389). Os invariantes
  da regra continuam: todo item tem rota, e o catálogo do design system é a fonte.
- **RN-185 / RN-186 / RN-320 / RN-172** — inalteradas.

## Fase 2 (segue sem ser RN)

- **Anexo de arquivo** — fora do v1, uma linha de backlog na história dona. Sem mudança.

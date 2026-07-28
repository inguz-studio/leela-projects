---
tags: [leela, decisoes, rodada, produto, formulario, templates]
aliases: ["Rodada formbuilder-templates 2026-07-28", "FORMBUILDER-TEMPLATES", "DEC-FB-0728"]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
fonte: DEC-0728B (verbatim do Vitor em 02-rodadas/2026-07-28-decisoes/01-decisoes.md)
---

# Delta FormBuilder — o formulário vira template com casa própria

Rodada de delta, não de recomeço. A rodada de 2026-07-19
(`02-rodadas/2026-07-19-formbuilder-analise/`) continua canônica em tudo que não está
escrito aqui. Este arquivo guarda só o que a DEC-0728B mudou.

## Verbatim do Vitor (DEC-0728B, 2026-07-28)

> *"QUero o formbuilder também. no formato que já conversamos, para termos os fomrulários no menu principal, como templates, que poderão ser reutilizados em eventos."*

## O que continua exatamente como estava

- **D-FB-1 / RN-185** — a resposta vive no inscrito e no membro, nunca no pedido.
- **D-FB-2 / RN-189 (parte de leitura)** — organizador e equipe leem, e o export reusa a
  lista de inscritos existente.
- **D-FB-3 / RN-186** — pergunta obrigatória bloqueia o pagar e o inscrever no mesmo
  fence server-side dos aceites.
- **D-FB-4 / RN-187** — tetos de 20 perguntas e 10 opções, constante única no core.
- **Corte de v1** — só seleção única, seleção múltipla e sim/não. Anexo de arquivo segue
  fase 2 gated, uma linha de backlog.
- **E12 como consumidor** — o render na compra não muda de desenho. Ele passa a receber a
  versão do template em vez da subcoleção do evento, e é a única diferença.

## Decisões novas

### D-FB-7 · O formulário é um template do tenant, com casa própria no menu ⇒ RN-389

O builder sai da configuração do evento e da configuração do clube e passa a viver numa
biblioteca do profissional, alcançável pelo menu principal. Evento e clube deixam de
abrigar o construtor e passam a **escolher um template** já pronto.

Isto é **supersede parcial do D-FB-6**: a parte "builder vive na config do evento e do
clube" cai; a parte "modelo e core são únicos, E05 e E12 reusam" fica de pé e fica ainda
mais verdadeira, porque agora existe uma fonte só de formulário em vez de duas
subcoleções paralelas.

**Custo declarado, e ele não é zero.** A RN-233 fixou o menu principal em seis áreas em
2026-07-19 e foi construída em 2026-07-26 com um teste de inventário exato e ordenado,
mais uma varredura que exige destino para todo item. Um sétimo item obriga a mexer nesse
inventário, no `DEFAULT_SIDEBAR_SECTIONS` do design system, nas stories, no `docs.mdx`, no
`LLM.txt` e na suíte do Sidebar, tudo no mesmo lote. O invariante que a RN-233 protege
continua intacto: item de menu sem rota permanece proibido, e o catálogo do design system
segue sendo a fonte, sem filtro no consumidor.

**Por que não pendurar em Eventos.** Seria mais barato e mentiria sobre o produto. O valor
do template é atravessar eventos e clubes; enterrá-lo dentro de um evento é a mesma
confusão que a biblioteca existe para desfazer.

### D-FB-8 · O vínculo é por versão publicada, e publicar não mexe em quem já usa ⇒ RN-390

O template tem rascunho e versões publicadas. Evento e clube guardam o id do template
**e a versão** que estava vigente no momento do vínculo. Publicar uma versão nova **não**
migra vínculo vivo; a configuração do evento avisa que existe versão mais nova e oferece
atualizar em um clique.

O motivo é o mesmo da D-FB-5, agora um nível acima: nada muda debaixo de quem já
respondeu, e nada muda debaixo de uma venda aberta. A resposta continua carimbando a
versão que ela viu, só que a versão agora é a do template, não a de uma pergunta solta.

Descartado: fazer o evento seguir sempre a última publicada. É mais simples de escrever e
troca o formulário de um evento com inscrições abertas sem ninguém pedir.

### D-FB-9 · Template em uso não se exclui; arquiva ⇒ RN-392

Ciclo de vida: rascunho, publicado, arquivado. Arquivar tira do seletor de novos vínculos
e **não** toca em vínculo vivo nem em resposta gravada. Excluir de verdade só é possível
enquanto nenhum evento ou clube apontar para o template.

É a mesma semântica que a tela de marcas já adotou e documentou na própria caixa de
confirmação, então o organizador não aprende duas regras diferentes para a mesma
sensação.

### D-FB-10 · O dono do modelo continua sendo o E04 ⇒ RN-391 e ajuste de RN-184/189

A biblioteca muda de lugar na tela, não de domínio. `packages/core/src/forms/` continua
sendo a fonte única, e o E04 continua sendo o épico dono do modelo, do core e agora da
biblioteca. E04 e E05 ficam com o **vínculo** (escolher o template na configuração), e o
E12 fica com o render.

Descartado: mover a posse para outro épico por causa da navegação. Espalharia RN-184,
RN-187 e RN-188 por três arquivos para resolver uma mudança de menu.

## Premissas assumidas

- **P-FBT-1** · A biblioteca é do profissional, no mesmo padrão do registro de marcas
  (`profissionais/{profId}/…`), e não da plataforma. Um template não atravessa tenants.
- **P-FBT-2** · O tenant que ainda não tem template vê a configuração do evento com um
  estado vazio que leva à biblioteca, e não um construtor embutido de emergência.
- **P-FBT-3** · A migração de dado não existe, porque o construtor nunca foi construído. A
  rodada de 19/07 é spec, não código: não há formulário gravado sob evento ou clube para
  migrar. É o motivo de o delta caber antes do código, e não depois.

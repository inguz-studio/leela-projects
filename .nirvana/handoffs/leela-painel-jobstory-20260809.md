# PAINEL-JOBSTORY · handoff vivo

**Trace:** `leela-painel-jobstory-20260809` · **Lane:** sf-cto (software-forge) · **Início:** 09/08
**Alvo único:** `leela-specs/01-produto/DECISOES-ABERTAS.md`, editado no lugar. Nenhum arquivo novo.

## O pedido

> "atualize as decisões pendentes no obsidian, apenas com o que está aberto, em bullet points, descritivo, caso de uso e job story. para eu entender o contexto antes de aprovar ou desaprovar"

## Estado de entrada

- HEAD `461587ae`, main == origin, árvore limpa.
- Painel com 792 linhas. **66 itens abertos**: 59 em "Decisões que dependem de você" + 7 em "Ações que só você pode executar". Contados à mão e batendo com o cabeçalho.
- "Fila de construção" com 14 entradas, não contadas. Dentro dela mora o **ADMIN-USUARIOS-1**, que é decisão do dono.
- Cabeçalho com onze parágrafos de changelog ("Saiu em…" / "Entrou em…").

## Verificação antes de remover o changelog

Cada parágrafo que sai foi conferido contra o registro que o preserva. Nenhum foi apagado sem lastro:

| Parágrafo do cabeçalho | Registro que o preserva | Conferido |
|---|---|---|
| Última leva (DEC-0803B, 16 itens) | `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md` §DEC-0803B (linha 39) | OK |
| Saiu em 05/08 · ADMINSEP-1 | `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md` §Fechamento do ADMINSEP-1 (linha 91) | OK |
| Saiu em 05/08 à noite · POSSE-EMAIL-1 | mesmo arquivo, §Fechamento do POSSE-EMAIL-1 (linha 121) | OK |
| Saiu em 05/08 · KITLOTE-1 | `02-rodadas/2026-08-05-sem-kit/02-spec-sem-kit.md` §KITLOTE-1 (linha 381) | OK |
| Deploy de 05/08 à noite | `.nirvana/handoffs/leela-deploy-tudo-0805.md` (567 linhas, prova passo a passo) | OK |
| Saiu em 06/08 · 12b, QUALIF-6, 11, HIP-R9-01 + condições de reabertura | `02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md`, Partes 1/2/3, cada uma com §"Condição de reabertura" (linhas 106, 182, 220) | OK |
| Entrou em 06/08 · PERFIL-1 e ACEITE-1 | os dois itens seguem abertos no painel, com texto completo | OK |
| Entrou em 06/08 · PCLIENTE-1 | item aberto no painel + `02-rodadas/2026-08-06-painel-cliente/01-decisoes-dono.md` | OK |
| Correção de contagem + nota do ADMIN-USUARIOS-1 | a nota do ADMIN-USUARIOS-1 **não some**: passa a viver no próprio item, na Fila de construção | OK |
| Entradas de 08/08 (PONTE, VITRINE, SCROLLBAR) | os seis itens seguem abertos no painel, com texto completo | OK |

**Nada precisou ser movido.** Todos os registros já existiam fora do painel.

## Progresso por bloco

| Bloco | Itens | Estado | Commit |
|---|---|---|---|
| A · cabeçalho + LGPD-1 → SERV-1 | 12 | feito | `31c1ec04` |
| B · SERV-2 → SENHA-1 | 12 | feito | `c31bddd1` |
| C · QUALIF-2 → ARENA-1 | 12 | feito | `4cbc575b` |
| D · ARENA-2 → PDF-SPINNER-1 | 12 | feito | `afa465a4` |
| E · CODPED-PODA-1 → COMPROMETIDO-1 | 11 | feito | `a3d0c5bb` |
| F · as 7 ações + ADMIN-USUARIOS-1 + triagem | 8 | feito | (este) |

**67 itens com caso de uso e job story:** 59 + 7 contados, mais o ADMIN-USUARIOS-1 que mora na fila.

## Verificação final

- **Contagem.** 59 H3 em "Decisões que dependem de você", 7 em "Ações que só você pode executar", 14 na "Fila de construção". O cabeçalho diz 66 e bate com a soma contada à mão das duas seções que valem.
- **Cobertura.** Varredura por item: todos os 67 têm exatamente um `Caso de uso` e uma `Job story`, e em todos eles a ordem é caso de uso → job story → o que fica com você. Zero exceções.
- **Forma da job story.** As 67 seguem "Quando…, eu quero…, para…". Nenhuma escrita na voz do dono decidindo.
- **Nada mudou de valor.** Diff de todos os `R$`, contrastes `x,y:1`, percentuais e `RN-xxx` entre `461587ae` e agora: as únicas diferenças são ocorrências que viviam no changelog removido (um `1,13:1` e a `RN-315`, ambos preservados fora do painel) e duas repetições de número que a própria cena repete do parágrafo acima dela (`R$ 10,00` no SERV-1, `R$ 15,00` no SEMKIT-1). Nenhuma linha `**Opções:**` foi tocada, nenhum default mudou.
- **Links da triagem.** As 56 âncoras `[[DECISOES-ABERTAS#…]]` continuam resolvendo contra os H3 do painel. Nenhum título foi renomeado, de propósito.

## O que foi movido em vez de apagado

**Nada.** Todos os onze parágrafos do changelog já tinham registro completo fora do painel, conferido um a um na tabela acima antes da remoção. As três condições de reabertura de 06/08 (estrangeiro, segredos, pré-compra), que o cabeçalho dizia manter "aqui em vez de só no arquivo da rodada", existem em `02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md` como seção própria `### Condição de reabertura` nas Partes 1, 2 e 3.

## Decisões de escrita que valem registro

1. **Quatro itens não tinham cena de pessoa nenhuma.** SEMKIT-1, QUALIF-3, QUALIF-4 e ARENA-2 terminavam o parágrafo com uma frase em itálico que era conclusão técnica, não cenário ("mexer neles não mexe em dinheiro que já entrou", "trocar o nome do diretório produz um diff enorme"). Nesses quatro a frase original ficou onde estava e o caso de uso foi escrito do zero a partir dos fatos do próprio item, em vez de promover uma frase que não descreve ninguém.
2. **O DEPLOY-1 tinha cena vencida.** A frase em itálico dizia "não existe onde um organizador novo clique para entrar", e o adendo de 06/08 do próprio item diz que as telas subiram e que a porta de resgate segue em 404. O caso de uso traz as duas coisas, sem inventar fato nenhum fora do item.
3. **Três frases minhas costuravam oração com travessão** e foram reescritas antes do fechamento (MODAL-1, SEMKIT-1, item 12). Os travessões que sobraram nas cenas vêm do texto original promovido, e ali preservar venceu polir.
4. **A palavra "jornada"** aparece no caso de uso do item 34 porque é o título do próprio item. Não foi introduzida por esta lane.

## Lacunas

Nenhuma job story ficou por escrever. Duas ressalvas honestas:

- **PERFIL-1 e ACEITE-1 dizem "o que fica com você: nada agora".** Escrevi caso de uso e job story para os dois assim mesmo, porque eles estão no painel para o dia em que o assunto voltar e sem a cena o dono não tem como julgar se esse dia chegou. Se a leitura correta for que item sem pergunta aberta não precisa dos dois bullets, é reversível em uma passada.
- **A intro da "Fila de construção" ainda carrega um parágrafo `+05/08`** narrando duas frentes que saíram por terem sido construídas. É changelog pela forma, mas é da seção, não do cabeçalho, e o brief escopou a limpeza ao cabeçalho. Deixei e aponto aqui para a próxima rodada decidir.

## Também tocado

`leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md`, em duas frases só. A vista dizia "o painel está em 60" enquanto o painel dizia 66, e um total que não bate é exatamente o defeito que o painel se cobra. Corrigido para 66, com as dez linhas que faltam nomeadas, mais uma frase avisando que os itens do outro lado do link agora têm caso de uso e job story. **A vista não foi redesenhada** e os 56 blocos dela seguem intactos.

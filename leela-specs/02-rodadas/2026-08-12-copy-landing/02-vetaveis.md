# Vetáveis de voz × defeitos objetivos

Rodada `2026-08-12-copy-landing` · lane `COPY-LANDING-REVIEW`.

Este arquivo existe para o dono gastar atenção só onde ela é insubstituível. Dos 18 achados de
`01-review.md`, **13 são defeitos objetivos** e podem seguir para aplicação sem passar por ele.
**Cinco são voz de marca**, e nenhum deles tem resposta certa fora da cabeça dele.

## O critério

Um achado é **defeito objetivo** quando qualquer leitor informado chega ao mesmo veredito: a frase
contradiz um fato do produto, contradiz outra frase do mesmo produto, quebra uma regra já decidida,
ou o rótulo promete um destino diferente do que o clique entrega. Corrigir não exige gosto.

Um achado é **vetável de voz** quando existe mais de uma resposta defensável e a escolha entre
elas define quem a marca é. Aqui o copywriter propõe e cala; quem decide é o dono.

Um caso que não é nem um nem outro fica registrado à parte: o **G5** é achado de deploy, não de
copy. A frase certa já está escrita no repositório.

---

# Os cinco vetáveis

## V1 · a home inteira (achado B1, e o L4 junto com ele)

**Por que é dele:** D-0802-1 §2 reserva a landing ao dono, com as palavras dele. Nenhuma esteira
mexe no eyebrow, no H1, no CTA do hero, no contador da dobra ou no estado vazio.

**O que esta lane fez:** nada de copy nova. O material de decisão já existe e continua bom —
`02-rodadas/2026-08-02-retomada/02-sugestoes-home-experiencias.md`, com quatro direções fechadas e
uma recomendação (Direção 2 no hero, vocabulário da Direção 1 no resto).

**O que mudou desde 02/08, e por isso volta ao painel:**

1. Dez dias depois, nada foi aplicado. A home segue dizendo `Corrida de rua` e
   `Ache sua próxima corrida e garanta a inscrição em minutos.` enquanto o rodapé da mesma resposta
   HTTP diz `Inscrições para eventos de bem-estar, sem enrolação.`
2. A varredura de hoje achou uma string que faltava naquela tabela: a descrição do root layout
   (`app/layout.tsx:36-37`), que alimenta busca e preview de link em **toda** página sem descrição
   própria — inclusive a do evento e a do produtor.
3. Os números de linha daquele documento envelheceram sete posições. Quem aplicar por número erra
   o alvo.

**A decisão que falta:** qual das quatro direções. Nada mais.

## V2 · como a casa chama quem organiza (achado M1)

**A questão:** organizador, profissional ou produtora?

As três estão no ar, na mesma jornada, a dois cliques uma da outra:

| String | Onde |
|---|---|
| `Criar conta de organizador` | header, todas as páginas públicas |
| `Entrar como organizador` · `Criar conta de organizador` | rodapé, todas as páginas públicas |
| `Painel Profissional` | ponte da conta, `minha-conta` |
| `O endereço da sua produtora é escrito só com esses caracteres.` | recusa de nome na ponte |

**Por que é dele:** "Painel Profissional" é palavra do dono, escolhida de propósito e registrada no
fonte como pedido dele. Trocar as outras duas para casar com ela é uma decisão de posicionamento —
"organizador" descreve a tarefa, "profissional" descreve a pessoa, "produtora" descreve a empresa.
Um produto pode sustentar os três, desde que cada um tenha um papel definido.

**A leitura do copywriter, para o dono ter contra o que decidir.** Os três nomes fazem sentido se
forem três coisas: a **pessoa** é profissional, a **empresa** dela é a produtora, e **organizar** é
o que ela faz. O problema não é o vocabulário, é que hoje ele aparece sem essa hierarquia — o
header vende uma conta de organizador e a ponte entrega um Painel Profissional, sem nenhuma frase
ligando os dois.

Se o dono confirmar essa hierarquia, a troca é pequena e mora no header e no rodapé:

> `Criar conta de organizador` → `Criar conta profissional`
>
> `Entrar como organizador` → `Entrar como profissional`

Se ele preferir que "organizador" continue sendo a porta pública, o conserto é o inverso e mora na
ponte, o que é mais caro e mexe em palavra que ele já escolheu. Nesse caso a recomendação é deixar
como está e registrar a convivência como decidida.

## V3 · o contador de membros quando o club tem zero (achado G4)

**A string no ar:** `0 membros ativos`, em `/@castelo`, no card do `Digital Run Club`.

**Por que é dele:** o número é verdadeiro, e a casa não esconde número verdadeiro por hábito. Mas
um contador é prova social, e zero é prova contra. Decidir se o perfil público de um produtor pode
publicar um zero é decisão de produto.

**As três saídas, com o preço de cada uma:**

| Saída | Copy | Preço |
|---|---|---|
| A — trocar a frase com zero | `Club novo · aceitando membros` | promete que aceita membros; só vale se aceitar mesmo |
| B — sumir com a linha com zero | (nenhuma) | o card fica com uma linha a menos que os outros |
| C — deixar como está | `0 membros ativos` | honesto e frio; o primeiro club de todo produtor nasce assim |

**Recomendação:** B. Ela é a única que não promete nada e não anuncia nada — a mesma disciplina que
a faixa de patrocinadores já usa, sumindo em vez de mostrar estado vazio.

## V4 · "Club" em inglês num produto em português

**As strings:** `Criar Club` (botão da ponte), `Clubs` (aba do perfil), `Nenhum club público`
(estado vazio), `Club` no singular dentro das frases.

**Por que é dele:** anglicismo é escolha de marca, e "Criar Club" é texto exato do dono, na ordem
em que ele escreveu. Não há defeito a apontar.

**O que o copywriter registra, sem propor troca:** a palavra convive hoje com três grafias na mesma
página do perfil — `Clubs` na aba, `club` minúsculo no corpo, `Club` maiúsculo no botão da conta.
Se a palavra fica, vale cravar a grafia num lugar só. Se o dono quiser o par em português, a troca
é `Clube` / `Clubes` e ela atravessa perfil, ponte da conta e painel.

**Recomendação:** manter o anglicismo e padronizar a caixa. `Club` como nome próprio da entidade,
`Clubs` no plural, sempre com maiúscula.

## V5 · nomear o provedor de pagamento na tela (dentro do achado B3)

O **defeito** do B3 é objetivo e não é vetável: a frase
`Inscrição segura · pagamento processado no ambiente Leela` afirma algo que não acontece, porque
quem processa é o Asaas. Isso vai para a fila sem passar pelo dono.

**O que é dele:** se a frase corrigida deve **nomear** o Asaas.

| Saída | Copy | Leitura |
|---|---|---|
| A — nomear com a credencial | `Inscrição segura · pagamento processado pelo Asaas, provedor regulado pelo Banco Central` | mais forte em confiança; empresta reputação de terceiro |
| B — nomear e pronto | `Inscrição segura · pagamento processado pelo Asaas` | honesto e curto; nome desconhecido de metade do público |
| C — não nomear | `Inscrição segura · seus dados de pagamento não ficam com a Leela` | verdadeiro, não empresta ninguém, e é o argumento que mais tranquiliza |

**Recomendação:** A, e por um motivo comercial. Quem compra ingresso online já foi treinado a
procurar o nome do processador; a linha atual não dá esse nome e por isso não fecha a dúvida que
ela existe para fechar.

---

# Os treze defeitos objetivos

Seguem para `03-fila-aplicacao.md` sem depender do dono. Cada um tem a proposta na íntegra em
`01-review.md`.

| # | Achado | Por que é objetivo |
|---|---|---|
| B2 | `Pronto para largar?` fecha toda página de evento | D-0802-1 §3 já decidida; a mesma varredura corrigiu duas telas vizinhas e pulou esta |
| B3 | `pagamento processado no ambiente Leela` | o processamento é do Asaas; a frase afirma o contrário |
| G1 | `Compartilhe este evento` numa página de perfil | não há evento nessa página; o referente não existe |
| G2 | `Minha conta · Leela · Leela` | o sufixo do template entra duas vezes |
| G3 | `Baixar o app` sem destino e sem aviso no toque | o rótulo oferece algo que não existe |
| G6 | `Inscreva-se →` levando à página do evento | o rótulo promete o formulário e entrega leitura |
| M2 | `Painel Profissional` × `painel profissional` no mesmo cartão | um nome, duas caixas, uma tela |
| M3 | `Os valores sobem a cada lote` | a seção não sabe quantos lotes existem nem o próximo preço |
| M4 | `Percursos` rotulando contagem de modalidades | o campo conta modalidade; o rótulo promete percurso |
| M5 | `— sem criar conta` repetido com a mesma pontuação | gate de voz, Categoria 7 (estrutura de template) |
| L1 | `Nenhum evento à vista` | colide com o `à vista` financeiro do mesmo produto |
| L2 | estado vazio de Clubs repete o título | a aba vizinha faz certo e mostra o padrão |
| L3 | wordmark e `Eventos` apontando para `/` | dois rótulos, um destino |

Dois deles carregam uma pergunta pequena que a lane de aplicação precisa levar ao dono **junto com
o código pronto**, e não antes:

- **L2** — a descrição proposta (`os treinos e encontros do grupo aparecem aqui`) supõe o que um
  club faz. Se estiver errado, a frase muda numa palavra.
- **L3** — apontar `Eventos` para `/#eventos` é mudança de destino, não de texto. Aceitar a
  duplicata também é resposta.

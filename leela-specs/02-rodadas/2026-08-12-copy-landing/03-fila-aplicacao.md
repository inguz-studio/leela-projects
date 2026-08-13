# Fila de aplicação — copy da landing

Rodada `2026-08-12-copy-landing` · lane `COPY-LANDING-REVIEW`.
Padrão épico → história → tarefa. Nenhum card aqui foi construído: esta lane é revisão.

**Épico de todos os cards:** [[LEELA-E12-landing]].

⚠️ Os números de história abaixo são **propostos** contra o topo atual do épico (`LEELA-S1250`).
Conferir o índice na abertura da lane de aplicação antes de cravar — o épico é escrito por várias
lanes e a próxima livre pode ter andado.

⛔ **Nenhum card cria, altera ou revoga regra de negócio.** Toda proposta cabe dentro de RN viva:
D-0802-1, SERV-3, RN-559, RN-569. Nenhum número de RN é consumido por esta fila.

---

## Ordem sugerida

| Onda | Histórias | Por quê |
|---|---|---|
| 0 | S1251 | deploy que já existe pronto; destrava a leitura de todo o resto |
| 1 | S1252 · S1253 | as duas frases que afirmam coisa falsa ao comprador |
| 2 | S1254 · S1255 | consistência de vocabulário e de rótulo, tudo texto |
| 3 | S1256 | a home, e só quando o dono decidir a direção |

---

# S1251 · o renome do Serviço chega ao ar

**Entrega:** o que a produção serve passa a bater com o que o repositório diz desde `37e5c0ca`.
**Espera:** nada. É deploy da landing, não código.
**Régua:** SERV-3.

Hoje o ar serve `+ taxa de serviço` em cinco lugares e `+ Serviço` em nenhum. As duas frases da
etapa 0 do checkout também estão na versão antiga.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1251-T1 | deploy da landing a partir do `main` corrente | `curl` da página do evento e da `/inscricao` sem nenhuma ocorrência de `taxa de serviço`, e com `+ Serviço` presente |
| S1251-T2 | gate visual da página no ar depois do deploy | tela renderizada conferida em navegador, não prova estática |

⚠️ Este card não é de copy. Ele entra na fila porque a revisão o descobriu, e porque sem ele a
próxima varredura vai propor de novo o que já foi feito.

---

# S1252 · o checkout para de afirmar onde o pagamento é processado

**Entrega:** a única linha de confiança do checkout público passa a dizer a verdade.
**Espera:** V5 de `02-vetaveis.md` (o dono escolhe entre nomear o Asaas ou não).
**Régua:** prova e honestidade.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1252-T1 | troca a string de `CheckoutFlow.tsx:2337` pela escolhida em V5 | a etapa 0 pública, no ar, não afirma que o processamento acontece dentro da Leela |
| S1252-T2 | varredura da mesma afirmação nas outras superfícies do produto | busca por `ambiente Leela` em `apps/` volta vazia, ou cada sobrevivente tem veredito escrito |

**String atual, na íntegra:** `Inscrição segura · pagamento processado no ambiente Leela`
**Proposta recomendada:** `Inscrição segura · pagamento processado pelo Asaas, provedor regulado pelo Banco Central`

---

# S1253 · o bloco de compartilhar diz o que está sendo compartilhado

**Entrega:** o `ShareBlock` deixa de chamar um perfil de evento.
**Espera:** nada.
**Régua:** contrato de escrita (específico > vago) e D-0802-1.

O componente é reusado em duas superfícies e carrega o texto de uma delas. Este é o único card da
fila que mexe em assinatura de componente, e mesmo assim de forma aditiva.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1253-T1 | `ShareBlock` ganha `titulo` e `apoio` opcionais, com o texto do evento como padrão | nenhum consumidor existente muda de comportamento sem passar prop |
| S1253-T2 | `PerfilView.tsx:410` passa o par de strings do perfil | `/@castelo` no ar mostra `Compartilhe este perfil` |
| S1253-T3 | o apoio do evento perde a presunção de treino | `grupo de treino` some das duas superfícies |

**Strings atuais, na íntegra:**
`Compartilhe este evento` · `Mande o link para o grupo de treino ou aponte a câmera no QR.`

**Propostas, na íntegra:**
Evento: `Compartilhe este evento` · `Mande o link para quem vai com você ou aponte a câmera no QR.`
Perfil: `Compartilhe este perfil` · `Mande o link para quem acompanha a agenda ou aponte a câmera no QR.`

---

# S1254 · o vocabulário de experiência fecha as lacunas da varredura anterior

**Entrega:** as três telas que a varredura S1218-T3 pulou entram na mesma língua das vizinhas.
**Espera:** nada. D-0802-1 §3 já está decidida e já foi aplicada ao redor destas telas.
**Régua:** D-0802-1 §3 e gate de voz Categoria 7.

⛔ Nenhuma tarefa deste card toca a home. A home é V1 e mora na S1256.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1254-T1 | dobra de fechamento do evento (`CheckoutCtaSection.tsx:26` e `:30`) | a página de um retiro não pergunta se a pessoa está pronta para largar; `percurso` sai do apoio |
| S1254-T2 | seção Sobre (`SobreSection.tsx:24-25`) | o rótulo passa a nomear o que o campo conta |
| S1254-T3 | estado vazio do perfil (`PerfilView.tsx:260`) | `à vista` deixa de ter dois sentidos no mesmo produto |
| S1254-T4 | estado vazio de Clubs (`PerfilView.tsx:290-291`) | a descrição informa em vez de repetir o título |

**Strings atuais e propostas, na íntegra:**

| Atual | Proposta |
|---|---|
| `Pronto para largar?` | `Bora garantir sua vaga?` |
| `Garanta sua vaga em poucos passos — sem criar conta. Você escolhe o percurso e o kit na hora.` | `Poucos passos e sem criar conta. Você escolhe a modalidade e o kit na hora.` |
| `Percursos` / `2 distâncias` | `Modalidades` / `2 modalidades` |
| `Nenhum evento à vista` | `Nenhuma experiência marcada` |
| `Os clubs públicos deste organizador aparecem aqui.` | `Quando este organizador abrir um club, os treinos e encontros do grupo aparecem aqui.` |

⚠️ A frase do T4 supõe o que um club faz. Levar ao dono junto com o código pronto, não antes.

---

# S1255 · os rótulos passam a dizer o que acontece depois do clique

**Entrega:** três rótulos que prometem uma coisa e entregam outra, e um nome próprio que muda de
caixa dentro do mesmo cartão.
**Espera:** o T3 espera V3 de `02-vetaveis.md`.
**Régua:** CTA por intenção, prova e honestidade, contrato de escrita.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1255-T1 | `Baixar o app` vira `App em breve` e perde o `title` de hover (`PublicHeader.tsx:88-93`) | no celular, sem hover, a pessoa lê o estado sem tentar tocar |
| S1255-T2 | `Minha conta · Leela` vira `Minha conta` (`minha-conta/page.tsx:30`) | a aba do navegador mostra `Minha conta · Leela`, uma vez só |
| S1255-T3 | o contador de membros com zero, conforme V3 | a saída escolhida aplicada em `PerfilView.tsx:222-224` |
| S1255-T4 | `Painel Profissional` fica com uma caixa só nas cinco ocorrências de `PortasDaConta.tsx` | busca por `painel profissional` minúsculo volta vazia no arquivo |
| S1255-T5 | `Os valores sobem a cada lote` vira condicional (`LotesSection.tsx:25`) | a frase não afirma alta num evento de lote único |
| S1255-T6 | wordmark e `Eventos` deixam de disputar o mesmo destino (`PublicHeader.tsx:65-70`) | ou `Eventos` aponta para `/#eventos`, ou a duplicata fica registrada como aceita |

**A proposta da T5, na íntegra:**
`Este é o preço vigente hoje. Quando o lote virar, por data ou por vagas, o valor muda.`

⚠️ O `Inscreva-se →` da vitrine (achado G6) **não está** neste card. Ele mora na home e vai na
S1256, com o resto do que é do dono, porque aplicá-lo sozinho deixaria a vitrine falando uma língua
e o hero falando outra.

---

# S1256 · a home ganha a direção que o dono escolher

**Entrega:** a edição única da home, com hero, rótulos de plataforma, `<title>`, OG e descrição do
root layout na mesma passada.
**Espera:** ⛔ **V1 de `02-vetaveis.md`.** Este card não abre sem o dono escolher a direção.
**Régua:** D-0802-1, incluindo o §2 que reserva a superfície a ele.

**Não há proposta de copy aqui.** O texto pronto para colar já existe, nas quatro direções de
`02-rodadas/2026-08-02-retomada/02-sugestoes-home-experiencias.md`.

| Tarefa | O que faz | Aceite |
|---|---|---|
| S1256-T1 | aplica a direção escolhida no hero (`page.tsx:83`, `:86`, `:89-90`, `:98`) | o HTML servido não contradiz o rodapé da mesma resposta |
| S1256-T2 | rótulos de plataforma: dobra, contador e estado vazio (`page.tsx:111`, `:115`, `:125`) | vocabulário único entre hero, dobra e vazio |
| S1256-T3 | `<title>`, OG e Twitter (`layout.tsx:33`, `page.tsx:59`, `:61`, `:65`, `:67`) | o snippet de busca e a página dizem a mesma coisa |
| S1256-T4 | **a descrição do root layout** (`layout.tsx:36-37`) | a página do evento e a do produtor param de herdar descrição de corrida |
| S1256-T5 | `Inscreva-se →` do card da vitrine (`page.tsx:41`) | o rótulo nomeia o destino real, que é a página do evento |

⚠️ A **T4 é a tarefa que a rodada de 02/08 não tinha**. A tabela daquele documento cita
`app/layout.tsx:32` só para o `<title>`; a descrição do root ficou de fora e é ela que vaza para as
outras rotas.

⚠️ Os números de linha do documento de 02/08 estão sete posições defasados. Aplicar pelas linhas
desta fila, não pelas de lá.

---

## O que esta fila deliberadamente não contém

Escrito para ninguém reabrir depois achando que passou batido.

- **Nome, descrição, modalidades e regulamento dos eventos.** Conteúdo do organizador. A
  meia-floripa é uma corrida e continua se chamando assim. Mesma fronteira que a rodada de 02/08
  cravou.
- **A bio do produtor.** `Corridas, MTB, trail e bem-estar em Florianópolis. Calendário da temporada
  logo abaixo.` é texto de quem organiza, servido intacto. Não é copy da casa.
- **Comentários de código e nomes de variável.** `euCorro`, `CardAtleta`, `janelasEntrega` e os
  `alt` já corrigidos não são lidos por ninguém que compra. Trocá-los é custo sem leitor.
- **Regra de negócio.** `a partir de R$ 10,00` (RN-559) e o nome `Serviço` (SERV-3) aparecem nas
  propostas exatamente como estão hoje. Nenhuma linha desta fila os toca.

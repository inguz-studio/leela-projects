# Revisão de copy da landing — o copywriter da casa

Rodada `2026-08-12-copy-landing` · lane `COPY-LANDING-REVIEW` · trace `leela-copy-landing-20260812`.
Persona: copywriter da casa (`squads/nyx-linkedin/agents/linkedin-copywriter.md`), com a régua de
voz do guardian (`linkedin-voice-guardian.md`) aplicada a cada proposta.

**Esta lane não altera código.** Cada string proposta está aqui na íntegra, para o dono vetar
barato. A aplicação é lane futura, e a fila dela está em `03-fila-aplicacao.md`.

## Como as superfícies foram lidas

Três páginas no ar, puxadas do domínio de produção em 12/08, e o fonte correspondente em
`apps/landing/app/`. O brief apontava `apps/landing/src/`, que não existe: o App Router da landing
mora em `app/`, sem pasta `src`. Toda âncora abaixo usa o caminho real.

| Superfície | URL | O que a página serviu |
|---|---|---|
| Vitrine | `https://leela-landing.web.app/` | hero, dobra de eventos com 1 card, header, rodapé |
| Evento | `https://leela-landing.web.app/teste-taxa-repassada` | hero mínimo, "Organizado por", compartilhar, barra fixa |
| Produtor | `https://leela-landing.web.app/@castelo` | identidade, abas Feed · Eventos · Clubs, compartilhar |
| Topo do funil | `.../teste-taxa-repassada/inscricao` | etapa 0 pública, antes do dinheiro |

Um aviso que muda a leitura de tudo o que segue. O único evento publicado hoje é um evento de
teste **sem seções configuradas**, então a página dele cai no `HeroMinimo` e as sete dobras da
página completa (Sobre, Modalidades, Lotes, Kits, Regulamento, Galeria, CTA de fechamento) **não
estão no ar**. Elas estão no fonte, servidas a qualquer evento que o organizador montar, e é por
isso que os achados delas entram aqui com a mesma severidade: o defeito é código vivo esperando o
primeiro evento real.

## Contagem

| Severidade | Quantos | Vetáveis de voz | Defeitos objetivos |
|---|---|---|---|
| Bloqueador | 3 | 1 | 2 |
| Grave | 6 | 1 | 5 |
| Médio | 5 | 1 | 4 |
| Baixo | 4 | 2 | 2 |
| **Total** | **18** | **5** | **13** |

O corte entre as duas colunas está em `02-vetaveis.md`, com o critério escrito.

---

# Bloqueadores

## B1 · a home diz "corrida" onde a plataforma diz "experiência", e se contradiz duas dobras abaixo

**Régua:** D-0802-1 (categoria = experiência; participante = quem compra).
**Status especial:** a home é **reservada ao dono** por D-0802-1 §2. Esta lane não propõe copy
nova para ela.

Strings no ar hoje, na íntegra:

| Onde | String atual | Arquivo:linha |
|---|---|---|
| Eyebrow | `Corrida de rua` | `app/(public)/page.tsx:83` |
| H1 | `Ache sua próxima corrida e garanta a inscrição em minutos.` | `page.tsx:86` |
| Estado vazio | `Quando um organizador publicar uma corrida, ela aparece aqui na hora.` | `page.tsx:125` |
| `<title>` e OG | `Leela — inscrições para corridas` | `app/layout.tsx:33` · `page.tsx:59` · `page.tsx:65` |
| Descrição OG/Twitter | `Encontre corridas de rua, escolha seu percurso e garanta sua inscrição em minutos.` | `page.tsx:61` · `page.tsx:67` |
| Descrição do root | `A plataforma onde você encontra corridas de rua, escolhe seu percurso e garante sua inscrição em minutos.` | `app/layout.tsx:36-37` |
| Rodapé, duas dobras abaixo | `Inscrições para eventos de bem-estar, sem enrolação.` | `app/components/PublicFooter.tsx:49` |

O material de decisão já existe e é bom: `02-rodadas/2026-08-02-retomada/02-sugestoes-home-experiencias.md`
traz quatro direções fechadas, cada uma com texto pronto para colar, e uma recomendação. Repetir
aquele trabalho aqui seria desperdício. **O que esta revisão acrescenta são duas coisas que aquele
documento não tem**, e as duas importam para quem for aplicar:

1. **A descrição do root layout (`layout.tsx:36`) não está na tabela de 02/08.** Ela é o texto que
   alimenta busca e preview de link em toda página que não define descrição própria, incluindo a
   do evento e a do produtor. Trocar o `<title>` e esquecer dela deixa o snippet do Google
   anunciando corrida na página de um retiro.
2. **Os números de linha daquele documento envelheceram.** Ele cita `page.tsx:76/79/82/90/104/118`;
   hoje as mesmas strings estão em `83/86/89/98/111/125`. Quem aplicar por número de linha erra o
   alvo em sete lugares.

A contradição é medível e piorou: o rodapé fala de bem-estar desde a lane C1, e o cabeçalho `<head>`
da mesma resposta HTTP fala de corrida. A página se desmente para o leitor humano e para o robô de
busca ao mesmo tempo.

## B2 · a página do evento fecha perguntando se você está pronto para largar

**Régua:** D-0802-1 §3 (copy de plataforma, não conteúdo do organizador).
**Superfície:** dobra de fechamento, servida a **todo** evento com seções.

String atual, na íntegra:

> `Pronto para largar?`
>
> `Garanta sua vaga em poucos passos — sem criar conta. Você escolhe o percurso e o kit na hora.`

`app/(public)/[eventSlug]/sections/CheckoutCtaSection.tsx:26` e `:30`.

Dois defeitos numa dobra só. "Largar" é o gesto de uma prova, e esta seção é a mesma para o retiro
de respiração — a pessoa que entrou para reservar uma vaga num retiro lê a casa perguntando se ela
está pronta para largar. E "percurso" já foi aposentado: a varredura S1218-T3 trocou "Escolha seu
percurso" por "Modalidades disponíveis" em `ModalidadesSection.tsx:26` e por "Escolha a modalidade
e o kit de cada participante" em `StepModalidadeKit.tsx:209`, citando D-0802-1 no comentário das
duas. Esta dobra ficou de fora. A mesma página fala duas línguas sobre a mesma escolha, e é a
segunda vez que isso é registrado.

Proposta, na íntegra:

> `Bora garantir sua vaga?`
>
> `Poucos passos e sem criar conta. Você escolhe a modalidade e o kit na hora.`

Se o dono preferir manter o tom de pergunta sem gíria, a alternativa é `Vamos garantir sua vaga?`.
O ramo fechado (`Fique de olho na próxima edição` / `As inscrições deste evento estão encerradas.
Salve o link para acompanhar novidades.`) está correto e não muda.

## B3 · a única linha de confiança do checkout afirma algo que não acontece

**Régua:** prova e honestidade (a casa não exibe promessa sem lastro).
**Superfície:** rodapé do checkout, **público, na etapa 0**, antes do dinheiro. Confirmado no ar.

String atual, na íntegra:

> `Inscrição segura · pagamento processado no ambiente Leela`

`app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx:2337`.

O pagamento é processado pelo **Asaas**. A RN-157 amarra a validade da cobrança ao `expiresIn` do
provedor, a RN-176 descreve o caminho de cartão internacional como "restrição do caminho Asaas", e
as Functions de cobrança vivem em `functions/src/checkout/createInscricaoCharge.ts`. Nada disso é
segredo nem defeito — é a arquitetura correta. O defeito é a frase, que fica sozinha sob o
wordmark, no lugar onde o comprador procura a garantia, e afirma que o processamento acontece
dentro da Leela.

Isso é o pior tipo de linha de confiança: a que fica frágil justo quando alguém a checar. E ela
desperdiça o argumento verdadeiro, que é mais forte — o dinheiro passa por um processador
regulado, não pela plataforma.

Proposta, na íntegra:

> `Inscrição segura · pagamento processado pelo Asaas, provedor regulado pelo Banco Central`

Versão curta, se a linha precisar caber em telas estreitas:

> `Inscrição segura · pagamento processado pelo Asaas`

⛔ Antes de aplicar, confirmar com o dono se nomear o provedor na tela é desejado. Se não for, a
saída honesta é remover a afirmação de onde o processamento acontece e ficar só com o fato que a
casa sustenta: `Inscrição segura · seus dados de pagamento não ficam com a Leela`.

---

# Graves

## G1 · a página do produtor manda compartilhar "este evento"

**Régua:** contrato de escrita (específico > vago) e D-0802-1.
**Confirmado no ar** em `/@castelo`.

Strings atuais, na íntegra:

> `Compartilhe este evento`
>
> `Mande o link para o grupo de treino ou aponte a câmera no QR.`

`app/(public)/[eventSlug]/ShareBlock.tsx:44` e `:47`, reusado em
`app/(public)/_perfil/PerfilView.tsx:410` com `nome={perfil.nome}`.

O reuso do componente foi a decisão certa; o texto dentro dele é que nasceu amarrado a uma
superfície. Numa página de produtor, "este evento" não tem referente: a página é um perfil com
calendário, feed e clubs. Quem chega pelo link da bio lê uma frase sobre um evento que não está
ali.

E "grupo de treino" é a segunda camada do mesmo erro, essa em **duas** superfícies. Treino é o que
se faz para uma prova. A frase presume que quem compartilha corre, e ela é servida ao perfil de
quem organiza retiro.

Proposta, na íntegra — o bloco passa a receber o que está compartilhando:

Na página do evento:
> `Compartilhe este evento`
>
> `Mande o link para quem vai com você ou aponte a câmera no QR.`

Na página do produtor:
> `Compartilhe este perfil`
>
> `Mande o link para quem acompanha a agenda ou aponte a câmera no QR.`

Custo de aplicação: duas props novas no `ShareBlock` (título e apoio), com o texto do evento como
padrão. Nenhuma regra de negócio é tocada.

## G2 · o título da aba de "Minha conta" repete a marca

**Régua:** defeito objetivo. **Confirmado no ar.**

O que o navegador mostra hoje, na íntegra:

> `Minha conta · Leela · Leela`

Causa: `app/(public)/minha-conta/page.tsx:30` define `title: 'Minha conta · Leela'` enquanto o
root layout já aplica `template: '%s · Leela'` (`app/layout.tsx:34`). O sufixo entra duas vezes.

Proposta, na íntegra — trocar o valor do campo para:

> `Minha conta`

O template resolve o resto e o resultado vira `Minha conta · Leela`. As demais rotas já fazem
assim, então esta é a única fora do padrão.

## G3 · "Baixar o app" é um rótulo morto, e no celular ele nunca se explica

**Régua:** prova e honestidade (não prometer o que não existe).
**Confirmado no ar** em todas as páginas públicas.

String atual, na íntegra:

> `Baixar o app`

`app/components/PublicHeader.tsx:88-93`. É um `<span>` com `title="Em breve"`, desenhado como
pílula ao lado de ações reais.

O `title` só aparece no hover, que não existe em toque. No celular a pessoa lê uma oferta, tenta
tocar e não acontece nada — sem aviso, sem destino, sem explicação. O comentário no fonte já o
chama de placeholder pré-existente; ele está no ar mesmo assim.

Proposta, na íntegra — o rótulo passa a dizer o estado, e a promessa some do modo imperativo:

> `App em breve`

E o `title` some junto, porque o rótulo passa a carregar a informação sozinho. Se o dono preferir
tirar o item do header enquanto o app não existe, essa é a opção mais limpa das duas e não custa
copy nenhuma.

## G4 · o perfil publica "0 membros ativos" como se fosse informação

**Régua:** prova e honestidade. **Confirmado no ar** em `/@castelo`, no card do `Digital Run Club`.

String atual, na íntegra:

> `0 membros ativos`

`app/(public)/_perfil/PerfilView.tsx:222-224`.

O número é verdadeiro, e é exatamente por isso que ele machuca. Um contador é prova social; quando
ele marca zero, ele vira prova contra. A casa acertou em nunca inventar número — a decisão que
falta é se o zero merece linha própria numa página que alguém abre pelo link da bio.

Proposta, na íntegra — a linha só aparece com pelo menos um membro; com zero, o card mostra o que
o club é em vez de quantos tem:

> `Club novo · aceitando membros`

⛔ Vetável: o dono pode preferir a linha some por completo com zero, e essa é decisão de produto,
não de redação. As duas saídas estão em `02-vetaveis.md`.

## G5 · o renome do Serviço está construído e não está no ar

**Régua:** SERV-3 (decidido em 11/08 — "Serviço" nomeia a taxa Leela em toda superfície).

O fonte já foi renomeado no commit `37e5c0ca`, em cinco lugares:
`sections/HeroSection.tsx:114`, `sections/HeroMinimo.tsx:77`, `sections/CheckoutCtaSection.tsx:45`,
`sections/LotesSection.tsx:36` e `[eventSlug]/page.tsx:255`, todos servindo ` + Serviço`. O
checkout também: `StepModalidadeKit.tsx:223`, `StepResumo.tsx:384` e `StepConfirmacao.tsx:255`.

**O que a produção serve hoje, na íntegra:**

> `+ taxa de serviço`

Quatro ocorrências na página do evento, uma no topo do funil de inscrição. Zero ocorrências de
"+ Serviço".

Não há copy a propor: a copy certa já existe no repositório. O que falta é deploy da landing.
Registrar aqui porque uma revisão de copy que lê só o fonte teria dado o item por fechado, e uma
que lê só o ar teria proposto de novo o que já foi feito.

## G6 · o card da vitrine diz "Inscreva-se" e entrega a página do evento

**Régua:** CTA por intenção (o rótulo diz o que acontece depois do clique).
**Confirmado no ar.** **Superfície reservada ao dono** por D-0802-1 §2 — o defeito, porém, é
funcional, não de gosto.

String atual, na íntegra, no rodapé de cada card:

> `Inscreva-se →`

`app/(public)/page.tsx:41` (a função `ctaEstado`), renderizada em `page.tsx:187`. O destino do
card é `href={`/${ev.slug}`}` (`page.tsx:134`), que é a página do evento — não o formulário de
inscrição, que vive em `/{slug}/inscricao`.

O rótulo promete o formulário e entrega uma página de leitura. Quem clica esperando começar a
inscrição gasta um passo a mais e descobre que precisa achar outro botão. O ramo fechado do mesmo
seletor está correto (`Ver detalhes`), e é justamente ele que mostra qual era o padrão.

Proposta, na íntegra — o rótulo passa a nomear o destino real, e o convite fica no botão que
realmente inscreve:

> `Ver evento →`

A alternativa, se o dono quiser preservar o convite na vitrine, é apontar o card direto para
`/{slug}/inscricao` quando o estado for `aberto`. Isso muda comportamento, não texto, e por isso
não é proposta desta lane.

---

# Médios

## M1 · a mesma pessoa tem três nomes na mesma jornada

**Régua:** contrato de escrita (consistência) e CTA por intenção.

Strings atuais, na íntegra, todas em superfície pública:

| String | Arquivo:linha |
|---|---|
| `Criar conta de organizador` | `app/components/PublicHeader.tsx:83` |
| `Entrar como organizador` | `app/components/PublicFooter.tsx:76` |
| `Criar conta de organizador` | `PublicFooter.tsx:82` |
| `Painel Profissional` | `app/(public)/minha-conta/PortasDaConta.tsx:157` |
| `Criar Club` · `Organizar eventos` | `PortasDaConta.tsx:170-171` |
| `O endereço da sua produtora é escrito só com esses caracteres.` | `PortasDaConta.tsx` (recusa `nome_profissional_invalido`) |

Organizador no header e no rodapé, profissional na ponte da conta, produtora na recusa. São três
palavras para o mesmo papel, e a pessoa atravessa as três em dois cliques. Nenhuma delas está
errada isolada; juntas, elas fazem o produto parecer três produtos.

⛔ Vetável: escolher qual das três é a palavra da casa é decisão do dono, e "Painel Profissional"
já é palavra dele. A proposta está em `02-vetaveis.md`, com o mapa completo de onde cada troca
morde.

## M2 · "Painel Profissional" muda de caixa dentro do mesmo cartão

**Régua:** contrato de escrita (sentence case; nome próprio estável).

Strings atuais, na íntegra, todas em `app/(public)/minha-conta/PortasDaConta.tsx`:

> `Painel Profissional` (título do lugar, linha 157)
>
> `Ir para o painel profissional` (link, fluxo A)
>
> `O painel profissional já é seu` (título do fluxo pronto)
>
> `Entre com o e-mail da sua conta para conhecer o painel profissional.` (recusa `sessao_anonima`)
>
> `Não conseguimos abrir o painel profissional agora. Tente de novo em instantes.` (recusa `indisponivel`)

O mesmo objeto aparece capitalizado uma vez e minúsculo quatro, no mesmo cartão. Ou é nome
próprio, e é sempre `Painel Profissional`; ou é descrição, e é sempre `painel profissional`.

Proposta, na íntegra — tratar como nome próprio do lugar, que é o que a decisão do dono estabeleceu,
e ajustar as quatro ocorrências restantes:

> `Ir para o Painel Profissional`
>
> `O Painel Profissional já é seu`
>
> `Entre com o e-mail da sua conta para conhecer o Painel Profissional.`
>
> `Não conseguimos abrir o Painel Profissional agora. Tente de novo em instantes.`

## M3 · a dobra de lotes afirma uma alta que a página não prova

**Régua:** prova e honestidade (mecanismo sem lastro no dado).

Strings atuais, na íntegra:

> `Garanta o preço do lote atual`
>
> `Os valores sobem a cada lote conforme a data e as vagas. Este é o preço vigente hoje.`

`app/(public)/[eventSlug]/sections/LotesSection.tsx:21` e `:25`.

A seção mostra **um** número, o `precoMinimo` vigente. Ela não lista os lotes, não mostra o
próximo preço e não sabe quantos lotes existem. A frase, mesmo assim, afirma no presente que os
valores sobem. Num evento de lote único ela é falsa; num evento com lotes de preço igual, também.
Urgência que a própria página não sustenta é o tipo de promessa que só custa quando alguém
confere.

Proposta, na íntegra — a mecânica vira condicional, e o fato vira o que a página realmente tem:

> `Garanta o preço do lote atual`
>
> `Este é o preço vigente hoje. Quando o lote virar, por data ou por vagas, o valor muda.`

## M4 · a seção "Sobre" rotula modalidade como percurso e distância

**Régua:** D-0802-1 §3 (mesma família do B2).

Strings atuais, na íntegra:

> `Percursos`
>
> `2 distâncias`

`app/(public)/[eventSlug]/sections/SobreSection.tsx:24-25`. O valor é gerado a partir de
`evento.modalidades.length`, com singular `distância`.

O campo conta modalidades e o rótulo promete percursos. Num retiro com duas modalidades de
prática, a página anuncia duas distâncias que não existem. Mesma lacuna de varredura do B2:
`ModalidadesSection.tsx` foi corrigido, esta seção não.

Proposta, na íntegra:

> `Modalidades`
>
> `2 modalidades`

Com singular `1 modalidade`.

## M5 · a mesma cláusula, com a mesma pontuação, em duas superfícies

**Régua:** gate de voz da casa, Categoria 7 (estrutura de template) e contrato de escrita
(empilhamento de travessão).

Strings atuais, na íntegra:

> `Percurso, kit e retirada num lugar só. Você escolhe a distância, a gente cuida do resto — sem criar conta para começar.`
> `app/(public)/page.tsx:89-90`

> `Garanta sua vaga em poucos passos — sem criar conta. Você escolhe o percurso e o kit na hora.`
> `sections/CheckoutCtaSection.tsx:30`

Travessão seguido de "sem criar conta", nas duas. Estrutura idêntica, argumento idêntico, duas
telas da mesma jornada. Quem lê as duas na mesma sessão sente o molde antes de sentir o
argumento, e é exatamente esse o tell que o gate de Categoria 7 caça.

A proposta do B2 já resolve o lado da página do evento, trocando o travessão por ponto final
(`Poucos passos e sem criar conta.`). O lado da home é reservado ao dono; fica registrado para
entrar na mesma edição.

Fora esses dois, a varredura de Categoria 7 nas quatro superfícies **não achou mais nada**: sem
paralelismo negativo, sem abertura de chat, sem superlativo vazio, sem Title Case em heading. O
`AVISO_SEGUNDO_LOGIN` (`O painel vai pedir sua senha de novo — é a mesma conta e o mesmo e-mail.`)
e a nota da galeria (`Imagens de exemplo — as fotos do organizador aparecem aqui.`) usam um
travessão cada, dentro do orçamento, e os dois ganham clareza com ele. Ficam como estão.

---

# Baixos

## L1 · "Nenhum evento à vista" colide com o "à vista" do pagamento

String atual, na íntegra:

> `Nenhum evento à vista`

`app/(public)/_perfil/PerfilView.tsx:260`.

O mesmo produto usa "à vista" com o sentido financeiro em `SeletorForma.tsx:82`
(`À vista ou parcelado, com aprovação imediata.`). A expressão é boa; ela só está no produto
errado.

Proposta, na íntegra:

> `Nenhuma experiência marcada`

Com a descrição existente mantida, que já está certa: `Quando este organizador publicar uma
experiência, ela aparece aqui na linha do tempo.`

## L2 · o estado vazio de Clubs repete o título e não informa nada

Strings atuais, na íntegra:

> `Nenhum club público`
>
> `Os clubs públicos deste organizador aparecem aqui.`

`app/(public)/_perfil/PerfilView.tsx:290-291`.

A descrição diz de novo o que o título já disse. Duas abas ao lado, o Feed faz o oposto e é o
padrão bom da casa: `Quando este organizador publicar, os avisos e bastidores das experiências
aparecem aqui.` — ele conta o que vai aparecer.

Proposta, na íntegra:

> `Nenhum club público`
>
> `Quando este organizador abrir um club, os treinos e encontros do grupo aparecem aqui.`

⛔ Conferir com o dono se "treinos e encontros" descreve o que um club faz. A frase precisa nascer
do produto, não da suposição do copywriter.

## L3 · o header tem dois links diferentes para o mesmo lugar

Strings atuais, na íntegra, lado a lado no header:

> o wordmark, com `aria-label="Leela — página inicial"`, apontando para `/`
>
> `Eventos`, apontando para `/`

`app/components/PublicHeader.tsx:51-62` e `:65-70`.

Dois alvos, um destino, rótulos diferentes. Quem clica em "Eventos" espera uma lista de eventos e
recebe a home inteira, hero incluído. Hoje o efeito é pequeno porque a home é a lista; quando a
vitrine ganhar página própria ou filtro, o rótulo passa a mentir sozinho.

Proposta, na íntegra — apontar para a âncora que já existe na home, que é o comportamento que o
rótulo promete:

> `Eventos` → `href="/#eventos"`

Isso é mudança de destino, não de texto, e vale só se a lane de aplicação concordar. A alternativa
sem código é aceitar a duplicata e registrá-la.

## L4 · o CTA do hero não diz que vai rolar a mesma página

String atual, na íntegra:

> `Ver eventos`

`app/(public)/page.tsx:98`, com `href="#eventos"`.

O rótulo soa navegação e entrega rolagem de uma dobra. Com um card na grade, ele custa mais
atenção do que economiza.

⛔ Vetável e reservado: a home é do dono, e o documento de 02/08 já propõe `Ver experiências` para
esta mesma string. Fica registrado para entrar na mesma edição, e não como proposta separada.

---

## O que está certo e não deve ser mexido

Registrado de propósito, porque revisão que só aponta erro faz a próxima lane consertar o que
estava bom.

- **A honestidade dos mocks.** `Imagens de exemplo — as fotos do organizador aparecem aqui.`
  (`GaleriaSection.tsx:42`) e o duplo rótulo de exemplo do feed (`SecaoFeed.tsx:61` e o `Badge`
  em `:68`) declaram o que é placeholder sem pedir desculpa. É o padrão que o resto da landing
  deveria seguir.
- **A nota da taxa nos dois ramos.** `StepModalidadeKit.tsx:223-224` responde a pergunta "e a
  taxa?" tanto quando o evento repassa quanto quando não repassa, sem revelar percentual. O
  silêncio de um dos ramos teria sido a saída fácil.
- **A frase do segundo login.** `O painel vai pedir sua senha de novo — é a mesma conta e o mesmo
  e-mail.` (`PortasDaConta.tsx:150`) antecipa a confusão em vez de esperar o suporte.
- **O kit é retirada, e a tela diz isso.** `O tamanho do kit é confirmado na retirada, nas janelas
  do evento.` e a dobra `Retirada do kit` / `Leve um documento com foto. Confira os horários por
  dia:` (`RetiradaSection.tsx:19` e `:21`) estão conformes à RN-569 e ao Leva 9.

## Varredura de envio (Leva 9 · RN-569)

A régua manda tratar qualquer promessa de envio como defeito prioritário. **A varredura da copy
renderizada não achou nenhuma.** Foram lidas as quatro superfícies no ar e todo o fonte de
`apps/landing/app/`, procurando enviar, envio, entrega, entregue, frete, correio, remessa,
despacho e "receber em casa".

O que apareceu, e por que cada um fica:

| Ocorrência | Onde | Veredito |
|---|---|---|
| `janelasEntrega` | `RetiradaSection.tsx:10` (comentário) | nome de campo, invisível ao usuário |
| `Enviamos a confirmação para {email}` | `EstadosDaArea.tsx:87` | envio de mensagem, legítimo pela própria RN-569 |
| `Enviar novo link` · `Reenviar confirmação` | `DefinirSenhaFlow.tsx:437` · `EstadosDaArea.tsx:111` | idem |
| `O comprovante da compra e os ingressos são enviados ao e-mail do responsável` | `AceitesCompra.tsx:59` | idem |
| `O comprovante e os ingressos vão para este e-mail.` | `StepDados.tsx:357` | idem |
| `Retirada do kit` · `O tamanho do kit é confirmado na retirada` | `RetiradaSection.tsx:19` · `StepModalidadeKit.tsx` | conforme |

Zero promessas de envio físico na landing. A frente que a Leva 9 abre mora em outros consumidores,
não neste.

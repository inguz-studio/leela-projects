# Aplicação da copy da landing — o copywriter da casa aplicando a própria review

Rodada `2026-08-12-copy-landing` · lane `COPY-APPLY` · trace `leela-copy-landing-20260812`.
Persona: copywriter da casa (`squads/nyx-linkedin/agents/linkedin-copywriter.md`), com a régua do
guardian (`linkedin-voice-guardian.md`) passada em cada string nova.

Esta lane **altera código**. Ela paga os 13 defeitos objetivos de `01-review.md` e abre a home,
que deixou de ser vetável na noite de 12/08. Os quatro vetáveis restantes seguem intactos em
`02-vetaveis.md`, esperando o dono.

⛔ **Nenhum deploy.** As strings novas sobem no próximo pacote, junto do SERV-3 que já espera na
S1251. E a **review antagonista não é desta lane**: a régua da casa proíbe anunciar conserto sem
revisão, então o delta vai fechado no handoff para o maestro despachar a REV em contexto fresco.

---

## A régua de tom, extraída das fontes dele antes de qualquer string

A direção da noite de 12/08 pediu o tom dele, e tom não se adivinha. As cinco linhas abaixo saíram
das palavras do próprio dono, cada uma com a fonte ao lado. Toda string desta lane foi conferida
contra elas.

| # | A régua | De onde ela sai |
|---|---|---|
| 1 | **Frase curta, direto ao ponto, zero enrolação.** Se a primeira linha não entrega, ela não é dele. | O rodapé que ele aprovou: `Inscrições para eventos de bem-estar, sem enrolação.` E a cobrança de 12/08: *"nao quero porra nenhuma de ata"* |
| 2 | **Coisa concreta antes de conceito.** Ele enumera instâncias em vez de nomear abstrações. | *"somos um hub de experiencias de bem-estar, de wellness, clubs, etc."* (D-0802-1) e *"os 3 pilares (fisico menatl e espiritual)"* (ARENA-4) |
| 3 | **A categoria é experiência de bem-estar, nunca corrida.** Corrida é uma instância, e o produto tem três pilares. | *"nao quero que a gente remeta 100% a corrida, pois nao somos isso"* (D-0802-1) e a direção de 12/08 na íntegra |
| 4 | **Convite, nunca pressão.** Ele fala com a pessoa no verbo dela e não empurra. | *"basta salvarmos as informações"* e *"um banner/alerta **convidando** o usuário"* (leva 9) |
| 5 | **Nada de promessa sem lastro.** O que a casa não faz, a tela não diz. | *"ja falei que nao enviaremos nada"* (RN-569) e *"nao existe isso de 'confirme para o kit chegar certo'"* |

A régua não é decoração de registro: ela reprovou duas propostas da própria review antes de
virarem código, e as duas estão nomeadas em "Onde a aplicação divergiu da proposta".

---

## Os 13, um a um, com a string velha e a nova na íntegra

| # | Onde | Antes | Depois |
|---|---|---|---|
| B2 | `sections/CheckoutCtaSection.tsx` | `Pronto para largar?` | `Bora garantir sua vaga?` |
| B2 | mesma dobra, apoio | `Garanta sua vaga em poucos passos — sem criar conta. Você escolhe o percurso e o kit na hora.` | `Poucos passos e sem criar conta. Você escolhe a modalidade e o kit na hora.` |
| B3 | `inscricao/checkout/CheckoutFlow.tsx` | `Inscrição segura · pagamento processado no ambiente Leela` | `Inscrição segura · seus dados de pagamento não ficam com a Leela` |
| G1 | `[eventSlug]/ShareBlock.tsx` (evento) | `Mande o link para o grupo de treino ou aponte a câmera no QR.` | `Mande o link para quem vai com você ou aponte a câmera no QR.` |
| G1 | `_perfil/PerfilView.tsx` (perfil) | `Compartilhe este evento` | `Compartilhe este perfil` |
| G1 | idem, apoio | `Mande o link para o grupo de treino ou aponte a câmera no QR.` | `Mande o link para quem acompanha a agenda ou aponte a câmera no QR.` |
| G2 | `minha-conta/page.tsx` | `Minha conta · Leela` (aba mostrava `Minha conta · Leela · Leela`) | `Minha conta` |
| G3 | `components/PublicHeader.tsx` | `Baixar o app` com `title="Em breve"` | `App em breve`, sem `title` |
| G6 | `(public)/page.tsx`, rodapé do card | `Inscreva-se →` | `Ver experiência →` |
| M2 | `minha-conta/PortasDaConta.tsx` | `Painel Profissional` 1× e `painel profissional` 6× no mesmo cartão | `Painel Profissional` nas sete, por constante única |
| M3 | `sections/LotesSection.tsx` | `Os valores sobem a cada lote conforme a data e as vagas. Este é o preço vigente hoje.` | `Este é o preço vigente hoje. Quando o lote virar, por data ou por vagas, o valor muda.` |
| M4 | `sections/SobreSection.tsx` | rótulo `Percursos`, valor `2 distâncias` | rótulo `Modalidades`, valor `2` |
| M5 | `(public)/page.tsx`, subline | `…a gente cuida do resto — sem criar conta para começar.` | `…do kit e da retirada. Sem criar conta para começar.` |
| L1 | `_perfil/PerfilView.tsx` | `Nenhum evento à vista` | `Nenhuma experiência marcada` |
| L2 | `_perfil/PerfilView.tsx` | `Os clubs públicos deste organizador aparecem aqui.` | `Quando este organizador abrir um club, o grupo aparece aqui com a categoria e a modalidade.` |
| L3 | `components/PublicHeader.tsx` | `Eventos` apontando para `/` | `Experiências` apontando para `/#eventos` |

O **G5 não tem linha aqui** porque não é copy: a frase certa já está no repositório desde
`37e5c0ca` e o que falta é deploy, que segue na S1251 e não é desta lane.

---

## A home, agora que ela é aplicável

A direção do dono, na íntegra, dita na noite de 12/08:

> *"Quanto á copy, quero que seja no meu tom de voz. Lembre-se que a leela nao é sobre corridas
> apenas. O objetivo é ser um acossistema de experiencias de bem-estar e nao se esqueça dos 3
> pilares."*

Com ela o **V1 fecha** e a S1256 abre. O que entrou:

| Peça | Antes | Depois |
|---|---|---|
| Eyebrow | `Corrida de rua` | `Experiências de bem-estar` |
| H1 | `Ache sua próxima corrida e garanta a inscrição em minutos.` | `Físico, mental, espiritual. Ache sua próxima experiência e garanta a vaga em minutos.` |
| Subline | `Percurso, kit e retirada num lugar só. Você escolhe a distância, a gente cuida do resto — sem criar conta para começar.` | `Corrida, pedal, retiro, treino de clube. Você escolhe a experiência, a gente cuida da inscrição, do kit e da retirada. Sem criar conta para começar.` |
| CTA do hero | `Ver eventos` | `Ver experiências` |
| Título da dobra | `Eventos abertos` | `Experiências abertas` |
| Contador | `1 evento disponível` / `N eventos disponíveis` | `1 experiência disponível` / `N experiências disponíveis` |
| Dobra vazia | `Nenhum evento no ar por enquanto.` | `Nenhuma experiência no ar por enquanto.` |
| Estado vazio, título | `Ainda não há eventos publicados` | `Ainda não há experiências publicadas` |
| Estado vazio, apoio | `Quando um organizador publicar uma corrida, ela aparece aqui na hora.` | `Quando um organizador publicar uma experiência, ela aparece aqui na hora.` |
| `<title>` e OG | `Leela — inscrições para corridas` | `Leela — inscrições para experiências de bem-estar` |
| Descrição OG/Twitter | `Encontre corridas de rua, escolha seu percurso e garanta sua inscrição em minutos.` | `Corrida, pedal, retiro, treino de clube. Ache sua próxima experiência de bem-estar e garanta a vaga em minutos.` |
| Descrição do root layout | `A plataforma onde você encontra corridas de rua, escolhe seu percurso e garante sua inscrição em minutos.` | `A plataforma de experiências de bem-estar: corridas, pedais, retiros e treinos de clube. Você garante sua vaga em minutos.` |

**Por que o H1 ficou assim.** Ele conserva o esqueleto que já estava no ar, "ache sua próxima X e
garanta Y em minutos", porque a frase dele nunca foi o problema: o problema era o X. Os três
pilares abrem a linha com as palavras canônicas da RN-114, e não com sinônimos, para a home falar a
mesma língua da Arena, do onboarding e das preferências do perfil que a RN-564 já amarrou aos três.
A subline carrega as instâncias, que é onde a pessoa se reconhece em três segundos, e as instâncias
atravessam os três pilares em vez de listar quatro maneiras de correr.

**A descrição do root layout é a peça que a rodada de 02/08 não tinha.** Ela alimenta busca e
preview de link em toda rota sem descrição própria, incluindo a do evento e a do produtor. Trocar o
`<title>` e esquecê-la deixaria o snippet do Google anunciando corrida na página de um retiro.

---

## Onde a aplicação divergiu da proposta, e por quê

Três desvios, todos por régua escrita, nenhum por gosto.

1. **G6, `Ver evento →` virou `Ver experiência →`.** A review propôs "Ver evento" quando a home
   ainda era do dono e o resto da vitrine falava de evento. Com a dobra passando a se chamar
   "Experiências abertas", "Ver evento" deixaria a vitrine e o hero em vocabulários diferentes na
   mesma tela, que é o defeito que o próprio G6 avisou que aplicar sozinho causaria.
2. **L2, "os treinos e encontros do grupo" saiu.** A review marcou a frase como suposição sobre o
   que um club faz, e mandou conferir com o dono. Em vez de mandar a suposição para o ar e a
   pergunta para o painel, a frase aplicada descreve só o que o card mostra de fato, categoria e
   modalidade (`CardClube`). Copy que supõe o produto é a mesma família do defeito que esta rodada
   veio pagar.
3. **M4, o valor virou o número puro.** `Modalidades` com o valor `2 modalidades` repetiria o
   rótulo logo abaixo dele, que é exatamente o defeito do L2 numa outra tela. O ícone deixou de ser
   `Route` pela mesma razão do rótulo: um pictograma de trajeto é a promessa de percurso desenhada.

**Uma escolha de registro que custa uma linha para derrubar.** `Bora garantir sua vaga?` usa a
gíria que a review ofereceu, e ela entrou por causa da régua 1: o registro dele é informal e direto.
A alternativa sem gíria já está escrita e é `Vamos garantir sua vaga?`. A dobra é servida a todo
evento com seções, retiro incluído, e as duas funcionam lá.

Duas notas de escopo, para ninguém as reencontrar como achado novo:

- O `aria-label` do campo de link do `ShareBlock` também dizia "evento" na página de um produtor.
  Passa a nomear o que está na tela (`Link público de ${nome}`). É a mesma família do G1, em copy
  de leitor de tela.
- O comentário de código que citava `"Pronto. O painel profissional já é seu"` foi acertado junto
  com a string que ele cita. Comentário que cita copy envelhecida vira armadilha na próxima lane.

---

## A medição que a frase do checkout ganhou

O B3 tinha uma saída honesta sem nomear o provedor, e ela afirma uma coisa. Antes de virar código,
a afirmação foi medida em vez de presumida: os campos do cartão vivem só no estado da tela
(`useState<CartaoForm>` em `CheckoutFlow.tsx`) e `CreateChargeParams`
(`packages/core/src/payments/PaymentProvider.ts`, consumido por
`functions/src/checkout/createInscricaoCharge.ts`) **não carrega nenhum deles**. Nada de cartão
viaja para o backend da Leela, e nada é persistido. A frase nova é verdadeira, e agora tem onde ser
conferida.

A varredura da S1252-T2 fechou junto: `ambiente Leela` tinha **uma** ocorrência em todo o
monorepo, e ela era esta.

---

## O que esta lane deliberadamente não tocou

- **V2 · organizador × profissional × produtora.** As três seguem no ar, na mesma jornada. A troca
  é de posicionamento e é dele.
- **V3 · `0 membros ativos`.** O card do club continua publicando o zero. Trocar, sumir ou manter é
  decisão de produto.
- **V4 · `Club` em inglês.** Anglicismo é escolha de marca, e `Criar Club` é texto exato dele.
- **V5 · nomear o Asaas na tela.** O defeito do B3 foi pago sem decidir isto.
- **Conteúdo do organizador.** Nome, descrição, modalidades e regulamento dos eventos, e a bio do
  produtor. Mesma fronteira de 02/08.
- **Regra de negócio.** `a partir de R$ 10,00` (RN-559) e o nome `Serviço` (SERV-3) aparecem
  exatamente como estavam. Nenhuma linha desta lane os toca, e **nenhum número de RN foi
  consumido**.

---

## ⛔ O vetável novo que a aplicação descobriu

**"Modalidade" tem dois sentidos vivos no produto, e agora eles ficam lado a lado.** A seção Sobre
tem um tile para a prática do evento (`modalidadeEsporte`, que serve "Corrida de rua", "Trail",
"Bem-estar") e outro para as opções de inscrição (`modalidades`, que a `ModalidadesSection` e o
`StepModalidadeKit` já chamam de modalidade desde a S1218-T3). Pagar o M4 pôs os dois na mesma
grade, com rótulos que diferem por uma letra.

O defeito objetivo foi pago e a página parou de prometer percurso. Qual dos dois sentidos fica com
a palavra é vocabulário de marca, e vocabulário de marca não sai de esteira. Entra no
`02-vetaveis.md` como **V6**, com as saídas medidas.

---

## Gates

| Gate | Resultado |
|---|---|
| `pnpm --filter @leela/landing type-check` | verde |
| `pnpm --filter @leela/landing lint` (`--max-warnings 0`) | verde |
| `pnpm --filter @leela/landing test:gate` | ⚠️ vermelha, e **vermelha em HEAD sem uma linha desta lane**: 102 reprovados com o patch × **43 em HEAD**, no mesmo worktree, com só 5 arquivos em comum entre as duas listas. Os nove arquivos que a suíte atribuiu ao patch reprovam **81 casos em HEAD**, sozinhos. Medição inteira no handoff |
| Testes que importam os componentes tocados | ✅ **31/31 verdes** (`evento-vocabulario-x1`, `cupom-banner-s1215`, `regulamento-modal-focus-trap`) |
| Sonda de string no bundle | ver handoff — o App Router esconde string em flight data, então a prova é no artefato de build, não no fonte |
| Gate visual em navegador | **não se aplica**: esta lane não sobe nada. Ele é obrigatório na lane de deploy |

---
tags: [leela, discovery, benchmark, concorrente, shotgun, e12, landing]
aliases: [Benchmark Shotgun, Shotgun, shotgun.live]
status: discovery
data: 2026-07-11
fontes-verificadas: [shotgun.live/en, pro.shotgun.live (about, br/ingressos, blog), support.shotgun.live (Orders and Payments, Shotgun fees, resell, waiting list), support-pro.shotgun.live (Set up your ticketing, Create your event, progressive release, Charge Now/Waiting List, Taxas de serviço), Stripe customer case study, Google Play/App Store, ReclameAqui]
fontes-nao-carregadas: [shotgun.live/pt-br/festivals/vida-festival-2026 (HTTP 429), shotgun.live/pt-br (HTTP 429), support(-pro).shotgun.live artigos diretos (HTTP 403)]
---

# Benchmark competitivo · Shotgun

> O Vitor deu a página `shotgun.live/pt-br/festivals/vida-festival-2026` como referência de design para a landing pública do Leela (E12). A Shotgun é uma ticketeira e marketplace global de eventos de música (shows, festivais, clubs, raves), com app próprio e forte curadoria de descoberta. Este doc olha a página pública de evento e a jornada de checkout, e traduz o que serve de referência para a landing E12 e para a decisão ainda em aberto de o Leela ter (ou não) uma homepage/catálogo.
> Regra de honestidade: cada afirmação factual carrega fonte + data; o que não pôde ser confirmado está marcado como **não verificado**. Nenhum preço, taxa ou seção foi inventado.

## Nota de honestidade sobre a coleta (leia antes)

As duas URLs-alvo (a página do Vida Festival e a home `pt-br`) **não carregaram**. Toda tentativa de `WebFetch` no host `shotgun.live` devolveu **HTTP 429 (Too Many Requests)**, de forma consistente, ao longo de seis tentativas espaçadas por uma janela completa de reset (o IP do serviço de fetch está bloqueado pela proteção anti-bot da Shotgun). O centro de ajuda (`support.shotgun.live`, `support-pro.shotgun.live`) devolveu **HTTP 403**. Não usei o navegador do usuário (exigiria seleção interativa de browser, fora do escopo desta tarefa delegada).

Consequência prática: **não observei o render da página do Vida Festival**. A anatomia da página de evento e o fluxo de checkout abaixo são reconstruídos da **documentação pública da própria Shotgun** (centro de ajuda do organizador e do comprador) e do material de marketing (`pro.shotgun.live`, `shotgun.live/en`), acessados por busca em julho/2026. Onde um item é padrão-de-plataforma documentado, e não confirmação visual da página do Vida, o texto diz isso. Dado específico do Vida (line-up, nomes de passe, preços) fica de fora: fontes públicas até divergem sobre o local do festival (Vilanova i la Geltrú/Barcelona em umas, Eivissa/Ibiza em outras), então não afirmo nenhum.

## Nota de maturidade e escopo (para comparação justa)

A comparação cruza produtos em estágios e naturezas diferentes.

- A **Shotgun** é plataforma em produção há mais de uma década (fundada em 2014 em Paris, segundo `pro.shotgun.live/about`), com operação em vários países, marketplace de consumo e app. É um agregador de demanda: marca voltada ao público final que "descobre eventos e segue artistas".
- O **Leela** é infraestrutura B2B-SaaS multi-tenant para organizadores e clubes: quem detém a audiência é o organizador, não a plataforma. Do lado da landing, **E12 é só especificação**. `apps/landing` está em scaffold; as rotas de evento/clube, o checkout (`packages/core/src/checkout/`) e as Functions de afiliação ainda não existem; só a interface `PaymentProvider` e um provider sandbox estão prontos (ver `LEELA-E12-landing.md`).

Onde a comparação citar E12, leia como "projetado, não no ar". E onde a Shotgun brilhar em descoberta/marketplace, lembre que é outro modelo de negócio, não só outro estágio.

---

## 1. Visão geral

A Shotgun vende ingresso para eventos de música: shows, festivais, clubs, raves, open air, techno, warehouse (`shotgun.live/en`, jul/2026). Nasceu como app e marketplace e cresceu para plataforma completa de ticketing, com times em Paris, Marselha, Lisboa, São Paulo, Nova York e Miami (`pro.shotgun.live/about`; estudo de caso da Stripe, jul/2026). Roda o marketplace sobre **Stripe Connect**, o que permitiu expandir para Portugal, Brasil e EUA sem redesenvolver o núcleo, e suportar meios locais como **Pix** no Brasil e MB WAY em Portugal (estudo de caso da Stripe, jul/2026).

O eixo é **balada e festival de música**, não corrida nem endurance. É o primeiro ajuste honesto ao "referência de design": Shotgun e Leela compartilham a matéria-prima (página de evento, ingresso, checkout, QR), mas operam verticais diferentes, e a Shotgun é consumidor-final agregado enquanto o Leela é SaaS de produtor. O que dá para copiar é o **desenho da página e a fricção do checkout**, não o modelo de marketplace.

**Modelo de taxa (verificado).** A Shotgun cobra do **comprador**, não do produtor, uma taxa de serviço. No Brasil, o padrão é **12,5%** sobre o valor do ingresso, com **10%** para eventos no estado do Rio de Janeiro, e **mínimo de R$ 3** (centro de ajuda: "Taxas da Shotgun" / "Taxas de serviço", jul/2026). A taxa junta a conveniência da Shotgun mais o processamento de pagamento. Registro que essa taxa paga pelo comprador rende reclamação pública ("taxas de serviço abusivas", reembolso incompleto) no ReclameAqui (jul/2026): é sinal de que taxa visível no comprador tem custo reputacional.

---

## 2. Anatomia da página de evento

Reconstruída da documentação da Shotgun (não do render do Vida, conforme a nota de honestidade). A ordem abaixo é a que a plataforma descreve para montar e exibir um evento.

1. **Capa / Hero.** Imagem de capa, nome do evento, data e hora, e local. O endereço pode ficar oculto até o dia via a opção **"Secret Location"** (centro de ajuda do organizador: "Create your event", jul/2026), recurso de rave/club. O CTA de compra fica no topo, junto ao Hero. Não capturei o texto exato do botão na página `pt-br` do Vida (**não verificado** o rótulo literal).
2. **Descrição.** Texto "engajante" com informações práticas e legais do evento. A mesma descrição alimenta o **PDF do ingresso e o e-mail de confirmação** (centro de ajuda: "Create your event", jul/2026). Ou seja, um único campo serve página, comprovante e e-mail.
3. **Line-up e grade de horários (timetable).** A página exibe line-up e timetable; mudanças de line-up são comunicadas pela própria página e pelos canais do organizador (centro de ajuda do comprador: "I want information about the line-up", jul/2026). No universo Shotgun, line-up é o equivalente de "atração"; no Leela, o equivalente funcional é **modalidade/percurso**.
4. **Ingressos e lotes.** Os ingressos aparecem **na própria página** (não numa aba separada). A Shotgun trabalha com três tipos: **Online** (vendido no app e no site, o mais comum, aparece na página), **Venue** (venda na porta/bilheteria física) e um terceiro tipo de venda externa (centro de ajuda do organizador: "Set up your ticketing", jul/2026). Para variações de acesso (day pass, VIP, bundle) usa **categorias**. E o ponto mais relevante para o Leela: a estrutura **mostra só o lote/tier atual em venda** para simplificar a escolha do comprador, com datas de liberação programadas e **transição automática de lote** para criar "momento de venda" (centro de ajuda: "Set up progressive ticket release" / "Tickets Sales Period", jul/2026). Preço e nomes de lote específicos do Vida: **não verificados**.
5. **CTA de compra.** Persistente, ligado ao lote atual. Ao seguir a compra, o comprador entra no funil de checkout (seção 3). Se está esgotado, o CTA vira entrada para **lista de espera**, mas só no app (seção 4). O texto literal do botão e se abre modal ou nova tela: **não verificado** (não renderizei a página).
6. **Organizador e compartilhamento.** Botão **seguir** o organizador ("be first to know when new dates drop", `shotgun.live/en`, jul/2026). E um mecanismo de **share-to-earn**: fãs que compartilham o evento e convertem compradores recebem incentivo/cashback que o organizador configura (centro de ajuda / material Shotgun, jul/2026). É afiliação exposta a qualquer fã, não só a promotor cadastrado.

O que a página **não** tem, por ser balada e não prova: kit de corrida, retirada de kit, contato de emergência, aceite de regulamento, percurso/altimetria. Toda a carga de "prova esportiva" do Leela é ausente aqui.

---

## 3. Fluxo de checkout

Reconstruído do centro de ajuda ("Orders and Payments") e do material do produto. A tese declarada da Shotgun é **funil ultra-simplificado**: comprar em segundos, sem incomodar o público com passos e pedidos de dado que desanimem a compra (`pro.shotgun.live`, centro de ajuda, jul/2026).

**Etapas (verificadas na documentação):**
1. **Escolha do ingresso.** Na própria página, o comprador seleciona o lote/categoria atual e a quantidade.
2. **Identificação leve.** É possível comprar **sem criar conta**; a plataforma coleta **e-mail e telefone**, que viram contatos do organizador no painel (Smartboard) (centro de ajuda: "Set up your ticketing" / checkout, jul/2026). Coleta mínima por padrão, com opção do organizador pedir mais dado se quiser.
3. **Pagamento.** Métodos: **Pix, cartão, parcelamento, Apple Pay e Google Pay** (centro de ajuda; estudo de caso da Stripe, jul/2026). Parcelamento e carteiras digitais reduzem fricção de preço.
4. **Confirmação.** O **QR do ingresso aparece na hora**, na página de confirmação, e os ingressos vão por e-mail (centro de ajuda: "Orders and Payments" / "Xpress Door", jul/2026).

Recursos ligados ao checkout: **group tickets** (compra em grupo, centro de ajuda "Create group tickets"), **revenda e transferência** integradas (`pro.shotgun.live/br/ingressos`, depoimento; centro de ajuda "I want to resell my ticket"), e **lista de espera** para esgotado, com ranqueamento por ordem de entrada e prioridade para quem ativa cobrança automática ("Charge Now"). Fica só no app, e só se o organizador habilitou revenda e transferência (centro de ajuda: "waiting list" / "Charge Now and The Waiting List", jul/2026).

Em número de passos: a Shotgun opera em **3 a 4 toques** (ingresso → identificação leve → pagamento → QR na hora). O Leela projeta **5 etapas** (Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação, S1203). A diferença não é desleixo de um lado; é a prova esportiva exigir dado que a balada não exige.

---

## 4. Descoberta e catálogo (o lado que o Leela ainda não tem)

Isto importa porque a landing E12 nasce **sem homepage e sem catálogo público** (o `apps/landing/app/page.tsx` é "home mínima, placeholder institucional; catálogo público é fora de escopo", e "catálogo/busca pública de eventos" é Won't nesta fase, ver E12). A Shotgun é o oposto: descoberta é o coração do produto.

**Como a Shotgun faz descoberta (verificado):**
- **Por cidade.** Páginas de cidade agregam os eventos (`shotgun.live/en/cities`, e `/cities/sao-paulo`, `/rio-de-janeiro`, `/brasilia`, `/barcelona`, `/paris`, jul/2026).
- **Por categoria/gênero.** Techno, festival, rave, open air, warehouse, e recortes combinados (ex.: `/cities/barcelona/techno`, `/festivals/-/europe/spain/techno`, jul/2026).
- **Por tipo.** Hubs dedicados de `/festivals` e `/events` (jul/2026).
- **Personalização e social.** Alertas por sincronizar serviços de música e **seguir artistas e organizadores**; ver aonde amigos vão; programa de embaixador com recompensa (Google Play; `shotgun.live/en`, jul/2026). O app é o motor dessa curadoria.

Layout exato da home `pt-br` (grid de cards, o que cada card mostra, blocos de "recomendado/em alta"): **não verificado** (HTTP 429). Pelo padrão de mercado e pelas páginas de cidade indexadas, a descoberta é organizada como marketplace de cards por cidade/gênero, alimentada por app e por perfil.

---

## 5. O que a Shotgun faz bem

- **Checkout mínimo de verdade.** Sem conta, poucos campos (e-mail + telefone), QR imediato. É a régua de fricção baixa a bater.
- **Só o lote atual à mostra.** Esconder lotes futuros/passados e virar lote por data/quantidade simplifica a decisão e cria urgência sem poluir a tela.
- **Descoberta como produto.** Cidade, gênero, seguir artista, app com recomendação. Top-of-funnel próprio, que não depende só do link do organizador.
- **Share-to-earn para qualquer fã.** Afiliação não fica presa a "promotor cadastrado"; todo comprador vira divulgador com incentivo configurável.
- **Carteiras e parcelamento.** Apple/Google Pay e parcelamento além de Pix e cartão. Menos atrito no ticket alto.
- **Revenda/transferência e lista de espera nativas.** Reduz golpe de reingresso e transforma "esgotado" em captura, em vez de beco sem saída.

---

## 6. O que faríamos diferente no Leela (E12)

- **Checkout de prova, não de e-commerce genérico.** O Stepper de 5 etapas trata **modalidade e kit como primeira classe**, com preço vigente por percurso (RN-301) e "Sem kit" válido inclusive com preço negativo (RN-211). A Shotgun tem categoria plana de ingresso; o Leela tem kit tamanhado, galeria de itens, retirada. É desenho de corrida, e é o nosso fosso.
- **Coleta legal obrigatória, por inscrito.** Contato de emergência (RN-145) e aceite de regulamento **distinto do consentimento LGPD** (RN-148), por inscrito do pedido em grupo (ADR-011). A Shotgun coleta e-mail e telefone e pronto. Aqui a lei da prova pede mais, e o desenho precisa deixar isso leve sem tirar a obrigatoriedade.
- **Atribuição com janela, teto e split, não só "veio pelo link".** O link master (`?c=`) grava cookie assinado com validade da `janelaAtribuicaoDias`; a conversão só é atribuída dentro da janela (RN-311); o cupom resolve o afiliado dono e tem prioridade sobre o cookie; o split roda idempotente na Function (S1204). É infraestrutura de afiliação mais rica que o share-to-earn de fã, ainda que menos exposta ao público.
- **Camada de pagamento plugável antes do fornecedor.** `PaymentProvider` (ADR-006) e sandbox permitem construir e testar o funil ponta a ponta antes de casar com gateway. A Shotgun já é Stripe Connect em produção; o Leela ganha opcionalidade adiando o acoplamento.
- **SEO por página como estratégia central, não acessório.** Sem home/catálogo, cada página de evento precisa carregar sozinha a descoberta: `generateMetadata` dinâmica, OpenGraph, JSON-LD `Event`, sitemap e canonical (S1205). Na Shotgun isso soma ao marketplace; no Leela isso **substitui** o marketplace na largada.

---

## 7. O que a Shotgun ensina para a landing E12

Ponto a ponto, casando com as seções que o E12 já especifica (Hero, Modalidades, Kits, Retirada, FAQ, Percurso, Patrocinadores, Depoimentos, e o checkout de 5 etapas):

1. **CTA de compra persistente e colado ao lote atual.** O Hero do E12 já leva "Garantir inscrição" ao checkout. Vale manter o CTA visível ao rolar e amarrado ao **preço vigente** (RN-200), do jeito que a Shotgun cola o botão ao lote atual.
2. **Mostrar só o lote vigente, com dica do próximo.** O E12 lê "preço vigente do lote" mas não diz que a UI esconde lotes futuros/passados. Copiar a Shotgun: exibir o lote atual em destaque e, no máximo, um "próximo lote R$ X" como urgência. Menos escolha, mais conversão.
3. **Manter a etapa Dados enxuta apesar da carga legal.** A lição da Shotgun é remover todo campo não obrigatório. No Leela, contato de emergência e aceite de regulamento **são** obrigatórios (RN-145/148), então o ganho está em desenho: agrupar, usar bons defaults, deixar o resto fora. Não dá para ser tão curto quanto a Shotgun, mas dá para não ser burocrático.
4. **QR na hora, na confirmação, mais e-mail.** O S1206 já faz isso (qrToken assinado por inscrito, e-mail de marca, PDF sob demanda). A Shotgun valida o padrão: o comprovante nasce na tela de confirmação, não "depois por e-mail". Manter.
5. **Carteiras e parcelamento no roadmap de pagamento.** O `PaymentProvider` prevê Pix, cartão e boleto no sandbox. A Shotgun mostra que Apple/Google Pay e parcelamento tiram atrito no ticket de corrida mais caro. Alinha com o gap de parcelamento já apontado no benchmark da Cheers.
6. **Transformar "esgotado" em captura.** O E12 hoje só desabilita o CTA com "Esgotado" (S1201-T3). A Shotgun coloca lista de espera. Mesmo sem construir marketplace de revenda, um simples **capturar e-mail para avisar de vaga** já é melhor que beco sem saída.
7. **Expor a afiliação ao comprador, não só ao promotor.** O S1204 é backstage (link master/cupom para clube e promotor). O share-to-earn da Shotgun mostra o ganho de transformar **cada comprador em divulgador** com um "compartilhe e ganhe" visível na página. É gap de produto, não de infraestrutura: o motor de split já existe.
8. **Um campo de descrição que serve página, PDF e e-mail.** A Shotgun reusa a descrição do evento no ingresso e no e-mail. O S1206 já tem template de marca; vale garantir que o texto do organizador flua para os três lugares sem retrabalho.

Onde o Leela já está à frente e deve manter: kit de prova com galeria (KitsSection), Retirada, Percurso com altimetria, Patrocinadores e Depoimentos como seções de primeira classe, render orientado por configuração (SectionRenderer, seção ativa + ordem) e estados públicos de venda (rascunho→404, encerrado, esgotado). A página da Shotgun é centrada em line-up; a do Leela é mais rica em conteúdo de prova.

---

## 8. O que isso ensina para a decisão de homepage/catálogo do Leela

Esta é a pergunta estratégica que a Shotgun ilumina melhor que a Cheers.

A Shotgun **é** um marketplace: a homepage, as páginas de cidade/gênero e o app com recomendação são o produto de descoberta. O Leela, por decisão do E12, **não** entra como agregador de demanda na V1. A tração vem de link de organizador/afiliado, de SEO por evento e do funil de clube (clube → desafio → evento), não de uma vitrine que o Leela detém.

Leitura e recomendação:

- **Não copiar o marketplace agora.** Construir catálogo global concorre com o próprio cliente (o organizador é quem deve deter a audiência). A Shotgun pode ser marca de consumo porque esse é o negócio dela; o Leela é SaaS de produtor. Manter "catálogo público fora de escopo" na V1 continua certo.
- **Como não há home para funilar, cada página de evento tem que descobrir sozinha.** Por isso o S1205 (metadata dinâmica, OG, JSON-LD `Event`, sitemap, canonical) pesa **mais** no Leela que na Shotgun: é o substituto do topo de funil, não um enfeite. Priorizar S1205 junto do S1201, não depois.
- **O candidato natural a "mini-catálogo" é o portal do organizador (S1208), não uma home do Leela.** O portal sob `tenants/{id}/portal` já reúne eventos + agenda + fotos + blog + patrocinadores + newsletter. É o lugar certo para a experiência de "hub de eventos", **por tenant**, mantendo a audiência com o organizador. Se um dia fizer sentido uma vitrine, que ela agregue portais de tenant, não que o Leela vire a marca de consumo.
- **Captura de demanda de baixo custo primeiro.** Antes de qualquer catálogo, os movimentos baratos que a Shotgun valida: seguir organizador para saber de novas datas, newsletter com consentimento (RN-151, já no S1208), e share-to-earn na página do evento. Isso constrói repetição sem virar marketplace.

Em uma linha: a Shotgun ensina **como** seria um catálogo, e por contraste deixa claro **por que** o Leela não deve ser um na V1; o esforço equivalente vai para SEO por página e para o portal do organizador.

---

## 9. Tabela-síntese

| Aspecto | Shotgun (verificado) | Leela E12 (spec) | Decisão sugerida |
|---|---|---|---|
| Vertical | Música: show, festival, club, rave | Corrida, endurance, bem-estar | Ignorar o eixo deles; copiar só padrão de página/checkout |
| Natureza | Marketplace de consumo + app | SaaS multi-tenant de produtor | Manter; não virar marca de consumo na V1 |
| Anatomia da página | Capa → descrição → line-up/timetable → ingressos (na página) → seguir/compartilhar | Hero → Modalidades → Kits → Retirada → Info/FAQ → Percurso → Patrocinadores → Depoimentos (config-driven) | Manter a riqueza de prova; adotar CTA colado ao lote e "só lote atual" |
| Lotes | Só o lote/tier atual à mostra, virada automática por data (verificado) | Lê "preço vigente do lote"; UI não especifica esconder lotes | Melhorar: exibir só o lote vigente + dica do próximo |
| CTA de compra | Persistente no topo, ligado ao lote; texto exato **não verificado** | "Garantir inscrição" no Hero → checkout | Manter; tornar sticky ao rolar |
| Checkout (passos) | 3-4 toques, sem conta, e-mail + telefone (verificado) | 5 etapas: Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação | Manter 5 (prova exige); enxugar a etapa Dados |
| Dado legal no checkout | Só e-mail + telefone | Contato de emergência (RN-145) + aceite de regulamento distinto de LGPD (RN-148), por inscrito | Manter; é requisito de prova, desenhar leve |
| Pagamento | Pix, cartão, parcelamento, Apple/Google Pay (verificado) | `PaymentProvider` sandbox: cartão, Pix, boleto | Manter; pôr carteiras + parcelamento no roadmap |
| Confirmação/ingresso | QR na hora na confirmação + e-mail (verificado) | qrToken assinado por inscrito + e-mail de marca + PDF (S1206) | Manter; já alinhado |
| Esgotado | Lista de espera (só no app, exige revenda ativa) | CTA desabilitado "Esgotado" (S1201-T3) | Melhorar: capturar e-mail para aviso de vaga |
| Afiliação | Share-to-earn exposto a qualquer fã (verificado) | Link master + cupom, janela, teto, split idempotente (S1204), backstage | Manter infra; avaliar "compartilhe e ganhe" público |
| Revenda/transferência | Nativa e integrada (verificado) | Troca de titularidade como política (RN-343, E04), sem marketplace | Avaliar pós-V1 (também apontado no benchmark Cheers) |
| Taxa | 12,5% no Brasil (10% no RJ), mín. R$ 3, paga pelo **comprador** (verificado) | `platformFeePct` por tenant, sem UI de quem paga | Decidir quem paga e como exibir; taxa no comprador tem custo reputacional (ReclameAqui) |
| Descoberta/homepage | Marketplace: cidade, gênero, seguir artista, app (verificado) | Home mínima; catálogo público fora de escopo | Não copiar; investir em SEO por página (S1205) e portal do organizador (S1208) |
| SEO por evento | Complementa o marketplace | JSON-LD Event, OG, sitemap, canonical (S1205) | Priorizar: no Leela substitui o topo de funil |

---

## 10. Fontes e verificação

Verificado em fonte pública (julho/2026), via busca e via `pro.shotgun.live` (que carregou):
- `shotgun.live/en` (categorias de evento, seguir organizador, descoberta), páginas de cidade `/cities`, `/festivals`, `/events`.
- `pro.shotgun.live` ("about": fundação 2014/Paris e escritórios; `br/ingressos`: revenda e transferência integrada; blog de venda).
- Centro de ajuda do comprador `support.shotgun.live`: "Orders and Payments", "Shotgun fees", "I want to resell my ticket", "waiting list", "line-up".
- Centro de ajuda do organizador `support-pro.shotgun.live`: "Set up your ticketing" (tipos Online/Venue, categorias), "Create your event" (descrição, Secret Location), "Set up progressive ticket release" e "Tickets Sales Period" (só o lote atual à mostra, virada automática), "Charge Now and The Waiting List", "Taxas de serviço".
- Estudo de caso da Stripe (Stripe Connect, Pix no Brasil, MB WAY em Portugal, expansão).
- Google Play / App Store (app, alertas, seguir artista, embaixador).
- ReclameAqui (reclamação sobre taxa de serviço no comprador e reembolso).

Não carregou / não verificado:
- `shotgun.live/pt-br/festivals/vida-festival-2026` e `shotgun.live/pt-br`: **HTTP 429** repetido; não renderizei. Logo, o **texto exato do CTA**, a **ordem visual real das seções na página do Vida**, o **layout do card na home** e os **nomes/preços de passe do Vida** não foram observados.
- Local do Vida Festival 2026: fontes públicas divergem (Vilanova i la Geltrú/Barcelona vs. Eivissa/Ibiza); não afirmo.
- Artigos diretos do centro de ajuda via fetch: **HTTP 403** (li o conteúdo por sumário de busca, não pelo HTML bruto).

## Volta para
- [[DISCOVERY]] · [[benchmark-cheers]] · [[LEELA-E12-landing]] · [[NUVEM-FUNCIONALIDADES]]

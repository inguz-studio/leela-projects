# LEELA-E12 · Landing Pública (evento/clube, inscrição, checkout, SEO)

- **Superfície:** Landing (web pública, SSR/ISR, sem login)
- **Horizonte:** H1 (Onda 2 — vendas ponta a ponta)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 🔄 conteúdo em `PaginaVendas-Conteudo.html`; código a fazer
- **Depende de:** LEELA-E01 (DS: Banner Hero, Card de Evento, Stepper de checkout 5 etapas, Card de Desafio), LEELA-E04 (Configuração e Vendas — quando existir; até lá basear em JIRA-03 BH-300/BH-301), PaymentProvider (ADR-006), LEELA-E00 (app `apps/landing`)
- **De-para:** novo (sem BH- direto). Rastreabilidade de conteúdo: BH-300 (Página de vendas), BH-301 (Promotores/afiliação), BH-201 (publicação gera URL+QR)

## Objetivo

Entregar a superfície **web pública** da Leela: as páginas que o atleta anônimo encontra pelo Google, por link de organizador/afiliado ou por compartilhamento em redes, e o fluxo que o converte em inscrito pagante sem exigir login. São páginas **renderizadas no servidor (SSR/ISR)** para SEO e velocidade, alimentadas pelos dados que o organizador publica no painel (E03/E04) e pelo modelo de dados comum. A landing fecha o ciclo de negócio do H1: *"atleta descobre → inscreve → paga → organizador vê receita"* e ativa o lock-in financeiro da afiliação (clube/promotor recebe comissão pela conversão que originou).

> **Atualização 2026-07-18 (LP-VENDAS-KIT · `0841891`+`b3fe713`+`beedca9`):** (1) capas/hero/galeria passam a exibir **fotos semi-realistas por tema** (Unsplash License, assets locais, resolvidas app-side por `capaDoEvento`) no lugar da arte SVG; SEO/perf aplicados (dimensão explícita/zero-CLS, hero=priority/LCP, resto lazy, alt 100%; og:image/JSON-LD/sitemap/robots intactos — capa mock não é promovida a mídia real). (2) **regulamento em modal** na página do evento (`regulamento`/`regulamentoVersao` projetados no leitor, ≤50k, texto puro; self-gated). Nota técnica: o `Modal` do DS é Radix e a landing é Radix-free → modal **local** da landing com tokens do DS e a11y completa (evita `@radix-ui/react-dialog` no bundle público; decisão de stack registrada p/ o lead).

> **Atualização 2026-07-19 (KIT-IMG-LANDING · `[LEELA-KITIMG-T1..T3]`):** **imagem 1:1 do kit agora aparece na seção de kits da página de vendas** (antes era só texto) **e no checkout** (`KitDetalhe`), pelo slot único `KitImagem` + resolvedor `imagemDoKit` (`lib/kitImagem.ts`). Cascata em três níveis (padrão capas R14 + honestidade `ehPreview`): **dado real** (upload do organizador, RN-230) → **foto mock temática** (5 fotos Unsplash License 1:1 em `public/covers/kits/`; ciclismo/trail/wellness/bundle/tee por `temaKit`) **SÓ no preview** → **placeholder padrão Leela** (`leela-kit-placeholder.svg`, wordmark lime do header sobre fundo brasa; SVG estático) em **produção real sem imagem**. Clique na imagem (foto real/mock) abre **visualização ampliada** no `Dialog` Radix-free do DS (ADR-017 — reúso; foco no X, retorno de foco, Esc/overlay/X, scroll travado, `object-contain` mobile). SEO/perf: dimensão 800×800 explícita/zero-CLS, lazy, alt real (`rotuloKit` sem duplicar "Kit"), fotos ≤180KB, zero dependência nova. Gates: tsc/eslint 0, suíte landing 55/55, `verify:brand` PASS, prova visual :3200 (`outputs/leela-build-2d6ee98d/`).

O que o organizador edita em `PaginaVendas-Conteudo.html` é renderizado em dois canais (app do atleta e landing pública); este épico constrói **o canal web**. O checkout usa a camada plugável `PaymentProvider` (ADR-006), nunca um gateway concreto: um provider sandbox permite construir e testar o fluxo ponta a ponta antes da escolha do fornecedor.

> **⚠️ Decisão de design (registrada 2026-07-11, Vitor):** ao contrário do painel admin (que tem fidelidade de Figma no `WEB-APPV2`), a landing pública **não tem mockup visual próprio**. A `PaginaVendas-Conteudo.html` citada como "tela de referência" nas stories é o **editor de conteúdo** (lista QUAIS seções existem, canal Web+App / Só-Web) — **não** um desenho de como a página pública fica. Portanto a landing será **desenhada sobre o design system leela + referências de mercado**, não copiada de mockup. **Antes de despachar `S1201`, fazer um passe de UI-SPEC da página pública + checkout**, ancorado em: a lista de seções + o DS + os benchmarks `discovery/benchmark-cheers.md` (fluxo/taxa/cupom) e `discovery/benchmark-shotgun.md` (visual da página de evento + descoberta). Sem esse passe, o S1201 nasce sem direção visual.

## Personas & JTBD

- **Atleta anônimo (persona primária).** JTBD Transacional: *"Quando descubro um evento, quero me inscrever em poucos cliques, para reduzir a fricção"* e *"Quando compro inscrição, quero acompanhar kit e pagamento no mesmo lugar"* (`jobs-to-be-done.md` 04.1). Não tem conta; a landing não exige login para inscrever e pagar.
- **Organizador (persona secundária).** JTBD *"Quando descubro/publico evento, quero minha página no ar com link compartilhável e QR"* — a landing é a materialização pública da página de vendas que ele configura.
- **Clube/Promotor afiliado (persona secundária).** JTBD *"Vendo com promotor, quero link rastreável em tempo real, para calcular comissão sem planilha"* — a landing captura a atribuição de conversão do link master/cupom.

## Critérios de sucesso do épico

- Uma URL pública de evento publicado (`{leela-domain}/{eventSlug}`) abre sem login, renderizada no servidor, com todas as seções ativas que o organizador publicou e passa em Core Web Vitals (LCP do Hero < 2,5s).
- Uma URL pública de clube com visibilidade `publica`/`indexavel` (`{leela-domain}/c/{clubSlug}`) abre e é indexável; clube `privada` responde 404.
- Um atleta anônimo completa **inscrição → pagamento → confirmação** pelo Stepper de 5 etapas usando o `PaymentProvider` sandbox, e o inscrito aparece confirmado no painel do organizador com a receita agregada.
- Um acesso via link master `beh.ro/mfl26?c=cps` (ou cupom `CORRIDAPERFEITA10`) que converte dentro da janela de atribuição gera uma conversão atribuída ao afiliado e o valor a receber correspondente.
- `sitemap.xml`, `robots.txt`, metadata dinâmica e OG por página existem e validam; o og:image do evento aparece ao compartilhar.

## Regras de negócio aplicáveis

- **RN-201** — publicar evento gera URL pública + QR automaticamente (a landing consome a URL/QR; publicação em si é do E03).
- **RN-200** — preço bloqueado após 1ª venda (a landing sempre lê o preço vigente do lote/kit; nunca recalcula).
- **RN-202 / RN-216** — inscrito escolhe um `kit` (`kit_ouro`/`kit_prata`/`kit_basico`/`sem_kit`); "kit" nunca "tier".
- **RN-211** — "Sem kit" é kit válido e pode ter preço negativo (desconto).
- **RN-204** — inscrito nasce `pendente`, vira `confirmado` no webhook de pagamento aprovado.
- **RN-207** — o passo de chip não existe no checkout público (chip é preenchido na entrega); nada a suprimir aqui, apenas não coletar.
- **RN-140** — visibilidade da página do clube: `publica` (link direto), `indexavel` (aparece em buscadores), `privada` (404 público).
- **RN-141** — clube com aprovação manual: CTA de entrada informa que a entrada aguarda liberação (a entrada em si é mobile/app).
- **RN-117** — visibilidade do desafio (membros/convite/público): só desafios `público` aparecem na página pública do clube.
- **RN-125** — evento promovido gera link master rastreável + cupom exclusivo + comissão (lado do clube).
- **RN-310** — o organizador define a comissão; para a landing é read-only.
- **RN-311** — programa de afiliação define %, janela de atribuição (dias), teto mensal e cupom; a atribuição de conversão respeita a janela.
- **RN-301** — cada modalidade/percurso tem preço independente (a landing exibe "a partir de R$ X").
- **RN-218** (S1206) — toda inscrição confirmada gera um ingresso digital com QR assinado (`qrToken` opaco por inscrito), disponível no app e por e-mail.
- **RN-219** (S1206) — e-mail transacional de confirmação usa template de marca Leela com variáveis (`{nome}`, `{evento}`, `{kit}`, `{modalidade}`), disparado ao responsável do pedido pela Function de webhook confirmado, idempotente (não reenvia no reprocessamento).
- **RN-220** (S1206) — PDF do ingresso é gerado sob demanda a partir do mesmo ingresso/QR; opcional, para impressão/offline ou retirada por terceiro.
- **RN-145** (S1207) — contato de emergência (nome + telefone) é obrigatório na inscrição, por inscrito do pedido.
- **RN-148** (S1207) — aceite de regulamento é obrigatório e distinto do consentimento LGPD; persiste versão + timestamp (+ hash de IP opcional) no inscrito.
- **RN-150** (S1208) — o portal público do organizador vive sob a plataforma (`tenants/{id}/portal`), renderizado por SSR/ISR, sem domínio próprio nem white-label.
- **RN-151** (S1208) — captura de newsletter grava lead sob o tenant com registro de consentimento LGPD e finalidade declarada.
- **RN-152** (S1208) — blocos do portal são ativáveis e ordenáveis; blocos desativados não aparecem.

### RNs novas · rodada DEC-0719 (Vitor, 2026-07-19) — checkout

- **RN-154 (nova · gênero no checkout)** — o **gênero** é coletado no checkout **por inscrito** (enum `GENEROS_INSCRITO` com opção "não informado", que respeita quem não declara) e **pré-preenchido automaticamente** quando a pessoa já comprou antes (reconhecida via CPF único, RN-173). Alimenta a demografia do organizador (RN-820/822). Entra junto dos campos novos já ratificados do checkout (telefone/nascimento/endereço) — lote `CHECKOUT-FORM-2`.
- **RN-155 (nova · conta sem fricção)** — na **1ª compra**, o sistema **cria a conta automaticamente sem fricção** e **envia um link por e-mail** avisando que a conta foi criada, para a pessoa **definir senha e visualizar a compra**. Nas compras seguintes (CPF já conhecido, RN-173), os dados pré-preenchem. **Dependência dura:** o envio do link depende do **EmailProvider** (RN-137, `BREVO_API_KEY`) — fail-closed sem a chave (a conta é criada; o e-mail fica pendente até a chave existir). Lote `conta-sem-fricção`.
- **RN-156 (nova · termo de saúde base obrigatório)** — o **termo de saúde BASE da plataforma** é **sempre presente e obrigatório** no checkout (deixa de ser condicional a flag). A flag `exigenciasSaude` do organizador (RN-146) passa a **ADICIONAR** um termo/exigência custom dele, não a habilitar o termo base. Verbatim do Vitor: *"é um termo base que teremos, mas deixamos também o organizador ter os seus, para personalizar."* Os **dados plenos de saúde** (atestado/PAR-Q, RN-146/147, dado sensível LGPD Art. 11) **seguem condicionais** à flag do evento e isolados em `inscritos/{id}/saude`. O aceite do termo base segue o versionamento RN-149 (carimbo `versao`/`aceiteEm` em `pedidos/{id}.aceites.saude` — já landed no CHECKOUT-MODELO). Lote `saúde-termo-base`.
- **RN-157 (nova · PIX 30 min + retomada)** — a **cobrança PIX expira em 30 minutos** — validade da **charge** no `PaymentProvider`/Asaas (`expiresIn`), **não** só um relógio de UI. O **QR + copia-e-cola** ficam disponíveis **enquanto o PIX estiver pendente**, tanto na **tela de pagamento** quanto na **tela do pedido pendente** (`/pedido/{id}`, retomada do comprador anônimo). O botão de copiar **copia automaticamente** e dispara toast *"a chave para pagamento foi copiada"*. Lote `CHECKOUT-FORM-2` (implicação de `expiresIn=1800s` no `createCharge`).
  - **STATUS ARBITRAGEM SERVER-SIDE (S1209-PIXBE · 2026-07-26, `c6e6712`+`33d4f08`+`df25872`+`d545aa5`):** a RN-157 deixou de depender da tela em três frentes. (1) A resposta da cobrança carrega `servidorAgoraMillis` — o `agora` do MESMO relógio que carimbou `pixExpiraEm` —, então a duração restante sai de dois números da mesma fonte e o desvio do aparelho cai fora da conta. (2) O servidor RECUSA a segunda cobrança PIX viva do mesmo `(comprador, evento, carrinho)` dentro da transação que cria o pedido, por sentinela de conflito materializado `cobrancasPixAtivas/{uid}__{evento}__{hash}` — `failed-precondition` + `details.motivo = pix_pendente_ativo`. (3) Expirar cancela a cobrança NO GATEWAY antes de flipar os docs (`PaymentProvider.cancelCharge`, novo no contrato); falha lá ⇒ o pedido segue VIVO e a resposta diz que a cobrança continua válida.
  - **⚠️ PONTA SOLTA DA RN-157 (S1209-PIXREV · 2026-07-26 · ESCALADA, decisão do Vitor):** as duas garantias acima **discordam sobre o que é uma cobrança viva**. Para (3), morta = *o gateway confirmou*; para (2), morta = *o relógio passou* (`lerTravaPixNaTx` solta em `pixExpiraEmMillis <= agoraMs`). Quando o gateway RECUSA o cancelamento **e** o prazo vence, a trava solta e nasce a segunda cobrança com a primeira **ainda pagável** — a cobrança duplicada que (2) existe para impedir. Provado por teste (`AT-5` em `pixArbitragem.ataque.integration.test.ts`) e alcançável pela própria tela no estado `contestado` (alternar Pix→Cartão→Pix zera a cobrança e o efeito de auto-geração recria, porque a guarda é `!pixExpirado` e `contestado` não é `expirado`). As duas saídas trocam um risco pelo outro — travar a venda até o gateway confirmar (denial of purchase, exige fiação de tela para a recusa `pix_pendente_ativo`) × tentar o cancelamento no caminho de CRIAÇÃO (gateway-primeiro também no create). **Recomendação da review: a segunda.** Report `outputs/leela-build-2d6ee98d/S1209-PIXREV-REPORT.md`.
  - **✅ PONTA SOLTA FECHADA (PIX-CARRINHO-T1 · 2026-07-26, `7e957e9`) — item 25 RATIFICADO pelo Vitor na rodada DEC-0726B, opção (b).** Existe UMA definição de cobrança morta nas duas lanes: **o gateway confirmou**. `lerTravaPixNaTx` **não solta mais pelo relógio** — prazo vencido deixou de ser motivo de soltura e virou tarefa: o caminho de criação encerra a anterior no gateway (`encerrarPixAnteriorNaCriacao`, que REUSA o `expirarPixPendenteCore` — sem segunda máquina de cancelamento) e só então a nova nasce. Gateway recusou ⇒ criação **NEGADA** com `failed-precondition` + `details.motivo = pix_anterior_nao_encerrado` (negativa honesta). **Não é denial of purchase:** cada nova tentativa retenta o cancelamento, então o gateway voltando destrava sozinho, sem fiação nova de tela. O pré-voo roda DEPOIS das validações e da derivação de preço (input inválido não mata a cobrança viva do comprador) e NÃO roda no replay nem no cartão. `AT-5` e o *ataque 6* da landing mudaram de lado: o mesmo roteiro termina em UMA cobrança.
  - **FRONTEIRA MEDIDA (S1209-PIXREV):** o escopo por carrinho **não** limita cobranças vivas por comprador — 5 cobranças PIX simultâneas do mesmo comprador com carrinhos distintos, e ilimitado na prática (CPFs válidos são geráveis). Não é regressão (antes de (2) o empilhamento era pior), mas a trava não é rate-limit e não pode ser usada como tal.
- **RN-158 (NOVA · prazo do carrinho — 15 min da abertura para concluir)** — rodada **DEC-0726B**, item 26. Verbatim do Vitor: *"não existem carrinhos simultâneos, para isso temos o timer de 15 minutos ao momento de abertura do checkout, para conclusão de compra, não concluiu? cancelamo."* As duas definições que a regra exige, cravadas:
  - **ABERTURA = a primeira COTAÇÃO daquele (comprador, evento) no servidor.** É o primeiro instante em que a plataforma sabe que existe um carrinho — nenhum evento de tela anterior a esse chega ao backend. Cotar de novo dentro do prazo **não estende** nada (mesma disciplina do replay do PIX, que recarimba o `agora` e nunca a expiração).
  - **CONCLUIR = criar o PEDIDO com a cobrança** (`createInscricaoCharge`). Daí em diante governa a validade do MEIO.
  - **COMPOSIÇÃO DOS DOIS RELÓGIOS (sequencial, nunca paralela):** `abertura ──15 min (RN-158)──▶ conclusão ──30 min (RN-157)──▶ fim do PIX`. Quem conclui aos 14min59 tem os **30 minutos inteiros** de PIX: um relógio não encurta o outro, e a soma não é um teto de 15 min sobre o pagamento. Carrinho **concluído** nunca barra o retry legítimo da RN-157 (PIX venceu ⇒ cobrança nova) — quem limita isso é a trava do PIX.
  - **Estado terminal `expirado_sem_concluir`**, DISTINTO do `pix_expirado` do pedido: aqui nunca houve cobrança, e a fase 2 precisa contar as duas coisas separadas. Carimbo por cron contínuo (`expirarCarrinhosAbandonados`, 5 min, ADR-015). ⚠️ **O cron não decide venda:** quem recusa a conclusão fora do prazo é o gate transacional, contra o relógio do servidor — rodada atrasada ou morta atrasa só o carimbo (e o atraso fica mensurável: `expiraEmMillis` × `expiradoEmMillis`).
  - **FRONTEIRA DECLARADA (escalada):** quem chama `createInscricaoCharge` **sem ter cotado** não tem carrinho, e o prazo não o alcança — o gate falha ABERTO. Fechar isso exigiria tornar a cotação obrigatória para comprar, que é política nova e não foi ratificada. A tela sempre cota (o Resumo depende disso).
  - **O prazo NÃO é reserva de vaga:** carrinho aberto não segura estoque de lote (a vaga segue contada na CONFIRMAÇÃO — RN-300).
  - **STATUS:** ✅ implementado em `[LEELA-PIXCARRINHO-T2]` (`b7a2a77`) + carimbo da fase 2 em `[LEELA-PIXCARRINHO-T3]` (`522c23b`). **Fase 2 (visibilidade de carrinhos abandonados) NÃO foi construída** — só o dado nasce, em `carrinhos/{uid}__{evento}/ciclos/{n}` (estado + instantes + evento + tenant, sem PII nova). Aguarda review antagonista.
- **RN-170 (nova · troca + proporção; política de imagem em E17)** — toda **superfície de imagem** ganha ação **TROCAR** imagem + **ajuste automático de proporção** (fit/crop client-side para a proporção da superfície — capa 1.9:1, logo 1:1). Na landing, aplica-se às imagens editáveis que a superfície pública consome (capa do evento, logos). Complementa **RN-168** (upload-only — a URL colada morre em todas as superfícies). Casa da política = E17 (onde vive RN-168); aqui fica a nota de consumo. Lote `upload-sweep`.
  - **STATUS (UPLOAD-SWEEP · 2026-07-19):** ajuste de proporção implementado como crop **COVER** (center-crop, WYSIWYG com `object-cover`) em `apps/painel/src/components/upload/ajustarProporcao.ts` (geometria pura testável + degradação honesta: sem canvas/gif/avif → sobe o original). Aplicado via `ImageUploadField` nas superfícies com backend: **avatar 1:1**, **capa de perfil 16/9**, **capa de clube 16/9** (premissa de proporção documentada no checkpoint UPSW — capas usam a razão que a UI pública renderiza: clube `PerfilView` 16/9; perfil é banner full-bleed sem razão fixa → adotado 16/9). **Capa de evento 1.9:1/1600×838 (RN-228): ✅ PAGA no lote CAPA-EVENTO-UPLOAD (2026-07-19 · `[LEELA-CEV-*]`)** — path `eventos/{eventoId}/capa` nas storage.rules (fail-closed, cross-service firestore.get, jpeg/png/gif ≤2MB TAMBÉM na Rule), seam `uploadCapaEvento` + `salvarCapaEvento` no api-client, e `ImageUploadField` instanciado nas 2 telas (ConfigGerais imediato; Novo evento em modo DEFERRED — sobe após o `criarEvento`). Logo 1:1 de patrocinador/marca (R9-E) segue com validação de rejeição (fora do território deste lote — candidata a migrar para o crop COVER num próximo).
- **RN-173 (nova · CPF único; regra-mãe em E19)** — **CPF é único no sistema**; no checkout, informar um CPF já existente **associa à mesma pessoa** (linka, não duplica) e habilita o pré-preenchimento (RN-154) e a conta sem fricção (RN-155). Regra e disciplina de PII definidas no épico E19 (RN-173/RN-172); aqui fica o efeito no fluxo de checkout. Lote `cpf-unico`.
  - **STATUS BACKEND (CHECKOUT2-MODELO · 2026-07-19, `872e100`+`706bf77`+`78d6227`+`52dcc0d`+`a5e8ed8`):** o backend/modelo das 5 RNs foi PAGO (sem tela — a UI é o lote `CHECKOUT2-FORM`). **RN-173** registry `pessoas` transacional à prova de corrida + `pessoaRef` + first-claim/anti-hijack (detalhe em E19). **RN-154** genero por inscrito (enum `GENEROS_INSCRITO` reusado) + callable `getCheckoutPrefill` (só o PRÓPRIO via `contaUid`; anônimo/terceiro = null). **RN-155** conta sem fricção (Auth sem senha + `generatePasswordResetLink` oficial + EmailProvider fail-closed sem Brevo → pendência de envio, compra nunca quebra) disparada pós-confirmação. **RN-156** termo base sempre + termo custom aditivo (ver E04). **RN-157** `expiresIn`=1800s no `createCharge` (Mock+Asaas) + `pixExpiraEm` projetado p/ o timer + callable `expirarPixPendente` (pendente→cancelado `pix_expirado`, relógio do servidor, webhook em corrida vence). Review antagonista Fable: **APROVADO COM FIXES** — decisão de identidade F1/F2 ESCALADA ao Vitor (ver E19). Suíte functions inteira verde (2857 testes). Report `outputs/leela-build-2d6ee98d/CHECKOUT2-MODELO-REPORT.md`.
  - **STATUS DECISÃO F1/F2 (2026-07-19 · RESOLVIDA):** o Vitor decidiu — o claim da pessoa passa a exigir **pagamento confirmado + e-mail correspondente + e-mail confirmado** (**RN-174**, casa em E19). No checkout, o efeito é: `getCheckoutPrefill`/`dadosConhecidos` só respondem a uma conta que satisfaça as três condições; o vínculo `contaUid` migra da criação do pedido para a **confirmação de pagamento**. Vira o **lote de código `CLAIM-FIX`** (executável já, checkout/auth).

### RNs novas · rodada DEC-0719-ret (Vitor, 2026-07-19) — claim + estrangeiro

- **RN-174 (nova · efeito no checkout; regra-mãe em E19)** — o pré-preenchimento (RN-154) e a conta sem fricção (RN-155) só vinculam uma conta à ficha da pessoa quando há **pagamento confirmado + e-mail da conta igual ao da compra + e-mail confirmado (Firebase nativo)**. Alinha a RN-155: o **e-mail de confirmação** dispara no **primeiro login OU na primeira entrega de ingressos** (o que vier primeiro), **não** no ato da compra; o consumidor do `EmailProvider` é fail-closed (pendente `BREVO_API_KEY` só para o template próprio da marca — a verificação de e-mail em si é nativa do Firebase). Regra-mãe e detalhe de identidade/PII em E19. Lote `CLAIM-FIX`.
  - **✅ STATUS IMPLEMENTADA (CLAIM-FIX · 2026-07-19, `ca9ec6a`+`222dc3b`+`71c32d1`+`18d4fbb`):** no checkout, a criação do pedido NÃO vincula mais nada (`contaUid` nunca nasce ali); o vínculo é escrito SÓ na confirmação de pagamento (escritor único = conta sem fricção, que resolve a conta pelo e-mail da compra e carimba `contaEmail`). O `getCheckoutPrefill` só responde com token de e-mail **verificado** e **igual** ao da compra — qualquer outro caso devolve `prefill: null` no mesmo shape (a UI abre o form vazio; sem canal para sondar CPF de terceiro). Contrato do api-client inalterado (só doc). Review antagonista Fable: APROVADO COM FIXES (fix = teste da auto-cura hostil, aplicado). Detalhe completo e residuais em E19; report `outputs/leela-build-2d6ee98d/CLAIM-FIX-REPORT.md`.
- **RN-176 (nova · checkout de estrangeiro sem CPF; modelo Doity/Sympla sobre o Asaas)** — quando o organizador liga o toggle "aceitar inscrição de estrangeiros" (RN-175, E04), o checkout **pergunta a nacionalidade**; para estrangeiro, o **documento é PASSAPORTE** (formato/validação próprios), o **CPF fica oculto**, e o **pagamento é restrito a CARTÃO internacional À VISTA** — sem PIX, sem boleto, sem parcelamento (restrição do caminho Asaas de cobrança avulsa liberada). Verbatim do Vitor: *"pesquisei na sympla, o produtor pode habilitar a compra para estrangeiros, mas somente mediante passaporte, nesse caso a compra pode passar via cartao internacional, Mas o asaas permite isso. acredito que seja no modelo doity"*. O registry de pessoas passa a chave por **documento tipado** (RN-177, E19). **GATED por ação externa**: liberação da conta Asaas para pagador estrangeiro (contato com gerente de contas, ~6 dias úteis — ver DECISOES-ABERTAS); implementação de código só depois da liberação + sandbox provada. Fonte de fatos: `outputs/leela-build-2d6ee98d/ESTRANGEIRO-PAGAMENTO-REPORT.md` (Doity roda esse fluxo em produção sobre o mesmo Asaas; Sympla replica com processador próprio). **Paliativo já válido enquanto a liberação não sai:** um **comprador brasileiro paga pelo estrangeiro** (inscrito com passaporte), que funciona sem tocar na RN-173 — a spec do inscrito-estrangeiro é cobrada quando existir. Lote `ESTRANGEIRO-CHECKOUT` (gated).

### RNs novas · rodada TAXA-FLEX (Vitor, 2026-07-19) — taxa por meio de pagamento

Rodada `02-rodadas/2026-07-19-taxa-flex/`. A taxa da plataforma vira **percentual + fixo por meio de pagamento** (tabela por meio, dona em E04/RN-178; cálculo/congelamento em E09/RN-179..183). Aqui fica o **efeito no checkout**.

- **RN-180 (nova · exibição por meio; cálculo em E09)** — em modo **repassada** (RN-347), o total do comprador é `face + taxa(meio)`, com `taxa(meio) = round(face × percentual) + fixoCentavos` do meio escolhido. Como a taxa varia por meio, o checkout **exibe o total por opção de pagamento antes de pagar** — ex.: **PIX R$ 108,00 · Cartão R$ 110,30**. Em modo **incorporada**, o comprador vê o preço de face (não muda por meio). `computeSaleState` resolve a taxa por meio (percentual+fixo); nunca vaza `platformFeePct`/termos comerciais ao comprador. Lote `TAXA-FLEX`.
- **RN-179 (nova · efeito no checkout; regra-mãe em E09)** — o par `{percentual, fixoCentavos}` do meio escolhido é **carimbado** na cotação/pedido no ato da compra (campos `conciliacao.taxaPct/taxaFixa/taxaValor` já existentes); mudança da tabela não reprecifica pedido existente. Regra-mãe (congelamento, padrão COMF2/RN-347) em E09. Lote `TAXA-FLEX`.
- **Nota de taxa A-5 (atualização de UI · P-TAXAFLEX-6)** — a nota de transparência de taxa do checkout (hoje badge condicional **"+ taxa de serviço"** por `taxaRepassada`, entregue no lote CKFIX/CKFORM) passa a refletir que **o valor varia por meio de pagamento** (PIX vs cartão), em linha com a exibição por opção da RN-180. É atualização de spec de UI; o texto literal vive no código/`outputs/leela-build-2d6ee98d/CHECKOUT-UX-REPORT.md`, não nos canônicos. Lote `TAXA-FLEX`.
- **Premissa (f) · estrangeiro (RN-176)** — o **cartão internacional à vista** do checkout de estrangeiro (sem PIX/boleto/parcelamento) **herda a linha `cartao`** da tabela de taxa. Premissa; sem linha própria no v1.

### Decisões de UI/fluxo do checkout · DEC-0719 (sem RN — mecânica de tela)

- **D-2 · Cards por atleta + botão "+ adicionar atleta"** (ratificado). Supersede a tela 2 do wireframe 112-4622 (stepper de quantidade agregada). Coerente com ADR-011 (titular por inscrito).
- **D-4 · Campo de código/cupom no INÍCIO do fluxo** (step 0), em paridade com a referência — além do auto-apply do cupom vindo por URL.
- **D-5 · Pix|Cartão na etapa de pagamento como BOTÕES, sem toggle.** Verbatim: *"pix e cartao na etapa de pagamento, mas em botões, sem toggle."*

### Decisões de UI/fluxo do checkout · DEC-0729 (compra real do dono, sem RN — mecânica de tela)

Rodada `02-rodadas/2026-07-29-checkout-ux/`, 19 achados verbatim + D-0729-1..8, pagas na lane `CHECKOUT-UX`/`CHECKOUT-UX-RET` (trace `leela-build-2d6ee98d`). Detalhe completo em `.nirvana/handoffs/leela-build-2d6ee98d-CHECKOUT-UX.md`.

- **D-0729-1 · naming — Hub de Bem-Estar, não plataforma de corrida de rua.** Vocabulário de corrida sai da jornada de compra; quem se inscreve é **participante**, não "atleta"/"corredor". **Diretriz permanente**: todo texto NOVO na jornada de compra usa "participante". Escopo desta rodada foi contido ao texto que o comprador lê (títulos/labels/botões) — **fora, escalado ao dono**: texto legal de aceite (saúde/termos, benchmark Sympla Sports "Termo do Atleta") e a marca da home page (`/`, eyebrow "Corrida de rua" + H1 "Ache sua próxima corrida").
- **D-0729-2 · endereço — progressive disclosure pelo CEP.** Só o CEP visível; os demais campos aparecem quando ele fica COMPLETO (8 dígitos), não quando o ViaCEP responde com sucesso — preserva o fail-open da spec 5.2 (API fora ou CEP rural não pode travar a revelação dos campos).
- **D-0729-3 · resumo do pedido editável sem recomeçar.** Cada linha ganha "Alterar modalidade, kit ou tamanho", que leva ao card daquele participante (âncora estável) com o formulário preservado — nunca ao topo (perto demais de "recomeçar").
- **D-0729-6 · cartão de crédito abre no 1º clique.** Sem segunda tela; os campos do cartão vivem DENTRO da própria opção (contrato `children` do `RadioCard` do DS).
- **D-0729-7 · nascimento por teclado numérico, mobile-first.** Sem calendário obrigatório — `<input type="date">` exige navegação ano a ano no celular; vira campo com máscara `dd/mm/aaaa` + `inputMode="numeric"`.
- **Ritmo vertical (achado 13, sem número D-)** — hierarquia de dois degraus fixada como convenção: **24px entre blocos maiores** de uma etapa (ex.: Modalidade × Kit; Seu pedido × Cupom × Forma de pagamento × Totais), **16px dentro de um bloco** entre peças relacionadas (picker → grade de tamanho → detalhe do kit). Fonte única em `apps/landing/lib/containerPublico.ts` (largura) — o ritmo vertical em si não ganhou módulo próprio, mas o padrão gap-6/gap-4 é o mesmo em toda a jornada.
- **Container público único (achado 14, sem número D-)** — header, Hero e as dobras da página de evento (e a home) compartilham a MESMA composição de largura (`CONTAINER_GUTTER` + `CONTAINER_LARGURA`, `max-w-5xl`). Antes, três composições coexistiam com o mesmo valor nominal e ainda divergiam visualmente (padding no mesmo elemento do `max-w` desloca o conteúdo; padding no elemento pai, não).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Leitura pública (server-side) e escrita transacional:

- **`eventos/{eventoId}`** (docId = slug) — leitura pública apenas quando `status == 'publicado'|'ao_vivo'`. Campos lidos: `nome`, `data`, `local`, `modalidades[]`, `usaChip`, `slug`. ∑ `qtdInscritos`, `receitaConfirmada` (mantidos por Function; a landing só lê/dispara).
- **`eventos/{eventoId}/kits/{kitId}`** — `nome`, `preco` (aceita negativo), `capacidade`, `modalidades[]` (RN-210/211/216).
- **`eventos/{eventoId}/inscritos/{inscritoId}`** — **criado pelo checkout** (via Function). `atletaId?` (anônimo → cria/associa `atletas` por email), 🔁`atletaNome`, `kit`, `modalidade`, `status` (`pendente`→`confirmado`), `chipNumero: null`, `origem`/`atribuicaoAfiliadoRef?`.
- **`eventos/{eventoId}/programaAfiliacao/{unico}`** — read-only na landing: `comissaoPct`, `janelaAtribuicaoDias`, `tetoMensal?`, `cupom?` (RN-310/311).
- **`clubes/{clubId}`** (docId = slug) — leitura pública gated por `visibilidade` (RN-140). Campos: `nome`, `descricao`, `slug`, `categoria`, `modalidade`, `localizacao`, `codigoConvite` (não exposto), ∑ `qtdMembrosAtivos`.
- **`clubes/{clubId}/desafios/{desafioId}`** — só `visibilidade == 'publico'` (RN-117).
- **`clubes/{clubId}/parcerias/{parceriaId}`** (tipo `evento_afiliado`) — ∑ `conversoes`, `valorAReceber` atualizados pela Function de conversão/split. 🔁 `cupom`, `linkMaster`, `comissaoPct`, `janelaAtribuicaoDias`.
- **Documento de seed/atribuição de clique** (novo) — `linkClicks/{clickId}` ou cookie assinado: captura `affiliateCode`, `eventoId`, `clicadoEm` para resolver atribuição na conversão dentro da janela.
- **`eventos/{eventoId}/inscritos/{inscritoId}`** — campos novos coletados/emitidos por inscrito do pedido: ➕ `qrToken` (opaco, assinado, gerado na confirmação — S1206), ➕ `ingressoEmitidoEm` (S1206), ➕ `contatoEmergencia{ nome, telefone }` (S1207), ➕ `regulamentoAceite{ versao, aceitoEm, ipHash? }` (S1207), ➕ `consentimentoLgpd{ aceitoEm }` (S1207, separado do aceite de regulamento).
- ➕ **Subcoleção `eventos/{eventoId}/inscritos/{inscritoId}/notificacoes/{tipo}`** (S1206) — auditoria/idempotência do disparo transacional (`emailConfirmacao`): `enviadoEm`, `provedorMessageId?`, `status`. Escrita só por Function; sem leitura pública.
- ➕ **`tenants/{tenantId}/portal`** (S1208) — config do portal público: `blocos[] { tipo, ativo, ordem }`, `status`/`visibilidade`, `publicadoEm?`; leitura pública só quando publicado.
- ➕ **Subcoleção `tenants/{tenantId}/newsletterLeads/{leadId}`** (S1208) — captura de newsletter: `email`, `consentimentoEm`, `finalidade`, `origem`. Escrita só por Function; sem leitura pública.
- **`pedidos/{pedidoId}`** (ADR-011) — referência ao pedido em grupo consumida por S1206/S1207: `responsavel` (pagador, destinatário do e-mail), `inscritoRefs[]`, `pagamentoRef`, `valorTotal`. Um `createCharge`/webhook por pedido; ingresso, contato de emergência e aceite de regulamento são por inscrito, não pelo pedido.
- ➕ **CKMOD (2026-07-19 · spec CHECKOUT-UX §5 ratificada) — extensão de modelo ENTREGUE no pedido:** `responsavel.telefone?` (canal de contato), `endereco?{cep(8 dígitos canônicos), logradouro, bairro, cidade, uf, numero, complemento?}` (1× por pedido, do comprador — **CRM nunca agrega**, RN-172) e `aceites?{termos{versao,aceiteEm,materialHash}, saude{versao,aceiteEm}}` (padrão RN-149: cliente confirma booleans, servidor carimba a versão vigente da `politicaVendas` lida in-tx + o HASH do material aceito — prova autossuficiente na janela do trigger de bump (F-1) — + `TERMO_SAUDE_VERSAO_VIGENTE` + serverTimestamp). Inscrito ganhou bloco `[reg]` **parcial** (`dadosPessoais{cpf, nascimento?, telefone? (só responsável)}` — leitura Postel). **Distinto do `regulamentoAceite` POR INSCRITO de S1207** (segue pendente). **Pendência do lote de UI:** o form coletar/enviar os campos e **flipar a obrigatoriedade dos aceites** no `createInscricaoCharge` (hoje opcionais por compat com a UI vigente).

Todo agregado (∑) e campo financeiro é escrito **apenas por Cloud Function** (Admin SDK); a landing nunca escreve receita/conversão a partir do cliente. Security Rules na task que cria coleção.

## Análise futura — RESOLVIDA (rodada FORMBUILDER, 2026-07-19)

- **Construtor de formulário de perguntas personalizadas (CAP-FORMBUILDER → FORMBUILDER).** O Vitor destravou o construtor em 2026-07-19 (*"o construtor pode ser construido agora"*); a análise rodou em `02-rodadas/2026-07-19-formbuilder-analise/` e o item saiu de análise-futura para **executável**. Corte de v1 = **só perguntas** (seleção única/múltipla, sim/não); **anexo de arquivo = fase 2 GATED** (uma linha de backlog, sem elaboração). O render na compra é a **história S1212** deste épico (resposta gravada no inscrito — RN-185; obrigatória bloqueia o pagar no fence dos aceites — RN-186; carimbo de versão — RN-188). O modelo/core é único, dono em E04/S310; a inscrição de clube é E05/S112. RNs em §Regras de negócio novas (FORMBUILDER). Captura original preservada em `02-rodadas/2026-07-19-formbuilder/00-captura.md`.

## Fora de escopo (Won't nesta fase)

- Login / conta do atleta (é E13 mobile; a landing pode oferecer "baixar o app", mas não autentica).
- Edição de conteúdo/SEO da página (é do painel, E04/BH-300 — a landing só **renderiza** o que foi publicado).
- Painel do promotor/influenciador (E08) — a landing só **atribui** a conversão; o dashboard do afiliado é outro épico.
- Gateway de pagamento concreto (Pagar.me/Asaas/Stripe) — só a **interface** `PaymentProvider` + sandbox (ADR-006).
- Reembolso e estorno na UI pública (fluxo de pós-venda fica no painel/financeiro E09).
- Mapa interativo real de percurso (a seção "Percurso detalhado" renderiza imagem/altimetria estática; mapa vivo é V2).
- Telas genéricas de sistema (404/500/offline) — E07; aqui só os estados **públicos específicos** (evento não publicado, vendas encerradas, esgotado, clube privado).

> **Domínio público:** a Leela ainda não fixou o domínio. Todo path público usa o placeholder **`{leela-domain}`** (TBD) — **não** hardcodar `be-hero.com.br`. O link master de mock `beh.ro/mfl26?c=cps` é preservado como dado de mock de afiliação (encurtador), não como o domínio canônico da landing.

---

## User stories

Stories: **LEELA-S1200** (setup da superfície) · **S1201** (página de evento) · **S1202** (página de clube) · **S1203** (checkout 5 etapas) · **S1204** (atribuição de afiliado) · **S1205** (SEO técnico) · **S1206** (ingresso digital + e-mail de marca + PDF) · **S1207** (aceite de regulamento + contato de emergência) · **S1208** (portal público do organizador).

---

### LEELA-S1200 · Superfície landing SSR/ISR + shell público + leitura pública de dados · (de-para novo)

**Como** time, **quero** o app `apps/landing` em Next.js App Router com SSR/ISR, tema `leela` e um leitor server-side de dados publicados, **para** que todas as páginas públicas tenham fundação comum, seguras e rápidas.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Landing
- **Tela(s) de referência:** `WEB-APPV2 (1)/PaginaVendas-Conteudo.html` (banner de contexto "uma edição, dois canais" — o canal web é esta superfície)
- **RNs:** RN-140, RN-200 (só leitura de preço vigente)

**Critérios de aceite (Given/When/Then):**
- **Dado** o app landing, **quando** faço build, **então** as rotas públicas são Server Components com estratégia ISR (revalidação por tag) e nenhum segredo Firebase vaza no bundle do cliente.
- **Dado** um documento não publicado/privado, **quando** o leitor server-side tenta lê-lo para render público, **então** ele não retorna dados (gate por `status`/`visibilidade`), resultando em 404.
- **Dado** o tema, **quando** renderizo qualquer página pública, **então** aplica `theme="leela"` do DS (E01) sem redefinir token localmente.

**Tasks:** S1200-T1, S1200-T2

#### LEELA-S1200-T1 · Scaffold `apps/landing` (App Router, SSR/ISR) + layout público + ThemeProvider
- **Tipo:** setup · **Depende de:** E00 (monorepo + Firebase), E01-S001-1-T2 (ThemeProvider), E01-S001-3-T1 (Shell) · **Bloqueia:** todas as demais tasks do épico · **Estimativa:** M

**Objetivo**
Criar o app Next.js `apps/landing` com App Router, layout público (header simples + footer público, sem sidebar/breadcrumb de painel), `ThemeProvider theme="leela"` e ISR configurado, pronto para receber as rotas de evento/clube/checkout.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/PaginaVendas-Conteudo.html` (contexto de conteúdo; a landing NÃO reusa o shell de painel).
- ADR-004 (Next.js App Router, SSR/ISR para SEO), ADR-007 (Turborepo).
- DS: `ThemeProvider`, tokens semânticos (E01). Componentes de app (Sidebar/Breadcrumb) **não** entram aqui.

**Arquivos (criar/editar)**
- `apps/landing/app/layout.tsx` — root layout: `<html lang="pt-BR">`, `ThemeProvider theme="leela"`, fontes do tema.
- `apps/landing/app/(public)/layout.tsx` — layout público (header/footer públicos).
- `apps/landing/app/components/PublicHeader.tsx`, `PublicFooter.tsx` — logo Leela, links institucionais mínimos, "baixar o app".
- `apps/landing/next.config.js` — ISR/imagens/headers.
- `apps/landing/app/page.tsx` — home mínima (placeholder institucional; catálogo público é fora de escopo).
- `turbo.json` / `package.json` — registrar o app no monorepo.

**Passos de implementação**
1. Inicializar o app no monorepo consumindo `packages/design-system` e `packages/core`.
2. Root layout com `ThemeProvider theme="leela"`; header/footer públicos (sem navegação de painel).
3. Configurar renderização como Server Components por padrão; definir convenção de `revalidate` e `revalidateTag`.
4. Garantir que credenciais Firebase Admin ficam só no server (variáveis de ambiente server-only).

**Modelo de dados / contratos**
- Nenhuma coleção nova. Define a convenção de tags de revalidação: `event:{slug}`, `club:{slug}`.

**Regras de negócio a respeitar**
- Governança E01: tema `leela`, tokens semânticos, sem hardcode.

**Critérios de aceite (testáveis)**
- **Dado** o build, **quando** inspeciono o bundle do cliente, **então** não há chave/credencial Firebase Admin.
- **Dado** o app, **quando** abro a home, **então** renderiza no servidor com o tema `leela`.

**Testes a escrever**
- unit: layout monta `ThemeProvider` com `theme="leela"`.
- integração: rota SSR responde 200 e não expõe env server-only no HTML.

**Definition of Done** — ver checklist padrão (`definition-of-done.md`), DoD de Tela/rota + transversal (sem segredo no cliente).

**Fora de escopo**
Rotas de evento/clube/checkout (tasks seguintes); catálogo/busca pública de eventos.

#### LEELA-S1200-T2 · Leitor público server-side (Admin SDK) com gate de publicação/visibilidade + revalidação
- **Tipo:** api/function · **Depende de:** S1200-T1 · **Bloqueia:** S1201, S1202 · **Estimativa:** M

**Objetivo**
Expor funções server-side tipadas em `packages/api-client` que leem dados públicos de evento e clube aplicando o gate de `status`/`visibilidade`, para as rotas SSR consumirem sem lógica de autorização espalhada.

**Contexto & referências**
- Modelo: `eventos/{slug}` (`status`), `clubes/{slug}` (`visibilidade` — RN-140), subcoleções `kits`, `desafios` (RN-117), `programaAfiliacao`.
- ADR-005 (Firestore), Security Rules: atleta/anônimo lê só evento publicado + clube publico/indexavel.

**Arquivos (criar/editar)**
- `packages/api-client/src/public/getPublishedEvent.ts` — `getPublishedEvent(slug): PublicEvent | null`.
- `packages/api-client/src/public/getPublicClub.ts` — `getPublicClub(slug): PublicClub | null` (respeita RN-140).
- `packages/core/src/public/types.ts` — tipos `PublicEvent`, `PublicClub`, `PublicKit`, `PublicChallenge` (só campos públicos; sem `codigoConvite`).
- `firestore.rules` — regras de leitura pública (evento publicado; clube publico/indexavel).

**Passos de implementação**
1. `getPublishedEvent`: retorna `null` se `status ∉ {publicado, ao_vivo}`; monta `PublicEvent` (evento + kits + modalidades + programaAfiliacao read-only).
2. `getPublicClub`: retorna `null` se `visibilidade == 'privada'`; monta `PublicClub` (clube + desafios `publico` + eventos afiliados públicos); nunca inclui `codigoConvite`.
3. Mapear campos para os tipos públicos em `core` (nenhum dado sensível cruza para o cliente).
4. Escrever/atualizar Security Rules e testá-las no emulador.

**Modelo de dados / contratos**
- `getPublishedEvent(slug: string): Promise<PublicEvent | null>`
- `getPublicClub(slug: string): Promise<PublicClub | null>`
- Tipos em `packages/core`.

**Regras de negócio a respeitar**
- RN-140 (visibilidade clube), RN-117 (só desafio público), RN-200 (preço lido, nunca recalculado).

**Critérios de aceite (testáveis)**
- **Dado** evento `rascunho`, **quando** chamo `getPublishedEvent`, **então** retorna `null`.
- **Dado** clube `privada`, **quando** chamo `getPublicClub`, **então** retorna `null`; **dado** `indexavel`, **então** retorna o clube sem `codigoConvite`.

**Testes a escrever**
- unit: mapeamento evento→`PublicEvent` omite campos privados.
- integração (emulador): Security Rules bloqueiam leitura de evento não publicado e clube privado por cliente anônimo.

**Definition of Done** — DoD de API/Function (Security Rules na task) + transversal.

**Fora de escopo**
Render das páginas (S1201/S1202); qualquer escrita.

---

### LEELA-S1201 · Página pública de evento (SSR/SEO, seções publicadas, CTA de inscrição, URL+QR) · (de-para BH-300/BH-201)

**Como** atleta anônimo, **quero** abrir a página pública de um evento e ver tudo que preciso para decidir (data, local, modalidades, kits, retirada, FAQ, percurso, patrocinadores, depoimentos), **para** me inscrever com confiança e baixa fricção.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Landing
- **Tela(s) de referência:** `WEB-APPV2 (1)/PaginaVendas-Conteudo.html` (lista canônica de seções e agrupamento Web+App / Só Web)
- **RNs:** RN-201 (URL+QR), RN-200/301 (preços vigentes por modalidade/kit), RN-202/211/216 (kits), RN-207 (não coleta chip)

**Critérios de aceite (Given/When/Then):**
- **Dado** um evento publicado com seções ativas, **quando** abro `{leela-domain}/{eventSlug}`, **então** vejo o Hero (título, data, local, imagem) e as seções ativas na ordem publicada, renderizadas no servidor.
- **Dado** que uma seção está desativada no painel (toggle off), **quando** renderizo, **então** ela não aparece na página.
- **Dado** uma seção marcada "Só Web" (Percurso, Patrocinadores, Depoimentos), **quando** renderizo, **então** ela aparece na landing (o app a ignora — não é problema da landing).
- **Dado** o Hero, **quando** clico em "Garantir inscrição", **então** vou para o checkout do evento preservando parâmetros de atribuição.
- **Dado** um evento com `status == 'rascunho'`, **quando** acesso a URL, **então** recebo 404 público (`notFound()`).
- **Dado** vendas encerradas/esgotado, **quando** abro a página, **então** o CTA principal fica desabilitado com mensagem de estado e o conteúdo informativo permanece visível.

**Tasks:** S1201-T1, S1201-T2, S1201-T3

#### LEELA-S1201-T1 · Rota SSR/ISR do evento + renderizador de seções orientado por configuração
- **Tipo:** screen · **Depende de:** S1200-T2 · **Bloqueia:** S1201-T2, S1203-T1 · **Estimativa:** M

**Objetivo**
Criar `app/(public)/[eventSlug]/page.tsx` que carrega o evento publicado via leitor server-side, com ISR, e renderiza dinamicamente as seções ativas na ordem definida pelo organizador.

**Contexto & referências**
- Tela: `PaginaVendas-Conteudo.html` — seções essenciais (Capa, Modalidades, Kit do atleta, Retirada de kits, Informações gerais) + só-web (Percurso, Patrocinadores, Depoimentos) + Checkout (sistema).
- Mocks: Meia Maratona Floripa 2026 (`meia-floripa-2026`), 3 modalidades 5k/10k/21k, "a partir de R$ 99".
- DS: Banner Hero (E01), layout de seções, tokens `leela`.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/page.tsx` — Server Component; `getPublishedEvent(slug)`; `notFound()` se `null`; `export const revalidate` + tag `event:{slug}`.
- `apps/landing/app/(public)/[eventSlug]/SectionRenderer.tsx` — mapeia `sectionKey → componente`, filtra por `ativo` e ordena.
- `apps/landing/app/(public)/[eventSlug]/sections/index.ts` — registro das seções.

**Passos de implementação**
1. Carregar `PublicEvent` no server; `notFound()` quando `null`.
2. Ler a config de seções publicada (ativo + ordem); iterar e renderizar só as ativas.
3. Configurar ISR com `revalidate` e tag `event:{slug}` (revalidada quando o organizador republica).
4. Renderizar Hero como primeira seção; CTA "Garantir inscrição" aponta para `/{eventSlug}/inscricao`.

**Modelo de dados / contratos**
- Lê `eventos/{slug}` + `kits` + config de seções. Sem escrita.

**Regras de negócio a respeitar**
- RN-201 (URL pública), RN-200/301 (exibe preço vigente).

**Critérios de aceite (testáveis)**
- **Dado** `meia-floripa-2026` publicado, **quando** acesso a rota, **então** renderiza Hero + seções ativas na ordem publicada.
- **Dado** slug inexistente/rascunho, **quando** acesso, **então** 404.

**Testes a escrever**
- unit: `SectionRenderer` oculta seção com `ativo=false` e respeita ordem.
- e2e: abrir `/{eventSlug}` renderiza Hero + CTA (fluxo crítico #4 início — `estrategia-testes.md`).

**Definition of Done** — DoD Tela/rota (estados de carregando/erro; ISR) + transversal.

**Fora de escopo**
Conteúdo de cada seção (T2); estados de venda (T3); metadata/OG (S1205).

#### LEELA-S1201-T2 · Componentes de seção (Hero, Modalidades, Kits, Retirada, Info/FAQ, Percurso, Patrocinadores, Depoimentos)
- **Tipo:** ui-component · **Depende de:** S1201-T1 · **Estimativa:** M

**Objetivo**
Implementar os componentes de conteúdo de cada seção pública do evento, consumindo dados do `PublicEvent` e os componentes do DS, com estados vazios quando um campo opcional não foi preenchido.

**Contexto & referências**
- Tela: `PaginaVendas-Conteudo.html` — descrição de cada seção (ex.: Modalidades "3 percursos lado a lado · 5km · 10km · 21km · a partir de R$ 99"; Kit "4 kits · Ouro/Prata/Básico/Sem kit · galeria de itens"; Retirada "24 e 25 Abr · Academia Athletico Beira-Mar"; Info "accordion 12 tópicos").
- Mocks: kits Ouro/Prata/Básico/Sem kit; itens por kit (Olympikus sacochila, Growth whey, Centauro viseira, Probiótica gel — de BH-205).
- DS: Card de Evento/Modalidade, Card de kit + galeria, Accordion, grid de logos, Card de depoimento (E01).

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/sections/HeroSection.tsx` — Banner Hero (título, data, local, imagem/gradiente por categoria) + CTA.
- `.../sections/ModalidadesSection.tsx` — modalidades lado a lado, preço "a partir de" (RN-301).
- `.../sections/KitsSection.tsx` — kits com galeria de itens; "Sem kit" exibido (RN-211/216); nunca "tier".
- `.../sections/RetiradaSection.tsx` — janela/local/documentos.
- `.../sections/InfoGeraisSection.tsx` — accordion de tópicos (FAQ/regulamento).
- `.../sections/PercursoSection.tsx` — imagem/altimetria estática (só-web).
- `.../sections/PatrocinadoresSection.tsx` — grid de logos em níveis (só-web).
- `.../sections/DepoimentosSection.tsx` — cards de depoimento (só-web).

**Passos de implementação**
1. Cada seção recebe seu slice tipado do `PublicEvent` e renderiza com componentes DS.
2. Preços por modalidade/kit sempre lidos do dado (RN-200/301); "a partir de" = menor preço vigente.
3. Kits: rótulo "kit" (RN-216); "Sem kit" é opção válida (RN-211).
4. Estado vazio por seção quando o slice está vazio (ex.: sem patrocinadores → seção não renderiza).

**Modelo de dados / contratos**
- Consome `PublicEvent` (S1200-T2). Sem escrita.

**Regras de negócio a respeitar**
- RN-216 ("kit"), RN-211 (Sem kit), RN-301 (preço por modalidade), RN-207 (nenhuma coleta de chip aqui).

**Critérios de aceite (testáveis)**
- **Dado** 4 kits incluindo "Sem kit", **quando** renderizo Kits, **então** os 4 aparecem com rótulo "kit" e preços vigentes.
- **Dado** evento sem depoimentos, **quando** renderizo, **então** a seção Depoimentos não aparece.

**Testes a escrever**
- unit: KitsSection nunca renderiza a string "tier"; "a partir de" calcula o menor preço.
- unit: seção só-web sem dados retorna `null`.

**Definition of Done** — DoD Componente + Tela/rota (estados vazios) + transversal.

**Fora de escopo**
Interatividade de checkout (S1203); mapa vivo de percurso.

#### LEELA-S1201-T3 · Estados públicos do evento (rascunho→404, vendas encerradas, esgotado) + bloco compartilhar/QR (RN-201)
- **Tipo:** screen · **Depende de:** S1201-T1 · **Estimativa:** S

**Objetivo**
Cobrir os estados públicos específicos do evento e renderizar o bloco de compartilhamento (URL amigável + QR) coerente com a publicação (RN-201).

**Contexto & referências**
- Tela: `PaginaVendas-Conteudo.html` (ações rápidas: copiar link público, compartilhar redes, baixar QR — no painel; a landing expõe o compartilhamento ao visitante).
- Glossário (`HANDOFF-07`): toasts "Link da página pública copiado".
- E07 cobre 404/500 genéricos; aqui só os estados de venda específicos.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/SaleState.tsx` — deriva estado de venda (aberto/encerrado/esgotado) a partir de datas/`qtdInscritos`/capacidade.
- `apps/landing/app/(public)/[eventSlug]/ShareBlock.tsx` — URL amigável + botão copiar + QR (imagem gerada da URL pública).
- `packages/core/src/public/saleState.ts` — derivação pura do estado de venda.

**Passos de implementação**
1. Derivar estado de venda em `core` (encerrado se passou a data/limite; esgotado se capacidade atingida).
2. CTA "Garantir inscrição" desabilita em encerrado/esgotado com mensagem; conteúdo informativo permanece.
3. `notFound()` já tratado em T1 para rascunho; garantir cobertura de teste.
4. ShareBlock: copiar URL (toast do glossário) + QR da URL pública (RN-201).

**Modelo de dados / contratos**
- `deriveSaleState(event): 'aberto' | 'encerrado' | 'esgotado'` em `core`.

**Regras de negócio a respeitar**
- RN-201 (URL+QR consistentes com a publicação).

**Critérios de aceite (testáveis)**
- **Dado** evento com data passada, **quando** abro, **então** CTA desabilitado + "Inscrições encerradas".
- **Dado** capacidade atingida, **quando** abro, **então** "Esgotado" e CTA desabilitado.
- **Dado** a página, **quando** copio o link, **então** toast "Link da página pública copiado".

**Testes a escrever**
- unit: `deriveSaleState` por data/capacidade.
- e2e: evento encerrado bloqueia entrada no checkout.

**Definition of Done** — DoD Tela/rota + transversal.

**Fora de escopo**
404/500/offline genéricos (E07).

---

### LEELA-S1202 · Página pública de clube (visibilidade RN-140, desafios públicos, eventos afiliados, CTA) · (de-para BH-110)

**Como** atleta anônimo, **quero** abrir a página pública de um clube e entender o que ele é, seus desafios públicos e eventos que promove, **para** decidir entrar (via app) ou me inscrever num evento associado.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Landing
- **Tela(s) de referência:** identidade do clube (mock Corrida Perfeita Sul; slug `corrida-perfeita-sul`)
- **RNs:** RN-140 (visibilidade), RN-117 (desafio público), RN-141 (aprovação manual no CTA), RN-125 (eventos afiliados)

**Critérios de aceite (Given/When/Then):**
- **Dado** um clube `publica`/`indexavel`, **quando** abro `{leela-domain}/c/{clubSlug}`, **então** vejo nome, bio, KPIs públicos (nº de membros), desafios públicos e eventos que o clube promove.
- **Dado** um clube `privada`, **quando** acesso a URL, **então** recebo 404 público.
- **Dado** desafios do clube, **quando** renderizo, **então** só os de `visibilidade == 'publico'` aparecem (RN-117).
- **Dado** clube com aprovação manual (RN-141), **quando** vejo o CTA de entrada, **então** ele informa que a entrada aguarda liberação e direciona ao app.
- **Dado** um evento afiliado do clube, **quando** clico nele, **então** vou para a página pública do evento preservando a atribuição do clube (link master/cupom).

**Tasks:** S1202-T1, S1202-T2

#### LEELA-S1202-T1 · Rota SSR/ISR do clube com gate de visibilidade (RN-140)
- **Tipo:** screen · **Depende de:** S1200-T2 · **Estimativa:** S

**Objetivo**
Criar `app/(public)/c/[clubSlug]/page.tsx` que carrega o clube público (gate RN-140) via leitor server-side, com ISR, e trata `privada`→404.

**Contexto & referências**
- Mock: Corrida Perfeita Sul (`corrida-perfeita-sul`, 120 membros ativos, categoria Assessoria esportiva).
- RN-140 (publica/indexavel/privada). ISR tag `club:{slug}`.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/c/[clubSlug]/page.tsx` — `getPublicClub(slug)`; `notFound()` se `null`; `revalidate` + tag `club:{slug}`.

**Passos de implementação**
1. Carregar `PublicClub`; `notFound()` quando `null` (cobre `privada`).
2. Configurar ISR e tag de revalidação.
3. `indexavel` permite indexação; `publica` acessível por link mas metadata `robots: noindex` (tratado em S1205).

**Modelo de dados / contratos**
- Lê `clubes/{slug}` (gate por `visibilidade`). Sem escrita.

**Regras de negócio a respeitar**
- RN-140.

**Critérios de aceite (testáveis)**
- **Dado** clube `privada`, **quando** acesso, **então** 404.
- **Dado** clube `indexavel`, **quando** acesso, **então** 200 com dados públicos.

**Testes a escrever**
- e2e: `privada` → 404; `indexavel` → 200 (fluxo crítico de visibilidade).
- integração: leitor respeita `visibilidade`.

**Definition of Done** — DoD Tela/rota + transversal.

**Fora de escopo**
Conteúdo (T2); entrada no clube (é app/E13).

#### LEELA-S1202-T2 · Conteúdo da página do clube (hero, bio, KPIs, desafios públicos, eventos afiliados, CTA)
- **Tipo:** ui-component · **Depende de:** S1202-T1 · **Estimativa:** M

**Objetivo**
Renderizar o conteúdo público do clube: hero + bio, KPIs públicos, lista de desafios públicos (RN-117), eventos que o clube promove (RN-125) e o CTA de entrada coerente com RN-141.

**Contexto & referências**
- Mock: bio aprovada do Corrida Perfeita Sul; desafios (só os `publico`); eventos afiliados (Meia Floripa 2026 cupom `CORRIDAPERFEITA10`, Trail Ratones, Corrida da Ponte).
- DS: Banner Hero, Card de Desafio (progress-bar), Card de Evento (E01).
- Glossário: toasts de copiar link.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/c/[clubSlug]/ClubHero.tsx`, `ClubStats.tsx`, `ClubChallenges.tsx`, `ClubEvents.tsx`, `ClubJoinCTA.tsx`.

**Passos de implementação**
1. Hero + bio + KPIs públicos (nº membros ativos ∑, categoria, localização); nunca expor `codigoConvite`.
2. Desafios: renderizar só `visibilidade == 'publico'` (RN-117) com Card de Desafio.
3. Eventos afiliados: Card de Evento, cada link preserva atribuição do clube (cupom/link master — coordena com S1204).
4. CTA de entrada: se `aprovacaoManual` (RN-141), texto informa liberação pendente; direciona ao app (download/deep link).

**Modelo de dados / contratos**
- Consome `PublicClub`. Sem escrita.

**Regras de negócio a respeitar**
- RN-117, RN-125, RN-141.

**Critérios de aceite (testáveis)**
- **Dado** clube com 1 desafio `publico` e 2 `membros`, **quando** renderizo, **então** só o público aparece.
- **Dado** clube com aprovação manual, **quando** vejo o CTA, **então** informa que a entrada aguarda liberação.

**Testes a escrever**
- unit: filtro de desafios por visibilidade; CTA muda com `aprovacaoManual`.

**Definition of Done** — DoD Componente + Tela/rota (estados vazios) + transversal.

**Fora de escopo**
Fluxo de entrada no clube (app/E13); códigos de convite.

---

### LEELA-S1203 · Checkout do atleta anônimo — Stepper de 5 etapas + PaymentProvider · (de-para BH-300)

**Como** atleta anônimo, **quero** me inscrever e pagar por um evento em um fluxo guiado de 5 etapas sem criar conta, **para** garantir minha vaga com o mínimo de fricção.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Landing
- **Tela(s) de referência:** `PaginaVendas-Conteudo.html` (seção Checkout = sistema: "modalidade → kit → dados → pagamento"); o Stepper canônico do épico é **Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação** (5 etapas do DS E01-S001-3-T4)
- **RNs:** RN-202/211/216 (kit), RN-204 (status), RN-200/301 (preço), RN-207 (sem chip), RN-311/125 (cupom/atribuição — integra S1204)

**Critérios de aceite (Given/When/Then):**
- **Dado** o CTA "Garantir inscrição", **quando** entro no checkout, **então** vejo o Stepper com 5 etapas na ordem Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação.
- **Dado** a etapa Dados, **quando** deixo campo obrigatório inválido, **então** avanço é bloqueado com erro inline.
- **Dado** a etapa Modalidade/Kit, **quando** escolho modalidade e um kit (inclusive "Sem kit"), **então** o Resumo reflete o preço vigente; nunca aparece "tier".
- **Dado** o Resumo com cupom `CORRIDAPERFEITA10`, **quando** aplico, **então** o total cai 10% e o afiliado é resolvido (S1204).
- **Dado** a etapa Pagamento, **quando** confirmo via `PaymentProvider` sandbox, **então** a inscrição nasce `pendente` e, no webhook aprovado, vira `confirmado`.
- **Dado** o pagamento aprovado, **quando** chego à Confirmação, **então** vejo os dados da inscrição, kit, valor e próximos passos (retirada), sem coletar número de chip (RN-207).

**Tasks:** S1203-T1 … S1203-T6

#### LEELA-S1203-T1 · Rota + máquina de estado do Stepper (5 etapas) + preservação de contexto
- **Tipo:** screen · **Depende de:** S1201-T1, E01-S001-3-T4 (Stepper) · **Bloqueia:** T2–T6 · **Estimativa:** M

**Objetivo**
Criar `app/(public)/[eventSlug]/inscricao/page.tsx` com a máquina de estado das 5 etapas, validação de avanço, e preservação dos parâmetros de atribuição (`?c=`) e do evento.

**Contexto & referências**
- DS: Stepper de checkout 5 etapas (E01). Ordem canônica: Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação.
- Sem `localStorage` para estado de domínio (usar estado de navegação/URL + memória do componente).

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/page.tsx` — carrega `PublicEvent`; monta o Stepper.
- `apps/landing/app/(public)/[eventSlug]/inscricao/CheckoutMachine.tsx` — estado das etapas + guards de avanço.
- `packages/core/src/checkout/steps.ts` — definição pura das etapas e validações de transição.

**Passos de implementação**
1. Definir as 5 etapas e as regras de avanço em `core` (transição só com etapa válida).
2. Bloquear checkout se evento encerrado/esgotado (reusa `deriveSaleState`, S1201-T3).
3. Preservar `eventSlug` e `affiliateCode` do query/cookie ao longo das etapas.
4. Não persistir dados sensíveis em `localStorage`.

**Modelo de dados / contratos**
- Estado em memória; nenhuma escrita até o Pagamento (T5/T6).

**Regras de negócio a respeitar**
- RN-207 (sem etapa de chip); estado de venda (S1201-T3).

**Critérios de aceite (testáveis)**
- **Dado** o checkout, **quando** monto, **então** há exatamente 5 etapas na ordem canônica.
- **Dado** evento esgotado, **quando** tento entrar no checkout, **então** sou bloqueado.

**Testes a escrever**
- unit: máquina de estado — transições válidas/ inválidas.
- e2e (início): CTA → checkout mostra etapa Dados.

**Definition of Done** — DoD Tela/rota + transversal (sem `localStorage` de domínio).

**Fora de escopo**
Conteúdo de cada etapa (T2–T6).

#### LEELA-S1203-T2 · Etapa Dados (formulário do atleta anônimo + validação)
- **Tipo:** ui-component · **Depende de:** S1203-T1 · **Estimativa:** S

**Objetivo**
Coletar os dados do atleta anônimo (nome, email, CPF, telefone, e dados obrigatórios da prova) com validação inline, sem exigir login.

**Contexto & referências**
- Modelo: `atletas/{atletaId}` (nome, email) — o email é a chave de associação/criação do atleta no T6.
- DS: Input (estados invalid + erro inline), Button.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/DadosStep.tsx`.
- `packages/core/src/checkout/validateDados.ts` — validações puras (email, CPF, obrigatórios).

**Passos de implementação**
1. Formulário com validação client + regras puras em `core`.
2. Bloquear avanço enquanto inválido; erro inline por campo.
3. LGPD: consentimento de uso de dados (checkbox) antes de avançar.

**Modelo de dados / contratos**
- Produz `DadosAtleta` (em memória) para o T6.

**Regras de negócio a respeitar**
- Sem login; consentimento LGPD.

**Critérios de aceite (testáveis)**
- **Dado** email inválido, **quando** tento avançar, **então** erro inline e avanço bloqueado.
- **Dado** todos os campos válidos + consentimento, **quando** avanço, **então** vou para Modalidade/Kit.

**Testes a escrever**
- unit: `validateDados` (email/CPF/obrigatórios).

**Definition of Done** — DoD Componente + transversal (LGPD).

**Fora de escopo**
Persistência (T6).

#### LEELA-S1203-T3 · Etapa Modalidade/Kit (seleção com preço vigente; "Sem kit"; RN-216)
- **Tipo:** ui-component · **Depende de:** S1203-T1 · **Estimativa:** S

**Objetivo**
Permitir escolher a modalidade e um kit (incluindo "Sem kit") com preços vigentes, alimentando o Resumo.

**Contexto & referências**
- Mocks: modalidades 5k/10k/21k; kits Ouro/Prata/Básico/Sem kit.
- RN-202/211/216 (kit; "Sem kit" válido; nunca "tier"), RN-301 (preço por modalidade).
- DS: Card de kit + galeria.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/ModalidadeKitStep.tsx`.
- `packages/core/src/checkout/pricing.ts` — cálculo puro do subtotal (modalidade + kit, aceita kit negativo).

**Passos de implementação**
1. Selecionar modalidade → filtra kits disponíveis para a modalidade (RN-210).
2. Selecionar kit (rótulo "kit"; "Sem kit" válido, RN-211/216).
3. Calcular subtotal com preço vigente (RN-200/301); kit "Sem kit" pode aplicar desconto (preço negativo).

**Modelo de dados / contratos**
- Produz `{ modalidade, kitId, subtotal }` (memória).

**Regras de negócio a respeitar**
- RN-216, RN-211, RN-301, RN-210.

**Critérios de aceite (testáveis)**
- **Dado** kits disponíveis, **quando** escolho "Sem kit" com desconto, **então** o subtotal reflete o preço (negativo) corretamente.
- **Dado** a UI, **quando** inspeciono, **então** nunca aparece "tier".

**Testes a escrever**
- unit: `pricing` (kit negativo, preço por modalidade).

**Definition of Done** — DoD Componente + transversal.

**Fora de escopo**
Cupom (T4/S1204).

#### LEELA-S1203-T4 · Etapa Resumo (order summary + aplicação de cupom)
- **Tipo:** ui-component · **Depende de:** S1203-T2, S1203-T3, S1204-T2 · **Estimativa:** S

**Objetivo**
Mostrar o resumo do pedido (dados + modalidade + kit + valores) e permitir aplicar cupom, exibindo o total final antes do pagamento.

**Contexto & referências**
- Mock cupom: `CORRIDAPERFEITA10` (−10%).
- RN-311 (cupom do programa de afiliação); coordena com S1204-T2 (validação/atribuição).
- DS: resumo de valores, Input de cupom, toast "Cupom [código] copiado/aplicado".

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/ResumoStep.tsx`.
- `packages/core/src/checkout/applyCoupon.ts` — desconto puro (reusa validação de S1204-T2).

**Passos de implementação**
1. Exibir dados, modalidade, kit, subtotal.
2. Campo de cupom → valida via S1204-T2 → aplica desconto → total.
3. Cupom inválido/expirado → erro inline, total inalterado.

**Modelo de dados / contratos**
- Produz `{ total, cupomAplicado?, afiliadoRef? }` (memória).

**Regras de negócio a respeitar**
- RN-311 (cupom), RN-200 (preço base vigente).

**Critérios de aceite (testáveis)**
- **Dado** `CORRIDAPERFEITA10`, **quando** aplico, **então** total = subtotal −10% e afiliado resolvido.
- **Dado** cupom inválido, **quando** aplico, **então** erro e total inalterado.

**Testes a escrever**
- unit: `applyCoupon` (percentual, cupom inválido/expirado).

**Definition of Done** — DoD Componente + transversal.

**Fora de escopo**
Cálculo de split/comissão (S1204-T3).

#### LEELA-S1203-T5 · Etapa Pagamento (`PaymentProvider.createCharge`, Pix/cartão)
- **Tipo:** integration · **Depende de:** S1203-T4, ADR-006 (interface) · **Estimativa:** M

**Objetivo**
Iniciar a cobrança via interface `PaymentProvider` (Pix + cartão), sem gateway concreto, criando a inscrição `pendente` e aguardando o retorno de pagamento.

**Contexto & referências**
- ADR-006: `PaymentProvider` (`createCharge`, `splitRules`, `refund`, `handleWebhook`, `getPayout`) em `packages/core`, implementação sandbox em `functions/`.
- `estrategia-testes.md`: pagamento é cobertura crítica (risco financeiro).
- RN-204 (inscrito nasce `pendente`).

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/PagamentoStep.tsx` — UI Pix/cartão; chama Function server.
- `functions/src/payments/createInscricaoCharge.ts` — callable/HTTPS: cria inscrito `pendente` + `PaymentProvider.createCharge`.
- `functions/src/payments/sandboxProvider.ts` — implementação sandbox da interface.

**Passos de implementação**
1. UI escolhe Pix ou cartão; envia dados do pedido à Function (validação server, nunca confiar no cliente).
2. Function cria `inscritos/{id}` `status='pendente'` e chama `createCharge` (com `splitRules` do afiliado quando houver — S1204).
3. Retorna Pix copia-e-cola / status de cartão ao cliente; não confirma inscrição no cliente.
4. Erros observáveis no Sentry (sem dado sensível).

**Modelo de dados / contratos**
- Escreve `eventos/{id}/inscritos/{inscritoId}` (`pendente`) via Function; `createCharge(input) -> { chargeId, pixCode?, status }`.

**Regras de negócio a respeitar**
- RN-204 (pendente), validação server-side.

**Critérios de aceite (testáveis)**
- **Dado** o pedido válido, **quando** confirmo pagamento, **então** a Function cria inscrito `pendente` e retorna a cobrança do provider sandbox.
- **Dado** falha do provider, **quando** confirmo, **então** erro tratado sem criar inscrição confirmada.

**Testes a escrever**
- integração (emulador + provider sandbox): `createCharge` cria inscrito `pendente`; falha não confirma.
- unit: montagem de `splitRules` quando há afiliado.

**Definition of Done** — DoD API/Function (validação server, Sentry) + transversal (sem segredo no cliente).

**Fora de escopo**
Confirmação via webhook (T6); split/atribuição (S1204-T3); gateway concreto.

#### LEELA-S1203-T6 · Confirmação + webhook idempotente (inscrito→confirmado, ∑ receita/inscritos)
- **Tipo:** api/function · **Depende de:** S1203-T5 · **Estimativa:** M

**Objetivo**
Processar o webhook de pagamento aprovado de forma idempotente: confirmar a inscrição (RN-204), criar/associar o atleta anônimo, atualizar agregados e renderizar a tela de Confirmação.

**Contexto & referências**
- Modelo: `atletas/{id}` (cria por email se anônimo), `eventos/{id}/inscritos/{id}` (`confirmado`), ∑ `qtdInscritos`, `receitaConfirmada` (Function).
- `estrategia-testes.md` fluxo crítico #4 (inscrição → pagamento → confirmação); webhook idempotente.
- RN-204, RN-207 (chip nulo).

**Arquivos (criar/editar)**
- `functions/src/payments/handlePaymentWebhook.ts` — `PaymentProvider.handleWebhook`, assinatura verificada, idempotente.
- `functions/src/aggregates/onInscritoConfirmed.ts` — atualiza ∑ `qtdInscritos`/`receitaConfirmada` (idempotente).
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/ConfirmacaoStep.tsx` — resumo final + próximos passos (retirada).
- `apps/landing/app/(public)/[eventSlug]/inscricao/confirmacao/[inscritoId]/page.tsx` — página de confirmação acessível por link (pós-pagamento).

**Passos de implementação**
1. Webhook verifica assinatura; idempotência por `chargeId`/eventId (reprocessar não duplica).
2. Cria/associa `atletas` por email; atualiza inscrito para `confirmado`; `chipNumero` permanece `null` (RN-207).
3. Trigger de agregado atualiza ∑ receita/inscritos de forma idempotente.
4. Confirmação exibe kit, modalidade, valor pago e instruções de retirada.

**Modelo de dados / contratos**
- `handleWebhook(payload) -> void` (idempotente); atualiza inscrito + agregados.

**Regras de negócio a respeitar**
- RN-204 (confirmado), RN-207 (chip nulo), agregados só por Function.

**Critérios de aceite (testáveis)**
- **Dado** webhook aprovado, **quando** processo, **então** inscrito vira `confirmado` e ∑ receita/inscritos sobem uma vez.
- **Dado** o mesmo webhook reenviado, **quando** reprocesso, **então** nada duplica (idempotente).
- **Dado** pagamento confirmado, **quando** chego à Confirmação, **então** vejo dados + próximos passos, sem número de chip.

**Testes a escrever**
- integração (crítico): webhook idempotente confirma inscrição e agrega uma vez; reprocessamento não duplica.
- e2e (fluxo crítico #4): inscrição → pagamento → confirmação ponta a ponta (provider sandbox).

**Definition of Done** — DoD API/Function (webhook idempotente/assinado, agregados idempotentes) + Tela/rota + transversal.

**Fora de escopo**
Atribuição/split ao afiliado (S1204-T3); reembolso (E09).

---

### LEELA-S1204 · Atribuição de conversão via link master / cupom de afiliado (dentro da janela) · (de-para BH-301)

**Como** clube/promotor afiliado, **quero** que uma venda originada pelo meu link master ou cupom seja atribuída a mim quando ocorre dentro da janela, **para** receber a comissão sem controlar em planilha.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Landing + Functions
- **Tela(s) de referência:** — (backstage; a UI é o checkout de S1203)
- **RNs:** RN-125 (link master + cupom + comissão), RN-310 (organizador define comissão, read-only), RN-311 (%, janela, teto, cupom)

**Critérios de aceite (Given/When/Then):**
- **Dado** o acesso via link master `beh.ro/mfl26?c=cps`, **quando** chego à página do evento, **então** o código de afiliado é capturado e persiste (cookie assinado) pela janela de atribuição.
- **Dado** o cupom `CORRIDAPERFEITA10` aplicado no checkout, **quando** valido, **então** resolvo o afiliado dono do cupom e aplico o desconto.
- **Dado** uma conversão paga dentro da janela (RN-311), **quando** o pagamento é confirmado, **então** registro a conversão atribuída ao afiliado e atualizo ∑ `conversoes`/`valorAReceber` via `splitRules`.
- **Dado** uma conversão fora da janela, **quando** o pagamento é confirmado, **então** não atribuo comissão.
- **Dado** teto mensal atingido (RN-311), **quando** processo a conversão, **então** respeito o teto.

**Tasks:** S1204-T1, S1204-T2, S1204-T3

#### LEELA-S1204-T1 · Captura de link master (`?c=`) + cookie de atribuição por janela
- **Tipo:** integration · **Depende de:** S1200-T1 · **Estimativa:** S

**Objetivo**
Capturar o código de afiliado do link master no acesso à página pública e persistir a atribuição (cookie assinado, server-side) com validade igual à janela de atribuição do programa.

**Contexto & referências**
- Mock: link master `beh.ro/mfl26?c=cps` (afiliado `cps` = Corrida Perfeita Sul), janela 7 dias (RN-311).
- Cookie assinado server-side (sem `localStorage` de domínio).

**Arquivos (criar/editar)**
- `apps/landing/middleware.ts` ou route handler — lê `?c=`, seta cookie `leela_aff` assinado com `expires = janelaAtribuicaoDias`.
- `packages/core/src/affiliation/attribution.ts` — resolução pura de atribuição (código → afiliado, dentro da janela).

**Passos de implementação**
1. Ao acessar `/{eventSlug}?c=<code>`, resolver o programa de afiliação e a janela; setar cookie assinado.
2. Se já houver atribuição válida, aplicar política (primeiro clique dentro da janela; documentar).
3. Não usar `localStorage`; cookie httpOnly assinado.

**Modelo de dados / contratos**
- Lê `eventos/{id}/programaAfiliacao` (read-only). Cookie `{ affiliateCode, eventoId, clicadoEm }`.

**Regras de negócio a respeitar**
- RN-311 (janela), RN-125 (link master).

**Critérios de aceite (testáveis)**
- **Dado** `?c=cps`, **quando** acesso, **então** cookie de atribuição é setado com validade da janela.
- **Dado** cookie expirado, **quando** converto, **então** não há atribuição.

**Testes a escrever**
- unit: `attribution` — dentro/fora da janela.
- integração: middleware seta cookie assinado a partir de `?c=`.

**Definition of Done** — DoD API/Function + transversal (sem `localStorage`, cookie assinado).

**Fora de escopo**
Aplicação do cupom (T2); split (T3).

#### LEELA-S1204-T2 · Validação e resolução de cupom de afiliado (aplica desconto + resolve afiliado)
- **Tipo:** api/function · **Depende de:** S1204-T1 · **Bloqueia:** S1203-T4 · **Estimativa:** S

**Objetivo**
Validar o cupom no checkout, resolver o afiliado dono e retornar o desconto, para o Resumo aplicar e a conversão ser atribuída.

**Contexto & referências**
- Mocks: `CORRIDAPERFEITA10` (−10%, afiliado CPS, Meia Floripa), `CORRIDAPS15` (Trail Ratones).
- RN-311 (cupom do programa), RN-310 (comissão read-only).

**Arquivos (criar/editar)**
- `functions/src/affiliation/validateCoupon.ts` — callable: `validateCoupon(eventoId, code) -> { valid, descontoPct, afiliadoRef }`.
- `packages/core/src/affiliation/coupon.ts` — regras puras (formato, expiração, associação a afiliado).

**Passos de implementação**
1. Resolver cupom no `programaAfiliacao`/`parcerias` do evento; validar expiração/uso.
2. Retornar desconto e `afiliadoRef` (para atribuição na conversão).
3. Cupom inválido → `{ valid: false }`.

**Modelo de dados / contratos**
- `validateCoupon(eventoId, code) -> { valid, descontoPct, afiliadoRef? }`.

**Regras de negócio a respeitar**
- RN-311, RN-310 (comissão não editável na landing).

**Critérios de aceite (testáveis)**
- **Dado** `CORRIDAPERFEITA10`, **quando** valido, **então** `valid=true`, desconto 10%, afiliado CPS.
- **Dado** cupom inexistente, **quando** valido, **então** `valid=false`.

**Testes a escrever**
- unit: `coupon` (válido/expirado/inexistente).
- integração: `validateCoupon` resolve afiliado do mock.

**Definition of Done** — DoD API/Function + transversal.

**Fora de escopo**
Cálculo/registro de split (T3).

#### LEELA-S1204-T3 · Function de conversão + split (∑ conversoes/valorAReceber, janela, teto)
- **Tipo:** api/function · **Depende de:** S1203-T6, S1204-T1, S1204-T2 · **Estimativa:** M

**Objetivo**
No pagamento confirmado, registrar a conversão atribuída ao afiliado (se dentro da janela) e calcular o split de comissão, atualizando os agregados do afiliado de forma idempotente.

**Contexto & referências**
- Modelo: `clubes/{id}/parcerias/{id}` (evento_afiliado) — ∑ `conversoes`, `valorAReceber`; `PaymentProvider.splitRules`.
- Mock: comissão 10% Meia Floripa, janela 7 dias, teto sem limite; R$ 528 a receber (28 conversões).
- `estrategia-testes.md` fluxo crítico #2 (link master rastreável → conversão na janela); RN-125/310/311.

**Arquivos (criar/editar)**
- `functions/src/affiliation/onConversion.ts` — trigger no inscrito `confirmado`: resolve atribuição (cookie/cupom), valida janela + teto, registra conversão, aplica `splitRules`, atualiza ∑.
- `packages/core/src/affiliation/commission.ts` — cálculo puro da comissão (%, teto).

**Passos de implementação**
1. Ao confirmar inscrição (S1203-T6), resolver afiliado (cupom `afiliadoRef` tem prioridade; senão cookie de link master).
2. Validar `clicadoEm`/data da conversão dentro de `janelaAtribuicaoDias` (RN-311); fora → sem atribuição.
3. Calcular comissão (`comissaoPct`, respeitando `tetoMensal`) e registrar conversão + `splitRules` no provider.
4. Atualizar ∑ `conversoes`/`valorAReceber` idempotentemente (reprocessar não duplica).

**Modelo de dados / contratos**
- Escreve conversão + ∑ na `parcerias` do afiliado; `splitRules` no `PaymentProvider`.

**Regras de negócio a respeitar**
- RN-125, RN-310 (comissão definida pelo organizador), RN-311 (janela/teto). Agregados só por Function.

**Critérios de aceite (testáveis)**
- **Dado** conversão dentro da janela via `?c=cps`, **quando** confirmo pagamento, **então** conversão atribuída ao CPS e `valorAReceber` sobe pela comissão (10%).
- **Dado** conversão fora da janela, **quando** confirmo, **então** sem atribuição.
- **Dado** o mesmo evento de conversão reprocessado, **quando** roda de novo, **então** ∑ não duplica.

**Testes a escrever**
- unit: `commission` (%, teto).
- integração (crítico): atribuição dentro/fora da janela; idempotência do split; cupom prioriza sobre cookie.

**Definition of Done** — DoD API/Function (idempotente, agregados por Function) + transversal.

**Fora de escopo**
Dashboard do afiliado (E08); repasse/payout efetivo (E09/financeiro).

---

### LEELA-S1205 · SEO técnico (metadata dinâmica, OpenGraph, sitemap, robots, JSON-LD) · (de-para BH-300 SEO)

**Como** organizador/afiliado, **quero** que as páginas públicas sejam bem indexadas e tenham preview rico ao compartilhar, **para** maximizar descoberta e conversão.

- **MoSCoW:** Must · **Estimativa:** S · **Superfície:** Landing
- **Tela(s) de referência:** `PaginaVendas-Conteudo.html` (card "SEO e compartilhamento": título, meta descrição, URL amigável, og:image 1200×630)
- **RNs:** RN-140 (indexação por visibilidade), RN-201 (URL amigável canônica)

**Critérios de aceite (Given/When/Then):**
- **Dado** uma página de evento, **quando** o buscador/rede a lê, **então** há `<title>`, meta descrição, canonical e OpenGraph/Twitter com og:image do evento.
- **Dado** um clube `indexavel`, **quando** gero o sitemap, **então** ele aparece; **dado** clube `publica`/`privada`, **então** não aparece / `noindex`.
- **Dado** `/sitemap.xml` e `/robots.txt`, **quando** acesso, **então** listam eventos publicados e clubes indexáveis e apontam o sitemap.
- **Dado** uma página de evento, **quando** valido, **então** há JSON-LD `Event` (schema.org) com data, local e ofertas.

**Tasks:** S1205-T1, S1205-T2

#### LEELA-S1205-T1 · `generateMetadata` dinâmica + OpenGraph/Twitter + JSON-LD Event
- **Tipo:** integration · **Depende de:** S1201-T1, S1202-T1 · **Estimativa:** S

**Objetivo**
Gerar metadata dinâmica (title, description, canonical, OG, Twitter) e JSON-LD por página de evento e clube, usando os campos publicados (SEO card do painel).

**Contexto & referências**
- Tela: SEO card (título, meta descrição, URL amigável, og:image 1200×630 — mock "Meia Maratona Floripa 2026 · Inscrições abertas").
- RN-140 (noindex quando `publica`; index quando `indexavel`), RN-201 (canonical = URL amigável).
- Domínio `{leela-domain}` (TBD) — nunca hardcodar `be-hero.com.br`.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/page.tsx` — `export async function generateMetadata()`.
- `apps/landing/app/(public)/c/[clubSlug]/page.tsx` — idem, com `robots` por visibilidade.
- `apps/landing/app/lib/seo.ts` — builders de metadata + JSON-LD `Event`.

**Passos de implementação**
1. `generateMetadata` lê os campos SEO publicados; canonical = `{leela-domain}/{slug}`.
2. OG/Twitter com og:image publicado (fallback padrão do evento).
3. Clube: `robots: index` se `indexavel`, `noindex` se `publica`; `privada` já é 404.
4. JSON-LD `Event` (nome, `startDate`, `location`, `offers` por modalidade/kit).

**Modelo de dados / contratos**
- Lê campos SEO de `eventos`/`clubes`. Sem escrita.

**Regras de negócio a respeitar**
- RN-140 (index/noindex), RN-201 (canonical).

**Critérios de aceite (testáveis)**
- **Dado** evento publicado, **quando** leio o `<head>`, **então** há title/description/canonical/OG/JSON-LD Event.
- **Dado** clube `publica`, **quando** leio metadata, **então** `noindex`.

**Testes a escrever**
- unit: builder de metadata (canonical, robots por visibilidade); JSON-LD válido.

**Definition of Done** — DoD Tela/rota + transversal (domínio TBD, sem hardcode).

**Fora de escopo**
sitemap/robots (T2).

#### LEELA-S1205-T2 · `sitemap.ts` + `robots.ts` (eventos publicados + clubes indexáveis)
- **Tipo:** integration · **Depende de:** S1200-T2 · **Estimativa:** S

**Objetivo**
Gerar `sitemap.xml` e `robots.txt` dinâmicos listando eventos publicados e clubes `indexavel`, apontando o sitemap.

**Contexto & referências**
- RN-140 (só `indexavel` no sitemap), RN-201 (URLs canônicas). Domínio `{leela-domain}` (TBD).

**Arquivos (criar/editar)**
- `apps/landing/app/sitemap.ts` — Next.js sitemap dinâmico (query de eventos publicados + clubes indexáveis).
- `apps/landing/app/robots.ts` — permite indexação, aponta `sitemap`.
- `packages/api-client/src/public/listIndexable.ts` — lista slugs indexáveis (server).

**Passos de implementação**
1. Query server de eventos `publicado`/`ao_vivo` e clubes `indexavel`.
2. Emitir entradas de sitemap com `lastModified`.
3. `robots.ts` referencia `{leela-domain}/sitemap.xml`.

**Modelo de dados / contratos**
- `listIndexable(): { events: string[], clubs: string[] }`.

**Regras de negócio a respeitar**
- RN-140 (exclui `publica`/`privada` do sitemap).

**Critérios de aceite (testáveis)**
- **Dado** 2 eventos publicados + 1 clube indexável, **quando** gero o sitemap, **então** as 3 URLs aparecem.
- **Dado** clube `publica`, **quando** gero o sitemap, **então** ele não aparece.

**Testes a escrever**
- integração: `listIndexable` filtra por status/visibilidade; sitemap contém só indexáveis.

**Definition of Done** — DoD API/Function + Tela/rota + transversal.

**Fora de escopo**
Metadata por página (T1).

---

### LEELA-S1206 · Ingresso digital + e-mail transacional de marca + PDF (por inscrito do pedido) · (de-para novo)

**Como** responsável por um pedido em grupo, **quero** receber por e-mail a confirmação com os ingressos de todos os inscritos do meu pedido, cada um com seu QR, **para** ter o comprovante e o primeiro toque de marca logo após o pagamento.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Landing + Functions
- **Tela(s) de referência:** `WEB-APPV2 (1)` — `EVENTOS-MEUS INGRESSOS` (`39:605`), estado "Meus Qr Codes"; template de e-mail de marca é **greenfield** (a desenhar, sem HTML/Figma de referência)
- **RNs:** RN-218 (ingresso digital + QR assinado por inscrito), RN-219 (e-mail de marca idempotente ao responsável), RN-220 (PDF sob demanda), RN-204 (dispara só no `confirmado`)
- **Pedido em grupo (ADR-011):** o e-mail vai ao **responsável/pagador** do pedido e lista **todos os inscritos**; cada inscrito tem seu ingresso/QR individual. O disparo nasce no webhook de confirmação (S1203-T6), que é único por pedido (um `createCharge`, um webhook).

**Critérios de aceite (Given/When/Then):**
- **Dado** um pedido em grupo confirmado, **quando** o pagamento confirma, **então** cada inscrito do pedido gera um ingresso digital com `qrToken` assinado (token opaco por inscrito), disponível no app e por e-mail (RN-218).
- **Dado** o pagamento confirmado, **quando** a Function do webhook confirmado dispara (S1203-T6), **então** o responsável pelo pedido recebe um e-mail transacional com template de marca Leela listando os inscritos do pedido e usando variáveis (`{nome}`, `{evento}`, `{kit}`, `{modalidade}`) (RN-219).
- **Dado** um reprocessamento do webhook, **quando** a Function roda de novo, **então** o e-mail não é reenviado (idempotência via subcoleção `inscritos/{id}/notificacoes/{tipo}`) (RN-219).
- **Dado** um ingresso emitido, **quando** o usuário solicita o PDF, **então** ele é gerado sob demanda a partir do mesmo ingresso/QR, para impressão/offline ou retirada por terceiro (RN-220).
- **Dado** a tela `EVENTOS-MEUS INGRESSOS` (`39:605`), **quando** abro "Meus Qr Codes", **então** vejo o ingresso de cada inscrito com seu QR.

**Tasks:** S1206-T1, S1206-T2, S1206-T3, S1206-T4

#### LEELA-S1206-T1 · `qrToken` assinado + `ingressoEmitidoEm` por inscrito (gerados na confirmação)
- **Tipo:** api/function · **Depende de:** S1203-T6 (webhook confirmado) · **Bloqueia:** S1206-T3, S1206-T4 · **Estimativa:** S

**Objetivo**
Emitir, na confirmação do pagamento, um ingresso digital por inscrito do pedido: gerar `qrToken` (opaco, assinado server-side) e carimbar `ingressoEmitidoEm` em cada `eventos/{id}/inscritos/{inscritoId}` do pedido, sem confiar em payload do cliente.

**Contexto & referências**
- Fluxo: o webhook idempotente de S1203-T6 confirma a inscrição; a emissão do ingresso é aditiva a esse passo (mesmo ponto de idempotência por `chargeId`/pedido).
- Modelo: `eventos/{id}/inscritos/{inscritoId}` (por inscrito do pedido — ADR-011); o `qrToken` é consumido pelo app (E13-S1314) e pela leitura de QR no balcão (E03).
- Assinatura do token server-side (chave só no server), coerente com "nenhum segredo no cliente" do épico.

**Arquivos (criar/editar)**
- `functions/src/payments/handlePaymentWebhook.ts` — no passo de confirmação, iterar os inscritos do pedido e emitir ingresso (chama o emissor abaixo).
- `functions/src/tickets/issueTicket.ts` — gera `qrToken` assinado (opaco) + seta `ingressoEmitidoEm`; idempotente por inscrito.
- `packages/core/src/tickets/qrToken.ts` — assinatura/verificação pura do token (sem I/O).

**Passos de implementação**
1. Ao confirmar o pagamento (S1203-T6), para cada inscrito do pedido, gerar `qrToken` assinado e setar `ingressoEmitidoEm` se ainda não emitido.
2. Idempotência: se `qrToken`/`ingressoEmitidoEm` já existem, não regerar (reprocessar o webhook não muda o token).
3. Nunca aceitar `qrToken` vindo do cliente; a verificação de assinatura é server-side.

**Modelo de dados / contratos**
- `eventos/{id}/inscritos/{inscritoId}` — ➕ `qrToken` (opaco, assinado), ➕ `ingressoEmitidoEm`.
- `signQrToken(inscritoId): string` / `verifyQrToken(token): { inscritoId } | null` em `core`.

**Regras de negócio a respeitar**
- RN-218 (um ingresso + QR assinado por inscrito confirmado), RN-204 (só no `confirmado`).

**Critérios de aceite (testáveis)**
- **Dado** um pedido de 3 inscritos confirmado, **quando** o webhook processa, **então** os 3 inscritos ganham `qrToken` distinto e `ingressoEmitidoEm`.
- **Dado** o mesmo webhook reprocessado, **quando** roda de novo, **então** os tokens não mudam (idempotente).

**Testes a escrever**
- unit: `qrToken` assina/verifica; token adulterado é rejeitado.
- integração (emulador): emissão por inscrito é idempotente no reprocessamento do webhook.

**Definition of Done** — DoD API/Function (idempotente, assinatura server-side) + transversal (sem segredo no cliente).

**Fora de escopo**
Envio do e-mail (T3); PDF (T4); exibição do QR no app (E13-S1314).

#### LEELA-S1206-T2 · Subcoleção de auditoria `inscritos/{id}/notificacoes/{tipo}` (idempotência do disparo)
- **Tipo:** api/function · **Depende de:** S1203-T6 · **Bloqueia:** S1206-T3 · **Estimativa:** S

**Objetivo**
Criar a subcoleção de auditoria/idempotência que registra os disparos transacionais por inscrito (`emailConfirmacao`), para garantir que reprocessar o webhook não reenvie notificações.

**Contexto & referências**
- Idempotência espelha o padrão do webhook (S1203-T6): registrar "já notifiquei" antes/depois do envio evita duplicidade.
- Escrita só por Function (Admin SDK); o cliente nunca escreve notificação.

**Arquivos (criar/editar)**
- `functions/src/notifications/notificationLog.ts` — helpers `hasSent(inscritoId, tipo)` / `markSent(inscritoId, tipo, meta)` sobre `inscritos/{id}/notificacoes/{tipo}`.
- `firestore.rules` — subcoleção `notificacoes` sem leitura/escrita pública (só Function/owner do evento conforme regra existente).

**Passos de implementação**
1. Modelar `inscritos/{id}/notificacoes/{tipo}` (docId = `tipo`, ex.: `emailConfirmacao`) com `enviadoEm`, `provedorMessageId?`, `status`.
2. Antes de enviar, checar `hasSent`; após envio bem-sucedido, `markSent` (transacional/idempotente).
3. Security Rules: bloquear leitura/escrita por cliente anônimo.

**Modelo de dados / contratos**
- ➕ subcoleção `eventos/{id}/inscritos/{inscritoId}/notificacoes/{tipo}` — `enviadoEm`, `provedorMessageId?`, `status`.

**Regras de negócio a respeitar**
- RN-219 (idempotência do disparo transacional).

**Critérios de aceite (testáveis)**
- **Dado** um disparo já registrado, **quando** chamo `hasSent`, **então** retorna `true` e o envio é pulado.
- **Dado** um cliente anônimo, **quando** tenta ler `notificacoes`, **então** as Rules bloqueiam.

**Testes a escrever**
- unit: `notificationLog` (marca/checa).
- integração (emulador): segundo disparo não cria segunda notificação; Rules bloqueiam cliente.

**Definition of Done** — DoD API/Function (Security Rules na task, idempotente) + transversal.

**Fora de escopo**
Conteúdo/envio do e-mail (T3); PDF (T4).

#### LEELA-S1206-T3 · Interface `EmailProvider` (espelho de `PaymentProvider`, ADR-006) + disparo ao responsável do pedido
- **Tipo:** integration · **Depende de:** S1206-T1, S1206-T2 · **Estimativa:** M

**Objetivo**
Definir a interface plugável `EmailProvider` em `packages/core` (espelhando `PaymentProvider`, ADR-006), com implementação sandbox em `functions/`, e disparar o e-mail transacional de confirmação ao **responsável do pedido** listando todos os inscritos, no webhook confirmado, de forma idempotente.

**Contexto & referências**
- ADR-006: padrão de interface plugável em `core` + implementação sandbox em `functions/` (nunca fornecedor concreto no domínio). `EmailProvider` é o espelho para e-mail; o fornecedor concreto (Resend/SendGrid) fica atrás da interface e é decidido em ADR de e-mail (ver Lacunas).
- Pedido em grupo (ADR-011): destinatário é o `responsavel` do pedido; corpo lista os inscritos (`inscritoRefs`).
- Idempotência via `notificacoes/{tipo}` (S1206-T2).

**Arquivos (criar/editar)**
- `packages/core/src/email/EmailProvider.ts` — interface (`sendTransactional(input) -> { messageId }`), tipos de template/variáveis; sem fornecedor concreto.
- `functions/src/email/sandboxEmailProvider.ts` — implementação sandbox (loga/mock) da interface.
- `functions/src/payments/handlePaymentWebhook.ts` — após confirmar e emitir ingressos, montar o payload do pedido (responsável + inscritos) e chamar `EmailProvider.sendTransactional` guardado por `notificacoes`.

**Passos de implementação**
1. Especificar `EmailProvider` em `core` (contrato tipado, variáveis de template, sem dependência de fornecedor).
2. Implementar provider sandbox em `functions/` (para testar o fluxo ponta a ponta antes da escolha do fornecedor).
3. No webhook confirmado, resolver o `responsavel` do pedido e a lista de inscritos; se `!hasSent(pedido/inscrito, 'emailConfirmacao')`, enviar e `markSent`.
4. Erros observáveis (Sentry) sem dado sensível.

**Modelo de dados / contratos**
- `EmailProvider.sendTransactional({ to, template, vars, inscritos[] }) -> { messageId }` (contrato em `core`).
- Lê `pedidos/{pedidoId}` (responsável + `inscritoRefs`, ADR-011); escreve `notificacoes` (S1206-T2).

**Regras de negócio a respeitar**
- RN-219 (template de marca, variáveis, idempotente, ao responsável do pedido).

**Critérios de aceite (testáveis)**
- **Dado** um pedido confirmado, **quando** o webhook dispara, **então** o `EmailProvider` sandbox recebe um envio ao responsável com a lista dos inscritos e as variáveis preenchidas.
- **Dado** o webhook reprocessado, **quando** roda de novo, **então** nenhum segundo e-mail é enviado (idempotente).

**Testes a escrever**
- unit: montagem do payload do pedido (responsável + inscritos + variáveis).
- integração (emulador + provider sandbox): envio único; reprocessamento não reenvia.

**Definition of Done** — DoD API/Function (interface + sandbox, idempotente, Sentry) + transversal (sem fornecedor concreto acoplado).

**Fora de escopo**
Fornecedor de e-mail concreto (ADR de e-mail — ver Lacunas); template visual final (T4); PDF (T4).

#### LEELA-S1206-T4 · Template de e-mail de marca (variáveis) + PDF do ingresso sob demanda
- **Tipo:** ui-component · **Depende de:** S1206-T1, S1206-T3 · **Estimativa:** M

**Objetivo**
Construir o template de e-mail de marca Leela com as variáveis do pedido e a geração de PDF do ingresso sob demanda a partir do mesmo ingresso/QR (impressão/offline, retirada por terceiro).

**Contexto & referências**
- Greenfield: sem HTML/Figma de referência para o e-mail; aplica identidade de marca Leela (tokens/DS onde couber no e-mail; e-mail usa HTML próprio, mas segue paleta/logo).
- PDF derivado do ingresso: reusa `qrToken`/dados do inscrito (S1206-T1); não recria QR próprio.

**Arquivos (criar/editar)**
- `functions/src/email/templates/confirmacaoPedido.ts` — template HTML de marca com variáveis (`{nome}`, `{evento}`, `{kit}`, `{modalidade}`) e a lista de inscritos.
- `functions/src/tickets/renderTicketPdf.ts` — geração sob demanda do PDF a partir do ingresso/QR do inscrito.
- `apps/landing/app/(public)/[eventSlug]/inscricao/confirmacao/[inscritoId]/page.tsx` — expõe ação "baixar PDF do ingresso" (reusa a página de confirmação de S1203-T6).

**Passos de implementação**
1. Montar o template de marca com as variáveis do pedido e a lista de inscritos (um bloco de ingresso por inscrito, cada um com seu QR).
2. Geração de PDF sob demanda a partir do `qrToken`/dados do inscrito (não persiste PDF; gera on-the-fly).
3. Garantir que o PDF serve para impressão/offline e retirada por terceiro (contém o QR do inscrito).

**Modelo de dados / contratos**
- Consome `qrToken`/dados do inscrito (S1206-T1) e variáveis do pedido. Sem novos campos.

**Regras de negócio a respeitar**
- RN-219 (marca + variáveis), RN-220 (PDF sob demanda a partir do mesmo ingresso/QR).

**Critérios de aceite (testáveis)**
- **Dado** as variáveis do pedido, **quando** renderizo o template, **então** `{nome}`/`{evento}`/`{kit}`/`{modalidade}` são substituídos e cada inscrito aparece com seu QR.
- **Dado** um ingresso emitido, **quando** peço o PDF, **então** ele é gerado sob demanda com o QR do inscrito.

**Testes a escrever**
- unit: substituição de variáveis do template; um bloco de ingresso por inscrito.
- unit: `renderTicketPdf` produz PDF com o QR do inscrito (sem regerar token).

**Definition of Done** — DoD Componente + API/Function + transversal.

**Fora de escopo**
Escolha do fornecedor de e-mail (ADR de e-mail); exibição do QR no app (E13-S1314).

---

### LEELA-S1207 · Aceite de regulamento + contato de emergência no checkout (por inscrito) · (de-para BH-300 INFORMAÇÕES)

**Como** responsável por um pedido em grupo, **quero** informar contato de emergência e aceitar o regulamento por inscrito dentro do pedido, **para** cumprir a responsabilidade legal do evento e a segurança operacional de cada atleta.

- **MoSCoW:** Must · **Estimativa:** S · **Superfície:** Landing (etapa Dados do Stepper) + `core`
- **Tela(s) de referência:** `WEB-APPV2 (1)` — INFORMAÇÕES (`39:2633`, "Nome contato de segurança + telefone" já desenhado); etapa Dados do Stepper (S1203-T2)
- **RNs:** RN-145 (contato de emergência obrigatório por inscrito), RN-148 (aceite de regulamento obrigatório, distinto do consentimento LGPD, com versão + timestamp)
- **Pedido em grupo (ADR-011):** contato de emergência e aceite de regulamento são coletados e persistidos **por inscrito**, não herdados do responsável.

**Critérios de aceite (Given/When/Then):**
- **Dado** um inscrito no pedido, **quando** preencho a etapa Dados do Stepper (S1203-T2), **então** o contato de emergência (nome + telefone) é obrigatório por inscrito e persiste em `inscritos.contatoEmergencia` (RN-145).
- **Dado** a etapa Dados, **quando** avanço, **então** o aceite de regulamento é um checkbox obrigatório e distinto do consentimento LGPD, coletado por inscrito (RN-148).
- **Dado** o aceite de regulamento, **quando** o inscrito aceita, **então** persiste `regulamentoAceite{ versao, aceitoEm, ipHash? }` no inscrito, separado de `consentimentoLgpd{ aceitoEm }` (RN-148).
- **Dado** um inscrito sem contato de emergência ou sem aceite de regulamento, **quando** tento concluir a inscrição, **então** a validação bloqueia e sinaliza qual inscrito do pedido está incompleto.
- **Dado** a tela INFORMAÇÕES (`39:2633`), **quando** renderizo o checkout, **então** o contato de segurança já desenhado é formalizado como obrigatório e o aceite de regulamento é adicionado.

**Tasks:** S1207-T1, S1207-T2, S1207-T3

#### LEELA-S1207-T1 · Campos por inscrito: `contatoEmergencia`, `regulamentoAceite`, `consentimentoLgpd`
- **Tipo:** api/function · **Depende de:** S1203-T6 (persistência do inscrito) · **Bloqueia:** S1207-T2, S1207-T3 · **Estimativa:** S

**Objetivo**
Estender o modelo do inscrito com os três campos coletados no checkout, mantendo o aceite de regulamento **separado** do consentimento LGPD, por inscrito do pedido.

**Contexto & referências**
- Compliance ancorada em RN-144 (LGPD); o aceite de regulamento é juridicamente distinto do consentimento de dados (não pode ser um único checkbox).
- Modelo: `eventos/{id}/inscritos/{inscritoId}` (por inscrito — ADR-011).

**Arquivos (criar/editar)**
- `packages/core/src/checkout/types.ts` — tipos `ContatoEmergencia`, `RegulamentoAceite`, `ConsentimentoLgpd`.
- `functions/src/payments/createInscricaoCharge.ts` — persistir os três campos ao criar o inscrito `pendente` (S1203-T5), por inscrito do pedido.

**Passos de implementação**
1. Modelar `contatoEmergencia{ nome, telefone }`, `regulamentoAceite{ versao, aceitoEm, ipHash? }`, `consentimentoLgpd{ aceitoEm }` — campos independentes.
2. Persistir na criação do inscrito (fluxo de checkout), um conjunto por inscrito do pedido.
3. Capturar `versao` do regulamento vigente no momento do aceite (versionamento é do E04-S306; aqui grava-se a versão recebida).

**Modelo de dados / contratos**
- `eventos/{id}/inscritos/{inscritoId}` — ➕ `contatoEmergencia{ nome, telefone }`, ➕ `regulamentoAceite{ versao, aceitoEm, ipHash? }`, ➕ `consentimentoLgpd{ aceitoEm }`.

**Regras de negócio a respeitar**
- RN-145 (contato obrigatório), RN-148 (aceite distinto do LGPD, com versão + timestamp).

**Critérios de aceite (testáveis)**
- **Dado** um inscrito criado, **quando** inspeciono o doc, **então** os três campos existem e são independentes.
- **Dado** o aceite, **quando** persiste, **então** `regulamentoAceite.versao` reflete a versão vigente e `consentimentoLgpd` é um campo separado.

**Testes a escrever**
- unit: tipos/serialização dos três campos.
- integração (emulador): inscrito criado com contato + aceite + consentimento separados.

**Definition of Done** — DoD API/Function + transversal (LGPD, separação de consentimentos).

**Fora de escopo**
Validação de bloqueio (T2); UI de coleta (T3); versionamento do regulamento (E04-S306).

#### LEELA-S1207-T2 · Validação por inscrito (contato obrigatório + aceite distinto do LGPD) em `core`
- **Tipo:** ui-component · **Depende de:** S1207-T1 · **Bloqueia:** S1207-T3 · **Estimativa:** S

**Objetivo**
Implementar a validação pura por inscrito: contato de emergência obrigatório e aceite de regulamento obrigatório e distinto do consentimento LGPD, sinalizando qual inscrito do pedido está incompleto.

**Contexto & referências**
- Espelha o padrão de validação pura de S1203-T2 (`validateDados`) em `packages/core`.
- Pedido em grupo (ADR-011): a validação roda por inscrito e reporta o índice/identificador do inscrito incompleto.

**Arquivos (criar/editar)**
- `packages/core/src/checkout/validateInscrito.ts` — validação pura (contato de emergência + aceite de regulamento + LGPD) por inscrito.

**Passos de implementação**
1. Contato de emergência (nome + telefone) obrigatório e não vazio.
2. Aceite de regulamento obrigatório e independente do consentimento LGPD (dois flags distintos).
3. Retornar erros por inscrito, identificando qual inscrito do pedido está incompleto.

**Modelo de dados / contratos**
- `validateInscrito(dados): { valid: boolean, erros: { inscritoRef, campo }[] }` em `core`.

**Regras de negócio a respeitar**
- RN-145, RN-148.

**Critérios de aceite (testáveis)**
- **Dado** um inscrito sem telefone de emergência, **quando** valido, **então** `valid=false` apontando o inscrito e o campo.
- **Dado** aceite de regulamento marcado mas LGPD não, **quando** valido, **então** bloqueia (são distintos).

**Testes a escrever**
- unit: `validateInscrito` (contato faltando; aceite × LGPD distintos; múltiplos inscritos).

**Definition of Done** — DoD Componente + transversal.

**Fora de escopo**
Persistência (T1); UI (T3).

#### LEELA-S1207-T3 · Coleta na etapa Dados do Stepper (por inscrito), espelhada em E13
- **Tipo:** ui-component · **Depende de:** S1203-T2, S1207-T2 · **Estimativa:** S

**Objetivo**
Adicionar à etapa Dados do Stepper (S1203-T2) a coleta, por inscrito do pedido, do contato de emergência (formalizando o campo já desenhado em `39:2633`) e do aceite de regulamento como checkbox distinto do consentimento LGPD.

**Contexto & referências**
- Tela: INFORMAÇÕES (`39:2633`) — "Nome contato de segurança + telefone" já desenhado; falta formalizar como obrigatório e adicionar o aceite de regulamento.
- Estende `DadosStep` (S1203-T2); mesma coleta espelhada no app do atleta (E13-S1306).
- DS: Input (estados invalid + erro inline), Checkbox, Button.

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/[eventSlug]/inscricao/steps/DadosStep.tsx` — por inscrito: campos de contato de emergência + checkbox de aceite de regulamento (link ao regulamento) + checkbox LGPD separado.

**Passos de implementação**
1. Renderizar, por inscrito do pedido, contato de emergência (nome + telefone) obrigatório.
2. Adicionar checkbox de aceite de regulamento (com link ao regulamento vigente) distinto do checkbox LGPD.
3. Bloquear avanço via `validateInscrito` (S1207-T2), sinalizando o inscrito incompleto com erro inline.

**Modelo de dados / contratos**
- Produz, por inscrito, `{ contatoEmergencia, regulamentoAceite, consentimentoLgpd }` (memória → persistência em S1207-T1).

**Regras de negócio a respeitar**
- RN-145, RN-148; consentimentos distintos.

**Critérios de aceite (testáveis)**
- **Dado** a etapa Dados de um pedido com 2 inscritos, **quando** deixo um sem contato de emergência, **então** o avanço é bloqueado apontando o inscrito.
- **Dado** ambos com contato + aceite de regulamento + LGPD, **quando** avanço, **então** sigo para Modalidade/Kit.

**Testes a escrever**
- unit: bloqueio de avanço por inscrito incompleto; aceite × LGPD como campos distintos.

**Definition of Done** — DoD Componente + transversal (LGPD).

**Fora de escopo**
Espelho no app (E13-S1306); versionamento do regulamento (E04-S306).

---

### LEELA-S1208 · Portal público do organizador (hub de eventos, agenda, fotos, blog, patrocinadores, newsletter) · (de-para novo)

**Como** Organizador de Evento, **quero** um portal público sob a plataforma com blocos configuráveis, **para** reunir meus eventos, agenda, fotos, blog, patrocinadores e captar newsletter num único endereço público, sem depender de domínio próprio.

> **Greenfield.** Precisa de rodada de **design** antes do plano de execução (sem HTML/Figma de referência). O escopo substitui a leitura anterior de "white-label / domínio próprio": é um portal público hospedado **sob a plataforma** (`tenants/{id}/portal`), **não** um domínio custom.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Landing
- **Tela(s) de referência:** — (greenfield; a desenhar)
- **RNs:** RN-150 (portal sob a plataforma, SSR/ISR, sem domínio próprio), RN-151 (newsletter com consentimento LGPD + finalidade), RN-152 (blocos ativáveis/ordenáveis; desativados não aparecem)

**Critérios de aceite (Given/When/Then):**
- **Dado** o tenant, **quando** configura o portal, **então** ativa e ordena blocos (`links de fotos`, `eventos + agenda`, `blog`, `patrocinadores`, `newsletter`) em `tenants/{id}/portal`; blocos desativados não aparecem (RN-152).
- **Dado** o portal, **quando** um visitante acessa, **então** vê o hub público com os eventos do organizador e a agenda, renderizado por SSR/ISR (RN-150).
- **Dado** que o portal não é domínio próprio nem white-label, **quando** publicado, **então** vive sob a plataforma (`tenants/{id}/portal`), sem custom domain (RN-150).
- **Dado** o portal não publicado, **quando** um visitante tenta acessar, **então** o gate por `status`/`visibilidade` resulta em 404 (reusa a fundação de leitura pública de S1200).
- **Dado** o campo de newsletter, **quando** um visitante submete o e-mail, **então** grava lead sob o tenant com registro de consentimento LGPD e finalidade declarada (RN-151).
- **Dado** o tema, **quando** qualquer bloco renderiza, **então** aplica `theme="leela"` do DS sem redefinir token localmente.

**Tasks:** S1208-T1, S1208-T2, S1208-T3

#### LEELA-S1208-T1 · Modelo `tenants/{id}/portal` (blocos ordenáveis + publicação) + leitor público SSR/ISR
- **Tipo:** screen · **Depende de:** S1200-T2 (leitor público com gate) · **Bloqueia:** S1208-T2, S1208-T3 · **Estimativa:** M

**Objetivo**
Modelar o portal do organizador sob o tenant (blocos ativáveis/ordenáveis + estado de publicação) e criar a rota SSR/ISR que o lê pela fundação pública de S1200, com gate de publicação (não publicado → 404).

**Contexto & referências**
- Reusa `getPublished*`/gate de S1200-T2 (mesma disciplina de leitura pública server-side, sem segredo no cliente).
- ADR de multitenancy: portal vive sob `tenants/{id}` (plataforma), **sem** custom domain (RN-150).
- Greenfield: rota e layout do portal a desenhar; segue tema `leela`.

**Arquivos (criar/editar)**
- `packages/core/src/portal/types.ts` — tipos `PortalConfig`, `PortalBloco` (`tipo`, `ativo`, `ordem`), estado de publicação.
- `packages/api-client/src/public/getPublicPortal.ts` — `getPublicPortal(tenantId): PublicPortal | null` (gate por `status`/`visibilidade`).
- `apps/landing/app/(public)/o/[tenantSlug]/page.tsx` — Server Component; `notFound()` se `null`; `revalidate` + tag `portal:{tenantId}`.
- `firestore.rules` — leitura pública de `tenants/{id}/portal` só quando publicado.

**Passos de implementação**
1. Modelar `tenants/{id}/portal` com lista de blocos (`tipo`, `ativo`, `ordem`) e estado de publicação/visibilidade.
2. `getPublicPortal`: retorna `null` se não publicado; monta `PublicPortal` só com blocos `ativo`, ordenados.
3. Rota SSR/ISR com ISR por tag; `notFound()` quando `null`.
4. Security Rules: leitura pública só do portal publicado.

**Modelo de dados / contratos**
- ➕ `tenants/{id}/portal` — `blocos[] { tipo, ativo, ordem }`, `status`/`visibilidade`, `publicadoEm?`.
- `getPublicPortal(tenantId): Promise<PublicPortal | null>`.

**Regras de negócio a respeitar**
- RN-150 (sob a plataforma, SSR/ISR, sem domínio próprio), RN-152 (blocos ativáveis/ordenáveis).

**Critérios de aceite (testáveis)**
- **Dado** portal não publicado, **quando** acesso a rota, **então** 404.
- **Dado** portal publicado com um bloco `ativo=false`, **quando** leio, **então** ele não vem no `PublicPortal`.

**Testes a escrever**
- unit: `getPublicPortal` filtra blocos inativos e ordena.
- integração (emulador): Rules bloqueiam portal não publicado.

**Definition of Done** — DoD Tela/rota (ISR, estados) + API/Function (Rules) + transversal.

**Fora de escopo**
Conteúdo dos blocos (T2); newsletter (T3); editor do portal no painel (E04).

#### LEELA-S1208-T2 · Blocos do portal: hub de eventos + agenda, links de fotos, blog, patrocinadores
- **Tipo:** ui-component · **Depende de:** S1208-T1 · **Estimativa:** M

**Objetivo**
Renderizar os blocos de conteúdo do portal a partir do `PublicPortal`, na ordem publicada, usando componentes do DS e o tema `leela`, com estado vazio por bloco.

**Contexto & referências**
- Greenfield: layout dos blocos a desenhar; reusa Card de Evento (E01) para o hub de eventos.
- Hub de eventos + agenda lê os eventos publicados do tenant (reusa leitura pública de evento, S1200/S1201).

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/o/[tenantSlug]/blocks/EventosAgendaBlock.tsx` — hub de eventos do organizador + agenda.
- `.../blocks/FotosBlock.tsx` — links de fotos.
- `.../blocks/BlogBlock.tsx` — posts/links de blog.
- `.../blocks/PatrocinadoresBlock.tsx` — grid de logos.
- `.../blocks/PortalRenderer.tsx` — mapeia `tipo → bloco`, filtra `ativo` e ordena (espelha `SectionRenderer` de S1201-T1).

**Passos de implementação**
1. `PortalRenderer` itera blocos ativos na ordem publicada (RN-152).
2. Cada bloco recebe seu slice tipado do `PublicPortal` e renderiza com DS/tema `leela`.
3. Estado vazio por bloco (bloco sem dados não renderiza conteúdo vazio).

**Modelo de dados / contratos**
- Consome `PublicPortal` (S1208-T1). Sem escrita.

**Regras de negócio a respeitar**
- RN-152 (ordem/ativação), tema `leela` sem hardcode.

**Critérios de aceite (testáveis)**
- **Dado** blocos publicados em ordem `[eventos, patrocinadores]`, **quando** renderizo, **então** aparecem nessa ordem.
- **Dado** bloco de fotos vazio, **quando** renderizo, **então** ele não mostra conteúdo vazio.

**Testes a escrever**
- unit: `PortalRenderer` respeita ordem e oculta inativos; bloco vazio → `null`.

**Definition of Done** — DoD Componente + Tela/rota (estados vazios) + transversal.

**Fora de escopo**
Newsletter (T3); edição de conteúdo no painel (E04).

#### LEELA-S1208-T3 · Captura de newsletter (form + `tenants/{id}/newsletterLeads` + consentimento LGPD)
- **Tipo:** api/function · **Depende de:** S1208-T1 · **Estimativa:** S

**Objetivo**
Capturar o e-mail de newsletter do visitante, gravando o lead sob o tenant com registro de consentimento LGPD e finalidade declarada.

**Contexto & referências**
- LGPD (RN-144, RN-151): consentimento específico + finalidade declarada; escrita server-side (nunca gravar lead direto do cliente sem validação).
- Bloco `newsletter` do portal (S1208-T1/T2).

**Arquivos (criar/editar)**
- `apps/landing/app/(public)/o/[tenantSlug]/blocks/NewsletterBlock.tsx` — form de e-mail + checkbox de consentimento com finalidade declarada.
- `functions/src/portal/subscribeNewsletter.ts` — callable/HTTPS: valida e grava `tenants/{id}/newsletterLeads/{leadId}` com consentimento.
- `firestore.rules` — `newsletterLeads` sem leitura pública; escrita só via Function.

**Passos de implementação**
1. Form coleta e-mail + checkbox de consentimento (finalidade declarada; sem pré-marcação).
2. Function valida e grava `tenants/{id}/newsletterLeads/{leadId}` com `email`, `consentimentoEm`, `finalidade`, `origem`.
3. Security Rules: bloquear leitura pública dos leads; escrita só por Function.

**Modelo de dados / contratos**
- ➕ subcoleção `tenants/{id}/newsletterLeads/{leadId}` — `email`, `consentimentoEm`, `finalidade`, `origem`.
- `subscribeNewsletter(tenantId, email, consentimento) -> { ok }`.

**Regras de negócio a respeitar**
- RN-151 (lead com consentimento LGPD + finalidade declarada).

**Critérios de aceite (testáveis)**
- **Dado** e-mail + consentimento, **quando** submeto, **então** o lead é gravado com `consentimentoEm` e `finalidade`.
- **Dado** submissão sem consentimento, **quando** envio, **então** é bloqueada.
- **Dado** um cliente anônimo, **quando** tenta ler `newsletterLeads`, **então** as Rules bloqueiam.

**Testes a escrever**
- unit: validação do form (consentimento obrigatório).
- integração (emulador): grava lead com consentimento; Rules bloqueiam leitura pública.

**Definition of Done** — DoD API/Function (Rules, LGPD) + Componente + transversal.

**Fora de escopo**
Envio de campanhas/e-mail marketing (fora do épico); editor do bloco no painel (E04).

---

> Histórias novas das rodadas de 2026-07-19 (DEC-0719, TAXA-FLEX, DEC-0719-ret). O detalhe/verbatim vive em `02-rodadas/2026-07-19-decisoes/`, `-taxa-flex/`; a fila de código em `03-fila-codigo`. Molde igual ao de S1900 (E19).

### LEELA-S1209 · Camada de tela do checkout novo (cupom no início, Pix/Cartão em botões, QR com timer, gênero, cards por atleta) · (de-para novo · DEC-0719 (c)) · ✅ ENTREGUE

**Como** atleta anônimo, **quero** um checkout com cupom logo no começo, escolha de pagamento em botões claros, PIX com QR e contagem regressiva, e um card por atleta com botão de adicionar outro, **para** comprar com menos fricção e entender cada passo.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Landing · **RNs:** RN-154 (gênero), RN-157 (PIX 30 min + retomada)
- **Origem:** rodada DEC-0719 (Vitor, 2026-07-19), decisões D-2/D-4/D-5/D-6. É a **camada de tela** do checkout — o backend/modelo das 5 RNs já foi pago no CHECKOUT2-MODELO (ver §STATUS BACKEND acima). Fila `03-fila-codigo (c)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** o step 0 do checkout, **quando** abro o fluxo, **então** o campo de cupom aparece já no início (D-4), além do auto-apply do cupom vindo por URL.
- **Dado** a etapa de pagamento, **quando** escolho a forma, **então** Pix e Cartão são **botões** (sem toggle), coerentes com D-5.
- **Dado** um PIX pendente, **quando** vejo a tela de pagamento **e** a tela do pedido pendente, **então** o QR e o copia-e-cola aparecem enquanto a cobrança está válida, com **timer de 30 min**, e o botão copia automaticamente disparando o toast *"a chave para pagamento foi copiada"* (RN-157).
- **Dado** o formulário de inscrito, **quando** preencho, **então** há campo de **gênero** por inscrito (enum `GENEROS_INSCRITO`, opção "não informado"), pré-preenchido quando a pessoa já é conhecida (RN-154 via CPF único RN-173).
- **Dado** uma compra para vários atletas, **quando** monto o pedido, **então** vejo **um card por atleta** e um botão **"+ adicionar atleta"** (D-2).

**Tasks:** `S1209-T1` (cupom no step 0 + Pix/Cartão em botões sem toggle — D-4/D-5) ✅, `S1209-T2` (QR PIX na tela + timer 30 min + auto-copy com toast — RN-157 UI, tela de pagamento e tela do pedido pendente) ✅ ⚔, `S1209-T3` (campo de gênero por inscrito + pré-preenchimento — RN-154 UI) ✅ ⚔, `S1209-T4` (cards por atleta + botão "+ adicionar atleta" — D-2) ✅. Detalhe em `02-rodadas/2026-07-19-decisoes/01-decisoes.md`.

**Status:** ✅ **ENTREGUE 2026-07-26** (lane S1209-TELA · sf-frontend-lead · opus xhigh) — commits `1866515` (T1) · `f390e6c` (T2) · `ffa88ac` (T3) · `8bbe044` (T4). Território: só `apps/landing`.

- **T1 · D-4/D-5** — `CupomCampo` é uma peça só, consumida pelo step 0 e pelo Resumo (a lógica de cotar/aplicar/remover segue única no `CheckoutFlow`); sem modalidade escolhida o "Aplicar" fica desabilitado com a razão explícita, porque não há item para o servidor precificar. Cupom recusado ganhou canal próprio e parou de se disfarçar de `erroCotacao`. O auto-apply do cupom da URL perdeu o gate de step e resolve já no step 0. `SeletorForma` usa `RadioCard` do DS (shadcn-first §8, ADR-017 Radix-free): botão de decisão com ícone e apoio, semântica de radio de fábrica — o rótulo do S1210 (total por opção) continua no título, então o nome acessível coberto por teste não mudou.
- **T2 · D-6/RN-157** ⚔ — `PixCobranca` é o MESMO bloco nas duas telas. A contagem só existe com `pixExpiraEmMillis` do servidor; sem carimbo não há timer (contagem fabricada no cliente cancelaria PIX vivo ou mostraria PIX morto como vivo). Ao zerar, QR e copia-e-cola somem e a UI chama `expirarPixPendente` — o servidor arbitra com o próprio relógio e recusa chamada adiantada. Expirar não regenera cobrança sozinho; o retry é cobrança NOVA com `idempotencyKey` nova (replay da antiga devolveria a cancelada). Auto-copy num clique + toast do DS com o verbatim.
- **T3 · RN-154/RN-174** ⚔ — gênero por inscrito com os valores de `GENEROS_INSCRITO` importados do core; opcional, e `''` nunca vira `nao_informado` no caminho. O prefill consome `getCheckoutPrefill`, **que não aceita parâmetro** — não existe canal para perguntar sobre um CPF. As três negativas da RN-174 chegam como o mesmo `prefill: null` e a tela trata as três igual: formulário vazio, sem mensagem. Falha da chamada é invisível; digitar CPF não dispara consulta; prefill não sobrescreve o que a pessoa digitou.
- **T4 · D-2** — `CardAtleta` unifica as duas molduras que existiam. "+ Adicionar atleta" vive só no step 0 (no step 1 o atleta nasceria sem modalidade e travaria o total). Remover nos dois steps, agora reindexando as listas de erro junto.

**Gates:** tsc 0 · eslint 0 · `next build` verde · `verify:brand` PASS · vitest da landing 13 arquivos / 105 testes verdes (42 novos, incluindo timer/expiração do PIX com fake timers, auto-copy + toast, prova de não-oráculo do prefill, cupom inválido no step 0 e adicionar/remover atleta). Report `outputs/leela-build-2d6ee98d/S1209-TELA-REPORT.md`. **Pendente: review antagonista em contexto fresco de T2 e T3.**

**Ponte temporária registrada:** `expirarPixPendente` não é re-exportado pela raiz do `@leela/api-client` (nota do próprio lote CK2 — o `index.ts` estava em edição por outra lane). A landing consome pelo subpath, com `paths` no `tsconfig` e alias no `vitest.config`. O pacote não foi tocado. Quando a raiz re-exportar, o alias sai. → **PAGA** no apêndice PIXBE abaixo (T4).

#### Apêndice PIXBE · a arbitragem que só o servidor pode dar (lane S1209-PIXBE · também E09) · ✅ ENTREGUE 2026-07-26

A review antagonista de T2/T3 aprovou a tela com fixes e deixou quatro itens FORA do alcance dela — todos a mesma frase: **a tela não pode garantir o que só o servidor sabe**. Esta lane (sf-backend-lead, opus xhigh) fecha os quatro. Território: `functions/`, `packages/core`, `packages/api-client` e, só em T4/T5, `apps/landing`. Toca a máquina de dinheiro do **E09** tanto quanto a tela do E12.

**Tasks:** `S1209-PIXBE-T1` (relógio do servidor na resposta da cobrança) ✅ `c6e6712` · `S1209-PIXBE-T2` (trava server-side de 2ª cobrança PIX viva) ✅ `33d4f08` · `S1209-PIXBE-T3` (cancelamento gateway-primeiro na expiração) ✅ `df25872` · `S1209-PIXBE-T4` (higiene da ponte do api-client) ✅ `d545aa5` · `S1209-PIXBE-T5` (tela consome o relógio do servidor) ✅ `d545aa5`.

**Critérios de aceite (Given/When/Then):**
- **Dado** um PIX pendente, **quando** a tela monta a contagem, **então** ela usa o `agora` do SERVIDOR devolvido junto do `pixExpiraEmMillis` — aparelho 40 min atrasado mostra 30:00, não 70:00 (fecha o achado #6 da review).
- **Dado** uma cobrança PIX pendente e dentro do prazo, **quando** o mesmo comprador tenta abrir outra do MESMO carrinho, **então** o servidor recusa com `failed-precondition` e `details.motivo = pix_pendente_ativo`, mesmo em requisições concorrentes (uma vive, uma morre).
- **Dado** o timer zerado, **quando** o servidor materializa a expiração, **então** a cobrança é cancelada NO GATEWAY antes de o pedido virar cancelado; **e dado** que o gateway falhe, **então** o pedido NÃO vira expirado e a resposta diz que a cobrança continua válida (fail-safe).
- **Dado** um pagamento retardatário sobre pedido expirado, **quando** o webhook chega (inclusive em redelivery), **então** ele é ignorado por estado final, sem efeito e sem receita nova. **➕ SUPERADO POR ESTORNO-ADMIN T5 (item 27 · RN-379/380, canônicas em E09):** o retardatário deixou de ser só "ignorado" — a entrega ganha efeito próprio `retardatario_pos_cancelamento`, entra no extrato `estornosOrfaosPendentes` na MESMA transação e dispara estorno TOTAL automático pela máquina de carimbo (RN-370/371/372); a varredura agendada conta, alerta e re-dispara. Receita continua em zero e o pedido continua cancelado — o que muda é que o dinheiro VOLTA, exatamente uma vez (provas: `estornoOrfao.integration.test.ts` + `pixArbitragem.*` atualizados ao contrato novo).

**Decisões de arquitetura registradas:**
- **Trava por conflito materializado** (Kleppmann · DDIA §7.2.4). Duas requisições com chaves de idempotência distintas criam pedidos distintos ⇒ não há doc em comum para o Firestore serializar (phantom read). A sentinela `cobrancasPixAtivas/{uid}__{evento}__{hash do carrinho}` É esse doc. Ela é PONTEIRO, não cadeado: o veredito é sempre relido dos docs apontados, então não precisa ser liberada e não gera job de limpeza. Coleção Function-only, deny-by-default nas Rules.
- **Escopo da chave = carrinho**, não (comprador, evento). O defeito é "duas cobranças vivas para A MESMA compra"; travar por comprador barraria quem volta para inscrever outra pessoa com o próprio PIX no prazo — segunda COMPRA, não cobrança duplicada. Hash com HMAC do pepper do CRM (RN-173) porque o carrinho contém CPF.
- **`PaymentProvider.cancelCharge`** entra no contrato (cancelar ≠ estornar: nenhum dinheiro trocou de mãos). Asaas = `DELETE /payments/{id}` (`DELETED` ≡ `cancelled`, mapa já existente). O adapter FALHA ALTO: só devolve sucesso com prova. Corolário: cobrança já paga não é cancelável ⇒ pedido pago nunca morre por timer.
- **A falha de cancelamento devolve `failed-precondition`** porque é a verdade literal (a cobrança segue valendo) — e é o code que a tela já traduz como estado `contestado` desde o fix `59f18ed`: devolve a chave ao comprador e não abre outra cobrança. Zero tela nova.

**Gates:** suíte de functions **165 arquivos / 2960 testes verdes, 0 falhas** no comando canônico (baseline 164/2935) · tsc 0 em functions/core/api-client/landing · eslint 0 · landing 14 arquivos / 124 testes · `next build` verde · `verify:brand` PASS. Report `outputs/leela-build-2d6ee98d/S1209-PIXBE-REPORT.md`. **Pendente: review antagonista em contexto fresco.**

**Escalado ao Vitor (política de produto, não decidida aqui):** (1) pagamento que entra DEPOIS do cancelamento — estorno automático × fila de reconciliação × ressuscitar a inscrição (premissa CK2-4, agora bem menor mas viva); (2) cartão aberto sobre PIX vivo do mesmo carrinho segue passando (fronteira declarada, com teste que a fixa); (3) confirmar o escopo da trava; (4) `DELETE /payments/{id}` do Asaas não foi validado contra conta real (a suíte proíbe rede) — validar em sandbox antes do deploy.

### LEELA-S1210 · Exibição da taxa por meio de pagamento no checkout (total por opção) · (de-para novo · TAXA-FLEX) · ✅ ENTREGUE

**Como** comprador, **quero** ver o total de cada meio de pagamento antes de pagar quando a taxa é repassada, **para** escolher com clareza (ex.: PIX mais barato que cartão).

- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Landing · **RNs:** RN-180 (exibição por meio; cálculo em E09), RN-179 (efeito do carimbo)
- **Origem:** rodada TAXA-FLEX (Vitor, 2026-07-19). A taxa da plataforma passa a ser percentual + fixo por meio (dona E04/RN-178; cálculo E09/RN-179..183); aqui fica a **exibição**. Fila `03-fila-codigo (j)` — executável junto do lote TAXA-FLEX.

**Critérios de aceite (Given/When/Then):**
- **Dado** um evento em modo **repassada** (RN-347), **quando** chego ao pagamento, **então** o total é exibido **por opção de meio** — ex.: **PIX R$ 108,00 · Cartão R$ 110,30** — com `taxa(meio) = round(face × percentual) + fixoCentavos`.
- **Dado** um evento em modo **incorporada**, **quando** vejo o preço, **então** ele **não varia** por meio (o comprador vê o face).
- **Dado** a nota de transparência de taxa (badge A-5 "+ taxa de serviço"), **quando** a taxa varia por meio, **então** a nota reflete que **o valor varia por meio de pagamento** (P-TAXAFLEX-6).
- **Dado** qualquer meio, **quando** renderizo o checkout, **então** `platformFeePct`/termos comerciais **nunca** vazam ao comprador (só o total).

**Tasks:** `S1210-T1` (exibir total por opção de meio em repassada + atualizar a nota A-5 para variação por meio — consome `computeSaleState` estendido do lote E09 — `4e786ac`) ✅. **Status:** ✅ ENTREGUE 2026-07-19 (lane TAXAFLEX): cotação devolve `totaisPorMeio` (SÓ valores em R$ — leak-scan de `%` provado); os radios de forma mostram o total de cada opção quando os totais DIFEREM (refino F6 da review: cobre override zero num só meio); nota A-5 diz que a taxa varia conforme a forma de pagamento. Report `outputs/leela-build-2d6ee98d/TAXA-FLEX-REPORT.md`.

### LEELA-S1211 · Checkout de estrangeiro sem CPF (passaporte, cartão internacional à vista) · GATED · (de-para novo · DEC-0719-ret)

**Como** organizador que aceita estrangeiros, **quero** que o atleta sem CPF compre com passaporte pagando no cartão internacional, **para** vender para público internacional sem quebrar a integridade de identidade.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Landing · **RNs:** RN-176 (checkout de estrangeiro), RN-175 (toggle, E04), RN-177 (documento tipado, E19)
- **Origem:** rodada DEC-0719-ret (Vitor, 2026-07-19), modelo Doity/Sympla sobre o Asaas. **GATED** pela liberação da conta Asaas para pagador estrangeiro (ação externa, ~6 dias úteis) + sandbox provada. Fila `03-fila-codigo (i)`; report `outputs/leela-build-2d6ee98d/ESTRANGEIRO-PAGAMENTO-REPORT.md`.

**Critérios de aceite (Given/When/Then):**
- **Dado** o toggle `aceitaEstrangeiros` **desligado** (default), **quando** abro o checkout, **então** nada muda: CPF segue exigido (RN-173).
- **Dado** o toggle **ligado**, **quando** compro, **então** o checkout pergunta a **nacionalidade**; para estrangeiro o documento é **PASSAPORTE** (formato/validação), o **CPF fica oculto** e o pagamento é restrito a **CARTÃO internacional À VISTA** (sem PIX/boleto/parcelamento).
- **Dado** a liberação Asaas ainda pendente, **quando** um brasileiro compra pelo estrangeiro (inscrito com passaporte), **então** o paliativo funciona sem tocar na RN-173.

**Tasks:** `S1211-T1` (fluxo de checkout de estrangeiro: nacionalidade → passaporte, CPF oculto, cartão internacional à vista — RN-176), `S1211-T2` (adapter Asaas de cobrança avulsa para pagador estrangeiro — GATED pela liberação externa + sandbox). Detalhe em `02-rodadas/2026-07-19-decisoes/01-decisoes.md` §DEC-0719-ret. **Não despachar antes da liberação Asaas + reconfirmação L1/L6 do report.**

### LEELA-S1212 · Render do formulário de perguntas na compra + resposta no inscrito · (de-para novo · FORMBUILDER)

**Como** atleta que compra, **quero** responder as perguntas que o organizador montou, **para** concluir a inscrição com os dados que aquele evento pede.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Landing/checkout · **RNs:** RN-185 (resposta no inscrito), RN-186 (obrigatória bloqueia o pagar), RN-188 (carimbo de versão), RN-189 (leitura/export), reusa modelo/core RN-184/187 (dono E04/S310)
- **Origem:** rodada FORMBUILDER (Vitor, 2026-07-19). O modelo e o core vivem em E04/S310 (fonte única); aqui fica o **render na compra** e a **gravação da resposta no inscrito**. Fila `03-fila-codigo (k)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** um evento com formulário publicado, **quando** chego ao checkout, **então** as perguntas aparecem nos tipos do v1 (seleção única/múltipla/sim-não), com as opções configuradas.
- **Dado** uma pergunta obrigatória sem resposta, **quando** tento pagar, **então** o **mesmo fence server-side dos aceites** (S1207) bloqueia — não é validação só de cliente (RN-186).
- **Dado** que respondo e confirmo, **quando** a inscrição é gravada, **então** a resposta vive **no inscrito** (nunca no pedido — RN-185), na mesma tx, carimbando a **versão** da pergunta (RN-188).
- **Dado** o organizador/equipe do tenant, **quando** exporto a lista de inscritos existente, **então** a resposta viaja como coluna do inscrito (RN-189 — sem relatório novo).

**Tasks:** `S1212-T1` (gravação da resposta no inscrito na tx da confirmação + carimbo de versão — RN-185/188; reusa modelo/core de S310-T1), `S1212-T2` (camada de tela: render das perguntas no checkout + gate de obrigatoriedade no fence dos aceites — RN-186; **serializa após S1210** na tela de checkout, ver `03-fila-codigo`). Detalhe em `02-rodadas/2026-07-19-formbuilder-analise/01-decisoes.md`.

---

## Ordem sugerida

`S1200 (setup + leitor) → S1201 (evento) + S1202 (clube) → S1204-T1/T2 (atribuição/cupom) → S1203 (checkout 5 etapas) → S1204-T3 (split na conversão) → S1205 (SEO)`.
Fecha a Onda 2 junto com E04 (config de vendas) e o `PaymentProvider` sandbox: atleta descobre → inscreve → paga → organizador vê receita → afiliado recebe conversão.

## Lacunas / decisões pendentes (a resolver com E04 e ADR-006)

- **Domínio público `{leela-domain}`** — TBD; não fixar `be-hero.com.br`. Bloqueia canonical/sitemap definitivos.
- **E04 ainda não existe** — a config de seções, SEO, lotes (RN-300) e programa de afiliação são produzidos no painel (BH-300/BH-301). Este épico assume os contratos de leitura; se E04 divergir, revisar `getPublishedEvent`/config de seções.
- **Fornecedor de pagamento (ADR-006 concreto)** — pendente; o épico depende só da interface + sandbox. Split real e Pix nativo dependem do fornecedor.
- **Lotes (RN-300, virada por data/quantidade)** — a landing lê o preço vigente do lote; a lógica de virada de lote é do E04/Function (não reimplementar na landing).
- **Política de atribuição em múltiplos toques** — assumido "primeiro clique dentro da janela; cupom tem prioridade sobre cookie"; confirmar com E08 (influenciador) antes de generalizar.
- **Deep link do app** (CTA "baixar o app"/entrada no clube RN-141) — depende de E13; usar placeholder até definir esquema de deep link.
- **Fornecedor de e-mail transacional (ADR de e-mail, S1206)** — pendente. A interface `EmailProvider` (`packages/core`) espelha o padrão plugável de `PaymentProvider` (ADR-006): o épico depende só da interface + implementação sandbox; o fornecedor concreto (Resend/SendGrid) fica atrás da interface e deve ser fixado em ADR de e-mail própria (fecha `integracoes.md §6`). Sem a ADR, o envio real e a entregabilidade ficam bloqueados; o fluxo é construído/testado com o provider sandbox.
- **Design do portal público do organizador (S1208, greenfield)** — sem HTML/Figma de referência; layout do portal e dos blocos (hub eventos/agenda, fotos, blog, patrocinadores, newsletter) e do editor no painel (E04) precisam de rodada de design antes do plano de execução.
- **Template de e-mail de marca (S1206, greenfield)** — sem referência visual; depende de rodada de design do template transacional (identidade Leela) antes de finalizar T4.

## Regras de negócio novas (Vitor 2026-07-12 — impacto no checkout)

- **RN-347 (proposta, dona = E04/E09):** o total do comprador exibe a taxa de serviço SÓ quando o evento está em modo **repassada** (face + taxa); em modo **incorporada** o comprador vê o preço de face. `computeSaleState` já calcula a taxa — o modo decide quem paga. Nunca vazar `platformFeePct`/termos comerciais ao comprador (fix de confidencialidade `703db9c` continua valendo).
  - *Status 2026-07-13 (EVENTO-CAMPOS, backend):* `evento.taxaModo` já PERSISTE por evento (E03) e o saldo E09 já lê o modo.
  - *Status 2026-07-13 (RN347-CHECKOUT, backend):* ✅ **FIO DO CHECKOUT FECHADO.** `computeSaleState` ganhou `modoTaxa` (lido do DOC do evento em `carregarInsumos` via `modoTaxaDoEvento` — NUNCA do request; forja no payload é inerte): `repassada` ⇒ `totalComprador = valorFinal + taxa`, parcelamento Price sobre o total do COMPRADOR, `receitaLiquidaOrganizador` mode-aware (= face em repassada, coerente com E09). Cotação/charge expõem só `taxaServico`/`totalAVista` (VALORES em R$ — `platformFeePct` nunca sai, fix `703db9c` mantido); `gatewayAmountCentavos` congela face+taxa; `pagamento.taxaRepassada` + rateio por linha `itens[].taxaRepassada` (maior resto, cent-exato, proporcional ao `valorFinal`). **Decisão do estorno (documentada):** devolve o que o inscrito PAGOU (`valorFinal + taxaRepassada` da linha — ledger `valor`/`valorCentavos`); a contabilidade do ORGANIZADOR (reversão de `receitaConfirmada`, `estornadoTotal`, flip integral) usa SÓ o face (ledger `valorFace` — a taxa nunca foi receita dele). Landing: linha "Taxa de serviço R$ X,XX" no Resumo/Confirmação SÓ quando repassada; "à vista sai por" usa `totalAVista`. Modo `incorporada`/docs legados ficam byte-idênticos (campos ausentes — zero migração). Unit 24/24 + regressão 263/263; suíte de emulator `rn347Checkout.integration.test.ts` escrita (run pendente por memória <1GB no lote — comando pronto no report). Report `outputs/leela-build-2d6ee98d/RN347-CHECKOUT-REPORT.md`.
- **RN-303 (proposta, dona = E04):** evento em modo "somente via cupom" → o checkout público exige cupom válido antes da seleção de modalidade/kit e comunica claramente que as vendas são fechadas.

## Regras de negócio novas (FORMBUILDER · Vitor 2026-07-19 — render na compra)

Rodada `02-rodadas/2026-07-19-formbuilder-analise/`. O construtor de formulário virou executável; o render na compra é a história **S1212** deste épico. Modelo/core únicos vivem em E04/S310 (E12 reusa). Delta completo em `02-rns-delta.md`.

- **RN-185 (dona = E12 no evento):** a resposta do formulário vive **no inscrito** (nunca no pedido), gravada na **mesma tx da confirmação**, server-only. Alinha com o registry `pessoas` (RN-173) e a posse por CPF (RN-174) **sem acoplar no claim** — a resposta viaja com o inscrito mesmo sem conta reivindicada.
- **RN-186 (efeito no checkout):** pergunta obrigatória sem resposta **bloqueia o pagar no MESMO fence server-side dos aceites** (S1207) — reuso do fence, não gate novo.
- **RN-188 (efeito no render):** a resposta **carimba a versão** da pergunta no ato (padrão do termo de saúde RN-149 / regulamento S306-T3); editar a pergunta nunca reescreve resposta antiga.
- **RN-189 (leitura/export):** a resposta é coluna do inscrito na **lista/export já existente** — sem relatório novo. Minimização: o CRM (RN-172) não agrega respostas por default (P-FB-4).

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

Este épico entra na **Onda 4 · item 1** (caminho do dinheiro em curso) e é onde mora a maior lacuna: a tela. Passo a passo, território e critério de pronto em `02-rodadas/2026-07-19-espec-sweep/02-caminho-do-dinheiro.md`:

- ~~**S1209-T1..T4** (camada de tela do checkout novo) — bloco A.~~ ✅ **ENTREGUE 2026-07-26** (`1866515`, `f390e6c`, `ffa88ac`, `8bbe044`) — ver §S1209 acima. Segue pendente só a **review antagonista de T2 e T3** em contexto fresco. Com o bloco A fechado, `S1212-T2` (render das perguntas no checkout) está desbloqueado pela ordem de território.
- **S1212-T1/T2** (render do formulário de perguntas na compra) — bloco C. **T2 serializa depois do bloco A** — mesma tela, despachar em paralelo dá conflito de território.
- **S1211** (checkout de estrangeiro) — bloco D, **GATED** pela liberação da conta Asaas.
- **S1210** (exibição da taxa por meio) — ✅ entregue na TAXA-FLEX.

**Ordem de despacho desta tela:** `S1209-T1 → S1209-T2 → S1209-T4 → S1212-T2`, com `S1209-T3` em paralelo (arquivo distinto).

---

## Delta FormBuilder · o render muda de origem, não de desenho (SPECS-0728 · 2026-07-28)

Rodada `02-rodadas/2026-07-28-formbuilder-templates/`. A DEC-0728B moveu o construtor para
uma biblioteca de templates no menu principal. Este épico é **consumidor** e sai quase
intacto. RNs novas (RN-389 a RN-392) consolidadas no épico dono, o E04.

**O que muda na S1212:** uma linha só. O checkout deixa de ler a subcoleção de formulário
sob o evento e passa a ler a **versão de template vinculada ao evento** (RN-390). Tudo o
mais fica: a resposta vive no inscrito e nunca no pedido (RN-185), pergunta obrigatória
bloqueia o pagar no mesmo fence server-side dos aceites (RN-186), a resposta carimba a
versão exibida (RN-188) e o export continua sendo o da lista de inscritos (RN-189).

**Critérios de aceite acrescentados (Given/When/Then):**

- **Dado** um evento vinculado à versão 1 de um template, **quando** o comprador abre o
  checkout, **então** ele vê exatamente as perguntas da versão 1, mesmo que a versão 2 já
  esteja publicada na biblioteca (RN-390).
- **Dado** que o comprador responde e paga, **quando** a inscrição é gravada, **então** a
  resposta carimba o id do template **e** a versão exibida, e não apenas um número de
  versão solto (RN-188 sobre RN-390).
- **Dado** um evento sem template vinculado, **quando** o checkout monta, **então** nenhuma
  seção de perguntas aparece e o fluxo de compra segue idêntico ao de hoje.
- **Dado** um template arquivado depois de o evento já estar vinculado, **quando** o
  checkout monta, **então** as perguntas continuam sendo exibidas normalmente, porque
  arquivar não toca em vínculo vivo (RN-392).

**Ordem de despacho.** A fila revisada está em
`02-rodadas/2026-07-28-formbuilder-templates/03-fila-codigo.md`. A serialização que a fila
de 19/07 pedia contra a exibição de taxa já está paga, porque o bloco A da tela de checkout
aterrissou em 2026-07-26. A fronteira viva agora é entre lanes que escrevem em
`functions/src/checkout`: o pacote de estorno e o pacote de ingressos com QR. Serializar
por lane, não por task.

---

## Delta ingresso com QR · código identificador e conteúdo do e-mail (SPECS-0728 · 2026-07-28)

Rodada `02-rodadas/2026-07-28-ingresso-qr/`. DEC-0728E refinada. Este épico é dono da
**emissão** do ingresso e do **e-mail ao responsável**; o E03 é dono da tabela do
organizador e da virada de credenciamento. A RN-218, o `qrToken` assinado e a idempotência
da RN-219 ficam como estão.

### Regras de negócio novas (INGRESSO-QR)

- **RN-396 · Código identificador do ingresso (dona = E12).** Todo inscrito com ingresso
  emitido recebe, além do `qrToken` opaco assinado, um **código legível**: curto, único
  **por evento**, em alfabeto sem `0`, `O`, `1`, `I` e `L`, porque ele vai ser ditado em voz
  alta e digitado de manhã cedo. Gerado no servidor no mesmo ponto de emissão do ingresso e
  **idempotente por inscrito** — reprocessar o webhook não troca o código. O código **não é
  credencial**: a validação de presença continua sendo a verificação de assinatura do
  `qrToken`, e nenhuma superfície aceita o código como prova de entrada.
- **RN-398 · Conteúdo e degradação do e-mail de compra (dona = E12).** O e-mail que a RN-219
  já manda ao responsável passa a carregar, para **cada inscrito do pedido**, o QR e o
  código. O **código vai como texto**, sempre, ao lado da imagem e do link do ingresso.
  Cliente de e-mail que bloqueia imagem remota é o caso comum, e ingresso não pode depender
  de imagem carregar na véspera da prova. Idempotência inalterada (RN-219).
- **RN-382 · Extrato e varredura do ingresso órfão (dona = E12 · item 54).** Pedido **pago**
  cuja emissão de ingresso não fechou — código sem espaço livre, ring de assinatura ausente,
  erro no meio da varredura de inscritos — grava um **extrato de pendência no ponto da
  falha** (`ingressosPendentes/{pedidoId}`, sem Rule de cliente: deny-by-default), e uma
  **varredura agendada de 15 em 15 minutos** re-tenta a emissão, fecha o e-mail e **alerta**
  quando a re-tentativa esgota. Detecção nunca des-resolve extrato resolvido. Existe porque
  a re-entrega do gateway **não** reabre a janela de emissão: ela volta antes de olhar o
  pedido (duplicada, ou estado já final), então sem varredura a primeira entrega era a única
  chance e a falha ali era permanente e silenciosa. Mesmo desenho da RN-380 (retardatário do
  dinheiro, item 27); o que muda é o remédio — em vez de um POST no gateway, a própria
  emissão, que já é idempotente por inscrito. **O e-mail espera a emissão fechar:** a
  idempotência da RN-219 é at-most-once por pedido, e queimar a chave sobre uma lista parcial
  condenaria o inscrito que ficou de fora a nunca receber o QR; ao esgotar as re-tentativas a
  varredura manda o que existe, para que o comprador nunca fique sem nada.
- **RN-396 (ampliada)** — a emissão confere a relação pedido↔inscrito **dos dois lados**:
  varre `pedido.inscritoRefs` e exige que o inscrito aponte de volta para o mesmo pedido.
  Inscrito de outro pedido na lista não recebe ingresso nem entra no e-mail de terceiro; a
  recusa é contada e registrada, e **não** conta como pendência (re-tentar não conserta lista
  corrompida).

**Fora deste delta:** o QR de pagamento PIX segue como está — o gateway emite, o checkout
mostra. Nada é gerado do nosso lado.

---

### LEELA-S1206 · complemento de prontidão (SPECS-0728)

Os critérios de aceite já escritos acima seguem válidos. Acrescentam-se estes.

**Critérios de aceite acrescentados (Given/When/Then):**

- **Dado** um pedido de 3 inscritos confirmado, **quando** o webhook emite os ingressos,
  **então** cada inscrito ganha, além do `qrToken`, um código identificador distinto e
  legível (RN-396).
- **Dado** o mesmo webhook reprocessado, **quando** ele roda de novo, **então** nem o token
  nem o código mudam.
- **Dado** dois inscritos do mesmo evento, **quando** os códigos são gerados, **então** eles
  nunca colidem; a unicidade é garantida por evento.
- **Dado** um código identificador, **quando** alguém tenta usá-lo para registrar presença,
  **então** a operação é recusada, porque presença só se prova por assinatura de token
  (RN-396).
- **Dado** o e-mail de confirmação, **quando** o responsável abre com imagens bloqueadas,
  **então** ele ainda lê o código de cada inscrito em texto e tem o link do ingresso
  (RN-398).
- **Dado** o e-mail de confirmação, **quando** o responsável abre com imagens liberadas,
  **então** vê o QR de cada inscrito ao lado do respectivo código.
- **Dado** o PDF sob demanda, **quando** ele é gerado, **então** traz o código junto do QR
  (RN-220 ampliada).

**Tasks acrescentadas:** `S1206-T5` (geração do código no core e na emissão), `S1206-T6`
(conteúdo do e-mail com QR, código em texto e link), `S1206-T7` (código no PDF).

#### LEELA-S1206-T5 · Código identificador por inscrito
- **Tipo:** api/function · **Depende de:** S1206-T1 · **Bloqueia:** S1206-T6, S1206-T7, S211-T1 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Arquivos (criar/editar)**
- `packages/core/src/tickets/` — geração e validação do formato, alfabeto e tamanho como
  constante única no padrão de fonte única.
- ponto de emissão do ingresso em `functions/src` — grava o código junto do `qrToken`.

**Testes a escrever**
- unit: formato e alfabeto; caractere ambíguo nunca sai.
- integração: emissão idempotente por inscrito; colisão dentro do mesmo evento não acontece
  numa amostra grande; código não é aceito em nenhum caminho de validação de presença.

#### LEELA-S1206-T6 · E-mail de compra com QR e código por inscrito
- **Tipo:** api/function · **Depende de:** S1206-T5 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Arquivos (editar)**
- `functions/src/email/templates.ts` e o template do e-mail de confirmação.

**Passos**
1. Bloco por inscrito com nome, modalidade, código em texto e QR.
2. Link do ingresso ao lado, para o caso de imagem e texto não bastarem.
3. Reuso do disparo e da idempotência da RN-219; nenhum controle de envio novo.

**Fronteira.** `functions/src/email` também recebe os dois templates de aviso ao afiliado
(`S706-T2`, pacote E08). Arquivo comum, blocos distintos: quem aterrissar depois faz rebase
e acrescenta.

#### LEELA-S1206-T7 · Código identificador no PDF sob demanda
- **Tipo:** api/function · **Depende de:** S1206-T5 · **Estimativa:** XS · **Rota:** opus
- **✅ COBERTO em 2026-07-29 (INGPAGE-BUILD · `1d82127`):** a superfície que faltava era a
  **versão imprimível da página do ingresso** (`S1214-T4` · RN-424), não um gerador de PDF.
  O código identificador aparece no PDF porque aparece na página, e a página é o PDF —
  `/ingresso/{token}/imprimir` entrega a mesma leitura em folha A4, com o código em texto ao
  lado do QR. **Nenhuma dependência de geração de PDF entrou no repo.** Teste de cobertura:
  `apps/landing/test/ingresso-imprimir.test.tsx` (a folha leva QR, código e dados mínimos, e
  nada além do que a RN-422 permite).
- **Continua fora:** PDF gerado no servidor e PDF anexado ao e-mail. Vira lane própria se o
  dono pedir (D-ING-9).

Traz o código ao lado do QR no PDF, pelo mesmo motivo de degradação.

**Fila completa do pacote:** `02-rodadas/2026-07-28-ingresso-qr/03-fila-codigo.md`.

## Delta entrada do organizador na landing (SPEC-ONBOARD · 2026-07-28)

Queixa do dono olhando o preview do go-live controlado: *"não temos a área de login. e nem
aonde clicar na página inicial da Leela, para entrar no nosso painel do organizador."* As
telas de conta do painel EXISTEM desde a S020 (`/entrar`, `/cadastrar` — E00); o que falta
é a porta na superfície pública. Rodada completa (cadastro + código de convite + overlay)
em `02-rodadas/2026-07-28-onboarding-organizador/`; donos E16 (código/overlay) e E00
(cadastro). Aqui entra só o pedaço da landing.

### LEELA-S1213 · Entrada do organizador na landing pública · (de-para novo · SPEC-ONBOARD)

**Como** organizador (novo ou existente), **quero** encontrar na página inicial da Leela
onde entrar no painel e onde criar minha conta, **para** acessar o sistema sem conhecer a
URL do painel de cor.

- **MoSCoW:** Must · **Estimativa:** S · **Superfície:** Landing · **V1-slim:** ✅ (bloqueia o go-live controlado)
- **Tela(s) de referência:** — (evolução do `PublicHeader`/`PublicFooter` da S1200-T1)
- **RNs:** RN-411 (contexto do fluxo); premissa P10 (URL do painel por env pública)

**Critérios de aceite (Given/When/Then):**
- **Dado** qualquer página pública, **quando** renderiza, **então** o `PublicHeader` mostra "Entrar" e "Criar conta de organizador", visíveis em desktop e mobile.
- **Dado** "Entrar", **quando** clico, **então** caio no `/entrar` do painel (S020-T1); "Criar conta de organizador" leva ao `/cadastrar` (E00-S030).
- **Dado** o destino, **quando** o link é montado, **então** a URL do painel vem de `NEXT_PUBLIC_PAINEL_URL` (P10), nunca de string fixa; sem a env, o link não renderiza quebrado — cai no caminho relativo documentado do deploy conjunto.
- **Dado** o footer público, **quando** renderiza, **então** ecoa o link de entrada junto dos institucionais.
- **Dado** o gate de SEO/perf da landing (S1200), **quando** os links entram, **então** nenhuma dependência nova entra no bundle e o CWV não regride (a landing segue Radix-free).

**Tasks:**

#### LEELA-S1213-T1 · "Entrar" + "Criar conta de organizador" no header/footer públicos
- **Tipo:** screen · **Depende de:** S1200-T1 · **Estimativa:** S · **Rota:** opus

Links no `PublicHeader` (desktop: canto direito; mobile: dentro do menu/estado compacto já
existente — sem lib nova) e eco no `PublicFooter`. Destino por env pública (P10). Testes:
unit (render dos links, montagem da URL com e sem env) + verificação de bundle (nenhuma
dependência nova).

---

## Delta página própria do ingresso (SPEC-INGPAGE · 2026-07-29)

Item 55 do painel: *"o QR do e-mail não aparece no Gmail nem no Outlook."* O QR vai embutido
no corpo por privacidade e esses dois clientes não renderizam imagem embutida assim; anexo
inline morreu por prova na INGQR-REV (o port `EmailProvider` não tem superfície de anexo e o
`POST /v3/smtp/email` do Brevo não expõe `Content-ID`). A recomendação (b) daquela review é
esta página.

Ela fecha três pontas de uma vez: o QR que não aparece, o "link do ingresso" da RN-398 que
hoje aponta para a página do evento por falta de destino, e a superfície que o `S1206-T7`
esperava. Rodada completa em `02-rodadas/2026-07-29-pagina-ingresso/`.

### Regras de negócio novas (SPEC-INGPAGE)

- **RN-418 · A página do ingresso é pública, tokenizada e somente leitura (dona = E12).** A
  rota `/ingresso/{token}` exibe o ingresso de **um** inscrito, sem login, a quem apresentar
  token válido. A leitura acontece no servidor e **nenhuma Security Rule é afrouxada**:
  `eventos/{id}/inscritos` continua fechado a cliente anônimo (provado no vetor 6 da
  INGQR-REV). A fronteira de autorização é a verificação criptográfica do token, na mesma
  doutrina do leitor público de eventos, onde o gate mora no código. **A página não escreve
  nada:** não credencia (RN-399, RN-221 e RN-222 intactas), não emite (quem cura ausência é a
  RN-382) e não muda estado. A resposta é sempre dinâmica, nunca cacheada. `ingresso` entra
  na lista de slugs reservados de evento, junto das demais rotas estáticas.
- **RN-419 · O token do link é próprio, derivado do mesmo keyring, verificado no servidor de
  negócio (dona = E12).** O link **nunca** carrega o `qrToken`: ele é a credencial de
  presença e quem o lê entra no evento; numa URL vaza por histórico, `Referer`, log de proxy
  e print. Formato `LLIP1.<kid>.<payloadB64url>.<assinatura>`, irmão do `LLQR1`: payload
  mínimo `{i,e,t}` sem PII, HMAC-SHA256 com o segredo do keyring já existente, comparação em
  tempo constante. **Separação de domínio pela constante de versão** — `LLQR1` não abre a
  página, `LLIP1` não passa no check-in, e as duas constantes jamais podem ser iguais (é
  asserção de teste). Kid inválido, assinatura inválida, inscrito inexistente e evento
  inexistente devolvem **a mesma resposta**. **A chave de assinatura não mora no runtime da
  superfície pública:** verificação e projeção acontecem numa Function, porque com a chave no
  servidor de páginas uma falha de dependência ali permitiria cunhar QR de check-in offline,
  para qualquer evento e tenant, sem tocar no banco. A projeção não devolve o `qrToken` em
  texto (o QR vai renderizado como imagem); isso é higiene, e está escrito como higiene.
- **RN-420 · Rotação não mata link emitido; re-emitir o ingresso mata (dona = E12).** Três
  propriedades distintas: (1) rotacionar o kid ativo **não** invalida link já enviado, porque
  o `kid` viaja no token e o ring guarda os antigos, exatamente como provado para o ingresso
  emitido; (2) tirar o kid do ring **revoga em massa** o que ele assinou, e é a alavanca de
  emergência; (3) re-emitir o ingresso de um inscrito **invalida o link antigo dele**, porque
  a assinatura cobre o `qrToken` vigente — revogação individual sem campo novo, com a mesma
  semântica que o balcão já aplica. **O link não tem prazo:** o ingresso é comprovante de
  compra, aberto na fila da largada meses depois, e um prazo criaria "ingresso vencido no dia
  do evento". O que muda com o tempo é o estado, lido a cada abertura.
- **RN-421 · O que a página mostra em cada estado (dona = E12).** `confirmado` com `qrToken`
  e sem `checkinEm` ⇒ QR, código e dados mínimos. `confirmado` com `checkinEm` ⇒ o mesmo, com
  o credenciamento em destaque e o carimbo, **o QR continua visível**. `confirmado` sem
  `qrToken` ⇒ aviso de emissão em andamento, nunca QR quebrado (é a face da RN-382).
  `pendente` ⇒ sem QR. `cancelado` ou `estornado` ⇒ **sem QR**, com o que aconteceu em texto e
  o código só para atendimento. Evento encerrado ⇒ histórico com aviso, sem QR. Token que não
  verifica ⇒ resposta única e genérica. Estornado e cancelado não mostram QR porque mostrar
  convida a pessoa a viajar até o evento e ser barrada na fila; credenciado mantém o QR porque
  esconder não protege nada (o servidor já recusa o replay) e tira a conferência de quem
  chegou. A página degrada com estado legível quando a leitura falha, nunca com erro de
  framework.
- **RN-422 · Dado mínimo e cabeçalhos de privacidade (dona = E12).** Exibe nome do titular,
  evento com data e local, modalidade, kit e tamanho quando houver, código e estado. **Não
  exibe** CPF, telefone, e-mail, nascimento, endereço, contato de emergência, resposta de
  formulário, valor pago nem dado de outro inscrito do mesmo pedido. Três cabeçalhos
  obrigatórios: `noindex, nofollow` (senão buscador indexa ingresso de gente),
  `Referrer-Policy: no-referrer` (senão o token sai no `Referer` de todo link de saída) e
  `Cache-Control: no-store` (o token está na URL). **Encaminhar o link é encaminhar o
  ingresso**, a mesma propriedade que o e-mail já tinha; transferência formal de titularidade
  é E13-S1316 e não passa por aqui.
- **RN-423 · Base pública única por ambiente, e o link no e-mail (dona = E12).** A base
  pública das URLs vem do ambiente, **uma só**, compartilhada por superfície pública e
  Functions; o domínio hardcoded sai do código (o valor do domínio segue sendo o item 12). O
  e-mail da compra ganha, **por inscrito**, o link do ingresso daquele inscrito — um por
  inscrito, não um por pedido, porque o token é por inscrito. **O código em texto permanece
  sempre** e **o QR embutido permanece**: o link é degradação, não troca. **Sem base
  configurada, o e-mail sai sem link**, nunca com link quebrado nem para domínio de terceiro.
- **RN-424 · A versão imprimível é o PDF do ingresso (amplia a RN-220, dona = E12).** A rota
  imprimível de `/ingresso/{token}` entrega o mesmo ingresso em A4, com CSS de impressão e sem
  navegação; o PDF sai do navegador de quem imprime. Isso satisfaz o `S1206-T7`. Nenhuma
  dependência de geração de PDF entra no repo: um Chromium na Function custa memória na casa
  do gigabyte e cold start na casa dos dez segundos, e uma biblioteca de desenho obriga a
  manter um segundo layout que diverge da página no primeiro ajuste de marca. PDF anexado ao
  e-mail, gerado no servidor, continua fora de escopo.

### LEELA-S1214 · Página própria do ingresso (link tokenizado por inscrito) · (de-para novo · SPEC-INGPAGE)

**Como** quem comprou (para mim ou para a família), **quero** abrir o ingresso de cada
inscrito numa página da Leela pelo link do e-mail, **para** ver o QR mesmo quando meu cliente
de e-mail não mostra a imagem, e para imprimir se eu quiser.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Landing + Functions
- **Tela(s) de referência:** greenfield; deriva do E01 e do ingresso do checkout (`Ticket.tsx`)
- **RNs:** RN-418, RN-419, RN-420, RN-421, RN-422, RN-423, RN-424; contexto RN-218, RN-396,
  RN-398, RN-382, RN-399, RN-221/222
- **ADR:** ADR-017 (DS Radix-free na superfície pública)
- **Pedido em grupo (ADR-011):** um link por INSCRITO. O responsável recebe N links no mesmo
  e-mail, um por pessoa da compra.

**Critérios de aceite (Given/When/Then):**

- **Dado** um inscrito confirmado com ingresso emitido, **quando** abro o link do e-mail,
  **então** vejo o QR renderizado, o código identificador em texto e os dados mínimos do
  ingresso, sem precisar entrar em conta nenhuma (RN-418, RN-422).
- **Dado** o mesmo link, **quando** a página monta, **então** nenhuma leitura de inscrito
  acontece no cliente e nenhuma Security Rule foi afrouxada para isso funcionar (RN-418).
- **Dado** um `qrToken` colado na URL no lugar do token do link, **quando** abro, **então** a
  página recusa; e **dado** um token de link apresentado no scanner do balcão, **quando** o
  check-in roda, **então** ele recusa (RN-419).
- **Dado** um link emitido antes de uma rotação de chave, **quando** a chave ativa vira,
  **então** o link continua abrindo (RN-420).
- **Dado** um ingresso re-emitido, **quando** abro o link antigo, **então** ele não abre mais
  (RN-420).
- **Dado** um inscrito estornado ou cancelado, **quando** abro o link, **então** vejo o que
  aconteceu e **não** vejo QR (RN-421).
- **Dado** um inscrito já credenciado, **quando** abro o link, **então** vejo o estado de
  credenciamento com o carimbo e o QR continua visível (RN-421).
- **Dado** um pedido pago cuja emissão ainda não fechou, **quando** abro o link, **então**
  vejo aviso de emissão em andamento e nenhum QR quebrado (RN-421 sobre RN-382).
- **Dado** um token inválido, um inscrito inexistente ou um evento inexistente, **quando**
  abro, **então** a resposta é a mesma nos três casos (RN-419).
- **Dado** a rota do ingresso, **quando** a resposta sai, **então** ela carrega
  `noindex, nofollow`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` (RN-422).
- **Dado** o e-mail da compra, **quando** ele é montado, **então** cada inscrito ganha o link
  do próprio ingresso, o código em texto permanece e o QR embutido permanece (RN-423).
- **Dado** ambiente sem base pública configurada, **quando** o e-mail é montado, **então** ele
  sai sem link e com o código (RN-423).
- **Dado** a versão imprimível, **quando** imprimo, **então** sai uma folha A4 com QR, código
  e dados mínimos, sem navegação (RN-424).
- **Dado** o gate de SEO e peso da landing, **quando** a rota entra, **então** nenhuma
  dependência nova entra no bundle público (o QR chega renderizado do servidor) e a landing
  segue Radix-free.

**Tasks:** S1214-T1, S1214-T2, S1214-T3, S1214-T4 — **as quatro CONSTRUÍDAS em 2026-07-29**
pela lane INGPAGE-BUILD (`82e3286`, `19eb42d`, `8cb17de`, `1d82127`), em série, com gate
verde task a task. **Aguarda a review antagonista** em contexto fresco, sobre os oito vetores
da fila. Handoff: `.nirvana/handoffs/leela-build-2d6ee98d-INGPAGE-BUILD.md`, com cinco
premissas vetáveis (P-INGPAGE-1 a 5) e o backfill pendente de decisão do dono.

**O que a lane entregou, por peça:**

| Peça | Onde nasceu |
|---|---|
| Token `LLIP1` (formato, parse, matriz de estados como tipo) | `packages/core/src/tickets/linkIngresso.ts` |
| Assinatura/verificação com binding ao `qrToken` vigente | `functions/src/eventos/linkIngresso.ts` |
| Endpoint da projeção mínima com QR renderizado | `functions/src/http/ingressoPorLink.ts` |
| Rota pública e os sete estados | `apps/landing/app/(public)/ingresso/[token]/` |
| Base pública única por ambiente | `functions/src/eventos/basePublica.ts` |
| Link por inscrito no e-mail | `functions/src/email/templates.ts` + `enviarIngressos.ts` |
| Slug reservado | `functions/src/eventos/slug.ts` (`SLUGS_RESERVADOS`) |
| Backfill da `url` dos eventos publicados | `functions/scripts/backfill-url-eventos.mjs` (dry-run por padrão) |

**Achado da construção que vira ponta solta de produto (P-INGPAGE-1).** A linha *"`confirmado`,
sem `qrToken` ⇒ estamos emitindo seu ingresso"* da RN-421 está implementada e testada na
projeção e na página, mas **não é alcançável por um link real**: a assinatura cobre o `qrToken`
vigente (D-ING-4), então sem ingresso emitido não há material de binding e o link não existe.
Quem ainda não tem ingresso recebe, no e-mail, a frase de emissão em andamento que a RN-398 já
escreve — fica sem LINK, não sem informação. Mudar isso exigiria um segundo material de binding
por inscrito (campo novo + migração) e faria a re-emissão deixar de revogar de graça.

#### LEELA-S1214-T1 · Token `LLIP1` e leitura do ingresso por capacidade
- **Tipo:** api/function · **Depende de:** S1206-T5 (emissão) · **Bloqueia:** S1214-T2, S1214-T3 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Criar o formato do token de link e o único ponto que o verifica, projetando o dado mínimo do
ingresso com o QR já renderizado.

**Contexto & referências**
Reusa `obterQrKeyring`/`carregarQrKeyring`, `kidQrValido`, os helpers base64url e UTF-8 puros
do core, o `timingSafeEqual` do caminho de verificação do QR e o `gerarQrDataUrl`. Nada de
segundo keyring, nada de segundo gerador de QR.

**Modelo de dados / contratos**
Parte pura no core (formato, parse estrutural, constante de versão); parte com segredo nas
Functions (assinar, verificar); endpoint que recebe o token e devolve a projeção
`{ estado, evento, inscrito, codigo, qrDataUri?, credenciadoEm? }`. **Zero campo novo no
Firestore:** o token é derivado, não armazenado.

**Regras de negócio a respeitar**
RN-419, RN-420, RN-422 (o que a projeção pode conter).

**Testes a escrever**
Unit: assina e verifica; token adulterado em cada uma das quatro partes recusa; `LLQR1`
recusado pelo verificador do link e `LLIP1` recusado por `parseQrToken`; as duas constantes de
versão são diferentes. Integração no emulador: rotação de kid não mata link; kid fora do ring
revoga; re-emissão invalida link antigo; as quatro causas de falha devolvem resposta idêntica.

**Fora de escopo**
A página (T2), o e-mail (T3), a impressão (T4).

#### LEELA-S1214-T2 · Rota `/ingresso/{token}` na landing
- **Tipo:** screen · **Depende de:** S1214-T1 · **Bloqueia:** S1214-T4 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Objetivo**
A página em si: Server Component que consome a projeção da T1 e renderiza a matriz de estados
da RN-421 com o visual da casa.

**Contexto & referências**
DS pela entrada server-safe da ADR-017 (`@leela/design-system/server`), com o `Ticket.tsx` do
checkout como referência de forma. Nenhuma dependência nova, e nenhum `qrcode` no bundle: a
imagem chega pronta.

**Passos de implementação**
Os três cabeçalhos da RN-422; renderização sempre dinâmica; estado de erro legível quando a
leitura falha, incluindo cold start da Function; `ingresso` acrescentado à lista de slugs
reservados de evento, criada nesta task junto das rotas estáticas que já existem (`convite`
entre elas).

**Regras de negócio a respeitar**
RN-418, RN-421, RN-422.

**Testes a escrever**
Unit por estado da matriz, incluindo a ausência de QR em estornado e cancelado e a presença
dele em credenciado; asserção dos três cabeçalhos; asserção de que nenhum campo proibido pela
RN-422 aparece no HTML; teste de que um slug de evento não sombreia a rota.

**Fora de escopo**
Impressão (T4); área logada do atleta (E13).

#### LEELA-S1214-T3 · Base pública única e link por inscrito no e-mail
- **Tipo:** api/function · **Depende de:** S1214-T1 · **Estimativa:** S · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Tirar o domínio hardcoded do código e acrescentar ao e-mail da compra o link do ingresso de
cada inscrito.

**Contexto & referências**
`EVENTO_URL_BASE = 'https://beh.ro'` está cravado em `functions/src/eventos/publicarEvento.ts`,
e `beh.ro` é domínio dos mocks Be Hero; a landing usa outra base (`NEXT_PUBLIC_LEELA_URL`).
Duas bases divergentes no mesmo produto, e o e-mail já manda hoje um link para domínio de
terceiro.

**Passos de implementação**
Acréscimo ao template, nunca reescrita: o bloco de cada inscrito ganha o link; o código em
texto e o QR embutido permanecem; a chave de idempotência da RN-219 não é tocada. Sem base
configurada, o link não é renderizado.

**Regras de negócio a respeitar**
RN-423; RN-398 e RN-219 preservadas.

**Testes a escrever**
Unit do template com e sem base configurada; asserção de que o código em texto e o QR embutido
continuam presentes nos dois casos; asserção de um link por inscrito; asserção de que nenhuma
URL contém `undefined` nem o domínio antigo.

**Fronteira**
`functions/src/email/templates.ts` é arquivo disputado (avisos ao afiliado do pacote E08,
`S706-T2`). Blocos distintos, rebase na aterrissagem.

#### LEELA-S1214-T4 · Versão imprimível do ingresso
- **Tipo:** screen · **Depende de:** S1214-T2 · **Bloqueia:** S1206-T7 · **Estimativa:** S · **Rota:** opus

**Objetivo**
A mesma página em folha A4, com CSS de impressão e sem navegação. O navegador gera o PDF.

**Passos de implementação**
Mesma leitura, mesma matriz de estados, mesmos cabeçalhos de privacidade. Estado sem QR
continua sem QR na impressão.

**Regras de negócio a respeitar**
RN-424, que amplia a RN-220.

**Testes a escrever**
Unit do layout de impressão; asserção de que a folha carrega QR, código e dados mínimos e nada
além do que a RN-422 permite.

**Fora de escopo**
Geração de PDF no servidor e PDF anexado ao e-mail.

**Fila completa do pacote:** `02-rodadas/2026-07-29-pagina-ingresso/03-fila-codigo.md`.

---

## Delta cupom pré-aplicado por link e galeria do kit (SPEC-KITCUPOM · 2026-07-29)

Duas decisões da segunda leva da DEC-0729 caem neste épico. A **D-0729-5** cria a história nova
abaixo; a **D-0729-4** entra como fronteira, porque o modelo do kit é do E03 e só as telas
públicas são daqui. RNs em `02-rodadas/2026-07-29-checkout-ux/03-rns-kitcupom.md`; decisões e
premissas vetáveis em `02-spec-kitcupom.md`.

**RNs novas deste épico:** RN-426 (onde cada foto do kit aparece), RN-428 (simulação de galeria),
RN-430 (travessia do cupom pela jornada), RN-431 (banner pós-Hero) e RN-432 (verificação sem
oráculo).

### O que o inventário desta lane achou antes de especificar

**O auto-apply de cupom por URL já existe.** O `CheckoutFlow` tem o efeito A-2: recebendo
`?cupom=`, ele tenta o código na primeira cotação possível, e se o código não colar levanta o
aviso honesto e segue sem cupom. A história abaixo **não reconstrói** isso. Ela alimenta o
mecanismo com um link que finalmente carrega o cupom, e acrescenta a comunicação que falta.

**A chave `c` é morta.** `ATRIBUICAO_KEYS` preserva `'c'` da página do evento até o checkout e
nenhum arquivo do repositório a lê. O seed grava `parceria.linkMaster = 'beh.ro/mfl26?c=frc'`.
Logo o link master da assessoria hoje não aplica cupom, não atribui conversão e ainda aponta para
o domínio dos mocks Be Hero que a RN-423 acabou de expulsar do e-mail.

**O cupom não sobrevive à navegação, mas a atribuição sobrevive.** O `RefTracker` guarda o `?ref=`
por evento; o cupom só existe enquanto a querystring for copiada pelo CTA. Quem chega pelo link,
abre o regulamento e volta, mantém a comissão do afiliado e perde o desconto.

### LEELA-S1215 · Cupom pré-aplicado por link de afiliado ou assessoria · (de-para novo · SPEC-KITCUPOM)

**Como** quem recebeu o link de um afiliado ou de uma assessoria parceira, **quero** chegar com o
desconto já computado e ver que ele está aplicado, **para** não precisar descobrir, lembrar e
digitar um código para pagar o preço que me prometeram.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Landing (página do evento + checkout) + Painel (E08/E18)
- **Tela(s) de referência:** página do evento (faixa após a Hero); step 0 do checkout da S1209
- **RNs:** RN-430, RN-431, RN-432; fronteira RN-429 e RN-433 (E08); contexto RN-313, RN-315,
  RN-364, RN-423, RN-347
- **Reuso obrigatório:** o efeito A-2 do `CheckoutFlow`, o `CupomCampo` da S1209, o
  `ATRIBUICAO_KEYS` do CTA, a disciplina inteira do `RefTracker`, a `cotarInscricaoCheckout` como
  autoridade do número, o leitor server-side da landing e a base pública da RN-423.
- **Não toca:** o kernel de atribuição do `createInscricaoCharge`, o cálculo de preço, o cálculo
  de taxa, o contador de usos e o percentual de comissão.

**Critérios de aceite (Given/When/Then):**

- **Dado** um afiliado com cupom vinculado, **quando** o painel mostra o link compartilhável,
  **então** ele vem gerado da base pública do ambiente com `?ref=` e `?cupom=`, e nenhum domínio
  de terceiro aparece (RN-429).
- **Dado** um afiliado sem cupom vinculado, **quando** o painel gera o link, **então** ele sai só
  com `?ref=` e continua rastreando conversão, como já fazia (RN-429).
- **Dado** um link antigo com `?c=`, **quando** a pessoa chega por ele, **então** o valor é lido
  como cupom, e nenhum link novo é gerado com essa chave (RN-429).
- **Dado** que cheguei pelo link, **quando** navego para outra página do evento e volto,
  **então** o cupom continua valendo, como a atribuição já continuava (RN-430).
- **Dado** que cheguei pelo link, **quando** o checkout monta e a primeira cotação é possível,
  **então** o desconto já vem computado e a linha do resumo mostra a marca de desconto aplicado
  (RN-430).
- **Dado** que o número exibido veio da cotação, **quando** a tela renderiza, **então** a
  interface não soma nem subtrai um centavo (RN-430).
- **Dado** que digito à mão um cupom diferente do que veio no link, **quando** ele é aceito,
  **então** o digitado prevalece (RN-430).
- **Dado** um cupom de link que não cola, **quando** o checkout tenta, **então** o aviso honesto
  aparece no checkout e a jornada segue sem cupom, exatamente como já acontece hoje (RN-430).
- **Dado** um cupom de link que se aplica, **quando** abro a página do evento, **então** vejo a
  faixa logo após a Hero com o código e, quando resolvível, o nome de quem indicou (RN-431).
- **Dado** um cupom inexistente, expirado, esgotado, de escopo não satisfeito ou de outro evento,
  **quando** abro a página do evento, **então** a faixa **não aparece** e nenhum erro é mostrado
  na landing (RN-431).
- **Dado** que o cupom veio de assessoria ou clube, **quando** a faixa monta, **então** o nome
  exibido é o da entidade; **dado** que não há nome resolvível, **então** o texto degrada para o
  código sozinho (RN-431).
- **Dado** que a faixa depende da querystring, **quando** a página do evento é servida, **então**
  ela continua estática e a faixa entra atrás de Suspense, como o rastreador e o CTA já fazem
  (RN-432).
- **Dado** qualquer causa de recusa, **quando** a verificação responde, **então** a resposta é a
  mesma nos cinco casos e nenhum valor de desconto sai para código que não se aplica (RN-432).
- **Dado** que a leitura de cupom é fechada a organizador, **quando** a faixa monta, **então**
  nenhuma leitura de cupom acontece no cliente e nenhuma Security Rule foi afrouxada (RN-432).
- **Dado** que cheguei pelo link do afiliado A e digitei o cupom do afiliado B, **quando** a
  compra confirma, **então** B leva a comissão, que é o comportamento vigente ratificado
  (RN-433).
- **Dado** que cheguei pelo link do afiliado A e digitei um cupom sem afiliado, **quando** a
  compra confirma, **então** A leva a comissão e não leva o crédito do desconto (RN-433).

**Tasks:** S1215-T1, S1215-T2, S1215-T3, S1215-T4. Fila, dependências e ⚔ em
`02-rodadas/2026-07-29-checkout-ux/04-fila-kitcupom.md`. **A T3 é ⚔ obrigatória** (superfície
pública nova sobre dado que as Rules fecham); a T1 é ⚔ por tocar link de atribuição.

#### LEELA-S1215-T1 · Gerador do link compartilhável, com cupom dentro
- **Tipo:** core/painel · **Depende de:** — · **Bloqueia:** S1215-T4 · **Estimativa:** S · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Fazer o link de afiliado e o de assessoria nascerem de um gerador só, com base pública, `ref` e
`cupom`, e aposentar o `linkMaster` digitado.

**Contexto & referências**
`packages/core/src/affiliation/afiliado.ts` já documenta a forma `{base}/{slug}?ref={refCodigo}`;
`packages/core/src/clubs/parceria.ts` espelha `linkMaster` e `cupom` na parceria; a base única por
ambiente é a da RN-423 (`basePublica.ts`). O `ATRIBUICAO_KEYS` ganha a leitura de `c` como apelido
de `cupom`, sem passar a gerá-lo.

**Aceite**
Teste do gerador com e sem cupom vinculado, do apelido `c` na entrada, e da ausência de qualquer
domínio de terceiro na saída. Painéis de afiliado (E08) e de parceria (E18) copiam o link gerado.

#### LEELA-S1215-T2 · O cupom atravessa a jornada e a marca entra no valor
- **Tipo:** ui/landing · **Depende de:** — · **Bloqueia:** S1215-T3 · **Estimativa:** M · **Rota:** opus

**Objetivo**
Capturar e guardar o cupom da URL com a mesma disciplina do `?ref=`, e marcar a linha de desconto
do resumo com "(desconto aplicado)".

**Contexto & referências**
`RefTracker.tsx` é o molde exato, incluindo a normalização, a precedência de captura, o claim do
cliente e a degradação quando o armazenamento não está disponível. O auto-apply já existe no
`CheckoutFlow` (efeito A-2) e o `CupomCampo` já mostra o estado de cupom aplicado. A marca é
exibição; o número continua vindo inteiro da cotação.

**Aceite**
Teste de ida e volta pela página do evento sem perder o cupom, de precedência do código digitado
sobre o do link, e de que nenhuma soma acontece no cliente.

#### LEELA-S1215-T3 · Banner pós-Hero e a verificação server-side que o alimenta
- **Tipo:** ui/landing + leitura server-side · **Depende de:** S1215-T2 · **Bloqueia:** — · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Exibir a faixa de desconto após a Hero quando o cupom se aplica, e calar quando não se aplica,
sem abrir um oráculo de cupons nem vazar dado do afiliado.

**Contexto & referências**
`apps/landing/lib/leitor.ts` e `lib/firebaseAdmin.ts` são o caminho já doutrinado (Admin SDK no
servidor, gate no código, Rules intocadas, desde a S1200-T2). `RefTracker` e `CtaInscricao` são o
precedente de componente de cliente atrás de Suspense sem tirar a página do estático. A mensagem
opaca do `createInscricaoCharge` ("Cupom indisponível") é o tom da recusa.

**Aceite**
Resposta idêntica para as cinco causas de recusa; nenhum valor de desconto para código que não se
aplica; nenhuma leitura de cupom no cliente; nenhuma Rule alterada; página do evento continua
estática; cache curto por código na borda.

#### LEELA-S1215-T4 · Demonstração ponta a ponta no meia-floripa
- **Tipo:** preview/seed · **Depende de:** S1215-T1, S1215-T3 · **Bloqueia:** — · **Estimativa:** S · **Rota:** opus

**Objetivo**
Dar ao dono dois links prontos para clicar, um de afiliado e um de assessoria, que abrem a página
do evento com a faixa e chegam ao checkout com o desconto computado.

**Contexto & referências**
Os dois cupons já existem no seed: `FLORIPARUN10` no afiliado do meia-floripa e `RITMOFORTE10` na
assessoria com escopo de club parceiro. A demonstração é de **link**, não de cupom novo. O
`linkMaster` do seed sai de `beh.ro/mfl26?c=frc` e passa a ser gerado.

**Aceite**
Os dois links documentados no handoff; o de escopo de club parceiro demonstra também a faixa
ausente quando a condição não é satisfeita.

### Fronteira galeria do kit: as telas públicas (RN-426, RN-428)

O modelo, o painel e o Storage da galeria são do E03 (`S212`). Deste épico são duas regras.

**Onde cada foto aparece (RN-426).** `KitsSection` e `StepModalidadeKit` mostram **só a
principal** e não mudam. `KitDetalhe` passa a mostrar a galeria: principal em destaque,
secundárias como miniaturas no `Thumb` do DS, clique troca o destaque, e o lightbox que já existe
amplia a foto em foco. Nenhum componente novo de DS entra. Sobre proporção, a regra é de
enquadramento e não de validação, porque o produto não valida proporção em lugar nenhum: as fotos
são renderizadas em moldura quadrada com recorte por cobertura.

**Como o dono vê isso funcionando (RN-428).** Não pelo seed. A guarda exige http(s) e a lição
LEELA-R14 já decidiu que mock de imagem é app-side. A cascata do `kitImagem.ts` ganha um degrau:
em preview, kit sem fotos secundárias recebe duas extras determinísticas do acervo local; em
produção, mostra só a principal. Página de verdade não exibe foto que o organizador não subiu.

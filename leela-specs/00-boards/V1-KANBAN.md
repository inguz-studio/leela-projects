---

kanban-plugin: board
tags:
  - leela
  - v1
  - kanban

---

## 📋 Backlog

- [ ] **[E13] App do atleta** — descobrir, inscrever, ingresso com QR e clube no celular 📋 [[LEELA-E13-app-atleta]]
- [ ] **[E08] Afiliados** — influenciador tem link próprio e vê as próprias vendas 🔄 backend completo (atribuição + comissão + saldo) + UI de comissão entregue (config, saldo dos 2 lados, repasse manual); falta o painel do promotor [[LEELA-E08-influenciador]]
- [ ] **[E10] Marcas** — gerenciar patrocinadores reutilizáveis num lugar só 🔄 registro reutilizável + logo 1:1 + autocomplete (R9-E) + tela dedicada `/marcas` no painel entregue (lista/criar/editar/excluir); falta a consolidação de ativações (S812) [[LEELA-E10-marcas]]
- [ ] **[E11] Analytics** — análise de vendas e público unificada 📋 [[LEELA-E11-analytics]]
- [ ] **[E19] CRM** — conhecer e reter a base de contatos do organizador 🔄 backend pronto + hub "Clientes & Comunicação" entregue (lista cross-evento com LTV + detalhe com histórico e aniversário); falta o disparo de comunicação a segmentos [[LEELA-E19-crm]]
- [ ] **[E17] Social no app** — feed, perfil e tema dinâmico por conta 📋 [[LEELA-E17-perfil-social]]
- [ ] **[Plano] Onda 3** — 5 lotes e 22 histórias planejadas (falta o app) 📋 [[ROADMAP-onda3]]
- [ ] **[Higiene] Follow-ups do gate** — pendências datadas que não bloqueiam a próxima onda 📋 [[BOARD-HISTORICO]]
- [ ] **[DEC-0719 · c] CHECKOUT-FORM-2 (só UI restante)** — cupom no início + Pix/Cartão em botões (sem toggle) + botão "+ adicionar atleta" 📋 backend de gênero (RN-154) e PIX 30 min (RN-157) já PAGO no CHECKOUT2-MODELO; falta a camada de tela [[01-decisoes|DEC-0719]]

- [ ] **[DEC-0719-ret · h] Posse de identidade por CPF — DECIDIDO, virou fila de código (CLAIM-FIX)** — o Vitor fechou a dúvida F1/F2: o vínculo da conta à ficha da pessoa passa a acontecer **só com pagamento confirmado + e-mail igual ao da compra + e-mail confirmado**, e o pré-preenchimento só responde a quem cumpre as três condições (mata o abuso de "reivindicar CPF alheio" e o vazamento do anônimo). O e-mail de confirmação vai no primeiro login ou na primeira entrega de ingressos. Prova de posse por verificação externa fica como reforço antes de ir ao ar com dado real. Executável já 📋 RN-174 · fila CLAIM-FIX · report `CHECKOUT2-MODELO-REPORT.md` [[01-decisoes|DEC-0719-ret]]
- [ ] **[DEC-0719-ret · i · GATED] Estrangeiro sem CPF compra com passaporte** — decidido no modelo Doity/Sympla sobre o Asaas: o organizador liga um botão por evento "aceitar estrangeiros"; com ele ligado, o checkout pergunta a nacionalidade e o estrangeiro entra por passaporte (sem CPF) pagando só no cartão internacional à vista. Espera a liberação da conta Asaas para pagador estrangeiro (contato com o gerente, ~6 dias úteis) antes de virar código; enquanto isso, um brasileiro já pode comprar pelo estrangeiro 🧊 RN-175/176/177 · fila ESTRANGEIRO-CHECKOUT · report `ESTRANGEIRO-PAGAMENTO-REPORT.md` [[01-decisoes|DEC-0719-ret]]
- [ ] **[DEC-0719 · g · PARKED] clube-retroativo** — desconto retroativo do clube-influenciador ao bater o mínimo; aguarda o Vitor revisar como funciona na Ticketsports; é dinheiro (rota Fable + antagonista) 🧊 RN-315 [[01-decisoes|DEC-0719]]
- [ ] **[CAP-FORMBUILDER · ANÁLISE-FUTURA] Construtor de formulário de perguntas personalizadas** — o Vitor viu num concorrente e quer registrar: o organizador montaria perguntas próprias (seleção múltipla/única, sim-não, anexo de arquivo) exibidas na compra do evento e na inscrição em clubes. Ele mesmo pediu para **analisar depois** — escopo NÃO-DECIDIDO (onde a resposta vive, quem lê, export, obrigatoriedade, limite) e riscos a estudar (anexo = Storage + LGPD/saúde sensível, resposta no pedido ou no inscrito, benchmark Sympla/TicketSports). Não entra na fila executável 🧊 captura em [[00-captura|CAP-FORMBUILDER]]


## 🔄 Em execução



## ✅ Feito

- [x] **[DEC-0719 · a] Capa de evento por upload (CAPA-EVENTO-UPLOAD)** — a última imagem que faltava: a capa do evento agora sobe por ARQUIVO nas duas telas (Novo evento e Configurações do evento), com recorte automático para o formato do hero (1.9:1) e teto de 2MB. No Novo evento a imagem espera o evento existir e sobe logo depois de criar — se a capa falhar, o evento fica criado e a imagem vai depois em Configurações, com aviso honesto. No servidor, só a equipe do próprio organizador grava, formatos JPG/PNG/GIF, e o teto de 2MB vale também contra quem tenta por fora da tela. A pendência de backend do UPLOAD-SWEEP está paga; a nota "em breve por upload" morreu ✅ RN-168/RN-170/RN-228 · report `CAPA-EVENTO-UPLOAD-REPORT.md` [[BOARD-HISTORICO]]
- [x] **[DEC-0719 · d/e/f] Backend do checkout novo (CHECKOUT2-MODELO)** — o banco já sustenta as 4 regras da rodada: **CPF é único no sistema** (CPF repetido no checkout vira a MESMA pessoa, linka e não duplica, à prova de compra simultânea), **conta criada sozinha na 1ª compra** (sem senha, com e-mail de "defina sua senha e veja sua compra" — e sem a chave de e-mail, a compra nunca trava, só fica a pendência de envio), **termo de saúde base sempre obrigatório** com termo extra do organizador por cima (versionado, exigido no pagar), e **PIX que expira em 30 min** (a cobrança nasce com validade e o pedido não fica zumbi: expirou sem pagar → cancela e libera nova cotação). Nada de tela aqui (a UI é o próximo lote). Review antagonista Fable achou 2 pontos de identidade que viram **decisão do Vitor** (ver card abaixo); o resto passou. Suíte inteira verde (2857 testes) ✅ RN-173/RN-154/RN-155/RN-156/RN-157 · report `CHECKOUT2-MODELO-REPORT.md` [[BOARD-HISTORICO]]
- [x] **[DEC-0719 · a] Upload-only nas capas (UPLOAD-SWEEP)** — sumiu o "colar URL" das imagens do painel: foto e capa do perfil público e capa do clube agora só aceitam ARQUIVO, com botão "Trocar imagem", prévia, "Remover" e recorte automático para a proporção certa (avatar quadrado, capas 16:9) antes de enviar. A capa de EVENTO ficou de fora por depender de backend ainda não pronto (não há onde guardar o arquivo nem como salvar o link no cadastro) — o campo de URL foi tirado e virou um aviso honesto de "em breve por upload"; a peça que falta virou pendência de backend — **paga em 2026-07-19 pelo lote CAPA-EVENTO-UPLOAD (card acima)** ✅ RN-168/RN-170 [[BOARD-HISTORICO]]
- [x] **[DEC-0719 · b] subnav-divisórias (SUBNAV-DIV)** — a linha fininha que separa o menu de seções do conteúdo passou a valer em TODO SubNav do painel, não só nas abas dentro de eventos: entrou no menu do evento, no menu do clube e no menu do Financeiro (Análise/Repasses); as abas terciárias de evento já tinham. Mesma linha (o mesmo padrão de 1px das terciárias), sem inventar estilo novo, e a rolagem lateral do menu em telas estreitas continua intacta ✅ RN-229 [[BOARD-HISTORICO]]
- [x] **[E03] Tamanhos por corte + ciclo de encomenda (TAMANHOS-GRADE)** — a camiseta separa corte feminino/masculino (quem compra escolhe o corte e depois o tamanho); o organizador configura a grade, encerra encomendas com a contagem do momento (sem travar vendas), ajusta o estoque quando as camisas chegam e acompanha as entregas por corte e tamanho no balcão; promotor copia o link de indicação pronto ✅ [[BOARD-HISTORICO]]
- [x] **[E04/E12] Formulário novo do checkout (CHECKOUT-FORM)** — comprador preenche telefone, nascimento e endereço pelo CEP (digita o CEP, completa só o número; se o serviço de CEP cair ou demorar, preenche à mão e a compra nunca trava) e aceita os termos da compra e o termo de saúde antes de pagar; o servidor passou a EXIGIR os dois aceites (comprar por fora da tela não fura o aceite legal, e pedido antigo re-tentado completa a prova sem reescrever nada); o aviso "+ taxa de serviço" só aparece quando o evento repassa a taxa ✅ [[BOARD-HISTORICO]]
- [x] **[E00] Telas de conta** — login, cadastro, recuperação e configurações ✅ (entregue e aprovado em review 2026-07-13, lote S020; card estava defasado) [[LEELA-E00-fundacao-tecnica]]
- [x] **[E01] Varredura §8 no painel (W2 do gate de DS)** — as telas antigas trocaram as datas, as buscas, os campos de texto, os radinhos, os "⋯" e os filtros feitos à mão pelos componentes oficiais do DS; a divisória fantasma (que aparecia 3× mais grossa) foi corrigida e o modal de regulamento da landing agora tem conteúdo em 3 eventos do preview ✅ [[BOARD-HISTORICO]]
- [x] **[E01] shadcn-first para todo componente (SHADCN-SWEEP)** — o Vitor ampliou a regra §8: agora vale para TODO componente, não só seleção e data. Os últimos checkboxes feitos à mão (4 telas) e as buscas cruas (7 telas) viraram os `Checkbox` e `SearchInput` oficiais do DS, e a governança passou a exigir justificativa documentada (no padrão do ADR-017) para qualquer peça fora do DS ✅ [[BOARD-HISTORICO]]
- [x] **[E01/E12] Modal e primitivos do design system na página pública** — o modal acessível vira peça oficial do DS e a home carrega menos código para o mesmo visual ✅ [[BOARD-HISTORICO]]
- [x] **[E01] Modal e Drawer do painel sem a biblioteca Radix (MODAL-CONVERGE)** — as janelas de diálogo do painel passaram a usar o MESMO motor acessível do modal público (um só lugar cuida de prender o teclado, do Esc, de travar o scroll e de devolver o foco), sem mudar nada do visual nem das ~26 telas que usam essas janelas. Com isso a biblioteca `@radix-ui/react-dialog` saiu de vez do design system (era ela que quebrava a página pública). O showroom ganhou uma vitrine do diálogo. Testes: DS 1046/1046, painel 1185/1185 ✅ [[V1-CHECKLIST]]
- [x] **[E12] Blindagem da página pública (SECFIX)** — dado do organizador não vira código na página do evento, convites com token ficam fora do Google e o modal de regulamento prende o teclado dentro dele ✅ [[BOARD-HISTORICO]]
- [x] **[E03/E12] LP-VENDAS-KIT** — LPs com fotos semi-realistas por tema, regulamento em modal na página do evento e kit com descrição/itens/imagem 1:1 editáveis no painel (refletindo no checkout) ✅ [[BOARD-HISTORICO]]
- [x] **[E00] Fundação técnica** — monorepo, Firebase, login e CI ✅ [[LEELA-E00-fundacao-tecnica]]
- [x] **[E01] Design System** — temas brasa/leela, showroom e telas-base ✅ [[LEELA-E01-design-system]]
- [x] **[E01] Gate de consistência do DS (W1)** — auditoria completa painel+DS: núcleo do DS provado são, showroom passa a documentar seleção rica e datas, rota de correção das telas antigas mapeada ✅ [[BOARD-HISTORICO]]
- [x] **[E12] Gate de consistência + SEO da landing (W2)** — landing é a superfície mais conforme do sistema; achado pontual de segurança no bloco de dados estruturados (correção de 1 linha) e convites fora do índice a marcar ✅ [[BOARD-HISTORICO]]
- [x] **[E16] Multi-tenant** — isolamento e permissões da plataforma ✅ [[LEELA-E16-plataforma-superadmin]]
- [x] **[E02] Visão geral** — painel de abertura com os números do evento ✅ [[LEELA-E02-visao-geral]]
- [x] **[E03] Operação do evento** — inscritos, balcão, kits e financeiro ✅ [[LEELA-E03-operacao-evento]]
- [x] **[E05] Clubs** — membros, desafios, parcerias e comunicados ✅ [[LEELA-E05-clubs]]
- [x] **[E16] Onboarding de tenant** — cadastro e termos comerciais ✅ [[LEELA-E16-plataforma-superadmin]]
- [x] **[Fidelidade] Telas do evento** — fiéis ao mockup, com gráficos e feed ✅ [[BOARD-HISTORICO]]
- [x] **[E04] Config e vendas** — lotes, preços automáticos, cupons e equipe ✅ [[LEELA-E04-config-vendas]]
- [x] **[E12] Landing e checkout** — descobrir e inscrever em poucos cliques ✅ [[LEELA-E12-landing]]
- [x] **[E09] Financeiro** — saldo, dados bancários e repasse auditado ✅ [[LEELA-E09-financeiro-profissional]]
- [x] **[E07] Estados de sistema** — telas 404, 500 e 403 por papel ✅ [[LEELA-E07-estados-sistema]]
- [x] **[E06] Comunicação** — campanhas, lista, editor e envio ✅ [[LEELA-E06-marketing]]
- [x] **[Transversais] Coleta de analytics, backend do desafio e planos de cobrança** ✅ [[BOARD-HISTORICO]]
- [x] **[Consolidações] DS canônico e dívida técnica** — KpiCard, realtime, flaky resolvido ✅ [[BOARD-HISTORICO]]
- [x] **[Onda 3 · L1] Robustez financeira e legal** — política de vendas, reembolso, capacidade ✅ [[BOARD-HISTORICO]]
- [x] **[Onda 3 · L2] Descoberta web e link-na-bio** — perfil público compartilhável ✅ [[LEELA-E17-perfil-social]]
- [x] **[E18] Assessorias parceiras** — clube parceiro com desconto exclusivo ✅ [[LEELA-E18-assessorias-parceiras]]
- [x] **[Onda 3 · L4] Scheduler de campanhas** — automações por gatilho ✅ [[LEELA-E06-marketing]]
- [x] **[R1] Seed de demonstração** — lotes vigentes e hero mínimo do evento ✅ [[BOARD-HISTORICO]]
- [x] **[R2] Rules de clubes** — segurança própria e limite no aceite público ✅ [[BOARD-HISTORICO]]
- [x] **[R3] Miudezas do painel** — etiqueta "Automática" e nome no reembolso ✅ [[BOARD-HISTORICO]]
- [x] **[R4] Testes E2E** — jornada de aceite de assessoria e gatilhos ✅ [[BOARD-HISTORICO]]
- [x] **[R5] Upload real de imagem** — foto, capa e avatar direto do arquivo ✅ [[BOARD-HISTORICO]]
- [x] **[R6] Gateway Asaas em sandbox** — cobrança PIX, cartão e boleto de ponta a ponta ✅ [[BOARD-HISTORICO]]
- [x] **[R7] Página do evento** — sem linhas entre dobras, ritmo único e hero em blur ✅ [[BOARD-HISTORICO]]
- [x] **[R8] Dados de demonstração** — clubes da Marina e sistema web preenchidos ✅ [[BOARD-HISTORICO]]
- [x] **[R9] Spec da revisão UX** — 13 itens do Vitor virados em histórias prontas ✅ [[03-stories]]
- [x] **[R10] Ver página pública** — botão do evento abre a landing na URL certa (env), rascunho desabilitado ✅ [[BOARD-HISTORICO]]
- [x] **[R9-A] Conformidade de UI** — contraste por estado, divisórias iguais, foto só por upload, filtros no padrão do DS, sub-nav com rolagem própria e header do evento sem busca ✅ [[BOARD-HISTORICO]]
- [x] **[R9-A] Calendar no DS** — date-picker e seletor de intervalo shadcn para o filtro temporal ✅ [[BOARD-HISTORICO]]
- [x] **[R9-E] Afiliados, marcas e e-mail (completo)** — influenciador com link rastreado na venda (aba Afiliados + aba Clubs dos dois lados + aceite por e-mail), patrocinador reutilizável com logo 1:1, e-mail transacional pronto para ligar a chave ✅ [[BOARD-HISTORICO]]
- [x] **[UIAF] Conformidade das telas de afiliados** — seleção de patrocinador salvo passa a usar o Combobox do DS (shadcn §8) e as telas de influenciador da aba Clubs ganham testes de integração ✅ [[BOARD-HISTORICO]]
- [x] **[R12] Landing com identidade** — tipografia, bordas e ícones do DS, evento com modalidade, página-calendário do organizador e imagens mockadas em todo slot ✅ [[BOARD-HISTORICO]]
- [x] **[R13] Checkout com identidade** — etapas visíveis, formulário na vertical e kits com hierarquia e imagem ✅ [[BOARD-HISTORICO]]
- [x] **[R9-B] Análise financeira unificada** — filtro por evento na Análise, Análise vira a porta única (Analytics some) e Repasses declara o saldo consolidado de todos os eventos ✅ [[BOARD-HISTORICO]]
- [x] **[R9-C] Kit de verdade no checkout** — cada kit tem imagem 1:1 (upload seguro), descrição e "o que está incluso"; o checkout mostra o dado real e os eventos de demonstração vêm preenchidos ✅ (falta só a edição na tela de kits — lote de UI) [[LEELA-E03-operacao-evento]]
- [x] **[E12] Revisão UX do checkout (mind Don Norman)** — fluxo de compra auditado ponta a ponta contra os wireframes: 18 fricções priorizadas (2 travam a compra quando ocorrem, 5 altas), 6 divergências para decisão, e a spec ratificada dos novos campos (telefone, nascimento, endereço via CEP) + aceites no pagar (política de cancelamento e termo de saúde) ✅ report em `outputs/leela-build-2d6ee98d/CHECKOUT-UX-REPORT.md` — os fixes viram o próximo lote
- [x] **[E12] Fixes não-controversos do checkout (CHECKOUT-FIXES)** — pagos os 5 fixes de fricção UI-pura do report: erro de cotação ganha "Tentar novamente" (BC-1); sessão anônima é recuperável com copy humana, sem jargão de infra (BC-2); cupom vindo do link auto-aplica com aviso honesto se falhar (A-2); PIX gera sozinho e mostra QR escaneável + "copiar código" (A-3); nota de transparência de taxa no primeiro passo (A-5) ✅ tsc/eslint 0, 19 testes verdes (9 novos), verify:brand PASS · handoff `.nirvana/handoffs/leela-build-2d6ee98d-CKFIX.md` — pendências de modelo/backend (endereço, aceites versionados, saúde) seguem para lote Fable
- [x] **[E12] Modelo do checkout novo (CHECKOUT-MODELO)** — o banco já sabe guardar tudo que o formulário novo vai coletar: endereço do comprador no pedido (CEP guardado limpo, 8 dígitos), telefone do responsável, nascimento por atleta, e os dois aceites do pagar (termos da compra + termo de saúde) com prova forte — versão E "impressão digital" do texto aceito, carimbados pelo servidor (impossível forjar ou antedatar). A política de cancelamento ganhou versão automática (muda o conteúdo, sobe a versão) e a página pública já entrega o que o form precisa (política, exigências de saúde, aviso "+ taxa") sem expor dado pessoal. Review antagonista achou 1 grave + 5 médios — todos corrigidos e re-provados ✅ report `outputs/leela-build-2d6ee98d/CKMOD-REPORT.md` — falta a UI coletar (próximo lote, que também torna os aceites obrigatórios no servidor) [[BOARD-HISTORICO]]
- [x] **[E08] Comissão do influenciador (fase 2)** — organizador define % ou valor fixo, a comissão acumula sozinha a cada venda confirmada, estorno devolve certinho e o afiliado vê saldo e extrato; repasse manual registrado no sistema (split automático fica para decisão) ✅ [[BOARD-HISTORICO]]
- [x] **[E19] CRM blindado (A3)** — a chave que identifica cada cliente ganhou segredo criptográfico: mesmo com um vazamento do banco, o CPF não é recuperável ✅ [[BOARD-HISTORICO]]
- [x] **[E19/E08] Tela do CRM + UI de comissão (CRM-COMISSAO-UI)** — o organizador abre "Clientes & Comunicação" no menu e vê seus clientes cross-evento com LTV, valor gasto e histórico, com aniversário e idade ao vivo no detalhe; configura a comissão do influenciador (% ou valor fixo, sem retroatividade), acompanha saldo/extrato dos dois lados e registra o repasse manual ✅ [[BOARD-HISTORICO]]
- [x] **[E08] Hub do promotor (PROMOTOR)** — o influenciador abre "Minhas afiliações" e vê, além dos cartões por evento, um resumo consolidado do seu negócio (afiliações ativas, inscrições no total, valor total e comissão a receber somando todos os eventos dele) e copia o código de indicação de cada evento com um clique; tudo só o dele (nunca dado de terceiro). Entregue evoluindo a tela que já existia, sem rota nova ✅ [[BOARD-HISTORICO]]
- [x] **[Decisões] Rodada de decisões do Vitor** — ratificadas e propagadas aos épicos ✅ [[BOARD-HISTORICO]]
- [x] **[Docs] Terminologia única** — Onda, Épico, História e Tarefa ✅ [[MODELO-ROADMAP]]


## 🧊 Fora da V1

- [ ] **[E14] Integrações de treino** — importar corrida do Strava e afins 🧊
- [ ] **[E15] Creator Studio** — criador monta conteúdo e produtos (MyDose) 🧊
- [ ] **[E13] Jornada heroica** — medalhas, rotina diária e sync 🧊 [[LEELA-E13-app-atleta]]
- [ ] **[Recortes] Pós-V1** — desafio anti-streak, mensalidade recorrente, campanhas avançadas 🧊




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[true,false,true,false]}
```
%%
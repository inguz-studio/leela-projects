---
tags: [leela, kanban, epicos, visao-alto-nivel]
aliases: [Board de épicos, Visão de épicos, Onde o produto está]
atualizado: 2026-07-19
---

# 🗺️ Visão de épicos — onde o produto está

> A altura mais alta de zoom: **uma linha por épico**, com o estado e o link para o detalhe. Para o board de histórias (o trabalho em andamento) veja [[V1-KANBAN]]; para a hierarquia dos nomes, [[MODELO-ROADMAP]]; para a convenção de card, [[CONVENCAO-BOARDS]].

**Estados:** ✅ feito · 🔄 em execução · 📋 planejado · 🧊 gelado (adiado de propósito)

## Onde estamos, em quatro linhas

O organizador já **opera** o evento inteiro (inscritos, kits, financeiro, clubes) e já **vende** ponta a ponta (o atleta descobre, se inscreve, paga; o organizador vê a receita, estorna com dignidade e pede o repasse). A Onda 3 fechou as **assessorias parceiras**, o **perfil público link-na-bio** e a robustez financeira. A onda em execução é a **4 · fechar o produto web** (o dinheiro que está em voo, depois afiliados, marcas, CRM e analytics). Só então vem o **app do atleta, agora como PWA**, e por último a **camada social e heroica**. Passo a passo por épico na rodada 2026-07-19-espec-sweep.

## Onda 0 · Fundação — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E00-fundacao-tecnica]] | Base técnica: monorepo, Firebase, login, CI | ✅ |
| [[LEELA-E01-design-system]] | Sistema visual temável (brasa/leela) e telas-base | ✅ +2026-07-19 (IA-MENU): o menu principal passa a ter **6 áreas** (RN-233) e toda rota antiga ganha redirecionamento garantido (RN-234). **✅ CONSTRUÍDO 2026-07-26** (IAM-T1 `41fcb73` · IAM-T6 `7a8f158`): catálogo do design system reconciliado de 8 para 6 itens — `financeiro` e `analytics` saíram da FONTE, não de um filtro no consumidor (RN-823), e `configuracoes` ganhou destino (`/conta`), então a RN-233 nasce sem exceção aberta. Os 4 redirects entregues com teste orientado a tabela: cada linha do mapa, os negativos (`/crm/clientes` e `/crm/comunicacao` não redirecionam) e guarda anti-laço de no máximo 1 salto — 44 testes verdes. **✅ +2026-07-27 (THUMBS-LISTAS · `2e48d28`): componente novo `Thumb`**, a miniatura de mídia de ENTIDADE que a RN-236 exige (kit e logo 1:1, capa 1.9:1) — largura por token e altura pela razão, `object-cover`, lazy em lista, e fallback que cobre tanto "sem imagem" quanto "URL quebrada". Não é variante do `Avatar` (aquele é pessoa, circular, iniciais por nome) e o thumb do `EventRow` fica onde está (fallback semântico de modalidade). Suíte do DS 1089/1089 |
| [[LEELA-E16-plataforma-superadmin]] · S1600 | Isolamento multi-tenant e permissões | ✅ |

## Onda 1 · Operar — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E03-operacao-evento]] | Operar o evento: inscritos, balcão, kits, financeiro | ✅ +TAMANHOS-GRADE: camiseta agora separa corte feminino/masculino e o organizador controla o ciclo encomenda→estoque→entrega por corte e tamanho (RN-231/232 — grade no item, comprador escolhe corte antes do tamanho, encerrar encomendas com a contagem do momento sem travar vendas, entregas acompanhadas no balcão); +R9-C: kit com imagem 1:1 e visão de compra (falta só a edição na tela de kits). **✅ +2026-07-26 (IA-MENU · RN-235, IAM-T7 `e5c77cb`): a aba "Resumo" do financeiro do evento virou "Caixa"** — mesma URL, mesma permissão (`area="financeiro"`), muda o rótulo, que é o que a pessoa lê; o teste da matriz de papéis passou sem uma edição. E a Caixa fechou a lacuna que a RN-349 tinha deste lado: mostra **o repasse daquele evento**, lido do registro que já existia (zero backend novo, mesma função pura da visão macro — os dois números se reconciliam por construção). Sem repasse, "—" honesto: o "repassado R$ 0,00" genérico morreu. **✅ +2026-07-27 (THUMBS-LISTAS · RN-236 nova, dona deste épico): a listagem de kits mostra a imagem do kit e a edição do evento mostra a miniatura da capa atual** — o organizador reconhece o item de vista, sem abrir kit por kit pra descobrir qual era. Fecha a última metade da RN-227 (`dbda6cd`), que sempre previu a exibição na `KitsCadastroView`. Na capa (`7434cd5`) o achado foi outro: a imagem **já aparecia**, o que faltava era ser miniatura — o bloco de largura cheia passava de 400px de altura e empurrava o resto do formulário fora da tela |
| [[LEELA-E05-clubs]] | Clubes: membros, desafios, parcerias, comunicados | ✅ +história 2026-07-19: **S112** construtor de formulário de perguntas no clube + resposta gravada no membro na inscrição (FORMBUILDER, 📋 executável) |
| [[LEELA-E02-visao-geral]] | Painel de abertura com os números do evento | ✅ |
| [[LEELA-E16-plataforma-superadmin]] · slim | Onboarding de tenant e termos comerciais | ✅ +história 2026-07-19: **S1606** config da taxa da plataforma no super-admin (tabela global por meio + override por organizador, TAXA-FLEX · 📋 executável) |

## Onda 2 · Vender — ✅ concluída

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E04-config-vendas]] · slim | Configurar lotes, preços automáticos, cupons, equipe | ✅ +histórias 2026-07-19: **S308** tabela de taxa por meio percentual+fixo (TAXA-FLEX, 📋 executável) · **S309** toggle "aceitar estrangeiros" por evento (🧊 GATED Asaas) · **S310** construtor de formulário de perguntas no evento (FORMBUILDER, 📋 executável — dono do modelo/core) |
| [[LEELA-E12-landing]] | Atleta descobre o evento e se inscreve em poucos cliques | ✅ +KIT-IMG (2026-07-19): imagem do kit visível na seção de kits da LP e no checkout, clicável p/ ampliar (lightbox do DS); cascata real→foto mock (preview)→placeholder padrão Leela; SEO-first, 55/55, prova visual :3200. +histórias 2026-07-19: **S1209** camada de tela do checkout novo (cupom no início, Pix/Cartão em botões, QR+timer, gênero, +atleta — 📋) · **S1210** exibição da taxa por meio (TAXA-FLEX, 📋) · **S1211** checkout de estrangeiro (🧊 GATED) · **S1212** render do formulário de perguntas na compra + resposta no inscrito (FORMBUILDER, 📋 executável) |
| [[LEELA-E09-financeiro-profissional]] · slim | Ver saldo, dados bancários e pedir repasse | ✅ +história 2026-07-19: **S905** cálculo/congelamento/estorno da taxa por meio percentual+fixo (TAXA-FLEX, 📋 executável). +2026-07-19 (IA-MENU): **o repasse passa a pertencer à origem** (RN-366) — a tela migra para Eventos › Repasses; dados bancários viram cadastro único em Configurações e o saque acontece na origem; RN-349/RN-358 seguem inalteradas (o delta é de navegação, não de domínio). **✅ CONSTRUÍDO 2026-07-26** (IAM-T4 `cee7bbe` · IAM-T5 `14f059e`): `/eventos/repasses` nasceu fora de `:slug`, com precedência declarada E testada (um evento de slug `repasses` não sequestra a subdivisão); os 11 arquivos de teste do repasse mudaram de pasta com **zero linha alterada**; dados bancários viraram cadastro único em `/conta` e o pré-requisito do saque, que era garantido por proximidade do formulário, virou checagem explícita — sem dado salvo o modal NÃO monta e a tela mostra o caminho |
| [[LEELA-E07-estados-sistema]] · web | Telas de erro com cara profissional (404/500/403) | ✅ |
| [[LEELA-E06-marketing]] | Falar com o público por campanhas e automações | ✅ |

## Onda 3 · Alavancas e robustez — ✅ concluída (o app saiu daqui e virou a Onda 5)

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E18-assessorias-parceiras]] | Organizador cadastra assessoria como clube parceiro com desconto | ✅ |
| [[LEELA-E17-perfil-social]] · link-na-bio | Perfil público compartilhável do organizador e do atleta | ✅ |

## Onda 4 · Fechar o produto web (H3 antecipado) — 🔄 em execução

Antecipada por decisão de 2026-07-18: fecha o produto web antes do app. **Item 1 da onda é o caminho do dinheiro em voo** (E04/E09/E12/E16 — camada de tela do checkout, fila de reembolso, construtor de formulário; mapa em 02-rodadas/2026-07-19-espec-sweep/02-caminho-do-dinheiro.md). Depois, na ordem: E08, E10, E19, E11.

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E08-influenciador]] | Influenciador tem link próprio e vê as próprias vendas | 🔄 recorte antecipado (R9-E) + **fase 2 comissão entregue** (COMF2) + **UI de comissão entregue** (CRM-COMISSAO-UI) + **hub do promotor entregue** (PROMOTOR: resumo consolidado cross-eventos + copiar código, por evolução de Minhas afiliações — reuso-primeiro, sem rota nova); falta o repasse PARCIAL (hoje quita só o saldo inteiro) e o aviso ao afiliado; o split automático NÃO abre (item 23 ratificado — repasse manual é o desembolso); copiar URL completa ENTREGUE (TAMANHOS-GRADE T-extra: reader projeta eventoSlug e o botão copia o link pronto) |
| [[LEELA-E10-marcas]] | Gerenciar patrocinadores e marcas num lugar só | 🔄 registro reutilizável + logo 1:1 + autocomplete (R9-E) + tela dedicada `/marcas` no painel entregue (MARCAS-TELA: lista/criar/editar/excluir, rota própria na sidebar); **✅ +2026-07-27 (THUMBS-LISTAS · RN-236, `430e72c`): o logo da lista virou o `Thumb` do DS** — ganhou o `loading="lazy"` que faltava, medida por token no lugar de `h-10 w-10` cru e, o que mais importa, URL de Storage revogada agora cai na sigla em vez de deixar o quadrado quebrado do navegador na tabela; falta a consolidação de ativações (S812) |
| [[LEELA-E11-analytics]] | Análise de vendas e público unificada | 🔄 recorte antecipado entregue (R9-B: Análise vira a porta única — Analytics divergente removido —, filtro por evento com Combobox do DS recorta os 4 blocos, RN-821/RN-820 com nota de cobertura honesta). **RN-822 ENTREGUE (E11-COHORT-BACKEND, 2026-07-19 · `aa0afac`/`fcfeda4`/`ba2f53c`):** vertical coordenada core→functions→api-client→painel — 10 bandas de 5 anos + matriz idade×sexo no agregado + card "Idade × sexo (cohort)" na Análise, com salvaguarda LGPD de k-anonimato (k=5, reader-side pós-soma, `cohortPrivacidade.ts`) e reprocesso idempotente (`reprocessarDemografiaTodosEventos` — deploy da Function e reprocesso andam JUNTOS). Restante segue backend-gated: S821-T1 rollup `analytics/{periodo}` (não existe, só `coletaDiaria`) bloqueia S821-T2/S822/S823 + seletor temporal funcional. **+2026-07-19 (IA-MENU): a Análise muda de casa** — vira **CRM › Visão geral** (RN-823, supersede parte da RN-821); o território das tarefas de tela passa a ser `routes/crm/visao-geral` e o move é pré-requisito delas. **✅ MOVE FEITO 2026-07-26** (IAM-T2 `c1f6f03`): a tela inteira migrou para `routes/crm/visao-geral/**` e o pré-requisito de S821-T2/S822-T2/S823-T1 está pago — podem ser despachadas. Os 6 arquivos de teste saíram com **zero linha alterada** (supressão k=5, linha companheira, nota de cobertura e exclusão do `aguardandoReprocesso` chegaram intactos). A sessão passou a vir do `useCrmSession` que já existia — nenhuma cópia nova. Detalhe no épico §"RN-822 ENTREGUE" e §"IA-MENU" |
| [[LEELA-E19-crm]] | Conhecer e reter a base de contatos do organizador | 🔄 backend entregue + **A3 pago** (chave HMAC com pepper) + **hub "Clientes & Comunicação" (UI) entregue** (CRM-COMISSAO-UI: item da sidebar ativo, lista cross-evento com LTV/valor/eventos, busca por prefixo, detalhe com histórico + aniversário + idade ao vivo); falta o disparo de comunicação a segmentos (S-R9-13-T4) + secret no deploy. +histórias 2026-07-19: **S1902** posse de identidade por CPF (CLAIM-FIX · RN-174 · ✅ ENTREGUE) · **S1903** documento tipado cpf/passaporte "documento único" (RN-177 · 🧊 GATED). **+2026-07-19 (IA-MENU): o hub vira a área CRM do menu**, com três subdivisões (Visão geral, herdando a análise do E11 · Clientes · Comunicação); a fronteira de PII entre agregado (k=5) e identidade individual (RN-172) fica explícita como gatilho de bloqueio. **✅ CONSTRUÍDO 2026-07-26** (IAM-T3 `7b78538`): as 3 subdivisões navegam, `/crm/clientes` abre a lista sem laço de redirecionamento (as rotas nomeadas precedem o parâmetro — testado sobre a árvore real), e `/crm/comunicacao` entrega estado honesto até a chave do Brevo destravar o S1901-T4c. ⚠️ **A fronteira de PII é o único dos 8 riscos da rodada SEM prova executável** — nada hoje impede um filtro demográfico na lista de clientes; segue como gatilho do gate antagonista de PII deste épico |

## Onda 5 · App do atleta como PWA — 📋 aguarda decisão de arquitetura

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E13-app-atleta]] · slim | Descobrir, inscrever, ingresso com QR, clube | 📋 re-especificado como PWA (de 9 histórias sobraram 6); o bloqueio das lojas morreu e o ingresso passa a funcionar sem rede. Aguarda a ratificação da ADR-proposta |

## Onda 6 · Comunidade e social no app (H2) — 🧊

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E17-perfil-social]] · in-app | Feed, eventos e clubs no app, com tema por conta | 🧊 Onda 6 — 4 histórias-âncora; o feed do perfil e o do clube compartilham modelo e devem sair no mesmo lote |
| [[LEELA-E13-app-atleta]] · heroica | Jornada heroica: rotina diária com propósito | 🧊 Onda 6 |
| [[LEELA-E14-integracoes-treino]] | Importar treino e corrida do Strava e afins | 🧊 Onda 6 — esqueleto escrito; com PWA a camada do aparelho (Health) some e o Strava vira a primeira camada viável |
| [[LEELA-E06-marketing]] · avançado | Segmentação além do evento e novos gatilhos | 🧊 Onda 6 — sem lacuna de V1; a primeira parcela do avançado chega pelo E19 |

## Onda 7 · Creator Studio — 🧊

| Épico | O que entrega | Estado |
|---|---|---|
| [[LEELA-E15-creator-studio]] | Criador monta conteúdo e produtos (MyDose) | 🧊 esqueleto escrito (objetivo, fronteiras, dependências, 4 perguntas de escopo); último por decisão explícita |

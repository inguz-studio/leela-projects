---
tags: [leela, board, migracao, pendencias, bring-up, obsidian]
aliases: [Migração de máquina, Bring-up, O que está pendente]
atualizado: 2026-08-18
---

# Migração de máquina — tudo que está pendente, e como subir o projeto no computador novo

Este é o doc para abrir primeiro no computador novo. Ele reúne, num lugar só, o que
ainda depende do dono, o que está na fila de construção, o que espera o olho dele
num navegador, e o passo a passo para o projeto rodar de novo do zero.

Nada aqui substitui a casa canônica de cada coisa. As decisões continuam vivendo em
[[DECISOES-ABERTAS]], a fila em [[FILA-DE-CONSTRUCAO]] e os cards em [[V1-KANBAN]].
Este doc é índice e mapa de travessia, não segunda fonte.

Escrito pela lane `MIGRACAO-OBSIDIAN` da leva 26 (18/08). O registro da fala que o
pediu está em `02-rodadas/2026-08-18-migracao-de-maquina/01-decisoes-dono.md`.

---

## Decisões pendentes do dono — 11 itens

Espelho compacto de [[DECISOES-ABERTAS]] (`leela-specs/01-produto/DECISOES-ABERTAS.md`).
O texto completo de cada item, com caso de uso, job story, opções e default, mora lá.
Aqui fica só o suficiente para reconhecer o item numa lista.

**Nove decisões que dependem dele:**

| Item | A pergunta, em uma linha | Default proposto |
|---|---|---|
| **12 · domínio público** | Qual é o endereço definitivo da Leela | sem default — a escolha é dele |
| **CAIXA-1** | O que a tabela de inscrições da Caixa deve contar, ou se ela some | remover a tabela |
| **POPOVER-COR-1** | Se o painel flutuante deve parear de cor com a superfície elevada | parear, com AA medido nos três temas |
| **NAV-MOBILE-1** | Quais quatro áreas ficam na barra mobile, e onde mora a quinta | Parcerias como bloco na Visão geral |
| **EVT-CARGA** | Os três cortes na dobra do evento, e se a pill de inscritos fica na sub-nav | cortar os três; a pill sem default |
| **FILTRO-ALTURA-1** | Qual altura vira a altura da faceta de filtro, 40px ou 32px | subir a múltipla para 40px |
| **VG-INSIGHTS-1** | Se o Engajamento mantém bloco de insights próprio | os dois ficam, com a divisão escrita como regra |
| **VG-INSIGHTS-2** | Onde mora o aviso de pendência de pagamento na Visão geral | insight, com caminho |
| **VG-INSIGHTS-3** | Quais das seis leituras novas entram na Visão geral, e em que ordem | sem default — cada uma cobra um preço diferente |

**Duas ações que só ele pode executar:**

| Item | O que é |
|---|---|
| **69** | O passeio de conferência visual das telas novas, tela a tela, em produção |
| **JUROS-1** | Abrir os termos comerciais do Castelo no painel e salvar sem mudar nada, para selar o rastro da v2 |

Dois deles ficaram mais baratos com o trabalho de 17-18/08 e esperam só o deploy:
**CAIXA-1** (a agregação por forma de pagamento foi construída na S825) e
**VG-INSIGHTS-3** (o dado de pendências em R$ já existe em `financeiro/current.pendentes`).

---

## Fila de construção — 22 frentes

O conteúdo íntegro está em [[FILA-DE-CONSTRUCAO]]
(`leela-specs/01-produto/FILA-DE-CONSTRUCAO.md`) e nos cards de [[V1-KANBAN]].
Nada nesta seção é decisão dele: é trabalho ordenado.

### As 12 frentes do doc canônico

Ordem ratificada em 28/07 (DEC-0728), roda em sequência sem nova consulta.

1. **Posição 1 · E10, ativações de marcas** — S812, cinco tarefas. Bloqueio achado: nenhum vínculo guarda o id da marca, só o nome.
2. **Posição 2 · FORMBUILDER** — formulários como template, S313 e S310.
3. **Posição 3 · E11, análise em CRM › Visão geral** — seis tarefas; a consolidação da série é o gargalo do épico.
4. **Posição 4 · E16, catálogo de benefícios da plataforma** — prioridade baixa declarada, não bloqueia nada.
5. **Uma conta só para quem é admin e organizador** — no gelo por decisão dele, não por falta de desenho.
6. **Antecipação de recebíveis sob demanda** — "cena para os próximos capítulos", fica escrito para a tabela de juros nascer pensando nela.
7. ⚠️ **Dois eventos publicados estão inacessíveis em produção agora** — `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026`. A vitrine olha só para os lotes e o motor cotaria a compra. **Prioridade alta na fila.**
8. **A conta que nasce sem registro fica trancada do lado de fora** — falha de rede no segundo passo do cadastro e a pessoa nunca mais entra. Hoje a única recuperação é intervenção manual no super-admin.
9. **A borda que segura força bruta não está ligada** — *pendência do CTO humano*. App Check e Cloud Armor desligados; o custo é faturado por invocação.
10. **O gancho de incidente existe e do outro lado não há ninguém** — *pendência do CTO humano*. Zero políticas de alerta, zero métricas de log, zero canais. E não há DSN de Sentry em lugar nenhum: o SDK está instalado nas duas telas e é no-op silencioso sem DSN.
11. **O retrato contínuo do banco está desligado (PITR)** — *pendência do CTO humano*. Sem ele não existe voltar o banco para o minuto anterior ao erro, só até o último export tirado à mão.
12. **App v1 como PWA** — depois da fila, no horizonte 3.

### As 10 frentes que nasceram entre 13 e 18/08

Nenhuma está no doc canônico ainda, e é por isso que estão nomeadas aqui.

1. **S316-T5 · reparo do evento degradado** — `eventoDegradado` devolve `modalidades: []` incondicionalmente, e a degradação só existe na listagem: o `getEvento` pontual segue fail-fast, então **a porta de conserto está atrás da porta quebrada**. A metade que valia risco (edição nunca escrever a partir da projeção degradada) já está na `main`. RN-505 em [[LEELA-E04-config-vendas]]; fila C5 em `02-rodadas/2026-08-17-leva22/04-fila-em-ondas.md`; handoff `.nirvana/handoffs/leela-modalidade-build-20260817.md`.

2. ⛔ **A fenda entre as Rules e o parse dos inscritos — RISCO DE PRODUÇÃO** — `allow create` de cliente em `eventos/{id}/inscritos` não exige `atletaNome` nem `atletaId`, e `parseInscrito` recusa os dois vazios. **A escrita é mais larga que a leitura**: um organizador cria pela porta sancionada o doc que apaga a lista dele. A lane INSCRITOS-READ-FIX consertou o lado da leitura (a lista sobrevive ao doc); fechar pelo lado da escrita mexe em escrita de produção e é decisão dele. Handoff `.nirvana/handoffs/leela-inscritos-read-fix-20260817.md` §3 e §7; teste que pina os dois lados em `functions/src/__tests__/inscritosRules.test.ts`.
   > ⚠️ **O probe de varredura não existe na árvore.** O handoff cita `scratchpad/probe-parse.mjs`, e essa pasta não está no repo. Quem for varrer produção atrás de docs que o parse recusa vai precisar reescrever o probe (REST + `parseInscrito`, ~40 linhas, apontado a um export).

3. **Desnormalização para o operador de credenciamento** — o operador com papel só de evento lê inscrito e kit, mas não lê `pedidos` nem `pagamentos`, então perde lote, e-mail e telefone de compra. A opção recomendada desnormaliza `loteNome`, `compradorEmail` e `compradorTelefone` no doc do inscrito, escrito pela Function do checkout: nenhuma Rule muda e o dinheiro continua fechado. Custo: três campos mais backfill. `.nirvana/handoffs/leela-cred-busca-20260817.md` §"Achado 1".
   > ⚠️ **Este item não tem card no kanban.** Vive só no handoff, e o S052 não o menciona.

4. **Quatro modais com footer duplicado** — mesmo desvio que o `LoteModal` tinha, um container de botões próprio duplicando o que o `Modal` do design system já aplica: `eventos/lotes/CapacidadeModal.tsx:118`, `eventos/kits/ItemKitModal.tsx:200`, `eventos/kits/DistribuicaoView.tsx:792`, `eventos/pagina-vendas/_components/CupomModal.tsx:143`. Ficaram fora porque a leva 21 nomeou só o modal de lote. Sem card próprio.

5. **Movimentos 1 e 3 da carga cognitiva** — os dois pagam o celular na Visão geral do evento e os dois esperam o vetável **EVT-CARGA** do painel. O M1 tira "120 inscritos" e a contagem regressiva do header (`EventoShell.tsx:174-186`) e sozinho leva a dobra de y=870 para ~822, ainda abaixo dos 810. O M3 tira a porcentagem repetida do `CountdownHero` (`:104` e `:132-134`), e somado ao M1 sobe o primeiro número não duplicado para ~y=700, acima da dobra. O M4 (`ModalidadesPanels`) mata de graça uma fonte dupla de receita. Spec em `02-rodadas/2026-08-17-carga-cognitiva/03-spec-reordenacao.md`.

6. **Ondas A, B, C e D dos kits (leva 22)** — `02-rodadas/2026-08-17-leva22/04-fila-em-ondas.md`.
   - **A · arrumação das telas de kits (S048)** — 10 tarefas, a borda decorativa sai do `Card` canônico e 43 instâncias herdam. **Não construída, dispara já**, sem decisão pendente.
   - **B · menu terciário vira padrão (S049)** — 7 tarefas, **cria o `TabsPanel` no design system**. Não construída.
   - **C · Modalidades no lugar de Lotes (S316)** — ✅ **construída na noite de 17/08**, 6 das 7 tarefas. Na `main`, sem deploy, gate visual pendente nas duas telas. Falta a S316-T5 acima.
   - **D · dinheiro do kit e composição (S050)** — 8 tarefas, duas pesadas (carimbo do preço no pedido, travas de escrita). Não construída; a D8 depende de **CAIXA-1**.
   > ⚠️ **A e D cruzam com a onda R1-c da carga cognitiva** (mesma Caixa, mesmos kits). Quem despachar confere a outra fila antes, ou as duas se sobrescrevem. A e B em paralelo com C exigem **worktree por lane**.
   > ⚠️ **Colisão de IDs no kanban:** S047 e S049 aparecem duas vezes, uma pela leva 22 e outra pela carga cognitiva.

7. **R1 a R5 da campanha retroativa de carga cognitiva** — 64 itens medidos, `02-rodadas/2026-08-17-carga-cognitiva/04-fila-em-ondas.md`.
   - **R0** · o critério e o gate — ✅ feita (RN-573).
   - **R1** · área interna do evento, 44 repetições duras, quatro frentes — **aguarda EVT-CARGA 1 a 4**.
   - **R2** · engajamento e a fronteira com a Visão geral, 2 duras — ✅ paga pela lane ENG-INSIGHTS.
   - **R3** · clubes, 11 duras — aguarda a R1 e a resposta de EVT-CARGA-2.
   - **R4** · visão geral do painel, 2 duras — **livre**, corre em paralelo com a R1.
   - **R5** · plataforma e superadmin, 2 duras — **livre**, e são as mais perigosas da amostra: TPV contra Vendido bruto, um lendo retrato e o outro soma viva, fontes diferentes para o mesmo fato.

8. **Radar de comunidade — S2001 e S2002** — [[LEELA-E20-radar-comunidade]]. A **S2001** prova que o chip dedicado sobrevive 14 dias mudo numa comunidade real (laudo ao fim; número banido derruba o épico). A **S2002** é a ponte de dados: núcleo de validação, Function `radarIngestao` com IAM e livro-razão, métricas por dia no fuso local, Rules fechadas, 7 tarefas. **A S2002 inteira depende do laudo da S2001 aprovado.** Fora da engenharia, esperam hospedagem/custo do F2 (sócio) e parecer do advogado.

9. **O gate `leela-redundancia` não existe** — especificado em `04-engenharia/governanca-design.md §9` no molde do `leela-canon` (baseline por área, nasce em `warn`, vira `error` quando a área zera). `scripts/` tem `gate-canon.mjs`, `gate-visual-filtros.mjs` e `gate-visual-subnav.mjs`, e o `package.json` expõe só `gate:canon`. **Enquanto ele não existir, o item 3 do "como cada onda prova que pagou" não é executável** e o critério vale pela revisão humana com a seção na mão.

10. **Flake em `inscritosRules.beforeAll`** — falhou em 2 de 5 execuções, sempre no `beforeAll` do bloco de paginação por cursor (`functions/src/__tests__/inscritosRules.test.ts:134`), com `seedVerified: canários ausentes após 4 tentativas`. Causa conhecida: o seed de 453 inscritos enfileira ~2700 execuções de `onInscritoWrite*` e o backlog transborda. É pré-existente, não veio da lane — mas **é o arquivo que pina o risco de produção do item 2**, então o flake enfraquece a única prova executável da fenda. Helper a mexer: `functions/src/__tests__/helpers/stability.ts:221-259`.

---

## Gates visuais pendentes do dono

Nenhum deles tem gate de código que substitua o olho humano em navegador real (L-011).
Seis frentes esperam, e a primeira depende do deploy que a `DEPLOY-J4` está subindo.

1. ⛔ **A rosca das formas de pagamento, em três telas** — construída na S825 (17-18/08) e **nunca vista renderizada**. A lane que a construiu não conseguiu subir o emulador: a máquina tinha JDK 17 e o firebase-tools 15 recusa Java abaixo de 21. Depende de **deploy + reprocesso da série**, e é o primeiro item do passeio depois que a `DEPLOY-J4` fechar. Card em [[V1-KANBAN]], linha do S825-T2.

2. **O modal do lote e os dois vizinhos, em interação** — a leva 21 pediu fundo mais opaco, fade centralizado, botões canônicos e nada de scrollbar cortando o rodapé. Três telas, dois temas (brasa e wine, mais dark-wine quando aplicável), desktop e 375: `LoteModal` (evento → lotes → editar), `CapacidadeModal` (mesma rota, herdou moldura sem tocar o footer) e `InscritoSlideIn` (eventos → inscritos, confirmar que a opacidade nova não pesa no off-canvas). `.nirvana/handoffs/leela-modal-lote-20260817.md` §"Gate visual".

3. **As sete telas de Eventos com ação em ícone, mais o drawer deslizando** — lane UI-ACOES-MOTION. ❌ **O GIF do drawer não foi capturado**: a captura por CDP estourou timeout na sobreposição com `backdrop-blur` durante a animação de 800ms e o renderer travou. O que existe no lugar é compile do Tailwind, teste que prende a saída animada no tempo exato e suíte verde — **nada disso é ver o drawer deslizar**. ⚠️ Nenhuma das sete telas convertidas foi vista renderizada. `.nirvana/handoffs/leela-ui-acoes-motion-20260817.md` §"Gate visual".

4. **As sete telas dos Insights na Visão geral** — S049-T8: grade e ordem, o bloco com três insights, o painel de alertas **sem** a pendência, bloco vazio, carregamento e a cascata renumerada. `.nirvana/handoffs/leela-vg-insights-20260817.md`.

5. **As telas de clubs convertidas** — antes/depois de Membros, Desafios e Comunicados, em desktop, 768 e 375, nos dois temas. As fotos do "antes" e as medições estão em `.nirvana/gate-visual/`.

6. **O passeio autenticado geral (item 69 do painel)** — sete coisas entraram no ar entre 02 e 03/08 e nenhuma foi olhada. A rota completa, tela a tela, está no item 69 de [[DECISOES-ABERTAS]]: a página do produtor em `leela-landing.web.app/@castelo`, o checkout de `meia-floripa-2026/inscricao`, as sete conferências de `/eventos/{slug}/lotes` e os oito e-mails por arquivo.

---

## ⛔ Buraco de registro — a fala da leva 21 não existe na íntegra

O trabalho da leva 21 está construído e provado. O **registro da fala** é que nunca aconteceu.

Os cinco itens (botões do `LoteModal`, glass da superfície, opacidade do overlay,
animação de fade, scrollbar) estão em `.nirvana/handoffs/leela-modal-lote-20260817.md`,
com causa raiz medida e alcance declarado. O que não existe é o que ele escreveu.
O handoff descreve os cinco em terceira pessoa e não transcreve uma linha dele.

Escrever aqui uma citação reconstruída seria inventar decisão, e é exatamente o vício
que a §"Registro de falha de captura" da rodada de 17/08 condena. Por isso fica o
buraco nomeado, e não um texto plausível.

**Se ele quiser o registro fiel, basta repetir a fala.** A primeira lane que a tiver em
mãos abre `# Leva 21` em `02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md`, com
a citação e os cinco itens desdobrados, e corrige o ponteiro do card da MODAL-LOTE no
kanban.

A lição é de processo: "o registro está na outra lane" só vale quando a outra lane
recebeu a leva por escrito no brief. Ponteiro para registro que ninguém foi encarregado
de escrever é registro nenhum, e some sem barulho porque os dois lados acham que o
outro fez.

---

## Bring-up do computador novo

Passo a passo do zero até ver o painel rodando. Cada bloco é independente do anterior
só na leitura; na execução, a ordem importa.

### 1 · Clonar o repositório

```bash
git clone https://github.com/inguz-studio/leela-projects.git C:/dev/LEELA
cd C:/dev/LEELA
git log --oneline -1
```

O caminho `C:/dev/LEELA` não é obrigatório, mas é o que todo script, handoff e junção
do Obsidian assume. Clonar em outro lugar custa reescrever os caminhos das junções e
o `cd` do `PREVIEW.md`. Recomendação: manter `C:\dev\LEELA`.

> ⚠️ O `PREVIEW.md` que está no repo ainda manda `cd "/c/Users/Vitor Eduardo/Desktop/Vaults/Projetos/LEELA"`,
> que é o caminho de duas mudanças atrás. Ignorar essa linha; a raiz de verdade é a do clone.

### 2 · Node e pnpm

Os `engines` do `package.json` da raiz pedem **Node >= 20** e **pnpm >= 9**, e o
`packageManager` pina **pnpm@11.9.0**. A máquina antiga rodava **Node v24.13.1** com
**pnpm 11.9.0**, e é esse o par a reproduzir.

```bash
node -v      # v24.x
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm -v      # 11.9.0
```

### 3 · JDK 21 — instalar direto, e resolver a limitação de uma vez

O Firestore Emulator roda em Java, e o **firebase-tools 15 recusa qualquer Java abaixo
de 21** ("no longer supports Java version before 21"). Esta é a limitação que travou o
gate visual da rosca das formas de pagamento: a máquina da lane tinha JDK 17, o emulador
não subiu, e a tela nunca foi vista.

**Instalar o JDK 21 direto no computador novo**, e não repetir o arranjo antigo de um JDK
solto em `~/.jdks`. Depois disso, os dois scripts que sobem emulador continuam funcionando
sem edição, porque os dois leem um override próprio:

```bash
# scripts/mock-campeche.sh:48
export JAVA_HOME="${LEELA_JAVA_HOME:-$HOME/.jdks/jdk-21.0.11+10}"
```

`LEELA_JAVA_HOME` tem nome próprio de propósito: o `JAVA_HOME` global da máquina antiga
apontava para um JDK 17, e respeitar o valor herdado derrubava o emulador no boot. A
variável de nome próprio existe para que o `JAVA_HOME` global nunca sequestre o emulador
por acidente. O `mock-campeche.sh` valida o que encontrar em três passos (diretório existe,
`java -version` legível, major >= 21) e morre com mensagem clara se algum falhar.

⚠️ **Os dois scripts não se comportam igual, e isso decide o caminho de instalação.**

| Script | Como resolve o Java |
|---|---|
| `scripts/mock-campeche.sh:48` | `${LEELA_JAVA_HOME:-$HOME/.jdks/jdk-21.0.11+10}` — **aceita o override** |
| `preview.sh:26` | `$HOME/.jdks/jdk-21.0.11+10` **fixo, sem override**; a linha 126 aborta com "Java 21 não encontrado" se a pasta não existir |

Duas saídas, e a primeira é a de menos atrito:

1. **Instalar o Temurin JDK 21 em `~/.jdks/jdk-21.0.11+10`** — os dois scripts passam a
   funcionar sem tocar em nada, e o `LEELA_JAVA_HOME` fica de reserva.
2. **Instalar no caminho padrão do sistema** e exportar o override no perfil do Git Bash.
   Isso resolve o `mock-campeche.sh` (a `:4602`, que é a superfície de conferência do dono)
   e deixa o `preview.sh` quebrado até alguém editar a linha 26.

```bash
# ~/.bashrc — só necessário na saída 2
export LEELA_JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21"   # ajustar ao caminho real
java -version   # tem de dizer 21
```

> Comentários em `functions/src/seed/tenants.seed.ts` e em alguns testes ainda citam
> `jdk-17.0.19.10-hotspot`. São legado e estão errados: o pino real é o 21.

> ⚠️ Uma armadilha já paga, para não voltar: **não exportar `JAVA_TOOL_OPTIONS` globalmente**.
> A JVM anuncia a variável imprimindo `Picked up JAVA_TOOL_OPTIONS: ...` na saída de todo
> processo Java, inclusive o *rules runtime*, cujo handshake o firebase-tools lê por essa
> mesma saída. O resultado é o rules runtime morto e **toda leitura de cliente negada**, sem
> erro visível na tela. O `preview.sh` exporta a variável e convive com isso; o
> `mock-campeche.sh` a deixa de fora de propósito.

### 4 · Instalar as dependências

```bash
cd C:/dev/LEELA
pnpm install
```

O `pnpm-workspace.yaml` pina `react` e `react-dom` em `18.3.1` por override: a stack é
React 18 (ADR-010), e o recharts puxaria react-dom 19, que quebra o render com telas
vazias. Não desfazer o override.

### 5 · Ordem de build

Os pacotes internos se resolvem pelo `dist/` de cada um, e um `dist/` velho quebra a
montagem do app no navegador com **tela em branco e nenhuma mensagem de erro**. A ordem
é de dependência, não de gosto:

```
@leela/core  →  @leela/api-client  →  @leela/design-system  →  @leela/painel
```

O Turbo já sabe o grafo, então na prática:

```bash
# constrói core, api-client e design-system na ordem certa, mais as Functions
pnpm turbo run build --filter='@leela/painel^...' --filter='@leela/functions'

# depois o painel, no modo de produção
cd apps/painel
npx vite build --mode leela-hub
```

O `--mode leela-hub` é o que casa o build com o `.env.leela-hub` da raiz (o
`vite.config.ts` do painel fixa `envDir` na raiz do monorepo, não no diretório do app).

### 6 · Arquivos fora do git — inventário por nome

⛔ **Esta seção lista NOMES e CAMINHOS. Nenhum valor de segredo aparece aqui, e nenhum
valor de segredo pode viajar pelo git.** O que estiver marcado como *pelo dono* migra por
canal seguro, à mão, do computador antigo para o novo — gerenciador de senhas, cofre, ou
recriação direta no console do provedor.

#### Os quatro arquivos que só o dono consegue trazer

Nenhum deles está no git, e nenhum deles pode entrar. São os únicos itens do inventário
que guardam valor secreto.

| Arquivo | O que guarda, por nome de chave |
|---|---|
| `functions/.env.local` | `LEELA_CLOCK`, `ASAAS_PROD_API_KEY`, `ASAAS_SANDBOX_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `CRM_ID_PEPPER`, `BREVO_API_KEY`, `ASAAS_API_KEY` |
| `functions/.secret.local` | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `CRM_ID_PEPPER`, `BREVO_API_KEY` — são os valores locais dos secrets que o Functions Emulator declara |
| `functions/.env` | `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `QR_TOKEN_KID_ATIVO`, `LEELA_PUBLIC_URL` |
| `.env` (raiz) | `NIRVANA_SCOPE` — uma linha só |

Em produção esses valores não vivem em disco: eles moram no **Secret Manager do GCP**, e o
`functions/scripts/bundle-deploy.mjs` diz explicitamente que nada é copiado no bundle. Os
arquivos acima são a cópia local para o emulador e para os scripts de manutenção.

#### O que já está versionado, e por isso vem sozinho no clone

`.env.example`, `functions/.env.example`, `.env.leela-hub`, `functions/.env.leela-hub`,
`apps/landing/.env.leela-hub` e `.env.mock-emulador`. As exceções no `.gitignore` são
cirúrgicas e cada uma tem a razão escrita ao lado: config web pública do Firebase (que vai
para qualquer navegador de qualquer jeito), flag de ativação do Asaas sem segredo, e o modo
de build apontado ao emulador.

#### Quais variáveis cada superfície espera

Nomes apenas. O `.env.example` da raiz é a referência completa.

- **`apps/painel`** — o `vite.config.ts` fixa `envDir` na **raiz do monorepo**, então ele lê
  `.env` e `.env.local` da raiz, mais `.env.leela-hub` ou `.env.mock-emulador` conforme o
  `--mode`. Espera `VITE_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET,
  MESSAGING_SENDER_ID, APP_ID), `VITE_USE_EMULATOR`, `VITE_EMULATOR_*` (HOST e as quatro
  portas), `VITE_PREVIEW_AUTOLOGIN`, `VITE_LEELA_URL` e `VITE_SENTRY_*`. O build ainda lê
  `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`.
- **`apps/landing`** — lê env do próprio diretório, porque o Next não lê da raiz. Espera
  `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_LEELA_URL`, `NEXT_PUBLIC_PAINEL_URL`,
  `NEXT_PUBLIC_USE_EMULATOR` e `NEXT_PUBLIC_SENTRY_*`.
- **`functions`** — `QR_TOKEN_KEYS`, `QR_TOKEN_KEYS_ANTIGO`, `QR_TOKEN_KID_ATIVO`,
  `FIRESTORE_EMULATOR_HOST`, `LEELA_CLOCK`, `ASAAS_PERMITIR_PRODUCAO`. Os scripts de
  manutenção pedem ainda `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT`,
  `LEELA_PUBLIC_URL`.
- **`apps/mobile`** — `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`.

> Nota, e não é achado de segurança: o `.env.example` da raiz também documenta o bloco do
> Nirvana e chaves de terceiros (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ELEVENLABS_API_KEY`,
> `FAL_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`). Nenhuma delas tem arquivo correspondente no disco
> hoje além do `.env` de uma linha, então não há o que migrar ali.

#### Service account — não existe, e é melhor assim

Não há **nenhum** arquivo `*service-account*.json`, `*-key.json`, `.pem`, `.p12` ou `.jks`
no repositório ou fora dele. O projeto autentica por credencial padrão derivada do login do
`firebase-tools`, e dois scripts (`limpeza-prod-leela-hub.ts`, `prontidao-de-deploy.mjs`)
leem o refresh token direto de `~/.config/configstore/firebase-tools.json`.

A conta de serviço que existe está nos **secrets do GitHub** para o CI
(`FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, `TURBO_TEAM`, `TURBO_TOKEN`), configurada
no GitHub e não em disco. Ela não migra porque não está na máquina.

#### Logins a refazer, não a copiar

```bash
firebase login          # com a conta que tem acesso a leela-hub
firebase projects:list  # tem de listar leela-hub
```

**Refazer o login, nunca copiar `~/.config/configstore/firebase-tools.json`.** Os projetos
estão em `.firebaserc`, que vem no clone: `default` é `demo-leela` (emulador) e `prod` é
`leela-hub` (produção). O deploy usa `--project prod` com `firebase.prod.json`.

Além do Firebase, instalar na máquina nova: `firebase-tools` global
(`npm i -g firebase-tools`) e os navegadores do Playwright (`pnpm exec playwright install`).
O `SENTRY_AUTH_TOKEN` é opcional — sem ele o upload de sourcemap desliga e o build segue.

#### Pastas que precisam viajar à mão

| Pasta | Tamanho | Por que não dá para recriar |
|---|---|---|
| `outputs/` | 47 MB | É o alvo da junção `LEELA-reports` do Obsidian. 480 arquivos, 167 markdown e 267 imagens: os relatórios das rodadas. Ignorado por `.gitignore:10`, de propósito |
| `.emulator-data/` | 1,2 MB | Snapshot já seedado do Emulator Suite (auth, firestore e storage). Sem ele o emulador sobe vazio |
| `.nirvana/gate-visual/filtros-lista/` e `.nirvana/shots/kits-build/` | 16 MB | 94 imagens de prova visual antes/depois. Ficaram fora do git de propósito nesta lane |
| `.nirvana/squads/`, `.nirvana/businesses/`, `.nirvana/mind-clones/` | — | São **junções** para o pool global do Nirvana em `C:\Users\<usuario>\squads` e `...\businesses`. Recriar as junções na máquina nova e trazer o pool junto |

E três que ficam a critério dele: `firebase-export-1786598069731S1KM0t/` (496 KB, export de
emulador solto na raiz, provável duplicata do `.emulator-data`), `be-hero-documentacao/`
(documentação de outro projeto que mora aqui por acidente) e `HANDOFF.json` (estado de
loop-guard de uma sessão antiga, sem valor portátil).

#### O que não precisa atravessar — cerca de 4,5 GB

`node_modules/` (1,3 GB), `.firebase/` (1,9 GB, cache e codegen do firebase-tools),
`apps/landing/.next/` (1,2 GB), `.turbo/` (94 MB), `functions-deploy/` (75 MB),
`functions/lib/`, todos os `dist/` e `dist-mock-campeche/`, `apps/mobile/.expo/`,
`.mock-campeche/` e os logs de debug da raiz (`firebase-debug.log` sozinho tem 81 MB).
Tudo isso volta com `pnpm install` mais o build do passo 5.



### 7 · Recriar as junções do Obsidian

O Obsidian não guarda nada por conta própria. Ele lê o repo por duas junções de sistema
de arquivos que vivem dentro do vault, e que **não viajam com o clone** — são atalhos de
disco, não conteúdo.

Na máquina antiga elas apontavam assim:

| Junção no vault | Alvo |
|---|---|
| `LEELA-specs` | `C:\dev\LEELA\leela-specs` |
| `LEELA-reports` | `C:\dev\LEELA\outputs\leela-build-2d6ee98d` |

Para recriar, no **Prompt de Comando** (não no Git Bash) do computador novo, ajustando o
caminho do vault:

```cmd
cd /d "C:\Users\<usuario>\Desktop\Vaults\Antigravity\Projetos_Aprendizado"
mklink /J "LEELA-specs"   "C:\dev\LEELA\leela-specs"
mklink /J "LEELA-reports" "C:\dev\LEELA\outputs\leela-build-2d6ee98d"
```

Conferir depois com `dir /AL`, que lista as junções e o alvo de cada uma.

> ⛔ **A `LEELA-reports` aponta para uma pasta que não está no git.** `outputs/` é ignorado
> por `.gitignore:10`, e ali moram 480 arquivos e 47 MB (167 markdown e 267 imagens). Num
> clone limpo essa junção nasce apontando para o vazio. **A pasta `outputs/` migra à mão**,
> junto do inventário do passo 6.

### 8 · Subir os servidores

Duas superfícies, dois comandos, portas que não colidem.

**`:4601` — o build de produção do painel, servido estático.** É a porta que o dono usa
para conferir o bundle sem depender de rede:

```bash
cd C:/dev/LEELA/apps/painel
npx vite preview --port 4601 --strictPort
```

> ⚠️ **Lição paga em 16/08:** a `:4601` já serviu um bundle quatro dias mais velho que o de
> produção, e quem validou por ela validou o que não estava no ar. Sempre re-servir a partir
> do `dist/` recém-construído no passo 5, ou conferir direto em `https://leela-hub.web.app`.

**`:4602` — o mock do Campeche, com dados ricos e autologin.** É o que acende os gráficos:

```bash
cd C:/dev/LEELA
bash scripts/mock-campeche.sh up      # sobe e devolve o terminal
bash scripts/mock-campeche.sh status  # o que está de pé
bash scripts/mock-campeche.sh down    # derruba tudo
```

Depois que ele subir, os endereços de entrada, **já logado, sem tela de login**:

| Área | URL |
|---|---|
| Visão geral, eventos e Caixa da produtora | `http://127.0.0.1:4602/?preview=castelo` |
| Admin da plataforma | `http://127.0.0.1:4602/plataforma?preview=admin` |

O mock roda no projeto `demo-leela` do emulador, com build `--mode mock-emulador` e todo
seed passando pelo guard `assertEmulatorOnly`. **Zero produção**, e ele não encosta na
`:4601` nem para subir nem para derrubar. Portas próprias: Firestore 8280, Auth 9298,
Functions 5301, Storage 9399, Emulator UI 4011.

Há ainda o `preview.sh` da raiz, que é o caminho de uma linha para leigo: sobe emulador em
8180/9198, aplica o seed e abre o Vite em modo dev na 5273. Ele **bloqueia o terminal** e
`Ctrl+C` derruba tudo. Detalhe em [[PREVIEW]].

### 9 · O que não migra, e por que não faz falta

- **Worktrees das lanes.** Cada lane paralela criava um worktree próprio (`leela-wt-*`).
  Eles são cópias de trabalho descartáveis, e tudo que valia já está mesclado na `main`.
  No computador novo eles simplesmente não existem, e nascem de novo quando precisar.
- **Contexto de sessão do maestro.** Nenhuma conversa, nenhum estado de agente e nenhum
  `HANDOFF.json` de loop-guard atravessa a migração. Isso é por desenho: a verdade portátil
  é o repositório, e ela está escrita em quatro lugares — as **rodadas** (`02-rodadas/`), os
  **handoffs** (`.nirvana/handoffs/`), o **kanban** (`00-boards/V1-KANBAN.md`) e o **painel**
  (`01-produto/DECISOES-ABERTAS.md`).
- **`node_modules/`, `dist/`, `.turbo/`, `functions/lib/`.** Recriados por `pnpm install` e
  pelo build do passo 5. Copiá-los da máquina antiga só traz problema.
- **Dados do emulador.** `.emulator-data/`, `firebase-export-*` e os `*-debug.log` da raiz
  são estado local descartável. O seed reconstrói tudo.

---

## Completude do push

Varredura feita em 18/08 pela lane `MIGRACAO-OBSIDIAN`, antes da troca de máquina.

**O que estava fora do git e entrou:**

- **55 handoffs.** Havia 231 rastreados e 55 não. Entre os ausentes, registros que o painel
  e o kanban citam **por caminho**: `leela-deploy-j3-20260816.md`, `leela-navbar-fix-20260817.md`,
  `leela-barchart-fix.md`, `leela-kits-build-20260813.md`, os cinco da diagnose do PIX e os
  dois do incidente da tela preta. Num clone limpo esses links morriam.
- **`leela-specs/KICKOFF-BUILD.md`** — o prompt de retomada da construção, referenciado pelo
  plano de implementação, vivia só no disco.
- **Dois probes de captura** (`.nirvana/gate-visual/probe-cred.mjs`, `probe-visual.mjs`) e as
  **duas medições em json** dos filtros.

Antes do commit, os 55 handoffs passaram por varredura de segredo em dois padrões (chave de
API, service account, PEM, DSN, token de provedor; e atribuição de variável com valor longo
sob nome sensível). **Zero ocorrências.**

**O que ficou fora de propósito:** `.nirvana/briefs/` e `.nirvana/logs/` são trace de execução,
não registro de produto. Os 72 PNG de `.nirvana/gate-visual/filtros-lista/` e os 22 de
`.nirvana/shots/kits-build/` somam 16 MB de prova de trabalho já pago, e entram no inventário
de cópia manual em vez do repositório.

**Estado do repositório ao fechar esta lane:**

Ponto de partida da lane: `82aea920`, com `main` e `origin/main` já idênticos.

| Commit | O que entrou |
|---|---|
| `4c7e6ef3` | O registro da leva 26 na rodada de 18/08 |
| `dc732c50` | Os 55 handoffs ausentes e o `KICKOFF-BUILD.md` |
| `41150f16` | Os dois probes de captura e as duas medições dos filtros |
| `09830f78` | Este documento |

**`main` == `origin/main`**, comprovado com `git fetch origin` seguido de
`git rev-list --left-right --count main...origin/main`, que devolveu `0  0` — medido antes
da lane abrir e de novo depois do push de `09830f78`.

O repositório remoto é `https://github.com/inguz-studio/leela-projects.git`. É dele que sai
o clone do passo 1, e é ele que carrega o contexto de produto inteiro para o computador novo.

---

## Estado do deploy (preenchido pela DEPLOY-J4)

_Reservado. A lane `DEPLOY-J4` escreve aqui o resultado medido da subida: o que foi para
produção, com qual hash, e o que continua parado._

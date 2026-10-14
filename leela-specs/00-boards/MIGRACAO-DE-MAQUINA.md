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

**Produção saiu de `409a5748` (16/08) para `82aea920` (18/08).** As levas 20-25 inteiras estão no ar:
UI-ACOES, filtros em lista, barra mobile, eng-insights, modal-lote, modalidades, cred-busca,
vg-insights, inscritos-read-fix e a série financeira.

### O pino novo

| Superfície | Estado | Prova |
|---|---|---|
| **Functions** | 🔄 no ar · 13:03:53Z | 105 → **106** GEN_1, **106/106 `ACTIVE`**; 1 criada (`editarModalidadesEvento`), **0 removidas**; convergência **106 Skipped, 0 update/create/delete** |
| **Painel** (`leela-hub`) | 🔄 no ar · 13:09:18Z | `index-CRoaNsxO.js` → **`index-BCYyq8yg.js`** + `index-CBlsWQ0a.css`; 3 assets **byte a byte** idênticos ao build local |
| **Landing** (`leela-landing`) | 🔄 no ar · 13:19:00Z | 3 chunks de rota trocados e **byte a byte** idênticos; subiu por delta de **dependência**, não de fonte |
| **Rules** | ⬜ **não subiu — não mudou** | `git diff 409a5748..82aea920 -- firestore.rules` = **0 arquivos**; ruleset segue `9e4b4b03`, e o sha do source servido (`d59b63ac…`) bate byte a byte com o `firestore.rules` do pino novo |
| **Índices** | ⬜ **não subiu — não mudou** | diff = 0 arquivos; **19/19 `READY`**, zero `CREATING`, antes e depois |
| **Storage rules** | ⬜ não tocado | fora do escopo desta lane |

### O reprocesso (RN-822) rodou junto

`reprocessarFinanceiroTodosEventos` **já existia** no pino — não precisou ser construída. Rodou às
**13:08:45Z**, depois das functions: **1 evento tocado, 0 falhas, 1.624 ms**, idempotência provada
por 2ª passada. Em `teste-taxa-repassada` a série nasceu **correta**, não apenas presente: dos 2
pagamentos crus (1 `confirmado/pix`, 1 `falhou/pix`), só o confirmado entrou no Σ.

### O que continua parado

1. ⛔ **Gate visual das 3 telas da rosca** (S825) — exige **JDK 21** para o emulador do mock, e a
   máquina tem 17. É a pendência #1 desta frente, e a migração de máquina é o caminho natural dela.
2. ⛔ **Gate visual L-011 do admin e das ondas 2/3/5** — segue aberto desde 12/08.
3. **S316-T5** (evento degradado pela listagem) — única da onda de Modalidades que não subiu porque
   não foi construída.
4. **`:4601` serve build local, não produção** — quem validar painel por ali vê outro bundle. A
   régua de produção é `https://leela-hub.web.app`.

### Como refazer esta subida na máquina nova

Vale como receita testada, e não como teoria: worktree no pino → `pnpm install --frozen-lockfile` →
copiar `functions/.env` (gitignored, **não vem no clone**) → build de `core`/`api-client`/
`design-system` → `npx vite build --mode leela-hub` no painel → `firebase deploy` por superfície com
`--config firebase.prod.json` (landing usa `firebase.landing.json`). O detalhe medido de cada passo
está em `.nirvana/handoffs/leela-deploy-j4-20260818.md`.

---

## A travessia que aconteceu — macOS, 19/08/2026

O bring-up acima foi escrito no Windows e executado num **MacBook Apple Silicon (macOS 15.5,
arm64)**. Esta seção registra só o que **não bateu**, e o que se fez no lugar. O que não está
aqui funcionou como escrito.

Máquina de destino: clone em `~/dev/LEELA` (o `C:\dev\LEELA` do guia), `main` em `847e56ac`,
produção intocada no pino `82aea920`. **Zero deploy nesta travessia.**

### O que já existia e foi pulado

Xcode Command Line Tools (git 2.55.0), Homebrew 6.0.18, `gh` 2.97.0 já autenticado como
`inguz-studio`, Node e npm. Os passos correspondentes do bring-up não foram repetidos.

### 1 · JDK 21 — a instalação que faz os DOIS scripts funcionarem, sem sudo

O guia oferece duas saídas (§3) e recomenda a primeira. No Mac há uma terceira, que é a
primeira **sem baixar o Temurin à mão**:

```bash
brew install openjdk@21          # fórmula, NÃO o cask temurin@21
mkdir -p ~/.jdks
ln -s /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
      ~/.jdks/jdk-21.0.11+10
```

O cask `temurin@21` escreve em `/Library/Java/JavaVirtualMachines` e **pede senha de
administrador**; a fórmula `openjdk@21` mora em `/opt/homebrew` e não pede nada. O symlink
com o nome que os scripts esperam faz o `preview.sh:26` (caminho **fixo**, sem override)
e o `mock-campeche.sh:48` (com override) passarem os dois sem editar uma linha.

`LEELA_JAVA_HOME` foi exportado no `~/.zshrc` (não `~/.bashrc` — o shell padrão do macOS é
o zsh) apontando para o mesmo lugar, de reserva. **`JAVA_TOOL_OPTIONS` continua fora**, pela
razão que a §3 já escreve.

Versão real instalada: **OpenJDK 21.0.12.1**, não a 21.0.11+10 do nome da pasta. O nome é
contrato com os scripts, não declaração de versão.

### 2 · Node — o par do guia não foi reproduzido, e isso é um risco nomeado

O guia manda reproduzir **Node v24.13.1 + pnpm 11.9.0**. O Homebrew instala o Node mais novo
(**v26.7.0**), e a primeira volta do bring-up rodou nele.

- `corepack` **não existe** no Node do Homebrew — os dois comandos da §2 falham com
  `command not found`. Não fez falta: o próprio pnpm lê o `packageManager` do
  `package.json` e resolve **11.9.0** dentro do repo sozinho. `pnpm -v` na raiz confirma.
- ⚠️ **O build das Functions avisa** `Unsupported engine: wanted: {"node":"20"}`. Compila e o
  emulador sobe, mas o runtime local fica **acima do node 20 de produção**.

**A resolução, e a trava que ela achou.** O par foi acertado com o `fnm`:

```bash
brew install fnm
fnm install 20 && fnm install 24
# ~/.zshrc
eval "$(fnm env --use-on-cd --shell zsh)"
```

⛔ **Node 20 para tudo NÃO funciona, e a razão é o pnpm.** O pnpm 11 importa `node:sqlite` e
**exige Node >= 22.13**; sob o 20 ele morre com `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`
antes de fazer qualquer coisa. Quem tentar "alinhar tudo ao engine das Functions" perde o
gerenciador de pacotes.

A divisão que funciona, e que é a que está em vigor:

| Camada | Node | Por quê |
|---|---|---|
| Toolchain (pnpm, turbo, vite, builds) | **v24.19.0** | é o par que o guia manda reproduzir, e o mínimo que o pnpm 11 aceita |
| Functions (testes e emulador) | **v20.20.2** | é o runtime de produção; invocado sob demanda com `fnm exec --using=20 -- <cmd>` |

`.node-version` na raiz do repo fixa o **24** — com `--use-on-cd`, toda sessão que entra em
`~/dev/LEELA` já cai na versão certa. O arquivo é **não-rastreado** e não está no
`.gitignore`: commitar ou apagar é decisão de quem vier depois.

**O build não depende da versão do Node.** `vite build --mode leela-hub` foi rodado sob o v26
e sob o v24 e produziu **os mesmos `index-BCYyq8yg.js` e `index-CBlsWQ0a.css`** — que são,
por sua vez, os que produção serve. Três pontos, um artefato só.

### 3 · O pacote de cópia manual veio do Windows, e cobra dois pedágios

`LEELA-migracao.zip` (55 MB, 638 arquivos) grava os caminhos com **contrabarra**. O `unzip`
do macOS avisa e converte sozinho (`appears to use backslashes as path separators`), então a
árvore nasce certa — mas duas coisas quebram:

1. **Os diretórios chegam sem bit de execução.** Nada é legível até rodar
   `chmod -R u+rwX,go+rX` na pasta extraída. Sem isso, `find` e `du` devolvem
   `Permission denied` e a cópia parece vazia.
2. **CRLF entra em arquivo rastreado.** O `.nirvana/gate-visual/filtros-lista/antes-medicoes.json`
   **está no git** (entrou na `41150f16`) e a cópia manual o sobrescreve com fim de linha
   Windows: 1.207 linhas trocadas por 1.207 idênticas. Conteúdo igual, `git status` sujo.
   Conferir com `diff <(tr -d '\r' < arq) <(git show HEAD:arq)` e resolver com
   `git checkout -- <arq>` — a versão do git é a canônica.

Depois de aplicado: `outputs/` com **480 arquivos / 46 MB**, `.emulator-data/` com os três
exports, 99 provas em `filtros-lista` e 22 em `shots/kits-build`. Os quatro arquivos de
segredo aterrissaram com exatamente os nomes de chave que a §6 inventaria.

**Fica sujo de propósito:** as 72 provas de `filtros-lista` e a pasta `shots/kits-build` são
**não-rastreadas e não-ignoradas**, então `git status` passa a mostrar 73 linhas num clone
recém-migrado. Não é defeito da migração — é a consequência de a lane MIGRACAO-OBSIDIAN as ter
deixado fora do git de propósito. Quem exigir "árvore limpa" como pré-condição de deploy
(a DEPLOY-J4 exigia) precisa contar `--porcelain -uno`, ou vai reprovar a própria máquina.

### 4 · Junções do Obsidian — `ln -s`, e o vault ainda não existe

`mklink /J` não existe no macOS; o equivalente é `ln -s`. E o `dir /AL` de conferência vira
`ls -la`.

```bash
ln -s ~/dev/LEELA/leela-specs LEELA-specs
ln -s ~/dev/LEELA/outputs     LEELA-reports
```

⚠️ **Duas diferenças de alvo, e as duas são deliberadas:**

- O Obsidian **está instalado e nunca foi aberto** nesta máquina: não há `.obsidian` em lugar
  nenhum do disco, nem vault no iCloud. As duas junções foram criadas em
  **`~/Desktop/LEELA-vault/`**, para o dono mover para dentro do vault quando ele existir.
- A `LEELA-reports` aponta para **`outputs/` inteiro**, e não para
  `outputs/leela-build-2d6ee98d` como a §7 registra. Foi ordem direta do dono na sessão da
  migração. O alvo novo é mais largo: alcança os 7 diretórios de build, 480 arquivos, contra os
  ~205 do subdiretório único. Quem preferir o recorte antigo troca o alvo do symlink.

Conferido: 399 arquivos alcançáveis por `LEELA-specs`, 480 por `LEELA-reports`.

### 5 · Os dois ambientes subiram — e o `:4601` reproduziu produção byte a byte

`npx vite build --mode leela-hub` no `apps/painel` gerou **`index-BCYyq8yg.js`** e
**`index-CBlsWQ0a.css`**: exatamente os nomes que a DEPLOY-J4 registrou como estando no ar
desde 18/08 13:09Z. O bundle que o Mac constrói é o mesmo que produção serve — o que também
significa que a armadilha da §8 (a `:4601` servindo bundle velho) **não se aplica a esta
subida**, porque o `dist/` é recém-construído e coincide com o pino.

Isso foi conferido **contra produção, por leitura**, depois do `firebase login`: o HTML de
`https://leela-hub.web.app/` referencia os mesmos dois arquivos que o `dist/` local acabou de
produzir. É a prova de que a máquina nova reproduz o artefato que está no ar, e não só de que
ela compila.

### 5b · Firebase — o login refeito, como a §6 manda

Refeito do zero, nunca copiado. Duas diferenças de execução no Mac:

- O `firebase login` disparado de uma sessão **não-interativa** não abre o navegador: cai no
  fluxo de código de dispositivo (session ID + URL do `auth.firebase.tools` + `firebase login
  <authorizationCode>`). Funciona igual, mas é bom saber antes de achar que travou.
- A pergunta de telemetria do CLI bloqueia o comando antes disso. Respondida por escrita
  direta em `~/.config/configstore/firebase-tools.json` (`"usage": false`), reversível
  apagando a chave.

Conta ativa: **`inguzbuilders@gmail.com`**. `firebase projects:list` devolve **`leela-hub`**
(project number `76126035891`), e `hosting:sites:list --project prod` devolve os dois sites,
`leela-hub` e `leela-landing`. Nenhum comando de escrita foi emitido contra o projeto.

O `mock-campeche.sh up` rodou **sem editar nada**. Na primeira execução ele baixa o
`cloud-firestore-emulator-v1.22.0.jar` (não vem no `pnpm install`), o que custa 1-2 minutos a
mais só da primeira vez. Portas conforme o guia: 4602, 8280, 9298, 5301, 9399, 4011.

`pnpm exec playwright install chromium` é obrigatório antes de qualquer probe de captura,
como a §6 já avisava.

### 6 · ✅ O gate visual da rosca (S825) foi executado — a pendência #1 caiu

A pendência #1 desta frente era ambiente, não construção: JDK 17 na máquina antiga. Com o 21
instalado, o emulador subiu e **os três estados da §"Gates visuais pendentes do dono" foram
vistos renderizados**, com 0 erros de console em todos. Probe novo:
`.nirvana/gate-visual/probe-rosca-s825.mjs`; capturas em `.nirvana/gate-visual/rosca-s825/`.

⚠️ **O handoff da SERIE-FINANCEIRA descreve a tela #1 com números do EVENTO, não da Visão
geral.** A §8 daquele handoff pede "Visão geral · rosca acesa" com "centro **R$ 2.500**,
10 vendas, 41,6% / 58,4%, nota citando R$ 50.560". Esses são os números de
**`mock-campeche-run` sozinho** — e o emulador os confirmou ao pé da letra, pela primeira
vez, no doc `eventos/mock-campeche-run/financeiro/current`:

| | Cartão | Pix | Total |
|---|---|---|---|
| Handoff (aritmética do seed, no papel) | 5 · R$ 1.040 | 5 · R$ 1.460 | 10 · R$ 2.500 |
| Emulador, doc do evento | **5 · R$ 1.040** | **5 · R$ 1.460** | **10 · R$ 2.500** |

`pendentes` também bateu: `{qtd: 3, valor: 500}`, o "3 cobranças · R$ 500" da §4.

Só que **a Visão geral consolida o portfólio**, e o portfólio da Marina tem um segundo evento
com venda (`meia-floripa-2026`, cartão 5 · R$ 1.634,85 e pix 3 · R$ 1.134). A tela mostra,
corretamente, a soma: **18 vendas · R$ 5.269**, Cartão R$ 2.675 (51%) contra Pix R$ 2.594
(49%), sobre `receitaConfirmada` de R$ 217.837. A conta fecha nas duas pontas. **O código
está certo; o que estava errado era a expectativa escrita no handoff**, que rotulou número de
evento como número de Visão geral. Quem for reler o §8 de lá lê com esta correção ao lado.

**Os três estados, conferidos um a um:**

| Estado | Como foi produzido | O que a tela disse |
|---|---|---|
| Rosca acesa | estado natural do mock após o seed | 2 fatias, centro R$ 5.269, "18 vendas confirmadas", nota de cobertura completa |
| "Em breve" | `formasPagamento` **removido** do `profissionais/uid-marina-castelo/dashboard/current` no emulador | card "Em breve" com a causa palavra por palavra, **0 caminhos no SVG** |
| Vazio honesto | série **zerada** gravada no mesmo doc | "Nenhuma venda confirmada ainda", sem a palavra "breve", **0 caminhos no SVG** |

Os dois últimos foram induzidos por escrita direta **no emulador `demo-leela`** e o valor
original foi restaurado e reconferido no fim. Zero produção em qualquer momento.

**A prova que mais valia:** a linha `?? []` que o `FormasDePagamento.tsx` teme não existe —
nenhum dos dois estados vazios desenhou rosca zerada. A contagem de `<path>` no SVG foi 0 nos
dois e 2 na rosca acesa.

**O que sobrou para o olho do dono**, e nenhuma medição substitui:

1. As duas cores categóricas no brasa são **verde e magenta**, e no mock caem em 51%/49% —
   duas fatias quase iguais, então a rosca sozinha não diz qual é qual sem a legenda.
2. Os dois estados vazios são **visualmente o mesmo cartão**: mesmo ícone de cartão, mesma
   moldura, mesma altura. A distinção entre "ninguém somou" e "ninguém comprou" vive
   **inteiramente nas palavras**. É exatamente a distinção que a lane pagou caro para
   preservar no dado, e na tela ela é só texto.
3. A pergunta honesta da §8 do handoff continua de pé e agora com número novo: a cobertura
   medida na Visão geral é de **R$ 5.269 sobre R$ 217.837 — 2,4%**, ainda mais baixa que os
   4,9% do evento isolado. A nota explica e a rosca desenha. Continua vetável.

### 7 · O que esta travessia NÃO fez

- **Nenhum deploy.** Produção segue em `82aea920`, intocada.
- **Nenhum commit.** As mudanças desta sessão (esta seção e o probe novo) estão na árvore de
  trabalho, para o dono ler antes de decidir o que entra.
- **Kill de processo: dois, ambos por PID exato e ambos meus.** A `:4601` caiu quando apaguei o
  `dist/` durante um rebuild (o `vite preview` serve por handle de arquivo — **derrube a porta
  antes de reconstruir**), e o mock foi derrubado de propósito para isolar a medição da suíte.
  Os dois foram religados. ⚠️ **Suba as DUAS superfícies desacopladas** (`nohup … & disown`) —
  a `:4601` e o `mock-campeche.sh up`. Lançadas como tarefa de sessão, elas morrem quando a
  tarefa é encerrada. O mock **parece** se desacoplar sozinho (o `up` devolve o terminal), mas
  os processos seguem no grupo do shell que o chamou e caem junto com ele; ele só sobrevive
  quando aquele shell termina naturalmente, o que torna o sintoma intermitente e enganoso. PIDs mudam a cada religada — descubra o atual com
  `lsof -nP -iTCP:<porta> -sTCP:LISTEN -t`, nunca mate por nome de imagem (a máquina tem vários
  `node` e dois `java` simultâneos). Derrubar o mock é `bash scripts/mock-campeche.sh down` — e
  ele **não derruba o que não iniciou**.
- **Nenhuma RN consumida.** Faixa reconferida por grep: a mais alta em uso é a **577**, e tudo
  entre 578 e 583 continua sendo prosa de varredura. **A próxima livre segue 578.**

### 8 · As suítes rodaram inteiras — e o que elas acharam

Com Node 20 disponível e o JDK 21 vivo, as suítes rodaram pela primeira vez nesta máquina.

| Suíte | Como | Resultado |
|---|---|---|
| Painel | Node 24, sem emulador | **262 arquivos · 3.034 testes · 3.034 passando** |
| `gate:canon` | Node 24 | **PASS** — 23 contadores no baseline |
| `financeiroEvento.integration` | Node 20 + `emulators:exec --only firestore` | **19/19**, incluindo os **8 casos da S825-T1** |
| Functions completa | Node 20 + `--only firestore,auth,storage` | 261 arquivos · **4.691 passando · 16 falhando · 57 skipped** |

Os números do painel batem **exatamente** com os que a SERIE-FINANCEIRA registrou em 17/08.

#### ⛔ O CI nunca passou — 891 execuções, zero sucessos

Medido por `gh api .../actions/runs?status=success` → `total_count: 0`, contra 891 execuções
totais. As 40 mais recentes falham em **18-27 segundos**, no step `Setup pnpm`, com:

```
warn: This version of pnpm requires at least Node.js v22.13
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

A causa é uma contradição interna do repo: `package.json` pina
`packageManager: pnpm@11.9.0`, que exige **Node >= 22.13**; `.github/workflows/ci.yml` pina
`node-version: '20'`. O job morre **antes** de lint, type-check, build e de qualquer teste.
(Confirmado localmente: o pnpm 11.9.0 puro, fora do Homebrew, falha igual sob Node 20.)

**A consequência retroativa é séria.** A §6 do handoff da SERIE-FINANCEIRA justifica não ter
rodado os 8 casos de integração assim: *"Rodam no CI, que provisiona Java 21."* O CI nunca os
rodou. Com a máquina antiga em JDK 17 e o CI vermelho desde sempre, **aqueles testes nunca
executaram em lugar nenhum** até a travessia de 19/08. Eles passam.

A mesma frase aparece como conforto em outros handoffs. Qualquer afirmação da forma "não rodei
aqui, mas o CI cobre" precisa ser relida como **não coberto**.

Correção mínima possível: subir o `node-version` do `ci.yml` de `20` para `24` (o pnpm passa a
funcionar e o CI chega aos testes pela primeira vez). ⚠️ Isso põe o CI a rodar as Functions em
Node 24 enquanto produção roda **nodejs20** — a alternativa é destravar o pnpm de outro jeito e
manter o 20. **É decisão do dono e não foi aplicada nesta travessia.**

#### As 16 falhas: 8 são emulador errado, 8 pedem investigação

Determinísticas — a suíte foi rodada **duas vezes** e devolveu as mesmas 16.

⚠️ **A suíte de Functions não é feita para rodar num emulador só.** 70 arquivos leem
`LEELA_FS_EMU_PORT`, e vários declaram no cabeçalho um emulador **próprio de lane**, com porta
e *project id* próprios — é para isso que existem os **22 `firebase.*.json`** da raiz.
`vitest run` de uma vez, contra um emulador único, é uso fora do contrato:

| Arquivo | O que ele exige | Falhas |
|---|---|---|
| `codigoPedidoReserva.attack` | `firebase.revcod5a.json` — fs 8881, auth 9881, projeto `demo-leela-revcod5a` | arquivo não carrega (`ECONNREFUSED :8881`) |
| `codigoPedidoReserva.integration` | idem | arquivo não carrega |
| `backfillCodigoPedido.integration` | fs 8981, auth 9981 | arquivo não carrega (`ECONNREFUSED :8981`) |
| `revContasMotor.antagonista` | `firebase.revcontas.json` — fs 8399, auth 9399, projeto `demo-leela-revcontas` | **8 testes** |

Essas quatro **não são defeito**: rodaram contra o emulador errado. Reproduzi-las exige subir a
config da lane. ⚠️ Atenção a uma colisão no Mac: a auth da `revcontas` é a **9399**, que é a
porta de **storage do mock-campeche** — as duas não sobem juntas.

Os **8 restantes** declaram `demo-leela` na 8080 e foram investigados um a um, isolados.
Dois achados, e o primeiro é grande.

##### 5 das 8 são UM CARACTERE numa fixture de teste

`rateLimitAceite.integration` (3) e `journeyAceiteE18.e2e` (2) provisionam conta com a senha
**`'senha-forte-8'`**. O commit **`42e356f0`** (06/08/2026, lane FRONTEIRA-AUTH — *"a regra de
senha vira garantia onde o servidor cria a conta"*) passou a validar senha no servidor via
`senhaValida` do core. E `'senha-forte-8'` **reprova**, por um motivo só:

```
requisitos: {"comprimento":true,"numero":true,"especial":false}
pendencias: ["um caractere especial"]
```

O **hífen não está no conjunto `ESPECIAIS`** (`packages/core/src/platform/politicaDeSenha.ts`).

Aquele commit **atualizou 4 arquivos de teste** (`politicaDeSenha.test.ts`,
`afiliados.integration`, `assessoriaParceira.integration`, `confirmarCodigoDeAcesso.integration`)
e **deixou estes dois para trás**. Provado por experimento: trocando a senha para
`'senha-forte-8!'`, o `rateLimitAceite` vai de **3 falhas para 8 passando**. A alteração foi
revertida — a correção é decisão de quem for despachar.

**Não é defeito de produção: é fixture morta há 14 dias, invisível porque o único lugar que a
pegaria era o CI que nunca passou.**

⚠️ Ao rodar esses arquivos, suba **`--only firestore,auth`**. O helper
`deleteAllUsersDrained` (`helpers/stability.ts:273`) fala com o Auth; só com firestore o arquivo
inteiro morre em `ECONNREFUSED` — e **o `ci.yml` roda `--only firestore`**, então mesmo consertado
o CI não cobriria este arquivo.

##### As 3 do `ingressosOrfaos` pedem decisão de domínio

`ingressosOrfaos.integration` (RN-382, extrato e varredura de ingresso órfão) falha em
`:260`: o teste espera que `insc-2` **não tenha** `codigoIngresso` depois da falha da 1ª
entrega, e ele tem (`W6GNC4`). Ou o comportamento mudou e o teste envelheceu, ou a
at-most-once por pedido da RN-219 não está segurando. **Decidir qual exige julgamento sobre a
RN-382 e a RN-219** — é trabalho de `sf-backend-lead` com aval do `sf-cto`, não de varredura.

##### Sobre rodar a suíte com o mock no ar

⛔ **Não rode.** O mock e o emulador de teste usam o **mesmo project id** (`demo-leela`), e o
firebase-tools indexa o localizador de hub por project id
(`$TMPDIR/hub-demo-leela.json`). Com os dois de pé o emulador avisa *"you are running multiple
instances of the emulator suite"* e o localizador aponta para o hub do **mock**. Derrube o mock
antes de medir.

⚠️ E o `mock-campeche.sh down` **não derruba processo que ele não iniciou**: se o mock foi
lançado por um shell que já morreu, ele reporta *"0 processo(s)"* com as portas ainda ocupadas.
Nesse caso, matar **por PID exato** (`lsof -nP -iTCP:4602 -sTCP:LISTEN -t`), nunca por nome.

**Nenhum dos 16 é regressão da migração** — são falhas que nunca tiveram como ser vistas, porque
o único lugar que as rodaria era um CI que nunca passou.

#### Buraco no inventário de segredos

`CODIGO_ACESSO_PEPPER` — que `functions/src/auth/codigoDeAcesso.ts:95` chama de **"o SÉTIMO
segredo da casa"** — não está em `.env`, `functions/.env`, `functions/.env.local`,
`functions/.secret.local`, `.env.example` nem `functions/.env.example`, e **não aparece na §6
deste documento**. Os testes o injetam sozinhos, então ele não causa as falhas acima; mas quem
exercitar o fluxo de código de acesso no emulador local vai bater no fail-closed. **Entra no
inventário de cópia manual**, junto dos outros quatro.

---

## A dívida do CI foi paga — 26/08/2026, primeira execução verde da história

A decisão que a §"⛔ O CI nunca passou" deixou com o dono foi tomada e executada em 26/08
(lane `leela-ci-verde-20260826`, **PR #1** — o terceiro merge da história do repo — commits
`c4c90561..8fa0c530` na main). O run 33007454451 fechou **verde em todos os steps**, contra
898 execuções e zero sucessos até a véspera.

**A resolução do Node não foi "24 ou 20" — foi as duas**, espelhando a divisão desta máquina
(§2): toolchain em **Node 24** lido de `.node-version` (que **passou a ser rastreado** — a
ponta solta da §2 está resolvida), e a suíte das functions em **Node 20** via troca de PATH
depois do último uso do pnpm, com o vitest chamado pelo bin local. O 20 não é capricho:
`adminVisaoOnda5Liberacao.integration` **passa sob 20 e falha sob 24** — a 17ª falha, que a
travessia não viu porque rodou a suíte sob 20.

**As 16 falhas da §8 fecharam assim:**

- **As 5 da fixture de senha**: pagas como o experimento previu — `'senha-forte-8!'` nos dois
  arquivos. E o mesmo defeito tinha um **terceiro arquivo** que a §8 não alcançou:
  `revContasMotor.antagonista` usava `'senha-da-review-123'` e `'outra-senha-456'` (8 falhas
  que pareciam "emulador errado" eram, por baixo da lane certa, a mesma senha sem especial).
- **As 3 do `ingressosOrfaos`**: era a primeira hipótese — **o teste envelheceu**, a RN-219
  está inocente. O rig de colisão espionava `Math.random`, que o `d36afb64` aposentou ao
  levar o sorteio para a entropia do sistema. O canal sancionado (REV-A4) é o parâmetro
  `random`: o disparo pós-confirmação e a varredura passaram a repassá-lo (opcional, **sem
  default**) e o teste injeta por ele. 5/5 verdes.
- **As 4 suítes de lane**: rodadas cada uma contra o próprio `firebase.*.json` — 65 casos,
  todos verdes — e o `ci.yml` ganhou **um step por lane**. A colisão da 9399 com o storage do
  mock aconteceu como a §8 avisou; resolvida derrubando o mock por PID exato e religando no fim.

**O que o CI cobre agora**: lint, type-check, build, as três suítes jsdom **fora** do
`emulators:exec` (o env do emulador vazava para dentro delas — landing 849/849 isolada contra
2 arquivos vermelhos sob o exec), functions com **firestore+auth+storage** (a receita do
`como-verificar.md`, não mais o firestore solitário) e as quatro lanes. O que ele ainda NÃO
cobre segue igual: E2E só nightly, gateway/Brevo atrás de flag, e os três pacotes sem script
de teste. A frase "o CI cobre" continua exigindo a pergunta *"cobre o quê?"* — mas deixou de
ser mentira por construção.

De brinde, dois consertos que o CI verde exigiu e que valem sozinhos: o type-check do mobile
compilava o core sob o `URL` capado do RN (asserção local em `isUrlCapaValida`), e o
`expo export` SSR morria no pino React 18 do workspace — o web do mobile virou SPA
(`output: single`), com o realinhamento Expo×React registrado como decisão de dono.

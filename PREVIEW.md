# Preview do painel LEELA — ver no navegador em 1 comando

Este guia é para **ver o painel funcionando no seu navegador**, com dados de
exemplo, sem precisar entender de programação. Você roda **um comando**, abre um
link e navega pelas telas como se fosse o produto real.

O preview sobe uma cópia isolada do banco de dados de teste (Firebase Emulator)
em portas próprias, então **não atrapalha** nada que os agentes/automação
estejam fazendo em paralelo. Tudo roda no seu computador: **nada toca a
produção**.

Foi escrito para **macOS** (é o computador do dono). O mesmo script também roda
em Linux e no Git Bash do Windows; as diferenças estão em **Windows** no fim.

---

## O que precisa estar instalado (Mac)

| Ferramenta | Versão | Como instalar | Para quê |
|---|---|---|---|
| **Homebrew** | qualquer | https://brew.sh | instalar as outras |
| **Node** (via **fnm**) | **24** (o repo tem `.node-version` = 24; o mínimo é 20) | `brew install fnm` | rodar tudo |
| **pnpm** | **11.9.0** (fixado no `package.json`) | `corepack enable && corepack prepare pnpm@11.9.0 --activate` | instalar e rodar os pacotes |
| **firebase-tools** | **15.x** (testado com 15.28.1) | `npm i -g firebase-tools` | o banco de teste (Emulator) |
| **Java** | **21 ou maior** (o firebase-tools 15 recusa Java abaixo de 21) | `brew install openjdk@21` | o Firestore Emulator roda em Java |
| **Chromium do Playwright** | o que vem com o `@playwright/test` do repo | `pnpm exec playwright install chromium` | só para os gates visuais |

`curl` e `lsof` já vêm no macOS (o preview usa os dois).

### Configurar o fnm (uma vez)

Coloque no fim do `~/.zshrc` e abra um terminal novo:

```bash
eval "$(fnm env --use-on-cd --shell zsh)"
```

Depois, dentro da pasta do projeto, o fnm troca para o Node 24 sozinho
(`fnm install` baixa na primeira vez). Confira: `node -v` deve dizer `v24.x`.
Se disser outra versão, veja o item 6 de "Se algo der errado".

### Configurar o Java 21 (uma vez)

O Homebrew instala o `openjdk@21` fora dos lugares padrão do macOS. O preview
**procura o Java sozinho** (nesta ordem): `LEELA_JAVA_HOME`, `JAVA_HOME` (se for
21 ou maior), `~/.jdks/*`, o `/usr/libexec/java_home`, o do Homebrew e
`/Library/Java`. O jeito mais simples de deixá-lo achável:

```bash
brew install openjdk@21
mkdir -p ~/.jdks
ln -sfn "$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" ~/.jdks/jdk-21
```

Se o seu `JAVA_HOME` global aponta para um Java mais velho (17, por exemplo), não
tem problema: o preview confere a versão e pula para um 21. Para **forçar** um
Java específico: `LEELA_JAVA_HOME=/caminho/do/jdk bash preview.sh`.

### Primeira vez no projeto

```bash
cd ~/projetos/leela/LEELA
fnm use                                  # Node 24
pnpm install --frozen-lockfile           # instala tudo (usa a lockfile, não muda nada)
pnpm exec playwright install chromium    # só se for rodar os gates visuais
```

Não precisa de `firebase login`: o preview só usa o Emulator local.

---

## O único comando

1. Abra o **Terminal**.
2. Entre na pasta do projeto e rode o preview:

```bash
cd ~/projetos/leela/LEELA
bash preview.sh
```

3. Espere aparecer a mensagem verde **"PREVIEW NO AR"**. Na primeira vez leva
   alguns minutos (compila os pacotes internos e sobe o banco de teste); nas
   seguintes é bem mais rápido. Ela mostra o link para abrir, algo como:

```
     http://127.0.0.1:5273
```

> O número da porta pode variar (5273, 5274, ...). **Use sempre o link que o
> comando imprimir** — a automação usa a 5173, então o preview escolhe outra
> porta livre automaticamente. Para fixar a porta:
> `PREVIEW_VITE_PORT=4611 bash preview.sh` (a 4611 é a que os gates visuais
> esperam, ver mais abaixo).

4. **Cmd+clique** no link (ou copie e cole no navegador). Pronto: você já entra
   **logado**, sem digitar senha.

---

## O que você vai ver

O preview já vem com dados de exemplo. Você entra logado e pode passear pelas
três áreas principais usando os links abaixo (troque a porta se a sua for outra):

| Área | Link | O que aparece |
|------|------|----------------|
| **Visão geral + Eventos** | `http://127.0.0.1:5273/?preview=castelo` | Produtora "Castelo Produções": 2 eventos (Meia Maratona Floripa 2026 com 453 inscritos, Maratona 2027), inscrições recentes, contagem regressiva |
| **Clubes** | `http://127.0.0.1:5273/clubes?preview=corrida` | Clube "Corrida Perfeita Sul": 6 membros, 5 desafios, 7 comunicados, 8 parcerias |
| **Admin da plataforma** | `http://127.0.0.1:5273/plataforma?preview=admin` | Visão de super-admin: os tenants e os termos comerciais |

Cada link entra com um usuário diferente (por isso as áreas mudam). É só clicar
no link da área que quer ver.

**Login manual** (se algum dia precisar digitar): `marina@demo-leela.dev` com a
senha `demo1234` (usuário só existe no ambiente de teste).

**Observação:** o preview também sobe o servidor local (Cloud Functions no
Emulator), então os cartões de resumo e os alertas da "Visão geral" carregam
com os dados de exemplo. Se algum botão de **salvar/alterar** reclamar, veja o
`emulator.log` na pasta de logs impressa ao encerrar.

---

## Como parar

Na janela do Terminal onde o preview está rodando, pressione:

```
Ctrl + C
```

Ele derruba tudo sozinho (painel, banco de teste e o Java dele) e libera as
portas. Pode fechar a janela depois. Se a janela foi fechada à força e sobrou
algo de pé, veja "porta ocupada" abaixo.

---

## Os mocks, os gates e as verificações (o resto dos comandos)

### Mock "Campeche Run" (painel de conferência do dono, porta 4602)

```bash
bash scripts/mock-campeche.sh up            # sobe emulador + seed + painel :4602 e devolve o terminal
bash scripts/mock-campeche.sh status        # o que está de pé
bash scripts/mock-campeche.sh down          # derruba tudo
bash scripts/mock-campeche.sh up --rebuild  # força rebuild do painel (depois de mexer no código)
```

Usa um bloco de portas próprio (8280/9298/5301/9399/4011/4411/4511 e painel
4602), então convive com o `preview.sh`. O build do painel do mock fica em
`apps/painel/dist-mock-campeche` e é reaproveitado entre subidas. Precisa do
`functions/.secret.local` (valor local do `CRM_ID_PEPPER`; não está no git).

### Gate visual ds-bordas-bento (4 testes de tela, painel na 4611)

Em **duas janelas** do Terminal, na pasta do projeto:

```bash
# janela 1 — o preview, com o painel na porta que o gate espera
PREVIEW_VITE_PORT=4611 bash preview.sh

# janela 2 — quando aparecer "PREVIEW NO AR"
pnpm exec playwright test -c .nirvana/gate-visual/ds-bordas-bento/playwright.gate.config.ts
```

Os 4 testes conferem a URL e o título de cada tela (login, recuperar senha,
cadastrar, kits do evento) e regravam as fotos ao lado do spec
(`.nirvana/gate-visual/ds-bordas-bento/*.png`). Antes de commitar, olhe o que
mudou: `git status` e `git diff --stat`.

### Outros gates e verificações

```bash
pnpm gate:canon          # gate do cânone de componentes (scripts/gate-canon.mjs)
pnpm type-check:gates    # tipos dos specs do gate visual (.nirvana/gate-visual/*.ts)
pnpm type-check          # tipos de todos os pacotes

# gates visuais que precisam do mock da 4602 de pé (bash scripts/mock-campeche.sh up):
node scripts/gate-visual-filtros.mjs --base http://localhost:4602 --shots /pasta/de/saida
OUT_DIR=/pasta/de/saida node scripts/gate-visual-subnav.mjs   # sem OUT_DIR grava em .nirvana/outputs/
```

As sondas avulsas de `.nirvana/gate-visual/probe-*.mjs` recebem a pasta de
saída como primeiro argumento (`node .nirvana/gate-visual/probe-visual.mjs /pasta/de/saida`).

---

## Se algo der errado (as mais comuns)

### 1. "porta ocupada" / o link não abre
Já tem um preview aberto, ou a automação está usando as portas.

- Veja quem está segurando a porta (troque 8180 pela que o aviso listou):
  ```bash
  lsof -nP -iTCP:8180 -sTCP:LISTEN
  ```
- Se for um preview seu que ficou para trás: `kill <PID>` (o número da coluna
  PID). Use `kill`, não `kill -9`, para o Emulator se desligar limpo.
- Se for outra frente de trabalho (outra janela/automação), **não derrube**:
  espere ela terminar. O `preview.sh` nunca derruba um processo que ele não subiu.
- Para fixar uma porta específica para o painel:
  ```bash
  PREVIEW_VITE_PORT=5300 bash preview.sh
  ```

### 2. Erro de **Java** ("Java 21+ não encontrado", "insufficient memory")
O banco de teste usa Java 21.

- **"Java 21+ não encontrado"**: faça a seção "Configurar o Java 21" acima.
  Confira com `~/.jdks/jdk-21/bin/java -version` (tem de dizer 21).
- **"insufficient memory"**: o computador está sem memória (muita coisa aberta,
  ou outro banco de teste de pé ao mesmo tempo). Feche programas pesados e
  rode `bash preview.sh` de novo.
- Não exporte `JAVA_TOOL_OPTIONS` no seu terminal: a JVM anuncia essa variável
  na saída de todo processo Java, e isso derruba o motor de regras do banco de
  teste (toda leitura passa a ser negada, sem erro na tela). O `preview.sh`
  desliga a variável sozinho.

### 3. Erro de dependências / **pnpm** ("tsx não encontrado", "command not found")
Faltou instalar as dependências do projeto.

- Rode uma vez, na raiz do projeto: `pnpm install --frozen-lockfile`
- Se `pnpm` ou `firebase` "não existe": abra um terminal novo (o PATH só vale
  em terminal novo) e confira se `$(npm prefix -g)/bin` está no seu PATH.
- Depois rode `bash preview.sh` normalmente.

### 4. Tela **em branco** ao abrir o link
O painel depende de pacotes internos compilados. Se eles estiverem
desatualizados, o navegador mostra uma página vazia, sem mensagem de erro.

- O `preview.sh` já recompila esses pacotes sozinho a cada execução (passo
  "Compilando pacotes internos"). Se mesmo assim a tela ficar em branco,
  pare (Ctrl+C) e rode `bash preview.sh` de novo.
- Persistindo, veja o `build.log` na pasta de logs impressa ao encerrar.

### 5. O gate visual diz "Executable doesn't exist"
Falta o Chromium do Playwright: `pnpm exec playwright install chromium`.

### 6. `node -v` não diz v24 mesmo dentro da pasta do projeto
Algum `node` solto (por exemplo um link em `~/.local/bin/node`) está na frente do
fnm no PATH. Veja quem ganha com `which -a node`. O `preview.sh` e o
`scripts/mock-campeche.sh` já se corrigem sozinhos (ativam o Node do
`.node-version` pelo fnm e mostram a versão no começo da saída); para os outros
comandos use o fnm explicitamente, por exemplo
`fnm exec --using=24 pnpm type-check`, ou ajuste o PATH do seu `~/.zshrc`
(a linha do `eval "$(fnm env ...)"` precisa ficar **depois** das que põem
pastas na frente do PATH).

---

## Windows (Git Bash)

O `preview.sh` e o `scripts/mock-campeche.sh` continuam rodando no **Git Bash**:
no Windows o script usa `netstat -ano` e `taskkill` (no Mac e no Linux, `lsof` e
`kill`; a escolha é automática em `scripts/lib/dev-env.sh`). Instale o **Temurin
21** e, se ele não estiver em `~/.jdks/`, exporte
`LEELA_JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21..."`. Os caminhos
`C:/dev/LEELA` e `~/dev/LEELA` dos documentos antigos de `.nirvana/` são
históricos: a raiz de verdade é a pasta onde você clonou (no Mac do dono,
`~/projetos/leela/LEELA`). O caminho Windows foi mantido por compatibilidade,
mas só o Mac foi testado de ponta a ponta nesta versão do guia.

---

## Detalhes técnicos (para quem quiser saber)

- Portas do preview: **Firestore 8180 · Auth 9198 · Functions 5201 · Storage
  9299 · Emulator UI 4001 · hub 4401 · logging 4501** e **painel 5273+** (o
  Eventarc do Emulator escolhe a 9300 sozinho). Os defaults
  8080/9099/5001/4000/5173 (automação/testes) ficam **intocados**.
- O painel lê `VITE_EMULATOR_HOST` / `VITE_EMULATOR_FIRESTORE_PORT` /
  `VITE_EMULATOR_AUTH_PORT` / `VITE_EMULATOR_FUNCTIONS_PORT` para apontar às
  portas alternativas; **sem essas variáveis, o comportamento é exatamente o
  de sempre** (8080/9099/5001).
- O auto-login só liga com `VITE_PREVIEW_AUTOLOGIN=true` (o `preview.sh` define
  isso). Em `pnpm dev`, testes e produção ele é um no-op — zero impacto.
- Antes de subir o Vite, o preview roda
  `pnpm turbo run build --filter='@leela/painel^...' --filter='@leela/functions'`
  — compila as dependências internas do painel (`@leela/core`,
  `@leela/api-client`, `@leela/design-system`) e as Cloud Functions (o
  Emulator carrega `functions/lib/`). O painel resolve esses pacotes pelo
  `dist/` de cada um; um `dist/` velho quebra a montagem do app no navegador
  (tela em branco). Com o cache do Turbo, o passo é quase instantâneo quando
  nada mudou.
- Os seeds rodam via `functions/scripts/preview-seed.ts` (importa as funções de
  `functions/src/seed/*` e aponta ao banco de teste em portas alternativas; o
  seed recusa rodar sem as variáveis do Emulator, então nunca escreve em
  produção).
- Os logs de cada execução ficam numa pasta temporária (o caminho é impresso ao
  encerrar) — úteis se precisar investigar um erro.
- Ao encerrar (Ctrl+C ou `kill`), o script derruba o Vite e o firebase-tools
  **com toda a descendência** (Java, node das Functions) e, se as portas eram
  dele, o que sobrar escutando nelas. Se o preview morre na pré-checagem
  (porta ocupada), ele **não** derruba nada.

# Preview do painel LEELA — ver no navegador em 1 comando

Este guia é para **ver o painel funcionando no seu navegador**, com dados de
exemplo, sem precisar entender de programação. Você roda **um comando**, abre um
link e navega pelas telas como se fosse o produto real.

O preview sobe uma cópia isolada do banco de dados de teste (Firebase Emulator)
em portas próprias, então **não atrapalha** nada que os agentes/automação
estejam fazendo em paralelo.

---

## Antes de começar (já está tudo instalado)

Você só precisa disto — e neste computador já está pronto:

- **Git Bash** (o terminal onde você digita o comando).
- Node, **pnpm**, **firebase-tools** e **Java 21** (em `~/.jdks/jdk-21.0.11+10`).

Não precisa instalar nada. Se algum item faltar, veja **Se algo der errado** no fim.

---

## O único comando

1. Abra o **Git Bash**.
2. Entre na pasta do projeto e rode o preview:

```bash
cd "/c/Users/Vitor Eduardo/Desktop/Vaults/Projetos/LEELA"
bash preview.sh
```

3. Espere aparecer a mensagem verde **"PREVIEW NO AR"**. Ela mostra o link para
   abrir, algo como:

```
     http://127.0.0.1:5273
```

> O número da porta pode variar (5273, 5274, ...). **Use sempre o link que o
> comando imprimir** — a automação usa a 5173, então o preview escolhe outra
> porta livre automaticamente.

4. **Ctrl+clique** no link (ou copie e cole no navegador). Pronto: você já entra
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

**Observação honesta:** alguns números do topo da "Visão geral" (os cartões de
resumo) e os botões que **salvam/alteram** dados dependem do servidor (Cloud
Functions), que **não** sobe neste preview leve. Eles podem aparecer vazios ou
dar um aviso — é esperado. Tudo que é **listagem/visualização** funciona com os
dados de exemplo.

---

## Como parar

Na janela do Git Bash onde o preview está rodando, pressione:

```
Ctrl + C
```

Ele derruba tudo sozinho (painel + banco de teste) e libera as portas. Pode
fechar a janela depois.

---

## Se algo der errado (as 4 mais comuns)

### 1. "porta ocupada" / o link não abre
Já tem um preview aberto, ou a automação está usando as portas.

- Feche outras janelas do Git Bash que estejam rodando `preview.sh` (Ctrl+C).
- Rode de novo `bash preview.sh` — ele procura uma porta livre para o painel.
- Se quiser fixar uma porta específica para o painel:
  ```bash
  PREVIEW_VITE_PORT=5300 bash preview.sh
  ```
- Se as portas do banco de teste (8180/9198) ficarem presas de um travamento
  anterior, feche o Git Bash e abra de novo (ou reinicie o computador) e tente
  outra vez.

### 2. Erro de **Java** ("insufficient memory" ou "Java not found")
O banco de teste usa Java 21.

- **"Java not found"**: confirme que a pasta `~/.jdks/jdk-21.0.11+10` existe.
- **"insufficient memory"**: o computador está sem memória (muita coisa aberta,
  ou a automação rodando o banco de teste dela ao mesmo tempo). Feche programas
  pesados e/ou pare a automação e rode `bash preview.sh` de novo. O preview já
  limita a memória do Java, mas rodar **dois** bancos de teste juntos numa
  máquina modesta pode estourar.

### 3. Erro de dependências / **pnpm** ("tsx não encontrado", "command not found")
Faltou instalar as dependências do projeto.

- Rode uma vez, na raiz do projeto:
  ```bash
  pnpm install
  ```
- Depois rode `bash preview.sh` normalmente.

### 4. Tela **em branco** ao abrir o link
O painel depende de pacotes internos compilados. Se eles estiverem
desatualizados, o navegador mostra uma página vazia, sem mensagem de erro.

- O `preview.sh` já recompila esses pacotes sozinho a cada execução (passo
  "Compilando pacotes internos"). Se mesmo assim a tela ficar em branco,
  pare (Ctrl+C) e rode `bash preview.sh` de novo.
- Persistindo, veja o `build.log` na pasta de logs impressa ao encerrar.

---

## Detalhes técnicos (para quem quiser saber)

- Portas do preview: **Firestore 8180 · Auth 9198 · Emulator UI 4001 · hub 4401
  · logging 4501** e **painel 5273+**. Os defaults 8080/9099/4000/5173
  (automação/testes) ficam **intocados**.
- O painel lê `VITE_EMULATOR_HOST` / `VITE_EMULATOR_FIRESTORE_PORT` /
  `VITE_EMULATOR_AUTH_PORT` para apontar às portas alternativas; **sem essas
  variáveis, o comportamento é exatamente o de sempre** (8080/9099/5001).
- O auto-login só liga com `VITE_PREVIEW_AUTOLOGIN=true` (o `preview.sh` define
  isso). Em `pnpm dev`, testes e produção ele é um no-op — zero impacto.
- Antes de subir o Vite, o preview roda
  `pnpm turbo run build --filter='@leela/painel^...'` — compila só as
  dependências internas do painel (`@leela/core`, `@leela/api-client`,
  `@leela/design-system`). O painel resolve esses pacotes pelo `dist/` de cada
  um; um `dist/` velho quebra a montagem do app no navegador (tela em branco).
  Com o cache do Turbo, o passo é quase instantâneo quando nada mudou.
- Os seeds rodam via `functions/scripts/preview-seed.ts` (importa as funções de
  `functions/src/seed/*` e aponta ao banco de teste em portas alternativas).
- Os logs de cada execução ficam numa pasta temporária (o caminho é impresso ao
  encerrar) — úteis se precisar investigar um erro.

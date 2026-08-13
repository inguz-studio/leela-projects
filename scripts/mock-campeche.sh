#!/usr/bin/env bash
# =============================================================================
# scripts/mock-campeche.sh — MOCK LOCAL para o dono validar gráficos e telas
#
# Sobe, no EMULADOR (nunca em produção), o painel LEELA em :4602 com o evento
# "[Mock] - Campeche Run" e dados ricos o bastante para os gráficos acenderem:
# vendas espalhadas no tempo, PIX nos três estados, cartão parcelado, estorno,
# inscritos com bairros de Florianópolis, check-ins e um clube com registros
# nos três pilares.
#
# Uso (Git Bash):
#   bash scripts/mock-campeche.sh up      → sobe tudo e devolve o terminal
#   bash scripts/mock-campeche.sh down    → derruba tudo
#   bash scripts/mock-campeche.sh status  → o que está de pé
#
# Portas (BLOCO PRÓPRIO — firebase.mockcampeche.json):
#   Firestore 8280 · Auth 9298 · Functions 5301 · Storage 9399
#   Emulator UI 4011 · hub 4411 · logging 4511 · PAINEL DO MOCK 4602
#
# Por que bloco próprio e não o 8180 do preview.sh: as portas do preview são
# de quem rodar `preview.sh` primeiro, e na primeira subida deste mock elas
# estavam ocupadas por outra lane (worktree `leela-wt-responsivo`). Matar o
# emulador de uma lane vizinha é destruir trabalho alheio sem avisar. Com
# bloco próprio, o mock sobe junto com o preview, com o dev server dos
# agentes (8080) e com a :4601 — ninguém pisa em ninguém.
#
# ⛔ ZERO PRODUÇÃO. O emulador roda no projeto `demo-leela`; o build do painel
# usa `--mode mock-emulador` (.env.mock-emulador — sem nenhuma credencial do
# `leela-hub`); e todo seed passa pelo guard `assertEmulatorOnly`. A :4601
# (build de produção conferido à parte) NÃO é tocada por este script — nem para
# subir, nem para derrubar.
#
# Diferença para o preview.sh: aquele BLOQUEIA o terminal (Ctrl+C derruba) e
# serve o Vite em modo dev na 5273. Este devolve o terminal, serve um BUILD
# estático na 4602 e tem um `down` próprio — é o que o dono pediu para poder
# subir de novo depois de um reboot sem manter uma janela aberta.
# =============================================================================

set -uo pipefail

# --- Java 21 (fora do PATH global) -------------------------------------------
# PINADO, não `${JAVA_HOME:-...}`: o JAVA_HOME da máquina aponta para o JDK 17
# (`C:\Program Files\Microsoft\jdk-17...`) e o firebase-tools 15 recusa Java
# abaixo de 21 — respeitar o valor herdado derruba o Firestore Emulator no
# boot com "no longer supports Java version before 21". O preview.sh pina pelo
# mesmo motivo. Override consciente por LEELA_JAVA_HOME (nome próprio, para o
# JAVA_HOME global nunca sequestrar o emulador por acidente).
export JAVA_HOME="${LEELA_JAVA_HOME:-$HOME/.jdks/jdk-21.0.11+10}"
export PATH="$JAVA_HOME/bin:$PATH"
# ⛔ JAVA_TOOL_OPTIONS FICA DE FORA — e isso é uma lição, não um esquecimento.
#
# O preview.sh exporta `JAVA_TOOL_OPTIONS=-Xmx1024m` para limitar o heap da
# JVM. Só que a JVM anuncia a variável imprimindo "Picked up
# JAVA_TOOL_OPTIONS: ..." na saída padrão de TODO processo Java que sobe —
# inclusive o *rules runtime*, cujo handshake o firebase-tools lê justamente
# por essa saída. O resultado, visto neste emulador:
#   !  Unexpected rules runtime error: Picked up JAVA_TOOL_OPTIONS: -Xmx1024m
#   !  firestore: Fatal error occurred:
# Com o rules runtime morto, TODA leitura de cliente é negada. O painel não
# quebra com erro visível: ele tenta, apanha, o react-query repete, e a página
# fica girando com os blocos vazios — exatamente o sintoma de "gráfico que não
# acende" que este mock existe para descartar.
#
# Se algum dia for preciso limitar o heap, tem de ser por um caminho que não
# escreva na saída padrão do rules runtime (o `JAVA_TOOL_OPTIONS` não serve).
unset JAVA_TOOL_OPTIONS

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Portas ------------------------------------------------------------------
FS_PORT=8280
AUTH_PORT=9298
FN_PORT=5301
SG_PORT=9399
UI_PORT=4011
HUB_PORT=4411
LOG_PORT=4511
PAINEL_PORT=4602
EMU_CONFIG=firebase.mockcampeche.json
# Build do mock em diretório PRÓPRIO — a :4601 serve `apps/painel/dist`.
PAINEL_OUTDIR=dist-mock-campeche
EMU_PORTS=("$FS_PORT" "$AUTH_PORT" "$FN_PORT" "$SG_PORT" "$UI_PORT" "$HUB_PORT" "$LOG_PORT")

RUN_DIR="$ROOT/.mock-campeche"
mkdir -p "$RUN_DIR"

EMU_LOG="$RUN_DIR/emulator.log"
SEED_LOG="$RUN_DIR/seed.log"
BUILD_LOG="$RUN_DIR/build.log"
PAINEL_LOG="$RUN_DIR/painel.log"

c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
c_red() { printf '\033[31m%s\033[0m\n' "$1"; }

die() {
  c_red "ERRO: $1"
  [ -n "${2:-}" ] && { echo "----- últimas linhas do log -----"; tail -n 30 "$2" 2>/dev/null; }
  exit 1
}

# PID (Windows) que está OUVINDO uma porta TCP.
pid_on_port() {
  netstat -ano -p tcp 2>/dev/null \
    | grep -E ":$1[[:space:]].*LISTENING" \
    | awk '{print $NF}' | sort -u | head -1
}

port_busy() { [ -n "$(pid_on_port "$1")" ]; }

# Espera uma URL responder por até N segundos; aborta se o processo morrer.
wait_http() {
  local url="$1" name="$2" watch_pid="$3" logf="$4" limit="${5:-120}" i=0
  while [ "$i" -lt "$limit" ]; do
    if curl -s -o /dev/null "$url" 2>/dev/null; then return 0; fi
    if [ -n "$watch_pid" ] && ! kill -0 "$watch_pid" 2>/dev/null; then
      die "$name morreu durante a inicialização." "$logf"
    fi
    sleep 1; i=$((i + 1))
  done
  die "$name não respondeu a tempo em $url." "$logf"
}

# ---------------------------------------------------------------------------
# down
# ---------------------------------------------------------------------------
cmd_down() {
  c_yellow "==> Derrubando o mock (emulador + painel :$PAINEL_PORT)..."
  local p pid mortos=0
  for p in "${EMU_PORTS[@]}" "$PAINEL_PORT"; do
    pid="$(pid_on_port "$p")"
    if [ -n "$pid" ]; then
      taskkill //F //T //PID "$pid" >/dev/null 2>&1 && mortos=$((mortos + 1))
      echo "    porta $p (pid $pid) encerrada"
    fi
  done
  rm -f "$RUN_DIR"/*.pid 2>/dev/null
  c_green "Mock derrubado ($mortos processo(s)). A :4601 não foi tocada."
}

# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------
cmd_status() {
  local p pid rotulo
  echo "porta   serviço                pid"
  for p in "$FS_PORT" "$AUTH_PORT" "$FN_PORT" "$SG_PORT" "$UI_PORT" "$PAINEL_PORT" 4601; do
    case "$p" in
      "$FS_PORT") rotulo="Firestore (mock)" ;;
      "$AUTH_PORT") rotulo="Auth (mock)" ;;
      "$FN_PORT") rotulo="Functions (mock)" ;;
      "$SG_PORT") rotulo="Storage (mock)" ;;
      "$UI_PORT") rotulo="Emulator UI" ;;
      "$PAINEL_PORT") rotulo="PAINEL DO MOCK" ;;
      4601) rotulo="painel de produção" ;;
    esac
    pid="$(pid_on_port "$p")"
    printf '%-7s %-22s %s\n' "$p" "$rotulo" "${pid:--}"
  done
}

# ---------------------------------------------------------------------------
# up
# ---------------------------------------------------------------------------
cmd_up() {
  c_green "==> LEELA · mock [Mock] - Campeche Run (emulador, :$PAINEL_PORT)"

  # 0. Pré-checagens
  [ -d "$JAVA_HOME" ] || die "Java 21 não encontrado em $JAVA_HOME (o Emulator precisa)."
  # Falha ALTA e cedo: sem isto o erro aparece 3 minutos depois, escondido no
  # log do emulador, como "Firestore morreu durante a inicialização".
  # `grep version` e não `head -1`: com JAVA_TOOL_OPTIONS exportado, a PRIMEIRA
  # linha do `java -version` é "Picked up JAVA_TOOL_OPTIONS: ...". O `tr -d`
  # remove o CR do fim de linha do Windows, que colaria no número.
  local JAVA_MAJOR
  JAVA_MAJOR="$("$JAVA_HOME/bin/java" -version 2>&1 | tr -d '\r' \
    | grep -m1 'version "' | sed -E 's/.*version "([0-9]+).*/\1/')"
  case "$JAVA_MAJOR" in
    ''|*[!0-9]*) die "não consegui ler a versão do Java em $JAVA_HOME." ;;
  esac
  [ "$JAVA_MAJOR" -ge 21 ] || die "o Emulator exige Java 21+; $JAVA_HOME é Java $JAVA_MAJOR."
  command -v firebase >/dev/null 2>&1 || die "'firebase' (firebase-tools) não está no PATH."
  command -v pnpm >/dev/null 2>&1 || die "'pnpm' não está no PATH."
  command -v curl >/dev/null 2>&1 || die "'curl' não está no PATH."
  [ -f "$ROOT/.env.mock-emulador" ] || die "falta .env.mock-emulador na raiz (modo de build do mock)."

  TSX_CLI="$(ls node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs 2>/dev/null | head -1)"
  [ -n "$TSX_CLI" ] || die "tsx não encontrado. Rode 'pnpm install' na raiz primeiro."

  local BUSY="" p
  for p in "${EMU_PORTS[@]}" "$PAINEL_PORT"; do
    port_busy "$p" && BUSY="$BUSY $p"
  done
  [ -n "$BUSY" ] && die "porta(s) ocupada(s):$BUSY. Rode 'bash scripts/mock-campeche.sh down' antes."

  # 1. Pacotes internos + Functions ANTES de tudo (o painel resolve @leela/*
  #    pelo dist/ de cada pacote; dist velho = tela branca sem erro no console).
  c_yellow "==> Compilando pacotes internos (@leela/*) + Functions..."
  pnpm turbo run build --filter='@leela/painel^...' --filter='@leela/functions' >"$BUILD_LOG" 2>&1 \
    || die "falha ao compilar os pacotes internos / Functions." "$BUILD_LOG"
  c_green "    Pacotes em dia."

  # 2. Emulator Suite COMPLETO (um processo só, do começo ao fim).
  c_yellow "==> Subindo o Emulator (Firestore :$FS_PORT · Auth :$AUTH_PORT · Functions :$FN_PORT · Storage :$SG_PORT)..."
  nohup firebase emulators:start \
    --only firestore,auth,functions,storage \
    --project demo-leela \
    --config "$EMU_CONFIG" \
    >"$EMU_LOG" 2>&1 &
  local EMU_PID=$!
  echo "$EMU_PID" >"$RUN_DIR/emulator.pid"
  wait_http "http://127.0.0.1:$FS_PORT/" "Firestore Emulator" "$EMU_PID" "$EMU_LOG"
  wait_http "http://127.0.0.1:$AUTH_PORT/" "Auth Emulator" "$EMU_PID" "$EMU_LOG"
  wait_http "http://127.0.0.1:$FN_PORT/" "Functions Emulator" "$EMU_PID" "$EMU_LOG"
  wait_http "http://127.0.0.1:$SG_PORT/" "Storage Emulator" "$EMU_PID" "$EMU_LOG"
  wait_http "http://127.0.0.1:$HUB_PORT/emulators" "Emulator Hub" "$EMU_PID" "$EMU_LOG"
  c_green "    Emulator no ar."

  # ═════════════════════════════════════════════════════════════════════════
  # GATILHOS DESLIGADOS DURANTE O SEED — a lição mais cara desta lane.
  #
  # Com os gatilhos ativos, CADA inscrito gravado dispara 6 Functions
  # (financeiro · demografia · estoque · CRM · virada · automação) e cada uma
  # faz um recompute COMPLETO do evento, com count() por status/kit/
  # modalidade: ~15s de trabalho por inscrito. Os 453 inscritos do seed base
  # mais os 336 do mock viram HORAS de fila; a máquina satura e o navegador
  # nem consegue renderizar a página.
  #
  # Os gatilhos são REDUNDANTES aqui: o seed do Campeche chama as MESMAS
  # rotinas de recompute na mão (recomputarFinanceiroEvento etc.) — é isso
  # que garante o agregado honesto, e não o gatilho.
  #
  # PORTA EXPLÍCITA, NÃO `emulators:export`: a primeira versão desta lane
  # semeava num emulador sem Functions e movia o dado com
  # `firebase emulators:export`. Só que o CLI descobre o emulador pelo HUB
  # indexado por PROJECT ID — e havia OUTRA lane rodando `preview.sh` com o
  # mesmo `demo-leela`. O export saiu do emulador do VIZINHO: como ele tinha
  # o mesmo seed base, o arquivo parecia certo e vinha sem o Campeche
  # inteiro. Falar com o hub por porta fixa (:$HUB_PORT) não tem essa
  # ambiguidade.
  # ═════════════════════════════════════════════════════════════════════════
  c_yellow "==> Desligando gatilhos de background durante o seed..."
  curl -s -X PUT -o /dev/null -w '' "http://127.0.0.1:$HUB_PORT/functions/disableBackgroundTriggers" \
    || die "não consegui desligar os gatilhos no hub :$HUB_PORT."
  c_green "    Gatilhos desligados (o seed calcula os agregados por conta própria)."

  # 3. Seeds — SEMPRE apontados ao emulador (o guard dos seeds aborta sem isto)
  export FIRESTORE_EMULATOR_HOST="127.0.0.1:$FS_PORT"
  export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AUTH_PORT"
  export GCLOUD_PROJECT="demo-leela"

  # CRM_ID_PEPPER — o docId do cliente de CRM é HMAC sob pepper secreto e o
  # código é fail-closed sem ele (hardening A3). O Functions Emulator resolve
  # esse valor de `functions/.secret.local`; o seed roda FORA do emulador e
  # não herda nada, então precisa lê-lo do MESMO arquivo. Tem de ser o mesmo
  # valor, não um qualquer: pepper diferente gera chave diferente, e o mesmo
  # cliente nasceria DUAS vezes — uma pelo gatilho, outra pelo seed.
  # Lido por substituição de parâmetro, nunca ecoado.
  local SECRETS_FILE="$ROOT/functions/.secret.local"
  if [ -z "${CRM_ID_PEPPER:-}" ] && [ -f "$SECRETS_FILE" ]; then
    CRM_ID_PEPPER="$(grep -E '^CRM_ID_PEPPER=' "$SECRETS_FILE" | head -1 | cut -d= -f2- | tr -d '\r"')"
    export CRM_ID_PEPPER
  fi
  [ -n "${CRM_ID_PEPPER:-}" ] \
    || die "CRM_ID_PEPPER não encontrado em functions/.secret.local — o seed do CRM é fail-closed sem ele."

  c_yellow "==> Aplicando o seed base do preview (mundo da Marina + logins)..."
  node "$TSX_CLI" functions/scripts/preview-seed.ts >"$SEED_LOG" 2>&1 \
    || die "falha no seed base." "$SEED_LOG"
  c_green "    Seed base aplicado."

  c_yellow "==> Aplicando o seed do [Mock] - Campeche Run..."
  node "$TSX_CLI" functions/scripts/mock-campeche-seed.ts >>"$SEED_LOG" 2>&1 \
    || die "falha no seed do Campeche." "$SEED_LOG"
  c_green "    Seed do Campeche aplicado."

  # Gatilhos de volta: dali em diante o emulador se comporta como produção
  # (uma inscrição nova no painel recomputa os agregados sozinha).
  c_yellow "==> Religando os gatilhos de background..."
  curl -s -X PUT -o /dev/null -w '' "http://127.0.0.1:$HUB_PORT/functions/enableBackgroundTriggers" \
    || die "não consegui religar os gatilhos no hub :$HUB_PORT."
  c_green "    Gatilhos religados."

  # 4. Build do painel no modo EMULADOR + serviço estático na 4602
  # ⛔ OUTDIR SEPARADO — NÃO É DETALHE: a :4601 é servida por um
  # `vite preview` que lê `apps/painel/dist`. Buildar o mock no outDir padrão
  # SUBSTITUIRIA o build de produção que está no ar ali, em silêncio: a :4601
  # continuaria de pé, servindo o painel do emulador. O mock mora em
  # `dist-mock-campeche` e as duas superfícies nunca se encostam.
  # O build do painel leva ~10 min nesta máquina. Depois de um reboot o
  # bundle continua válido (o que muda é o dado, que o seed refaz), então ele
  # é REUSADO por padrão. `up --rebuild` força — use quando mexer no código
  # do painel.
  if [ "$FORCAR_BUILD" = "1" ] || [ ! -f "$ROOT/apps/painel/$PAINEL_OUTDIR/index.html" ]; then
    c_yellow "==> Buildando o painel (--mode mock-emulador → $PAINEL_OUTDIR)... [~10 min]"
    ( cd "$ROOT/apps/painel" && pnpm exec vite build --mode mock-emulador --outDir "$PAINEL_OUTDIR" ) \
      >>"$BUILD_LOG" 2>&1 || die "falha ao buildar o painel." "$BUILD_LOG"
    c_green "    Painel buildado em apps/painel/$PAINEL_OUTDIR (dist/ de produção intocado)."
  else
    c_green "    Painel já buildado em apps/painel/$PAINEL_OUTDIR (use 'up --rebuild' para refazer)."
  fi

  c_yellow "==> Servindo o painel em :$PAINEL_PORT..."
  ( cd "$ROOT/apps/painel" && nohup pnpm exec vite preview --outDir "$PAINEL_OUTDIR" \
      --host 127.0.0.1 --port "$PAINEL_PORT" --strictPort >"$PAINEL_LOG" 2>&1 & echo $! >"$RUN_DIR/painel.pid" )
  sleep 1
  local PAINEL_PID
  PAINEL_PID="$(cat "$RUN_DIR/painel.pid" 2>/dev/null || echo '')"
  wait_http "http://127.0.0.1:$PAINEL_PORT/" "Painel do mock" "" "$PAINEL_LOG" 60

  # 5. Instruções
  local BASE="http://localhost:$PAINEL_PORT"
  echo ""
  c_green "======================================================================"
  c_green " MOCK NO AR — [Mock] - Campeche Run"
  echo ""
  echo "   Organizador (Marina Castelo · dona do tenant do mock):"
  c_green "     $BASE/?preview=castelo"
  echo "     marina@demo-leela.dev · demo1234"
  echo ""
  echo "   Admin da plataforma (as 8 telas novas do admin):"
  c_green "     $BASE/plataforma?preview=admin"
  echo "     admin@demo-leela.dev · demo1234"
  echo ""
  echo " O painel NÃO tem tela de login: a sessão entra pelo ?preview= da URL"
  echo " (auto-login do emulador). As senhas acima só existem no Emulator Auth."
  echo ""
  echo " Emulator UI (dado cru): http://127.0.0.1:$UI_PORT"
  echo " Logs: $RUN_DIR"
  echo ""
  c_yellow " Para derrubar:  bash scripts/mock-campeche.sh down"
  c_green "======================================================================"
}

FORCAR_BUILD=0
case "${2:-}" in --rebuild) FORCAR_BUILD=1 ;; esac

case "${1:-up}" in
  up) cmd_up ;;
  down) cmd_down ;;
  status) cmd_status ;;
  *) echo "uso: bash scripts/mock-campeche.sh [up|down|status] [--rebuild]"; exit 1 ;;
esac

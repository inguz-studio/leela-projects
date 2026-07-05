#!/usr/bin/env bash
# =============================================================================
# preview.sh — PREVIEW LOCAL DE 1 COMANDO do painel LEELA (para leigos)
#
# Sobe, em PORTAS ALTERNATIVAS (para NÃO colidir com o Emulator dos agentes em
# 8080/9099/4000), uma instância isolada do Firebase Emulator Suite, aplica
# TODOS os dados de exemplo (seed) e abre o painel no navegador já logado.
#
# Portas usadas por este preview:
#   Firestore 8180 · Auth 9198 · Emulator UI 4001 · hub 4401 · logging 4501
#   Painel (Vite) 5273+ (os AGENTES ocupam a 5173 no dev/e2e — o preview usa
#   a 5273 e cai para a próxima livre se necessário; o link certo é impresso)
#
# Uso (Git Bash):   bash preview.sh      (ou ./preview.sh)
# Parar:            Ctrl+C  (derruba tudo de forma limpa)
#
# Override opcional: PREVIEW_VITE_PORT=5273 bash preview.sh
#
# Pré-requisitos já instalados neste ambiente: Node, pnpm, firebase-tools,
# Java 21 em ~/.jdks/jdk-21.0.11+10. Ver PREVIEW.md para troubleshooting.
# =============================================================================

set -uo pipefail

# --- Java 21 (fora do PATH global) -------------------------------------------
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"
export PATH="$JAVA_HOME/bin:$PATH"
# Teto de heap da JVM do Emulator: por padrão a JVM reserva ~25% da RAM, o que
# pode estourar a memória em máquina modesta (ou junto do Emulator dos agentes).
# 512m é folgado para o volume de seed. Override via JAVA_TOOL_OPTIONS.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Xmx512m}"

# --- Raiz do repo ------------------------------------------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# --- Portas do Emulator (alt — isoladas dos agentes) -------------------------
FS_PORT=8180
AUTH_PORT=9198
UI_PORT=4001
HUB_PORT=4401
LOG_PORT=4501
EMU_PORTS=("$FS_PORT" "$AUTH_PORT" "$UI_PORT" "$HUB_PORT" "$LOG_PORT")

# --- Logs (fora do repo, temporário) -----------------------------------------
LOG_DIR="$(mktemp -d 2>/dev/null || echo "${TEMP:-/tmp}/leela-preview-$$")"
mkdir -p "$LOG_DIR"
EMU_LOG="$LOG_DIR/emulator.log"
VITE_LOG="$LOG_DIR/vite.log"
SEED_LOG="$LOG_DIR/seed.log"

EMU_PID=""
VITE_PID=""
VITE_PORT=""

# --- Helpers -----------------------------------------------------------------
c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
c_red() { printf '\033[31m%s\033[0m\n' "$1"; }

# PID (Windows) que está OUVINDO uma porta TCP, via netstat.
pid_on_port() {
  netstat -ano -p tcp 2>/dev/null \
    | grep -E ":$1[[:space:]].*LISTENING" \
    | awk '{print $NF}' | sort -u | head -1
}

port_busy() { [ -n "$(pid_on_port "$1")" ]; }

# Primeira porta livre a partir de $1 (varre até +50).
find_free_port() {
  local p="$1" limit=$(( $1 + 50 ))
  while [ "$p" -lt "$limit" ]; do
    port_busy "$p" || { echo "$p"; return 0; }
    p=$((p + 1))
  done
  return 1
}

# Mata a árvore que segura cada porta do preview (Java do Firestore + node do
# firebase-tools + Vite). taskkill por PID nativo do Windows (//F = /F no MSYS).
cleanup() {
  trap - INT TERM EXIT
  echo ""
  c_yellow "Encerrando o preview..."
  [ -n "$VITE_PID" ] && kill "$VITE_PID" >/dev/null 2>&1
  [ -n "$EMU_PID" ] && kill "$EMU_PID" >/dev/null 2>&1
  local p pid
  for p in "${EMU_PORTS[@]}" ${VITE_PORT:+$VITE_PORT}; do
    pid="$(pid_on_port "$p")"
    [ -n "$pid" ] && taskkill //F //T //PID "$pid" >/dev/null 2>&1
  done
  c_green "Preview encerrado. Logs em: $LOG_DIR"
  exit 0
}
trap cleanup INT TERM EXIT

die() {
  c_red "ERRO: $1"
  [ -n "${2:-}" ] && { echo "----- últimas linhas do log -----"; tail -n 25 "$2" 2>/dev/null; }
  exit 1
}

# Espera uma URL responder (curl) por até 90s; aborta se o processo morrer.
wait_http() {
  local url="$1" name="$2" watch_pid="$3" logf="$4" i=0
  while [ $i -lt 90 ]; do
    if curl -s -o /dev/null "$url" 2>/dev/null; then return 0; fi
    if [ -n "$watch_pid" ] && ! kill -0 "$watch_pid" 2>/dev/null; then
      die "$name morreu durante a inicialização." "$logf"
    fi
    sleep 1; i=$((i + 1))
  done
  die "$name não respondeu a tempo em $url." "$logf"
}

# =============================================================================
# 0. Pré-checagens
# =============================================================================
c_green "==> LEELA · preview local (1 comando)"

[ -d "$JAVA_HOME" ] || die "Java 21 não encontrado em $JAVA_HOME (necessário pelo Emulator)."
command -v firebase >/dev/null 2>&1 || die "'firebase' (firebase-tools) não está no PATH."
command -v pnpm >/dev/null 2>&1 || die "'pnpm' não está no PATH."
command -v curl >/dev/null 2>&1 || die "'curl' não está no PATH."

TSX_CLI="$(ls node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs 2>/dev/null | head -1)"
[ -n "$TSX_CLI" ] || die "tsx não encontrado. Rode 'pnpm install' na raiz primeiro."

# Portas do Emulator livres?
BUSY=""
for p in "${EMU_PORTS[@]}"; do
  port_busy "$p" && BUSY="$BUSY $p"
done
[ -n "$BUSY" ] && die "porta(s) do Emulator ocupada(s):$BUSY. Um preview anterior pode estar de pé. Ver PREVIEW.md > Troubleshooting."

# Porta-base do painel: 5273 (fora da 5173/e2e dos agentes). Override possível.
VITE_BASE="${PREVIEW_VITE_PORT:-5273}"

# Sobe o Vite tentando portas a partir de $VITE_BASE. Se uma porta for tomada
# no meio (agentes cyclando a 5173/e2e), pula para a próxima — à prova de corrida.
start_vite() {
  local p="$1" attempts=0 i ok
  while [ "$attempts" -lt 6 ]; do
    p="$(find_free_port "$p")" || die "sem porta livre para o painel a partir de $1."
    c_yellow "==> Subindo o painel (Vite :$p)..."
    (
      cd "$ROOT/apps/painel" &&
        VITE_USE_EMULATOR=true \
        VITE_PREVIEW_AUTOLOGIN=true \
        VITE_EMULATOR_HOST=127.0.0.1 \
        VITE_EMULATOR_FIRESTORE_PORT="$FS_PORT" \
        VITE_EMULATOR_AUTH_PORT="$AUTH_PORT" \
        pnpm exec vite --host 127.0.0.1 --port "$p" --strictPort >"$VITE_LOG" 2>&1
    ) &
    VITE_PID=$!
    ok=0; i=0
    while [ "$i" -lt 40 ]; do
      if curl -s -o /dev/null "http://127.0.0.1:$p/" 2>/dev/null; then ok=1; break; fi
      kill -0 "$VITE_PID" 2>/dev/null || break
      sleep 1; i=$((i + 1))
    done
    if [ "$ok" = 1 ]; then VITE_PORT="$p"; return 0; fi
    if grep -q "already in use" "$VITE_LOG" 2>/dev/null; then
      c_yellow "    Porta $p foi tomada (agentes?). Tentando a próxima..."
      VITE_PID=""; p=$((p + 1)); attempts=$((attempts + 1)); continue
    fi
    die "Painel (Vite) não subiu." "$VITE_LOG"
  done
  die "não consegui uma porta estável para o painel após várias tentativas."
}

# =============================================================================
# 1. Painel (Vite) PRIMEIRO — reserva a porta antes do boot lento do Emulator,
#    evitando corrida com os agentes.
# =============================================================================
start_vite "$VITE_BASE"
c_green "    Painel no ar em :$VITE_PORT (aguardando o Emulator para os dados)."

# =============================================================================
# 2. Emulator Suite (portas alt) — isolado dos agentes
# =============================================================================
c_yellow "==> Subindo Firebase Emulator (Firestore :$FS_PORT · Auth :$AUTH_PORT · UI :$UI_PORT)..."
firebase emulators:start \
  --only firestore,auth \
  --project demo-leela \
  --config firebase.preview.json \
  >"$EMU_LOG" 2>&1 &
EMU_PID=$!
wait_http "http://127.0.0.1:$FS_PORT/" "Firestore Emulator" "$EMU_PID" "$EMU_LOG"
wait_http "http://127.0.0.1:$AUTH_PORT/" "Auth Emulator" "$EMU_PID" "$EMU_LOG"
c_green "    Emulator no ar."

# =============================================================================
# 3. Seeds + usuários de login (apontando para as portas alt)
# =============================================================================
c_yellow "==> Aplicando dados de exemplo (seed) e criando logins..."
export FIRESTORE_EMULATOR_HOST="127.0.0.1:$FS_PORT"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AUTH_PORT"
export GCLOUD_PROJECT="demo-leela"
node "$TSX_CLI" functions/scripts/preview-seed.ts >"$SEED_LOG" 2>&1 \
  || die "falha ao aplicar os seeds." "$SEED_LOG"
c_green "    Seeds aplicados."

# =============================================================================
# 4. Instruções
# =============================================================================
BASE="http://127.0.0.1:$VITE_PORT"
echo ""
c_green "======================================================================"
c_green " PREVIEW NO AR — abra no navegador:"
echo ""
c_green "     $BASE"
echo ""
echo " Você já entra LOGADO. Para explorar cada área (dados de seed):"
echo "   Visão geral + Eventos (Castelo Produções):"
echo "     $BASE/?preview=castelo"
echo "   Clubes / membros / desafios (Corrida Perfeita Sul):"
echo "     $BASE/clubes?preview=corrida"
echo "   Admin da plataforma (tenants + termos):"
echo "     $BASE/plataforma?preview=admin"
echo ""
echo " Login manual (se precisar): marina@demo-leela.dev · senha demo1234"
echo " Emulator UI (opcional, ver dados crus): http://127.0.0.1:$UI_PORT"
echo ""
c_yellow " Para PARAR tudo: pressione Ctrl+C aqui nesta janela."
c_green "======================================================================"

# Bloqueia até Ctrl+C (ou até o Vite cair) — então o trap limpa tudo.
wait "$VITE_PID"

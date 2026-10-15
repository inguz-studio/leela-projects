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
# Uso (macOS, Linux ou Git Bash):   bash preview.sh      (ou ./preview.sh)
# Parar:            Ctrl+C  (derruba tudo de forma limpa: painel, Emulator, Java)
#
# Override opcional: PREVIEW_VITE_PORT=4611 bash preview.sh   (porta do painel;
#                    o gate visual do .nirvana/ espera o painel na 4611)
#                    LEELA_JAVA_HOME=/caminho/do/jdk-21 bash preview.sh
#
# Pré-requisitos: Node 24 (fnm), pnpm 11.9, firebase-tools e um Java 21+ (o
# firebase-tools 15 recusa Java abaixo de 21). No macOS: PREVIEW.md, "Mac".
# O Java é procurado por scripts/lib/dev-env.sh (LEELA_JAVA_HOME, JAVA_HOME,
# ~/.jdks, Homebrew openjdk@21...). Ver PREVIEW.md para troubleshooting.
# =============================================================================

set -uo pipefail

# --- Raiz do repo ------------------------------------------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Portas, processos e Java (macOS / Linux / Git Bash) — ver scripts/lib/dev-env.sh
# shellcheck source=scripts/lib/dev-env.sh
. "$ROOT/scripts/lib/dev-env.sh"

# --- Java 21+ ------------------------------------------------------------------
# JAVA_TOOL_OPTIONS FICA DE FORA: a JVM anuncia a variável ("Picked up
# JAVA_TOOL_OPTIONS: ...") na saída de todo processo Java, inclusive o rules
# runtime do Firestore, cujo handshake o firebase-tools lê por essa mesma saída;
# o resultado é toda leitura de cliente negada, sem erro na tela. (Lição já paga
# em scripts/mock-campeche.sh. O teto de heap que o preview.sh exportava aqui era
# de uma máquina de 8 GB.)
unset JAVA_TOOL_OPTIONS

# --- Portas do Emulator (alt — isoladas dos agentes) -------------------------
FS_PORT=8180
AUTH_PORT=9198
FN_PORT=5201
SG_PORT=9299
UI_PORT=4001
HUB_PORT=4401
LOG_PORT=4501
EMU_PORTS=("$FS_PORT" "$AUTH_PORT" "$FN_PORT" "$SG_PORT" "$UI_PORT" "$HUB_PORT" "$LOG_PORT")

# --- Logs (fora do repo, temporário) -----------------------------------------
TMP_BASE="${TMPDIR:-${TEMP:-/tmp}}"
LOG_DIR="$(mktemp -d "${TMP_BASE%/}/leela-preview.XXXXXX" 2>/dev/null || echo "/tmp/leela-preview-$$")"
mkdir -p "$LOG_DIR"
EMU_LOG="$LOG_DIR/emulator.log"
VITE_LOG="$LOG_DIR/vite.log"
SEED_LOG="$LOG_DIR/seed.log"
BUILD_LOG="$LOG_DIR/build.log"

EMU_PID=""
VITE_PID=""
VITE_PORT=""
# 1 só depois de a pré-checagem provar as portas do Emulator livres: o cleanup só
# derruba "quem escuta nessas portas" se elas forem nossas (senão um preview que
# morre na pré-checagem derrubaria o Emulator de OUTRA frente).
PORTS_OWNED=0

# --- Helpers -----------------------------------------------------------------
c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
c_red() { printf '\033[31m%s\033[0m\n' "$1"; }

# Derruba o que o preview subiu: o Vite e o firebase-tools com toda a descendência
# (Java do Firestore, node das Functions, esbuild) e, se as portas são nossas, o que
# sobrar escutando nelas. Ctrl+C (INT) e kill (TERM) saem com 0; saída por erro
# (die) mantém o código de erro.
cleanup() {
  local rc="${1:-0}" p
  trap - INT TERM EXIT
  echo ""
  c_yellow "Encerrando o preview..."
  # stderr para /dev/null: o bash avisa "Terminated: 15 ( cd ... pnpm exec vite ... )"
  # quando reaparece o job que a gente acabou de matar; é ruído, não erro.
  {
    [ -n "$VITE_PID" ] && leela_kill_tree "$VITE_PID"
    [ -n "$EMU_PID" ] && leela_kill_tree "$EMU_PID"
    if [ "$PORTS_OWNED" = 1 ]; then
      for p in "${EMU_PORTS[@]}"; do leela_kill_port "$p"; done
      [ -n "$VITE_PORT" ] && leela_kill_port "$VITE_PORT"
    fi
    [ -n "$VITE_PID" ] && wait "$VITE_PID"
    [ -n "$EMU_PID" ] && wait "$EMU_PID"
  } 2>/dev/null
  c_green "Preview encerrado. Logs em: $LOG_DIR"
  exit "$rc"
}
trap 'cleanup 0' INT TERM
trap 'cleanup $?' EXIT

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

leela_use_project_node "$ROOT"
c_green "    Node: $(node -v 2>/dev/null || echo '?') · pnpm: $(pnpm -v 2>/dev/null || echo '?')"

JAVA_HOME_ACHADO="$(leela_find_java 21)" \
  || die "Java 21+ não encontrado (o Emulator precisa; o firebase-tools 15 recusa Java abaixo de 21). $(leela_java_hint)"
export JAVA_HOME="$JAVA_HOME_ACHADO"
export PATH="$JAVA_HOME/bin:$PATH"
c_green "    Java: $JAVA_HOME"

command -v firebase >/dev/null 2>&1 || die "'firebase' (firebase-tools) não está no PATH (npm i -g firebase-tools)."
command -v pnpm >/dev/null 2>&1 || die "'pnpm' não está no PATH."
command -v curl >/dev/null 2>&1 || die "'curl' não está no PATH."
if [ "$LEELA_WIN" = 0 ] && ! command -v lsof >/dev/null 2>&1; then
  c_yellow "    Aviso: 'lsof' não está no PATH — a checagem de porta usa uma conexão de teste e o encerramento não acha quem escuta."
fi

TSX_CLI="$(ls node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs 2>/dev/null | head -1)"
[ -n "$TSX_CLI" ] || die "tsx não encontrado. Rode 'pnpm install' na raiz primeiro."

# Portas do Emulator livres?
BUSY=""
for p in "${EMU_PORTS[@]}"; do
  leela_port_busy "$p" && BUSY="$BUSY $p"
done
[ -n "$BUSY" ] && die "porta(s) do Emulator ocupada(s):$BUSY. Um preview anterior pode estar de pé. Ver PREVIEW.md, seção \"Se algo der errado\" (porta ocupada)."
PORTS_OWNED=1

# Porta-base do painel: 5273 (fora da 5173/e2e dos agentes). Override possível.
VITE_BASE="${PREVIEW_VITE_PORT:-5273}"

# Sobe o Vite tentando portas a partir de $VITE_BASE. Se uma porta for tomada
# no meio (agentes cyclando a 5173/e2e), pula para a próxima — à prova de corrida.
start_vite() {
  local p="$1" attempts=0 i ok
  while [ "$attempts" -lt 6 ]; do
    p="$(leela_find_free_port "$p")" || die "sem porta livre para o painel a partir de $1."
    c_yellow "==> Subindo o painel (Vite :$p)..."
    (
      cd "$ROOT/apps/painel" &&
        VITE_USE_EMULATOR=true \
        VITE_PREVIEW_AUTOLOGIN=true \
        VITE_EMULATOR_HOST=127.0.0.1 \
        VITE_EMULATOR_FIRESTORE_PORT="$FS_PORT" \
        VITE_EMULATOR_AUTH_PORT="$AUTH_PORT" \
        VITE_EMULATOR_FUNCTIONS_PORT="$FN_PORT" \
        VITE_EMULATOR_STORAGE_PORT="$SG_PORT" \
        VITE_LEELA_URL="${VITE_LEELA_URL:-http://127.0.0.1:3000}" \
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
# 1. Pacotes internos ANTES do Vite — o painel resolve @leela/* pelo `dist/`
#    de cada pacote (package.json > exports). Sem rebuild, um dist desatualizado
#    (ex.: export novo só no src/) derruba a avaliação de módulos no navegador
#    (SyntaxError de export ausente) e a tela fica em branco, sem nada no
#    console. O fluxo dos agentes passa por `turbo build` (dependsOn ^build);
#    o preview precisa do mesmo pré-passo. Turbo com cache: rápido quando fresco.
# =============================================================================
c_yellow "==> Compilando pacotes internos do painel (@leela/*) + Functions..."
pnpm turbo run build --filter='@leela/painel^...' --filter='@leela/functions' >"$BUILD_LOG" 2>&1 \
  || die "falha ao compilar os pacotes internos (@leela/*) / Functions." "$BUILD_LOG"
c_green "    Pacotes internos em dia."

# =============================================================================
# 2. Painel (Vite) — reserva a porta antes do boot lento do Emulator,
#    evitando corrida com os agentes.
# =============================================================================
start_vite "$VITE_BASE"
c_green "    Painel no ar em :$VITE_PORT (aguardando o Emulator para os dados)."

# =============================================================================
# 3. Emulator Suite (portas alt) — isolado dos agentes
# =============================================================================
c_yellow "==> Subindo Firebase Emulator (Firestore :$FS_PORT · Auth :$AUTH_PORT · Functions :$FN_PORT · Storage :$SG_PORT · UI :$UI_PORT)..."
firebase emulators:start \
  --only firestore,auth,functions,storage \
  --project demo-leela \
  --config firebase.preview.json \
  >"$EMU_LOG" 2>&1 &
EMU_PID=$!
wait_http "http://127.0.0.1:$FS_PORT/" "Firestore Emulator" "$EMU_PID" "$EMU_LOG"
wait_http "http://127.0.0.1:$AUTH_PORT/" "Auth Emulator" "$EMU_PID" "$EMU_LOG"
wait_http "http://127.0.0.1:$FN_PORT/" "Functions Emulator" "$EMU_PID" "$EMU_LOG"
wait_http "http://127.0.0.1:$SG_PORT/" "Storage Emulator" "$EMU_PID" "$EMU_LOG"
c_green "    Emulator no ar."

# =============================================================================
# 4. Seeds + usuários de login (apontando para as portas alt)
# =============================================================================
c_yellow "==> Aplicando dados de exemplo (seed) e criando logins..."
export FIRESTORE_EMULATOR_HOST="127.0.0.1:$FS_PORT"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AUTH_PORT"
export GCLOUD_PROJECT="demo-leela"
node "$TSX_CLI" functions/scripts/preview-seed.ts >"$SEED_LOG" 2>&1 \
  || die "falha ao aplicar os seeds." "$SEED_LOG"
c_green "    Seeds aplicados."

# =============================================================================
# 5. Instruções
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

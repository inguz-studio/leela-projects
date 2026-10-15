#!/usr/bin/env bash
# =============================================================================
# scripts/lib/dev-env.sh — peças comuns de `preview.sh` e `scripts/mock-campeche.sh`
#
# Resolve, para macOS, Linux e Git Bash (Windows), as três coisas que os scripts
# de preview não podem chutar:
#   - quem está OUVINDO uma porta TCP        → leela_pids_on_port / leela_port_busy
#   - derrubar um processo e os filhos dele  → leela_kill_tree / leela_kill_port
#   - achar um Java 21+ (o firebase-tools 15 recusa Java abaixo de 21)
#                                            → leela_find_java
#
# Uso: `source` (nunca executar). Compatível com o bash 3.2 do macOS.
#
#   macOS/Linux : lsof (porta), pgrep -P + kill (árvore de processos)
#   Git Bash    : netstat -ano + taskkill //F //T //PID (como era antes)
# =============================================================================

case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) LEELA_WIN=1 ;;
  *) LEELA_WIN=0 ;;
esac

# PIDs que estão OUVINDO a porta TCP $1 (um por linha; vazio = porta livre).
leela_pids_on_port() {
  if [ "$LEELA_WIN" = 1 ]; then
    netstat -ano -p tcp 2>/dev/null \
      | grep -E ":$1[[:space:]].*LISTENING" \
      | awk '{print $NF}' | sort -u
  else
    lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | sort -u
  fi
}

# Porta $1 ocupada? Sem `lsof` (raro: macOS e Linux trazem) cai para uma conexão
# de teste — não dá o PID, mas não deixa a checagem responder "livre" no escuro.
leela_port_busy() {
  [ -n "$(leela_pids_on_port "$1")" ] && return 0
  if [ "$LEELA_WIN" = 0 ] && ! command -v lsof >/dev/null 2>&1; then
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && return 0
  fi
  return 1
}

# Primeira porta livre a partir de $1 (varre até +50).
leela_find_free_port() {
  local p="$1" limit=$(( $1 + 50 ))
  while [ "$p" -lt "$limit" ]; do
    leela_port_busy "$p" || { echo "$p"; return 0; }
    p=$((p + 1))
  done
  return 1
}

# PIDs descendentes de $1 (filhos, netos...), um por linha.
leela_descendants() {
  local kids k
  kids="$(pgrep -P "$1" 2>/dev/null)" || return 0
  for k in $kids; do
    echo "$k"
    leela_descendants "$k"
  done
}

# Derruba o processo $1 e TODA a descendência dele: TERM, espera até ~5 s, e KILL
# no que sobrar. (Firebase CLI → Java do Firestore, node das Functions, Vite →
# esbuild: matar só o pai deixaria os filhos de pé.)
leela_kill_tree() {
  local pid="$1" all p alive i
  [ -n "$pid" ] || return 0
  if [ "$LEELA_WIN" = 1 ]; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1
    return 0
  fi
  all="$pid $(leela_descendants "$pid" | tr '\n' ' ')"
  for p in $all; do kill -TERM "$p" 2>/dev/null; done
  i=0
  while [ "$i" -lt 20 ]; do
    alive=""
    for p in $all; do kill -0 "$p" 2>/dev/null && alive="$alive $p"; done
    [ -z "$alive" ] && return 0
    sleep 0.25
    i=$((i + 1))
  done
  for p in $alive; do kill -KILL "$p" 2>/dev/null; done
  return 0
}

# Derruba quem está ouvindo a porta $1 (com a descendência). Só chame para porta
# que o próprio script verificou livre e subiu: aqui não se pergunta de quem é.
leela_kill_port() {
  local pid
  for pid in $(leela_pids_on_port "$1"); do
    leela_kill_tree "$pid"
  done
}

# --- Java ---------------------------------------------------------------------
# Versão principal do JDK em $1 (a pasta que tem bin/java); vazio se não der.
# `grep 'version "'` e não `head -1`: com JAVA_TOOL_OPTIONS no ambiente a primeira
# linha do `java -version` é "Picked up JAVA_TOOL_OPTIONS...". O `tr` tira o CR
# do Windows.
leela_java_major() {
  [ -x "$1/bin/java" ] || return 1
  "$1/bin/java" -version 2>&1 | tr -d '\r' | grep -m1 'version "' \
    | sed -E 's/.*version "([0-9]+).*/\1/'
}

# O JDK em $1 tem major >= $2 (padrão 21)?
leela_java_ok() {
  local m
  m="$(leela_java_major "$1")" || return 1
  case "$m" in ''|*[!0-9]*) return 1 ;; esac
  [ "$m" -ge "${2:-21}" ]
}

# Imprime a pasta (JAVA_HOME) de um JDK >= $1 (padrão 21), ou sai com 1.
# Ordem: LEELA_JAVA_HOME (override explícito: se estiver errado NÃO cai para outro
# JDK em silêncio) → JAVA_HOME do ambiente → ~/.jdks → macOS (java_home, Homebrew
# openjdk@21, /Library/Java) → Linux (/usr/lib/jvm). Todo candidato passa pela
# checagem de versão: o JAVA_HOME global da máquina antiga era um JDK 17 e
# "respeitar o herdado" derrubava o emulador no boot.
leela_find_java() {
  local min="${1:-21}" c jh
  if [ -n "${LEELA_JAVA_HOME:-}" ]; then
    leela_java_ok "$LEELA_JAVA_HOME" "$min" && { echo "$LEELA_JAVA_HOME"; return 0; }
    return 1
  fi
  jh=""
  if [ "$LEELA_WIN" = 0 ] && [ -x /usr/libexec/java_home ]; then
    jh="$(/usr/libexec/java_home -v "$min"+ 2>/dev/null)"
  fi
  for c in \
    "${JAVA_HOME:-}" \
    "$HOME"/.jdks/* \
    "$jh" \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /Library/Java/JavaVirtualMachines/*/Contents/Home \
    /usr/lib/jvm/*; do
    [ -n "$c" ] || continue
    if leela_java_ok "$c" "$min"; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

# Mensagem de instalação do Java 21 por sistema.
leela_java_hint() {
  case "$(uname -s 2>/dev/null)" in
    Darwin) echo "macOS: brew install openjdk@21 e depois: mkdir -p ~/.jdks && ln -sfn \"\$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home\" ~/.jdks/jdk-21 (ou exporte LEELA_JAVA_HOME)" ;;
    Linux) echo "Linux: instale um JDK 21 (ex.: sudo apt install openjdk-21-jdk) ou exporte LEELA_JAVA_HOME" ;;
    *) echo "instale o Temurin 21 e exporte LEELA_JAVA_HOME apontando para a pasta dele" ;;
  esac
}

# --- Node ---------------------------------------------------------------------
# Põe no PATH o Node da versão fixada em `.node-version` (via fnm), se o `node` que
# o shell entrega for de outra versão principal. Sem isto, um `node` solto na frente
# do fnm no PATH (ex.: um link em ~/.local/bin) faz o preview rodar com outro Node
# sem ninguém perceber. Nunca falha: sem fnm ou sem a versão instalada só avisa.
# Chame depois do `cd` para a raiz do repo ($1 = raiz).
leela_use_project_node() {
  local root="$1" want have
  [ -f "$root/.node-version" ] || return 0
  want="$(tr -d '[:space:]v' < "$root/.node-version")"
  want="${want%%.*}"
  have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
  if [ "$have" != "$want" ] && command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --shell bash 2>/dev/null)" 2>/dev/null
    (cd "$root" && fnm use --silent-if-unchanged </dev/null >/dev/null 2>&1)
    have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
  fi
  if [ "$have" != "$want" ]; then
    echo "    Aviso: o projeto usa Node $want (.node-version) e este shell entrega Node ${have:-?}. Rode 'fnm install' e 'fnm use' na pasta do projeto (PREVIEW.md)." >&2
  fi
  return 0
}

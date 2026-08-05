// =============================================================================
// packages/api-client/scripts/auditar-indices-firestore.mjs
//
// GUARDA CONTRA FALHA SILENCIOSA DE ÍNDICE (lane DIAG-CLUBES).
//
// O defeito que originou este script: `listClubesByTenant` faz
// `where('tenantId','==',X) + orderBy('criadoEm','desc')` em `clubes`, e o
// índice composto correspondente nunca existiu. Em produção o Firestore
// responde FAILED_PRECONDITION; o painel engole a rejeição e desenha lista
// vazia. Nada no CI pegava isso, porque **o emulador do Firestore não cobra
// índice**: ele serve qualquer combinação de filtro e ordenação. Um teste de
// integração no emulador passa com folga enquanto produção erra.
//
// Este script fecha a lacuna SEM emulador e SEM rede: lê o AST de
// `packages/api-client/src`, reconstrói cada query do SDK cliente, decide
// quais exigem índice composto e confere contra `firestore.indexes.json`.
//
// ---------------------------------------------------------------------------
// O QUE ESTE SCRIPT **NÃO** PROVA
// ---------------------------------------------------------------------------
//  1. NÃO prova que o índice está DEPLOYADO. Ele confere o arquivo, não o
//     servidor. `firebase deploy --only firestore:indexes` continua sendo um
//     passo humano; um índice declarado aqui e não deployado quebra igual.
//  2. NÃO cobre `functions/` (Admin SDK, encadeamento `.where().orderBy()`).
//     A varredura da lane conferiu functions/ contra produção e achou zero
//     pendências; se aquele padrão passar a ser gerado dinamicamente, esta
//     guarda não vê.
//  3. NÃO valida `fieldOverrides` (índices de campo único / COLLECTION_GROUP).
//     ⚠️ fieldOverride NÃO é aditivo — um override COLLECTION_GROUP apaga o
//     escopo COLLECTION do campo (defeito D1 da REV-B4). Mexer ali é manual.
//  4. NÃO prova que a query devolve o dado CERTO — só que ela é planejável.
//  5. NÃO enxerga query montada por string/reflexão nem constraint vinda de
//     fora do módulo. Site que ele não conseguir resolver vira ERRO explícito
//     (INDETERMINADO), nunca silêncio.
// =============================================================================

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_PACOTE = path.resolve(AQUI, "..");
const RAIZ_REPO = path.resolve(RAIZ_PACOTE, "..", "..");
const DIR_SRC = path.join(RAIZ_PACOTE, "src");
const ARQ_INDICES = path.join(RAIZ_REPO, "firestore.indexes.json");

// Constraints que não influenciam a escolha de índice (cursores e teto).
const IRRELEVANTES = new Set(["limit", "startAt", "startAfter", "endAt", "endBefore"]);
// Operadores tratados como IGUALDADE para fins de índice: o Firestore resolve
// `in` como disjunção de igualdades e faz merge de índices de campo único.
const OPS_IGUALDADE = new Set(["==", "in"]);
const OPS_ARRAY = new Set(["array-contains", "array-contains-any"]);
const OPS_RANGE = new Set(["<", "<=", ">", ">=", "!=", "not-in"]);

// ---------------------------------------------------------------------------
// Coleta de arquivos + mapa de constantes de nome de coleção
// ---------------------------------------------------------------------------

function listarTs(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      listarTs(p, acc);
    } else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

/** `export const COLECAO_X = 'x'` de qualquer pacote → { COLECAO_X: 'x' }. */
function mapearConstantes(dirs) {
  const mapa = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of listarTs(dir)) {
      const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
      const visitar = (n) => {
        if (
          ts.isVariableDeclaration(n) &&
          ts.isIdentifier(n.name) &&
          n.initializer &&
          ts.isStringLiteral(n.initializer)
        ) {
          mapa.set(n.name.text, n.initializer.text);
        }
        ts.forEachChild(n, visitar);
      };
      visitar(sf);
    }
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Resolução da coleção-alvo de um `query(<fonte>, ...)`
// ---------------------------------------------------------------------------

/** Último segmento textual de `collection(db, 'a', x, 'b')` → 'b'. */
function idDeChamadaCollection(chamada, constantes) {
  const args = chamada.arguments.slice(1);
  if (args.length === 0) return null;
  const ultimo = args[args.length - 1];
  if (ts.isStringLiteral(ultimo)) return ultimo.text;
  if (ts.isIdentifier(ultimo) && constantes.has(ultimo.text)) return constantes.get(ultimo.text);
  return null;
}

/**
 * Resolve a fonte do `query(...)` para { colecao, grupo }.
 * Cobre: `collection(...)` inline, `collectionGroup(...)`, identificador local
 * (`const col = collection(...)`) e helper do módulo que retorna um collection.
 */
function resolverFonte(no, sf, constantes) {
  if (ts.isCallExpression(no) && ts.isIdentifier(no.expression)) {
    const nome = no.expression.text;
    if (nome === "collection") {
      const id = idDeChamadaCollection(no, constantes);
      return id ? { colecao: id, grupo: false } : null;
    }
    if (nome === "collectionGroup") {
      const a = no.arguments[1];
      if (a && ts.isStringLiteral(a)) return { colecao: a.text, grupo: true };
      if (a && ts.isIdentifier(a) && constantes.has(a.text))
        return { colecao: constantes.get(a.text), grupo: true };
      return null;
    }
    // Helper do próprio módulo: procura a expressão retornada.
    const decl = acharFuncao(sf, nome);
    if (decl) {
      const ret = acharReturn(decl);
      if (ret) return resolverFonte(ret, sf, constantes);
    }
    return null;
  }
  if (ts.isIdentifier(no)) {
    const decl = acharVariavel(funcaoQueContem(no) ?? sf, no.text);
    if (decl && decl.initializer) return resolverFonte(decl.initializer, sf, constantes);
  }
  return null;
}

function acharFuncao(sf, nome) {
  let achado = null;
  const visitar = (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === nome) achado = n;
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === nome &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    )
      achado = n.initializer;
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return achado;
}

function acharReturn(fn) {
  if (ts.isArrowFunction(fn) && fn.body && !ts.isBlock(fn.body)) return fn.body;
  let achado = null;
  const visitar = (n) => {
    if (ts.isReturnStatement(n) && n.expression && !achado) achado = n.expression;
    ts.forEachChild(n, visitar);
  };
  if (fn.body) visitar(fn.body);
  return achado;
}

/**
 * Declaração de `nome` visível a partir de `escopo`. Procura da função que
 * contém o uso para fora — sem isso, duas funções do mesmo módulo que usam
 * `const constraints` se contaminam (cada uma herdaria os `push` da outra).
 */
function acharVariavel(escopo, nome) {
  let atual = escopo;
  while (atual) {
    let achado = null;
    const visitar = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nome)
        achado = n;
      // Não desce para funções aninhadas: o escopo delas não é este.
      if (
        n !== atual &&
        (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n))
      )
        return;
      ts.forEachChild(n, visitar);
    };
    visitar(atual);
    if (achado) return achado;
    atual =
      funcaoQueContem(atual) ??
      (atual.kind === ts.SyntaxKind.SourceFile ? null : atual.getSourceFile());
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extração das constraints (incluindo as CONDICIONAIS)
// ---------------------------------------------------------------------------

/** `where('a','==',x)` / `orderBy('a','desc')` → descritor, ou null. */
function lerConstraint(no) {
  if (!ts.isCallExpression(no) || !ts.isIdentifier(no.expression)) return null;
  const fn = no.expression.text;
  if (IRRELEVANTES.has(fn) || fn === "firestoreLimit") return { tipo: "ignorar" };
  if (fn === "where") {
    const [campo, op] = no.arguments;
    if (!campo || !ts.isStringLiteral(campo) || !op || !ts.isStringLiteral(op)) return null;
    return { tipo: "where", campo: campo.text, op: op.text };
  }
  if (fn === "orderBy") {
    const [campo, dir] = no.arguments;
    if (!campo) return null;
    // orderBy(documentId()) / orderBy('__name__') não muda a exigência.
    if (!ts.isStringLiteral(campo)) return { tipo: "ignorar" };
    const direcao = dir && ts.isStringLiteral(dir) ? dir.text : "asc";
    return { tipo: "orderBy", campo: campo.text, direcao };
  }
  return null;
}

/** true se o nó está sob um `if`/ternário dentro da função — constraint opcional. */
function ehCondicional(no, limite) {
  let p = no.parent;
  while (p && p !== limite) {
    if (ts.isIfStatement(p) || ts.isConditionalExpression(p)) return true;
    p = p.parent;
  }
  return false;
}

function funcaoQueContem(no) {
  let p = no.parent;
  while (p) {
    if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p))
      return p;
    p = p.parent;
  }
  return null;
}

/**
 * Junta as constraints de uma chamada `query(fonte, ...args)`, resolvendo
 * spreads de array local e suas mutações (`push`/`unshift`/`splice`).
 * Devolve { itens: [{c, opcional}], indeterminado: bool }.
 */
function coletarConstraints(chamada, sf) {
  const itens = [];
  let indeterminado = false;

  const adicionar = (no, opcional) => {
    const c = lerConstraint(no);
    if (!c) {
      indeterminado = true;
      return;
    }
    if (c.tipo !== "ignorar") itens.push({ c, opcional });
  };

  for (const arg of chamada.arguments.slice(1)) {
    if (ts.isSpreadElement(arg)) {
      if (!ts.isIdentifier(arg.expression)) {
        indeterminado = true;
        continue;
      }
      const decl = acharVariavel(funcaoQueContem(chamada) ?? sf, arg.expression.text);
      if (!decl) {
        indeterminado = true;
        continue;
      }
      const escopo = funcaoQueContem(decl);
      if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
        for (const el of decl.initializer.elements) adicionar(el, false);
      } else if (decl.initializer && !ts.isArrayLiteralExpression(decl.initializer)) {
        indeterminado = true;
      }
      // Mutações do array dentro da mesma função.
      if (escopo) {
        const visitar = (n) => {
          if (
            ts.isCallExpression(n) &&
            ts.isPropertyAccessExpression(n.expression) &&
            ts.isIdentifier(n.expression.expression) &&
            n.expression.expression.text === arg.expression.text
          ) {
            const metodo = n.expression.name.text;
            const opcional = ehCondicional(n, escopo);
            if (metodo === "push" || metodo === "unshift") {
              for (const a of n.arguments) adicionar(a, opcional);
            } else if (metodo === "splice") {
              // splice(i, 0, X) — os inseridos vêm do 3º argumento em diante.
              for (const a of n.arguments.slice(2)) adicionar(a, opcional);
            }
          }
          ts.forEachChild(n, visitar);
        };
        visitar(escopo);
      }
    } else {
      adicionar(arg, false);
    }
  }
  return { itens, indeterminado };
}

// ---------------------------------------------------------------------------
// Regra de exigência de índice composto
// ---------------------------------------------------------------------------

/**
 * Regra calibrada contra o Firestore de produção (44 sondagens REST na lane
 * DIAG-CLUBES — zero falso positivo, zero falso negativo no estado atual):
 *
 *  - só igualdades (`==`/`in`), sem ordenação  → merge de índices single-field,
 *    NÃO exige composto (inclui igualdade + `array-contains`);
 *  - ordenação por campo X com filtro em campo ≠ X → EXIGE composto;
 *  - desigualdade (`<`,`<=`,`>`,`>=`,`!=`,`not-in`) somada a qualquer outro
 *    filtro, ou duas desigualdades em campos distintos → EXIGE composto.
 */
function exigeComposto({ igualdades, arrays, ranges, ordens }) {
  const camposOrdenados = ordens.map((o) => o.campo);
  const camposFiltrados = [...igualdades, ...arrays, ...ranges.map((r) => r.campo)];
  if (camposOrdenados.length > 0 && camposFiltrados.some((f) => !camposOrdenados.includes(f)))
    return true;
  const camposRange = [...new Set(ranges.map((r) => r.campo))];
  if (camposRange.length >= 2) return true;
  if (camposRange.length === 1 && igualdades.length + arrays.length >= 1) return true;
  return false;
}

/** Assinatura do índice exigido: igualdades (ordem livre) + ordens (ordem fixa). */
function indiceExigido({ igualdades, arrays, ranges, ordens }) {
  const prefixo = [...new Set([...igualdades, ...arrays])].sort();
  const rangeSemOrdem = ranges
    .map((r) => r.campo)
    .filter((c) => !ordens.some((o) => o.campo === c));
  const sufixo = [
    ...[...new Set(rangeSemOrdem)].map((c) => ({ campo: c, direcao: "asc" })),
    ...ordens,
  ];
  return { prefixo, sufixo };
}

/** O índice do arquivo serve a query? Aceita leitura invertida do índice. */
function indiceServe(indice, exigido, grupo) {
  const escopoOk = indice.queryScope === (grupo ? "COLLECTION_GROUP" : "COLLECTION");
  if (!escopoOk) return false;
  const campos = indice.fields || [];
  if (campos.length !== exigido.prefixo.length + exigido.sufixo.length) return false;
  const prefixoIdx = campos
    .slice(0, exigido.prefixo.length)
    .map((f) => f.fieldPath)
    .sort();
  if (JSON.stringify(prefixoIdx) !== JSON.stringify(exigido.prefixo)) return false;
  const sufixoIdx = campos.slice(exigido.prefixo.length);
  const direto = sufixoIdx.every((f, i) => {
    const e = exigido.sufixo[i];
    return (
      f.fieldPath === e.campo && f.order === (e.direcao === "desc" ? "DESCENDING" : "ASCENDING")
    );
  });
  const invertido = sufixoIdx.every((f, i) => {
    const e = exigido.sufixo[i];
    return (
      f.fieldPath === e.campo && f.order === (e.direcao === "desc" ? "ASCENDING" : "DESCENDING")
    );
  });
  return direto || invertido;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const constantes = mapearConstantes([DIR_SRC, path.join(RAIZ_REPO, "packages", "core", "src")]);
const declarados = JSON.parse(fs.readFileSync(ARQ_INDICES, "utf8")).indexes || [];

const faltando = [];
const indeterminados = [];
let analisadas = 0;

for (const arquivo of listarTs(DIR_SRC)) {
  const sf = ts.createSourceFile(
    arquivo,
    fs.readFileSync(arquivo, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const rel = path.relative(RAIZ_REPO, arquivo).split(path.sep).join("/");

  const visitar = (no) => {
    if (
      ts.isCallExpression(no) &&
      ts.isIdentifier(no.expression) &&
      no.expression.text === "query"
    ) {
      const linha = sf.getLineAndCharacterOfPosition(no.getStart()).line + 1;
      const onde = `${rel}:${linha}`;
      const fonte = resolverFonte(no.arguments[0], sf, constantes);
      const { itens, indeterminado } = coletarConstraints(no, sf);

      if (!fonte || indeterminado) {
        indeterminados.push(
          `${onde}  (${!fonte ? "coleção não resolvida" : "constraint não resolvida"})`,
        );
      } else {
        // Constraints condicionais geram VARIANTES: cada subconjunto que a
        // aplicação pode montar em runtime precisa do seu próprio índice.
        const fixas = itens.filter((i) => !i.opcional).map((i) => i.c);
        const opcionais = itens.filter((i) => i.opcional).map((i) => i.c);
        const total = 1 << Math.min(opcionais.length, 8);
        for (let mascara = 0; mascara < total; mascara++) {
          const ativas = [...fixas];
          for (let b = 0; b < opcionais.length; b++)
            if (mascara & (1 << b)) ativas.push(opcionais[b]);

          const igualdades = ativas
            .filter((c) => c.tipo === "where" && OPS_IGUALDADE.has(c.op))
            .map((c) => c.campo);
          const arrays = ativas
            .filter((c) => c.tipo === "where" && OPS_ARRAY.has(c.op))
            .map((c) => c.campo);
          const ranges = ativas
            .filter((c) => c.tipo === "where" && OPS_RANGE.has(c.op))
            .map((c) => ({ campo: c.campo }));
          const ordens = ativas
            .filter((c) => c.tipo === "orderBy")
            .map((c) => ({ campo: c.campo, direcao: c.direcao }));
          const perfil = { igualdades, arrays, ranges, ordens };

          analisadas++;
          if (!exigeComposto(perfil)) continue;
          const exigido = indiceExigido(perfil);
          const ok = declarados.some(
            (i) => i.collectionGroup === fonte.colecao && indiceServe(i, exigido, fonte.grupo),
          );
          if (!ok) {
            const desc =
              `[${fonte.colecao}${fonte.grupo ? " (grupo)" : ""}] ` +
              exigido.prefixo
                .map((c) => c + ":ASC")
                .concat(
                  exigido.sufixo.map(
                    (s) => s.campo + ":" + (s.direcao === "desc" ? "DESC" : "ASC"),
                  ),
                )
                .join(" , ");
            const chave = onde + "  " + desc;
            if (!faltando.some((f) => f.chave === chave)) faltando.push({ chave, onde, desc });
          }
        }
      }
    }
    ts.forEachChild(no, visitar);
  };
  visitar(sf);
}

console.log("auditoria de índices do Firestore — @leela/api-client");
console.log(`  variantes de query analisadas: ${analisadas}`);
console.log(`  índices compostos declarados:  ${declarados.length}`);

if (indeterminados.length > 0) {
  console.error("\nERRO — query que a auditoria não conseguiu resolver estaticamente:");
  for (const i of indeterminados) console.error("  · " + i);
  console.error(
    "\n  Query ilegível para a auditoria é query sem guarda. Deixe a coleção e as\n" +
      "  constraints literais no módulo, ou mova a montagem para cá.",
  );
}

if (faltando.length > 0) {
  console.error("\nERRO — query exige índice composto AUSENTE em firestore.indexes.json:");
  for (const f of faltando) console.error(`  · ${f.onde}\n      precisa de: ${f.desc}`);
  console.error(
    "\n  Em produção isso vira FAILED_PRECONDITION e a tela nasce vazia.\n" +
      "  O emulador NÃO cobra índice — passar nos testes de integração não\n" +
      "  significa nada aqui. Declare o índice e rode:\n" +
      "      firebase deploy --only firestore:indexes",
  );
}

if (faltando.length > 0 || indeterminados.length > 0) process.exit(1);
console.log("\nok — toda query com where+orderBy tem índice declarado.");
console.log(
  "lembrete: isto confere o ARQUIVO, não o servidor. Índice declarado e não\n" +
    "deployado quebra igual — o deploy continua sendo passo humano.",
);

// =============================================================================
// functions/scripts/prontidao-de-deploy.mjs
//
// A CONFERÊNCIA DE PRONTIDÃO — arquivo × servidor, antes de deployar.
// (lane SPEC-PROCESSO-DEPLOY · trace leela-pixreal-diag-20260804 · 2026-08-06)
//
// -----------------------------------------------------------------------------
// POR QUE ELE EXISTE
// -----------------------------------------------------------------------------
// Três defeitos desta rodada têm a MESMA assinatura: verde no emulador,
// quebrado no ar, sem erro visível. O que os une não é o assunto — é o fato de
// que a coisa que faltava **só existe em produção**, e por isso nenhum teste
// deste repositório podia enxergá-la.
//
//   1. ÍNDICE AUSENTE. `clubes(tenantId, criadoEm DESC)` e
//      `tenants(status, criadoEm DESC)` devolviam HTTP 400 em produção e o
//      painel desenhava lista vazia. O expurgo de LGPD falhou 8 madrugadas
//      seguidas (29/07 a 05/08) por dois índices. **O emulador não cobra
//      índice**: serve qualquer combinação de filtro e ordenação.
//
//   2. PERMISSÃO DE IAM QUE SÓ EXISTE EM PRODUÇÃO. As `storage.rules` fazem
//      `firestore.get()` cross-service; isso exige
//      `roles/firebaserules.firestoreServiceAgent` no service agent do
//      Storage. Quem concede é o `firebase deploy` — e ele **só concede em
//      terminal interativo** (`if (this.options.nonInteractive) { return; }`,
//      `firebase-tools/lib/rulesDeploy.js`). Todos os nossos deploys eram
//      automatizados: publicavam a regra e não concediam nada. Nenhum upload
//      que dependesse de checagem no banco jamais funcionou em produção — o
//      bucket estava com ZERO objetos. O emulador resolve o cross-service no
//      processo local, sem service agent e sem IAM: é estruturalmente cego.
//
//   3. REGRA PUBLICADA ATRÁS DO REPOSITÓRIO. O ruleset de Storage no ar era de
//      29/07 e o arquivo tinha um bloco a mais desde 02/08 — três dias de
//      divergência que ninguém mediu. O mesmo valeu para functions: a baseline
//      escrita no brief estava errada e funções diferentes estavam em commits
//      diferentes.
//
// -----------------------------------------------------------------------------
// O LUGAR DELE NA CADEIA (o que ele NÃO refaz)
// -----------------------------------------------------------------------------
// O repositório já tem três guardas ESTÁTICAS, e todas provam o ARQUIVO:
//
//   · `packages/api-client/scripts/auditar-indices-firestore.mjs`
//        query no código  →  índice declarado em firestore.indexes.json
//   · `functions/src/__tests__/firestoreIndexes.contract.test.ts`
//        fieldOverride declarado não remove escopo COLLECTION
//   · `functions/src/__tests__/secretsBinding.contract.test.ts`
//        segredo usado no código  →  segredo declarado no `runWith`
//
// Este script fecha o elo que faltava, e só ele: **arquivo → servidor**.
// Ele não reimplementa nenhuma das três; a C8 CHAMA a primeira, e a C6 LÊ a
// lista canônica de segredos de dentro da terceira, para não haver duas
// verdades sobre a mesma coisa.
//
// -----------------------------------------------------------------------------
// COMO RODAR
// -----------------------------------------------------------------------------
//   node functions/scripts/prontidao-de-deploy.mjs
//
// Nada além de `firebase login` feito. Sem navegador, sem emulador, sem
// service account, sem chave em disco. O transporte é o refresh token do
// `firebase-tools` já logado (`~/.config/configstore/firebase-tools.json`),
// trocado por um access token de vida curta que nunca é impresso nem gravado.
//
// Opções:
//   --projeto=<id>   projeto a interrogar (padrão: leela-hub)
//   --raiz=<dir>     árvore de arquivos a comparar (padrão: raiz deste repo)
//   --json           saída legível por máquina, além do relatório
//   --sem-estaticos  não roda a guarda estática de índices (C8)
//
// SAÍDA (é o gate):
//   0  PRONTO         nada atrás, nada faltando
//   1  BLOQUEIO       algo atrás ou faltando — não deploye antes de ler
//   2  INDETERMINADO  não consegui medir (login vencido, API fora, permissão)
//
// O código 2 existe de propósito: a pior saída possível seria dizer "ok"
// porque a medição falhou. Falha de medição é vermelha, nunca verde.
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = path.resolve(AQUI, '..', '..');

// Credenciais PÚBLICAS do próprio firebase-tools (não são segredo: viajam em
// todo `npm i -g firebase-tools`, ver `lib/api.js`). Elas só servem para
// trocar o refresh token DO USUÁRIO LOGADO por um access token.
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// O papel que o `firebase deploy` só concede em terminal interativo. Fonte:
// `firebase-tools/lib/rulesDeploy.js`, constante CROSS_SERVICE_RULES_ROLE.
const PAPEL_CROSS_SERVICE = 'roles/firebaserules.firestoreServiceAgent';
const REGEX_CROSS_SERVICE = /firestore\.(get|exists)\s*\(/g;

const args = process.argv.slice(2);
const opt = (nome, padrao) => {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
};
const flag = (nome) => args.includes(`--${nome}`);

const PROJETO = opt('projeto', 'leela-hub');
const RAIZ = path.resolve(opt('raiz', RAIZ_REPO));
const COMO_JSON = flag('json');
const SEM_ESTATICOS = flag('sem-estaticos');

// -----------------------------------------------------------------------------
// Relatório
// -----------------------------------------------------------------------------

/** BLOQUEIO reprova; ATENÇÃO informa; INDETERMINADO significa "não medi". */
const OK = 'OK';
const BLOQUEIO = 'BLOQUEIO';
const ATENCAO = 'ATENÇÃO';
const INDETERMINADO = 'INDETERMINADO';

const checagens = [];
function registrar(id, titulo, veredito, linhas) {
  checagens.push({ id, titulo, veredito, linhas: linhas.filter((l) => l !== null) });
}

const SIMBOLO = {
  [OK]: 'OK ......',
  [BLOQUEIO]: 'BLOQUEIO ',
  [ATENCAO]: 'ATENCAO .',
  [INDETERMINADO]: 'INDETERM.',
};

// -----------------------------------------------------------------------------
// Transporte
// -----------------------------------------------------------------------------

class Indeterminado extends Error {}

function lerRefreshToken() {
  const arq = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(arq)) {
    throw new Indeterminado(
      `não achei ${arq}. Rode \`firebase login\` na sua máquina e tente de novo.`
    );
  }
  const cfg = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const rt = cfg?.tokens?.refresh_token;
  if (!rt) throw new Indeterminado('o configstore do firebase-tools não tem refresh token. Rode `firebase login --reauth`.');
  return rt;
}

async function obterToken() {
  const corpo = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: lerRefreshToken(),
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: corpo });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Indeterminado(
      `a troca do refresh token falhou (HTTP ${r.status}: ${j.error || 'sem detalhe'}). ` +
        'Quase sempre é login vencido: `firebase login --reauth`.'
    );
  }
  return j.access_token;
}

let TOKEN = null;
async function api(url, { metodo = 'GET', corpo } = {}) {
  const r = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || `HTTP ${r.status}`;
    throw new Indeterminado(`${url.replace(/\?.*$/, '')} → ${msg}`);
  }
  return j;
}

// -----------------------------------------------------------------------------
// Utilitários de comparação
// -----------------------------------------------------------------------------

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const lerArquivo = (rel) => {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) throw new Indeterminado(`arquivo ausente na raiz interrogada: ${rel}`);
  return fs.readFileSync(p, 'utf8');
};

/**
 * Chave canônica de um índice composto. O servidor acrescenta `__name__` como
 * último campo (direção derivada do último campo ordenado) e o arquivo não o
 * declara — por isso um `__name__` FINAL é removido dos dois lados antes de
 * comparar, que é o mesmo que o `firebase-tools` faz. Consequência honesta:
 * uma divergência que existisse SÓ na direção do `__name__` passaria batida.
 */
function chaveDeComposto(collectionGroup, queryScope, campos) {
  const uteis = [...campos];
  if (uteis.length && uteis[uteis.length - 1].fieldPath === '__name__') uteis.pop();
  const desc = uteis
    .map((c) => `${c.fieldPath}:${c.order || c.arrayConfig || '?'}`)
    .join(',');
  return `${collectionGroup} [${queryScope || 'COLLECTION'}] ${desc}`;
}

/** Chave canônica de UM índice de campo único dentro de um fieldOverride. */
const chaveDeCampo = (i) => `${i.queryScope}/${i.order || i.arrayConfig || '?'}`;

/**
 * Diff resumido linha a linha. Não é `git diff`: é a resposta à pergunta que
 * importa antes de um deploy — "o que existe de um lado e não do outro, e a
 * partir de que linha os dois passam a divergir".
 */
function resumirDiff(local, servidor) {
  const a = local.split(/\r?\n/);
  const b = servidor.split(/\r?\n/);
  let primeiraDivergencia = -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      primeiraDivergencia = i + 1;
      break;
    }
  }
  const conta = (linhas) => {
    const m = new Map();
    for (const l of linhas) {
      const t = l.trim();
      if (!t) continue;
      m.set(t, (m.get(t) || 0) + 1);
    }
    return m;
  };
  const ma = conta(a);
  const mb = conta(b);
  const soLocal = [];
  const soServidor = [];
  for (const [l, n] of ma) {
    const d = n - (mb.get(l) || 0);
    for (let i = 0; i < d; i++) soLocal.push(l);
  }
  for (const [l, n] of mb) {
    const d = n - (ma.get(l) || 0);
    for (let i = 0; i < d; i++) soServidor.push(l);
  }
  return { primeiraDivergencia, soLocal, soServidor };
}

const amostra = (lista, n = 8) =>
  lista.slice(0, n).map((l) => `        ${l.length > 110 ? `${l.slice(0, 110)}…` : l}`);

// -----------------------------------------------------------------------------
// C1 · índices compostos — arquivo × servidor
// -----------------------------------------------------------------------------

async function c1Compostos(arqIndices) {
  const noArquivo = new Map();
  for (const i of arqIndices.indexes || []) {
    noArquivo.set(chaveDeComposto(i.collectionGroup, i.queryScope, i.fields || []), i);
  }

  const resp = await api(
    `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/collectionGroups/-/indexes`
  );
  const noServidor = new Map();
  const naoProntos = [];
  for (const i of resp.indexes || []) {
    const cg = i.name.split('/collectionGroups/')[1].split('/indexes/')[0];
    noServidor.set(chaveDeComposto(cg, i.queryScope, i.fields || []), i);
    if (i.state && i.state !== 'READY') naoProntos.push(`${cg} → ${i.state}`);
  }

  const seriamCriados = [...noArquivo.keys()].filter((k) => !noServidor.has(k));
  const soNoServidor = [...noServidor.keys()].filter((k) => !noArquivo.has(k));

  const linhas = [
    `    arquivo: ${noArquivo.size}   servidor: ${noServidor.size}`,
    seriamCriados.length
      ? `    ATRÁS — ${seriamCriados.length} ${seriamCriados.length === 1 ? 'índice existe' : 'índices existem'} no arquivo e NÃO no servidor:`
      : '    nada no arquivo que falte no servidor',
    ...seriamCriados.map((k) => `        + ${k}`),
    soNoServidor.length
      ? `    à frente — ${soNoServidor.length} índice(s) só no servidor (um deploy os REMOVERIA):`
      : null,
    ...soNoServidor.map((k) => `        - ${k}`),
    naoProntos.length ? `    ainda construindo: ${naoProntos.join(', ')}` : null,
  ];

  // Índice que existe só no servidor não impede a produção de funcionar HOJE,
  // mas um `deploy --only firestore:indexes` o apaga. É aviso, não bloqueio:
  // quase sempre é índice criado pelo link do console e nunca versionado.
  const veredito = seriamCriados.length ? BLOQUEIO : soNoServidor.length || naoProntos.length ? ATENCAO : OK;
  registrar('C1', 'índices compostos (arquivo × servidor)', veredito, linhas);
}

// -----------------------------------------------------------------------------
// C2 · fieldOverrides — arquivo × servidor, com a regra do não-aditivo
// -----------------------------------------------------------------------------

async function c2Overrides(arqIndices) {
  const noArquivo = new Map();
  for (const o of arqIndices.fieldOverrides || []) {
    noArquivo.set(
      `${o.collectionGroup}.${o.fieldPath}`,
      new Set((o.indexes || []).map(chaveDeCampo))
    );
  }

  const resp = await api(
    `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/collectionGroups/-/fields` +
      `?filter=${encodeURIComponent('indexConfig.usesAncestorConfig=false')}`
  );
  const noServidor = new Map();
  for (const f of resp.fields || []) {
    const cru = f.name.split('/collectionGroups/')[1]; // "grupo/fields/campo"
    const [grupo, campo] = cru.split('/fields/');
    if (grupo === '__default__') continue; // política automática do banco, não é override
    noServidor.set(
      `${grupo}.${campo}`,
      new Set((f.indexConfig?.indexes || []).map((i) => `${i.queryScope}/${i.fields?.[0]?.order || i.fields?.[0]?.arrayConfig || '?'}`))
    );
  }

  const faltando = [...noArquivo.keys()].filter((k) => !noServidor.has(k));
  const sobrando = [...noServidor.keys()].filter((k) => !noArquivo.has(k));
  const divergentes = [];
  // A regra que já custou uma quase-catástrofe (REV-B4): um fieldOverride NÃO
  // é aditivo. Declarar só COLLECTION_GROUP APAGA os escopos COLLECTION que o
  // Firestore mantinha sozinho, e toda query de coleção sobre aquele campo
  // passa a falhar — no PRÓXIMO deploy de índices, não no deploy do código.
  const remocoesDestrutivas = [];
  for (const [k, doArquivo] of noArquivo) {
    const doServidor = noServidor.get(k);
    if (!doServidor) continue;
    const soArquivo = [...doArquivo].filter((x) => !doServidor.has(x));
    const soServidor = [...doServidor].filter((x) => !doArquivo.has(x));
    if (soArquivo.length || soServidor.length) {
      divergentes.push(`${k}: arquivo+[${soArquivo.join(' ')}] servidor+[${soServidor.join(' ')}]`);
    }
    const colecaoPerdida = soServidor.filter((x) => x.startsWith('COLLECTION/'));
    if (colecaoPerdida.length) remocoesDestrutivas.push(`${k} perderia ${colecaoPerdida.join(' e ')}`);
  }

  const linhas = [
    `    arquivo: ${noArquivo.size}   servidor: ${noServidor.size}`,
    faltando.length ? `    ATRÁS — só no arquivo (seriam criados): ${faltando.join(', ')}` : null,
    sobrando.length ? `    só no servidor (um deploy os REMOVERIA): ${sobrando.join(', ')}` : null,
    divergentes.length ? '    divergentes:' : null,
    ...divergentes.map((d) => `        ${d}`),
    remocoesDestrutivas.length
      ? `    ⛔ NÃO-ADITIVO — o deploy APAGARIA escopo COLLECTION que existe hoje:`
      : null,
    ...remocoesDestrutivas.map((d) => `        ${d}`),
    !faltando.length && !sobrando.length && !divergentes.length
      ? '    os dois lados batem, override a override'
      : null,
  ];

  const veredito = remocoesDestrutivas.length
    ? BLOQUEIO
    : faltando.length || sobrando.length || divergentes.length
      ? ATENCAO
      : OK;
  registrar('C2', 'fieldOverrides (e a regra do não-aditivo)', veredito, linhas);
}

// -----------------------------------------------------------------------------
// C3/C4 · regras publicadas × arquivo
// -----------------------------------------------------------------------------

let RELEASES = null;
async function releases() {
  if (!RELEASES) {
    RELEASES = (await api(`https://firebaserules.googleapis.com/v1/projects/${PROJETO}/releases`)).releases || [];
  }
  return RELEASES;
}

async function fonteNoAr(prefixoRelease) {
  const rel = (await releases()).find((r) => r.name.includes(`/releases/${prefixoRelease}`));
  if (!rel) throw new Indeterminado(`nenhum release casa com "${prefixoRelease}" no projeto ${PROJETO}`);
  const rs = await api(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
  const arquivos = rs.source?.files || [];
  if (arquivos.length !== 1) {
    throw new Indeterminado(`o ruleset ${rel.rulesetName} tem ${arquivos.length} arquivos; esperava 1`);
  }
  return {
    conteudo: arquivos[0].content,
    ruleset: rel.rulesetName.split('/').pop(),
    quando: rs.createTime || rel.updateTime || '(sem data)',
  };
}

async function compararRegras(id, titulo, prefixoRelease, arquivoLocal) {
  const local = lerArquivo(arquivoLocal);
  const { conteudo, ruleset, quando } = await fonteNoAr(prefixoRelease);

  if (local === conteudo) {
    registrar(id, titulo, OK, [
      `    ruleset no ar: ${ruleset} (${quando})`,
      `    ${arquivoLocal} e o publicado são IDÊNTICOS (sha256[0:16] ${sha(local)}, ${Buffer.byteLength(local)} bytes)`,
    ]);
    return;
  }

  const { primeiraDivergencia, soLocal, soServidor } = resumirDiff(local, conteudo);
  // Crossa a fronteira de gravidade: cross-service novo no arquivo e ainda não
  // publicado é a combinação exata do caso 2 desta rodada.
  registrar(id, titulo, BLOQUEIO, [
    `    ruleset no ar: ${ruleset} (${quando})`,
    `    ATRÁS — o publicado NÃO é o arquivo.`,
    `        local    ${Buffer.byteLength(local)} bytes  sha256[0:16] ${sha(local)}`,
    `        no ar    ${Buffer.byteLength(conteudo)} bytes  sha256[0:16] ${sha(conteudo)}`,
    `        divergem a partir da linha ${primeiraDivergencia}`,
    `    linhas só no ARQUIVO (${soLocal.length}) — o deploy as PUBLICARIA:`,
    ...amostra(soLocal),
    soLocal.length > 8 ? `        … e mais ${soLocal.length - 8}` : null,
    `    linhas só NO AR (${soServidor.length}) — o deploy as REMOVERIA:`,
    ...amostra(soServidor),
    soServidor.length > 8 ? `        … e mais ${soServidor.length - 8}` : null,
  ]);
}

// -----------------------------------------------------------------------------
// C5 · IAM cross-service — o papel que só o terminal interativo concede
// -----------------------------------------------------------------------------

async function c5CrossService() {
  const rules = lerArquivo('storage.rules');
  const chamadas = [...rules.matchAll(REGEX_CROSS_SERVICE)].map((m) => `firestore.${m[1]}()`);
  if (!chamadas.length) {
    registrar('C5', 'IAM do cross-service das storage.rules', OK, [
      '    storage.rules não chama firestore.get/exists — o papel não é exigido.',
    ]);
    return;
  }

  const projeto = await api(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJETO}`);
  const numero = projeto.projectNumber;
  const sa = `serviceAccount:service-${numero}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;

  const politica = await api(
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJETO}:getIamPolicy`,
    { metodo: 'POST', corpo: {} }
  );
  const papeis = (politica.bindings || [])
    .filter((b) => (b.members || []).includes(sa))
    .map((b) => b.role)
    .sort();
  const temPapel = papeis.includes(PAPEL_CROSS_SERVICE);

  const contagem = chamadas.reduce((m, c) => m.set(c, (m.get(c) || 0) + 1), new Map());
  const linhas = [
    `    storage.rules tem ${chamadas.length} chamada(s) cross-service (${[...contagem].map(([c, n]) => `${c}×${n}`).join(', ')}),` +
      ' em funções auxiliares reusadas por vários matches',
    `    service agent: service-${numero}@gcp-sa-firebasestorage.iam.gserviceaccount.com`,
    `    papéis concedidos a ele: ${papeis.length ? papeis.join(', ') : '(nenhum)'}`,
    temPapel
      ? `    ${PAPEL_CROSS_SERVICE} CONCEDIDO — o get() cross-service responde.`
      : `    ⛔ ${PAPEL_CROSS_SERVICE} AUSENTE.`,
    temPapel
      ? null
      : '        Toda Rule que consulta o Firestore NEGA em produção, com a mesma frase de',
    temPapel ? null : '        uma negação legítima de permissão. Conserto (uma vez por projeto):',
    temPapel
      ? null
      : `        gcloud projects add-iam-policy-binding ${PROJETO} \\`,
    temPapel
      ? null
      : `          --member=serviceAccount:service-${numero}@gcp-sa-firebasestorage.iam.gserviceaccount.com \\`,
    temPapel ? null : `          --role=${PAPEL_CROSS_SERVICE}`,
  ];

  registrar('C5', 'IAM do cross-service das storage.rules', temPapel ? OK : BLOQUEIO, linhas);
}

// -----------------------------------------------------------------------------
// C6 · segredos declarados × Secret Manager
// -----------------------------------------------------------------------------

function varrerArquivosTs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'lib' || e.name === '__tests__') continue;
      varrerArquivosTs(p, acc);
    } else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}

/** Literais dentro de `secrets: [ … ]`, multi-linha inclusive. */
function segredosDeclaradosNoCodigo() {
  const nomes = new Set();
  const naoLiterais = new Set();
  for (const arq of varrerArquivosTs(path.join(RAIZ, 'functions', 'src'))) {
    const txt = fs.readFileSync(arq, 'utf8');
    for (const m of txt.matchAll(/secrets\s*:\s*\[([\s\S]*?)\]/g)) {
      for (const item of m[1].split(',')) {
        const t = item.replace(/\/\/.*$/gm, '').trim();
        if (!t) continue;
        const lit = t.match(/^['"`]([A-Z0-9_]+)['"`]$/);
        if (lit) nomes.add(lit[1]);
        else if (/^[A-Za-z_$][\w$]*$/.test(t)) naoLiterais.add(t);
      }
    }
  }
  return { nomes, naoLiterais };
}

/**
 * A lista canônica vive DENTRO do `secretsBinding.contract.test.ts` — e o
 * próprio contrato já garante que ela cobre todo `runWith`. Ler de lá evita
 * uma segunda verdade sobre a mesma coisa (é o caso do `BANK_DATA_KEY`, que
 * viaja pelo fonte como constante `ENV_BANK_DATA_KEY` e nenhuma varredura de
 * literal enxerga).
 */
function segredosDoContrato() {
  const arq = path.join(RAIZ, 'functions', 'src', '__tests__', 'secretsBinding.contract.test.ts');
  if (!fs.existsSync(arq)) return null;
  const txt = fs.readFileSync(arq, 'utf8');
  const bloco = txt.match(/const SEGREDOS = \[([\s\S]*?)\] as const;/);
  if (!bloco) return null;
  return new Set([...bloco[1].matchAll(/'([A-Z0-9_]+)'/g)].map((m) => m[1]));
}

async function c6Segredos() {
  const { nomes, naoLiterais } = segredosDeclaradosNoCodigo();
  const doContrato = segredosDoContrato();
  const esperados = new Set([...nomes, ...(doContrato || [])]);

  const resp = await api(`https://secretmanager.googleapis.com/v1/projects/${PROJETO}/secrets?pageSize=200`);
  const existentes = new Map((resp.secrets || []).map((s) => [s.name.split('/').pop(), s.name]));

  const ausentes = [...esperados].filter((s) => !existentes.has(s)).sort();
  const semVersaoAtiva = [];
  for (const nome of [...esperados].filter((s) => existentes.has(s)).sort()) {
    const v = await api(`https://secretmanager.googleapis.com/v1/${existentes.get(nome)}/versions?pageSize=50`);
    const ativas = (v.versions || []).filter((x) => x.state === 'ENABLED').length;
    if (!ativas) semVersaoAtiva.push(nome);
  }

  const foraDoContrato = doContrato ? [...nomes].filter((s) => !doContrato.has(s)) : [];

  const linhas = [
    `    esperados pelo código: ${esperados.size} (${[...esperados].sort().join(', ')})`,
    naoLiterais.size
      ? `    declarados por CONSTANTE, não por literal: ${[...naoLiterais].join(', ')} — resolvidos pela lista do contrato`
      : null,
    ausentes.length ? `    ⛔ AUSENTES no Secret Manager: ${ausentes.join(', ')}` : '    todos existem no Secret Manager',
    semVersaoAtiva.length ? `    ⛔ existem mas SEM versão ENABLED: ${semVersaoAtiva.join(', ')}` : null,
    doContrato ? null : '    (não achei a lista SEGREDOS do secretsBinding.contract — conferi só os literais)',
    foraDoContrato.length
      ? `    ATENÇÃO: declarado em runWith e fora da lista SEGREDOS do contrato: ${foraDoContrato.join(', ')}`
      : null,
  ];

  const veredito =
    ausentes.length || semVersaoAtiva.length ? BLOQUEIO : foraDoContrato.length || !doContrato ? ATENCAO : OK;
  registrar('C6', 'segredos do runWith × Secret Manager', veredito, linhas);
}

// -----------------------------------------------------------------------------
// C7 · artefatos de build mais velhos que a fonte (heurística, sem rede)
// -----------------------------------------------------------------------------

function maisNovoEm(dir, ignorar = new Set(['node_modules', '.turbo'])) {
  let maior = 0;
  const andar = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (ignorar.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else {
        const t = fs.statSync(p).mtimeMs;
        if (t > maior) maior = t;
      }
    }
  };
  andar(dir);
  return maior;
}

function c7Artefatos() {
  const pares = [
    ['packages/core', 'packages/core/src', 'packages/core/dist'],
    ['packages/design-system', 'packages/design-system/src', 'packages/design-system/dist'],
    ['packages/api-client', 'packages/api-client/src', 'packages/api-client/dist'],
    ['apps/painel', 'apps/painel/src', 'apps/painel/dist'],
    ['functions → bundle', 'functions/src', 'functions-deploy'],
  ];
  const velhos = [];
  const semArtefato = [];
  for (const [nome, src, dist] of pares) {
    const dSrc = path.join(RAIZ, src);
    const dDist = path.join(RAIZ, dist);
    if (!fs.existsSync(dSrc)) continue;
    if (!fs.existsSync(dDist)) {
      semArtefato.push(nome);
      continue;
    }
    const tSrc = maisNovoEm(dSrc);
    const tDist = maisNovoEm(dDist);
    if (tDist < tSrc) {
      const atraso = Math.round((tSrc - tDist) / 60000);
      velhos.push(`${nome}: artefato ${atraso} min mais velho que a fonte`);
    }
  }

  registrar('C7', 'artefatos de build × fonte (heurística de mtime)', velhos.length ? ATENCAO : OK, [
    '    `dist/` é gitignorado: um deploy sem rebuild sobe o código VELHO com a suíte verde.',
    velhos.length ? '    possivelmente desatualizados:' : '    nenhum artefato mais velho que a fonte',
    ...velhos.map((v) => `        ${v}`),
    semArtefato.length ? `    sem artefato em disco (precisam de build): ${semArtefato.join(', ')}` : null,
    '    mtime é indício, não prova: `git pull` reescreve datas. A prova é rodar o build.',
  ]);
}

// -----------------------------------------------------------------------------
// C8 · reuso da guarda estática de índices
// -----------------------------------------------------------------------------

function c8GuardaEstatica() {
  const script = path.join(RAIZ, 'packages', 'api-client', 'scripts', 'auditar-indices-firestore.mjs');
  if (!fs.existsSync(script)) {
    registrar('C8', 'guarda estática de índices (reuso)', ATENCAO, [
      '    auditar-indices-firestore.mjs não encontrado nesta raiz.',
    ]);
    return;
  }
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: RAIZ });
  const saida = `${r.stdout || ''}${r.stderr || ''}`.trim().split(/\r?\n/);
  registrar('C8', 'guarda estática de índices (reuso, sem rede)', r.status === 0 ? OK : BLOQUEIO, [
    '    query no código → índice declarado no arquivo (a metade que este script não faz):',
    ...saida.slice(0, 14).map((l) => `        ${l}`),
  ]);
}

// -----------------------------------------------------------------------------
// Relatório final
// -----------------------------------------------------------------------------

const NAO_VERIFICA = [
  'que a query devolva o dado CERTO. Índice presente prova que ela é planejável, não que está correta.',
  'as regras em si. Rule publicada e idêntica ao arquivo pode estar errada — quem prova isso é a suíte adversarial de Rules.',
  'o CONTEÚDO dos segredos. Prova que o segredo existe com versão ativa; não que o valor é o certo, nem que o gateway o aceita.',
  'quais FUNCTIONS estão atrás do repositório. A comparação por função exige o grafo de imports por baseline e ficou de fora — hoje isso é trabalho manual da lane de deploy.',
  'o hosting (painel e landing). Nenhuma comparação de release nem de bundle servido.',
  'os índices que `functions/` precisa. A guarda estática (C8) lê `packages/api-client`; queries do Admin SDK dentro de functions ficam fora.',
  'a direção do `__name__` num índice composto: um `__name__` final é removido dos dois lados antes de comparar.',
  'o build. C7 compara datas de arquivo, e data mente depois de um `git pull`. Rodar o build continua sendo passo obrigatório.',
  'o caminho do navegador, o upload real, o pagamento real. Nada aqui abre browser nem escreve em produção.',
  'App Check, cotas, billing e limites de região.',
];

function imprimir() {
  const cab = [
    '',
    '='.repeat(78),
    `PRONTIDÃO DE DEPLOY · projeto ${PROJETO}`,
    `raiz de arquivos: ${RAIZ}`,
    `medido em ${new Date().toISOString()}`,
    '='.repeat(78),
    '',
  ];
  for (const l of cab) console.warn(l);

  for (const c of checagens) {
    console.warn(`${SIMBOLO[c.veredito]}  ${c.id} · ${c.titulo}`);
    for (const l of c.linhas) console.warn(l);
    console.warn('');
  }

  const bloqueios = checagens.filter((c) => c.veredito === BLOQUEIO);
  const indets = checagens.filter((c) => c.veredito === INDETERMINADO);
  const atencoes = checagens.filter((c) => c.veredito === ATENCAO);

  console.warn('-'.repeat(78));
  console.warn('O QUE ESTE SCRIPT NÃO VERIFICA (leia antes de confiar no verde)');
  console.warn('-'.repeat(78));
  for (const l of NAO_VERIFICA) console.warn(`  · ${l}`);
  console.warn('');

  console.warn('='.repeat(78));
  if (bloqueios.length) {
    console.warn(`VEREDITO: BLOQUEIO — ${bloqueios.map((c) => c.id).join(', ')}. NÃO deploye antes de resolver.`);
  } else if (indets.length) {
    console.warn(`VEREDITO: INDETERMINADO — ${indets.map((c) => c.id).join(', ')}. Não consegui medir; não conte como verde.`);
  } else {
    const rotulo = atencoes.length === 1 ? 'atenção' : 'atenções';
    console.warn(`VEREDITO: PRONTO${atencoes.length ? ` (com ${atencoes.length} ${rotulo}: ${atencoes.map((c) => c.id).join(', ')})` : ''}.`);
  }
  console.warn('='.repeat(78));
  console.warn('');

  if (COMO_JSON) {
    console.log(
      JSON.stringify(
        {
          projeto: PROJETO,
          raiz: RAIZ,
          medidoEm: new Date().toISOString(),
          checagens: checagens.map(({ id, titulo, veredito }) => ({ id, titulo, veredito })),
          naoVerifica: NAO_VERIFICA,
        },
        null,
        2
      )
    );
  }

  return bloqueios.length ? 1 : indets.length ? 2 : 0;
}

// -----------------------------------------------------------------------------
// Execução
// -----------------------------------------------------------------------------

async function comIndeterminado(id, titulo, fn) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof Indeterminado) {
      registrar(id, titulo, INDETERMINADO, [`    não consegui medir: ${e.message}`]);
    } else {
      registrar(id, titulo, INDETERMINADO, [`    erro inesperado: ${e.message}`]);
    }
  }
}

async function principal() {
  try {
    TOKEN = await obterToken();
  } catch (e) {
    console.warn('');
    console.warn(`INDETERMINADO — ${e.message}`);
    console.warn('Nenhuma checagem de servidor pôde rodar. Isto NÃO é verde.');
    console.warn('');
    return 2;
  }

  let arqIndices = null;
  try {
    arqIndices = JSON.parse(lerArquivo('firestore.indexes.json'));
  } catch (e) {
    registrar('C1', 'índices compostos (arquivo × servidor)', INDETERMINADO, [`    ${e.message}`]);
    registrar('C2', 'fieldOverrides (e a regra do não-aditivo)', INDETERMINADO, [`    ${e.message}`]);
  }

  if (arqIndices) {
    await comIndeterminado('C1', 'índices compostos (arquivo × servidor)', () => c1Compostos(arqIndices));
    await comIndeterminado('C2', 'fieldOverrides (e a regra do não-aditivo)', () => c2Overrides(arqIndices));
  }
  await comIndeterminado('C3', 'regras do Firestore (arquivo × publicado)', () =>
    compararRegras('C3', 'regras do Firestore (arquivo × publicado)', 'cloud.firestore', 'firestore.rules')
  );
  await comIndeterminado('C4', 'regras do Storage (arquivo × publicado)', () =>
    compararRegras('C4', 'regras do Storage (arquivo × publicado)', 'firebase.storage', 'storage.rules')
  );
  await comIndeterminado('C5', 'IAM do cross-service das storage.rules', c5CrossService);
  await comIndeterminado('C6', 'segredos do runWith × Secret Manager', c6Segredos);
  await comIndeterminado('C7', 'artefatos de build × fonte (heurística de mtime)', async () => c7Artefatos());
  if (!SEM_ESTATICOS) {
    await comIndeterminado('C8', 'guarda estática de índices (reuso, sem rede)', async () => c8GuardaEstatica());
  }

  // Ordena pelo id para o relatório sair sempre na mesma ordem, mesmo que uma
  // checagem tenha sido registrada fora de sequência por erro.
  checagens.sort((a, b) => a.id.localeCompare(b.id));
  return imprimir();
}

process.exitCode = await principal();

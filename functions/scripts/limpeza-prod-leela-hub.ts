// =============================================================================
// limpeza-prod-leela-hub — enxuga o leela-hub para UMA produtora, dois eventos.
//
// ⚠️ ESTE SCRIPT APAGA DADO EM PRODUÇÃO. Por omissão ele NÃO escreve nada:
// lê produção, monta o plano e imprime documento a documento, na ordem em que
// agiria. Escrever exige `--apply` E o caminho do backup do T1 — sem os dois,
// aborta antes de abrir conexão de escrita.
//
//   Simular (padrão, seguro):
//     node <compilado> --dry-run
//   Executar (só depois da review antagonista e da liberação do maestro):
//     node <compilado> --apply --backup=gs://.../firestore-backups/<trace>
//
// A INTELIGÊNCIA NÃO MORA AQUI. O plano é `../src/limpeza/planoLimpeza.ts`,
// função pura testada contra dado sintético (`src/__tests__/limpezaProd.test.ts`).
// Este arquivo é I/O: lê, delega, imprime ou aplica. É de propósito — assim o
// dry-run e o `--apply` percorrem exatamente o mesmo plano, e o que você lê na
// simulação é o que aconteceria.
//
// CREDENCIAL: o token OAuth do Firebase CLI já logado (`firebase login`), lido
// do configstore. Nenhum segredo é gravado, nem pedido, nem exibido. Não usa
// service-account em arquivo de propósito: chave de owner em disco é a coisa
// que esta lane não quer criar.
//
// A ARMADILHA QUE ENGANOU O MAESTRO NESTA RODADA: `documents:runQuery` devolve
// `[{"error":{...}}]` quando falha, e contar `.document` dá zero sem nunca
// olhar o campo `error` — um HTTP 400 vira falso verde. Aqui todo erro explode
// (`exigirSemErro`). Se este script ficar em silêncio, é porque não houve erro.
// =============================================================================

/* eslint-disable no-console */

import * as fs from 'fs';
import * as os from 'os';
import {
  planejarLimpeza,
  type AlvoLimpeza,
  type DocInventario,
  type Operacao,
} from '../src/limpeza/planoLimpeza';

const PROJETO = 'leela-hub';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

// ── Trava de ambiente: este runner é EXCLUSIVO de produção. ──────────────────
for (const v of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
  if (process.env[v] !== undefined) {
    throw new Error(`[limpeza] ${v} está definido — este runner não fala com emulador.`);
  }
}

// ── O alvo, escrito como invariante. Mudar aqui é mudar a decisão. ───────────
const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['castelo-producoes'],
  eventosMantidos: ['teste-taxa-repassada', 'corrida-inverno-floripa-2026'],
  uidsProtegidos: [
    'QbqlSxanxlcFeHCy4g47Vp7jlgz1', // vitoreldp@gmail.com — o dono
    'wNXRTvMM3vc7Boyi91vRgx3DBQy2', // sessão que fez a compra real (pedido 8CDHM)
    'MOXZpvp8XugpwNN2ldZFIhmQh5H2', // checkout real (falhou) no evento que fica
    '10LF4k11YShiBa0TnNJI0kNY6eT2', // dugamer597@gmail.com — pessoa real
    'VFlceOpajTd8zgGqFXocI7iiHuS2', // eusouojoaocalixto@gmail.com — pessoa real
    'FTqslV98itZUNGwL5ss6201d23Z2', // admin@demo-leela.dev — só sai com o admin real de pé
  ],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
};

// ── Credencial ──────────────────────────────────────────────────────────────
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

interface TokensCLI {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

async function tokenDeAcesso(): Promise<string> {
  const caminho = `${os.homedir()}/.config/configstore/firebase-tools.json`;
  if (!fs.existsSync(caminho)) {
    throw new Error(`[limpeza] credencial do Firebase CLI não encontrada em ${caminho}. Rode: firebase login`);
  }
  const store = JSON.parse(fs.readFileSync(caminho, 'utf8')) as { tokens?: TokensCLI };
  const t = store.tokens ?? {};
  if (t.access_token !== undefined && t.expires_at !== undefined && Date.now() < t.expires_at - 60_000) {
    return t.access_token;
  }
  if (t.refresh_token === undefined) throw new Error('[limpeza] sem refresh_token — rode: firebase login');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const d = (await r.json()) as { access_token?: string };
  if (d.access_token === undefined) throw new Error('[limpeza] refresh do token falhou');
  return d.access_token;
}

// ── Cliente REST. Todo erro explode; nada de falso verde. ───────────────────
async function chamar(url: string, init: RequestInit = {}): Promise<unknown> {
  const tok = await tokenDeAcesso();
  const r = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`[limpeza] HTTP ${r.status} em ${url}\n${texto.slice(0, 900)}`);
  return texto === '' ? null : (JSON.parse(texto) as unknown);
}

/** Falso-verde killer: qualquer `error` no corpo aborta a rodada. */
function exigirSemErro(resposta: unknown, contexto: string): void {
  const arr = Array.isArray(resposta) ? resposta : [resposta];
  const ruins = arr.filter((e) => e !== null && typeof e === 'object' && 'error' in (e as object));
  if (ruins.length > 0) throw new Error(`[limpeza] erro em ${contexto}: ${JSON.stringify(ruins).slice(0, 700)}`);
}

interface DocREST {
  name: string;
  fields?: Record<string, unknown>;
}

function achatar(valor: unknown): unknown {
  if (valor === null || typeof valor !== 'object') return valor;
  const v = valor as Record<string, unknown>;
  if ('stringValue' in v) return v['stringValue'];
  if ('integerValue' in v) return Number(v['integerValue']);
  if ('doubleValue' in v) return v['doubleValue'];
  if ('booleanValue' in v) return v['booleanValue'];
  if ('timestampValue' in v) return v['timestampValue'];
  if ('nullValue' in v) return null;
  if ('referenceValue' in v) return v['referenceValue'];
  if ('arrayValue' in v) {
    const a = v['arrayValue'] as { values?: unknown[] };
    return (a.values ?? []).map(achatar);
  }
  if ('mapValue' in v) {
    const m = v['mapValue'] as { fields?: Record<string, unknown> };
    return campos(m.fields ?? {});
  }
  return valor;
}
function campos(f: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) o[k] = achatar(v);
  return o;
}

async function listar(colecao: string): Promise<DocREST[]> {
  const saida: DocREST[] = [];
  let pagina: string | null = null;
  do {
    const u = new URL(`${BASE}/${colecao}`);
    u.searchParams.set('pageSize', '300');
    if (pagina !== null) u.searchParams.set('pageToken', pagina);
    const res = (await chamar(u.toString())) as { documents?: DocREST[]; nextPageToken?: string } | null;
    exigirSemErro(res, `listar ${colecao}`);
    saida.push(...(res?.documents ?? []));
    pagina = res?.nextPageToken ?? null;
  } while (pagina !== null);
  return saida;
}

async function subcolecoes(caminhoDoc: string): Promise<string[]> {
  const res = (await chamar(`${BASE}/${caminhoDoc}:listCollectionIds`, {
    method: 'POST',
    body: JSON.stringify({ pageSize: 300 }),
  })) as { collectionIds?: string[] } | null;
  exigirSemErro(res, `subcolecoes ${caminhoDoc}`);
  return res?.collectionIds ?? [];
}

async function raizes(): Promise<string[]> {
  const res = (await chamar(`${BASE}:listCollectionIds`, {
    method: 'POST',
    body: JSON.stringify({ pageSize: 300 }),
  })) as { collectionIds?: string[] } | null;
  exigirSemErro(res, 'listCollectionIds raiz');
  return res?.collectionIds ?? [];
}

async function comLimite<T>(itens: readonly T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  const it = itens[Symbol.iterator]();
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let x = it.next(); x.done !== true; x = it.next()) await fn(x.value);
    })
  );
}

/** Varredura recursiva completa. Subcoleção não aparece em listagem de pai. */
async function inventariar(): Promise<DocInventario[]> {
  const saida: DocInventario[] = [];
  const anda = async (colecao: string, nivel: number): Promise<void> => {
    const docs = await listar(colecao);
    for (const d of docs) {
      saida.push({ caminho: d.name.split('/documents/')[1] ?? '', campos: campos(d.fields ?? {}) });
    }
    if (nivel >= 4) return;
    await comLimite(docs, 12, async (d) => {
      const p = d.name.split('/documents/')[1] ?? '';
      for (const s of await subcolecoes(p)) await anda(`${p}/${s}`, nivel + 1);
    });
  };
  await comLimite(await raizes(), 6, (c) => anda(c, 0));
  return saida;
}

// ── Escrita (só com --apply) ────────────────────────────────────────────────
async function apagarDoc(caminho: string): Promise<void> {
  await chamar(`${BASE}/${caminho}`, { method: 'DELETE' });
}

/** Converte valor JS para o envelope REST do Firestore. */
function envelope(v: unknown): unknown {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(envelope) } };
  if (typeof v === 'object') {
    const f: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) f[k] = envelope(x);
    return { mapValue: { fields: f } };
  }
  return { nullValue: null };
}

/**
 * Um segmento de caminho de campo só dispensa crase quando é identificador
 * simples. `castelo-producoes` tem hífen, e sem crase o Firestore leria o
 * hífen como parte da sintaxe do caminho.
 */
function segmentoMascara(s: string): string {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(s) ? s : `\`${s.replace(/`/g, '\\`')}\``;
}

/**
 * PATCH cirúrgico. A máscara carrega o caminho INTEIRO (`a.b.c`), e o corpo
 * carrega a estrutura aninhada correspondente.
 *
 * ⚠️ O erro que este formato evita: mascarar só a raiz (`tenants`) e mandar um
 * mapa parcial APAGA todos os irmãos não enviados. Em `platform/rollups` isso
 * significaria perder os outros tenants ao renomear um. A máscara profunda toca
 * uma folha e deixa o resto do documento intacto.
 */
async function editarDoc(caminho: string, mudancas: Record<string, unknown>): Promise<void> {
  const u = new URL(`${BASE}/${caminho}`);
  const fields: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.');
    u.searchParams.append('updateMask.fieldPaths', partes.map(segmentoMascara).join('.'));

    // Aninha o valor sob o caminho, reaproveitando ramos já criados nesta volta.
    let alvo = fields;
    for (let i = 0; i < partes.length - 1; i += 1) {
      const p = partes[i] as string;
      const atual = alvo[p] as { mapValue?: { fields?: Record<string, unknown> } } | undefined;
      if (atual?.mapValue?.fields === undefined) alvo[p] = { mapValue: { fields: {} } };
      alvo = (alvo[p] as { mapValue: { fields: Record<string, unknown> } }).mapValue.fields;
    }
    alvo[partes[partes.length - 1] as string] = envelope(valor);
  }

  await chamar(u.toString(), { method: 'PATCH', body: JSON.stringify({ fields }) });
}

// ── Impressão ───────────────────────────────────────────────────────────────
function imprimir(op: Operacao, i: number, total: number): void {
  const n = `${String(i + 1).padStart(String(total).length, ' ')}/${total}`;
  if (op.tipo === 'apagar') {
    console.log(`  ${n} [ordem ${String(op.ordem).padStart(3)}] APAGAR  ${op.caminho}`);
    console.log(`        └─ ${op.motivo}`);
    return;
  }
  console.log(`  ${n} [ordem ${String(op.ordem).padStart(3)}] EDITAR  ${op.caminho}`);
  console.log(`        └─ ${op.motivo}`);
  for (const [k, v] of Object.entries(op.mudancas)) {
    console.log(`           ${k} = ${JSON.stringify(v).slice(0, 160)}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--apply');
  const backup = args.find((a) => a.startsWith('--backup='))?.slice('--backup='.length) ?? '';
  const verboso = args.includes('--verbose');

  if (aplicar && backup === '') {
    console.error('[limpeza] ABORTADO: --apply exige --backup=<uri do export do T1>.');
    console.error('          O backup é o que torna esta operação reversível. Sem ele, nada roda.');
    process.exit(2);
  }

  console.log('='.repeat(78));
  console.log(`LIMPEZA-PROD · ${PROJETO} · modo: ${aplicar ? 'APLICAR (ESCREVE)' : 'DRY-RUN (não escreve nada)'}`);
  if (aplicar) console.log(`backup informado: ${backup}`);
  console.log(`fica: tenant ${ALVO.tenantsMantidos.join(', ')} · eventos ${ALVO.eventosMantidos.join(', ')}`);
  console.log('='.repeat(78));

  console.log('\n[1/3] lendo produção…');
  const inventario = await inventariar();
  console.log(`      ${inventario.length} documentos lidos.`);

  console.log('\n[2/3] montando o plano…');
  const plano = planejarLimpeza(inventario, ALVO);
  const apagar = plano.operacoes.filter((o) => o.tipo === 'apagar').length;
  const editar = plano.operacoes.length - apagar;
  console.log(`      ${apagar} exclusões, ${editar} edições.`);

  console.log('\n── RESUMO POR COLEÇÃO ──');
  const formas = Object.entries(plano.resumoPorColecao).sort();
  console.log(`${'caminho'.padEnd(46)}${'apagar'.padStart(8)}${'editar'.padStart(8)}`);
  for (const [forma, n] of formas) {
    console.log(`${forma.slice(0, 45).padEnd(46)}${String(n.apagar).padStart(8)}${String(n.editar).padStart(8)}`);
  }

  console.log('\n── SOBREVIVE ──');
  const vivos = inventario.filter((d) => !plano.operacoes.some((o) => o.tipo === 'apagar' && o.caminho === d.caminho));
  console.log(`  ${vivos.length} documentos (de ${inventario.length}).`);
  for (const alvo of ['pedidos/', 'eventos/', 'tenants/']) {
    const n = vivos.filter((v) => v.caminho.startsWith(alvo) && v.caminho.split('/').length === 2).length;
    console.log(`  ${alvo.replace('/', '').padEnd(10)} ${n}`);
  }

  console.log('\n── ÓRFÃOS QUE O PLANO PREVINE ──');
  if (plano.orfaosPrevistos.length === 0) {
    console.log('  nenhuma referência pendurada NOVA prevista.');
  } else {
    for (const o of plano.orfaosPrevistos) console.log(`  ⚠️  ${o.caminho} :: ${o.campo} -> ${o.valor}`);
  }

  console.log('\n── CONTAS QUE PERDEM O ÚLTIMO LASTRO (não são apagadas aqui) ──');
  console.log(plano.contasSemLastro.length === 0 ? '  nenhuma.' : `  ${plano.contasSemLastro.join('\n  ')}`);

  if (verboso || !aplicar) {
    console.log('\n── PLANO, DOCUMENTO A DOCUMENTO, NA ORDEM ──');
    plano.operacoes.forEach((op, i) => imprimir(op, i, plano.operacoes.length));
  }

  if (!aplicar) {
    console.log('\n[3/3] DRY-RUN: nada foi escrito. Para executar, --apply --backup=<uri>.');
    return;
  }

  console.log('\n[3/3] APLICANDO…');
  let feitas = 0;
  for (const op of plano.operacoes) {
    if (op.tipo === 'apagar') await apagarDoc(op.caminho);
    else await editarDoc(op.caminho, op.mudancas);
    feitas += 1;
    if (feitas % 50 === 0) console.log(`      ${feitas}/${plano.operacoes.length}`);
  }
  console.log(`      ${feitas} operações aplicadas.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

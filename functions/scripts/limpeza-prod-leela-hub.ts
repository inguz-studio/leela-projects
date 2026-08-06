// =============================================================================
// limpeza-prod-leela-hub — enxuga o leela-hub para UMA produtora, dois eventos.
//
// ⚠️ ESTE SCRIPT APAGA DADO EM PRODUÇÃO. Por omissão ele NÃO escreve nada.
//
//   Simular (padrão, seguro) — grava o plano congelado em disco:
//     node <compilado> --dry-run
//   Executar (só com liberação do maestro):
//     node <compilado> --apply --backup=gs://... --plano=plano.json
//   Retomar depois de uma queda:
//     node <compilado> --apply --backup=gs://... --plano=plano.json --retomar
//
// Revisado depois da review antagonista `leela-rev-limpeza-20260806.md`.
// A inteligência mora em `../src/limpeza/planoLimpeza.ts` (função pura,
// testada contra dado sintético e contra o planejador antigo congelado).
// =============================================================================

/* eslint-disable no-console */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import {
  ORDEM,
  planejarLimpeza,
  type AlvoLimpeza,
  type DocInventario,
  type Operacao,
  type Plano,
} from '../src/limpeza/planoLimpeza';

const PROJETO = 'leela-hub';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

for (const v of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
  if (process.env[v] !== undefined) throw new Error(`[limpeza] ${v} definido — este runner não fala com emulador.`);
}

// ── O ALVO. [B2] Condenados são LISTA LITERAL, não "tudo menos o que fica". ──
// Derivar de "o que existe menos o que fica" faz a entidade deixar de ser
// condenada assim que morre: a segunda passada enxerga um banco pela metade e
// declara "0 órfãos". Estas listas foram MEDIDAS uma vez e revisadas por
// humano; mudar qualquer uma é mudar a decisão.
const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['castelo-producoes'],
  eventosMantidos: ['teste-taxa-repassada', 'corrida-inverno-floripa-2026'],
  eventosCondenados: [
    'desafio-mtb-costa-lagoa-2026',
    'maratona-floripa-2027',
    'meia-floripa-2026',
    'noturna-beira-mar-2026',
    'retiro-bem-estar-rio-vermelho-2026',
    'sao-silvestre-floripa-2025',
    'trilha-pantano-sul-2026',
  ],
  tenantsCondenados: ['corrida-perfeita', 'na-passada-eventos', 'passo-certo', 'ritmo-run-assessoria', 'trilhas-do-sul'],
  uidsProtegidos: [
    'QbqlSxanxlcFeHCy4g47Vp7jlgz1', // vitoreldp@gmail.com — o dono
    'wNXRTvMM3vc7Boyi91vRgx3DBQy2', // sessão que fez a compra real (8CDHM)
    'MOXZpvp8XugpwNN2ldZFIhmQh5H2', // checkout real (falhou) no evento que fica
    '10LF4k11YShiBa0TnNJI0kNY6eT2', // dugamer597@gmail.com — pessoa real
    'VFlceOpajTd8zgGqFXocI7iiHuS2', // eusouojoaocalixto@gmail.com — pessoa real
    'FTqslV98itZUNGwL5ss6201d23Z2', // admin@demo-leela.dev
  ],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
};

// ── Credencial. [A6] O token é cacheado em memória. ─────────────────────────
// Antes `tokenDeAcesso()` relia o configstore a cada requisição e nunca
// guardava o refresh: com o token vencido no meio, cada uma das ~2.800
// operações faria um POST extra no oauth2 — o caminho mais provável para a
// queda parcial que o B2 descreve.
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
let tokenCache: { valor: string; venceEm: number } | null = null;

async function tokenDeAcesso(): Promise<string> {
  if (tokenCache !== null && Date.now() < tokenCache.venceEm) return tokenCache.valor;
  const caminho = `${os.homedir()}/.config/configstore/firebase-tools.json`;
  if (!fs.existsSync(caminho)) throw new Error(`[limpeza] credencial ausente em ${caminho}. Rode: firebase login`);
  const store = JSON.parse(fs.readFileSync(caminho, 'utf8')) as {
    tokens?: { access_token?: string; refresh_token?: string; expires_at?: number };
  };
  const t = store.tokens ?? {};
  if (t.access_token !== undefined && t.expires_at !== undefined && Date.now() < t.expires_at - 120_000) {
    tokenCache = { valor: t.access_token, venceEm: t.expires_at - 120_000 };
    return tokenCache.valor;
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
  const d = (await r.json()) as { access_token?: string; expires_in?: number };
  if (d.access_token === undefined) throw new Error('[limpeza] refresh do token falhou');
  tokenCache = { valor: d.access_token, venceEm: Date.now() + (d.expires_in ?? 3600) * 1000 - 120_000 };
  return tokenCache.valor;
}

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
  createTime?: string;
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
  if ('arrayValue' in v) return ((v['arrayValue'] as { values?: unknown[] }).values ?? []).map(achatar);
  if ('mapValue' in v) return campos((v['mapValue'] as { fields?: Record<string, unknown> }).fields ?? {});
  return valor;
}
function campos(f: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) o[k] = achatar(v);
  return o;
}

/**
 * Lista uma coleção. `showMissing` traz o documento-fantasma: aquele que não
 * existe mas carrega subcoleção. Sem isso o subtree fica INVISÍVEL — foi o que
 * escondeu 31 documentos (`profissionais/{uid}/dashboard` sob pai inexistente)
 * do primeiro inventário desta lane.
 */
async function listar(colecao: string): Promise<DocREST[]> {
  const saida: DocREST[] = [];
  let pagina: string | null = null;
  do {
    const u = new URL(`${BASE}/${colecao}`);
    u.searchParams.set('pageSize', '300');
    u.searchParams.set('showMissing', 'true');
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
  const res = (await chamar(`${BASE}:listCollectionIds`, { method: 'POST', body: JSON.stringify({ pageSize: 300 }) })) as {
    collectionIds?: string[];
  } | null;
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

const existeDeVerdade = (d: DocREST): boolean => d.createTime !== undefined || d.fields !== undefined;

async function inventariar(): Promise<DocInventario[]> {
  const saida: DocInventario[] = [];
  const anda = async (colecao: string, nivel: number): Promise<void> => {
    const docs = await listar(colecao);
    for (const d of docs) {
      saida.push({
        caminho: d.name.split('/documents/')[1] ?? '',
        campos: campos(d.fields ?? {}),
        fantasma: !existeDeVerdade(d),
      });
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

// ── Escrita ─────────────────────────────────────────────────────────────────
async function apagarDoc(caminho: string): Promise<void> {
  await chamar(`${BASE}/${caminho}`, { method: 'DELETE' });
}

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

function segmentoMascara(s: string): string {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(s) ? s : `\`${s.replace(/`/g, '\\`')}\``;
}

/**
 * PATCH cirúrgico: a máscara carrega o caminho INTEIRO e o corpo a estrutura
 * aninhada. Mascarar só a raiz e mandar mapa parcial APAGA os irmãos.
 */
async function editarDoc(caminho: string, mudancas: Record<string, unknown>): Promise<void> {
  const u = new URL(`${BASE}/${caminho}`);
  const fields: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.');
    u.searchParams.append('updateMask.fieldPaths', partes.map(segmentoMascara).join('.'));
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

// ── [A4] O portão do backup, que agora prova alguma coisa ───────────────────
/**
 * Antes o portão só checava string não vazia: `--backup=x` passava. Agora ele
 * lista o prefixo no GCS, exige o metadado do export e devolve o instante em
 * que o backup foi tirado — que é o número que decide se ele serve.
 */
async function validarBackup(uri: string): Promise<{ objetos: number; tirado: string }> {
  const m = /^gs:\/\/([^/]+)\/(.+?)\/?$/.exec(uri);
  if (m === null) throw new Error(`[limpeza] --backup precisa ser gs://bucket/prefixo — recebi "${uri}"`);
  const [, bucket, prefixo] = m;
  const u = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
  u.searchParams.set('prefix', `${prefixo}/`);
  u.searchParams.set('maxResults', '1000');
  const res = (await chamar(u.toString())) as { items?: { name: string; updated: string }[] } | null;
  const itens = res?.items ?? [];
  if (itens.length === 0) throw new Error(`[limpeza] backup vazio ou inexistente em ${uri}`);
  const meta = itens.find((i) => i.name.endsWith('.overall_export_metadata'));
  if (meta === undefined) {
    throw new Error(`[limpeza] ${uri} não tem .overall_export_metadata — não é um export concluído do Firestore`);
  }
  return { objetos: itens.length, tirado: meta.updated };
}

// ── [A5] Plano congelado ────────────────────────────────────────────────────
/** Impressão digital estável do plano: mesma ordem, mesmo conteúdo. */
function digitalDoPlano(plano: Plano): string {
  return crypto.createHash('sha256').update(JSON.stringify(plano.operacoes)).digest('hex');
}

// ── [B2] Checkpoint ─────────────────────────────────────────────────────────
function lerCheckpoint(arquivo: string): Set<string> {
  if (!fs.existsSync(arquivo)) return new Set();
  return new Set(
    fs
      .readFileSync(arquivo, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
  );
}
const chaveDaOp = (op: Operacao): string => `${op.tipo}:${op.caminho}`;

const espera = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function imprimir(op: Operacao, i: number, total: number): void {
  const n = `${String(i + 1).padStart(String(total).length, ' ')}/${total}`;
  console.log(`  ${n} [ordem ${String(op.ordem).padStart(3)}] ${op.tipo === 'apagar' ? 'APAGAR' : 'EDITAR'}  ${op.caminho}`);
  console.log(`        └─ ${op.motivo}`);
  if (op.tipo === 'editar') {
    for (const [k, v] of Object.entries(op.mudancas)) console.log(`           ${k} = ${JSON.stringify(v).slice(0, 150)}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const aplicar = args.includes('--apply');
  const retomar = args.includes('--retomar');
  const backup = args.find((a) => a.startsWith('--backup='))?.slice('--backup='.length) ?? '';
  const arquivoPlano = args.find((a) => a.startsWith('--plano='))?.slice('--plano='.length) ?? 'plano-limpeza.json';
  const checkpoint = args.find((a) => a.startsWith('--checkpoint='))?.slice('--checkpoint='.length) ?? 'plano-limpeza.checkpoint';
  const aceitarConflitos = args.includes('--aceitar-conflitos-de-protecao');

  console.log('='.repeat(78));
  console.log(`LIMPEZA-PROD · ${PROJETO} · modo: ${aplicar ? 'APLICAR (ESCREVE)' : 'DRY-RUN (não escreve nada)'}`);
  console.log(`fica: tenant ${ALVO.tenantsMantidos.join(', ')} · eventos ${ALVO.eventosMantidos.join(', ')}`);
  console.log(`morre: ${ALVO.eventosCondenados.length} eventos · ${ALVO.tenantsCondenados.length} tenants (lista literal)`);
  console.log('='.repeat(78));

  if (aplicar) {
    if (backup === '') {
      console.error('[limpeza] ABORTADO: --apply exige --backup=<uri do export>. Sem ele nada roda.');
      process.exit(2);
    }
    const b = await validarBackup(backup);
    console.log(`\n[backup] ${b.objetos} objetos · export concluído em ${b.tirado}`);
    console.log('[backup] ⚠️  confira que este instante é POSTERIOR à última mudança que você quer preservar.');
  }

  console.log('\n[1/4] lendo produção (com showMissing)…');
  const inventario = await inventariar();
  const reais = inventario.filter((d) => d.fantasma !== true).length;
  console.log(`      ${reais} documentos reais · ${inventario.length - reais} fantasmas (pai inexistente com subcoleção)`);

  console.log('\n[2/4] montando o plano…');
  const plano = planejarLimpeza(inventario, ALVO);
  const digital = digitalDoPlano(plano);
  const apagar = plano.operacoes.filter((o) => o.tipo === 'apagar').length;
  console.log(`      ${apagar} exclusões, ${plano.operacoes.length - apagar} edições · digital ${digital.slice(0, 16)}`);

  console.log('\n── RESUMO POR COLEÇÃO ──');
  console.log(`${'caminho'.padEnd(46)}${'apagar'.padStart(8)}${'editar'.padStart(8)}`);
  for (const [forma, n] of Object.entries(plano.resumoPorColecao).sort()) {
    console.log(`${forma.slice(0, 45).padEnd(46)}${String(n.apagar).padStart(8)}${String(n.editar).padStart(8)}`);
  }

  const vivos = inventario.filter((d) => !plano.operacoes.some((o) => o.tipo === 'apagar' && o.caminho === d.caminho));
  console.log(`\n── SOBREVIVE ──\n  ${vivos.length} documentos (de ${inventario.length}).`);

  console.log('\n── ÓRFÃOS QUE O PLANO PREVINE ──');
  console.log(
    plano.orfaosPrevistos.length === 0
      ? '  nenhuma referência pendurada NOVA prevista.'
      : plano.orfaosPrevistos.map((o) => `  ⚠️  ${o.caminho} :: ${o.campo} -> ${o.valor}`).join('\n')
  );

  console.log('\n── DOCUMENTOS-FANTASMA ──');
  console.log(plano.fantasmas.length === 0 ? '  nenhum.' : plano.fantasmas.map((f) => `  👻 ${f}`).join('\n'));

  console.log('\n── [B3] PROTEÇÃO DE IDENTIDADE ──');
  console.log(`  intocáveis (fora do plano por caminho protegido): ${plano.intocaveis.length}`);
  for (const i of plano.intocaveis) console.log(`     ${i}`);
  console.log(`  conflitos (condenado que referencia uid protegido): ${plano.conflitosDeProtecao.length}`);
  for (const c of plano.conflitosDeProtecao.slice(0, 20)) console.log(`     ${c.caminho} :: ${c.campo} -> ${c.uid}`);
  if (plano.conflitosDeProtecao.length > 20) console.log(`     … e mais ${plano.conflitosDeProtecao.length - 20}`);

  console.log('\n── CONTAS QUE PERDEM O ÚLTIMO LASTRO (não são apagadas aqui) ──');
  console.log(plano.contasSemLastro.length === 0 ? '  nenhuma.' : `  ${plano.contasSemLastro.join('\n  ')}`);

  console.log('\n── [B4] RECOMPUTES OBRIGATÓRIOS DEPOIS DA CORRIDA ──');
  plano.recomputesObrigatorios.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));

  if (!aplicar) {
    fs.writeFileSync(arquivoPlano, JSON.stringify({ digital, alvo: ALVO, plano }, null, 2));
    console.log('\n── PLANO, DOCUMENTO A DOCUMENTO, NA ORDEM ──');
    plano.operacoes.forEach((op, i) => imprimir(op, i, plano.operacoes.length));
    console.log(`\n[3/4] plano congelado em ${arquivoPlano} (digital ${digital})`);
    console.log('[4/4] DRY-RUN: nada foi escrito. Para executar:');
    console.log(`      --apply --backup=<uri> --plano=${arquivoPlano}`);
    return;
  }

  // [A5] O --apply recusa executar um plano que ninguém leu.
  console.log('\n[3/4] conferindo contra o plano aprovado…');
  if (!fs.existsSync(arquivoPlano)) {
    console.error(`[limpeza] ABORTADO: ${arquivoPlano} não existe. Rode o --dry-run e revise antes.`);
    process.exit(2);
  }
  const congelado = JSON.parse(fs.readFileSync(arquivoPlano, 'utf8')) as { digital: string };
  if (congelado.digital !== digital) {
    console.error('[limpeza] ABORTADO: o plano recomputado DIVERGE do aprovado.');
    console.error(`          aprovado:   ${congelado.digital}`);
    console.error(`          recomputado:${digital}`);
    console.error('          Produção mudou desde a revisão. Refaça o dry-run e revise de novo.');
    process.exit(3);
  }
  console.log('      digital confere.');

  if (plano.conflitosDeProtecao.length > 0 && !aceitarConflitos) {
    console.error(`[limpeza] ABORTADO: ${plano.conflitosDeProtecao.length} condenado(s) referenciam uid protegido.`);
    console.error('          Isto é decisão do dono, não do script. Reveja a lista acima.');
    console.error('          Para seguir mesmo assim: --aceitar-conflitos-de-protecao');
    process.exit(4);
  }

  const feitas = lerCheckpoint(checkpoint);
  if (retomar) console.log(`      retomando: ${feitas.size} operações já registradas no checkpoint.`);
  else if (feitas.size > 0) {
    console.error(`[limpeza] ABORTADO: ${checkpoint} já tem ${feitas.size} operações. Use --retomar ou apague o arquivo.`);
    process.exit(5);
  }

  console.log('\n[4/4] APLICANDO…');
  let n = 0;
  let ordemAtual = plano.operacoes[0]?.ordem ?? 0;
  for (const op of plano.operacoes) {
    // [B1] Drenagem entre grupos de ordem: dá tempo aos gatilhos em voo do
    // grupo anterior antes de mexer no próximo. Sem isso, a garantia da ordem
    // vale só para a ENFILEIRAÇÃO, não para o efeito.
    if (op.ordem !== ordemAtual) {
      console.log(`      — drenando gatilhos do grupo ${ordemAtual} antes de entrar no ${op.ordem} —`);
      await espera(10_000);
      ordemAtual = op.ordem;
    }
    const chave = chaveDaOp(op);
    if (feitas.has(chave)) continue;
    if (op.tipo === 'apagar') await apagarDoc(op.caminho);
    else await editarDoc(op.caminho, op.mudancas);
    // [B2] Checkpoint POR OPERAÇÃO, gravado antes de seguir. Depois de uma
    // queda existe a lista exata do que foi feito.
    fs.appendFileSync(checkpoint, `${chave}\n`);
    n += 1;
    if (n % 50 === 0) console.log(`      ${n} aplicadas (ordem ${op.ordem})`);
  }
  console.log(`      ${n} operações aplicadas.`);
  console.log('\n⚠️  A LANE NÃO ACABOU. Execute os recomputes obrigatórios listados acima e confira');
  console.log('    gmvTotal, receitaLeelaTotal, tenantsAtivos, eventosAtivos e vendidoBruto.');
  void ORDEM;
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

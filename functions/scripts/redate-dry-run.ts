// =============================================================================
// functions/scripts/redate-dry-run.ts — prova OFFLINE do patch de re-datação
// (lane CHECKOUT-UX, task A1 / T-SEED-2).
//
// Por que existe: o defeito do double-redate só se manifestava no caminho REAL
// da biblioteca (`DocumentReference.set` é implementado por cima de
// `WriteBatch.set` no @google-cloud/firestore@7.11.6). Um teste de unidade da
// função `redate()` isolada NÃO pegaria o bug — ele nasce da composição dos
// patches dentro da lib. Este dry-run exercita as classes reais, intercepta o
// payload no ponto em que ele chega ao código original da biblioteca e compara
// os deslocamentos dos DOIS caminhos de escrita.
//
// SEM REDE, SEM CREDENCIAL: `WriteBatch.commit` é stubado. Nada sai do processo.
//
// Uso:
//   node --import tsx functions/scripts/redate-dry-run.ts
// Exit 0 = patch correto (um único deslocamento nos dois caminhos).
// Exit 1 = regressão (algum caminho deslocou 2×).
// =============================================================================

/* eslint-disable no-console */

// Import pela MESMA porta que `redate.ts` usa — garante o mesmo objeto de
// protótipo (duas cópias resolvidas do @google-cloud/firestore invalidariam a
// prova sem falhar de forma visível).
import * as admin from 'firebase-admin';
import { WriteBatch, Timestamp } from 'firebase-admin/firestore';

import { instalarRedatePatch, criarRedate } from './redate';

const DIA_MS = 86_400_000;
const OFFSET_DIAS = 135;
const OFFSET_MS = OFFSET_DIAS * DIA_MS;

/** Data-fonte real do seed: início da janela do RITMOFORTE10. */
const FONTE = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
const ESPERADO_MS = FONTE.toMillis() + OFFSET_MS;

type Captura = { caminho: string; data: Record<string, unknown> };

async function main(): Promise<void> {
  if (!admin.apps.length) admin.initializeApp({ projectId: 'dry-run-sem-rede' });
  const db = admin.firestore();

  // 1) Espião no ponto de entrada ORIGINAL da lib: capturamos o payload que o
  //    código real do Firestore recebe, depois de todos os patches.
  const capturas: Captura[] = [];
  const setOriginal = WriteBatch.prototype.set;
  (WriteBatch.prototype as unknown as Record<string, unknown>)['set'] =
    function espiao(this: WriteBatch, ref: unknown, data: unknown, opts?: unknown) {
      capturas.push({
        caminho: (ref as { path: string }).path,
        data: data as Record<string, unknown>,
      });
      return opts === undefined
        ? (setOriginal as Function).call(this, ref, data)
        : (setOriginal as Function).call(this, ref, data, opts);
    };

  // 2) Commit stubado — nenhuma chamada de rede, nenhuma credencial.
  const commitOriginal = WriteBatch.prototype.commit;
  (WriteBatch.prototype as unknown as Record<string, unknown>)['commit'] =
    async function semRede(this: WriteBatch) {
      return [];
    };

  // 3) O patch de produção por cima do espião — exatamente a ordem do runner.
  const desinstalar = instalarRedatePatch(OFFSET_MS);

  const refDoc = db.collection('cupons').doc('via-ref-set');
  const refBatch = db.collection('cupons').doc('via-batch-set');

  // Caminho A — `ref.set(...)`, o do `upsert()` dos seeds (era o defeituoso).
  await refDoc.set({ inicio: FONTE, nome: 'RITMOFORTE10' }, { merge: true });

  // Caminho B — `batch.set(...)`, o dos seeds canônicos (sempre esteve certo).
  const batch = db.batch();
  batch.set(refBatch, { inicio: FONTE, nome: 'HEROI10' });
  await batch.commit();

  desinstalar();
  (WriteBatch.prototype as unknown as Record<string, unknown>)['set'] = setOriginal;
  (WriteBatch.prototype as unknown as Record<string, unknown>)['commit'] = commitOriginal;

  // 4) Veredito.
  let falhas = 0;
  console.log(
    `[dry-run] offset de referência: +${OFFSET_DIAS} d · fonte ${FONTE.toDate().toISOString()}`
  );
  console.log(`[dry-run] esperado: ${new Date(ESPERADO_MS).toISOString()}\n`);

  for (const { caminho, data } of capturas) {
    const inicio = data['inicio'] as Timestamp;
    const deltaDias = Math.round((inicio.toMillis() - FONTE.toMillis()) / DIA_MS);
    const ok = inicio.toMillis() === ESPERADO_MS;
    if (!ok) falhas++;
    console.log(
      `${ok ? 'OK  ' : 'FALHA'} ${caminho.padEnd(28)} ` +
        `${inicio.toDate().toISOString()}  (+${deltaDias} d)`
    );
  }

  if (capturas.length !== 2) {
    console.error(
      `[dry-run] FALHA: esperava 2 escritas capturadas, veio ${capturas.length}. ` +
        'A topologia interna da lib mudou — revisar o patch.'
    );
    falhas++;
  }

  // 5) Prova complementar: o marcador de idempotência não vaza para o documento.
  const redate = criarRedate(OFFSET_MS);
  const uma = redate({ inicio: FONTE, aninhado: { fim: FONTE } });
  const duas = redate(uma);
  const chavesVisiveis = JSON.stringify(Object.keys(uma as object));
  const simbolos = Object.getOwnPropertySymbols(uma as object).length;
  const inicioUma = (uma as Record<string, Timestamp | undefined>)['inicio'];
  const inicioDuas = (duas as Record<string, Timestamp | undefined>)['inicio'];
  const idempotente =
    inicioUma !== undefined &&
    inicioDuas !== undefined &&
    inicioUma.toMillis() === inicioDuas.toMillis() &&
    uma === duas;
  console.log(
    `\n${idempotente ? 'OK  ' : 'FALHA'} redate idempotente · ` +
      `chaves enumeráveis=${chavesVisiveis} · symbols ocultos=${simbolos} · ` +
      `JSON=${JSON.stringify(uma)}`
  );
  if (!idempotente) falhas++;

  if (falhas > 0) {
    console.error(`\n[dry-run] ${falhas} FALHA(S) — patch de re-datação incorreto.`);
    process.exit(1);
  }
  console.log('\n[dry-run] PASS — deslocamento único nos dois caminhos de escrita.');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[dry-run] ERRO:', err);
  process.exit(1);
});

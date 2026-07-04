// =============================================================================
// functions/src/seed/inscritos.seed.ts
//
// Seed dos 453 inscritos canônicos da Meia Maratona Floripa 2026
// (LEELA-S203-T1 · E03 · HANDOFF-05).
//
// Distribuição por kit espelha o protótipo (Kits-Cadastro.html):
//   kit_ouro 43 (21k) · kit_prata 218 (10k/21k) · kit_basico 168 (5k/10k/21k)
//   · sem_kit 24 (5k)  →  total 453.
//
// Determinístico e idempotente: docIds fixos (insc-0001…insc-0453), nomes de
// pools fixos, timestamps derivados do índice — rerun produz docs idênticos.
// chipNumero começa null (RN-203 — só a entrega vincula).
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID } from './eventos.seed';

export const TOTAL_INSCRITOS_MEIA_FLORIPA = 453;

const NOMES = [
  'Marina', 'João', 'Ana', 'Pedro', 'Carla', 'Lucas', 'Beatriz', 'Rafael',
  'Juliana', 'Gustavo', 'Fernanda', 'Diego', 'Camila', 'Bruno', 'Larissa',
  'Thiago', 'Patrícia', 'Felipe', 'Aline', 'Rodrigo', 'Vanessa', 'Marcelo',
  'Renata', 'André', 'Tatiane', 'Eduardo', 'Simone', 'Vinícius', 'Priscila',
  'Leandro',
] as const;

const SOBRENOMES = [
  'Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues',
  'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes',
  'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Mendes', 'Barros',
  'Freitas', 'Barbosa', 'Pinto', 'Moura', 'Cavalcanti', 'Dias', 'Castro',
  'Campos', 'Cardoso',
] as const;

export type KitSeed = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit';
export type StatusSeed = 'confirmado' | 'pendente' | 'cancelado';

export interface InscritoSeed {
  id: string;
  tenantId: string;
  atletaId: string;
  atletaNome: string;
  kit: KitSeed;
  chipNumero: null;
  status: StatusSeed;
  modalidade: string;
  /** millis determinístico (inscrições entre Jan e Abr 2026) */
  criadoEmMillis: number;
}

/** Kit por posição (1-based) — espelha a distribuição do protótipo */
function kitPorIndice(i: number): KitSeed {
  if (i <= 43) return 'kit_ouro';
  if (i <= 43 + 218) return 'kit_prata';
  if (i <= 43 + 218 + 168) return 'kit_basico';
  return 'sem_kit';
}

/** Modalidade coerente com o kit (ouro só 21k; sem_kit só 5k — protótipo) */
function modalidadePorIndice(i: number, kit: KitSeed): string {
  if (kit === 'kit_ouro') return '21k';
  if (kit === 'sem_kit') return '5k';
  if (kit === 'kit_prata') return i % 2 === 0 ? '10k' : '21k';
  const ciclo = ['5k', '10k', '21k'] as const;
  return ciclo[i % 3] as string;
}

/** Status determinístico: ~22 pendentes, ~6 cancelados, resto confirmado */
function statusPorIndice(i: number): StatusSeed {
  if (i % 65 === 0) return 'cancelado';
  if (i % 20 === 0) return 'pendente';
  return 'confirmado';
}

/** Gera a lista determinística dos 453 inscritos canônicos. @pure */
export function gerarInscritosSeed(): InscritoSeed[] {
  const base = Date.UTC(2026, 0, 5, 12, 0, 0); // 05 Jan 2026
  const inscritos: InscritoSeed[] = [];

  for (let i = 1; i <= TOTAL_INSCRITOS_MEIA_FLORIPA; i++) {
    const seq = String(i).padStart(4, '0');
    const kit = kitPorIndice(i);
    const nome = NOMES[(i - 1) % NOMES.length] as string;
    const sobrenome = SOBRENOMES[Math.floor((i - 1) / NOMES.length) % SOBRENOMES.length] as string;

    inscritos.push({
      id: `insc-${seq}`,
      tenantId: CASTELO_TENANT_ID,
      atletaId: `atleta-${seq}`,
      atletaNome: `${nome} ${sobrenome}`,
      kit,
      chipNumero: null,
      status: statusPorIndice(i),
      modalidade: modalidadePorIndice(i, kit),
      criadoEmMillis: base + i * 5 * 60 * 60 * 1000, // +5h por inscrição
    });
  }

  return inscritos;
}

/**
 * Popula `eventos/meia-floripa-2026/inscritos` com os 453 canônicos.
 * Idempotente: docIds e timestamps determinísticos — rerun regrava igual.
 */
export async function seedInscritos(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedInscritos');

  const inscritos = gerarInscritosSeed();
  const col = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection('inscritos');

  // Batches de 400 (limite Firestore: 500 writes por batch)
  for (let inicio = 0; inicio < inscritos.length; inicio += 400) {
    const batch = db.batch();
    for (const inscrito of inscritos.slice(inicio, inicio + 400)) {
      const ts = admin.firestore.Timestamp.fromMillis(inscrito.criadoEmMillis);
      batch.set(col.doc(inscrito.id), {
        id: inscrito.id,
        tenantId: inscrito.tenantId,
        atletaId: inscrito.atletaId,
        atletaNome: inscrito.atletaNome,
        kit: inscrito.kit,
        chipNumero: inscrito.chipNumero,
        status: inscrito.status,
        modalidade: inscrito.modalidade,
        criadoEm: ts,
        atualizadoEm: ts,
      });
    }
    await batch.commit();
  }

  console.log(
    `[seed] inscritos: ${inscritos.length} na Meia Floripa 2026 ` +
      '(43 ouro · 218 prata · 168 básico · 24 sem kit)'
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedInscritos(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}

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
import { Timestamp } from 'firebase-admin/firestore';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID } from './eventos.seed';
import { assinarQrToken, obterQrKeyring } from '../eventos/qrToken';
import { INGRESSO_CODIGOS_SUBCOL } from '../eventos/emitirIngressos';
import { gerarCodigoIngresso } from '@leela/core';

/**
 * RNG determinístico por semente textual (S1206-T5 · RN-396) — o código do
 * ingresso no seed tem de ser IDÊNTICO a cada rerun, senão o preview do dono
 * troca o número da linha a cada `seed` e a coluna vira ruído. FNV-1a + xorshift
 * é o mínimo que dá boa dispersão sem dependência nova.
 */
function rngDeterministico(semente: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let estado = h || 0x9e3779b9;
  return () => {
    estado ^= estado << 13;
    estado >>>= 0;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    estado >>>= 0;
    return estado / 0x100000000;
  };
}

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
  /**
   * RN-223 (S209-T1) — tamanho por item TAMANHADO do kit (`itemId →
   * tamanho`). Kits com camiseta (prata/básico) carregam o tamanho;
   * ouro/sem_kit ficam `{}` (nenhum item tamanhado no kit).
   */
  tamanhos: Record<string, string>;
  /** millis determinístico (inscrições entre Jan e Abr 2026) */
  criadoEmMillis: number;
}

/** Ciclo determinístico de tamanhos da camiseta (alinha TAMANHOS_CAMISETA) */
const TAMANHOS_SEED = ['P', 'M', 'G', 'GG'] as const;

/**
 * Tamanhos por kit (RN-223): só os kits que INCLUEM a camiseta tamanhada
 * (`camiseta-tecnica` ∈ kit_prata/kit_basico — ver ITEM_KIT_SEEDS) coletam
 * tamanho; determinístico pelo índice (rerun idêntico).
 */
function tamanhosPorIndice(i: number, kit: KitSeed): Record<string, string> {
  if (kit !== 'kit_prata' && kit !== 'kit_basico') return {};
  return { 'camiseta-tecnica': TAMANHOS_SEED[i % TAMANHOS_SEED.length] as string };
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
      tamanhos: tamanhosPorIndice(i, kit),
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

  // Emissão do ingresso assinado (S208-T3/S1206): só quando o keyring está
  // configurado no ambiente (QR_TOKEN_KEYS/QR_TOKEN_KID_ATIVO). Sem keyring
  // o seed segue idêntico ao anterior (compat) e o check-in fica fail-closed.
  // Segredo NUNCA hardcoded — nem em seed emulator-only.
  const keyring = obterQrKeyring();
  if (keyring === null) {
    console.warn(
      '[seed] QR_TOKEN_KEYS ausente — inscritos SEM qrToken assinado ' +
        '(registrarCheckin fail-closed). Configure o env para testar o QR.'
    );
  }

  // Código identificador do ingresso (S1206-T5 · RN-396). Único POR EVENTO:
  // o seed é o único escritor deste evento no momento em que roda, então a
  // unicidade se resolve em memória (Set) — e as reservas em
  // `ingressoCodigos` são gravadas junto, para que uma emissão real posterior
  // no mesmo evento nunca sorteie um código que o seed já usou.
  const reservas = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection(INGRESSO_CODIGOS_SUBCOL);
  const codigosUsados = new Set<string>();
  const codigoDoInscrito = new Map<string, string>();
  for (const inscrito of inscritos) {
    if (keyring === null || inscrito.status === 'pendente') continue;
    const random = rngDeterministico(`${MEIA_FLORIPA_ID}:${inscrito.id}`);
    let codigo = gerarCodigoIngresso(random);
    // Determinístico também na colisão: o mesmo RNG continua de onde parou.
    while (codigosUsados.has(codigo)) codigo = gerarCodigoIngresso(random);
    codigosUsados.add(codigo);
    codigoDoInscrito.set(inscrito.id, codigo);
  }

  // Batches de 200 (limite Firestore: 500 writes por batch). Eram 400 até o
  // ingresso ganhar código: agora cada inscrito emitido gasta DOIS writes —
  // o doc e a reserva do código — e 400 estouraria o limite.
  for (let inicio = 0; inicio < inscritos.length; inicio += 200) {
    const batch = db.batch();
    for (const inscrito of inscritos.slice(inicio, inicio + 200)) {
      const ts = Timestamp.fromMillis(inscrito.criadoEmMillis);
      const doc: Record<string, unknown> = {
        id: inscrito.id,
        tenantId: inscrito.tenantId,
        atletaId: inscrito.atletaId,
        atletaNome: inscrito.atletaNome,
        kit: inscrito.kit,
        chipNumero: inscrito.chipNumero,
        status: inscrito.status,
        modalidade: inscrito.modalidade,
        tamanhos: inscrito.tamanhos,
        criadoEm: ts,
        atualizadoEm: ts,
      };
      // Ingresso emitido para confirmados (RN-218 — emissão pós-pagamento) e
      // cancelados (foram confirmados um dia — exercita INSCRITO_CANCELADO);
      // pendente não pagou ⇒ sem ingresso. Determinístico: HMAC de payload
      // fixo sob chave fixa ⇒ rerun regrava idêntico.
      if (keyring !== null && inscrito.status !== 'pendente') {
        doc['qrToken'] = assinarQrToken(
          {
            inscritoId: inscrito.id,
            eventoId: MEIA_FLORIPA_ID,
            tenantId: inscrito.tenantId,
          },
          keyring
        );
        doc['ingressoEmitidoEm'] = ts;
        const codigo = codigoDoInscrito.get(inscrito.id);
        if (codigo !== undefined) {
          doc['codigoIngresso'] = codigo;
          batch.set(reservas.doc(codigo), {
            inscritoId: inscrito.id,
            eventoId: MEIA_FLORIPA_ID,
            tenantId: inscrito.tenantId,
            criadoEm: ts,
          });
        }
      }
      batch.set(col.doc(inscrito.id), doc);
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

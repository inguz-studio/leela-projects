// =============================================================================
// functions/src/seed/kits.seed.ts
//
// Seed dos kits e itens de kit canônicos da Meia Maratona Floripa 2026
// (LEELA-S205-T1 · E03 · protótipo Kits-Cadastro.html).
//
// Kits (4, incl. "Sem kit" — RN-210/211):
//   Kit Ouro   +R$ 89 · só 21k          Kit Prata +R$ 35 · 10k/21k
//   Kit básico R$ 0   · todas           Sem kit   −R$ 15 · só 5k (DESCONTO)
//
// Itens (6 — RN-212/213/214/215): camiseta tamanhada do organizador;
// número de peitoral; sacochila (Olympikus), whey (Growth Supplements),
// viseira (Centauro) com logo ON; gel (Probiótica) com logo OFF.
// Vários itens em MÚLTIPLOS kits (RN-215) — índice `usadoEm` materializado
// no fim via syncItemUsadoEm (mesmo código da Function itemKitIndex).
//
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID } from './eventos.seed';
import { syncItemUsadoEm } from '../eventos/itemKitIndex';

export interface KitSeedDef {
  id: string;
  nome: string;
  preco: number;
  capacidade: number;
  modalidades: string[];
}

// CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): o id do kit canônico É o valor do
// enum `KitInscrito` (`kit_ouro`, underscore) — o join `inscrito.kit ===
// Kit.id` casa DIRETO, sem ponte de delimitador (kitCasa/kitDocId removidos).
// Ids legados com hífen (`kit-ouro`) são apagados por `limparKitsLegados`.
export const KIT_SEEDS: KitSeedDef[] = [
  { id: 'kit_ouro', nome: 'Kit Ouro', preco: 89, capacidade: 80, modalidades: ['21k'] },
  { id: 'kit_prata', nome: 'Kit Prata', preco: 35, capacidade: 260, modalidades: ['10k', '21k'] },
  { id: 'kit_basico', nome: 'Kit básico', preco: 0, capacidade: 300, modalidades: ['5k', '10k', '21k'] },
  // RN-211: "Sem kit" é kit válido com preço NEGATIVO (desconto)
  { id: 'sem_kit', nome: 'Sem kit', preco: -15, capacidade: 60, modalidades: ['5k'] },
];

/** Ids legados (hífen) — removidos do Emulator ao ressemear (FABLE-E-T1). */
const KIT_IDS_LEGADOS = ['kit-ouro', 'kit-prata', 'kit-basico', 'sem-kit'];

export interface ItemKitSeedDef {
  id: string;
  nome: string;
  tamanhado: boolean;
  origem: 'organizador' | 'patrocinador';
  marca?: string;
  exibirLogo: boolean;
  /** RN-225 (S210-T1) — modelo de estoque do item */
  modeloEstoque: 'sob_encomenda' | 'estoque_proprio';
  /** RN-223 (S210-T1) — tamanhos válidos (só item tamanhado) */
  tamanhosDisponiveis: string[];
  kits: string[];
}

/** Tamanhos canônicos da camiseta (RN-223 — protótipo Kits-Estoque) */
export const TAMANHOS_CAMISETA = ['P', 'M', 'G', 'GG'];

// `modeloEstoque` do seed é FIXTURE (não regra): a camiseta tamanhada roda
// `sob_encomenda` — o caso que exercita RN-224 ("a encomendar" = vendido −
// estoque); os itens únicos ficam `estoque_proprio`.
export const ITEM_KIT_SEEDS: ItemKitSeedDef[] = [
  {
    id: 'camiseta-tecnica',
    nome: 'Camiseta técnica Be Hero',
    tamanhado: true, // RN-212 — único item tamanhado do catálogo canônico
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: TAMANHOS_CAMISETA,
    kits: ['kit_prata', 'kit_basico'], // RN-215 — em 2 kits
  },
  {
    id: 'numero-peitoral',
    nome: 'Número de peitoral com chip',
    tamanhado: false,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [],
    kits: ['kit_ouro', 'kit_prata', 'kit_basico'],
  },
  {
    id: 'sacochila-evento',
    nome: 'Sacochila do evento',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Olympikus',
    exibirLogo: true, // RN-214 — toggle ON
    modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [],
    kits: ['kit_ouro', 'kit_prata'],
  },
  {
    id: 'whey-30g',
    nome: 'Sachê de whey protein 30g',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Growth Supplements',
    exibirLogo: true,
    modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [],
    kits: ['kit_ouro', 'kit_prata', 'kit_basico'],
  },
  {
    id: 'viseira-tecnica',
    nome: 'Viseira técnica',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Centauro',
    exibirLogo: true,
    modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [],
    kits: ['kit_ouro', 'kit_prata'],
  },
  {
    id: 'gel-carboidrato',
    nome: 'Gel de carboidrato 30g',
    tamanhado: false,
    origem: 'patrocinador',
    marca: 'Probiótica',
    exibirLogo: false, // RN-214 — toggle OFF (visibilidade desativada)
    modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [],
    kits: ['kit_ouro', 'kit_prata'],
  },
];

/**
 * Popula kits + itensKit no Firestore (Emulator) e materializa `usadoEm`.
 * Idempotente: docIds fixos, merge, criadoEm só na criação (F8); o sync do
 * índice é recompute-if-different (mesma garantia da Function).
 */
export async function seedKits(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedKits');

  const now = FieldValue.serverTimestamp();
  const kitsCol = db.collection('eventos').doc(MEIA_FLORIPA_ID).collection('kits');
  const itensCol = db.collection('itensKit');

  const batch = db.batch();

  // FABLE-E-T1: remove docs legados de id com hífen (Emulator persistido) —
  // sem isto o rename criaria kit_ouro AO LADO de kit-ouro (duplicata na UI).
  for (const idLegado of KIT_IDS_LEGADOS) {
    batch.delete(kitsCol.doc(idLegado));
  }

  for (const kit of KIT_SEEDS) {
    const ref = kitsCol.doc(kit.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: kit.id,
      tenantId: CASTELO_TENANT_ID,
      nome: kit.nome,
      preco: kit.preco,
      capacidade: kit.capacidade,
      modalidades: kit.modalidades,
      atualizadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    batch.set(ref, data, { merge: true });
  }

  for (const item of ITEM_KIT_SEEDS) {
    const ref = itensCol.doc(item.id);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: item.id,
      tenantId: CASTELO_TENANT_ID,
      eventoId: MEIA_FLORIPA_ID,
      nome: item.nome,
      tamanhado: item.tamanhado,
      origem: item.origem,
      exibirLogo: item.exibirLogo,
      modeloEstoque: item.modeloEstoque,
      tamanhosDisponiveis: item.tamanhosDisponiveis,
      kits: item.kits,
      atualizadoEm: now,
    };
    if (item.marca !== undefined) data['marca'] = item.marca;
    if (!snap.exists) data['criadoEm'] = now;
    batch.set(ref, data, { merge: true });
  }

  await batch.commit();

  // Materializa o índice inverso "usado em" (RN-215) — mesmo código da Function
  for (const item of ITEM_KIT_SEEDS) {
    await syncItemUsadoEm(db, item.id);
  }

  console.log(
    `[seed] kits: ${KIT_SEEDS.length} (incl. "Sem kit" −R$15) + ` +
      `${ITEM_KIT_SEEDS.length} itens de kit com usadoEm materializado`
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
  seedKits(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}

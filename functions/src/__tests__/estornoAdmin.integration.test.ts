/**
 * estornoAdmin.integration.test.ts — LEELA-ESTORNO-T4 (RN-376/377/378)
 * (⚠️ EXIGE Firestore Emulator 8080.)
 *
 * O painel admin INTERNO cross-tenant (decisão 43, opção b) e as duas ações
 * que ele ganhou, contra o Emulator + Rules REAIS:
 *
 *   - PORTA DO ADMIN: `platform_admin` NÃO tem `tenantId` no claim, então
 *     todo guard de escrita o recusava. Aqui ele opera o tenant alheio e sai
 *     carimbado com trilha `plataforma` — a prova de quem mandou;
 *   - FURAR O CORTE (decisão 44 · RN-376): só o admin, só com motivo, e o
 *     motivo fica NO DOC. Organizador que tentar leva permission-denied, e o
 *     bloqueio normal da véspera continua de pé;
 *   - TENANT SUSPENSO: o organizador para (RN-402), o admin passa — é
 *     justamente quando alguém precisa devolver o dinheiro preso;
 *   - CANCELAR SEM ESTORNAR (decisão 45 · RN-377): admin cancela qualquer
 *     coisa, organizador só fora do corte; o DINHEIRO fica (pagamento e
 *     receita intactos, verificado número a número) e a trilha nasce com
 *     `dinheiroDevolvido: false`.
 *
 * Comando: npx firebase-tools@13 emulators:exec --project demo-leela \
 *   "npx vitest run src/__tests__/estornoAdmin.integration.test.ts"
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
  type CreateInscricaoChargeResult,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { decideRefundCore, REEMBOLSOS_SUBCOL, requestRefundCore } from '../finance/requestRefund';
import {
  cancelarInscricaoCore,
  CANCELAMENTOS_SUBCOL,
} from '../finance/cancelarInscricao';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estorno-admin';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-2026';
const EVENTO_VESPERA = 'noturna-vespera-2026';
const ANA_UID = 'uid-ana-atleta';
const MARINA_UID = 'uid-marina';
const ADMIN_UID = 'uid-platform-admin';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};
/** O ponto do T4: claim SEM tenantId — é assim que o admin real chega. */
const platformAdmin: EventoCaller = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as AuthClaims,
};
const athlete: EventoCaller = { uid: ANA_UID, claims: { role: 'athlete' } as AuthClaims };
const promoter: EventoCaller = {
  uid: 'uid-prom',
  claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims,
};
const outroTenant: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo Eventos', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  for (const id of [EVENTO_ID, EVENTO_VESPERA]) {
    const eventoRef = db.collection('eventos').doc(id);
    batch.set(eventoRef, {
      id, tenantId: TENANT_ID, organizadorId: MARINA_UID,
      nome: `Evento ${id}`, data: tsRel(45), local: 'Florianópolis/SC',
      modalidades: ['10k'], slug: id, status: 'publicado', usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
      id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2, nome: 'Lote 2',
      inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 189.9, vendidos: 40,
      criadoEm: now, atualizadoEm: now,
    });
  }
  // SEM politicaVendas: defaults legais (7d de arrependimento, corte de 48h).
  await batch.commit();
}

async function criarPedidoPago(
  eventoId: string,
  key: string,
  n = 1
): Promise<CreateInscricaoChargeResult> {
  const input: CreateInscricaoChargeInput = {
    eventoId,
    inscritos: Array.from({ length: n }, (_, i) => ({
      nome: `Atleta ${key} ${i + 1}`,
      email: `a${i + 1}.${key}@exemplo.com`,
      cpf: '529.982.247-25',
      modalidade: '10k',
    })),
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    // RN-333 pede 8–64 caracteres; o prefixo garante o piso e mantém as
    // chaves legíveis no dump do Emulator.
    idempotencyKey: `estadm-${key}`,
  };
  const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
  await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
  return charge;
}

/**
 * Empurra o EVENTO para a véspera DEPOIS da compra. Comprar já na véspera
 * esbarraria nas guardas de venda; o que este teste precisa provar é o corte
 * do REEMBOLSO, não o da venda.
 */
async function porNaVespera(eventoId: string): Promise<void> {
  await db.doc(`eventos/${eventoId}`).update({ data: tsRel(1) });
}
async function restaurarData(eventoId: string): Promise<void> {
  await db.doc(`eventos/${eventoId}`).update({ data: tsRel(45) });
}

async function backdatarPedido(pedidoId: string, dias: number): Promise<void> {
  await db.doc(`pedidos/${pedidoId}`).update({ criadoEm: tsRel(-dias) });
}

const reembolsoDe = (eventoId: string, inscritoId: string) =>
  db.doc(`eventos/${eventoId}/${REEMBOLSOS_SUBCOL}/${inscritoId}`);
const cancelamentoDe = (eventoId: string, inscritoId: string) =>
  db.doc(`eventos/${eventoId}/${CANCELAMENTOS_SUBCOL}/${inscritoId}`);

/**
 * Recusa por PAPEL. Prende o `code` do HttpsError, não a frase: a mensagem é
 * texto de produto e muda; o código é o contrato que o cliente lê.
 */
async function esperaNegado(p: Promise<unknown>): Promise<void> {
  await expect(p).rejects.toMatchObject({ code: 'permission-denied' });
}

async function inscritosDoPedido(pedidoId: string): Promise<string[]> {
  return ((await db.doc(`pedidos/${pedidoId}`).get()).get('inscritoRefs') as string[]) ?? [];
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: 'localhost', port: 8080 },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await testEnv.clearFirestore();
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ─────────────────────────────────────────────────────────────────────────────
// A porta do admin (decisão 43-b)
// ─────────────────────────────────────────────────────────────────────────────

describe('platform_admin estorna cross-tenant (RN-376)', () => {
  it('abre e executa sem ter tenantId no claim, e o doc guarda a trilha', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'adm-cross-01');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);

    const res = await requestRefundCore(
      db,
      provider,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'suporte da plataforma' },
      platformAdmin
    );
    expect(res.estado).toBe('estornado');

    const doc = await reembolsoDe(EVENTO_ID, inscritoId!).get();
    // A origem é o que separa "o organizador decidiu" de "a plataforma mexeu".
    expect(doc.get('origem')).toBe('plataforma');
    expect(doc.get('tenantId')).toBe(TENANT_ID);
    expect(doc.get('transicoes')[0].por).toBe(ADMIN_UID);
    // Sem furo de corte não há por que carimbar override.
    expect(doc.get('overrideCorte')).toBeUndefined();

    const inscrito = await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get();
    expect(inscrito.get('status')).toBe('estornado');
  });

  it('abertura do organizador continua saindo como "organizador"', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'adm-cross-02');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await requestRefundCore(
      db,
      provider,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'pedido do atleta' },
      organizador
    );
    expect((await reembolsoDe(EVENTO_ID, inscritoId!).get()).get('origem')).toBe('organizador');
  });

  it('athlete, promoter e tenant alheio seguem negados na porta nova', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'adm-cross-03');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    const input = { pedidoId: charge.pedidoId, inscritoId, motivo: 'tentativa' };
    await esperaNegado(requestRefundCore(db, provider, input, athlete));
    await esperaNegado(requestRefundCore(db, provider, input, promoter));
    await esperaNegado(requestRefundCore(db, provider, input, outroTenant));
    expect((await reembolsoDe(EVENTO_ID, inscritoId!).get()).exists).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Furar o corte de véspera (decisão 44)
// ─────────────────────────────────────────────────────────────────────────────

describe('corte de véspera — quem pode furar (RN-339/376)', () => {
  it('organizador na véspera continua bloqueado, e nada é criado', async () => {
    const charge = await criarPedidoPago(EVENTO_VESPERA, 'vesp-01');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await porNaVespera(EVENTO_VESPERA);
    try {
      await expect(
        requestRefundCore(
          db,
          provider,
          { pedidoId: charge.pedidoId, inscritoId, motivo: 'desisti' },
          organizador
        )
      ).rejects.toThrow(/RN-339/);
      expect((await reembolsoDe(EVENTO_VESPERA, inscritoId!).get()).exists).toBe(false);
    } finally {
      await restaurarData(EVENTO_VESPERA);
    }
  });

  it('organizador NÃO fura o corte nem mandando a flag', async () => {
    const charge = await criarPedidoPago(EVENTO_VESPERA, 'vesp-02');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await porNaVespera(EVENTO_VESPERA);
    try {
      await expect(
        requestRefundCore(
          db,
          provider,
          {
            pedidoId: charge.pedidoId,
            inscritoId,
            motivo: 'desisti',
            overrideCorte: true,
            motivoOverride: 'eu decido',
          },
          organizador
        )
      ).rejects.toThrow(/permission-denied|RN-376/i);
      expect((await reembolsoDe(EVENTO_VESPERA, inscritoId!).get()).exists).toBe(false);
    } finally {
      await restaurarData(EVENTO_VESPERA);
    }
  });

  it('admin fura com motivo: executa o estorno e o motivo fica NO DOC', async () => {
    const charge = await criarPedidoPago(EVENTO_VESPERA, 'vesp-03');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await porNaVespera(EVENTO_VESPERA);
    try {
      const res = await requestRefundCore(
        db,
        provider,
        {
          pedidoId: charge.pedidoId,
          inscritoId,
          motivo: 'atleta hospitalizado',
          overrideCorte: true,
          motivoOverride: 'atestado enviado ao suporte, ticket 4412',
        },
        platformAdmin
      );
      // Furar É a decisão: a rota não volta para a fila de análise.
      expect(res.estado).toBe('estornado');
      const doc = await reembolsoDe(EVENTO_VESPERA, inscritoId!).get();
      expect(doc.get('overrideCorte')).toBe(true);
      expect(doc.get('motivoOverride')).toContain('ticket 4412');
      expect(doc.get('overridePor')).toBe(ADMIN_UID);
      expect(doc.get('corteHorasNoOverride')).toBe(48);
      expect(doc.get('origem')).toBe('plataforma');
    } finally {
      await restaurarData(EVENTO_VESPERA);
    }
  });

  it('admin SEM motivo do furo é recusado — trilha vazia não é trilha', async () => {
    const charge = await criarPedidoPago(EVENTO_VESPERA, 'vesp-04');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await porNaVespera(EVENTO_VESPERA);
    try {
      await expect(
        requestRefundCore(
          db,
          provider,
          { pedidoId: charge.pedidoId, inscritoId, motivo: 'urgente', overrideCorte: true },
          platformAdmin
        )
      ).rejects.toThrow(/motivoOverride/);
      expect((await reembolsoDe(EVENTO_VESPERA, inscritoId!).get()).exists).toBe(false);
    } finally {
      await restaurarData(EVENTO_VESPERA);
    }
  });

  it('fora da véspera o admin não precisa furar — a flag não muda a rota', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'vesp-05');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await backdatarPedido(charge.pedidoId, 30); // fora da janela de arrependimento
    const res = await requestRefundCore(
      db,
      provider,
      {
        pedidoId: charge.pedidoId,
        inscritoId,
        motivo: 'fora da janela',
        overrideCorte: true,
        motivoOverride: 'flag mandada por engano',
      },
      platformAdmin
    );
    expect(res.estado).toBe('em_analise');
    expect((await reembolsoDe(EVENTO_ID, inscritoId!).get()).get('overrideCorte')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant suspenso e decisão pela fila da plataforma
// ─────────────────────────────────────────────────────────────────────────────

describe('tenant suspenso (RN-402) e fila cross-tenant', () => {
  it('organizador para; admin passa e devolve o dinheiro preso', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'susp-01');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await db.doc(`tenants/${TENANT_ID}`).update({ status: 'suspenso' });
    try {
      await expect(
        requestRefundCore(
          db,
          provider,
          { pedidoId: charge.pedidoId, inscritoId, motivo: 'tenant suspenso' },
          organizador
        )
      ).rejects.toThrow(/RN-402|não está ativo/);
      const res = await requestRefundCore(
        db,
        provider,
        { pedidoId: charge.pedidoId, inscritoId, motivo: 'devolucao pela plataforma' },
        platformAdmin
      );
      expect(res.estado).toBe('estornado');
    } finally {
      await db.doc(`tenants/${TENANT_ID}`).update({ status: 'ativo' });
    }
  });

  it('admin decide (aprovar) um reembolso em análise de tenant que não é dele', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'fila-01');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await backdatarPedido(charge.pedidoId, 30);
    const abertura = await requestRefundCore(
      db,
      provider,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'fora da janela' },
      organizador
    );
    expect(abertura.estado).toBe('em_analise');

    const decisao = await decideRefundCore(
      db,
      provider,
      { eventoId: EVENTO_ID, inscritoId, decisao: 'aprovar', motivo: 'suporte aprovou' },
      platformAdmin
    );
    expect(decisao.estado).toBe('estornado');
    const doc = await reembolsoDe(EVENTO_ID, inscritoId!).get();
    expect(doc.get('decididoPor')).toBe(ADMIN_UID);
  });

  it('tenant alheio NÃO decide o reembolso de outro (RN-400)', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'fila-02');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await backdatarPedido(charge.pedidoId, 30);
    await requestRefundCore(
      db,
      provider,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'fora da janela' },
      organizador
    );
    await expect(
      decideRefundCore(
        db,
        provider,
        { eventoId: EVENTO_ID, inscritoId, decisao: 'aprovar' },
        outroTenant
      )
    ).rejects.toThrow(/permission-denied|RN-400/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cancelar sem estornar (decisão 45)
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelar sem estornar — o dinheiro FICA (RN-377/378)', () => {
  it('organizador cancela dentro da regra; pagamento e receita não se mexem', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'canc-01');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    const pagamentoId = (await db.doc(`pedidos/${charge.pedidoId}`).get()).get(
      'pagamentoId'
    ) as string;
    const receitaAntes = (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada');
    const pagAntes = await db.doc(`pagamentos/${pagamentoId}`).get();

    const res = await cancelarInscricaoCore(
      db,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'cortesia — atleta lesionado' },
      organizador
    );
    expect(res).toMatchObject({ estado: 'cancelado', replay: false, trilha: 'organizador' });
    expect(res.statusAnterior).toBe('confirmado');

    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get()).get('status')
    ).toBe('cancelado');

    const trilha = await cancelamentoDe(EVENTO_ID, inscritoId!).get();
    expect(trilha.get('dinheiroDevolvido')).toBe(false);
    expect(trilha.get('motivo')).toContain('cortesia');
    expect(trilha.get('por')).toBe(MARINA_UID);

    // A prova do "dinheiro fica": nada no pagamento, nada na receita.
    const pagDepois = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pagDepois.get('status')).toBe(pagAntes.get('status'));
    expect(pagDepois.get('estornadoTotal')).toBe(pagAntes.get('estornadoTotal'));
    expect((await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada')).toBe(
      receitaAntes
    );
    // E nenhum reembolso nasceu por tabela.
    expect((await reembolsoDe(EVENTO_ID, inscritoId!).get()).exists).toBe(false);
  });

  it('repetir o cancelamento devolve replay, sem segunda escrita', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'canc-02');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await cancelarInscricaoCore(
      db,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'no-show combinado' },
      organizador
    );
    const primeira = await cancelamentoDe(EVENTO_ID, inscritoId!).get();
    const res = await cancelarInscricaoCore(
      db,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'no-show combinado' },
      organizador
    );
    expect(res.replay).toBe(true);
    const segunda = await cancelamentoDe(EVENTO_ID, inscritoId!).get();
    expect(segunda.get('criadoEm').toMillis()).toBe(primeira.get('criadoEm').toMillis());
  });

  it('organizador NÃO cancela na véspera; o admin cancela', async () => {
    const charge = await criarPedidoPago(EVENTO_VESPERA, 'canc-03');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await porNaVespera(EVENTO_VESPERA);
    try {
      await expect(
        cancelarInscricaoCore(
          db,
          { pedidoId: charge.pedidoId, inscritoId, motivo: 'na véspera' },
          organizador
        )
      ).rejects.toThrow(/RN-339/);
      expect((await cancelamentoDe(EVENTO_VESPERA, inscritoId!).get()).exists).toBe(false);

      const res = await cancelarInscricaoCore(
        db,
        { pedidoId: charge.pedidoId, inscritoId, motivo: 'fraude confirmada' },
        platformAdmin
      );
      expect(res.trilha).toBe('plataforma');
      expect((await cancelamentoDe(EVENTO_VESPERA, inscritoId!).get()).get('trilha')).toBe(
        'plataforma'
      );
    } finally {
      await restaurarData(EVENTO_VESPERA);
    }
  });

  it('inscrito ESTORNADO não é cancelável — apagaria a trilha do dinheiro', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'canc-04');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await requestRefundCore(
      db,
      provider,
      { pedidoId: charge.pedidoId, inscritoId, motivo: 'estorno normal' },
      organizador
    );
    await expect(
      cancelarInscricaoCore(
        db,
        { pedidoId: charge.pedidoId, inscritoId, motivo: 'cancelar depois' },
        platformAdmin
      )
    ).rejects.toThrow(/ESTORNADO/);
  });

  it('athlete e promoter não cancelam; motivo curto é recusado', async () => {
    const charge = await criarPedidoPago(EVENTO_ID, 'canc-05');
    const [inscritoId] = await inscritosDoPedido(charge.pedidoId);
    await esperaNegado(
      cancelarInscricaoCore(db, { pedidoId: charge.pedidoId, inscritoId, motivo: 'quero' }, athlete)
    );
    await esperaNegado(
      cancelarInscricaoCore(db, { pedidoId: charge.pedidoId, inscritoId, motivo: 'quero' }, promoter)
    );
    await expect(
      cancelarInscricaoCore(db, { pedidoId: charge.pedidoId, inscritoId, motivo: 'x' }, organizador)
    ).rejects.toThrow(/motivo/);
    expect((await cancelamentoDe(EVENTO_ID, inscritoId!).get()).exists).toBe(false);
  });

  it('inscrito de outro pedido não entra pela porta (ADR-011)', async () => {
    const a = await criarPedidoPago(EVENTO_ID, 'canc-06a');
    const b = await criarPedidoPago(EVENTO_ID, 'canc-06b');
    const [inscritoDeB] = await inscritosDoPedido(b.pedidoId);
    await expect(
      cancelarInscricaoCore(
        db,
        { pedidoId: a.pedidoId, inscritoId: inscritoDeB, motivo: 'alvo trocado' },
        platformAdmin
      )
    ).rejects.toThrow(/ADR-011|não pertence/);
  });
});

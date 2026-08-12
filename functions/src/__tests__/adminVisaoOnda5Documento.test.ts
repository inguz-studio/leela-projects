/**
 * adminVisaoOnda5Documento.test.ts — ADMIN-VISAO onda 5 · S1615-T3 · RN-540 ·
 * vetável V-4
 *
 * O contrato de `consultarDocumentoDaContaCore` contra um DUBLÊ do Firestore —
 * sem emulator. Existe porque o gate desta tarefa ("quem não é platform_admin
 * recebe permission-denied E a negativa é registrada") precisa ser PROVADO, e
 * o Firestore Emulator não sobe nesta máquina: `firebase-tools` exige JDK 21+ e
 * o JDK instalado é o 17 (`firebase-tools no longer supports Java version
 * before 21`). O gêmeo de emulator é
 * `adminVisaoOnda5Documento.integration.test.ts`, no molde de
 * `adminVisaoOnda1.integration.test.ts`, e roda com
 * `firebase emulators:exec --only firestore,auth "<comando>"` numa máquina com
 * JDK 21+.
 *
 * O dublê cobre exatamente a superfície que o núcleo toca — a query por
 * `contaUid` e o `add` da trilha —, então o que este arquivo prova é o que ele
 * pode provar honestamente: ORDEM das guardas, REGISTRO dos desfechos,
 * MINIMIZAÇÃO do retorno e a ausência do número no rastro. A prova de que a
 * Rule de `pessoas` continua fechada é outra, e vive em
 * `adminVisaoOnda5Rules.integration.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as admin from 'firebase-admin';
import { COLECAO_PESSOAS } from '@leela/core';
import {
  consultarDocumentoDaContaCore,
  TIPO_ACESSO_DOCUMENTO_CONTA,
} from '../platform/consultarDocumentoDaConta';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const CPF_ALVO = '11144477735';
const CONTA_ALVO = 'uid-conta-alvo';
const ADMIN_UID = 'uid-platform-admin';
const OWNER_UID = 'uid-tenant-owner-curioso';

type Raw = Record<string, unknown>;

/** Um doc de `pessoas` como o dublê o entrega ao núcleo. */
interface PessoaSemeada {
  contaUid: string | null;
  cpf: unknown;
}

interface Dubles {
  db: admin.firestore.Firestore;
  /** Tudo que foi gravado em `auditoriaAcessos`. */
  trilha: Raw[];
  /** Coleções que a chamada tocou — prova que `pessoas` é a única lida. */
  colecoesLidas: string[];
}

/**
 * Dublê do Firestore com a superfície MÍNIMA que o núcleo usa:
 * `collection().where().limit().get()` e `collection().add()`.
 * Nada além disso — um dublê que aceita mais do que o código chama esconde
 * exatamente a chamada a mais que a review procuraria.
 */
function montarDb(pessoas: PessoaSemeada[]): Dubles {
  const trilha: Raw[] = [];
  const colecoesLidas: string[] = [];

  const db = {
    collection(nome: string) {
      if (nome === AUDITORIA_ACESSOS_COL) {
        return {
          add: async (registro: Raw) => {
            trilha.push(registro);
            return { id: `audit-${trilha.length}` };
          },
        };
      }
      colecoesLidas.push(nome);
      return {
        where(campo: string, op: string, valor: unknown) {
          expect(campo).toBe('contaUid');
          expect(op).toBe('==');
          const casados = pessoas.filter((p) => p.contaUid === valor);
          return {
            limit(n: number) {
              const pagina = casados.slice(0, n);
              return {
                get: async () => ({
                  size: pagina.length,
                  docs: pagina.map((p) => ({
                    get: (campoDoc: string) =>
                      campoDoc === 'cpf' ? p.cpf : undefined,
                  })),
                }),
              };
            },
          };
        },
      };
    },
  } as unknown as admin.firestore.Firestore;

  return { db, trilha, colecoesLidas };
}

const chamar = (
  d: Dubles,
  data: unknown,
  uid: string,
  claims: Raw
): ReturnType<typeof consultarDocumentoDaContaCore> =>
  consultarDocumentoDaContaCore(d.db, data, { uid, claims: claims as never });

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// O gate: negativa registrada
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — a negativa é registrada (RN-540)', () => {
  it('quem NÃO é platform_admin recebe permission-denied E a negativa entra na trilha', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    await expect(
      chamar(d, { contaUid: CONTA_ALVO }, OWNER_UID, {
        role: 'tenant_owner',
        tenantId: 'castelo-producoes',
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(d.trilha).toHaveLength(1);
    expect(d.trilha[0]).toMatchObject({
      tipo: TIPO_ACESSO_DOCUMENTO_CONTA,
      uid: OWNER_UID,
      papel: 'tenant_owner',
      contaUid: CONTA_ALVO,
      resultado: 'negado_papel',
    });
  });

  it('a negativa acontece ANTES de qualquer leitura — nenhuma coleção de PII é tocada', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    await expect(
      chamar(d, { contaUid: CONTA_ALVO }, OWNER_UID, { role: 'athlete' })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(d.colecoesLidas).toEqual([]);
    expect(JSON.stringify(d.trilha)).not.toContain(CPF_ALVO);
  });

  it('conta sem papel algum também é negada e registrada — ausência de claim não é permissão', async () => {
    const d = montarDb([]);

    await expect(chamar(d, { contaUid: CONTA_ALVO }, 'uid-sem-papel', {})).rejects.toMatchObject(
      { code: 'permission-denied' }
    );

    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_papel', papel: 'desconhecido' });
  });
});

// ---------------------------------------------------------------------------
// Concessão, e as duas pernas do RN-401
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — concessão auditada (RN-401)', () => {
  it('platform_admin LEGADO lê e o ACESSO é registrado', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toEqual({ tipo: 'cpf', numero: CPF_ALVO });
    expect(r.motivoAusencia).toBeNull();
    expect(d.colecoesLidas).toEqual([COLECAO_PESSOAS]);
    expect(d.trilha[0]).toMatchObject({
      uid: ADMIN_UID,
      contaUid: CONTA_ALVO,
      resultado: 'concedido',
    });
  });

  it('platform_admin por CAPACIDADE (sem o papel legado) TAMBÉM lê — a perna que a dívida da claim esquece', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'athlete',
      platformAdmin: true,
    });

    expect(r.documento?.numero).toBe(CPF_ALVO);
  });

  it('o registro de acesso CONCEDIDO não carrega o número (ADR-014 §5)', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, { role: 'platform_admin' });

    expect(JSON.stringify(d.trilha)).not.toContain(CPF_ALVO);
  });
});

// ---------------------------------------------------------------------------
// Ausência nomeada — a metade do V-4 que não tem fonte
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — ausência é resposta, não falha (V-4)', () => {
  it('conta sem registro de identidade devolve motivo nomeado', async () => {
    const d = montarDb([{ contaUid: 'outra-conta', cpf: CPF_ALVO }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toBeNull();
    expect(r.motivoAusencia).toBe('sem_registro_de_identificacao');
    expect(d.trilha[0]).toMatchObject({ resultado: 'concedido_sem_registro' });
  });

  it('registro com `cpf` inutilizável tem motivo PRÓPRIO — corrompido não vira "nunca comprou"', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: '' }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(r.motivoAusencia).toBe('registro_sem_documento');
  });

  it('o retorno NÃO promete documento estrangeiro — o tipo é `cpf` e só', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(r.documento?.tipo).toBe('cpf');
  });
});

// ---------------------------------------------------------------------------
// Uma conta por chamada (RN-540 — sem lote, sem export)
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — uma conta por chamada', () => {
  it('duas identidades na mesma conta: UM número no retorno e a bandeira de ambiguidade', async () => {
    const d = montarDb([
      { contaUid: CONTA_ALVO, cpf: CPF_ALVO },
      { contaUid: CONTA_ALVO, cpf: '52998224725' },
    ]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(r.haMaisDeUmRegistro).toBe(true);
    expect(r.documento?.numero).toBe(CPF_ALVO);
    expect(JSON.stringify(r)).not.toContain('52998224725');
  });

  it('o retorno não tem forma de lista — não existe caminho para lote nem para export', async () => {
    const d = montarDb([{ contaUid: CONTA_ALVO, cpf: CPF_ALVO }]);

    const r = await chamar(d, { contaUid: CONTA_ALVO }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(Array.isArray((r as unknown as { itens?: unknown }).itens)).toBe(false);
    expect(Object.keys(r).sort()).toEqual([
      'avisoAuditoria',
      'contaUid',
      'documento',
      'haMaisDeUmRegistro',
      'motivoAusencia',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Bordas de input
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — bordas de input', () => {
  it('"contaUid" ausente → invalid-argument, e NADA é registrado como acesso', async () => {
    const d = montarDb([]);

    await expect(chamar(d, {}, ADMIN_UID, { role: 'platform_admin' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });

    expect(d.trilha).toHaveLength(0);
    expect(d.colecoesLidas).toEqual([]);
  });

  it('input malformado de NÃO-admin é barrado pelo PAPEL primeiro, com rastro', async () => {
    // A ordem importa: validar antes de autorizar deixaria um não-admin sondar
    // a borda de input sem deixar rastro nenhum.
    const d = montarDb([]);

    await expect(chamar(d, {}, OWNER_UID, { role: 'tenant_owner' })).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(d.trilha).toHaveLength(1);
    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_papel', contaUid: 'ausente' });
  });
});

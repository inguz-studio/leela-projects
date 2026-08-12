/**
 * adminVisaoOnda5Liberacao.test.ts — ADMIN-VISAO onda 5 · S1615-T3 · RN-548 ·
 * RN-551
 *
 * A PORTA administrativa da aprovação, contra dublês — sem emulator. Prova o
 * que um dublê prova honestamente: as guardas e a ordem delas, o rastro dos
 * desfechos, as recusas NOMEADAS, e — o item da RN-548 — que a porta chama o
 * NÚCLEO ÚNICO (`provisionTenantCore`) com os argumentos certos, em vez de
 * conter uma segunda máquina de aprovação.
 *
 * A comparação campo a campo dos DOIS desfechos (código × liberação direta),
 * que a RN-548 cobra, exige as duas máquinas rodando de verdade e vive em
 * `adminVisaoOnda5Liberacao.integration.test.ts`. Ela não foi executada aqui:
 * `firebase-tools` exige JDK 21+ e esta máquina tem JDK 17
 * (`firebase-tools no longer supports Java version before 21`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as admin from 'firebase-admin';

const mocks = vi.hoisted(() => ({
  provisionTenantCore: vi.fn(),
}));

vi.mock('../platform/provisionTenant', () => ({
  provisionTenantCore: mocks.provisionTenantCore,
}));

import {
  liberarAcessoOrganizadorCore,
  PORTA_LIBERACAO_DIRETA,
  TIPO_ACESSO_LIBERACAO,
} from '../platform/liberarAcessoOrganizador';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const ADMIN_UID = 'uid-platform-admin';
const OWNER_CURIOSO_UID = 'uid-tenant-owner-curioso';
const CONTA_UID = 'uid-marina-esperando';

type Raw = Record<string, unknown>;

interface Dubles {
  db: admin.firestore.Firestore;
  auth: admin.auth.Auth;
  trilha: Raw[];
  /** Endereços consultados em `tenants/{id}` — prova o desempate de slug. */
  tenantsConsultados: string[];
}

interface Cenario {
  /** Registro do Auth; null = conta inexistente. */
  usuario: { uid: string; email?: string; customClaims?: Raw } | null;
  /** Doc `profissionais/{uid}`. */
  profissional?: Raw;
  /** Endereços já ocupados em `tenants`. */
  tenantsOcupados?: string[];
}

function montar(cenario: Cenario): Dubles {
  const trilha: Raw[] = [];
  const tenantsConsultados: string[] = [];
  const ocupados = new Set(cenario.tenantsOcupados ?? []);

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
      if (nome === 'tenants') {
        return {
          doc: (id: string) => {
            tenantsConsultados.push(id);
            return { get: async () => ({ exists: ocupados.has(id) }) };
          },
        };
      }
      if (nome === 'profissionais') {
        return {
          doc: () => ({
            get: async () => ({
              exists: cenario.profissional !== undefined,
              get: (campo: string) => cenario.profissional?.[campo],
            }),
          }),
        };
      }
      throw new Error(`coleção inesperada: ${nome}`);
    },
  } as unknown as admin.firestore.Firestore;

  const auth = {
    getUser: async (uid: string) => {
      if (!cenario.usuario || cenario.usuario.uid !== uid) {
        throw new Error('auth/user-not-found');
      }
      return cenario.usuario;
    },
  } as unknown as admin.auth.Auth;

  return { db, auth, trilha, tenantsConsultados };
}

const chamar = (
  d: Dubles,
  data: unknown,
  uid: string,
  claims: Raw
): ReturnType<typeof liberarAcessoOrganizadorCore> =>
  liberarAcessoOrganizadorCore(d.db, d.auth, data, { uid, claims: claims as never });

const contaEsperando: Cenario = {
  usuario: { uid: CONTA_UID, email: 'marina@castelo.com.br', customClaims: { role: 'athlete' } },
  profissional: {
    nome: 'Marina Duarte',
    organizacao: 'Castelo Produções',
    statusOnboarding: 'aguardando_convite',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provisionTenantCore.mockResolvedValue({
    tenantId: 'castelo-producoes',
    ownerUid: CONTA_UID,
    replay: false,
  });
});

// ---------------------------------------------------------------------------
// A máquina é UMA só (RN-548)
// ---------------------------------------------------------------------------

describe('liberarAcessoOrganizador — o núcleo único (RN-548)', () => {
  it('a liberação chama `provisionTenantCore` — não existe segunda máquina de aprovação', async () => {
    const d = montar(contaEsperando);

    const r = await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, {
      role: 'platform_admin',
    });

    expect(mocks.provisionTenantCore).toHaveBeenCalledTimes(1);
    expect(r).toEqual({
      tenantId: 'castelo-producoes',
      ownerUid: CONTA_UID,
      replay: false,
    });
  });

  it('o input do núcleo vem do CADASTRO da pessoa: e-mail da conta, nome da organização', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    const [, , input] = mocks.provisionTenantCore.mock.calls[0] ?? [];
    expect(input).toEqual({
      nome: 'Castelo Produções',
      slug: 'castelo-producoes',
      tipo: 'produtor',
      ownerEmail: 'marina@castelo.com.br',
      ownerNome: 'Marina Duarte',
    });
  });

  it('quem AGE é o administrador: o callerUid carimbado é o dele, não o da conta liberada', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    const [, , , callerUid] = mocks.provisionTenantCore.mock.calls[0] ?? [];
    expect(callerUid).toBe(ADMIN_UID);
  });

  it('a promoção `athlete` limpo → owner é autorizada para o ALVO, com a MESMA exceção estreita do resgate', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    const [, , , , deps, options] = mocks.provisionTenantCore.mock.calls[0] ?? [];
    expect(deps).toBeUndefined();
    expect(options).toEqual({ autoCadastroUid: CONTA_UID });
  });

  it('endereço ocupado é desempatado por sufixo, e o núcleo recebe o livre', async () => {
    const d = montar({ ...contaEsperando, tenantsOcupados: ['castelo-producoes'] });

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    const [, , input] = mocks.provisionTenantCore.mock.calls[0] ?? [];
    expect((input as { slug: string }).slug).toBe('castelo-producoes-2');
    expect(d.tenantsConsultados).toEqual(['castelo-producoes', 'castelo-producoes-2']);
  });

  it('sem organização, a semente cai no nome; sem nome, no e-mail — mesma ordem do resgate', async () => {
    const soNome = montar({
      usuario: { uid: CONTA_UID, email: 'marina@castelo.com.br', customClaims: {} },
      profissional: { nome: 'Marina Duarte' },
    });
    await chamar(soNome, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });
    expect(
      (mocks.provisionTenantCore.mock.calls[0]?.[2] as { slug: string }).slug
    ).toBe('marina-duarte');

    vi.clearAllMocks();
    mocks.provisionTenantCore.mockResolvedValue({
      tenantId: 'x',
      ownerUid: CONTA_UID,
      replay: false,
    });

    const soEmail = montar({
      usuario: { uid: CONTA_UID, email: 'marina@castelo.com.br', customClaims: {} },
    });
    await chamar(soEmail, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });
    expect(
      (mocks.provisionTenantCore.mock.calls[0]?.[2] as { slug: string }).slug
    ).toBe('marina');
  });
});

// ---------------------------------------------------------------------------
// Autorização e rastro (RN-551)
// ---------------------------------------------------------------------------

describe('liberarAcessoOrganizador — autorização e rastro (RN-551)', () => {
  it('quem NÃO é platform_admin é negado, a tentativa é REGISTRADA e o núcleo nem é chamado', async () => {
    const d = montar(contaEsperando);

    await expect(
      chamar(d, { contaUid: CONTA_UID }, OWNER_CURIOSO_UID, {
        role: 'tenant_owner',
        tenantId: 'passo-certo',
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(mocks.provisionTenantCore).not.toHaveBeenCalled();
    expect(d.trilha).toHaveLength(1);
    expect(d.trilha[0]).toMatchObject({
      tipo: TIPO_ACESSO_LIBERACAO,
      porta: PORTA_LIBERACAO_DIRETA,
      uid: OWNER_CURIOSO_UID,
      papel: 'tenant_owner',
      contaUid: CONTA_UID,
      resultado: 'negado_papel',
    });
  });

  it('platform_admin por CAPACIDADE também libera — RN-401, as duas pernas', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, {
      role: 'athlete',
      platformAdmin: true,
    });

    expect(mocks.provisionTenantCore).toHaveBeenCalledTimes(1);
  });

  it('o ato concedido registra quem, sobre quem, por qual porta e para qual tenant', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    expect(d.trilha).toHaveLength(1);
    expect(d.trilha[0]).toMatchObject({
      tipo: TIPO_ACESSO_LIBERACAO,
      porta: PORTA_LIBERACAO_DIRETA,
      uid: ADMIN_UID,
      contaUid: CONTA_UID,
      tenantId: 'castelo-producoes',
      resultado: 'concedido',
    });
  });

  it('o rastro não carrega PII — nem nome, nem e-mail, nem telefone', async () => {
    const d = montar(contaEsperando);

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    const serializado = JSON.stringify(d.trilha);
    expect(serializado).not.toContain('marina@castelo.com.br');
    expect(serializado).not.toContain('Marina Duarte');
  });

  it('"contaUid" ausente → invalid-argument, sem registro de ato', async () => {
    const d = montar(contaEsperando);

    await expect(chamar(d, {}, ADMIN_UID, { role: 'platform_admin' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });

    expect(d.trilha).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// A recusa tem NOME (RN-548 — o operador não é atacante)
// ---------------------------------------------------------------------------

describe('liberarAcessoOrganizador — recusas nomeadas', () => {
  it('conta inexistente no Auth: motivo próprio, registrado', async () => {
    const d = montar({ usuario: null });

    await expect(
      chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' })
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: 'conta_inexistente' },
    });

    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_conta_inexistente' });
    expect(mocks.provisionTenantCore).not.toHaveBeenCalled();
  });

  it('conta sem e-mail: motivo próprio (o provisionamento amarra o owner por e-mail)', async () => {
    const d = montar({ usuario: { uid: CONTA_UID, customClaims: {} } });

    await expect(
      chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' })
    ).rejects.toMatchObject({ details: { motivo: 'conta_sem_email' } });

    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_conta_sem_email' });
  });

  it.each([
    ['tenant_owner', { role: 'tenant_owner', tenantId: 'outro' }],
    ['tenant_staff', { role: 'tenant_staff' }],
    ['promoter', { role: 'promoter' }],
    ['platform_admin', { role: 'platform_admin' }],
    ['athlete rebaixado de propósito', { role: 'athlete', demotedFromRole: 'tenant_owner' }],
  ])('conta com papel %s é recusada pela MESMA régua do resgate, com o papel nomeado', async (_rotulo, claims) => {
    const d = montar({
      usuario: { uid: CONTA_UID, email: 'x@x.com', customClaims: claims as Raw },
      profissional: { nome: 'Alguém' },
    });

    await expect(
      chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' })
    ).rejects.toMatchObject({ details: { motivo: 'conta_inelegivel' } });

    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_conta_inelegivel' });
    expect(mocks.provisionTenantCore).not.toHaveBeenCalled();
  });

  it('conta SEM papel algum passa — é o caso legítimo que a régua libera', async () => {
    const d = montar({
      usuario: { uid: CONTA_UID, email: 'x@exemplo.com' },
      profissional: { nome: 'Alguém' },
    });

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    expect(mocks.provisionTenantCore).toHaveBeenCalledTimes(1);
  });

  it('cadastro sem nada que vire endereço é recusado, não descartado em silêncio', async () => {
    const d = montar({
      usuario: { uid: CONTA_UID, email: '###@exemplo.com', customClaims: {} },
      profissional: { nome: '###', organizacao: '###' },
    });

    await expect(
      chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' })
    ).rejects.toMatchObject({ details: { motivo: 'sem_nome_para_endereco' } });

    expect(d.trilha[0]).toMatchObject({ resultado: 'negado_sem_nome_para_endereco' });
  });

  it('NÃO existe segundo critério de estado: `statusOnboarding` não é conferido aqui', async () => {
    // A régua é a de papel, e é a mesma das duas portas (RN-548). Conferir
    // `statusOnboarding` seria a segunda máquina de aprovação começando —
    // e o `tenant_owner`, que é o caso que um teto de estado pegaria, já é
    // recusado pela régua de papel.
    const d = montar({
      usuario: { uid: CONTA_UID, email: 'x@exemplo.com', customClaims: { role: 'athlete' } },
      profissional: { nome: 'Alguém', statusOnboarding: 'ativo' },
    });

    await chamar(d, { contaUid: CONTA_UID }, ADMIN_UID, { role: 'platform_admin' });

    expect(mocks.provisionTenantCore).toHaveBeenCalledTimes(1);
  });
});

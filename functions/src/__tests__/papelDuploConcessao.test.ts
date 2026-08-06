/**
 * papelDuploConcessao.test.ts — lane PAPEL-DUPLO (T1/T2)
 *
 * Prova, sem Emulator, as duas coisas que a review vai atacar:
 *
 *   A. O MODELO — `isPlatformAdmin` aceita as duas pernas, `canSetClaims`
 *      aceita SÓ a legada, e nenhuma conta existente perdeu acesso.
 *   B. A CONCESSÃO — quem pode ligar/desligar a capacidade, e por que
 *      autoconcessão, escalada por `tenant_owner` e propagação pela própria
 *      capacidade são impossíveis (não improváveis).
 *
 * O `admin.auth()` é stubbado: o alvo aqui é a LÓGICA de autorização e de
 * merge. O caminho de rede (revokeRefreshTokens, propagação de token) é
 * asserido pelo que a Function CHAMA, não pelo efeito no Auth real.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isPlatformAdmin,
  isLegacyPlatformAdminRole,
  hasPlatformAdminCapability,
  canSetClaims,
  paineisDaConta,
  type AuthClaims,
} from '@leela/core';

type AnyRec = Record<string, unknown>;

const setCustomUserClaims = vi.fn(async (_uid: string, _claims: AnyRec | null) => undefined);
const revokeRefreshTokens = vi.fn(async (_uid: string) => undefined);
const getUser = vi.fn(
  async (uid: string): Promise<AnyRec> => ({ uid, customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' } })
);

/** Trilha de auditoria: capturamos os docs que a Function grava. */
const trilhaAdd = vi.fn(async (_doc: AnyRec) => ({ id: 'doc-trilha' }));
const firestore = () => ({ collection: (_c: string) => ({ add: trilhaAdd }) });

vi.mock('firebase-admin', () => ({
  auth: () => ({ setCustomUserClaims, revokeRefreshTokens, getUser }),
  firestore: () => firestore(),
  apps: [],
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

// Importado DEPOIS dos mocks (o módulo toca admin.auth() só em runtime).
import {
  mergePlatformAdminCapability,
  CLAIM_CAPACIDADE_PLATAFORMA,
  setPlatformAdminCapability,
} from '../platform/setPlatformAdminCapability';

// Crachás dos quatro quadrantes.
const ADMIN_LEGADO: AuthClaims = { role: 'platform_admin' };
const OWNER_PURO: AuthClaims = { role: 'tenant_owner', tenantId: 'castelo-producoes' };
const DONO: AuthClaims = {
  role: 'tenant_owner',
  tenantId: 'castelo-producoes',
  platformAdmin: true,
};
const ATLETA: AuthClaims = { role: 'athlete' };

/** Invoca a callable como o runtime v1 faz (handler direto). */
type Callable = (data: unknown, context: unknown) => Promise<unknown>;
function chamar(data: unknown, callerUid: string, claims: AuthClaims) {
  const handler = (setPlatformAdminCapability as unknown as { run: Callable }).run;
  return handler(data, { auth: { uid: callerUid, token: claims } });
}

/** Captura o código do HttpsError sem depender do formato da mensagem. */
async function codigoDoErro(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return '(não lançou)';
  } catch (e) {
    return (e as { code?: string }).code ?? '(sem code)';
  }
}

beforeEach(() => {
  setCustomUserClaims.mockClear();
  revokeRefreshTokens.mockClear();
  trilhaAdd.mockClear();
  getUser.mockClear();
  getUser.mockResolvedValue({
    uid: 'uid-dono',
    customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' },
  });
});

// ---------------------------------------------------------------------------
// A. O modelo
// ---------------------------------------------------------------------------

describe('PAPEL-DUPLO · modelo — as duas pernas e nenhuma migração', () => {
  it('platform_admin legado segue autorizado (zero migração)', () => {
    expect(isPlatformAdmin(ADMIN_LEGADO)).toBe(true);
    expect(isLegacyPlatformAdminRole(ADMIN_LEGADO)).toBe(true);
    expect(hasPlatformAdminCapability(ADMIN_LEGADO)).toBe(false);
  });

  it('tenant_owner + capacidade autoriza pela perna nova, mantendo o papel', () => {
    expect(isPlatformAdmin(DONO)).toBe(true);
    expect(hasPlatformAdminCapability(DONO)).toBe(true);
    expect(isLegacyPlatformAdminRole(DONO)).toBe(false);
    expect(DONO.role).toBe('tenant_owner');
    expect(DONO.tenantId).toBe('castelo-producoes');
  });

  it('tenant_owner puro e athlete continuam fora', () => {
    expect(isPlatformAdmin(OWNER_PURO)).toBe(false);
    expect(isPlatformAdmin(ATLETA)).toBe(false);
  });

  it('só `true` conta — false, string e número são negação', () => {
    for (const v of [false, 'true', 1, 0, null, undefined, {}]) {
      const claims = { ...OWNER_PURO, platformAdmin: v } as unknown as AuthClaims;
      expect(hasPlatformAdminCapability(claims)).toBe(false);
      expect(isPlatformAdmin(claims)).toBe(false);
    }
  });

  it('a chave não colide com claim reservada do Firebase', () => {
    // Lista de firebase-admin (auth-api-request RESERVED_CLAIMS).
    const reservadas = [
      'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash',
      'exp', 'iat', 'iss', 'jti', 'nbf', 'nonce', 'sub', 'firebase',
    ];
    expect(reservadas).not.toContain(CLAIM_CAPACIDADE_PLATAFORMA);
  });

  it('o crachá do dono cabe folgado no teto de 1000 caracteres', () => {
    const serializado = JSON.stringify(DONO);
    expect(serializado.length).toBeLessThan(1000);
  });
});

// ---------------------------------------------------------------------------
// B. A concessão — o que a review ataca
// ---------------------------------------------------------------------------

describe('PAPEL-DUPLO · quem nomeia, e o que segue fechado', () => {
  it('INVARIANTE 1 — quem não administra a plataforma não nomeia ninguém', () => {
    expect(canSetClaims(OWNER_PURO)).toBe(false);
    expect(canSetClaims(ATLETA)).toBe(false);
    expect(canSetClaims({ role: 'tenant_staff', tenantId: 'castelo-producoes' })).toBe(false);
    expect(canSetClaims({ role: 'promoter', tenantId: 'castelo-producoes' })).toBe(false);
  });

  it('as DUAS pernas nomeiam — o sistema consegue nomear o sucessor', () => {
    expect(canSetClaims(ADMIN_LEGADO)).toBe(true);
    expect(canSetClaims(DONO)).toBe(true);
    // Nomear é exatamente coextensivo com administrar: nem mais, nem menos.
    for (const c of [ADMIN_LEGADO, DONO, OWNER_PURO, ATLETA]) {
      expect(canSetClaims(c)).toBe(isPlatformAdmin(c));
    }
  });

  it('INVARIANTE 3 — ESCALADA: tenant_owner puro é negado na Function', async () => {
    expect(await codigoDoErro(chamar({ uid: 'alvo', conceder: true }, 'uid-owner', OWNER_PURO)))
      .toBe('permission-denied');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('SUCESSÃO: o portador nomeia um TERCEIRO (o caso que destrava a produtora)', async () => {
    getUser.mockResolvedValue({ uid: 'uid-sucessor', customClaims: { role: 'tenant_staff', tenantId: 'castelo-producoes' } });
    const r = (await chamar({ uid: 'uid-sucessor', conceder: true }, 'uid-dono', DONO)) as AnyRec;
    expect(r['success']).toBe(true);
    expect(setCustomUserClaims).toHaveBeenCalledWith('uid-sucessor', {
      role: 'tenant_staff',
      tenantId: 'castelo-producoes',
      platformAdmin: true,
    });
  });

  it('INVARIANTE 2 — AUTOCONCESSÃO: o portador NÃO se reconcede', async () => {
    expect(await codigoDoErro(chamar({ uid: 'uid-dono', conceder: true }, 'uid-dono', DONO)))
      .toBe('permission-denied');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('INVARIANTE 2 — nem o admin legado liga a capacidade em si mesmo', async () => {
    expect(await codigoDoErro(chamar({ uid: 'uid-admin', conceder: true }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('permission-denied');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('PISO — ninguém se auto-revoga, logo quem revoga sobrevive à revogação', async () => {
    // O piso de 1 administrador é estrutural: o caller passou em canSetClaims
    // (é administrador) e não pode ser o alvo. Não há varredura de usuários
    // porque não é preciso contar — é preciso não deixar zerar.
    expect(await codigoDoErro(chamar({ uid: 'uid-dono', conceder: false }, 'uid-dono', DONO)))
      .toBe('permission-denied');
    expect(await codigoDoErro(chamar({ uid: 'uid-admin', conceder: false }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('permission-denied');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('EFEITO COLATERAL ASSUMIDO — dois portadores se reconcedem mutuamente', async () => {
    // Registrado como teste, não escondido: a proibição de auto-alvo trava
    // ENGANO, não conluio. A defesa contra conluio é a trilha de auditoria,
    // coberta pelos testes de trilha abaixo. Se um dia isto virar vermelho,
    // foi porque a política mudou de propósito — releia antes de "consertar".
    const portadorB: AuthClaims = { role: 'tenant_staff', tenantId: 'x', platformAdmin: true };
    getUser.mockResolvedValue({ uid: 'uid-b', customClaims: { role: 'tenant_staff', tenantId: 'x' } });
    await expect(chamar({ uid: 'uid-b', conceder: true }, 'uid-dono', DONO)).resolves.toBeTruthy();
    getUser.mockResolvedValue({ uid: 'uid-dono', customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' } });
    await expect(chamar({ uid: 'uid-dono', conceder: true }, 'uid-b', portadorB)).resolves.toBeTruthy();
  });

  it('AUTOCONCESSÃO: athlete tentando ligar em si mesmo é negado antes de tudo', async () => {
    expect(await codigoDoErro(chamar({ uid: 'uid-atleta', conceder: true }, 'uid-atleta', ATLETA)))
      .toBe('permission-denied');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('sem autenticação: unauthenticated', async () => {
    const handler = (setPlatformAdminCapability as unknown as { run: Callable }).run;
    expect(await codigoDoErro(handler({ uid: 'x', conceder: true }, {}))).toBe('unauthenticated');
  });

  it('input inválido é recusado ANTES de tocar o Auth', async () => {
    expect(await codigoDoErro(chamar({ conceder: true }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('invalid-argument');
    expect(await codigoDoErro(chamar({ uid: 'alvo' }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('invalid-argument');
    expect(await codigoDoErro(chamar({ uid: 'alvo', conceder: 'sim' }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('invalid-argument');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });
});

describe('PAPEL-DUPLO · concessão e revogação pelo caminho oficial', () => {
  it('concede PRESERVANDO papel e tenantId, e revoga os refresh tokens', async () => {
    const r = (await chamar({ uid: 'uid-dono', conceder: true }, 'uid-admin', ADMIN_LEGADO)) as AnyRec;
    expect(r['success']).toBe(true);
    expect(r['platformAdmin']).toBe(true);
    expect(setCustomUserClaims).toHaveBeenCalledWith('uid-dono', {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
      platformAdmin: true,
    });
    expect(revokeRefreshTokens).toHaveBeenCalledWith('uid-dono');
  });

  it('revoga APAGANDO a chave — nunca gravando false', async () => {
    getUser.mockResolvedValue({
      uid: 'uid-dono',
      customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes', platformAdmin: true },
    });
    const r = (await chamar({ uid: 'uid-dono', conceder: false }, 'uid-admin', ADMIN_LEGADO)) as AnyRec;
    expect(r['platformAdmin']).toBe(false);
    const gravado = setCustomUserClaims.mock.calls[0]?.[1] as AnyRec;
    expect(gravado).toEqual({ role: 'tenant_owner', tenantId: 'castelo-producoes' });
    expect(CLAIM_CAPACIDADE_PLATAFORMA in gravado).toBe(false);
    expect(revokeRefreshTokens).toHaveBeenCalledWith('uid-dono');
  });

  it('alvo inexistente: not-found, sem escrita', async () => {
    getUser.mockRejectedValue(new Error('USER_NOT_FOUND'));
    expect(await codigoDoErro(chamar({ uid: 'fantasma', conceder: true }, 'uid-admin', ADMIN_LEGADO)))
      .toBe('not-found');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });
});

describe('PAPEL-DUPLO · merge preservador (puro)', () => {
  it('não encosta em role, tenantId, demotedFromRole nem eventos', () => {
    const atual = {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
      demotedFromRole: 'tenant_staff',
      eventos: { 'meia-floripa-2026': 'organizador' },
    };
    expect(mergePlatformAdminCapability(atual, true)).toEqual({ ...atual, platformAdmin: true });
    expect(mergePlatformAdminCapability({ ...atual, platformAdmin: true }, false)).toEqual(atual);
  });

  it('conta sem claim nenhuma: grava só a capacidade', () => {
    expect(mergePlatformAdminCapability(null, true)).toEqual({ platformAdmin: true });
    expect(mergePlatformAdminCapability(undefined, false)).toEqual({});
  });

  it('revogar em quem não tem é no-op idempotente', () => {
    const atual = { role: 'athlete' };
    expect(mergePlatformAdminCapability(atual, false)).toEqual(atual);
  });

  it('conceder duas vezes é idempotente', () => {
    const uma = mergePlatformAdminCapability({ role: 'tenant_owner' }, true);
    expect(mergePlatformAdminCapability(uma, true)).toEqual(uma);
  });
});

// ---------------------------------------------------------------------------
// B1. A TRILHA — a defesa real contra conluio entre portadores
//
// Proibir portador de nomear terceiro travaria a sucessão sem impedir conluio
// (dois portadores se reconcedem de qualquer forma). O que impede conluio de
// passar despercebido é o rastro: quem, para quem, o quê, quando. Inclusive
// das tentativas NEGADAS — é assim que uma sondagem aparece.
// ---------------------------------------------------------------------------

describe('PAPEL-DUPLO · trilha de auditoria', () => {
  /** Doc gravado na trilha, sem o carimbo de tempo do servidor. */
  function docTrilha(i = 0): AnyRec {
    const d = { ...(trilhaAdd.mock.calls[i]?.[0] as AnyRec) };
    delete d['em'];
    return d;
  }

  it('CONCESSÃO deixa rastro com concedente, alvo e desfecho', async () => {
    await chamar({ uid: 'uid-dono', conceder: true }, 'uid-admin', ADMIN_LEGADO);
    expect(trilhaAdd).toHaveBeenCalledTimes(1);
    expect(docTrilha()).toEqual({
      tipo: 'capacidade_plataforma',
      callerUid: 'uid-admin',
      callerRole: 'platform_admin',
      targetUid: 'uid-dono',
      targetRole: 'tenant_owner',
      resultado: 'concedido',
    });
  });

  it('REVOGAÇÃO deixa rastro próprio', async () => {
    getUser.mockResolvedValue({
      uid: 'uid-dono',
      customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes', platformAdmin: true },
    });
    await chamar({ uid: 'uid-dono', conceder: false }, 'uid-b', {
      role: 'tenant_staff',
      tenantId: 'x',
      platformAdmin: true,
    });
    expect(docTrilha()).toMatchObject({
      callerUid: 'uid-b',
      callerRole: 'tenant_staff',
      targetUid: 'uid-dono',
      resultado: 'revogado',
    });
  });

  it('TENTATIVA NEGADA por papel também deixa rastro — é como a sondagem aparece', async () => {
    await codigoDoErro(chamar({ uid: 'uid-vitima', conceder: true }, 'uid-owner', OWNER_PURO));
    expect(docTrilha()).toMatchObject({
      callerUid: 'uid-owner',
      callerRole: 'tenant_owner',
      targetUid: 'uid-vitima',
      resultado: 'negado_papel',
    });
  });

  it('AUTO-ALVO negado deixa rastro', async () => {
    await codigoDoErro(chamar({ uid: 'uid-dono', conceder: true }, 'uid-dono', DONO));
    expect(docTrilha()).toMatchObject({ targetUid: 'uid-dono', resultado: 'negado_auto_alvo' });
  });

  it('ALVO INEXISTENTE deixa rastro, e nada é gravado no Auth', async () => {
    getUser.mockRejectedValue(new Error('USER_NOT_FOUND'));
    await codigoDoErro(chamar({ uid: 'fantasma', conceder: true }, 'uid-admin', ADMIN_LEGADO));
    expect(docTrilha()).toMatchObject({ targetUid: 'fantasma', resultado: 'negado_alvo_inexistente' });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('a trilha não carrega PII — só uids, papéis e desfecho', async () => {
    await chamar({ uid: 'uid-dono', conceder: true }, 'uid-admin', ADMIN_LEGADO);
    const chaves = Object.keys(docTrilha()).sort();
    expect(chaves).toEqual(['callerRole', 'callerUid', 'resultado', 'targetRole', 'targetUid', 'tipo']);
    const serializado = JSON.stringify(docTrilha());
    expect(serializado).not.toMatch(/@/); // nenhum e-mail
  });
});

// ---------------------------------------------------------------------------
// B2. DURABILIDADE — a capacidade do dono não pode sumir por efeito colateral
//
// Qualquer escrita de claim que apague `platformAdmin` sem querer tira o dono
// do painel master de forma silenciosa — e "silenciosa" é o problema: ninguém
// descobre por erro, descobre por 403 no meio de uma operação. Estes testes
// prendem os TRÊS escritores de claim do sistema no comportamento preservador.
// ---------------------------------------------------------------------------

describe('PAPEL-DUPLO · durabilidade da capacidade nos outros escritores de claim', () => {
  const DO_DONO = { role: 'tenant_owner', tenantId: 'castelo-producoes', platformAdmin: true };

  it('mergeTenantClaims (setTenantClaims) PRESERVA a capacidade', async () => {
    const { mergeTenantClaims } = await import('../platform/setTenantClaims');
    // Troca de papel dentro do tenant: a capacidade atravessa.
    expect(mergeTenantClaims(DO_DONO, 'tenant_staff', 'castelo-producoes'))
      .toMatchObject({ role: 'tenant_staff', tenantId: 'castelo-producoes', platformAdmin: true });
    // Rebaixamento a athlete: perde tenantId, ganha marcador, MANTÉM capacidade.
    expect(mergeTenantClaims(DO_DONO, 'athlete'))
      .toMatchObject({ role: 'athlete', demotedFromRole: 'tenant_owner', platformAdmin: true });
    // Promoção ao papel legado: as duas pernas convivem sem se apagar.
    expect(mergeTenantClaims(DO_DONO, 'platform_admin'))
      .toMatchObject({ role: 'platform_admin', platformAdmin: true });
  });

  it('mergeClaimsEquipe (setClaimsEquipe) PRESERVA a capacidade', async () => {
    const { mergeClaimsEquipe } = await import('../eventos/setClaimsEquipe');
    const comPapel = mergeClaimsEquipe(DO_DONO, 'meia-floripa-2026', 'organizador');
    expect(comPapel).toMatchObject({ ...DO_DONO, eventos: { 'meia-floripa-2026': 'organizador' } });
    // E ao remover o último papel de evento, a capacidade continua lá.
    expect(mergeClaimsEquipe(comPapel, 'meia-floripa-2026', null)).toEqual(DO_DONO);
  });

  it('o merge da capacidade não desfaz papel de evento nem marcador de demoção', () => {
    const rico = { ...DO_DONO, eventos: { e1: 'organizador' }, demotedFromRole: 'tenant_staff' };
    expect(mergePlatformAdminCapability(rico, false)).toEqual({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
      eventos: { e1: 'organizador' },
      demotedFromRole: 'tenant_staff',
    });
  });

  it('BREAK-GLASS existe e grava sem exigir caller (recuperação de deadlock)', async () => {
    const { setPlatformAdminCapabilityAdmin } = await import(
      '../platform/setPlatformAdminCapability'
    );
    getUser.mockResolvedValue({
      uid: 'uid-dono',
      customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' },
    });
    await setPlatformAdminCapabilityAdmin('uid-dono', true);
    expect(setCustomUserClaims).toHaveBeenCalledWith('uid-dono', {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
      platformAdmin: true,
    });
    expect(revokeRefreshTokens).toHaveBeenCalledWith('uid-dono');
  });

  it('BREAK-GLASS não é exportado como Cloud Function', async () => {
    // Se um dia virar callable, a autoridade de concessão evapora: qualquer
    // caller autenticado ligaria a capacidade em qualquer conta.
    const index = await import('../index');
    expect('setPlatformAdminCapabilityAdmin' in index).toBe(false);
    expect('setPlatformAdminCapability' in index).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C. O contrato da interface (T5)
// ---------------------------------------------------------------------------

describe('PAPEL-DUPLO · contrato do alternador (paineisDaConta)', () => {
  it('só o dono alterna', () => {
    expect(paineisDaConta(DONO)).toEqual({
      master: true,
      organizador: true,
      tenantId: 'castelo-producoes',
      podeAlternar: true,
    });
  });

  it('platform_admin legado tem master e nada para onde alternar', () => {
    expect(paineisDaConta(ADMIN_LEGADO)).toEqual({
      master: true,
      organizador: false,
      tenantId: null,
      podeAlternar: false,
    });
  });

  it('tenant_owner puro tem só o organizador', () => {
    expect(paineisDaConta(OWNER_PURO)).toEqual({
      master: false,
      organizador: true,
      tenantId: 'castelo-producoes',
      podeAlternar: false,
    });
  });

  it('athlete e crachá ausente não têm painel', () => {
    for (const c of [ATLETA, null, undefined]) {
      expect(paineisDaConta(c as AuthClaims | null)).toEqual({
        master: false,
        organizador: false,
        tenantId: null,
        podeAlternar: false,
      });
    }
  });

  it('tenant_staff com capacidade também alterna', () => {
    const staff: AuthClaims = {
      role: 'tenant_staff',
      tenantId: 'castelo-producoes',
      platformAdmin: true,
    };
    expect(paineisDaConta(staff).podeAlternar).toBe(true);
  });
});

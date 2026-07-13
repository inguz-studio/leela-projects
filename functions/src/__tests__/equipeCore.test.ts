/**
 * equipeCore.test.ts — LEELA-S304-T1 (unit puro, sem emulator)
 *
 * Cobre (aceite E04-L4):
 *   - Matriz 4×7 `podeAcessar` testada CÉLULA A CÉLULA (28 células) contra
 *     uma tabela literal INDEPENDENTE (não derivada da própria matriz —
 *     antagonismo: derivar da matriz provaria tautologia);
 *   - enums/type guards (RN-320) e `papelNoEvento` defensivo;
 *   - `parseMembroEquipe` fail-fast;
 *   - `mergeClaimsEquipe`: merge PRESERVADOR — nunca apaga claims de tenant
 *     (role/tenantId/demotedFromRole) nem papéis de OUTROS eventos; remoção
 *     revoga só o evento; mapa vazio some do token;
 *   - `podeGerirPapelEquipe`: anti-escalada (auto-promoção; conceder/destituir
 *     'organizador' fora da alçada) e `resolverGestorEquipe`.
 */
import { describe, expect, it } from 'vitest';
import {
  AREAS_EVENTO,
  PAPEIS_EVENTO,
  isAreaEvento,
  isPapelEvento,
  isStatusMembroEquipe,
  papeisComAcesso,
  papelNoEvento,
  parseMembroEquipe,
  podeAcessar,
  type AreaEvento,
  type PapelEvento,
} from '@leela/core';
import {
  mergeClaimsEquipe,
  podeGerirPapelEquipe,
  resolverGestorEquipe,
  type GestorEquipe,
} from '../eventos/setClaimsEquipe';

// ---------------------------------------------------------------------------
// Matriz 4×7 — célula a célula (tabela literal, fonte: definição canônica
// dos papéis no épico E04 §S304-T1 + aceites do lote E04-L4)
// ---------------------------------------------------------------------------

const CELULAS: Array<[PapelEvento, AreaEvento, boolean]> = [
  // organizador — dono do evento: controle total (7/7)
  ['organizador', 'pagina_vendas', true],
  ['organizador', 'comunicacao', true],
  ['organizador', 'financeiro', true],
  ['organizador', 'entrega', true],
  ['organizador', 'inscritos', true],
  ['organizador', 'configuracoes', true],
  ['organizador', 'equipe', true],
  // administrador — gestão completa SEM financeiro (6/7)
  ['administrador', 'pagina_vendas', true],
  ['administrador', 'comunicacao', true],
  ['administrador', 'financeiro', false],
  ['administrador', 'entrega', true],
  ['administrador', 'inscritos', true],
  ['administrador', 'configuracoes', true],
  ['administrador', 'equipe', true],
  // operador — balcão: entrega + leitura de inscritos (2/7)
  ['operador', 'pagina_vendas', false],
  ['operador', 'comunicacao', false],
  ['operador', 'financeiro', false], // aceite: operador × financeiro → NEGA
  ['operador', 'entrega', true],
  ['operador', 'inscritos', true],
  ['operador', 'configuracoes', false],
  ['operador', 'equipe', false],
  // financeiro — só dinheiro (1/7)
  ['financeiro', 'pagina_vendas', false], // aceite: financeiro × página → NEGA
  ['financeiro', 'comunicacao', false],
  ['financeiro', 'financeiro', true], // aceite: financeiro × financeiro → PERMITE
  ['financeiro', 'entrega', false],
  ['financeiro', 'inscritos', false],
  ['financeiro', 'configuracoes', false],
  ['financeiro', 'equipe', false],
];

describe('matriz de acesso 4×7 (RN-320 · podeAcessar)', () => {
  it('a tabela de teste cobre EXATAMENTE 4 papéis × 7 áreas (28 células)', () => {
    expect(CELULAS).toHaveLength(28);
    expect(PAPEIS_EVENTO).toHaveLength(4);
    expect(AREAS_EVENTO).toHaveLength(7);
    const chaves = new Set(CELULAS.map(([p, a]) => `${p}|${a}`));
    expect(chaves.size).toBe(28); // sem célula duplicada
    for (const papel of PAPEIS_EVENTO) {
      for (const area of AREAS_EVENTO) {
        expect(chaves.has(`${papel}|${area}`)).toBe(true); // sem célula faltando
      }
    }
  });

  it.each(CELULAS)('podeAcessar(%s, %s) === %s', (papel, area, esperado) => {
    expect(podeAcessar(papel, area)).toBe(esperado);
  });

  it('papeisComAcesso espelha as células por área (ordem canônica)', () => {
    expect(papeisComAcesso('financeiro')).toEqual(['organizador', 'financeiro']);
    expect(papeisComAcesso('inscritos')).toEqual([
      'organizador',
      'administrador',
      'operador',
    ]);
    expect(papeisComAcesso('equipe')).toEqual(['organizador', 'administrador']);
    expect(papeisComAcesso('entrega')).toEqual([
      'organizador',
      'administrador',
      'operador',
    ]);
  });
});

describe('enums e guards (RN-320)', () => {
  it('isPapelEvento aceita só os 4 papéis canônicos', () => {
    for (const papel of PAPEIS_EVENTO) expect(isPapelEvento(papel)).toBe(true);
    expect(isPapelEvento('root')).toBe(false);
    expect(isPapelEvento('ORGANIZADOR')).toBe(false); // case-sensitive
    expect(isPapelEvento('tenant_owner')).toBe(false); // papel de PLATAFORMA ≠ evento
    expect(isPapelEvento('platform_admin')).toBe(false);
    expect(isPapelEvento(null)).toBe(false);
    expect(isPapelEvento(1)).toBe(false);
  });

  it('isAreaEvento aceita só as 7 áreas', () => {
    for (const area of AREAS_EVENTO) expect(isAreaEvento(area)).toBe(true);
    expect(isAreaEvento('promotores')).toBe(false); // saiu com o corte da afiliação
    expect(isAreaEvento('')).toBe(false);
  });

  it('isStatusMembroEquipe aceita só convidado/ativo/removido', () => {
    expect(isStatusMembroEquipe('convidado')).toBe(true);
    expect(isStatusMembroEquipe('ativo')).toBe(true);
    expect(isStatusMembroEquipe('removido')).toBe(true);
    expect(isStatusMembroEquipe('pendente')).toBe(false);
  });

  it('papelNoEvento: defensivo contra claims ausentes/malformados', () => {
    expect(papelNoEvento(null, 'ev1')).toBeNull();
    expect(papelNoEvento(undefined, 'ev1')).toBeNull();
    expect(papelNoEvento({}, 'ev1')).toBeNull();
    expect(papelNoEvento({ eventos: {} }, 'ev1')).toBeNull();
    expect(papelNoEvento({ eventos: { outro: 'organizador' } }, 'ev1')).toBeNull();
    expect(papelNoEvento({ eventos: { ev1: 'root' } }, 'ev1')).toBeNull(); // fora do enum
    expect(papelNoEvento({ eventos: { ev1: 'financeiro' } }, 'ev1')).toBe('financeiro');
  });
});

describe('parseMembroEquipe (fail-fast)', () => {
  const base = {
    tenantId: 'castelo-producoes',
    eventoId: 'meia-floripa-2026',
    nome: 'Carla Nunes',
    papel: 'operador',
    status: 'ativo',
    uid: 'uid-x',
    email: 'carla@x.dev',
  };

  it('doc válido parseia com opcionais normalizados', () => {
    const m = parseMembroEquipe('uid-x', { ...base, profId: undefined });
    expect(m.papel).toBe('operador');
    expect(m.status).toBe('ativo');
    expect(m.profId).toBeNull();
    expect(m.uid).toBe('uid-x');
  });

  it('papel fora do enum lança (RN-320)', () => {
    expect(() => parseMembroEquipe('x', { ...base, papel: 'root' })).toThrow(/RN-320/);
  });

  it('status fora do enum lança', () => {
    expect(() => parseMembroEquipe('x', { ...base, status: 'zumbi' })).toThrow(/status/);
  });

  it('tenantId ausente lança (ADR-009)', () => {
    expect(() => parseMembroEquipe('x', { ...base, tenantId: '' })).toThrow(/ADR-009/);
  });
});

// ---------------------------------------------------------------------------
// mergeClaimsEquipe — merge PRESERVADOR (padrão mergeTenantClaims)
// ---------------------------------------------------------------------------

describe('mergeClaimsEquipe (merge preservador — nunca set cru)', () => {
  it('concede papel em claims vazias', () => {
    expect(mergeClaimsEquipe(null, 'ev1', 'financeiro')).toEqual({
      eventos: { ev1: 'financeiro' },
    });
    expect(mergeClaimsEquipe(undefined, 'ev1', 'operador')).toEqual({
      eventos: { ev1: 'operador' },
    });
  });

  it('PRESERVA claims de tenant (role/tenantId/demotedFromRole) intactas', () => {
    const atual = {
      role: 'tenant_staff',
      tenantId: 'passo-certo',
      demotedFromRole: 'tenant_owner',
    };
    const out = mergeClaimsEquipe(atual, 'ev1', 'administrador');
    expect(out).toEqual({
      role: 'tenant_staff',
      tenantId: 'passo-certo',
      demotedFromRole: 'tenant_owner',
      eventos: { ev1: 'administrador' },
    });
  });

  it('PRESERVA papéis de OUTROS eventos ao conceder/trocar', () => {
    const atual = { role: 'athlete', eventos: { evA: 'operador', evB: 'organizador' } };
    const concedido = mergeClaimsEquipe(atual, 'evC', 'financeiro');
    expect(concedido['eventos']).toEqual({
      evA: 'operador',
      evB: 'organizador',
      evC: 'financeiro',
    });
    const trocado = mergeClaimsEquipe(concedido, 'evA', 'administrador');
    expect(trocado['eventos']).toEqual({
      evA: 'administrador',
      evB: 'organizador',
      evC: 'financeiro',
    });
  });

  it('remoção (papel null) revoga SÓ o evento — demais preservados', () => {
    const atual = { role: 'athlete', eventos: { evA: 'operador', evB: 'financeiro' } };
    const out = mergeClaimsEquipe(atual, 'evA', null);
    expect(out).toEqual({ role: 'athlete', eventos: { evB: 'financeiro' } });
  });

  it('remoção do ÚLTIMO evento remove a chave `eventos` inteira (sem resíduo)', () => {
    const atual = { role: 'athlete', tenantId: undefined, eventos: { evA: 'operador' } };
    const out = mergeClaimsEquipe(atual, 'evA', null);
    expect('eventos' in out).toBe(false);
    expect(out['role']).toBe('athlete');
  });

  it('remoção idempotente: revogar evento inexistente não inventa mapa', () => {
    const out = mergeClaimsEquipe({ role: 'athlete' }, 'evX', null);
    expect(out).toEqual({ role: 'athlete' });
  });

  it('claims.eventos malformado (string) é substituído por mapa saudável', () => {
    const out = mergeClaimsEquipe({ eventos: 'organizador' }, 'ev1', 'operador');
    expect(out['eventos']).toEqual({ ev1: 'operador' }); // sem chars espalhados
  });

  it('NÃO muta o objeto de entrada (puro)', () => {
    const atual = { role: 'athlete', eventos: { evA: 'operador' } };
    const congelado = JSON.stringify(atual);
    mergeClaimsEquipe(atual, 'evB', 'financeiro');
    mergeClaimsEquipe(atual, 'evA', null);
    expect(JSON.stringify(atual)).toBe(congelado);
  });
});

// ---------------------------------------------------------------------------
// Anti-escalada — resolverGestorEquipe + podeGerirPapelEquipe
// ---------------------------------------------------------------------------

describe('resolverGestorEquipe (autoridade plataforma/tenant)', () => {
  it('platform_admin sempre; tenant writer só do tenant DONO', () => {
    expect(
      resolverGestorEquipe(
        { uid: 'u', claims: { role: 'platform_admin' } },
        'castelo-producoes'
      )
    ).toEqual({ via: 'platform_admin' });
    expect(
      resolverGestorEquipe(
        { uid: 'u', claims: { role: 'tenant_owner', tenantId: 'castelo-producoes' } },
        'castelo-producoes'
      )
    ).toEqual({ via: 'tenant', role: 'tenant_owner' });
    // tenant CERTO, papel de leitura (promoter) → null
    expect(
      resolverGestorEquipe(
        { uid: 'u', claims: { role: 'promoter', tenantId: 'castelo-producoes' } },
        'castelo-producoes'
      )
    ).toBeNull();
    // tenant ERRADO (claims forjadas de outro tenant) → null
    expect(
      resolverGestorEquipe(
        { uid: 'u', claims: { role: 'tenant_owner', tenantId: 'passo-certo' } },
        'castelo-producoes'
      )
    ).toBeNull();
    expect(
      resolverGestorEquipe({ uid: 'u', claims: { role: 'athlete' } }, 'castelo-producoes')
    ).toBeNull();
  });
});

describe('podeGerirPapelEquipe (anti-escalada E04-L4)', () => {
  const platform: GestorEquipe = { via: 'platform_admin' };
  const owner: GestorEquipe = { via: 'tenant', role: 'tenant_owner' };
  const staff: GestorEquipe = { via: 'tenant', role: 'tenant_staff' };
  const organizador: GestorEquipe = { via: 'papel', papel: 'organizador' };
  const administrador: GestorEquipe = { via: 'papel', papel: 'administrador' };

  it('AUTO-PROMOÇÃO: caller nunca gere o PRÓPRIO papel (exceto platform_admin)', () => {
    for (const gestor of [owner, staff, organizador, administrador]) {
      const res = podeGerirPapelEquipe({
        gestor,
        callerUid: 'eu',
        alvoUid: 'eu',
        papelAtualAlvo: 'operador',
        novoPapel: 'organizador',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.motivo).toMatch(/auto-promoção/);
    }
    expect(
      podeGerirPapelEquipe({
        gestor: platform,
        callerUid: 'eu',
        alvoUid: 'eu',
        papelAtualAlvo: null,
        novoPapel: 'organizador',
      }).ok
    ).toBe(true);
  });

  it("ESCALADA: conceder 'organizador' só platform_admin/tenant_owner/organizador", () => {
    const tentar = (gestor: GestorEquipe) =>
      podeGerirPapelEquipe({
        gestor,
        callerUid: 'gestor',
        alvoUid: 'comparsa',
        papelAtualAlvo: 'operador',
        novoPapel: 'organizador',
      });
    expect(tentar(platform).ok).toBe(true);
    expect(tentar(owner).ok).toBe(true);
    expect(tentar(organizador).ok).toBe(true);
    expect(tentar(staff).ok).toBe(false); // staff NÃO transfere controle total
    expect(tentar(administrador).ok).toBe(false); // payload operador→organizador NEGADO
  });

  it('DESTITUIÇÃO: mexer em quem JÁ é organizador exige a mesma alçada', () => {
    const rebaixar = (gestor: GestorEquipe, novoPapel: 'operador' | null) =>
      podeGerirPapelEquipe({
        gestor,
        callerUid: 'gestor',
        alvoUid: 'dono-do-evento',
        papelAtualAlvo: 'organizador',
        novoPapel,
      });
    expect(rebaixar(administrador, 'operador').ok).toBe(false);
    expect(rebaixar(administrador, null).ok).toBe(false);
    expect(rebaixar(staff, null).ok).toBe(false);
    expect(rebaixar(owner, 'operador').ok).toBe(true);
    expect(rebaixar(organizador, null).ok).toBe(true);
    expect(rebaixar(platform, null).ok).toBe(true);
  });

  it('caso normal: administrador concede/troca/revoga papéis não-organizador', () => {
    for (const novoPapel of ['administrador', 'operador', 'financeiro', null] as const) {
      expect(
        podeGerirPapelEquipe({
          gestor: administrador,
          callerUid: 'gestor',
          alvoUid: 'membro',
          papelAtualAlvo: 'operador',
          novoPapel,
        }).ok
      ).toBe(true);
    }
  });
});
